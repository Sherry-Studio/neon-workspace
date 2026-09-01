import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readUsers, writeUsers } from "@/lib/auth";
import { isValidAvatarId, DEFAULT_AVATAR_ID } from "@/lib/avatars";

export async function POST(request: Request) {
  try {
    const { username, password, avatar } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const users = readUsers();
    const exists = users.find((u) => u.username === username);
    if (exists) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    const avatarId =
      typeof avatar === "string" && isValidAvatarId(avatar)
        ? avatar
        : DEFAULT_AVATAR_ID;

    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
      id: crypto.randomUUID(),
      username,
      password: hashed,
      avatar: avatarId,
    };

    users.push(newUser);
    writeUsers(users);

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
