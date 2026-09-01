# NEON ARCADE — Backend

Production API for the **NEON ARCADE** gaming platform. Node.js + Express +
TypeScript + MongoDB (Mongoose). JWT auth (access + refresh), Argon2id password
hashing, Zod validation, Helmet, CORS allow-list, rate limiting, Swagger docs,
Vitest tests.

It is built to serve the existing **Sherry-Games-Website** frontend (NEON ARCADE
UI — games showcase, login/signup, profile, The Vault / Arcade Archives,
leaderboards) and a separate admin panel, without any frontend redesign.

---

## 1. API route list

Base path: **`/api`**. Standard envelope:

```jsonc
// success
{ "success": true, "message": "…", "data": { … }, "meta": { … } }   // meta on list endpoints
// error
{ "success": false, "message": "…", "errors": [ { "field": "…", "message": "…" } ] }
```

Auth: send `Authorization: Bearer <accessToken>` (tokens are also set as
httpOnly cookies `accessToken` / `refreshToken`).

### Auth — `/api/auth`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` (alias `/signup`) | – | `username, password` required; `email, confirmPassword, avatar` optional |
| POST | `/login` | – | body `{ username \| email \| identifier, password }` |
| POST | `/refresh` | cookie/body refresh token | rotates tokens |
| POST | `/logout` | ✔ | revokes all sessions (bumps tokenVersion) |
| GET | `/me` | ✔ | current user |
| GET | `/verify` | ✔ | validate access token |
| POST | `/forgot-password` | – | `{ email }` — always 200 |
| POST | `/reset-password` | – | `{ token, password }` |
| POST | `/change-password` | ✔ | `{ currentPassword, newPassword }` |
| POST | `/send-verification` | ✔ | emails a verification link |
| GET | `/verify-email/:token` | – | marks email verified |

### Users — `/api/users`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/me` | ✔ | full self profile |
| PUT / PATCH | `/me` | ✔ | update `username`, `avatar`, `bio` only |
| GET | `/me/achievements` | ✔ | unlocked achievements |
| GET | `/:username` | – | public profile + recent activity |

### Games — `/api/games`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | – | published only; `?page,limit,search,sort,category,featured` |
| GET | `/featured` | – | featured published games |
| GET | `/category/:category` | – | e.g. `/category/RACING` |
| GET | `/:slug` | – | single published game |
| POST | `/:gameId/play` | ✔ | start a play session (returns `playSessionId`), increments `plays` |
| POST | `/play/complete` | ✔ | `{ playSessionId, score?, durationSeconds? }` |
| POST | `/` | admin | create game |
| PUT | `/:id` | admin | update |
| DELETE | `/:id` | admin | delete |
| PATCH | `/:id/status` | admin | `{ status: DRAFT\|PUBLISHED\|ARCHIVED }` |
| PATCH | `/:id/featured` | admin | `{ featured: boolean }` |

### Scores — `/api/scores`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | ✔ | `{ gameId, score, duration?, playSessionId?, metadata? }` — anti-abuse checks, may be flagged |
| GET | `/my` | ✔ | my scores; `?gameId,page,limit,sort` |
| GET | `/game/:gameId` | – | scores for a game (flagged excluded) |

### Leaderboard — `/api/leaderboard`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | optional | global (best score per player); `?range=day\|week\|month\|all&page,limit` |
| GET | `/:gameId` | optional | per-game; `meta.game` describes the game |

### Achievements — `/api/achievements`
| GET | `/` | – | active achievement definitions |

### Blog / Arcade Archives (The Vault) — `/api/blog`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | – | published; `?page,limit,search,category` |
| GET | `/:slug` | – | single post (increments `views`) |
| POST | `/` | admin | create |
| PUT | `/:id` | admin | update |
| DELETE | `/:id` | admin | delete |
| PATCH | `/:id/publish` | admin | `{ published: boolean }` |

### Notifications — `/api/notifications` (all auth)
| GET | `/` | list (`?unread=true`, `meta.unread` count) |
| PATCH | `/:id/read` | mark one read |
| PATCH | `/read-all` | mark all read |
| DELETE | `/:id` | delete |
| POST | `/devices` | register FCM device `{ token, platform }` |
| DELETE | `/devices` | unregister `{ token }` |

