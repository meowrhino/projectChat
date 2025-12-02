# TODO: guía de despliegue y cambios recientes

## Qué se hizo
- Paleta completa de colores HTML en el admin; los proyectos inactivos se guardan/leen siempre en color `black`.
- Backend valida colores permitidos y normaliza a minúsculas; si un proyecto se marca inactivo su color pasa a negro.
- Alias de endpoints sin prefijo `/admin` para alinearse con la arquitectura (`POST/PATCH/DELETE /projects`).
- `config.js` ahora permite override por `localStorage` o `window.__API_BASE` y cae a `http://localhost:10000` para desarrollo.
- Estilos: grid sin líneas visibles, hover con fondo suave, botones solo texto con tres estados, sombra negra, chips en color muted.
- Documentación de backend actualizada (`backend/README.md`, `backend/render.yaml`).

## Probar en local
1) Backend  
   - Instala deps: `cd backend && npm install`.  
   - Crea un `.env` (o exporta vars) con:  
     - `GITHUB_TOKEN`, `GH_REPO`, `GH_BRANCH=main`, `GH_FILEPATH=projects.json`, `ORIGIN_WHITELIST=*` (o tu dominio).  
   - Arranca: `npm start` (escucha en `10000`).

2) Frontend  
   - En el navegador, antes de abrir `index.html` o `admin.html`:  
     ```js
     localStorage.setItem('mp_api','http://localhost:10000');
     ```  
   - Abre `admin.html`, contraseña maestra: `arturmac`.  
   - Crea un proyecto activo eligiendo color HTML; marca inactivo para que quede negro; envía mensajes como Manu.  
   - Abre `index.html`, entra con la contraseña del proyecto y chatea como cliente.  
   - Archiva un proyecto desde el admin y consúltalo en el histórico (pide contraseña).

## Despliegue en Render (backend)
1) Sube todo a GitHub.  
2) Crea un Web Service en Render apuntando a `backend/` (Node 20).  
   - Build: `npm install`  
   - Start: `npm start`  
3) Env vars obligatorias:  
   - `GITHUB_TOKEN` (PAT con scope `repo`)  
   - `GH_REPO` (`owner/repo`)  
   - `GH_BRANCH` (`main`)  
   - `GH_FILEPATH` (`projects.json`)  
- `ORIGIN_WHITELIST` (`https://<tu>.github.io` o `*` mientras pruebas)  
4) Tras desplegar, Render mostrará la URL pública; úsala para el frontend.

## Publicar frontend
- Opción rápida: GitHub Pages / Render Static Site con `index.html`, `admin.html`, `app.js`, `admin.js`, `style.css`, `config.js`, `favicon.svg`.  
- En producción, fija `API_BASE` en `config.js` a la URL de Render o usa en el navegador:  
  ```js
  localStorage.setItem('mp_api','https://tu-backend.onrender.com');
  ```  
- Contraseña maestra está en `admin.js` (`MASTER_PASSWORD`).

## Notas de uso
- Colores admitidos: toda la lista de nombres HTML estándar (Magenta, DodgerBlue, LemonChiffon, etc.); si es inactivo o el color no es válido se usa `black`.  
- Historial: sigue mostrando lista, pide contraseña y abre en solo lectura.  
- Alineación de mensajes: como cliente tus mensajes van a la derecha; como admin, los de Manu a la derecha.

---

## Guía de despliegue (versión extendida, paso a paso)

### Checklist de tareas (realizado)
- [x] Análisis del repo original `gridChat`.
- [x] Diseño de la nueva arquitectura con `projects.json`, vistas cliente/admin y endpoints.
- [x] Frontend completo: `index.html`, `admin.html`, `app.js`, `admin.js`, `style.css`.
- [x] Backend reescrito para `projects.json`, verificación de contraseñas, SSE y endpoints públicos/admin.
- [x] `projects.json` inicial creado; `chats.json` ya no se usa.
- [x] Documentación y guía de despliegue.

### Despliegue en Render
1) Prepara el repo en GitHub con todo el código.  
2) Genera un PAT en GitHub con scope `repo` (sin expiración, si quieres).  
3) Crea un Web Service en Render:  
   - Region: la más cercana (ej: Frankfurt).  
   - Branch: `main`.  
   - Root Directory: `backend`.  
   - Runtime: Node.  
   - Build: `npm install`.  
   - Start: `node server.js`.  
   - Plan: Free.  
4) Variables de entorno en Render:  
   - `GITHUB_TOKEN` (el PAT).  
   - `GH_REPO` (`owner/repo`).  
   - `GH_BRANCH` (`main`).  
   - `GH_FILEPATH` (`projects.json`).  
   - `ORIGIN_WHITELIST` (`https://<tu>.github.io` o `*` mientras pruebas).  
5) Deploy y espera el log `project-chat backend listening on 10000`.  
6) Copia la URL pública del backend (ej: `https://mi-chat-proyectos.onrender.com`).  
7) Configura el frontend: en `config.js` fija `API_BASE` o usa en el navegador  
   `localStorage.setItem('mp_api','https://mi-chat-proyectos.onrender.com');`.

### Frontend online
- Usa GitHub Pages / Render Static Site para servir los archivos estáticos.  
- Abre `admin.html` para el panel (contraseña maestra `arturmac` editable en `admin.js`).  
- Abre `index.html` para la vista de cliente.
