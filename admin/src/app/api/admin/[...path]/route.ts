import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Same-origin proxy between the admin panel and the NEON ARCADE backend.
 *
 * The admin UI talks only to `/api/admin/*` (see `NEXT_PUBLIC_API_BASE_URL`).
 * This route:
 *   1. authenticates the request against the admin session cookie,
 *   2. attaches the backend access token as a Bearer header,
 *   3. rewrites admin-flavoured paths to the backend's REST shape,
 *   4. unwraps the backend's `{ success, data, meta }` envelope into the flat
 *      shapes the admin's `src/lib/api/*` clients expect.
 *
 * Keeping every translation here means the UI and its API clients never had to
 * change when the real backend replaced the old in-memory mock.
 */

const BACKEND = (
  process.env.BACKEND_INTERNAL_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

type Json = Record<string, unknown>;

// ── helpers ────────────────────────────────────────────────────────────────

function translateSort(sort?: string | null): string | undefined {
  if (!sort) return undefined;
  return sort
    .split(",")
    .map((part) => {
      const [field, dir] = part.split(":");
      if (dir === "desc") return `-${field}`;
      if (dir === "asc") return field;
      return part;
    })
    .join(",");
}

function buildQuery(src: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const [k, v] of src.entries()) {
    if (v === "" || v == null) continue;
    if (k === "pageSize") out.set("limit", v);
    else if (k === "sort") {
      const s = translateSort(v);
      if (s) out.set("sort", s);
    } else out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

function pick<T extends Json>(data: unknown, keys: string[]): T | unknown {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const key of keys) {
      if (key in (data as Json)) return (data as Json)[key];
    }
  }
  return data;
}

function normGame(g: Json): Json {
  if (!g || typeof g !== "object") return g;
  return {
    ...g,
    id: g.id ?? g._id,
    fullDescription: g.fullDescription ?? g.description ?? "",
    controls: Array.isArray(g.controls) ? g.controls.join("\n") : (g.controls ?? ""),
    thumbnail: g.thumbnail || null,
    banner: g.banner || null,
  };
}

function normUser(u: Json): Json {
  if (!u || typeof u !== "object") return u;
  const stats = (u.stats as Json) ?? {};
  return {
    ...u,
    id: u.id ?? u._id,
    status: u.status ?? (u.isActive === false ? "SUSPENDED" : "ACTIVE"),
    gamesPlayed: u.gamesPlayed ?? stats.gamesPlayed ?? 0,
    totalScore: u.totalScore ?? stats.totalScore ?? 0,
    highestScore: u.highestScore ?? stats.highestScore ?? 0,
    achievements: Array.isArray(u.achievements) ? u.achievements : [],
    lastLoginAt: u.lastLoginAt ?? null,
  };
}

function flattenRef(v: unknown, field: string): string {
  if (v && typeof v === "object") return String((v as Json)[field] ?? "");
  return typeof v === "string" ? v : "";
}

function normScore(s: Json): Json {
  if (!s || typeof s !== "object") return s;
  return {
    ...s,
    id: s.id ?? s._id,
    userId: s.userId && typeof s.userId === "object" ? (s.userId as Json)._id : s.userId,
    username: s.username ?? flattenRef(s.userId, "username"),
    gameId: s.gameId && typeof s.gameId === "object" ? (s.gameId as Json)._id : s.gameId,
    gameTitle: s.gameTitle ?? flattenRef(s.gameId, "title"),
    suspicious: s.suspicious ?? s.flagged ?? false,
  };
}

function normBlog(b: Json): Json {
  if (!b || typeof b !== "object") return b;
  return {
    ...b,
    id: b.id ?? b._id,
    content: Array.isArray(b.content) ? b.content.join("\n\n") : (b.content ?? ""),
    coverImage: b.coverImage || null,
    views: b.views ?? 0,
    publishedAt: b.publishedAt ?? null,
  };
}

function paginate(json: Json, norm: (x: Json) => Json): Json {
  const meta = (json.meta as Json) ?? {};
  const rows = Array.isArray(json.data) ? (json.data as Json[]) : [];
  return {
    data: rows.map(norm),
    page: Number(meta.page ?? 1),
    pageSize: Number(meta.limit ?? rows.length),
    total: Number(meta.total ?? rows.length),
    totalPages: Number(meta.totalPages ?? 1),
  };
}

// ── route mapping ──────────────────────────────────────────────────────────

interface Mapped {
  method: string;
  path: string;
  body?: unknown;
  /** transform the backend JSON envelope into what the admin client expects */
  transform?: (json: Json) => unknown;
  /** run after a successful proxied response */
  after?: () => Promise<void>;
}

