# Message Park — Backend (GitHub JSON storage)

Guarda todo en un único **`chats.json`** dentro de un repositorio GitHub. Render usa un **GitHub token** para commitear los cambios.

## Config (env)
- `GITHUB_TOKEN` — token con scope `repo` (guárdalo como secret en Render).
- `GH_REPO` — `owner/repo` donde vive `chats.json` (p.ej. `meowrhino/message-park-data`).
- `GH_BRANCH` — rama destino (default `main`).
- `GH_FILEPATH` — ruta del fichero JSON (default `chats.json`).
- `ORIGIN_WHITELIST` — dominios permitidos para CORS (coma-separado).

## API
- `GET /grid` → estado 10×10 (solo chats **abiertos**).
- `POST /threads` `{ title, row, col }` → crea chat (no permite (10,10)).
- `GET /threads/:id` → detalle chat.
- `PATCH /threads/:id` `{ status: "open"|"closed" }` → cerrar/reabrir.
- `GET /threads/:id/messages` → lista mensajes.
- `POST /threads/:id/messages` `{ body }` → mensaje anónimo.
- `GET /chats.json` → dump completo.
- `GET /threads/:id/stream` → SSE por chat (actualiza en vivo).

## Deploy en Render
1. Repo con `backend/` (esta carpeta).
2. New → Web Service → Node 20.
3. Añade envs: `GITHUB_TOKEN`, `GH_REPO`, `GH_BRANCH=main`, `GH_FILEPATH=chats.json`, `ORIGIN_WHITELIST=https://<tu>.github.io`.
4. Deploy. Primer arranque crea `chats.json` si no existe.

> Nota: se cachea en memoria para rapidez; cada escritura hace commit en GitHub con un mensaje breve.
