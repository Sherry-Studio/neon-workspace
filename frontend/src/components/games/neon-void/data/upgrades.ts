import type { UpgradeDef, UpgradeKey, PlayerStatsBlock, GameSave } from "../game/types";

const ramp = (b: number) => (level: number) => Math.round(b * Math.pow(1.9, level - 1));

export const UPGRADES: UpgradeDef[] = [
  { key: "hull", name: "Hull Plating", description: "Raises maximum hull integrity.", base: 100, step: 25, max: 6, cost: ramp(500), format: (v) => `${v}` },
  { key: "shield", name: "Shield Capacitor", description: "Raises maximum shield.", base: 60, step: 20, max: 6, cost: ramp(500), format: (v) => `${v}` },
  { key: "damage", name: "Pulse Amplifier", description: "Increases Pulse Cannon damage.", base: 10, step: 3, max: 8, cost: ramp(450), format: (v) => `${v}` },
  { key: "fireRate", name: "Cycler", description: "Increases Pulse Cannon fire rate.", base: 6, step: 1.1, max: 6, cost: ramp(600), format: (v) => `${v.toFixed(1)}/s` },
  { key: "speed", name: "Thruster Tune", description: "Increases Phantom top speed.", base: 26, step: 3, max: 6, cost: ramp(500), format: (v) => `${v}` },
  { key: "energy", name: "Reactor Core", description: "Raises maximum energy.", base: 100, step: 25, max: 5, cost: ramp(550), format: (v) => `${v}` },
  { key: "missileDamage", name: "Warhead", description: "Increases Rift Missile damage.", base: 80, step: 30, max: 6, cost: ramp(700), format: (v) => `${v}` },
  { key: "missileCapacity", name: "Missile Rack", description: "Carry more Rift Missiles.", base: 4, step: 2, max: 5, cost: ramp(650), format: (v) => `${v}` },
  { key: "empStrength", name: "EMP Coil", description: "Longer EMP disable + slow.", base: 3, step: 0.6, max: 5, cost: ramp(700), format: (v) => `${v.toFixed(1)}s` },
  { key: "empCooldown", name: "EMP Recharger", description: "Reduces EMP cooldown.", base: 16, step: -2, max: 5, cost: ramp(700), format: (v) => `${v}s` },
  { key: "boostEfficiency", name: "Boost Regulator", description: "Boost drains less energy.", base: 22, step: -2.5, max: 5, cost: ramp(600), format: (v) => `${v.toFixed(0)}/s` },
];

export const upgradeByKey = (k: UpgradeKey) => UPGRADES.find((u) => u.key === k)!;

export const EMPTY_UPGRADES: Record<UpgradeKey, number> = {
  hull: 0, shield: 0, damage: 0, speed: 0, energy: 0, fireRate: 0,
  missileDamage: 0, missileCapacity: 0, empStrength: 0, empCooldown: 0, boostEfficiency: 0,
};

/** Resolve the player's stat block from a save's upgrade levels. */
export function resolveStats(save: GameSave): PlayerStatsBlock {
  const lvl = (k: UpgradeKey) => save.upgrades[k] ?? 0;
  const val = (k: UpgradeKey) => {
    const d = upgradeByKey(k);
    return d.base + d.step * lvl(k);
  };
  return {
    hullMax: val("hull"),
    shieldMax: val("shield"),
    energyMax: val("energy"),
    speed: val("speed"),
    damage: val("damage"),
    fireRate: val("fireRate"),
    critChance: 0.08,
    missileDamage: val("missileDamage"),
    missileMax: val("missileCapacity"),
    empStrength: val("empStrength"),
    empCooldown: Math.max(6, val("empCooldown")),
    boostDrain: Math.max(10, val("boostEfficiency")),
  };
}

export const xpForLevel = (level: number) => Math.round(200 * Math.pow(1.35, level - 1));

export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, into: remaining, need: xpForLevel(level) };
}
