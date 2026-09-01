import type { Profile } from "@/types/api";

/**
 * The authenticated user's profile goes through the local `/api/profile` route
 * handler, which reads the session and calls the backend `/users/me`.
 */
export const profileService = {
  async get(): Promise<Profile> {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load your profile");
    return res.json();
  },

  async update(patch: {
    username?: string;
    avatar?: string;
    bio?: string;
  }): Promise<{ username: string; avatar: string; bio: string }> {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Could not update your profile");
    return json;
  },
};
