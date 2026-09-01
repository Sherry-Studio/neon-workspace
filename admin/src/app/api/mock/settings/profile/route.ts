import { cookies } from "next/headers";
import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/permissions";

export async function PATCH(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const record = db().users.find((u) => u.id === auth.user.id);
  if (!record) return errorJson(404, "Account not found.");

  const body = (await req.json().catch(() => ({}))) as {
    username?: string;
    email?: string;
  };
  if (typeof body.username === "string" && body.username.trim().length >= 3)
    record.username = body.username.trim();
  if (typeof body.email === "string" && body.email.includes("@")) {
    const old = record.email.toLowerCase();
    const cred = db().credentials[old];
    record.email = body.email.trim();
    if (cred) {
      delete db().credentials[old];
      db().credentials[record.email.toLowerCase()] = cred;
    }
  }

  const updated = {
    id: record.id,
    username: record.username,
    email: record.email,
    role: record.role,
    avatar: record.avatar ?? null,
    permissions: permissionsForRole(record.role),
  };

  const token = await createSessionToken({ user: updated }, SESSION_MAX_AGE);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return json({ user: updated });
}
