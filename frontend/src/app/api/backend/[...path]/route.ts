import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Same-origin proxy for authenticated user requests to the NEON ARCADE backend.
 *
 * Client components call `/api/backend/<path>`; this handler reads the logged-in
 * user's access token from the session and forwards the request to the backend
 * with an `Authorization: Bearer` header. The backend's `{ success, data }`
 * envelope is passed straight through so `apiFetch` can unwrap it the same way
 * it does for direct public calls.
 *
 * Only a small allow-list of path prefixes is proxied.
 */

const BACKEND = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000/api"
).replace(/\/$/, "");

const ALLOW_PREFIXES = [
  "auth/me",
  "auth/change-password",
  "auth/logout",
  "users/me",
  "notifications",
  "scores",
  "games", // play tracking: games/:id/play, games/play/complete
];

function allowed(path: string) {
  return ALLOW_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"));
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json(
      { success: false, message: "You need to be signed in.", errors: [] },
      { status: 401 },
    );
  }

  const { path } = await ctx.params;
  const sub = path.join("/");
  if (!allowed(sub)) {
    return NextResponse.json(
      { success: false, message: "Not found", errors: [] },
      { status: 404 },
    );
  }

  const method = req.method.toUpperCase();
  const search = req.nextUrl.search;
  const body =
    method === "GET" || method === "DELETE"
      ? undefined
      : await req.text();

  let res: Response;
  try {
    res = await fetch(`${BACKEND}/${sub}${search}`, {
      method,
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not reach the server.", errors: [] },
      { status: 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
