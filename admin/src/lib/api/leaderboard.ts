import { apiRequest } from "./client";
import type { LeaderboardEntry } from "@/lib/types";

export interface LeaderboardParams {
  gameId?: string;
  userId?: string;
  from?: string;
  to?: string;
  sort?: "highest" | "lowest" | "newest";
  limit?: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  topPlayers: { label: string; value: number }[];
  topGames: { label: string; value: number }[];
}

export const leaderboardApi = {
  get: (params: LeaderboardParams = {}) =>
    apiRequest<LeaderboardResponse>("/leaderboard", { query: { ...params } }),
};
