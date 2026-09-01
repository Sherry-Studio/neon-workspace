import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

interface StoredUser {
  id: string;
  username: string;
  password: string;
  avatar?: string;
}

function readUsers(): StoredUser[] {
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username as string;
        const password = credentials.password as string;
        const users = readUsers();
        const user = users.find((u) => u.username === username);

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.username, avatar: user.avatar };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.name = user.name;
        token.avatar = (user as { avatar?: string }).avatar;
      }
      // Live profile updates (avatar / username) via useSession().update()
      if (trigger === "update" && session) {
        const upd = session as { name?: string; avatar?: string };
        if (typeof upd.name === "string") token.name = upd.name;
        if (typeof upd.avatar === "string") token.avatar = upd.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.avatar = token.avatar as string | undefined;
      }
      return session;
    },
  },
});

export { readUsers, writeUsers };
export type { StoredUser };
