import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/server";

const BACKEND = (
  process.env.BACKEND_INTERNAL_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

export async function POST() {
  // Best-effort: revoke the backend session too.
  const session = await getSession();
  if (session?.accessToken) {
    await fetch(`${BACKEND}/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${session.accessToken}` },
    }).catch(() => undefined);
  }

  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
