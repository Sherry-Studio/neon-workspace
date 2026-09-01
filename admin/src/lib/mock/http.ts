import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/permissions";
import type { AuthUser, Paginated } from "@/lib/types";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorJson(status: number, message: string, details?: unknown) {
  return NextResponse.json({ message, details }, { status });
}

/** Verify the admin session for every mock endpoint. */
export async function requireApiSession(): Promise<
  { ok: true; user: AuthUser } | { ok: false; res: NextResponse }
> {
  const jar = await cookies();
  const session = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return { ok: false, res: errorJson(401, "Not authenticated.") };
  }
  if (!canAccessAdmin(session.user.role)) {
    return { ok: false, res: errorJson(403, "Admin access required.") };
  }
  return { ok: true, user: session.user };
}

export function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function num(v: string | null, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

/** Simulated latency so loading/skeleton states are visible in dev. */
export async function tick(ms = 220) {
  await new Promise((r) => setTimeout(r, ms));
}
