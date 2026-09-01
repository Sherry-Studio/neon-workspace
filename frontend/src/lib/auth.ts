import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * The NEON ARCADE backend owns authentication (users live in MongoDB, it issues
 * access + refresh JWTs). next-auth is kept purely as a session wrapper:
 *
 *   - `authorize()` calls the backend `/auth/login` and returns the backend
 *     user + tokens.
 *   - the JWT callback stashes those tokens in the (encrypted, httpOnly) session
 *     cookie and transparently refreshes the access token when it expires.
 *   - the `/api/backend/*` proxy reads `session.accessToken` to call the backend
 *     on the user's behalf.
 *
 * There is no local user store any more.
 */

const BACKEND = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000/api"
).replace(/\/$/, "");

/** access tokens last 15m on the backend; refresh a little early */
const ACCESS_TTL_MS = 14 * 60 * 1000;

interface BackendUser {
  id: string;
  username: string;
  email: string | null;
  avatar: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
}

async function backendLogin(identifier: string, password: string) {
  const res = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, email: identifier, password }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.accessToken) return null;
  return {
    user: json.data.user as BackendUser,
    accessToken: json.data.accessToken as string,
    refreshToken: json.data.refreshToken as string,
  };
}

async function backendRefresh(refreshToken: string) {
  const res = await fetch(`${BACKEND}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.accessToken) return null;
  return {
    accessToken: json.data.accessToken as string,
    refreshToken: json.data.refreshToken as string,
    user: json.data.user as BackendUser,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const credentials = (rawCredentials ?? {}) as Record<string, unknown>;
        const identifier = String(
          credentials.identifier ?? credentials.username ?? credentials.email ?? "",
        ).trim();
        const password = String(credentials.password ?? "");
        if (!identifier || !password) return null;

        const result = await backendLogin(identifier, password);
        if (!result) return null;

        return {
          id: result.user.id,
          name: result.user.username,
          email: result.user.email ?? undefined,
          avatar: result.user.avatar,
          role: result.user.role,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in
      if (user) {
        token.id = user.id as string;
        token.name = user.name;
        token.email = user.email ?? null;
        token.avatar = (user as { avatar?: string }).avatar;
        token.role = (user as { role?: string }).role;
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.refreshToken = (user as { refreshToken?: string }).refreshToken;
        token.accessTokenExpires = Date.now() + ACCESS_TTL_MS;
        return token;
      }

      // Client-driven profile updates via useSession().update()
      if (trigger === "update" && session) {
        const upd = session as { name?: string; avatar?: string };
        if (typeof upd.name === "string") token.name = upd.name;
        if (typeof upd.avatar === "string") token.avatar = upd.avatar;
        return token;
      }

      // Still valid — nothing to do
      if (
        typeof token.accessTokenExpires === "number" &&
        Date.now() < token.accessTokenExpires
      ) {
        return token;
      }

      // Expired — try to refresh
      if (token.refreshToken) {
        const refreshed = await backendRefresh(token.refreshToken as string);
        if (refreshed) {
          token.accessToken = refreshed.accessToken;
          token.refreshToken = refreshed.refreshToken;
          token.accessTokenExpires = Date.now() + ACCESS_TTL_MS;
          token.avatar = refreshed.user.avatar ?? token.avatar;
          token.role = refreshed.user.role ?? token.role;
          return token;
        }
      }
      return { ...token, error: "RefreshFailed" as const };
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.avatar = token.avatar as string | undefined;
        session.user.role = token.role as "USER" | "ADMIN" | "SUPER_ADMIN" | undefined;
      }
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});
