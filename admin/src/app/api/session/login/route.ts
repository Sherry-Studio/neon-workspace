import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/auth/session";
import { canAccessAdmin, permissionsForRole } from "@/lib/permissions";
import type { AuthUser } from "@/lib/types";

const BACKEND = (
  process.env.BACKEND_INTERNAL_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

interface Resolved {
  user: AuthUser;
  accessToken: string;
}

async function resolveUser(email: string, password: string): Promise<Resolved | null> {
  const res = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // The backend accepts `identifier` (username OR email) or `email`.
    body: JSON.stringify({ identifier: email, email, password }),
  });
  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  const u = json?.data?.user ?? json?.user ?? json?.data;
  const accessToken = json?.data?.accessToken ?? json?.accessToken;
  if (!u?.role || !accessToken) return null;

  return {
    accessToken,
    user: {
      id: u.id,
      username: u.username,
      email: u.email ?? "",
      role: u.role,
      avatar: u.avatar ?? null,
      permissions: u.permissions?.length ? u.permissions : permissionsForRole(u.role),
    },
  };
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 },
    );
  }

  let resolved: Resolved | null;
  try {
    resolved = await resolveUser(email, password);
  } catch {
    return NextResponse.json(
      { message: "Could not reach the authentication service." },
      { status: 502 },
    );
  }

  if (!resolved) {
    return NextResponse.json(
      { message: "Incorrect email or password." },
      { status: 401 },
    );
  }

  if (!canAccessAdmin(resolved.user.role)) {
    return NextResponse.json(
      {
        message:
          "This account does not have admin access. Only ADMIN and SUPER_ADMIN roles can sign in here.",
      },
      { status: 403 },
    );
  }

  const token = await createSessionToken(
    { user: resolved.user, accessToken: resolved.accessToken },
    SESSION_MAX_AGE,
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ user: resolved.user });
}
