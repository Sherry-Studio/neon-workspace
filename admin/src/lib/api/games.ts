import { apiRequest } from "./client";
import type { Game, GameStatus, Paginated } from "@/lib/types";

export interface GameListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: GameStatus | "";
  category?: string;
  featured?: boolean;
  sort?: string;
}

export interface GameInput {
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  thumbnail?: string | null;
  banner?: string | null;
  gameUrl: string;
  version: string;
  instructions: string;
  controls: string;
  featured: boolean;
  status: GameStatus;
}

export const gamesApi = {
  list: (params: GameListParams = {}) =>
    apiRequest<Paginated<Game>>("/games", { query: { ...params } }),

  get: (id: string) => apiRequest<Game>(`/games/${id}`),

  create: (input: GameInput) =>
    apiRequest<Game>("/games", { method: "POST", body: input }),

  update: (id: string, input: Partial<GameInput>) =>
    apiRequest<Game>(`/games/${id}`, { method: "PATCH", body: input }),

  setStatus: (id: string, status: GameStatus) =>
    apiRequest<Game>(`/games/${id}/status`, { method: "PATCH", body: { status } }),

  setFeatured: (id: string, featured: boolean) =>
    apiRequest<Game>(`/games/${id}/featured`, {
      method: "PATCH",
      body: { featured },
    }),

  remove: (id: string) =>
    apiRequest<{ ok: true }>(`/games/${id}`, { method: "DELETE" }),
};
