/* ============================================================
   NEON VOID — backend bridge.
   Reuses the site's existing service layer:
     · gamesService.bySlug / startPlay / submitScore   → scores + play tracking
     · leaderboardService.byGame                        → leaderboard
     · /api/gateway/games/neon-void/progress            → cloud save (optional)
   Every call degrades gracefully to local-only.
   ============================================================ */

import { gamesService, leaderboardService } from "@/services";
import { ApiError } from "@/lib/api/client";
import type { GameSave, MissionResult } from "./types";

let cachedGameId: string | null = null;

export async function resolveGameId(): Promise<string | null> {
  if (cachedGameId) return cachedGameId;
  try {
    const game = await gamesService.bySlug("neon-void");
    cachedGameId = game.id;
    return game.id;
  } catch {
    return null;
  }
}

export interface AnalyticsEvent {
  event: string;
  props?: Record<string, unknown>;
}

/** Fire-and-forget analytics. No-op if the endpoint isn't there. */
export function track(e: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  try {
    // Reuse the same-origin gateway; the backend may ignore unknown paths.
    void fetch("/api/gateway/analytics/neon-void", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...e, ts: Date.now() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics is never load-bearing */
  }
}

export interface PlaySession {
  playSessionId: string | null;
}

export async function beginPlaySession(): Promise<PlaySession> {
  const id = await resolveGameId();
  if (!id) return { playSessionId: null };
  try {
    const res = await gamesService.startPlay(id);
    return { playSessionId: res.playSessionId ?? null };
  } catch {
    return { playSessionId: null };
  }
}

export interface ScoreSubmitOutcome {
  submitted: boolean;
  flagged: boolean;
  reason?: string;
}

/**
 * Client-side plausibility gate BEFORE the network call. The server does its
 * own validation — this only stops obviously bogus values from being sent.
 */
export function isPlausible(result: MissionResult): { ok: boolean; reason?: string } {
  if (!Number.isFinite(result.score) || result.score < 0 || result.score > 5_000_000)
    return { ok: false, reason: "score out of range" };
  if (result.timeSeconds < 3 && result.score > 20_000)
    return { ok: false, reason: "score too high for time" };
  if (result.kills < 0 || result.kills > 4000) return { ok: false, reason: "kill count out of range" };
  if (result.accuracy < 0 || result.accuracy > 1) return { ok: false, reason: "accuracy invalid" };
  const perSecond = result.timeSeconds > 0 ? result.score / result.timeSeconds : result.score;
  if (perSecond > 8000) return { ok: false, reason: "score rate implausible" };
  return { ok: true };
}

export async function submitScore(
  result: MissionResult,
  session: PlaySession,
): Promise<ScoreSubmitOutcome> {
  const plausible = isPlausible(result);
  if (!plausible.ok) return { submitted: false, flagged: true, reason: plausible.reason };

  const id = await resolveGameId();
  if (!id) return { submitted: false, flagged: false, reason: "offline" };

  try {
    const res = await gamesService.submitScore({
      gameId: id,
      score: result.score,
      duration: result.timeSeconds,
      playSessionId: session.playSessionId ?? undefined,
      metadata: {
        game: "neon-void",
        mission: result.missionId,
        rank: result.rank,
        accuracy: Math.round(result.accuracy * 100),
        kills: result.kills,
        maxCombo: result.maxCombo,
      },
    });
    return { submitted: true, flagged: !!res.flagged };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      return { submitted: false, flagged: false, reason: "sign-in" };
    }
    return { submitted: false, flagged: false, reason: "network" };
  }
}

export interface LeaderRow {
  rank: number;
  username: string;
  avatar: string;
  score: number;
}

export async function fetchLeaderboard(
  range: "day" | "week" | "all",
): Promise<{ rows: LeaderRow[]; error: boolean }> {
  const id = await resolveGameId();
  if (!id) return { rows: [], error: true };
  try {
    const page = await leaderboardService.byGame(id, {
      range: range === "all" ? "all" : range === "week" ? "week" : "day",
      limit: 25,
    });
    return {
      rows: page.items.map((e) => ({
        rank: e.rank,
        username: e.username,
        avatar: e.avatar,
        score: e.score,
      })),
      error: false,
    };
  } catch {
    return { rows: [], error: true };
  }
}

/* ---------------- cloud save (optional endpoint) ---------------- */

export async function loadCloudSave(): Promise<Partial<GameSave> | null> {
  try {
    const res = await fetch("/api/gateway/games/neon-void/progress", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return (json?.data ?? json) as Partial<GameSave> | null;
  } catch {
    return null;
  }
}

export async function saveCloud(save: GameSave): Promise<boolean> {
  try {
    const res = await fetch("/api/gateway/games/neon-void/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(save),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