async function mapRequest(
  method: string,
  seg: string[],
  query: string,
  body: Json | undefined,
): Promise<Mapped | { error: string; status: number }> {
  const [resource, id, action] = seg;
  const idPath = id ? `/${id}` : "";

  switch (resource) {
    // ── games ──
    case "games": {
      if (method === "GET" && !id)
        return { method: "GET", path: `/admin/games${query}`, transform: (j) => paginate(j, normGame) };
      if (method === "GET" && id && !action)
        return { method: "GET", path: `/admin/games/${id}`, transform: (j) => normGame(pick(j.data, ["game"]) as Json) };
      if (method === "POST" && !id)
        return { method: "POST", path: `/admin/games`, body: gameBody(body), transform: (j) => normGame(pick(j.data, ["game"]) as Json) };
      if (method === "PATCH" && id && !action)
        return { method: "PUT", path: `/admin/games/${id}`, body: gameBody(body), transform: (j) => normGame(pick(j.data, ["game"]) as Json) };
      if (method === "PATCH" && action === "status")
        return { method: "PATCH", path: `/admin/games/${id}/status`, body, transform: (j) => normGame(pick(j.data, ["game"]) as Json) };
      if (method === "PATCH" && action === "featured")
        return { method: "PATCH", path: `/admin/games/${id}/featured`, body, transform: (j) => normGame(pick(j.data, ["game"]) as Json) };
      if (method === "DELETE" && id)
        return { method: "DELETE", path: `/admin/games/${id}`, transform: () => ({ ok: true }) };
      break;
    }

    // ── users ──
    case "users": {
      if (method === "GET" && !id)
        return { method: "GET", path: `/admin/users${query}`, transform: (j) => paginate(j, normUser) };
      if (method === "GET" && id && !action)
        return { method: "GET", path: `/admin/users/${id}`, transform: (j) => normUser(pick(j.data, ["user"]) as Json) };
      if (method === "GET" && action === "scores")
        return { method: "GET", path: `/admin/users/${id}/scores`, transform: (j) => (pick(j.data, ["scores"]) as Json[]).map(normScore) };
      if (method === "GET" && action === "notifications")
        return { method: "GET", path: `/admin/users/${id}/notifications`, transform: (j) => pick(j.data, ["notifications"]) };
      if (method === "PATCH" && id && !action)
        return { method: "PUT", path: `/admin/users/${id}`, body, transform: (j) => normUser(pick(j.data, ["user"]) as Json) };
      if (method === "PATCH" && action === "status") {
        const active = String(body?.status).toUpperCase() === "ACTIVE";
        return {
          method: "PATCH",
          path: `/admin/users/${id}/${active ? "activate" : "suspend"}`,
          transform: (j) => normUser(pick(j.data, ["user"]) as Json),
        };
      }
      if (method === "PATCH" && action === "role")
        return { method: "PATCH", path: `/admin/users/${id}/role`, body, transform: (j) => normUser(pick(j.data, ["user"]) as Json) };
      if (method === "DELETE" && id)
        return { method: "DELETE", path: `/admin/users/${id}`, transform: () => ({ ok: true }) };
      break;
    }

    // ── blog ──
    case "blog": {
      if (method === "GET" && !id)
        return { method: "GET", path: `/admin/blog${query}`, transform: (j) => paginate(j, normBlog) };
      if (method === "GET" && id && !action)
        return { method: "GET", path: `/admin/blog/${id}`, transform: (j) => normBlog(pick(j.data, ["post"]) as Json) };
      if (method === "POST" && !id)
        return { method: "POST", path: `/admin/blog`, body: blogBody(body), transform: (j) => normBlog(pick(j.data, ["post"]) as Json) };
      if (method === "PATCH" && id && !action)
        return { method: "PUT", path: `/admin/blog/${id}`, body: blogBody(body), transform: (j) => normBlog(pick(j.data, ["post"]) as Json) };
      if (method === "PATCH" && action === "status")
        return {
          method: "PATCH",
          path: `/admin/blog/${id}/publish`,
          body: { published: String(body?.status).toUpperCase() === "PUBLISHED" },
          transform: (j) => normBlog(pick(j.data, ["post"]) as Json),
        };
      if (method === "DELETE" && id)
        return { method: "DELETE", path: `/admin/blog/${id}`, transform: () => ({ ok: true }) };
      break;
    }

    // ── scores ──
    case "scores": {
      if (method === "GET" && !id)
        return { method: "GET", path: `/admin/scores${query}`, transform: (j) => paginate(j, normScore) };
      if (method === "GET" && id)
        return { method: "GET", path: `/admin/scores/${id}`, transform: (j) => normScore(pick(j.data, ["score"]) as Json) };
      if (method === "DELETE" && id)
        return { method: "DELETE", path: `/admin/scores/${id}`, transform: () => ({ ok: true }) };
      break;
    }

    // ── leaderboard ──
    case "leaderboard":
      if (method === "GET")
        return { method: "GET", path: `/admin/leaderboard${query}`, transform: (j) => j.data };
      break;

    // ── dashboard / analytics ──
    case "dashboard":
      if (method === "GET")
        return { method: "GET", path: `/admin/dashboard`, transform: (j) => j.data };
      break;
    case "analytics":
      if (method === "GET")
        return { method: "GET", path: `/admin/analytics${query}`, transform: (j) => j.data };
      break;

    // ── notifications ──
    case "notifications": {
      if (method === "GET" && id === "push-status")
        return { method: "GET", path: `/admin/notifications/push-status`, transform: (j) => j.data };
      if (method === "POST" && id === "audience-count")
        return { method: "POST", path: `/admin/notifications/audience-count`, body, transform: (j) => j.data };
      if (method === "GET" && !id)
        return { method: "GET", path: `/admin/notifications${query}`, transform: (j) => paginate(j, (x) => ({ ...x, id: x.id ?? x._id })) };
      if (method === "POST" && !id)
        return { method: "POST", path: `/admin/notifications`, body, transform: (j) => j.data };
      break;
    }

    // ── search ──
    case "search":
      if (method === "GET")
        return { method: "GET", path: `/admin/search${query}`, transform: (j) => j.data };
      break;

    // ── settings (map onto the shared auth/user endpoints) ──
    case "settings": {
      if (method === "PATCH" && id === "profile")
        return {
          method: "PUT",
          path: `/users/me`,
          body: body?.username ? { username: body.username } : {},
          transform: (j) => ({ user: pick(j.data, ["user"]) }),
        };
      if (method === "POST" && id === "password")
        return {
          method: "POST",
          path: `/auth/change-password`,
          body,
          transform: () => ({ ok: true }),
          // password change bumps the backend tokenVersion → our stored access
          // token is now stale. Drop the admin session so the user re-logs in.
          after: async () => {
            (await cookies()).delete(SESSION_COOKIE);
          },
        };
      break;
    }

    // ── admins list ──
    case "admins":
      if (method === "GET")
        return {
          method: "GET",
          path: `/admin/users?role=ADMIN,SUPER_ADMIN&limit=100`,
          transform: (j) => (Array.isArray(j.data) ? (j.data as Json[]).map(normUser) : []),
        };
      break;
  }

  return { error: `No proxy mapping for ${method} /${seg.join("/")}`, status: 404 };
}

