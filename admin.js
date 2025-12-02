/**
 * Admin - Panel de Administración
 * Gestión de proyectos y chat como Manu
 */

/* =========================
   Configuración
   ========================= */
const MASTER_PASSWORD = "arturmac";
const HTML_COLORS = [
  // Pink
  "MediumVioletRed",
  "DeepPink",
  "PaleVioletRed",
  "HotPink",
  "LightPink",
  "Pink",
  // Red
  "DarkRed",
  "Red",
  "Firebrick",
  "Crimson",
  "IndianRed",
  "LightCoral",
  "Salmon",
  "DarkSalmon",
  "LightSalmon",
  // Orange
  "OrangeRed",
  "Tomato",
  "DarkOrange",
  "Coral",
  "Orange",
  // Yellow
  "DarkKhaki",
  "Gold",
  "Khaki",
  "PeachPuff",
  "Yellow",
  "PaleGoldenrod",
  "Moccasin",
  "PapayaWhip",
  "LightGoldenrodYellow",
  "LemonChiffon",
  "LightYellow",
  // Brown
  "Maroon",
  "Brown",
  "SaddleBrown",
  "Sienna",
  "Chocolate",
  "DarkGoldenrod",
  "Peru",
  "RosyBrown",
  "Goldenrod",
  "SandyBrown",
  "Tan",
  "Burlywood",
  "Wheat",
  "NavajoWhite",
  "Bisque",
  "BlanchedAlmond",
  "Cornsilk",
  // Purple / violet / magenta
  "Indigo",
  "Purple",
  "DarkMagenta",
  "DarkViolet",
  "DarkSlateBlue",
  "BlueViolet",
  "DarkOrchid",
  "Fuchsia",
  "Magenta",
  "SlateBlue",
  "MediumSlateBlue",
  "MediumOrchid",
  "MediumPurple",
  "Orchid",
  "Violet",
  "Plum",
  "Thistle",
  "Lavender",
  // Blue
  "MidnightBlue",
  "Navy",
  "DarkBlue",
  "MediumBlue",
  "Blue",
  "RoyalBlue",
  "SteelBlue",
  "DodgerBlue",
  "DeepSkyBlue",
  "CornflowerBlue",
  "SkyBlue",
  "LightSkyBlue",
  "LightSteelBlue",
  "LightBlue",
  "PowderBlue",
  // Cyan
  "Teal",
  "DarkCyan",
  "LightSeaGreen",
  "CadetBlue",
  "DarkTurquoise",
  "MediumTurquoise",
  "Turquoise",
  "Aqua",
  "Cyan",
  "Aquamarine",
  "PaleTurquoise",
  "LightCyan",
  // Green
  "DarkGreen",
  "Green",
  "DarkOliveGreen",
  "ForestGreen",
  "SeaGreen",
  "Olive",
  "OliveDrab",
  "MediumSeaGreen",
  "LimeGreen",
  "Lime",
  "SpringGreen",
  "MediumSpringGreen",
  "DarkSeaGreen",
  "MediumAquamarine",
  "YellowGreen",
  "LawnGreen",
  "Chartreuse",
  "LightGreen",
  "GreenYellow",
  "PaleGreen",
  // White-ish
  "MistyRose",
  "AntiqueWhite",
  "Linen",
  "Beige",
  "WhiteSmoke",
  "LavenderBlush",
  "OldLace",
  "AliceBlue",
  "Seashell",
  "GhostWhite",
  "Honeydew",
  "FloralWhite",
  "Azure",
  "MintCream",
  "Snow",
  "Ivory",
  "White",
  // Gray / black
  "Black",
  "DarkSlateGray",
  "DimGray",
  "SlateGray",
  "Gray",
  "LightSlateGray",
  "DarkGray",
  "Silver",
  "LightGray",
  "Gainsboro",
];

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
const modalAuth = document.getElementById("modalAuth");
const authInput = document.getElementById("authInput");
const btnAuth = document.getElementById("btnAuth");
const adminPanel = document.getElementById("adminPanel");
const projectList = document.getElementById("projectList");
const btnNewProject = document.getElementById("btnNewProject");

