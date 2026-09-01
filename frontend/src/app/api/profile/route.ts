import { NextResponse } from "next/server";
import { auth, readUsers, writeUsers } from "@/lib/auth";
import { isValidAvatarId, DEFAULT_AVATAR_ID } from "@/lib/avatars";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = readUsers();
  const user = users.find((u) => u.id === session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    username: user.username,
    avatar: user.avatar ?? DEFAULT_AVATAR_ID,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { avatar?: unknown; username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const users = readUsers();
  const idx = users.findIndex((u) => u.id === session.user.id);
  if (idx === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Update avatar
  if (typeof body.avatar === "string") {
    if (!isValidAvatarId(body.avatar)) {
      return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    }
    users[idx].avatar = body.avatar;
  }

  // Update username (optional)
  if (typeof body.username === "string") {
    const nextName = body.username.trim();
    if (nextName !== users[idx].username) {
      if (nextName.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 }
        );
      }
      const taken = users.some(
        (u, i) => i !== idx && u.username.toLowerCase() === nextName.toLowerCase()
      );
      if (taken) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      users[idx].username = nextName;
    }
  }

  writeUsers(users);

  return NextResponse.json({
    username: users[idx].username,
    avatar: users[idx].avatar ?? DEFAULT_AVATAR_ID,
  });
}
