import { apiFetchPage, type Page } from "@/lib/api/client";
import type { LeaderboardEntry } from "@/types/api";

export interface LeaderboardParams {
  page?: number;
  limit?: number;
  range?: "day" | "week" | "month" | "all";
}

export const leaderboardService = {
  global: (params: LeaderboardParams = {}): Promise<Page<LeaderboardEntry>> =>
    apiFetchPage<LeaderboardEntry>("/leaderboard", { query: { ...params } }),

  byGame: (
    gameId: string,
    params: LeaderboardParams = {},
  ): Promise<Page<LeaderboardEntry>> =>
    apiFetchPage<LeaderboardEntry>(`/leaderboard/${gameId}`, { query: { ...params } }),
};