// Modal proyecto
const modalProject = document.getElementById("modalProject");
const projectModalTitle = document.getElementById("projectModalTitle");
const projectName = document.getElementById("projectName");
const projectPassword = document.getElementById("projectPassword");
const projectColor = document.getElementById("projectColor");
const projectActive = document.getElementById("projectActive");
const btnSaveProject = document.getElementById("btnSaveProject");

// Modal chat
const modalChat = document.getElementById("modalChat");
const chatTitle = document.getElementById("chatTitle");
const chatMessages = document.getElementById("chatMessages");
const msgBody = document.getElementById("msgBody");
const btnSend = document.getElementById("btnSend");

/* =========================
   Estado
   ========================= */
let authenticated = false;
let projects = [];
let editingProject = null;
let currentProject = null;
let sse = null;
let lastActiveColor = "blue";

/* =========================
   Helpers UI (modals)
   ========================= */
function showModal(el) { el.classList.add("show"); }
function hideModal(el) { el.classList.remove("show"); }

[modalAuth, modalProject, modalChat].forEach((m) => {
  m.addEventListener("click", (e) => {
    if (!e.target.closest("[data-modal-panel]")) {
      if (m !== modalAuth) hideModal(m);
    }
  });
  m.querySelectorAll("[data-cancel]").forEach((btn) =>
    btn.addEventListener("click", () => hideModal(m))
  );
});

// Poblar selector de colores
function populateColors() {
  projectColor.innerHTML = "";
  HTML_COLORS.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.toLowerCase();
    opt.textContent = c;
    projectColor.appendChild(opt);
  });
}

function handleActiveToggle(skipRemember) {
  if (!projectActive.checked) {
    if (!skipRemember) lastActiveColor = projectColor.value || "blue";
    projectColor.value = "black";
    projectColor.disabled = true;
  } else {
    projectColor.disabled = false;
    projectColor.value = lastActiveColor || "blue";
  }
}

projectActive.addEventListener("change", handleActiveToggle);

/* =========================
   Autenticación
   ========================= */
btnAuth.addEventListener("click", authenticate);
authInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") authenticate();
});

function authenticate() {
  const password = authInput.value;
  if (password === MASTER_PASSWORD) {
    authenticated = true;
    hideModal(modalAuth);
    adminPanel.style.display = "block";
    loadAllProjects();
  } else {
    alert("Contraseña incorrecta.");
    authInput.value = "";
    authInput.focus();
  }
}

/* =========================
   Cargar todos los proyectos
   ========================= */
async function loadAllProjects() {
  if (!authenticated) return;
  
  try {
    const data = await API("/admin/projects");
    projects = data;
    renderProjectList();
  } catch (e) {
    console.error("Error cargando proyectos:", e);
    projectList.innerHTML = "<p style='text-align:center; color:#f44;'>Error al cargar proyectos.</p>";
  }
}

function renderProjectList() {
  projectList.innerHTML = "";
  
  if (projects.length === 0) {
    projectList.innerHTML = "<p style='text-align:center; color:#666;'>No hay proyectos. Crea uno nuevo.</p>";
    return;
  }
  
  projects.forEach((project) => {
    const card = document.createElement("div");
    card.className = "admin-project-card";
    card.style.borderLeft = `4px solid ${project.color || "#333"}`;
    
    const header = document.createElement("div");
    header.className = "row";
    header.style.marginBottom = "10px";
    
    const name = document.createElement("h3");
    name.textContent = project.name;
    name.style.margin = "0";
    name.style.color = project.color || "#333";
    
    const statusChip = document.createElement("span");
    statusChip.className = "chip";
    statusChip.textContent = project.active ? "activo" : "inactivo";
    statusChip.style.backgroundColor = project.active ? "#4a4" : "#666";
    
    header.appendChild(name);
    const spacer = document.createElement("div");
    spacer.className = "space";
    header.appendChild(spacer);
    header.appendChild(statusChip);
    
    const info = document.createElement("div");
    info.className = "small";
    info.style.marginBottom = "10px";
    info.innerHTML = `
      <strong>Contraseña:</strong> ${project.password}<br>
      <strong>Mensajes:</strong> ${project.messages?.length || 0}<br>
      <strong>Creado:</strong> ${new Date(project.created_at).toLocaleDateString()}
    `;
    
    const actions = document.createElement("div");
    actions.className = "row";
    actions.style.gap = "8px";
    
    const btnChat = document.createElement("button");
    btnChat.className = "primary";
    btnChat.textContent = "abrir chat";
    btnChat.addEventListener("click", () => openChat(project));
    
    const btnEdit = document.createElement("button");
    btnEdit.className = "ghost";
    btnEdit.textContent = "editar";
    btnEdit.addEventListener("click", () => editProject(project));
    
    const btnDelete = document.createElement("button");
    btnDelete.className = "ghost";
    btnDelete.textContent = "archivar";
    btnDelete.style.color = "#f44";
    btnDelete.addEventListener("click", () => deleteProject(project));
    
    actions.appendChild(btnChat);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);
    
    card.appendChild(header);
    card.appendChild(info);
    card.appendChild(actions);
    projectList.appendChild(card);
  });
}

