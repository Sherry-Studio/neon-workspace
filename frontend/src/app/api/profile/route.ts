import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isValidAvatarId, DEFAULT_AVATAR_ID } from "@/lib/avatars";
import { serverBackendBase } from "@/lib/api/backend-url";

/**
 * The authenticated user's own profile. Backed entirely by the backend
 * (`GET/PUT /users/me`). Kept as a route handler so the client `profile` page
 * doesn't need direct backend access.
 */

async function backend(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${serverBackendBase()}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { res, json } = await backend("/users/me", session.accessToken);
  if (!res.ok) {
    return NextResponse.json({ error: "Unable to load profile" }, { status: res.status });
  }
  const u = json?.data?.user ?? {};
  return NextResponse.json({
    username: u.username,
    email: u.email ?? null,
    avatar: u.avatar ?? DEFAULT_AVATAR_ID,
    bio: u.bio ?? "",
    role: u.role,
    stats: u.stats ?? { gamesPlayed: 0, totalScore: 0, highestScore: 0 },
    isVerified: u.isVerified ?? false,
    createdAt: u.createdAt,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { avatar?: unknown; username?: unknown; bio?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const patch: Record<string, string> = {};
  if (typeof body.avatar === "string") {
    if (!isValidAvatarId(body.avatar)) {
      return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    }
    patch.avatar = body.avatar;
  }
  if (typeof body.username === "string") patch.username = body.username.trim();
  if (typeof body.bio === "string") patch.bio = body.bio;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { res, json } = await backend("/users/me", session.accessToken, {
    method: "PUT",
    body: JSON.stringify(patch),
  });

  if (!res.ok || json?.success === false) {
    const first = json?.errors?.[0]?.message as string | undefined;
    return NextResponse.json(
      { error: first || json?.message || "Could not update profile" },
      { status: res.status || 400 },
    );
  }

  const u = json?.data?.user ?? {};
  return NextResponse.json({
    username: u.username,
    avatar: u.avatar ?? DEFAULT_AVATAR_ID,
    bio: u.bio ?? "",
  });
}