### Admin — `/api/admin` (ADMIN or SUPER_ADMIN; role-flagged actions need SUPER_ADMIN)
```
GET    /users            ?page,limit,search,sort,status=active|suspended|verified|unverified
GET    /users/:id
PUT    /users/:id
PATCH  /users/:id/suspend
PATCH  /users/:id/activate
PATCH  /users/:id/role          (SUPER_ADMIN)   { role }
DELETE /users/:id               (SUPER_ADMIN)

GET    /games   ·  GET /games/:id  ·  POST /games  ·  PUT /games/:id  ·  DELETE /games/:id
PATCH  /games/:id/status  ·  PATCH /games/:id/featured

GET    /blog  ·  GET /blog/:id  ·  POST /blog  ·  PUT /blog/:id  ·  DELETE /blog/:id  ·  PATCH /blog/:id/publish

GET    /scores           ?search(player),gameId,userId,flagged=true|false,sort,page,limit
PATCH  /scores/:id/flag  { flagged, reason? }
DELETE /scores/:id
POST   /leaderboard/:gameId/reset

GET    /achievements  ·  POST /achievements  ·  PUT /achievements/:id  ·  DELETE /achievements/:id
POST   /achievements/grant       { userId, achievementKey }

POST   /notifications            { title, message, type?, target: all|user|users, userId?, userIds?, push? }

GET    /analytics/overview  ·  /analytics/games  ·  /analytics/users  ·  /analytics/scores
GET    /audit-logs
POST   /uploads/sign            { folder: games|banners|blog|avatars, filename, contentType }
```

### Misc
```
GET /api/health          liveness + db state
GET /api/stats/public     { publishedGames, totalPlays }  — homepage counters
GET /api/docs             Swagger UI (SWAGGER_ENABLED)
GET /api/openapi.json     raw spec
```

---

## 2. Database schema / models

All collections use Mongoose timestamps (`createdAt`, `updatedAt`).

### User (`users`)
`username`, `usernameLower` *(unique idx)*, `email` *(unique sparse idx)*,
`passwordHash` *(select:false, Argon2id)*, `avatar` *(preset id)*, `bio`,
`role` `USER|ADMIN|SUPER_ADMIN`, `isActive`, `isVerified`, `tokenVersion`,
`stats { gamesPlayed, totalScore, highestScore, lastPlayedAt }`,
`achievements: ObjectId[]`, `lastLoginAt`.
Indexes: `usernameLower`, `email`, `role`, `isActive`, `createdAt`, `stats.totalScore`.

### Game (`games`)
`title`, `slug` *(unique idx)*, `description`, `shortDescription`, `thumbnail`,
`banner`, `category` `ARCADE|RACING|SHOOTER|ACTION|CASUAL`, `status`
`DRAFT|PUBLISHED|ARCHIVED`, `gameUrl`, `version`, `plays`, `likes`, `featured`,
`instructions`, `controls: string[]`, plus frontend display fields `genre`,
`tagline`, `gradient`, `createdBy`.
Indexes: `slug`, `status`, `category`, `featured`, compound `status+featured`,
`status+category`, text index on `title/description/shortDescription`.

### Score (`scores`)
`userId`, `gameId`, `score`, `duration`, `metadata`, `playSessionId`, `flagged`,
`flagReason`. Indexes: `gameId+score`, `userId+gameId+score`, `createdAt`,
`flagged+score`.

### GamePlay (`gameplays`)
`userId`, `gameId`, `startedAt`, `completedAt`, `score`, `durationSeconds`,
`ipHash`, `userAgent`.

### Achievement (`achievements`)
`key` *(unique)*, `title`, `description`, `icon`, `ruleType`
`FIRST_GAME|GAMES_PLAYED|HIGH_SCORE|TOTAL_SCORE|FIRST_WIN|MANUAL`, `threshold`,
`gameId?`, `isActive`.

