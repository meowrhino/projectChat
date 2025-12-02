import "dotenv/config";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";

// Configuración
const PORT = process.env.PORT || 10000;
const ORIGIN_WHITELIST = (process.env.ORIGIN_WHITELIST || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GH_REPO = process.env.GH_REPO; // "owner/repo"
const GH_BRANCH = process.env.GH_BRANCH || "main";
const GH_FILEPATH = process.env.GH_FILEPATH || "projects.json";

if (!GITHUB_TOKEN || !GH_REPO) {
  console.warn(
    "⚠️  Missing GITHUB_TOKEN or GH_REPO; the server will not be able to persist to GitHub."
  );
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin ||
        ORIGIN_WHITELIST.includes("*") ||
        ORIGIN_WHITELIST.includes(origin)
      )
        cb(null, true);
      else cb(new Error("Not allowed by CORS: " + origin));
    },
  })
);

// ============================================================================
// GitHub storage helpers
// ============================================================================
let cache = null; // { sha, data: {projects: [...], history: [...]}, ts }

async function ghGetFile() {
  const url = `https://api.github.com/repos/${GH_REPO}/contents/${encodeURIComponent(
    GH_FILEPATH
  )}?ref=${encodeURIComponent(GH_BRANCH)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "User-Agent": "project-chat",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(
      "GitHub get failed: " + res.status + " " + (await res.text())
    );
  const j = await res.json();
  const content = Buffer.from(j.content || "", "base64").toString("utf8");
  return { sha: j.sha, data: JSON.parse(content) };
}

async function ghPutFile({ sha, data, message }) {
  const url = `https://api.github.com/repos/${GH_REPO}/contents/${encodeURIComponent(
    GH_FILEPATH
  )}`;
  const body = {
    message,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
    branch: GH_BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      "User-Agent": "project-chat",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(
      "GitHub put failed: " + res.status + " " + (await res.text())
    );
  return await res.json();
}

async function loadState() {
  if (cache) return cache;
  let file = await ghGetFile();
  if (!file) {
    // Inicializar archivo vacío
    const empty = { projects: [], history: [] };
    const put = await ghPutFile({
      sha: null,
      data: empty,
      message: "init projects.json",
    });
    file = { sha: put.content.sha, data: empty };
  }
  cache = { ...file, ts: Date.now() };
  return cache;
}

async function saveState(data, commitMessage) {
  const current = await loadState();
  let lastSha = current.sha;
  try {
    const put = await ghPutFile({ sha: lastSha, data, message: commitMessage });
    cache = { sha: put.content.sha, data, ts: Date.now() };
    return cache;
  } catch (e) {
    // Retry en caso de conflicto
    const fresh = await ghGetFile();
    const put = await ghPutFile({
      sha: fresh?.sha,
      data,
      message: commitMessage + " (retry)",
    });
    cache = { sha: put.content.sha, data, ts: Date.now() };
    return cache;
  }
}

// ============================================================================
// SSE (Server-Sent Events) por proyecto
// ============================================================================
const sseByProject = new Map(); // id -> Set(res)

function sseAdd(id, res) {
  if (!sseByProject.has(id)) sseByProject.set(id, new Set());
  sseByProject.get(id).add(res);
  res.on("close", () => sseByProject.get(id)?.delete(res));
}

function sseSend(id, payload) {
  const set = sseByProject.get(id);
  if (!set) return;
  const blob = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try {
      res.write(blob);
    } catch {}
  }
}

// Ping cada 25 segundos para mantener conexiones vivas
setInterval(() => {
  for (const set of sseByProject.values())
    for (const res of set) {
      try {
        res.write(": ping\n\n");
      } catch {}
    }
}, 25000);

// ============================================================================
// Helpers
// ============================================================================
const nowISO = () => new Date().toISOString();

// ============================================================================
// Routes - Públicas
// ============================================================================

// Health check
app.get("/", (req, res) =>
  res.json({
    ok: true,
    name: "project-chat-backend",
    time: new Date().toISOString(),
  })
);

// Listar proyectos activos (sin contraseñas)
app.get("/projects", async (req, res) => {
  const { data } = await loadState();
  const active = data.projects
    .filter((p) => p.active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      created_at: p.created_at,
    }));
  res.json(active);
});

// Obtener un proyecto específico (con mensajes, sin contraseña)
app.get("/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { data } = await loadState();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return res.status(404).json({ error: "not found" });
  
  // No enviar la contraseña
  const { password, ...projectData } = project;
  res.json(projectData);
});

// Verificar contraseña de un proyecto
app.post("/projects/:id/verify", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  
  const { data } = await loadState();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return res.status(404).json({ error: "not found" });
  
  const valid = project.password === password;
  res.json({ valid });
});

// Enviar mensaje a un proyecto
app.post("/projects/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { sender, body } = req.body || {};
  
  if (!body || !String(body).trim())
    return res.status(400).json({ error: "body required" });
  if (!["manu", "client"].includes(sender))
    return res.status(400).json({ error: "sender must be 'manu' or 'client'" });
  
  const state = await loadState();
  const idx = state.data.projects.findIndex((p) => p.id === id);
  if (idx < 0) return res.status(404).json({ error: "project not found" });
  
  const project = { ...state.data.projects[idx] };
  const msg = {
    id: uuidv4(),
    sender,
    body: String(body).trim(),
    created_at: nowISO(),
  };
  
  project.messages = [...(project.messages || []), msg];
  const next = { ...state.data };
  next.projects = [...state.data.projects];
  next.projects[idx] = project;
  
  await saveState(next, `message in ${project.name} from ${sender}`);
  sseSend(id, { type: "message", projectId: id, message: msg });
  res.status(201).json(msg);
});

// SSE para un proyecto
app.get("/projects/:id/stream", async (req, res) => {
  const { id } = req.params;
  const { data } = await loadState();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return res.status(404).end();
  
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();
  res.write(": connected\n\n");
  sseAdd(id, res);
});

// Listar histórico (sin contraseñas)
app.get("/history", async (req, res) => {
  const { data } = await loadState();
  const history = data.history.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    archived_at: p.archived_at,
    messages: p.messages,
  }));
  res.json(history);
});

// Verificar contraseña de un proyecto archivado
app.post("/history/:id/verify", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  
  const { data } = await loadState();
  const project = data.history.find((p) => p.id === id);
  if (!project) return res.status(404).json({ error: "not found" });
  
  const valid = project.password === password;
  res.json({ valid });
});

// ============================================================================
// Routes - Administración
// ============================================================================

// Listar todos los proyectos (con contraseñas)
app.get("/admin/projects", async (req, res) => {
  const { data } = await loadState();
  res.json(data.projects);
});

// Crear nuevo proyecto
app.post("/admin/projects", async (req, res) => {
  const { name, password, color, active } = req.body || {};
  
  if (!name || !String(name).trim())
    return res.status(400).json({ error: "name required" });
  if (!password || !String(password).trim())
    return res.status(400).json({ error: "password required" });
  
  const state = await loadState();
  const project = {
    id: uuidv4(),
    name: String(name).trim(),
    password: String(password).trim(),
    color: color || "blue",
    active: active !== false,
    created_at: nowISO(),
    messages: [],
  };
  
  const next = { ...state.data };
  next.projects = [...state.data.projects, project];
  
  await saveState(next, `create project: ${project.name}`);
  res.status(201).json(project);
});

// Actualizar proyecto existente
app.patch("/admin/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { name, password, color, active } = req.body || {};
  
  const state = await loadState();
  const idx = state.data.projects.findIndex((p) => p.id === id);
  if (idx < 0) return res.status(404).json({ error: "not found" });
  
  const project = { ...state.data.projects[idx] };
  if (name !== undefined) project.name = String(name).trim();
  if (password !== undefined) project.password = String(password).trim();
  if (color !== undefined) project.color = color;
  if (active !== undefined) project.active = active;
  
  const next = { ...state.data };
  next.projects = [...state.data.projects];
  next.projects[idx] = project;
  
  await saveState(next, `update project: ${project.name}`);
  res.json(project);
});

// Archivar proyecto (mover a history)
app.delete("/admin/projects/:id", async (req, res) => {
  const { id } = req.params;
  
  const state = await loadState();
  const idx = state.data.projects.findIndex((p) => p.id === id);
  if (idx < 0) return res.status(404).json({ error: "not found" });
  
  const project = { ...state.data.projects[idx] };
  project.archived_at = nowISO();
  
  const next = { ...state.data };
  next.projects = state.data.projects.filter((p) => p.id !== id);
  next.history = [...state.data.history, project];
  
  await saveState(next, `archive project: ${project.name}`);
  res.json({ ok: true });
});

// ============================================================================
// Start server
// ============================================================================
app.listen(PORT, () => console.log("project-chat backend listening on", PORT));
