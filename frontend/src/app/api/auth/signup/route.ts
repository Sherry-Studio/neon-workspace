import { NextResponse } from "next/server";
import { isValidAvatarId, DEFAULT_AVATAR_ID } from "@/lib/avatars";
import { serverBackendBase } from "@/lib/api/backend-url";

/**
 * Proxies registration to the NEON ARCADE backend (`POST /auth/register`).
 * The backend is the single source of truth for accounts — there is no local
 * user store. On success the client then calls next-auth `signIn()` with the
 * same credentials to establish the session.
 */

export async function POST(request: Request) {
  let payload: { username?: string; email?: string; password?: string; avatar?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { username, email, password } = payload;
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 },
    );
  }

  const avatar =
    typeof payload.avatar === "string" && isValidAvatarId(payload.avatar)
      ? payload.avatar
      : DEFAULT_AVATAR_ID;

  let res: Response;
  try {
    res = await fetch(`${serverBackendBase()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        avatar,
        ...(email ? { email } : {}),
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the server. Please try again." },
      { status: 502 },
    );
  }

  const json = await res.json().catch(() => null);

  if (!res.ok || json?.success === false) {
    // Surface a friendly, field-aware message without leaking internals.
    const first = json?.errors?.[0]?.message as string | undefined;
    return NextResponse.json(
      { error: first || json?.message || "Could not create your account" },
      { status: res.status === 409 ? 409 : res.status || 400 },
    );
  }

  return NextResponse.json({ message: "User created successfully" }, { status: 201 });
}
