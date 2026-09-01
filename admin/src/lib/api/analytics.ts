import { apiRequest } from "./client";
import type { AnalyticsData, AnalyticsRange, DashboardStats } from "@/lib/types";

export const analyticsApi = {
  dashboard: () => apiRequest<DashboardStats>("/dashboard"),

  overview: (range: AnalyticsRange) =>
    apiRequest<AnalyticsData>("/analytics", { query: { range } }),
};