### UserAchievement (`userachievements`)
`userId`, `achievementId`, `unlockedAt`. Unique compound `(userId, achievementId)`.

### Blog (`blogs`)
`title`, `slug` *(unique)*, `excerpt`, `content`, `contentBlocks: string[]`,
`coverImage`, `heroGradient`, `category` (GAME HISTORY / GAMING NEWS / GAME
DEVELOPMENT / GAMING CULTURE / TIPS & TRICKS), `author`, `authorName`,
`tags: string[]`, `status` `DRAFT|PUBLISHED`, `readTime`, `pullQuote`,
`relatedGames: string[]`, `views`, `publishedAt`. Text index + `status+publishedAt`.

### Notification (`notifications`)
`recipient`, `title`, `message`, `type`, `isRead`, `readAt`, `metadata`,
`createdBy`. Index `recipient+isRead+createdAt`.

### Token (`tokens`)
`userId`, `tokenHash` *(sha256)*, `purpose` `PASSWORD_RESET|EMAIL_VERIFICATION`,
`expiresAt` *(TTL index)*, `usedAt`.

### AuditLog (`auditlogs`)
`actor`, `actorUsername`, `action`, `targetType`, `targetId`, `details`,
`ipHash`, `createdAt`. Written for every destructive/admin mutation.

### DeviceToken (`devicetokens`)
`userId`, `token` *(unique)*, `platform`, `lastSeenAt` — FCM registrations.

---

## 3. Environment variables

See [`.env.example`](.env.example) — copy it to `.env`. Summary:

| Var | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | runtime |
| `MONGODB_URI` | Mongo connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | token signing (≥16 chars, use 48+ random bytes) |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | e.g. `15m`, `30d` |
| `RESET_TOKEN_TTL_MIN`, `VERIFY_TOKEN_TTL_MIN` | email token lifetimes |
| `FRONTEND_URL`, `ADMIN_URL`, `CORS_ORIGINS` | CORS allow-list (comma-separated) + link building |
| `COOKIE_DOMAIN`, `COOKIE_SECURE` | auth cookie behaviour |
| `SEED_ADMIN_USERNAME/EMAIL/PASSWORD`, `SEED_DEMO_USERS` | `npm run seed` inputs |
| `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM` | transactional email (optional — logs if unset) |
| `STORAGE_PROVIDER` (`local\|cloudinary\|s3`), `STORAGE_PUBLIC_BASE_URL` | image storage |
| `CLOUDINARY_*` / `S3_*` | provider credentials |
| `FCM_ENABLED`, `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY` | push notifications (optional) |
| `SWAGGER_ENABLED`, `SWAGGER_ROUTE` | API docs |
| `RATE_LIMIT_WINDOW_MIN`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX` | rate limiting |

Secrets are **never** hardcoded; the app refuses to boot on an invalid `.env`.

---

## 4. Run locally

Requires Node ≥ 20 and a MongoDB instance (local `mongod`, Docker, or a free
MongoDB Atlas cluster).

```bash
git clone <this-repo> && cd Neon-Arcade-Backend
npm install
cp .env.example .env          # then edit: MONGODB_URI + the two JWT secrets
npm run seed                  # optional: initial games / posts / admin / demo data
npm run dev                   # http://localhost:4000  · docs at /api/docs
```

Quick MongoDB via Docker:

```bash
docker run -d --name neon-mongo -p 27017:27017 mongo:7
```

Other scripts: `npm run build` → `npm start` (production), `npm run typecheck`,
`npm run lint`, `npm test` (Vitest + in-memory MongoDB, no external DB needed).

---

## 5. Seed the database

```bash
npm run seed
```

Idempotent (safe to re-run). It:

- creates/ensures a **SUPER_ADMIN** from `SEED_ADMIN_*` env vars,
- upserts the 3 launch games — **Neon Runner**, **Neon Space Shooter**,
  **Neon Drift Racer** (thereafter fully managed via the admin API),
- upserts the achievement definitions,
- upserts the 4 Arcade Archives posts (ported from the frontend's `articles.ts`),
- if `SEED_DEMO_USERS=true`, creates 5 demo players with randomized scores so the
  leaderboard is populated (demo password: `DemoPass123`).

---

## 6. Deploy

The app is a standard stateless Node service — deploy anywhere (Render, Railway,
Fly.io, a VPS, ECS, etc.).

```bash
npm ci
npm run build          # → dist/
NODE_ENV=production node dist/server.js
```

Checklist:

1. Provision MongoDB (Atlas recommended) → set `MONGODB_URI`.
2. Set strong unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`.
3. Set `NODE_ENV=production`, `COOKIE_SECURE=true`, and `CORS_ORIGINS` to your real
   frontend + admin origins.
