# Backend — Chat de Proyectos (GitHub JSON storage)

Guarda todo en un único **`projects.json`** dentro de un repositorio GitHub. Render usa un **GitHub token** para commitear los cambios.

## Config (env)
- `GITHUB_TOKEN` — token con scope `repo` (secret en Render).
- `GH_REPO` — `owner/repo` donde vive `projects.json`.
- `GH_BRANCH` — rama destino (default `main`).
- `GH_FILEPATH` — ruta del fichero JSON (default `projects.json`).
- `ORIGIN_WHITELIST` — dominios permitidos para CORS (coma-separado, usa `*` para dev).

## API pública
- `GET /` → health.
- `GET /projects` → lista de proyectos activos (sin contraseñas).
- `GET /projects/:id` → detalle de un proyecto (incluye mensajes, no contraseñas).
- `POST /projects/:id/verify` `{ password }` → valida contraseña, devuelve `{valid}`.
- `POST /projects/:id/messages` `{ sender: "manu"|"client", body }` → añade mensaje y hace commit.
- `GET /projects/:id/stream` → SSE por proyecto (mensajes en vivo).
- `GET /history` → lista de proyectos archivados con mensajes (sin contraseñas).
- `POST /history/:id/verify` `{ password }` → valida contraseña de histórico.

## API de administración (no autenticada, se protege en frontend)
- `GET /admin/projects` → lista completa (incluye contraseñas).
- `POST /admin/projects` `{ name, password, color, active }` → crea proyecto (color permitido HTML; inactivos forzados a negro).
- `PATCH /admin/projects/:id` `{ name?, password?, color?, active? }` → edita proyecto (si se marca inactivo, color pasa a negro).
- `DELETE /admin/projects/:id` → archiva proyecto, moviéndolo a `history`.

## Deploy en Render
1. Servicio Web Node 20 apuntando a la carpeta `backend/`.
2. Build: `npm install` — Start: `npm start`.
3. Env vars: `GITHUB_TOKEN`, `GH_REPO`, `GH_BRANCH=main`, `GH_FILEPATH=projects.json`, `ORIGIN_WHITELIST=https://<tu>.github.io`.
4. Primer arranque crea `projects.json` si no existe.

> Cachea en memoria para rapidez; cada escritura comitea en GitHub y se reintenta si hay conflictos.
