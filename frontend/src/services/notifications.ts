import { apiFetch, PROXY_BASE } from "@/lib/api/client";
import type { NotificationItem } from "@/types/api";

export interface NotificationsResult {
  items: NotificationItem[];
  unread: number;
  total: number;
  page: number;
  totalPages: number;
}

export const notificationsService = {
  async list(params: { page?: number; limit?: number; unread?: boolean } = {}): Promise<NotificationsResult> {
    // The notifications endpoint returns { data: items, meta: { ..., unread } }.
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const res = await fetch(`${PROXY_BASE}/notifications${qs.toString() ? `?${qs}` : ""}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || "Could not load notifications");
    }
    return {
      items: json?.data ?? [],
      unread: json?.meta?.unread ?? 0,
      total: json?.meta?.total ?? 0,
      page: json?.meta?.page ?? 1,
      totalPages: json?.meta?.totalPages ?? 1,
    };
  },

  markRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "PATCH", base: PROXY_BASE }),

  markAllRead: () =>
    apiFetch(`/notifications/read-all`, { method: "PATCH", base: PROXY_BASE }),

  remove: (id: string) =>
    apiFetch(`/notifications/${id}`, { method: "DELETE", base: PROXY_BASE }),
};