function gameBody(body: Json | undefined): Json | undefined {
  if (!body) return body;
  const out: Json = { ...body };
  if (typeof out.controls === "string") {
    out.controls = (out.controls as string)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (out.fullDescription !== undefined && out.description === undefined) {
    out.description = out.fullDescription;
  }
  delete out.fullDescription;
  return out;
}

function blogBody(body: Json | undefined): Json | undefined {
  if (!body) return body;
  const out: Json = { ...body };
  if (typeof out.content === "string" && out.contentBlocks === undefined) {
    out.contentBlocks = (out.content as string)
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return out;
}

// ── the handler ────────────────────────────────────────────────────────────

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }
  const token = session.accessToken;
  if (!token) {
    return NextResponse.json(
      { message: "Session has no backend token — please sign in again." },
      { status: 401 },
    );
  }

  const { path } = await ctx.params;
  const method = req.method.toUpperCase();
  const query = buildQuery(req.nextUrl.searchParams);

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  // Multipart uploads are streamed straight through (no body parsing/transform).
  if (isMultipart && path[0] === "uploads") {
    const folder = req.nextUrl.searchParams.get("folder") ?? "games";
    const form = await req.formData();
    const backendRes = await fetch(`${BACKEND}/admin/uploads?folder=${folder}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    const j = (await backendRes.json().catch(() => null)) as Json | null;
    if (!backendRes.ok) {
      return NextResponse.json(j ?? { message: "Upload failed" }, { status: backendRes.status });
    }
    const d = (j?.data as Json) ?? {};
    const url = String(d.url ?? "");
    return NextResponse.json({
      id: String(d.key ?? url),
      url,
      filename: url.split("/").pop() ?? "upload",
      size: 0,
    });
  }

  let body: Json | undefined;
  if (method !== "GET" && method !== "DELETE") {
    body = (await req.json().catch(() => undefined)) as Json | undefined;
  }

  const mapped = await mapRequest(method, path, query, body);
  if ("error" in mapped) {
    return NextResponse.json({ message: mapped.error }, { status: mapped.status });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}${mapped.path}`, {
      method: mapped.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(mapped.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: mapped.body !== undefined ? JSON.stringify(mapped.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "Could not reach the backend API." },
      { status: 502 },
    );
  }

  const json = (await backendRes.json().catch(() => null)) as Json | null;

  if (!backendRes.ok) {
    return NextResponse.json(
      json ?? { message: `Backend error (${backendRes.status})` },
      { status: backendRes.status },
    );
  }

  if (mapped.after) await mapped.after();

  const out = mapped.transform ? mapped.transform(json ?? {}) : (json?.data ?? json);
  return NextResponse.json(out, { status: backendRes.status });
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as PUT,
  handle as DELETE,
};
