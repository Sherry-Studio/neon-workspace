import { apiFetch, apiFetchPage, PROXY_BASE, type Page } from "@/lib/api/client";
import { serverBackendBase } from "@/lib/api/backend-url";
import type { Game } from "@/types/api";

export interface GameListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: string;
  featured?: boolean;
}

export const gamesService = {
  list: (params: GameListParams = {}, signal?: AbortSignal): Promise<Page<Game>> =>
    apiFetchPage<Game>("/games", { query: { ...params }, signal }),

  featured: (limit = 6): Promise<Game[]> =>
    apiFetch<{ games: Game[] }>("/games/featured", { query: { limit } }).then(
      (d) => d.games,
    ),

  bySlug: (slug: string, opts?: { server?: boolean }): Promise<Game> =>
    apiFetch<{ game: Game }>(`/games/${slug}`, {
      base: opts?.server ? serverBackendBase() : undefined,
    }).then((d) => d.game),

  byCategory: (category: string, params: GameListParams = {}): Promise<Page<Game>> =>
    apiFetchPage<Game>(`/games/category/${category}`, { query: { ...params } }),

  categories: (): Promise<string[]> =>
    apiFetch<{ categories: string[] }>("/games/categories").then((d) => d.categories),

  // ── authenticated (via same-origin proxy) ──
  startPlay: (gameId: string): Promise<{ playSessionId: string }> =>
    apiFetch(`/games/${gameId}/play`, { method: "POST", base: PROXY_BASE }),

  completePlay: (input: {
    playSessionId: string;
    score?: number;
    durationSeconds?: number;
  }): Promise<unknown> =>
    apiFetch("/games/play/complete", {
      method: "POST",
      base: PROXY_BASE,
      body: input,
    }),

  submitScore: (input: {
    gameId: string;
    score: number;
    duration?: number;
    playSessionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ flagged: boolean; achievementsUnlocked: unknown[] }> =>
    apiFetch("/scores", { method: "POST", base: PROXY_BASE, body: input }),
};