4. `SWAGGER_ENABLED=false` (or protect `/api/docs`).
5. Configure SMTP for real email; configure `STORAGE_PROVIDER` + credentials for
   image uploads; optionally enable FCM.
6. Run `npm run seed` once against production (with production `SEED_ADMIN_*`).
7. Point a process manager / platform healthcheck at `GET /api/health`.
8. Terminate TLS at your platform/reverse proxy; `trust proxy` is already set.

Dockerfile:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

---

## 7. Admin credentials setup

No credentials are committed. The first admin is created by the seed script from
env vars:

```bash
# .env
SEED_ADMIN_USERNAME=neonadmin
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=<a strong password>

npm run seed
```

Then sign in via `POST /api/auth/login { "username": "neonadmin", "password": "…" }`.
Change the password immediately with `POST /api/auth/change-password`.

- Promote another user: `PATCH /api/admin/users/:id/role { "role": "ADMIN" }`
  (SUPER_ADMIN only).
- Normal `USER` accounts can never reach `/api/admin/*` (403).
- Suspending a user (`/suspend`) bumps their `tokenVersion`, instantly killing
  active sessions and blocking login.

---

## 8. Frontend API base URL configuration

The current frontend (`Sherry-Games-Website`) ships its own Next.js API routes and
NextAuth. To consume this backend instead, add to the frontend `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api      # prod: https://api.yourdomain.com/api
```

Field compatibility is already handled:

- **Signup** – `POST /api/auth/register` (and alias `/api/auth/signup`) accepts the
  exact frontend payload `{ username, password, avatar }`; `email`/`confirmPassword`
  are optional. Avatar preset ids match `src/lib/avatars.ts`.
- **Login** – `POST /api/auth/login` accepts `{ username, password }`.
- **Profile** – `GET/PUT /api/users/me` returns `{ user: { username, avatar, bio, stats, … } }`;
  only `username`, `avatar`, `bio` are user-editable (role/scores/status are not).
- **Games** – `GET /api/games` items include `title, slug, image, genre, tagline,
  platform, gradient, category` — the shape `GameCoverCard` expects.
- **The Vault** – `GET /api/blog` / `GET /api/blog/:slug` return `title, slug,
  excerpt, content (array of paragraphs), category, author, readTime, publishDate,
  heroImage, heroGradient, pullQuote, relatedGames` — matching `articles.ts`.
- **Leaderboard** – `GET /api/leaderboard` and `/api/leaderboard/:gameId` return
  ranked `{ rank, username, avatar, score }` rows.
- **Notifications** – `GET /api/notifications` with `meta.unread`.

CORS: add the frontend and admin origins to `CORS_ORIGINS`; the API sends
`Access-Control-Allow-Credentials: true` so cookie-based auth works cross-origin.

---

## Project structure

```
src/
├── config/        env (zod-validated), logger, database, openapi
├── controllers/   thin HTTP handlers
├── middleware/    auth (requireAuth/requireAdmin/requireSuperAdmin), validate, rateLimit, error, requestId
├── models/        Mongoose schemas
├── routes/        route definitions → controllers
├── services/      business logic (auth, user, game, score, leaderboard, blog, notification, analytics, storage, email, push, audit)
├── utils/         ApiError, apiResponse, jwt, password, pagination, slugify, crypto, seed
├── validators/    Zod request schemas
├── types/         shared enums + Express augmentation
├── app.ts         Express app factory
└── server.ts      bootstrap + graceful shutdown
tests/             Vitest + mongodb-memory-server
```
