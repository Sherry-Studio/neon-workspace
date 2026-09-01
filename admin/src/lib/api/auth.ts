import type { AuthUser } from "@/lib/types";

/**
 * Auth goes through this admin app's own session routes (`/api/session/*`),
 * which own the httpOnly cookie. They proxy `POST /auth/login` on the backend,
 * verify the account has an ADMIN / SUPER_ADMIN role, and stash the returned
 * access token in the signed session cookie for the `/api/admin` proxy to use.
 */
export const authApi = {
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || "Login failed");
    }
    return data.user as AuthUser;
  },

  async me(): Promise<AuthUser | null> {
    const res = await fetch("/api/session/me", { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return (data?.user as AuthUser) ?? null;
  },

  async logout(): Promise<void> {
    await fetch("/api/session/logout", { method: "POST", credentials: "include" });
  },
};
