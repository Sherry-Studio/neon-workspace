# NEON ARCADE — Monorepo

Three applications that together make up the NEON ARCADE browser-gaming platform:

| Path        | What it is                    | Stack                                   | Dev port |
|-------------|-------------------------------|-----------------------------------------|----------|
| `backend/`  | REST API + database + auth    | Express 4, TypeScript, MongoDB/Mongoose | `4000`   |
| `frontend/` | Public website                | Next.js 15 (App Router), React 19       | `3000`   |
| `admin/`    | Admin panel                   | Next.js 15, React Query                 | `5173`   |

The **backend is the single source of truth**. The frontend and admin never hold
their own copy of application data — they read and write it through the backend
API (`backend/src/routes`). The apps stay logically separate; they only
communicate over HTTP.

```
frontend  ──HTTP──▶  backend  ◀──HTTP──  admin
                       │
                    MongoDB
```

## Prerequisites

- Node.js >= 20
- A MongoDB instance (local `mongod`, Docker, or MongoDB Atlas)

## First-time setup

```bash
# 1. install dependencies for all three apps
npm run install:all
# (also installs this repo's orchestration dev-deps)
npm install

# 2. create env files from the examples
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env.local
cp admin/.env.example    admin/.env.local
# then edit each one — see "Environment variables" below

# 3. seed the database (admin user + starter games/blog posts)
npm run seed
```

## Running everything

```bash
npm run dev
```

Starts all three apps together:

- API      → http://localhost:4000  (docs at `/api/docs`)
- Website  → http://localhost:3000
- Admin    → http://localhost:5173

Run one at a time with `npm run dev:backend` / `dev:frontend` / `dev:admin`.

## Production build

```bash
npm run build          # builds all three
npm run start:backend  # node dist/server.js
npm run start:frontend # next start
npm run start:admin    # next start -p 5173
```

## Environment variables

Each app has its own `.env.example`. Secrets (`.env`, `.env.local`) are
git-ignored — only the `.env.example` templates are committed.

- **backend** — `backend/.env.example`: `MONGODB_URI`, `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, seed admin credentials, optional storage
  (Cloudinary/S3) and Firebase (FCM) config.
- **frontend** — `frontend/.env.example`: `NEXT_PUBLIC_API_BASE_URL` (browser),
  `BACKEND_INTERNAL_URL` (server-side), `AUTH_SECRET`.
- **admin** — `admin/.env.example`: `NEXT_PUBLIC_API_BASE_URL` (points at the
  admin's own `/api/admin` proxy), `BACKEND_INTERNAL_URL`, `ADMIN_SESSION_SECRET`.

## How auth works

- **Website users** sign up / log in through the backend (`/api/auth/*`).
  next-auth is kept only as a session wrapper: its `authorize()` calls the
  backend and stores the backend-issued JWTs in the session.
- **Admins** sign in at `/login` in the admin app. The admin's session route
  proxies `POST /api/auth/login`, checks the role is `ADMIN` / `SUPER_ADMIN`,
  and stores the backend access token in an httpOnly session cookie. All admin
  data requests go through `/api/admin/*`, which injects the bearer token before
  forwarding to the backend. **A normal user cannot access the admin app** — the
  role check happens in the backend and in the admin middleware.
