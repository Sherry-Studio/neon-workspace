/* ============================================================
   NEON VOID — progression + save.
   Guests: localStorage. Authenticated players: the same shape is
   persisted to the backend via /api/gateway/games/neon-void/progress
   (with a graceful fall-back to localStorage when unavailable).
   ============================================================ */

import type { GameSave, Settings, MissionResult, Rank } from "./types";
import { EMPTY_UPGRADES, levelFromXp } from "../data/upgrades";
import { EMPTY_ACHIEVEMENTS, ACHIEVEMENTS } from "../data/achievements";
import { MISSIONS } from "../data/missions";

const KEY = "neon-void:save:v1";
export const SAVE_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  quality: "high",
  cameraShake: 0.8,
  screenFlash: true,
  reducedMotion: false,
  sensitivity: 1,
  targetAssist: true,
};

function freshSave(): GameSave {
  const now = new Date().toISOString();
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    credits: 0,
    xp: 0,
    level: 1,
    upgrades: { ...EMPTY_UPGRADES },
    missions: Object.fromEntries(
      MISSIONS.map((m) => [
        m.id,
        { completed: false, bestScore: 0, bestRank: null as Rank | null, bestAccuracy: 0 },
      ]),
    ),
    achievements: { ...EMPTY_ACHIEVEMENTS },
    totals: { kills: 0, missionsCompleted: 0, bossesDefeated: 0, campaignComplete: false },
    cosmetic: "phantom-default",
    seenTutorial: false,
    settings: { ...DEFAULT_SETTINGS },
    lastMissionId: null,
  };
}

function migrate(raw: unknown): GameSave {
  const base = freshSave();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<GameSave>;
  return {
    ...base,
    ...r,
    version: SAVE_VERSION,
    upgrades: { ...base.upgrades, ...(r.upgrades ?? {}) },
    achievements: { ...base.achievements, ...(r.achievements ?? {}) },
    missions: { ...base.missions, ...(r.missions ?? {}) },
    totals: { ...base.totals, ...(r.totals ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
  };
}

export function loadLocal(): GameSave {
  if (typeof window === "undefined") return freshSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    return migrate(JSON.parse(raw));
  } catch {
    return freshSave();
  }
}

export function persistLocal(save: GameSave) {
  if (typeof window === "undefined") return;
  try {
    save.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode / quota — game continues without persistence */
  }
}

/** Merge server save into local (server wins on conflict for progression). */
export function mergeSaves(local: GameSave, server: Partial<GameSave> | null): GameSave {
  if (!server) return local;
  const merged = migrate({ ...local, ...server });
  // keep the more-generous progression values
  merged.credits = Math.max(local.credits, server.credits ?? 0);
  merged.xp = Math.max(local.xp, server.xp ?? 0);
  for (const m of MISSIONS) {
    const a = local.missions[m.id];
    const b = server.missions?.[m.id];
    merged.missions[m.id] = {
      completed: (a?.completed ?? false) || (b?.completed ?? false),
      bestScore: Math.max(a?.bestScore ?? 0, b?.bestScore ?? 0),
      bestRank: bestRank(a?.bestRank ?? null, b?.bestRank ?? null),
      bestAccuracy: Math.max(a?.bestAccuracy ?? 0, b?.bestAccuracy ?? 0),
    };
  }
  for (const key of Object.keys(merged.upgrades) as (keyof GameSave["upgrades"])[]) {
    merged.upgrades[key] = Math.max(local.upgrades[key] ?? 0, server.upgrades?.[key] ?? 0);
  }
  for (const a of ACHIEVEMENTS) {
    merged.achievements[a.id] = Math.max(
      local.achievements[a.id] ?? 0,
      server.achievements?.[a.id] ?? 0,
    );
  }
  merged.level = levelFromXp(merged.xp).level;
  return merged;
}

const RANK_ORDER: Rank[] = ["D", "C", "B", "A", "S", "S+"];
export function bestRank(a: Rank | null, b: Rank | null): Rank | null {
  if (!a) return b;
  if (!b) return a;
  return RANK_ORDER.indexOf(a) >= RANK_ORDER.indexOf(b) ? a : b;
}

export function missionUnlocked(save: GameSave, missionId: string): boolean {
  const idx = MISSIONS.findIndex((m) => m.id === missionId);
  if (idx <= 0) return true;
  return save.missions[MISSIONS[idx - 1].id]?.completed ?? false;
}

/** Apply a finished mission to the save (mutates a copy, returns it + rewards). */
export function applyResult(
  prev: GameSave,
  result: MissionResult,
): { save: GameSave; leveledUp: boolean; unlocked: string[] } {
  const save: GameSave = JSON.parse(JSON.stringify(prev));
  const beforeLevel = levelFromXp(save.xp).level;

  save.totals.kills += result.kills;

  if (result.success) {
    const rec = save.missions[result.missionId] ?? {
      completed: false, bestScore: 0, bestRank: null, bestAccuracy: 0,
    };
    const first = !rec.completed;
    rec.completed = true;
    rec.bestScore = Math.max(rec.bestScore, result.score);
    rec.bestRank = bestRank(rec.bestRank, result.rank);
    rec.bestAccuracy = Math.max(rec.bestAccuracy, result.accuracy);
    save.missions[result.missionId] = rec;

    save.credits += result.credits;
    save.xp += result.xp;
    if (first) save.totals.missionsCompleted += 1;

    const m = MISSIONS.find((x) => x.id === result.missionId);
    if (m?.objective.kind === "boss") save.totals.bossesDefeated += 1;
    if (m?.index === 9) {
      save.totals.campaignComplete = true;
      bump(save, "rift-breaker", 1);
      bump(save, "veteran", 1);
    }

    // achievements
    if (result.hullDamageTaken <= 0.0001) bump(save, "untouchable", 1);
    if (result.rank === "S" || result.rank === "S+") bump(save, "perfect-run", 1);
    if (result.rank === "S+") bump(save, "s-plus", 1);
    if (m?.objective.kind === "boss") bump(save, "boss-slayer", 1);
    if (m?.objective.kind === "survive") bump(save, "survivor", 1);
  }

  // combo / kill milestones regardless of success
  set(save, "ace-pilot", save.totals.kills);
  set(save, "swarm", save.totals.kills);
  if (save.totals.kills > 0) bump(save, "first-blood", 1);
  if (result.maxCombo >= 20) bump(save, "combo-master", 1);
  if (result.maxCombo >= 40) bump(save, "combo-god", 1);

  save.lastMissionId = result.missionId;
  save.level = levelFromXp(save.xp).level;
  const afterLevel = save.level;

  const unlocked: string[] = [];
  if (result.success) {
    const idx = MISSIONS.findIndex((m) => m.id === result.missionId);
    if (idx >= 0 && idx < MISSIONS.length - 1) unlocked.push(MISSIONS[idx + 1].name);
  }

  return { save, leveledUp: afterLevel > beforeLevel, unlocked };
}

function bump(save: GameSave, id: string, by: number) {
  save.achievements[id] = Math.min(
    ACHIEVEMENTS.find((a) => a.id === id)?.target ?? 1,
    (save.achievements[id] ?? 0) + by,
  );
}
function set(save: GameSave, id: string, value: number) {
  save.achievements[id] = Math.min(
    ACHIEVEMENTS.find((a) => a.id === id)?.target ?? 1,
    Math.max(save.achievements[id] ?? 0, value),
  );
}
