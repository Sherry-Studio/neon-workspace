import { apiRequest } from "./client";
import type { Paginated, Score } from "@/lib/types";

export interface ScoreListParams {
  page?: number;
  pageSize?: number;
  gameId?: string;
  userId?: string;
  search?: string;
  from?: string;
  to?: string;
  sort?: string;
}

export const scoresApi = {
  list: (params: ScoreListParams = {}) =>
    apiRequest<Paginated<Score>>("/scores", { query: { ...params } }),

  get: (id: string) => apiRequest<Score>(`/scores/${id}`),

  remove: (id: string) =>
    apiRequest<{ ok: true }>(`/scores/${id}`, { method: "DELETE" }),
};
