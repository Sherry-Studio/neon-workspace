import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serverBackendBase } from "@/lib/api/backend-url";

/**
 * Same-origin proxy for authenticated user requests to the NEON ARCADE backend.
 *
 * Client components call `/api/gateway/<path>`; this handler reads the logged-in
 * user's access token from the session and forwards the request to the backend
 * with an `Authorization: Bearer` header. The backend's `{ success, data }`
 * envelope is passed straight through so `apiFetch` can unwrap it the same way
 * it does for direct public calls.
 *
 * Only a small allow-list of path prefixes is proxied.
 */

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

/** Reject cross-site mutating requests (defence-in-depth against CSRF). */
function sameOrigin(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from RSC/route handlers omit Origin
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!sameOrigin(req)) {
    return NextResponse.json(
      { success: false, message: "Cross-origin request refused.", errors: [] },
      { status: 403 },
    );
  }
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
    res = await fetch(`${serverBackendBase()}/${sub}${search}`, {
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
