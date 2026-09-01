import { apiRequest } from "./client";
import type {
  NotificationAudience,
  NotificationRecord,
  NotificationType,
  Paginated,
} from "@/lib/types";

export interface NotificationListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: NotificationType | "";
}

export interface NotificationCreateInput {
  title: string;
  message: string;
  type: NotificationType;
  audience: NotificationAudience;
  recipientIds?: string[];
  link?: string | null;
  gameId?: string | null;
  blogId?: string | null;
}

export interface PushStatus {
  available: boolean;
  provider: string;
}

export const notificationsApi = {
  list: (params: NotificationListParams = {}) =>
    apiRequest<Paginated<NotificationRecord>>("/notifications", {
      query: { ...params },
    }),

  pushStatus: () => apiRequest<PushStatus>("/notifications/push-status"),

  audienceCount: (audience: NotificationAudience, recipientIds?: string[]) =>
    apiRequest<{ count: number }>("/notifications/audience-count", {
      method: "POST",
      body: { audience, recipientIds },
    }),

  create: (input: NotificationCreateInput) =>
    apiRequest<NotificationRecord & { pushDelivered: boolean }>("/notifications", {
      method: "POST",
      body: input,
    }),
};