/* =========================
   Crear/Editar proyecto
   ========================= */
btnNewProject.addEventListener("click", () => {
  editingProject = null;
  projectModalTitle.textContent = "nuevo proyecto";
  projectName.value = "";
  projectPassword.value = "";
  projectColor.value = "blue";
  projectActive.checked = true;
  handleActiveToggle();
  showModal(modalProject);
  setTimeout(() => projectName.focus(), 0);
});

function editProject(project) {
  editingProject = project;
  projectModalTitle.textContent = "editar proyecto";
  projectName.value = project.name;
  projectPassword.value = project.password;
  projectColor.value = (project.color || "blue").toLowerCase();
  lastActiveColor = projectColor.value;
  projectActive.checked = project.active;
  if (!projectActive.checked) {
    projectColor.value = "black";
  }
  handleActiveToggle(true);
  showModal(modalProject);
  setTimeout(() => projectName.focus(), 0);
}

btnSaveProject.addEventListener("click", saveProject);

async function saveProject() {
  const name = projectName.value.trim();
  const password = projectPassword.value.trim();
  const color = projectActive.checked ? projectColor.value : "black";
  const active = projectActive.checked;
  
  if (!name) {
    alert("El nombre del proyecto es obligatorio.");
    return;
  }
  
  if (!password) {
    alert("La contraseña del proyecto es obligatoria.");
    return;
  }
  
  try {
    if (editingProject) {
      // Actualizar proyecto existente
      await API(`/admin/projects/${editingProject.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, password, color, active }),
      });
    } else {
      // Crear nuevo proyecto
      await API("/admin/projects", {
        method: "POST",
        body: JSON.stringify({ name, password, color, active }),
      });
    }
    
    hideModal(modalProject);
    await loadAllProjects();
  } catch (e) {
    alert("Error al guardar proyecto: " + e.message);
  }
}

async function deleteProject(project) {
  if (!confirm(`¿Archivar el proyecto "${project.name}"?`)) return;
  
  try {
    await API(`/admin/projects/${project.id}`, {
      method: "DELETE",
    });
    await loadAllProjects();
  } catch (e) {
    alert("Error al archivar proyecto: " + e.message);
  }
}

/* =========================
   Chat como Manu
   ========================= */
async function openChat(project) {
  currentProject = project;
  chatTitle.textContent = project.name;
  chatMessages.innerHTML = "";
  
  // Cargar mensajes existentes
  try {
    const data = await API(`/projects/${project.id}`);
    (data.messages || []).forEach((m) => appendMsg(chatMessages, m));
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
        appendMsg(chatMessages, data.message);
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
      body: JSON.stringify({ sender: "manu", body }),
    });
    msgBody.value = "";
  } catch (e) {
    alert("Error al enviar mensaje: " + e.message);
  }
}

function appendMsg(container, msg) {
  const div = document.createElement("div");
  div.className = "msg";
  
  // En vista de admin:
  // - Mensajes de Manu a la derecha (mine)
  // - Mensajes del cliente a la izquierda (other)
  div.classList.add(msg.sender === "manu" ? "mine" : "other");
  
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
   Init
   ========================= */
setTimeout(() => authInput.focus(), 0);
populateColors();
handleActiveToggle();
