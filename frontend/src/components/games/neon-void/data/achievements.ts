import type { AchievementDef } from "../game/types";

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-blood", name: "FIRST BLOOD", description: "Destroy your first Rift ship.", target: 1 },
  { id: "ace-pilot", name: "ACE PILOT", description: "Destroy 100 Rift ships.", target: 100 },
  { id: "swarm", name: "SWARM BREAKER", description: "Destroy 500 Rift ships.", target: 500 },
  { id: "untouchable", name: "UNTOUCHABLE", description: "Complete a mission without hull damage.", target: 1 },
  { id: "combo-master", name: "COMBO MASTER", description: "Reach a 20x combo.", target: 1 },
  { id: "combo-god", name: "VOIDLINK", description: "Reach a 40x combo.", target: 1 },
  { id: "boss-slayer", name: "BOSS SLAYER", description: "Defeat a Rift boss.", target: 1 },
  { id: "survivor", name: "SURVIVOR", description: "Complete a survival mission.", target: 1 },
  { id: "perfect-run", name: "PERFECT RUN", description: "Finish a mission with an S rank.", target: 1 },
  { id: "s-plus", name: "STYLE", description: "Finish a mission with S+ rank.", target: 1 },
  { id: "rift-breaker", name: "RIFT BREAKER", description: "Destroy the Rift Core.", target: 1 },
  { id: "veteran", name: "LAST ORBIT", description: "Complete the campaign.", target: 1 },
];

export const achievementById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);

export const EMPTY_ACHIEVEMENTS: Record<string, number> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, 0]),
);
