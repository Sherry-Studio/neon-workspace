/**
 * Shared HTTP client for the NEON ARCADE frontend.
 *
 * - `apiFetch`  — low-level: talks to the backend, unwraps the standard
 *   `{ success, message, data, meta }` envelope, throws `ApiError` on failure.
 * - Public reads (games, blog, leaderboard) can call the backend directly from
 *   the browser (`NEXT_PUBLIC_API_BASE_URL`, CORS-allowed).
 * - Authenticated calls go through the same-origin proxy at `/api/backend/*`,
 *   which injects the logged-in user's bearer token (see that route handler).
 */

export const PUBLIC_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:4000/api";

/** Same-origin proxy for authenticated user requests. */
export const PROXY_BASE = "/api/backend";

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
  /** absolute base to hit; defaults to the public backend base */
  base?: string;
  signal?: AbortSignal;
  /** forwarded to fetch on the server for caching control */
  next?: { revalidate?: number; tags?: string[] };
  cache?: RequestCache;
  headers?: Record<string, string>;
}

function buildUrl(base: string, path: string, query?: Query) {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
  errors?: { field?: string; message: string }[];
}

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const base = opts.base ?? PUBLIC_API_BASE;
  let res: Response;
  try {
    res = await fetch(buildUrl(base, path, opts.query), {
      method: opts.method ?? "GET",
      headers: {
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "include",
      signal: opts.signal,
      cache: opts.cache ?? (opts.next ? undefined : "no-store"),
      next: opts.next,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, "Network error — could not reach the server.");
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (!res.ok || (json && json.success === false)) {
    const fields: Record<string, string> = {};
    for (const e of json?.errors ?? []) if (e.field) fields[e.field] = e.message;
    throw new ApiError(
      res.status,
      json?.message || `Request failed (${res.status})`,
      Object.keys(fields).length ? fields : undefined,
    );
  }

  return json?.data as T;
}

/** Same as apiFetch but also returns pagination meta. */
export async function apiFetchPage<T>(
  path: string,
  opts: Options = {},
): Promise<Page<T>> {
  const base = opts.base ?? PUBLIC_API_BASE;
  const res = await fetch(buildUrl(base, path, opts.query), {
    method: opts.method ?? "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
    signal: opts.signal,
    cache: opts.cache ?? "no-store",
    next: opts.next,
  }).catch(() => {
    throw new ApiError(0, "Network error — could not reach the server.");
  });

  const json = (await res.json().catch(() => null)) as Envelope<T[]> | null;
  if (!res.ok || (json && json.success === false)) {
    throw new ApiError(res.status, json?.message || `Request failed (${res.status})`);
  }
  return {
    items: json?.data ?? [],
    page: json?.meta?.page ?? 1,
    limit: json?.meta?.limit ?? (json?.data?.length ?? 0),
    total: json?.meta?.total ?? (json?.data?.length ?? 0),
    totalPages: json?.meta?.totalPages ?? 1,
  };
}
