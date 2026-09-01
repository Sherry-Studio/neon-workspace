# NEON ARCADE — Admin Panel

Control panel for the NEON ARCADE platform (public site: `Sherry-Games-Website`,
backend: `Neon-Arcade-Backend`). Next.js 15 (App Router) · TypeScript · Tailwind v4 ·
TanStack Query · Recharts · Framer Motion.

Dark, cyan-accented, glass-panel admin UI — brand-aligned but usability-first
(no 3D, restrained motion).

---

## ⚠️ Backend status

At the time this admin was built, **`Neon-Arcade-Backend` had no REST API yet**
(only config scaffolding) and the public website used its own local NextAuth +
flat-file store. So this admin ships with:

- A **centralized, typed API client** (`src/lib/api/*`) — the only place the app
  talks to a server.
- A **complete in-memory mock API** (`src/app/api/mock/*` + `src/lib/mock/*`) that
  implements the exact contract the client expects, so every screen runs
  end-to-end today. Data resets on server restart.
- A single switch — `NEXT_PUBLIC_API_BASE_URL` — to point at the real backend
  when it exists. See **Wiring the real backend** below.

The mock is **not** the final implementation — it is a stand-in for the contract
in `src/lib/types.ts`.

---

## 1. Admin routes

| Route | Purpose |
|---|---|
| `/login` | Admin sign-in (`ADMIN` / `SUPER_ADMIN` only) |
| `/dashboard` | Live stats: users, active users, games, plays, scores + recent activity |
| `/users` | User table — search, filter (status/role), sort, paginate, suspend/activate/delete |
| `/users/[id]` | User detail — profile, account info, scores, notifications, admin actions, role change (SUPER_ADMIN) |
| `/games` | Game catalogue — publish/unpublish, feature/unfeature, archive, soft-delete |
| `/games/new`, `/games/[id]/edit` | Game form with validation, image upload, live public preview |
| `/leaderboard` | Scores with game/player/date filters + sort; view / delete suspicious score; top players & games charts |
| `/blog` | The Vault — article list, publish/unpublish, delete |
| `/blog/new`, `/blog/[id]/edit` | Markdown editor with live preview, tags, cover image |
| `/notifications` | Notification log + push-delivery availability banner |
| `/notifications/new` | Compose → ONE / MULTIPLE / ALL users; strong confirm for ALL ("send to N users") |
| `/analytics` | Users / plays / scores / registrations over time, top games/players; 7d/30d/90d/all |
| `/settings` | Admin profile, change password, manage admin roles (SUPER_ADMIN) |

All non-`/login` routes are protected by `src/middleware.ts` **and** re-guarded
server-side in `src/app/(admin)/layout.tsx`.

## 2. API endpoints used

Base path = `NEXT_PUBLIC_API_BASE_URL` (default `/api/mock`). Session endpoints
are always local (`/api/session/*`) because this app owns the session cookie.

```
POST   /api/session/login            email+password → sets httpOnly session cookie
GET    /api/session/me               current admin
POST   /api/session/logout

GET    {API}/dashboard
GET    {API}/analytics?range=7d|30d|90d|all
GET    {API}/search?q=

GET    {API}/users?page&pageSize&search&status&role&sort
GET    {API}/users/:id
PATCH  {API}/users/:id                 (username,email,status,role*)
PATCH  {API}/users/:id/status          {status}
PATCH  {API}/users/:id/role            {role}          (SUPER_ADMIN)
DELETE {API}/users/:id
GET    {API}/users/:id/scores
GET    {API}/users/:id/notifications

GET    {API}/games?page&pageSize&search&status&category&featured&sort
POST   {API}/games
GET    {API}/games/:id
PATCH  {API}/games/:id
PATCH  {API}/games/:id/status          {status}
PATCH  {API}/games/:id/featured        {featured}
DELETE {API}/games/:id                 (soft-delete → ARCHIVED)

GET    {API}/scores?page&pageSize&gameId&userId&search&from&to&sort
DELETE {API}/scores/:id
GET    {API}/leaderboard?gameId&userId&from&to&sort&limit

GET    {API}/blog?page&pageSize&search&status&category&sort
POST   {API}/blog
GET    {API}/blog/:id
PATCH  {API}/blog/:id
PATCH  {API}/blog/:id/status           {status}
DELETE {API}/blog/:id

GET    {API}/notifications?page&pageSize&search&type
POST   {API}/notifications             {title,message,type,audience,recipientIds?,link?,gameId?,blogId?}
GET    {API}/notifications/push-status
POST   {API}/notifications/audience-count

POST   {API}/uploads                   multipart file → {url}

GET    {API}/admins                    (SUPER_ADMIN)
PATCH  {API}/settings/profile
POST   {API}/settings/password
```

## 3. Environment variables

Copy `.env.example` → `.env.local`:

