# Arquitectura del Sistema de Chat para Proyectos

## Resumen

Este documento describe la arquitectura del nuevo sistema de chat para gestión de proyectos con clientes. El sistema se basa en la infraestructura existente de `gridChat` pero con modificaciones significativas para soportar:

1. **Panel de Administración** con contraseña maestra
2. **Gestión de Proyectos** (crear, activar/desactivar, eliminar)
3. **Protección por Contraseña** para cada proyecto
4. **Selector de Color** personalizado por proyecto
5. **Sistema de Historiales** con protección por contraseña
6. **Identidad de Usuario** (Manu vs Cliente)

---

## Estructura de Datos

### Archivo `projects.json`

Reemplaza el archivo `chats.json` existente. Estructura:

```json
{
  "projects": [
    {
      "id": "uuid-v4",
      "name": "Nombre del Proyecto",
      "password": "clave-secreta",
      "color": "red",
      "active": true,
      "created_at": "2025-12-02T10:00:00.000Z",
      "messages": [
        {
          "id": "uuid-v4",
          "sender": "manu",
          "body": "Texto del mensaje",
          "created_at": "2025-12-02T10:05:00.000Z"
        }
      ]
    }
  ],
  "history": [
    {
      "id": "uuid-v4",
      "name": "Proyecto Archivado",
      "password": "clave-antigua",
      "color": "blue",
      "archived_at": "2025-11-01T12:00:00.000Z",
      "messages": [...]
    }
  ]
}
```

### Campos de Proyecto

- **id**: UUID único del proyecto
- **name**: Nombre visible del proyecto
- **password**: Contraseña para acceder (texto plano, sin encriptación)
- **color**: Color HTML estándar (red, blue, green, yellow, purple, orange, pink, cyan, magenta, lime, navy, teal, olive, maroon, aqua, fuchsia, silver, gray, black, white)
- **active**: Boolean - si es visible en la vista pública
- **created_at**: Timestamp ISO de creación
- **messages**: Array de mensajes del proyecto

### Campos de Mensaje

- **id**: UUID único del mensaje
- **sender**: "manu" o "client"
- **body**: Texto del mensaje
- **created_at**: Timestamp ISO

---

## Vistas del Sistema

### 1. Vista de Cliente (`index.html`)

**URL**: `/`

**Funcionalidad**:
- Muestra una cuadrícula de proyectos activos (`active: true`)
- Cada celda muestra el nombre del proyecto con su color asignado
- Los proyectos inactivos NO se muestran
- Al hacer clic en un proyecto, solicita contraseña
- Si la contraseña es correcta, abre el chat del proyecto
- En el chat, los mensajes del cliente aparecen a la derecha
- Los mensajes de Manu aparecen a la izquierda
- Botón "Histórico" que abre la lista de proyectos archivados

### 2. Vista de Administración (`admin.html`)

**URL**: `/admin.html`

**Funcionalidad**:
- Solicita contraseña maestra al cargar (hardcoded: "arturmac")
- Muestra lista de TODOS los proyectos (activos e inactivos)
- Permite crear nuevo proyecto:
  - Nombre del proyecto
  - Contraseña del proyecto
  - Selector de color (dropdown con colores HTML estándar)
  - Toggle activo/inactivo
- Permite editar proyectos existentes:
  - Cambiar nombre
  - Cambiar contraseña
  - Cambiar color
  - Toggle activo/inactivo
- Permite eliminar proyectos (mueve a `history`)
- Al hacer clic en un proyecto, abre el chat como "Manu"
- En el chat, los mensajes de Manu aparecen a la derecha
- Los mensajes del cliente aparecen a la izquierda

### 3. Vista de Historiales

**Funcionalidad**:
- Accesible desde la vista de cliente (botón en la esquina)
- Muestra lista de proyectos archivados
- Al hacer clic en un proyecto, solicita contraseña
- Si la contraseña es correcta, muestra el chat en modo solo lectura
- Los mensajes mantienen su alineación original

---

## Backend (Node.js + Express)

### Endpoints Nuevos

#### `GET /projects`
Devuelve lista de proyectos activos (sin contraseñas)

#### `GET /projects/:id`
Devuelve detalles de un proyecto específico (con mensajes)

#### `POST /projects`
Crea un nuevo proyecto (solo desde admin)

#### `PATCH /projects/:id`
Actualiza un proyecto existente (solo desde admin)

#### `DELETE /projects/:id`
Archiva un proyecto (mueve a history)

#### `POST /projects/:id/verify`
Verifica la contraseña de un proyecto
Body: `{ "password": "..." }`
Response: `{ "valid": true/false }`

#### `POST /projects/:id/messages`
Envía un mensaje a un proyecto
Body: `{ "sender": "manu"|"client", "body": "..." }`

#### `GET /projects/:id/stream`
SSE para recibir mensajes en tiempo real

#### `GET /history`
Devuelve lista de proyectos archivados (sin contraseñas)

#### `POST /history/:id/verify`
Verifica contraseña para acceder a un proyecto archivado

---

## Flujo de Autenticación

### Cliente

1. Cliente ve cuadrícula de proyectos activos
2. Cliente hace clic en un proyecto
3. Modal solicita contraseña
4. Frontend envía `POST /projects/:id/verify` con contraseña
5. Si válido, abre el chat
6. Cliente puede enviar mensajes como "client"

### Admin

1. Admin accede a `/admin.html`
2. Modal solicita contraseña maestra
3. Frontend verifica contraseña localmente (hardcoded)
4. Si válido, muestra panel de administración
5. Admin puede crear/editar/eliminar proyectos
6. Admin puede abrir cualquier chat como "Manu"

---

## Consideraciones Técnicas

### Seguridad

- **Contraseñas en texto plano**: Por petición del usuario, no se implementa encriptación
- **Contraseña maestra hardcoded**: Definida en el código frontend
- **Sin rate limiting**: Los clientes pueden intentar contraseñas infinitamente
- **Sin autenticación de admin en backend**: La verificación es solo frontend

### Persistencia

- Usa la misma infraestructura de GitHub que `gridChat`
- Archivo `projects.json` en lugar de `chats.json`
- Commits automáticos en cada cambio
- Manejo de conflictos con retry automático

### Tiempo Real

- SSE (Server-Sent Events) para actualizaciones en vivo
- Conexión por proyecto
- Reconexión automática en caso de error

### UI/UX

- Diseño minimalista basado en el estilo de `gridChat`
- Colores personalizables por proyecto
- Alineación de mensajes según rol (Manu vs Cliente)
- Responsive design para móviles

---

## Migración desde gridChat

### Cambios en el Backend

1. Renombrar rutas de `/threads` a `/projects`
2. Eliminar sistema de coordenadas (row, col)
3. Añadir sistema de contraseñas
4. Añadir sistema de activación/desactivación
5. Añadir sistema de historiales

### Cambios en el Frontend

1. Eliminar cuadrícula 10x10
2. Crear vista de lista de proyectos
3. Añadir modal de verificación de contraseña
4. Crear panel de administración completo
5. Modificar lógica de alineación de mensajes según rol

### Archivos a Modificar

- `backend/server.js` - Lógica del servidor
- `index.html` - Vista de cliente
- `app.js` - Lógica del frontend de cliente
- `style.css` - Estilos (mínimos cambios)

### Archivos Nuevos

- `admin.html` - Vista de administración
- `admin.js` - Lógica del panel de admin
- `projects.json` - Nuevo archivo de datos
