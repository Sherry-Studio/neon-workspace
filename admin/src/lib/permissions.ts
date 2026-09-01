import type { Role } from "./types";

/**
 * Permission catalogue. The backend is the source of truth for authorization —
 * this only decides which nav items / buttons to render. Every mutating call is
 * still expected to be re-checked server-side.
 */
export const PERMISSIONS = {
  USERS_VIEW: "users:view",
  USERS_MANAGE: "users:manage",
  USERS_DELETE: "users:delete",
  USERS_ROLE: "users:role",
  GAMES_VIEW: "games:view",
  GAMES_MANAGE: "games:manage",
  GAMES_DELETE: "games:delete",
  SCORES_VIEW: "scores:view",
  SCORES_DELETE: "scores:delete",
  BLOG_VIEW: "blog:view",
  BLOG_MANAGE: "blog:manage",
  BLOG_DELETE: "blog:delete",
  NOTIFICATIONS_VIEW: "notifications:view",
  NOTIFICATIONS_SEND: "notifications:send",
  ANALYTICS_VIEW: "analytics:view",
  SETTINGS_VIEW: "settings:view",
  ADMINS_MANAGE: "admins:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ADMIN_PERMISSIONS: Permission[] = [
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.USERS_DELETE,
  PERMISSIONS.GAMES_VIEW,
  PERMISSIONS.GAMES_MANAGE,
  PERMISSIONS.GAMES_DELETE,
  PERMISSIONS.SCORES_VIEW,
  PERMISSIONS.SCORES_DELETE,
  PERMISSIONS.BLOG_VIEW,
  PERMISSIONS.BLOG_MANAGE,
  PERMISSIONS.BLOG_DELETE,
  PERMISSIONS.NOTIFICATIONS_VIEW,
  PERMISSIONS.NOTIFICATIONS_SEND,
  PERMISSIONS.ANALYTICS_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  PERMISSIONS.USERS_ROLE,
  PERMISSIONS.ADMINS_MANAGE,
];

export function permissionsForRole(role: Role): Permission[] {
  switch (role) {
    case "SUPER_ADMIN":
      return SUPER_ADMIN_PERMISSIONS;
    case "ADMIN":
      return ADMIN_PERMISSIONS;
    default:
      return [];
  }
}

export function canAccessAdmin(role: Role): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function hasPermission(
  permissions: string[] | undefined,
  needed: Permission,
): boolean {
  return !!permissions?.includes(needed);
}
