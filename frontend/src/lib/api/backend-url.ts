/**
 * Resolves the backend API base URL for **server-side** use (route handlers,
 * server components, next-auth callbacks).
 *
 * Priority:
 *  1. `BACKEND_URL` — injected by the Vercel service binding (see vercel.json).
 *     This reaches the backend service directly, bypassing the public rewrites,
 *     so calls to `/api/auth/*` hit the backend and not next-auth.
 *  2. `BACKEND_INTERNAL_URL` — explicit override / local dev.
 *  3. Vercel deployment URL + `/api` — fallback if the binding is unavailable
 *     (e.g. during build).
 *  4. `NEXT_PUBLIC_API_BASE_URL` / localhost — local dev.
 */
export function serverBackendBase(): string {
  const bindingUrl = process.env.BACKEND_URL
    ? `${process.env.BACKEND_URL.replace(/\/$/, "")}/api`
    : undefined;

  const raw =
    bindingUrl ||
    process.env.BACKEND_INTERNAL_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}/api`) ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000/api";

  return raw.replace(/\/$/, "");
}
