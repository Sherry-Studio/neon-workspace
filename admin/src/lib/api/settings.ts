import { apiRequest } from "./client";
import type { AuthUser, User } from "@/lib/types";

export const settingsApi = {
  updateProfile: (input: { username?: string; email?: string }) =>
    apiRequest<{ user: AuthUser }>("/settings/profile", {
      method: "PATCH",
      body: input,
    }),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    apiRequest<{ ok: true }>("/settings/password", {
      method: "POST",
      body: input,
    }),

  listAdmins: () => apiRequest<User[]>("/admins"),
};