| Var | Meaning |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `/api/mock` (default) or the real backend base, e.g. `https://api.neonarcade.dev/api` |
| `NEXT_PUBLIC_ENV_LABEL` | Label shown in the sidebar footer |
| `ADMIN_SESSION_SECRET` | HS256 secret for the session cookie (min 16 chars). `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `MOCK_SUPER_ADMIN_EMAIL` / `MOCK_SUPER_ADMIN_PASSWORD` | Seed SUPER_ADMIN for the mock API only |
| `FCM_ENABLED` | `true` to make the mock report push delivery as available |

No backend/JWT/DB/Firebase/storage secrets live in this repo. When proxying a real
backend, put its server-only secrets in the server environment, never in `NEXT_PUBLIC_*`.

## 4. Run locally

```bash
npm install
cp .env.example .env.local   # then edit ADMIN_SESSION_SECRET
npm run dev                   # http://localhost:5173
```

Mock sign-in: `admin@neonarcade.dev` / `ChangeMe_Str0ng!Pass` (SUPER_ADMIN),
`kira@neonarcade.dev` / `Admin_Str0ng!Pass` (ADMIN).

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm run lint
```

## 5. How admin authentication works

1. `/login` POSTs to `/api/session/login`.
2. In **mock mode** the route checks the mock credential store. Against a **real
   backend** it proxies `POST {API}/auth/login` and keeps the returned access token.
3. On success the route mints an HS256 JWT (`jose`) containing the `AuthUser`
   (+ backend access token if any) and sets it as an **httpOnly, SameSite=Lax,
   Secure-in-prod** cookie (`na_admin_session`, 8h).
4. `src/middleware.ts` verifies the cookie on every request and redirects to
   `/login` when missing/expired, or `/login?error=forbidden` when the role is
   `USER`.
5. `src/app/(admin)/layout.tsx` calls `requireAdmin()` again server-side.
6. The client `useSession()` hook reads `/api/session/me`; nav items and action
   buttons are filtered by `permissionsForRole()` — **UI gating only; the backend
   must still enforce authorization.**

`USER` accounts are rejected at login with an explicit "not authorized" message.

## 6. Creating the first SUPER_ADMIN

**Mock mode:** set `MOCK_SUPER_ADMIN_EMAIL` / `MOCK_SUPER_ADMIN_PASSWORD` in
`.env.local` and restart — it is seeded automatically. Promote others via
**Settings → Manage admin users** or a user's detail page (**Change role**).

**Real backend (`Neon-Arcade-Backend`):** that repo ships `npm run seed`, driven
by `SEED_ADMIN_USERNAME` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in its own
`.env`. Run it once against your database:

```bash
# in the backend repo
cp .env.example .env   # set SEED_ADMIN_* and MONGODB_URI
npm run seed
```

Then sign in here with those credentials and manage further admins from Settings.
(If the backend exposes no seed in your version, insert one user document with
`role: "SUPER_ADMIN"` and an argon2 password hash directly, then rotate the
password from Settings.)

## 7. Wiring the real backend

1. Set `NEXT_PUBLIC_API_BASE_URL` to the backend base URL.
2. Ensure the backend implements the contract in section 2 / `src/lib/types.ts`.
   Where field names differ, add a thin adapter inside the relevant
   `src/lib/api/*.ts` module — components never change.
3. `src/app/api/session/login/route.ts` already proxies `POST /auth/login` and
   stores `accessToken`. If the backend needs that token on every call, change
   `apiRequest` in `src/lib/api/client.ts` to route through a small
   `/api/proxy/*` handler that reads the token from the session and adds
   `Authorization: Bearer …` (kept out of the browser).
4. Delete `src/app/api/mock/**` and `src/lib/mock/**` once the backend is live.
5. Confirm CORS on the backend allows this origin (its `.env` has `ADMIN_URL` /
   `CORS_ORIGINS`; default dev origin is `http://localhost:5173`).

## 8. Deploy

- **Vercel** (recommended): import the repo, set the env vars from section 3
  (`ADMIN_SESSION_SECRET` as an encrypted var), deploy. Middleware runs on the
  edge automatically.
- **Node / container**: `npm run build && npm start` (serves on `:5173`; put it
  behind TLS). Set `NODE_ENV=production` so the session cookie is `Secure`.
- Point `NEXT_PUBLIC_API_BASE_URL` at the deployed backend and add the admin
  origin to the backend's `CORS_ORIGINS`.
- This app sends `X-Robots-Tag: noindex` via metadata; keep it behind auth and,
  ideally, network restrictions.

## Testing checklist status

Verified against the mock API: login (valid/invalid/forbidden role), route
protection, dashboard, users list/search/sort/pagination/suspend/activate/delete,
user detail + role change, games list + create + edit + publish/unpublish +
feature + archive + soft-delete, leaderboard + delete score, blog list + create +
edit + publish + delete, notifications list + send to one/multiple/all (+ ALL
confirmation), analytics ranges, global search, settings (profile/password/admin
roles), logout, responsive layout (sidebar collapse, horizontal-scroll tables),
loading skeletons, empty states, error + retry states. `npm run build`,
`npm run typecheck`, `npm run lint` all pass.
