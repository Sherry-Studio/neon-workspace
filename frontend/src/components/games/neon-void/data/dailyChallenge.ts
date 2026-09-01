import { MISSIONS } from "./missions";

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD (UTC)
  missionId: string;
  missionName: string;
  modifierLabel: string;
  rule:
    | { kind: "noUpgrades" }
    | { kind: "doubleSpawn" }
    | { kind: "glassCannon" }
    | { kind: "timeAttack" };
  target: string;
}

/** Deterministic per-UTC-day, so every player gets the same challenge without a server. */
export function dailyChallengeFor(date = new Date()): DailyChallenge {
  const day = date.toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < day.length; i++) seed = (seed * 31 + day.charCodeAt(i)) >>> 0;

  const playable = MISSIONS.filter((m) => m.objective.kind !== "boss");
  const mission = playable[seed % playable.length];
  const rules = [
    { rule: { kind: "noUpgrades" as const }, modifierLabel: "NO UPGRADES", target: "Score as high as possible with a stock Phantom." },
    { rule: { kind: "doubleSpawn" as const }, modifierLabel: "2× ENEMY SPAWN", target: "Twice the Rift. Same you." },
    { rule: { kind: "glassCannon" as const }, modifierLabel: "GLASS CANNON", target: "Double damage dealt and taken." },
    { rule: { kind: "timeAttack" as const }, modifierLabel: "TIME ATTACK", target: "Enemies spawn twice as fast." },
  ];
  const pick = rules[(seed >> 3) % rules.length];

  return {
    id: `daily-${day}`,
    date: day,
    missionId: mission.id,
    missionName: mission.name,
    modifierLabel: pick.modifierLabel,
    rule: pick.rule,
    target: pick.target,
  };
}
