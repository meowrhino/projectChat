/**
 * Cliente - Chat de Proyectos
 * Vista pública para que los clientes accedan a proyectos activos
 */

/* =========================
   API helper
   ========================= */
const API = (p, o = {}) =>
  fetch(`${API_BASE}${p}`, {
    ...o,
    headers: { "Content-Type": "application/json", ...(o.headers || {}) },
  }).then(async (r) =>
    r.ok ? r.json() : Promise.reject(new Error(await r.text()))
  );

/* =========================
   DOM refs
   ========================= */
const projectGrid = document.getElementById("projectGrid");
const btnHistory = document.getElementById("btnHistory");

// Modals
const modalPassword = document.getElementById("modalPassword");
const modalChat = document.getElementById("modalChat");
const modalHistory = document.getElementById("modalHistory");
const modalHistChat = document.getElementById("modalHistChat");

// Password modal
const passwordTitle = document.getElementById("passwordTitle");
const passwordInput = document.getElementById("passwordInput");
const btnVerify = document.getElementById("btnVerify");

// Chat modal
const chatTitle = document.getElementById("chatTitle");
const chatMessages = document.getElementById("chatMessages");
const msgBody = document.getElementById("msgBody");
const btnSend = document.getElementById("btnSend");

// History modals
const histList = document.getElementById("histList");
const histTitle = document.getElementById("histTitle");
const histMessages = document.getElementById("histMessages");

/* =========================
   Estado
   ========================= */
let currentProject = null;
let pendingProject = null;
let sse = null;

/* =========================
   Helpers UI (modals)
   ========================= */
function showModal(el) { el.classList.add("show"); }
function hideModal(el) { el.classList.remove("show"); }

[modalPassword, modalChat, modalHistory, modalHistChat].forEach((m) => {
  m.addEventListener("click", (e) => {
    if (!e.target.closest("[data-modal-panel]")) hideModal(m);
  });
  m.querySelectorAll("[data-cancel]").forEach((btn) =>
    btn.addEventListener("click", () => hideModal(m))
  );
});

/* =========================
   Cargar proyectos activos
   ========================= */
async function loadProjects() {
  try {
    const projects = await API("/projects");
    projectGrid.innerHTML = "";
    
    if (projects.length === 0) {
      projectGrid.innerHTML = "<p style='text-align:center; color:#666;'>No hay proyectos activos en este momento.</p>";
      return;
    }
    
    projects.forEach((project) => {
      const card = document.createElement("div");
      card.className = "project-card";
      card.style.borderColor = project.color || "#333";
      card.style.backgroundColor = hexToRgba(project.color || "#333", 0.1);
      
      const name = document.createElement("h3");
      name.textContent = project.name;
      name.style.color = project.color || "#333";
      
      card.appendChild(name);
      card.addEventListener("click", () => requestAccess(project));
      projectGrid.appendChild(card);
    });
  } catch (e) {
    console.error("Error cargando proyectos:", e);
    projectGrid.innerHTML = "<p style='text-align:center; color:#f44;'>Error al cargar proyectos.</p>";
  }
}

/* =========================
   Solicitar acceso a proyecto
   ========================= */
function requestAccess(project) {
  pendingProject = project;
  passwordTitle.textContent = `acceder a: ${project.name}`;
  passwordInput.value = "";
  showModal(modalPassword);
  setTimeout(() => passwordInput.focus(), 0);
}

btnVerify.addEventListener("click", verifyPassword);
passwordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") verifyPassword();
});

async function verifyPassword() {
  if (!pendingProject) return;
  const password = passwordInput.value;
  
  try {
    const result = await API(`/projects/${pendingProject.id}/verify`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    
    if (result.valid) {
      hideModal(modalPassword);
      openChat(pendingProject);
    } else {
      alert("Contraseña incorrecta. Inténtalo de nuevo.");
      passwordInput.value = "";
      passwordInput.focus();
    }
  } catch (e) {
    alert("Error al verificar contraseña: " + e.message);
  }
}

/* =========================
   Abrir chat
   ========================= */
async function openChat(project) {
  currentProject = project;
  chatTitle.textContent = project.name;
  chatMessages.innerHTML = "";
  
  // Cargar mensajes existentes
  try {
    const data = await API(`/projects/${project.id}`);
    (data.messages || []).forEach((m) => appendMsg(chatMessages, m, false));
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (e) {
    console.error("Error cargando mensajes:", e);
  }
  
  showModal(modalChat);
  msgBody.value = "";
  msgBody.focus();
  
  // Conectar SSE
  if (sse) { try { sse.close(); } catch {} }
  sse = new EventSource(`${API_BASE}/projects/${project.id}/stream`);
  sse.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.type === "message") {
        appendMsg(chatMessages, data.message, false);
      }
    } catch {}
  };
  sse.onerror = () => {
    try { sse.close(); } catch {}
    setTimeout(() => {
      if (currentProject?.id === project.id) {
        sse = new EventSource(`${API_BASE}/projects/${project.id}/stream`);
      }
    }, 1500);
  };
}

