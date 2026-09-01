import type { MissionDef, MissionResult } from "../game/types";

const takeLittleHull = (r: MissionResult) => r.hullDamageTaken < 0.2;
const keptShield = (r: MissionResult) => !r.shieldLost;
const fast = (s: number) => (r: MissionResult) => r.timeSeconds <= s;
const combo = (n: number) => (r: MissionResult) => r.maxCombo >= n;

export const MISSIONS: MissionDef[] = [
  {
    id: "m1-last-defense",
    index: 1,
    sector: 1,
    sectorName: "SECTOR 1 · OUTER ORBIT",
    name: "LAST DEFENSE",
    brief:
      "The defense line is gone. Hold the outer orbit and clear the first Rift probes before they reach the colonies.",
    transmission: [
      "COMMAND: Phantom, you're all that's left of the line.",
      "COMMAND: Drone screen inbound — burn them down.",
      "COMMAND: Watch your shield. It comes back if you break contact.",
    ],
    objective: { kind: "destroyAll", label: "Destroy all hostiles" },
    environment: "outer-orbit",
    threat: "LOW",
    waves: [
      { at: 0, spawn: { drone: 3 } },
      { at: 6, spawn: { drone: 2 } },
      { at: 14, spawn: { interceptor: 3 } },
    ],
    expectedEnemies: "5 Drones · 3 Interceptors",
    reward: { credits: 600, xp: 120 },
    optional: [
      { id: "o1", label: "Take under 20% hull damage", test: takeLittleHull, credits: 300, xp: 60 },
      { id: "o2", label: "Finish under 90s", test: fast(90), credits: 250, xp: 50 },
    ],
    difficulty: 1,
    tutorial: true,
  },
  {
    id: "m2-ambush",
    index: 2,
    sector: 1,
    sectorName: "SECTOR 1 · OUTER ORBIT",
    name: "AMBUSH",
    brief:
      "They were waiting for you in the belt. Survive the ambush — the asteroids will block fire if you use them.",
    transmission: [
      "COMMAND: Contacts everywhere — it's an ambush.",
      "COMMAND: Use the rocks for cover. Survive ninety seconds.",
    ],
    objective: { kind: "survive", seconds: 90, label: "Survive 90 seconds" },
    environment: "asteroid-field",
    threat: "MEDIUM",
    waves: [
      { at: 0, spawn: { drone: 4 } },
      { at: 15, spawn: { interceptor: 3 } },
      { at: 32, spawn: { hunter: 2, drone: 2 } },
      { at: 52, spawn: { interceptor: 4 } },
      { at: 72, spawn: { hunter: 2, interceptor: 2 } },
    ],
    expectedEnemies: "Drones · Interceptors · Hunters",
    reward: { credits: 900, xp: 180 },
    optional: [
      { id: "o1", label: "Never lose your shield", test: keptShield, credits: 400, xp: 90 },
      { id: "o2", label: "Reach a 12x combo", test: combo(12), credits: 300, xp: 70 },
    ],
    difficulty: 1.15,
  },
  {
    id: "m3-the-reaper",
    index: 3,
    sector: 1,
    sectorName: "SECTOR 1 · OUTER ORBIT",
    name: "THE REAPER",
    brief:
      "A Rift command ship — the VOID REAPER — is carving through the colonies. Take it apart.",
    transmission: [
      "COMMAND: That signature… it's a command ship. The Void Reaper.",
      "REAPER: Your fleet was noise. You are quieter.",
      "COMMAND: It shields itself with generators. Kill those first.",
    ],
    objective: { kind: "boss", boss: "void-reaper", label: "Destroy the Void Reaper" },
    environment: "outer-orbit",
    threat: "HIGH",
    waves: [{ at: 0, spawn: { drone: 3 } }],
    expectedEnemies: "VOID REAPER · escort drones",
    reward: { credits: 2200, xp: 500 },
    optional: [
      { id: "o1", label: "Take under 20% hull damage", test: takeLittleHull, credits: 700, xp: 150 },
      { id: "o2", label: "Finish under 3 minutes", test: fast(180), credits: 500, xp: 120 },
    ],
    difficulty: 1.2,
  },
  {
    id: "m4-ghost-signal",
    index: 4,
    sector: 2,
    sectorName: "SECTOR 2 · DEAD SPACE",
    name: "GHOST SIGNAL",
    brief:
      "A human distress beacon is pulsing from the dark. It's bait — but there may be survivors. Clear the sector.",
    transmission: [
      "SIGNAL: …repeat… any fleet asset… we are still—",
      "COMMAND: It's a trap, Phantom. But we can't leave them.",
    ],
    objective: { kind: "destroyCount", count: 15, label: "Destroy 15 hostiles" },
    environment: "dead-space",
    threat: "MEDIUM",
    waves: [
      { at: 0, spawn: { drone: 3, interceptor: 2 } },
      { at: 12, spawn: { hunter: 2 } },
      { at: 24, spawn: { sniper: 2, drone: 2 } },
      { at: 40, spawn: { interceptor: 3, hunter: 1 } },
      { at: 58, spawn: { hunter: 2, sniper: 1 } },
    ],
    expectedEnemies: "Interceptors · Hunters · Snipers",
    reward: { credits: 1400, xp: 300 },
    optional: [
      { id: "o1", label: "90%+ accuracy", test: (r) => r.accuracy >= 0.9, credits: 500, xp: 110 },
      { id: "o2", label: "Reach a 15x combo", test: combo(15), credits: 400, xp: 90 },
    ],
    difficulty: 1.3,
  },
  {
    id: "m5-meteor-storm",
    index: 5,
    sector: 2,
    sectorName: "SECTOR 2 · DEAD SPACE",
    name: "METEOR STORM",
    brief:
      "The only way through is a live meteor stream. Reach the extraction point while the Rift hounds you.",
    transmission: [
      "COMMAND: Extraction is on the far side of that storm.",
      "COMMAND: Rocks will kill you as fast as they will. Fly clean.",
    ],
    objective: { kind: "reach", label: "Reach the extraction point" },
    environment: "meteor-storm",
    threat: "HIGH",
    waves: [
      { at: 0, spawn: { interceptor: 3 } },
      { at: 14, spawn: { hunter: 2, drone: 2 } },
      { at: 30, spawn: { interceptor: 3, sniper: 1 } },
      { at: 48, spawn: { hunter: 3 } },
    ],
    expectedEnemies: "Interceptors · Hunters · meteor stream",
    reward: { credits: 2500, xp: 420 },
    optional: [
      { id: "o1", label: "Take under 25% hull damage", test: (r) => r.hullDamageTaken < 0.25, credits: 800, xp: 160 },
    ],
    difficulty: 1.35,
  },
  {
    id: "m6-rift-guardian",
    index: 6,
    sector: 2,
    sectorName: "SECTOR 2 · DEAD SPACE",
    name: "RIFT GUARDIAN",
    brief:
      "An ancient structure lies at the sector's heart, and a GUARDIAN stands at its gate. Break through.",
    transmission: [
      "COMMAND: There's a structure down there — older than the Rift.",
      "GUARDIAN: The way is closed. It has always been closed.",
    ],
    objective: { kind: "boss", boss: "rift-guardian", label: "Destroy the Rift Guardian" },
    environment: "dead-space",
    threat: "EXTREME",
    waves: [{ at: 0, spawn: { drone: 2 } }],
    expectedEnemies: "RIFT GUARDIAN · summoned drones",
    reward: { credits: 3200, xp: 720 },
    optional: [
      { id: "o1", label: "Never lose your shield", test: keptShield, credits: 900, xp: 200 },
    ],
    difficulty: 1.45,
  },
  {
    id: "m7-no-escape",
    index: 7,
    sector: 3,
    sectorName: "SECTOR 3 · THE RIFT",
    name: "NO ESCAPE",
    brief:
      "You're inside the Rift now. Hold position for three minutes while the survivors evacuate. It gets worse every thirty seconds.",
    transmission: [
      "COMMAND: Evac ships are loading. Buy them three minutes.",
      "COMMAND: The Rift is… adapting. Stay sharp.",
    ],
    objective: { kind: "survive", seconds: 180, label: "Survive 3 minutes" },
    environment: "rift-zone",
    threat: "EXTREME",
    waves: [
      { at: 0, spawn: { drone: 4, interceptor: 2 } },
      { at: 30, spawn: { interceptor: 4, hunter: 2 } },
      { at: 60, spawn: { hunter: 3, sniper: 2 } },
      { at: 90, spawn: { interceptor: 4, hunter: 3 } },
      { at: 120, spawn: { hunter: 4, sniper: 2, tanker: 1 } },
      { at: 150, spawn: { interceptor: 5, hunter: 3, sniper: 2 } },
    ],
    expectedEnemies: "Everything the Rift has",
    reward: { credits: 3600, xp: 640 },
    optional: [
      { id: "o1", label: "Reach a 25x combo", test: combo(25), credits: 1000, xp: 220 },
    ],
    difficulty: 1.5,
  },
  {
    id: "m8-final-approach",
    index: 8,
    sector: 3,
    sectorName: "SECTOR 3 · THE RIFT",
    name: "FINAL APPROACH",
    brief:
      "The Rift Core is dead ahead. Punch a hole through the last defense screen and reach the portal.",
    transmission: [
      "COMMAND: That's it, Phantom. The Core is right there.",
      "COMMAND: Clear the screen and fly into the portal. We'll be listening.",
    ],
    objective: { kind: "reach", label: "Break the screen, reach the portal" },
    environment: "rift-zone",
    threat: "EXTREME",
    waves: [
      { at: 0, spawn: { drone: 4, interceptor: 2 } },
      { at: 12, spawn: { interceptor: 4, hunter: 2 } },
      { at: 26, spawn: { hunter: 3, tanker: 1 } },
      { at: 42, spawn: { hunter: 2, tanker: 2, sniper: 2 } },
    ],
    expectedEnemies: "10 Drones · 8 Interceptors · 5 Hunters · 3 Tankers",
    reward: { credits: 4000, xp: 800 },
    optional: [
      { id: "o1", label: "80%+ accuracy", test: (r) => r.accuracy >= 0.8, credits: 1200, xp: 260 },
    ],
    difficulty: 1.6,
  },
  {
    id: "m9-rift-core",
    index: 9,
    sector: 3,
    sectorName: "SECTOR 3 · THE RIFT",
    name: "THE RIFT CORE",
    brief:
      "This is the last orbit. Destroy the Rift Core before the dimensional collapse takes the whole system with it.",
    transmission: [
      "COMMAND: Whatever happens in there — thank you, Phantom.",
      "RIFT: We were here before your star. We will be here after.",
      "COMMAND: Kill it. Then run.",
    ],
    objective: { kind: "boss", boss: "rift-core", label: "Destroy the Rift Core" },
    environment: "rift-core",
    threat: "EXTREME",
    waves: [{ at: 0, spawn: { drone: 3 } }],
    expectedEnemies: "THE RIFT CORE",
    reward: { credits: 8000, xp: 2000 },
    optional: [
      { id: "o1", label: "Take under 30% hull damage", test: (r) => r.hullDamageTaken < 0.3, credits: 2500, xp: 500 },
    ],
    difficulty: 1.7,
  },
];

export const missionById = (id: string) => MISSIONS.find((m) => m.id === id);
export const nextMission = (id: string) => {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i >= 0 && i < MISSIONS.length - 1 ? MISSIONS[i + 1] : null;
};
