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

## Deploying to Vercel (one project, multiple services)

The repo ships a root `vercel.json` using [Vercel Services](https://vercel.com/docs/services):
`frontend/` and `backend/` deploy as two services on **one** project and one
domain. Top-level rewrites send `/api/*` to the Express backend, except
`/api/auth/*`, `/api/profile` and `/api/gateway/*`, which stay with Next.js.

**Import the repo** with Application Preset = **Services**, Root Directory `./`.

**Environment variables** (Project → Settings → Environment Variables — they are
shared by both services):

| Variable | Value | Used by |
|---|---|---|
| `MONGODB_URI` | your MongoDB Atlas connection string | backend (required) |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 48` | backend (required) |
| `JWT_REFRESH_SECRET` | a different `openssl rand -hex 48` | backend (required) |
| `AUTH_SECRET` | `openssl rand -hex 32` | frontend (required) |
| `AUTH_TRUST_HOST` | `true` | frontend |
| `STORAGE_PROVIDER` | `cloudinary` | backend (disk uploads don't work on serverless) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from your Cloudinary dashboard | backend (image uploads) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | your choice | backend (seed script) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | your SMTP provider | backend (password-reset emails; optional) |
| `CORS_ORIGINS` | your custom domain(s), comma-separated | backend (only if using a custom domain — `*.vercel.app` is auto-allowed) |

`NODE_ENV=production`, `VERCEL`, `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`
are set by Vercel automatically. You do **not** need `NEXT_PUBLIC_API_BASE_URL`
or `BACKEND_INTERNAL_URL` — the frontend talks to the backend on the same origin.

**Seed the production database** (run locally, pointed at the prod DB):

```bash
MONGODB_URI="<prod uri>" SEED_ADMIN_EMAIL="you@x.com" SEED_ADMIN_PASSWORD="<pw>" \
  SEED_DEMO_USERS=false npm --prefix backend run seed
```

**The admin panel deploys as a separate Vercel project** (Root Directory
`admin`), because mounting a second Next.js app on a subpath needs its own
`basePath`. Set on that project:

| Variable | Value |
|---|---|
| `ADMIN_SESSION_SECRET` | `openssl rand -hex 48` |
| `BACKEND_INTERNAL_URL` | `https://<your-services-project-domain>/api` |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/admin` |

## Firebase

**Firebase is not currently required and is not installed.** In-app
notifications work end to end without it (admin → backend → the user's
notification bell).

The only justified future use is **web push (FCM)**. The backend already has the
scaffolding for it — `DeviceToken` model, `push.service.ts`, device
register/unregister routes, and `FCM_ENABLED` / `FIREBASE_*` env vars. To turn it
on later:

1. Backend: `npm i firebase-admin`, fill `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (service account — **never**
   commit these), set `FCM_ENABLED=true`, and un-stub the two marked lines in
   `backend/src/services/push.service.ts`.
2. Frontend: `npm i firebase`, fill the `NEXT_PUBLIC_FIREBASE_*` vars (public
   web-app config), add a service worker, request notification permission, and
   POST the token to `/api/backend/notifications/devices`.
3. Firebase console: enable Cloud Messaging and generate a Web Push (VAPID) key.

The Firebase Admin credentials stay on the backend only; the frontend gets just
the public web config.

## Known issues

- The homepage logs a React hydration warning in dev caused by the Google
  AdSense script (`layout.tsx`) injecting into `<head>`. It's cosmetic and
  predates this integration; remove the AdSense `<Script>` if you don't need ads.

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
