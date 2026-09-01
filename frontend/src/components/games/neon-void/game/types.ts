/* ============================================================
   NEON VOID — LAST ORBIT · shared types
   ============================================================ */

export type Screen =
  | "cinematic"
  | "menu"
  | "mission-select"
  | "briefing"
  | "loading"
  | "playing"
  | "paused"
  | "mission-complete"
  | "game-over"
  | "victory"
  | "hangar"
  | "settings"
  | "achievements"
  | "leaderboard"
  | "daily";

export type Vec3 = [number, number, number];

export type EnemyKind =
  | "drone"
  | "interceptor"
  | "tanker"
  | "sniper"
  | "hunter"
  | "guardian";

export type BehaviourKind =
  | "pursue"
  | "strafe"
  | "flank"
  | "keepDistance"
  | "sniper"
  | "hunter";

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hull: number;
  speed: number;
  damage: number;
  fireRate: number; // shots per second
  range: number;
  score: number;
  behaviour: BehaviourKind;
  radius: number;
  colour: string;
  credits: number;
  xp: number;
}

export type ObjectiveKind =
  | "destroyAll"
  | "destroyCount"
  | "survive"
  | "reach"
  | "boss";

export interface Wave {
  at: number; // seconds into the mission
  spawn: Partial<Record<EnemyKind, number>>;
}

export interface OptionalObjective {
  id: string;
  label: string;
  /** evaluated against MissionResult at the end */
  test: (r: MissionResult) => boolean;
  credits: number;
  xp: number;
}

export type BossId = "void-reaper" | "rift-guardian" | "rift-core";

export interface MissionDef {
  id: string;
  index: number; // 1..9
  sector: 1 | 2 | 3;
  sectorName: string;
  name: string;
  brief: string;
  transmission: string[];
  objective: {
    kind: ObjectiveKind;
    count?: number; // destroyCount
    seconds?: number; // survive
    boss?: BossId;
    label: string;
  };
  environment: EnvKey;
  threat: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  waves: Wave[];
  expectedEnemies: string;
  reward: { credits: number; xp: number };
  optional: OptionalObjective[];
  /** difficulty multiplier applied to enemy hull / damage */
  difficulty: number;
  tutorial?: boolean;
}

export type EnvKey =
  | "outer-orbit"
  | "asteroid-field"
  | "dead-space"
  | "meteor-storm"
  | "rift-zone"
  | "rift-core";

export interface EnvDef {
  key: EnvKey;
  fog: string;
  ambient: number;
  nebulaA: string;
  nebulaB: string;
  starTint: string;
  asteroids: number;
  meteors: boolean;
}

export type UpgradeKey =
  | "hull"
  | "shield"
  | "damage"
  | "speed"
  | "energy"
  | "fireRate"
  | "missileDamage"
  | "missileCapacity"
  | "empStrength"
  | "empCooldown"
  | "boostEfficiency";

export interface UpgradeDef {
  key: UpgradeKey;
  name: string;
  description: string;
  max: number;
  /** value added per level */
  step: number;
  /** credits for level n (1-indexed) */
  cost: (level: number) => number;
  format: (value: number) => string;
  base: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** target progress (1 = boolean) */
  target: number;
}

export interface PlayerStatsBlock {
  hullMax: number;
  shieldMax: number;
  energyMax: number;
  speed: number;
  damage: number;
  fireRate: number;
  critChance: number;
  missileDamage: number;
  missileMax: number;
  empStrength: number;
  empCooldown: number;
  boostDrain: number;
}

export interface GameSave {
  version: number;
  createdAt: string;
  updatedAt: string;
  credits: number;
  xp: number;
  level: number;
  upgrades: Record<UpgradeKey, number>;
  missions: Record<
    string,
    { completed: boolean; bestScore: number; bestRank: Rank | null; bestAccuracy: number }
  >;
  achievements: Record<string, number>;
  totals: {
    kills: number;
    missionsCompleted: number;
    bossesDefeated: number;
    campaignComplete: boolean;
  };
  cosmetic: string;
  seenTutorial: boolean;
  settings: Settings;
  lastMissionId: string | null;
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  quality: "low" | "medium" | "high";
  cameraShake: number; // 0..1
  screenFlash: boolean;
  reducedMotion: boolean;
  sensitivity: number; // 0.3..2
  targetAssist: boolean;
}

export type Rank = "D" | "C" | "B" | "A" | "S" | "S+";

export interface MissionResult {
  missionId: string;
  success: boolean;
  score: number;
  rank: Rank;
  accuracy: number; // 0..1
  kills: number;
  maxCombo: number;
  timeSeconds: number;
  hullDamageTaken: number; // fraction 0..1
  shieldLost: boolean;
  credits: number;
  xp: number;
  optionalCleared: string[];
  reason: "complete" | "destroyed" | "timeout";
}

export interface HudSnapshot {
  hull: number;
  hullMax: number;
  shield: number;
  shieldMax: number;
  energy: number;
  energyMax: number;
  missiles: number;
  missilesMax: number;
  empReady: number; // 0..1
  boosting: boolean;
  score: number;
  combo: number;
  comboTimer: number; // 0..1
  objectiveLabel: string;
  objectiveProgress: string;
  objectiveDone: boolean;
  missionName: string;
  missionTimer: number | null; // seconds remaining, or null
  warnings: Warning[];
  target: TargetInfo | null;
  boss: BossHud | null;
  toasts: Toast[];
  critical: boolean;
  countdown: number | null;
  fps: number;
}

export interface Warning {
  id: string;
  label: string;
  kind: "danger" | "info";
}

export interface TargetInfo {
  name: string;
  hull: number;
  hullMax: number;
  distance: number;
}

export interface BossHud {
  name: string;
  phase: number;
  hull: number;
  hullMax: number;
  invulnerable: boolean;
  subLabel: string | null;
}

export interface Toast {
  id: number;
  text: string;
  kind: "kill" | "crit" | "objective" | "reward" | "level" | "warn";
  born: number;
}
