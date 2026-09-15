# Parroquia Universitaria UdeC

Plataforma web con acceso diferenciado por roles para la gestión pastoral y administrativa de la Parroquia Universitaria de la Universidad de Concepción.

Proyecto de Título — Ingeniería en Ejecución Computacional e Informática, Universidad del Bío-Bío.

## ¿Qué resuelve?

- **Difusión y memoria histórica**: publicaciones segmentadas por organismo pastoral (catequesis, Trabajo País, apoyo a niños con cáncer, etc.) y una línea de tiempo interactiva de la historia de la parroquia.
- **Usuarios y agendamiento**: autenticación con roles (administrador, encargado de organismo, encargado de comedor, feligrés), agendamiento de sacramentos con carga de documentos e inscripción a actividades.
- **Inventariado del comedor solidario**: control de ingreso/salida de insumos con dashboard de reportería.
- **Redes sociales**: sincronización y programación de publicaciones.

## Estructura del repositorio

```
backend/    API REST — Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
frontend/   Cliente web — Vite, React, TypeScript
docs/       Documentación del proyecto (historias de usuario, etc.)
```

## Cómo levantar el proyecto

### Backend

```bash
cd backend
npm install
# crear .env con DATABASE_URL, JWT_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD
npx prisma migrate dev
npx ts-node --transpile-only prisma/seed.ts   # crea el usuario administrador inicial
npm run dev
```

El seed crea un usuario con el correo `ADMIN_EMAIL` y contraseña `ADMIN_PASSWORD` definidos en tu `.env`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Flujo de trabajo

- Estrategia: GitHub Flow
- `main` siempre debe estar estable/desplegable
- Todo cambio se hace en una rama `feature/nombre-descriptivo`
- Los cambios llegan a `main` mediante Pull Request (no commits directos)
- Commits siguiendo Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`

## Licencia

Este proyecto está licenciado bajo los términos de la [Licencia MIT](LICENSE).