/* =========================
   Enviar mensaje
   ========================= */
btnSend.addEventListener("click", sendMsg);
msgBody.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMsg();
});

async function sendMsg() {
  if (!currentProject) return;
  const body = msgBody.value.trim();
  if (!body) return;
  
  try {
    await API(`/projects/${currentProject.id}/messages`, {
      method: "POST",
      body: JSON.stringify({ sender: "client", body }),
    });
    msgBody.value = "";
  } catch (e) {
    alert("Error al enviar mensaje: " + e.message);
  }
}

/* =========================
   Renderizar mensajes
   ========================= */
function appendMsg(container, msg, isAdmin) {
  const div = document.createElement("div");
  div.className = "msg";
  
  // En vista de cliente:
  // - Mensajes del cliente a la derecha (mine)
  // - Mensajes de Manu a la izquierda (other)
  if (isAdmin) {
    // Vista de admin (invertido)
    div.classList.add(msg.sender === "manu" ? "mine" : "other");
  } else {
    // Vista de cliente
    div.classList.add(msg.sender === "client" ? "mine" : "other");
  }
  
  const bodyEl = document.createElement("div");
  bodyEl.className = "body";
  bodyEl.textContent = msg.body;
  
  const metaEl = document.createElement("div");
  metaEl.className = "meta";
  const sender = msg.sender === "manu" ? "Manu" : "Cliente";
  metaEl.textContent = `${sender} • ${new Date(msg.created_at).toLocaleString()}`;
  
  div.appendChild(bodyEl);
  div.appendChild(metaEl);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/* =========================
   Histórico
   ========================= */
btnHistory.addEventListener("click", openHistory);

async function openHistory() {
  try {
    const history = await API("/history");
    histList.innerHTML = "";
    
    if (history.length === 0) {
      histList.innerHTML = "<p style='text-align:center; color:#666;'>No hay proyectos archivados.</p>";
    } else {
      history.forEach((project) => {
        const card = document.createElement("div");
        card.className = "msg";
        card.style.cursor = "pointer";
        card.style.borderLeft = `4px solid ${project.color || "#333"}`;
        
        const name = document.createElement("div");
        name.style.fontWeight = "600";
        name.style.marginBottom = "4px";
        name.textContent = project.name;
        
        const date = document.createElement("div");
        date.className = "small";
        date.textContent = `Archivado: ${new Date(project.archived_at).toLocaleDateString()}`;
        
        card.appendChild(name);
        card.appendChild(date);
        card.addEventListener("click", () => requestHistoryAccess(project));
        histList.appendChild(card);
      });
    }
    
    showModal(modalHistory);
  } catch (e) {
    alert("Error al cargar histórico: " + e.message);
  }
}

async function requestHistoryAccess(project) {
  const password = prompt(`Introduce la contraseña para "${project.name}":`);
  if (!password) return;
  
  try {
    const result = await API(`/history/${project.id}/verify`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    
    if (result.valid) {
      openHistoryChat(project);
    } else {
      alert("Contraseña incorrecta.");
    }
  } catch (e) {
    alert("Error al verificar contraseña: " + e.message);
  }
}

function openHistoryChat(project) {
  histTitle.textContent = project.name;
  histMessages.innerHTML = "";
  (project.messages || []).forEach((m) => appendMsg(histMessages, m, false));
  hideModal(modalHistory);
  showModal(modalHistChat);
}

/* =========================
   Utilidades
   ========================= */
function hexToRgba(color, alpha) {
  // Convertir colores HTML a rgba
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  const computed = ctx.fillStyle;
  
  if (computed.startsWith("#")) {
    const r = parseInt(computed.slice(1, 3), 16);
    const g = parseInt(computed.slice(3, 5), 16);
    const b = parseInt(computed.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return computed;
}

/* =========================
   Init
   ========================= */
loadProjects().catch(console.error);
