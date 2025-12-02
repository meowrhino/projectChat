# 💬 chat de proyectos para clientes

sistema de chat para gestión de comunicación con clientes por proyecto, con panel de administración y protección por contraseña.

## características

- **vista de cliente**: los clientes ven solo los proyectos activos y pueden acceder con contraseña
- **panel de administración**: gestión completa de proyectos (crear, editar, archivar)
- **protección por contraseña**: cada proyecto tiene su propia contraseña
- **colores personalizables**: asigna colores HTML estándar a cada proyecto
- **sistema de historiales**: acceso a proyectos archivados con contraseña
- **chat en tiempo real**: mensajes instantáneos usando Server-Sent Events (SSE)
- **identidad de usuario**: los mensajes se identifican como "manu" o "cliente"
- **persistencia en GitHub**: todos los datos se guardan automáticamente en `projects.json`

## estructura del proyecto

```
gridChat/
├── index.html          # vista pública para clientes
├── admin.html          # panel de administración
├── app.js              # lógica del cliente
├── admin.js            # lógica del administrador
├── style.css           # estilos del sistema
├── config.js           # configuración de la API
├── projects.json       # archivo de datos (se genera automáticamente)
├── backend/
│   ├── server.js       # servidor Node.js + Express
│   └── package.json    # dependencias del backend
├── ARCHITECTURE.md     # documentación de la arquitectura
└── TODO.md             # guía de despliegue completa
```

## tecnologías

- **frontend**: HTML, CSS, JavaScript (vanilla)
- **backend**: Node.js + Express
- **persistencia**: GitHub API (archivo JSON)
- **tiempo real**: Server-Sent Events (SSE)
- **despliegue**: Render (backend) + GitHub Pages (frontend)

## configuración rápida

### 1. backend (Render)

1. sube el código a tu repositorio de GitHub
2. crea un Personal Access Token en GitHub con permisos de `repo`
3. crea un nuevo Web Service en Render
4. configura las variables de entorno:
   - `GITHUB_TOKEN`: tu token de GitHub
   - `GH_REPO`: `tu-usuario/tu-repo`
   - `GH_BRANCH`: `main`
   - `GH_FILEPATH`: `projects.json`

### 2. frontend

1. actualiza `config.js` con la URL de tu backend de Render
2. abre `index.html` para la vista de cliente
3. abre `admin.html` para el panel de administración (contraseña: `arturmac`)

## uso

### como cliente

1. accede a `index.html`
2. haz clic en un proyecto activo
3. introduce la contraseña del proyecto
4. chatea con manu en tiempo real

### como administrador (manu)

1. accede a `admin.html`
2. introduce la contraseña maestra (`arturmac`)
3. crea, edita o archiva proyectos
4. chatea con clientes desde cualquier proyecto

## documentación completa

- **[TODO.md](TODO.md)**: guía detallada de despliegue paso a paso
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: documentación técnica de la arquitectura

## seguridad

⚠️ **nota**: este sistema usa contraseñas en texto plano y no implementa encriptación. es adecuado para proyectos internos o de bajo riesgo. no se recomienda para datos sensibles.

## créditos

basado en el proyecto original [gridChat](https://github.com/meowrhino/gridChat) por meowrhino.

adaptado y extendido para gestión de proyectos con clientes.
