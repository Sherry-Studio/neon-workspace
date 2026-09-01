import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/auth/session";
import { canAccessAdmin, permissionsForRole } from "@/lib/permissions";
import { API_BASE_URL } from "@/lib/api/client";
import { db } from "@/lib/mock/store";
import type { AuthUser } from "@/lib/types";

const USING_MOCK = API_BASE_URL === "/api/mock";

async function resolveUser(
  email: string,
  password: string,
): Promise<{ user: AuthUser; accessToken?: string } | null> {
  if (USING_MOCK) {
    const cred = db().credentials[email.toLowerCase()];
    if (!cred || cred.password !== password) return null;
    const record = db().users.find((u) => u.id === cred.userId);
    if (!record) return null;
    const user: AuthUser = {
      id: record.id,
      username: record.username,
      email: record.email,
      role: record.role,
      avatar: record.avatar ?? null,
      permissions: permissionsForRole(record.role),
    };
    return { user };
  }

  // Real backend: proxy the credentials, keep the returned access token.
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const u = data?.user ?? data;
  if (!u?.role) return null;
  const user: AuthUser = {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    avatar: u.avatar ?? null,
    permissions: u.permissions?.length ? u.permissions : permissionsForRole(u.role),
  };
  return { user, accessToken: data?.accessToken ?? data?.token };
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

  let resolved: Awaited<ReturnType<typeof resolveUser>>;
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
