# Parroquia Universitaria UdeC

Plataforma web con acceso diferenciado por roles para la gestión pastoral y administrativa de la Parroquia Universitaria de la Universidad de Concepción.

Proyecto de Título — Ingeniería en Ejecución Computacional e Informática, Universidad del Bío-Bío.

## Funcionalidades

| Módulo | Estado | Qué incluye |
|---|---|---|
| Usuarios y roles | Hecho | Registro público, inicio de sesión con JWT, gestión de usuarios por el administrador, cambio y recuperación de contraseña por cuenta propia con aviso por correo, y límite de intentos de inicio de sesión |
| Organismos y publicaciones | Hecho | Noticias con fotos segmentadas por organismo pastoral y página pública de inicio |
| Agendamiento de sacramentos | Hecho | Horarios con cupos, solicitudes con documentos PDF, revisión por secretaría y avisos por correo |
| Inventario del comedor | Hecho | Insumos, lotes con vencimiento, salidas por FEFO, alertas, reportes y exportación a CSV |
| Inscripción a actividades | Hecho | Cupos, aprobación del encargado, lista de espera, confirmación de asistencia (48 a 24 h antes) y registro de asistencia |
| Memoria histórica | Hecho | Línea de tiempo pública con hitos agrupados por año, hasta 6 fotos por hito y testimonios, gestionados por el administrador |
| Redes sociales | Pendiente | Publicación en redes, en versión reducida |

### Roles

| Rol | Puede |
|---|---|
| Administrador | Gestionar todo el sistema |
| Secretaria | Gestionar horarios y solicitudes de sacramentos |
| Encargado de organismo | Publicar noticias y actividades de su organismo y revisar sus inscritos |
| Encargado de comedor | Gestionar el inventario del comedor |
| Feligrés | Agendar sacramentos e inscribirse en actividades |

## Tecnologías

- **Backend:** Node.js, Express 5, TypeScript, Prisma 7, PostgreSQL, JWT, bcrypt y Nodemailer
- **Frontend:** React 19, Vite y TypeScript
- **Pruebas:** Vitest, Supertest y Cypress
- **Integración y despliegue continuos:** GitHub Actions con un runner propio y PM2
- **Contenedores:** Docker y Docker Compose (base de datos, backend y frontend)

## Estructura del repositorio

```
backend/
  prisma/            schema.prisma, migraciones y seed del administrador
  src/
    routes/          URLs de la API y middlewares de cada una
    middlewares/     autenticación, roles, límite de intentos y subida de archivos
    controllers/     validan la petición y responden con el código HTTP
    services/        lógica de negocio y acceso a datos con Prisma
    utils/           funciones auxiliares puras y envío de correos
    constants/       reglas y valores fijos del negocio
    jobs/            tareas periódicas (revisión de plazos de inscripción)
    config/          conexión a la base de datos, CORS y carpeta de documentos
    tests/           pruebas unitarias (unit/) y de integración (integration/)
    generated/       cliente de Prisma generado (no se versiona)
frontend/
  src/
    components/      pantallas y componentes
    services/        llamadas a la API
    hooks/ context/  lógica reutilizable y estado compartido
    constants/ utils/ styles/
  cypress/e2e/       pruebas end-to-end
docs/                historias de usuario y colección de Postman
```

## Cómo levantar el proyecto

Requisitos: Node.js 22 o superior y PostgreSQL.

### Backend

1. Instala las dependencias:
   ```bash
   cd backend
   npm install
   ```
2. Crea `backend/.env` con estas variables:

   | Variable | Obligatoria | Descripción |
   |---|---|---|
   | `DATABASE_URL` | Sí | Conexión a PostgreSQL |
   | `JWT_SECRET` | Sí | Clave para firmar las sesiones |
   | `FRONTEND_URL` | Sí | URL del frontend: origen permitido por CORS y enlace del correo de recuperación |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Para el seed | Datos del administrador inicial |
   | `SMTP_USER`, `SMTP_PASS` | Para los correos | Cuenta de Gmail y su contraseña de aplicación |
   | `PORT` | No | Puerto de la API (por defecto, 3000) |
   | `CORS_ORIGENES` | No | Otros orígenes permitidos, separados por comas |
   | `DOCUMENTOS_DIR` | No | Carpeta para los PDF de las solicitudes |

3. Prepara la base de datos y crea el administrador:
   ```bash
   npx prisma migrate dev --config prisma7.config.ts
   npx prisma generate --config prisma7.config.ts
   npx ts-node --transpile-only prisma/seed.ts
   ```
4. Inicia la API:
   ```bash
   npm run dev
   ```

### Frontend

1. Instala las dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Crea `frontend/.env` con `VITE_API_URL`, la URL del backend (por ejemplo, `http://localhost:3000`).
3. Inicia el cliente:
   ```bash
   npm run dev
   ```

### Con Docker

Levanta la base de datos (PostgreSQL 16), el backend y el frontend en contenedores, sin instalar Node.js ni PostgreSQL. Requiere Docker con Docker Compose y el archivo `backend/.env` con `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` y, para los correos, `SMTP_USER` y `SMTP_PASS`. La conexión a la base de datos y la URL del frontend las define el `docker-compose.yaml`.

```bash
docker compose up -d --build   # construye y levanta los tres contenedores
docker compose ps              # estado de los contenedores
docker compose logs backend    # mensajes del backend
docker compose down            # detiene los contenedores sin borrar los datos
```

La página queda en `http://localhost:4173` y la API en `http://localhost:3000`. Al arrancar, el backend aplica las migraciones y crea el administrador inicial. La base de datos, las fotos y los documentos se guardan en volúmenes, así que no se pierden al detener los contenedores; `docker compose down -v` sí los borra.

## Pruebas

### Unitarias y de integración (backend)

Las de integración usan la base de datos de `DATABASE_URL`. Crean sus propios datos, los borran al terminar y simulan el envío de correos.

```bash
cd backend
npx vitest run                     # todas
npx vitest run src/tests/unit      # unitarias
npx vitest run src/tests/integration   # integración
```

### End-to-end (Cypress)

Requieren el backend y el frontend en ejecución, y el archivo `frontend/cypress.env.json` (no se versiona) con `API_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FELIGRES_EMAIL` y `FELIGRES_PASSWORD`.

```bash
cd frontend
npx cypress open    # modo interactivo, con pausas entre acciones
npx cypress run     # todas, sin ventana
```

## Integración y despliegue continuos

El workflow `.github/workflows/ci-cd.yml` se ejecuta en cada Pull Request hacia `main` y en cada push a `main`. Tiene dos jobs:

1. **verificar** (en GitHub): instala las dependencias, genera el cliente de Prisma, revisa los tipos del backend y hace el lint y el build del frontend.
2. **desplegar** (solo en push a `main`, en el runner del servidor):
   - copia las variables de entorno del servidor;
   - aplica las migraciones;
   - compila el frontend;
   - reinicia la API y el cliente con PM2.

## Flujo de trabajo

- Una rama por funcionalidad o corrección (`feat/...` o `fix/...`), creada desde `develop`.
- Pull Request a `develop` y, cuando está estable, de `develop` a `main`, que es la rama que se despliega.
- Commits con Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:` y `refactor:`.
- Las ramas se conservan después del merge, para mantener el historial.

## Licencia

Este proyecto está licenciado bajo los términos de la [Licencia MIT](LICENSE).
