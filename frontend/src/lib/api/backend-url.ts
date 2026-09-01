/**
 * Resolves the backend API base URL for **server-side** use (route handlers,
 * server components, next-auth callbacks).
 *
 * - Local dev: `BACKEND_INTERNAL_URL` / `NEXT_PUBLIC_API_BASE_URL`
 *   (e.g. http://localhost:4000/api).
 * - On Vercel (services): the backend is a service on the same deployment,
 *   reachable at `<deployment-origin>/api`. `VERCEL_PROJECT_PRODUCTION_URL` is the
 *   stable production host; `VERCEL_URL` covers preview deployments.
 */
export function serverBackendBase(): string {
  const raw =
    process.env.BACKEND_INTERNAL_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}/api`) ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000/api";
  return raw.replace(/\/$/, "");
}
