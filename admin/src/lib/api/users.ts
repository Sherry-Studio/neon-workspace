import { apiRequest } from "./client";
import type { Paginated, Role, User, UserStatus } from "@/lib/types";

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: UserStatus | "";
  role?: Role | "";
  sort?: string;
}

export interface UserUpdateInput {
  username?: string;
  email?: string;
  role?: Role;
  status?: UserStatus;
}

export const usersApi = {
  list: (params: UserListParams = {}) =>
    apiRequest<Paginated<User>>("/users", { query: { ...params } }),

  get: (id: string) => apiRequest<User>(`/users/${id}`),

  update: (id: string, input: UserUpdateInput) =>
    apiRequest<User>(`/users/${id}`, { method: "PATCH", body: input }),

  setStatus: (id: string, status: UserStatus) =>
    apiRequest<User>(`/users/${id}/status`, { method: "PATCH", body: { status } }),

  setRole: (id: string, role: Role) =>
    apiRequest<User>(`/users/${id}/role`, { method: "PATCH", body: { role } }),

  remove: (id: string) =>
    apiRequest<{ ok: true }>(`/users/${id}`, { method: "DELETE" }),

  scores: (id: string) => apiRequest<import("@/lib/types").Score[]>(`/users/${id}/scores`),

  notifications: (id: string) =>
    apiRequest<import("@/lib/types").NotificationRecord[]>(`/users/${id}/notifications`),
};
