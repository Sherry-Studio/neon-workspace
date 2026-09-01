/* ============================================================
   NEON VOID — LAST ORBIT · game engine
   ------------------------------------------------------------
   A framework-free simulation. All high-frequency state lives
   here in plain arrays/objects (never React state). The R3F
   scene reads `world` every frame; the HUD polls `snapshot()`
   at ~12 Hz. Nothing here imports React.
   ============================================================ */

import * as THREE from "three";
import type {
  MissionDef,
  PlayerStatsBlock,
  Settings,
  HudSnapshot,
  MissionResult,
  Rank,
  Toast,
  EnemyKind,
  BehaviourKind,
} from "./types";
import { ENEMIES } from "../data/enemies";
import { ENVIRONMENTS } from "../data/environments";
import { AudioEngine } from "./audio";
import { createBoss, type Boss } from "./bosses";

export const ARENA = 82; // half-extent on X/Z
export const ARENA_Y = 20;

let ID = 1;
const nid = () => ID++;

export interface Bullet {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  crit: boolean;
  radius: number;
  from: "player" | "enemy" | "boss";
  colour: string;
}

export interface Missile {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  targetId: number | null;
  tracking: number;
}

export interface FX {
  active: boolean;
  pos: THREE.Vector3;
  kind: "explosion" | "big" | "hit" | "shield" | "muzzle" | "emp" | "pickup" | "debris";
  life: number;
  maxLife: number;
  scale: number;
  colour: string;
  vel?: THREE.Vector3;
}

export type PickupKind = "energy" | "shield" | "hull" | "credits" | "combo" | "missile";
export interface Pickup {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  kind: PickupKind;
  life: number;
  value: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  name: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hull: number;
  hullMax: number;
  speed: number;
  damage: number;
  fireRate: number;
  range: number;
  score: number;
  credits: number;
  xp: number;
  radius: number;
  colour: string;
  behaviour: BehaviourKind;
  fireCd: number;
  chargeT: number; // sniper charge
  charging: boolean;
  disabledT: number; // EMP
  slowT: number;
  strafeDir: number;
  wobble: number;
  alive: boolean;
  spawnT: number; // fade-in
  hitFlash: number;
}

export interface Asteroid {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  spin: THREE.Vector3;
  rot: THREE.Euler;
  meteor: boolean;
}

export interface PlayerState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  aimYaw: number;
  aimPitch: number;
  hull: number;
  shield: number;
  energy: number;
  missiles: number;
  hullMax: number;
  shieldMax: number;
  energyMax: number;
  missilesMax: number;
  fireCd: number;
  missileCd: number;
  empCd: number;
  empActiveT: number;
  regenLock: number; // time since last hit
  boosting: boolean;
  boostRamp: number; // 0..1 visual
  damageT: number; // hit flash
  alive: boolean;
  strafeTilt: number;
}

export interface World {
  player: PlayerState;
  enemies: Enemy[];
  pBullets: Bullet[];
  eBullets: Bullet[];
  missiles: Missile[];
  fx: FX[];
  pickups: Pickup[];
  asteroids: Asteroid[];
  boss: Boss | null;
  camShake: number;
  camPunch: number;
  time: number;
  reachProgress: number; // for "reach" missions 0..1
}

export type EngineEvent =
  | { type: "kill"; kind: EnemyKind; score: number; crit: boolean }
  | { type: "objective-complete" }
  | { type: "mission-complete"; result: MissionResult }
  | { type: "mission-failed"; result: MissionResult }
  | { type: "boss-start"; name: string }
  | { type: "boss-phase"; phase: number }
  | { type: "toast"; toast: Omit<Toast, "id" | "born"> }
  | { type: "hull-critical" }
  | { type: "sfx"; name: Parameters<AudioEngine["play"]>[0] }
  | { type: "flash"; colour: string };

export interface EngineOpts {
  mission: MissionDef;
  stats: PlayerStatsBlock;
  settings: Settings;
  audio: AudioEngine;
  modifiers?: {
    doubleSpawn?: boolean;
    fastSpawn?: boolean;
    glassCannon?: boolean;
    noUpgrades?: boolean;
  };
  onEvent: (e: EngineEvent) => void;
}

const RANKS: Rank[] = ["D", "C", "B", "A", "S", "S+"];

export class GameEngine {
  world: World;
  mission: MissionDef;
  settings: Settings;
  private stats: PlayerStatsBlock;
  private audio: AudioEngine;
  private onEvent: (e: EngineEvent) => void;
  private mods: NonNullable<EngineOpts["modifiers"]>;

  // input (screen-space mouse in -1..1, keys)
  keys = new Set<string>();
  mouse = { x: 0, y: 0 };
  private _firing = false;
  private fireBurst = 0; // keeps firing briefly after a quick click/tap
  missileHeld = false;
  private missileBurst = 0;

  set firing(v: boolean) {
    this._firing = v;
    if (v) this.fireBurst = 0.14;
  }
  get firing() {
    return this._firing || this.fireBurst > 0;
  }

  requestMissile() {
    this.missileBurst = 0.14;
  }

  // stats
  private score = 0;
  private combo = 0;
  private comboT = 0;
  private maxCombo = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private kills = 0;
  private hullDamageTaken = 0;
  private shieldLost = false;
  private elapsed = 0;
  private waveIndex = 0;
  private killTarget = 0;
  private ended: "complete" | "destroyed" | "timeout" | null = null;
  private objectiveDone = false;
  private toasts: Toast[] = [];
  private warnings: HudSnapshot["warnings"] = [];
  private survivalKeepAlive = 0;
  private endResult: MissionResult | null = null;
  private countdown: number | null = null;
  private lockedTargetId: number | null = null;
  private fpsSmooth = 60;
  private difficulty: number;

  // scratch
  private _v = new THREE.Vector3();
  private _v2 = new THREE.Vector3();
  private _q = new THREE.Quaternion();

  constructor(o: EngineOpts) {
    this.mission = o.mission;
    this.settings = o.settings;
    this.stats = o.stats;
    this.audio = o.audio;
    this.onEvent = o.onEvent;
    this.mods = o.modifiers ?? {};
    this.difficulty = o.mission.difficulty * (this.mods.fastSpawn ? 1.1 : 1);

    const dmgTakenMul = this.mods.glassCannon ? 2 : 1;
    void dmgTakenMul;

    const p: PlayerState = {
      pos: new THREE.Vector3(0, 0, 30),
      vel: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      aimYaw: Math.PI,
      aimPitch: 0,
      hull: o.stats.hullMax,
      shield: o.stats.shieldMax,
      energy: o.stats.energyMax,
      missiles: o.stats.missileMax,
      hullMax: o.stats.hullMax,
      shieldMax: o.stats.shieldMax,
      energyMax: o.stats.energyMax,
      missilesMax: o.stats.missileMax,
      fireCd: 0,
      missileCd: 0,
      empCd: 0,
      empActiveT: 0,
      regenLock: 0,
      boosting: false,
      boostRamp: 0,
      damageT: 0,
      alive: true,
      strafeTilt: 0,
    };

    this.world = {
      player: p,
      enemies: [],
      pBullets: Array.from({ length: 160 }, () => this.blankBullet("player")),
      eBullets: Array.from({ length: 220 }, () => this.blankBullet("enemy")),
      missiles: Array.from({ length: 24 }, () => ({
        active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        life: 0, damage: 0, targetId: null, tracking: 0,
      })),
      fx: Array.from({ length: 200 }, () => ({
        active: false, pos: new THREE.Vector3(), kind: "hit" as const,
        life: 0, maxLife: 1, scale: 1, colour: "#fff", vel: new THREE.Vector3(),
      })),
      pickups: Array.from({ length: 40 }, () => ({
        active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        kind: "credits" as PickupKind, life: 0, value: 0,
      })),
      asteroids: [],
      boss: null,
      camShake: 0,
      camPunch: 0,
      time: 0,
      reachProgress: 0,
    };

    this.buildEnvironment();

    if (this.mission.objective.kind === "destroyCount") {
      this.killTarget = this.mission.objective.count ?? 10;
    }
  }

  // ---------------------------------------------------------------- setup
  private buildEnvironment() {
    const env = ENVIRONMENTS[this.mission.environment];
    const q = this.settings.quality;
    const count = Math.round(env.asteroids * (q === "low" ? 0.5 : q === "medium" ? 0.8 : 1));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 20 + Math.random() * (ARENA - 24);
      this.world.asteroids.push({
        pos: new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 14, Math.sin(a) * r),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4),
        radius: 1.6 + Math.random() * 4.4,
        spin: new THREE.Vector3(Math.random() * 0.6, Math.random() * 0.6, Math.random() * 0.6),
        rot: new THREE.Euler(),
        meteor: false,
      });
    }
  }

  private blankBullet(from: "player" | "enemy" | "boss"): Bullet {
    return {
      active: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      life: 0, damage: 0, crit: false, radius: 0.5, from, colour: "#22d3ee",
    };
  }

  // ---------------------------------------------------------------- spawning
  private spawnEnemy(kind: EnemyKind) {
    const def = ENEMIES[kind];
    const p = this.world.player;
    // Spawn mostly in the arc the player is facing (world-space angle that lines
    // up with the aim direction), so combat comes to you.
    const facing = Math.atan2(Math.cos(p.aimYaw), Math.sin(p.aimYaw));
    const a = facing + (Math.random() - 0.5) * Math.PI * 1.5;
    const r = 46 + Math.random() * 20;
    const pos = new THREE.Vector3(
      THREE.MathUtils.clamp(p.pos.x + Math.cos(a) * r, -ARENA + 4, ARENA - 4),
      p.pos.y + (Math.random() - 0.5) * 12,
      THREE.MathUtils.clamp(p.pos.z + Math.sin(a) * r, -ARENA + 4, ARENA - 4),
    );
    const dmul = this.difficulty;
    this.world.enemies.push({
      id: nid(),
      kind,
      name: def.name,
      pos,
      vel: new THREE.Vector3(),
      hull: def.hull * dmul,
      hullMax: def.hull * dmul,
      speed: def.speed * (this.mods.fastSpawn ? 1.06 : 1),
      damage: def.damage * dmul * (this.mods.glassCannon ? 1.3 : 1),
      fireRate: def.fireRate,
      range: def.range,
      score: def.score,
      credits: def.credits,
      xp: def.xp,
      radius: def.radius,
      colour: def.colour,
      behaviour: def.behaviour,
      fireCd: 0.8 + Math.random(),
      chargeT: 0,
      charging: false,
      disabledT: 0,
      slowT: 0,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      wobble: Math.random() * Math.PI * 2,
      alive: true,
      spawnT: 0,
      hitFlash: 0,
    });
  }

  private runWaves(dt: number) {
    void dt;
    const waves = this.mission.waves;
    while (this.waveIndex < waves.length && this.elapsed >= waves[this.waveIndex].at) {
      const w = waves[this.waveIndex];
      const mul = this.mods.doubleSpawn ? 2 : 1;
      for (const [k, n] of Object.entries(w.spawn)) {
        for (let i = 0; i < (n as number) * mul; i++) this.spawnEnemy(k as EnemyKind);
      }
      this.waveIndex++;
    }

    // survival / reach missions keep pressure on once scripted waves run out
    const kind = this.mission.objective.kind;
    if ((kind === "survive" || kind === "reach") && !this.ended) {
      this.survivalKeepAlive -= dt;
      const wantAlive =
        kind === "survive"
          ? 4 + Math.floor(this.elapsed / 25)
          : 5 + Math.floor(this.elapsed / 18);
      if (this.survivalKeepAlive <= 0 && this.world.enemies.length < wantAlive) {
        const pool: EnemyKind[] =
          this.elapsed > 90
            ? ["hunter", "interceptor", "sniper", "drone"]
            : this.elapsed > 45
              ? ["interceptor", "hunter", "drone"]
              : ["drone", "interceptor"];
        this.spawnEnemy(pool[Math.floor(Math.random() * pool.length)]);
        this.survivalKeepAlive = Math.max(0.8, 2.4 - this.elapsed / 120);
      }
    }
  }

  // ---------------------------------------------------------------- input → player
  private updatePlayer(dt: number) {
    const p = this.world.player;
    if (!p.alive) return;

    // aim from mouse position (screen -1..1). Cursor near centre = fly straight;
    // push toward an edge to bank/turn that way. Dead-zone keeps it steady.
    const sens = this.settings.sensitivity;
    const dz = (v: number) => {
      const a = Math.abs(v);
      if (a < 0.12) return 0;
      const s = Math.sign(v) * ((a - 0.12) / 0.88);
      return s * s * Math.sign(s); // ease-in for fine control near centre
    };
    p.aimYaw -= dz(this.mouse.x) * dt * 2.3 * sens;
    const pitchTarget = THREE.MathUtils.clamp(-dz(this.mouse.y) * 0.75, -0.8, 0.8);
    p.aimPitch = THREE.MathUtils.damp(p.aimPitch, pitchTarget, 6, dt);

    // forward/right from yaw
    const fwd = this._v.set(Math.sin(p.aimYaw), Math.sin(p.aimPitch) * 0.8, Math.cos(p.aimYaw)).normalize();
    const right = this._v2.set(Math.sin(p.aimYaw + Math.PI / 2), 0, Math.cos(p.aimYaw + Math.PI / 2)).normalize();

    let thrust = 0;
    let strafe = 0;
    if (this.keys.has("w")) thrust += 1;
    if (this.keys.has("s")) thrust -= 0.7;
    if (this.keys.has("d")) strafe += 1;
    if (this.keys.has("a")) strafe -= 1;

    p.strafeTilt = THREE.MathUtils.damp(p.strafeTilt, -strafe * 0.5, 8, dt);

    // boost
    const wantBoost = this.keys.has(" ") && p.energy > 1 && thrust >= 0;
    p.boosting = wantBoost;
    p.boostRamp = THREE.MathUtils.damp(p.boostRamp, wantBoost ? 1 : 0, 8, dt);
    if (wantBoost) {
      p.energy = Math.max(0, p.energy - this.stats.boostDrain * dt);
      if (p.energy <= 0) p.boosting = false;
    }

    const base = this.stats.speed * (this.mods.noUpgrades ? 0.92 : 1);
    const maxSpeed = base * (p.boosting ? 2.0 : 1);
    const accel = base * 3.4 * (p.boosting ? 1.7 : 1);

    p.vel.addScaledVector(fwd, thrust * accel * dt);
    p.vel.addScaledVector(right, strafe * accel * 0.85 * dt);
    // drag
    const drag = Math.pow(0.02, dt);
    p.vel.multiplyScalar(drag);
    if (p.vel.length() > maxSpeed) p.vel.setLength(maxSpeed);

    p.pos.addScaledVector(p.vel, dt);
    // clamp to arena (soft bounce)
    (["x", "z"] as const).forEach((ax) => {
      if (p.pos[ax] > ARENA) { p.pos[ax] = ARENA; p.vel[ax] *= -0.3; }
      if (p.pos[ax] < -ARENA) { p.pos[ax] = -ARENA; p.vel[ax] *= -0.3; }
    });
    p.pos.y = THREE.MathUtils.clamp(p.pos.y, -ARENA_Y, ARENA_Y);

    // orientation faces aim, banks on strafe
    const look = new THREE.Matrix4().lookAt(
      new THREE.Vector3(),
      this._v.set(Math.sin(p.aimYaw), Math.sin(p.aimPitch), Math.cos(p.aimYaw)),
      new THREE.Vector3(0, 1, 0),
    );
    this._q.setFromRotationMatrix(look);
    this._q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), p.strafeTilt + Math.sin(this.elapsed * 4) * 0.02));
    p.quat.slerp(this._q, 1 - Math.pow(0.001, dt));

    // weapons
    p.fireCd -= dt;
    p.missileCd -= dt;
    p.empCd -= dt;
    p.empActiveT -= dt;
    p.damageT -= dt;

    this.fireBurst = Math.max(0, this.fireBurst - dt);
    this.missileBurst = Math.max(0, this.missileBurst - dt);
    if (this.firing && p.fireCd <= 0) {
      this.firePulse();
      p.fireCd = 1 / this.stats.fireRate;
    }
    if ((this.missileHeld || this.missileBurst > 0) && p.missileCd <= 0 && p.missiles > 0) {
      this.fireMissile();
      p.missiles -= 1;
      p.missileCd = 0.55;
      this.missileBurst = 0;
    }
    if (this.keys.has("e") && p.empCd <= 0 && p.energy >= 25) {
      this.fireEmp();
    }

    // regen
    p.regenLock -= dt;
    if (p.regenLock <= 0 && p.shield < p.shieldMax) {
      p.shield = Math.min(p.shieldMax, p.shield + p.shieldMax * 0.35 * dt);
    }
    if (!p.boosting) {
      p.energy = Math.min(p.energyMax, p.energy + p.energyMax * 0.18 * dt);
    }

    // reach-mission progress: fly "forward" (−z world) toward the portal
    if (this.mission.objective.kind === "reach") {
      const goal = 1;
      const speedFrac = THREE.MathUtils.clamp((thrust > 0 ? p.vel.length() : 0) / (base * 1.4), 0, 1);
      this.world.reachProgress = Math.min(
        goal,
        this.world.reachProgress + speedFrac * dt * 0.028,
      );
      if (this.world.reachProgress >= goal && !this.objectiveDone) {
        this.completeObjective();
      }
    }
  }

  private firePulse() {
    const p = this.world.player;
    const dir = this._v.set(Math.sin(p.aimYaw), Math.sin(p.aimPitch), Math.cos(p.aimYaw)).normalize();
    // soft aim assist: bend up to ~6° toward a locked target
    if (this.settings.targetAssist && this.lockedTargetId) {
      const e = this.world.enemies.find((x) => x.id === this.lockedTargetId && x.alive);
      if (e) {
        const to = this._v2.copy(e.pos).sub(p.pos).normalize();
        dir.lerp(to, 0.72).normalize();
      }
    }
    const crit = Math.random() < this.stats.critChance;
    const dmg = this.stats.damage * (this.mods.glassCannon ? 2 : 1) * (crit ? 2.4 : 1) * (this.mods.noUpgrades ? 0.85 : 1);
    for (const off of [-0.5, 0.5]) {
      const b = this.world.pBullets.find((x) => !x.active);
      if (!b) break;
      b.active = true;
      b.from = "player";
      b.pos.copy(p.pos).addScaledVector(this._v2.set(Math.sin(p.aimYaw + Math.PI / 2), 0, Math.cos(p.aimYaw + Math.PI / 2)), off);
      b.vel.copy(dir).multiplyScalar(140);
      b.life = 1.4;
      b.damage = dmg;
      b.crit = crit;
      b.radius = 0.6;
      b.colour = crit ? "#a3e635" : "#22d3ee";
    }
    this.shotsFired += 1;
    this.spawnFx(p.pos, "muzzle", 0.09, 1.4, "#22d3ee");
    this.onEvent({ type: "sfx", name: "shoot" });
  }

  private fireMissile() {
    const p = this.world.player;
    const m = this.world.missiles.find((x) => !x.active);
    if (!m) return;
    const dir = this._v.set(Math.sin(p.aimYaw), Math.sin(p.aimPitch), Math.cos(p.aimYaw)).normalize();
    m.active = true;
    m.pos.copy(p.pos);
    m.vel.copy(dir).multiplyScalar(40);
    m.life = 4.5;
    m.damage = this.stats.missileDamage * (this.mods.glassCannon ? 2 : 1);
    m.tracking = 4.5;
    m.targetId = this.pickMissileTarget();
    this.onEvent({ type: "sfx", name: "missile" });
  }

  private pickMissileTarget(): number | null {
    const p = this.world.player;
    let best: number | null = null;
    let bestD = Infinity;
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(p.pos);
      if (d < bestD) { bestD = d; best = e.id; }
    }
    if (this.world.boss && this.world.boss.targetable) {
      const d = this.world.boss.pos.distanceTo(p.pos);
      if (d < bestD) best = -1; // boss sentinel
    }
    return best;
  }

  private fireEmp() {
    const p = this.world.player;
    p.energy -= 25;
    p.empCd = this.stats.empCooldown;
    p.empActiveT = 0.5;
    const dur = this.stats.empStrength;
    const radius = 34;
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      if (e.pos.distanceTo(p.pos) <= radius) {
        e.disabledT = Math.max(e.disabledT, dur);
        e.slowT = dur + 2;
        e.charging = false;
        e.chargeT = 0;
      }
    }
    for (const b of this.world.eBullets) {
      if (b.active && b.pos.distanceTo(p.pos) <= radius) b.active = false;
    }
    if (this.world.boss) this.world.boss.onEmp?.(dur * 0.5);
    this.spawnFx(p.pos, "emp", 0.6, radius, "#8b5cf6");
    this.world.camPunch = Math.min(1, this.world.camPunch + 0.4);
    this.onEvent({ type: "sfx", name: "emp" });
    this.onEvent({ type: "flash", colour: "#8b5cf6" });
  }

  // ---------------------------------------------------------------- enemies
  private updateEnemies(dt: number) {
    const p = this.world.player;
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      e.spawnT = Math.min(1, e.spawnT + dt * 2);
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
      e.wobble += dt;

      if (e.disabledT > 0) {
        e.disabledT -= dt;
        e.vel.multiplyScalar(Math.pow(0.1, dt));
        e.pos.addScaledVector(e.vel, dt);
        continue;
      }
      const slow = e.slowT > 0 ? 0.45 : 1;
      if (e.slowT > 0) e.slowT -= dt;

      const toPlayer = this._v.copy(p.pos).sub(e.pos);
      const dist = toPlayer.length();
      toPlayer.normalize();
      const desired = this._v2.set(0, 0, 0);

      switch (e.behaviour) {
        case "pursue":
          desired.copy(toPlayer).multiplyScalar(e.speed);
          desired.y += Math.sin(e.wobble * 2) * 2;
          break;
        case "strafe": {
          const tangent = this._v2.set(-toPlayer.z, 0, toPlayer.x).multiplyScalar(e.strafeDir);
          desired.copy(toPlayer).multiplyScalar(dist > 26 ? e.speed : 0).addScaledVector(tangent, e.speed * 0.9);
          if (Math.random() < 0.01) e.strafeDir *= -1;
          break;
        }
        case "flank": {
          const tangent = this._v2.set(-toPlayer.z, 0, toPlayer.x).multiplyScalar(e.strafeDir);
          const ring = dist > 30 ? 1 : dist < 18 ? -1 : 0;
          desired.copy(toPlayer).multiplyScalar(ring * e.speed).addScaledVector(tangent, e.speed);
          break;
        }
        case "keepDistance":
          desired.copy(toPlayer).multiplyScalar((dist > 38 ? 1 : dist < 30 ? -1 : 0) * e.speed);
          break;
        case "sniper":
          desired.copy(toPlayer).multiplyScalar((dist > 70 ? 1 : dist < 55 ? -1 : 0) * e.speed);
          desired.x += Math.sin(e.wobble) * 3;
          break;
        case "hunter": {
          const tangent = this._v2.set(-toPlayer.z, 0, toPlayer.x).multiplyScalar(e.strafeDir);
          desired.copy(toPlayer).multiplyScalar((dist > 24 ? 1 : -0.5) * e.speed).addScaledVector(tangent, e.speed * 0.7);
          break;
        }
      }

      e.vel.lerp(desired.multiplyScalar(slow), 1 - Math.pow(0.05, dt));
      e.pos.addScaledVector(e.vel, dt);
      e.pos.x = THREE.MathUtils.clamp(e.pos.x, -ARENA, ARENA);
      e.pos.z = THREE.MathUtils.clamp(e.pos.z, -ARENA, ARENA);
      e.pos.y = THREE.MathUtils.clamp(e.pos.y, -14, 14);

      // firing
      e.fireCd -= dt;
      const canSee = dist <= e.range;
      if (e.kind === "sniper") {
        if (canSee && !e.charging && e.fireCd <= 0) {
          e.charging = true;
          e.chargeT = 0;
          this.pushWarning("sniper-" + e.id, "LASER LOCK", "danger");
          this.onEvent({ type: "sfx", name: "warn" });
        }
        if (e.charging) {
          e.chargeT += dt;
          if (e.chargeT >= 1.6) {
            e.charging = false;
            e.fireCd = 1 / e.fireRate;
            this.clearWarning("sniper-" + e.id);
            this.enemyShoot(e, p.pos, 220, true);
          }
        }
      } else if (canSee && e.fireCd <= 0) {
        e.fireCd = 1 / e.fireRate + Math.random() * 0.2;
        this.enemyShoot(e, p.pos, e.kind === "interceptor" ? 90 : 70, false);
      }
    }
  }

  private enemyShoot(e: Enemy, target: THREE.Vector3, speed: number, heavy: boolean) {
    const b = this.world.eBullets.find((x) => !x.active);
    if (!b) return;
    const dir = this._v.copy(target).sub(e.pos).normalize();
    // slight lead + inaccuracy
    dir.x += (Math.random() - 0.5) * (heavy ? 0.02 : 0.1);
    dir.y += (Math.random() - 0.5) * (heavy ? 0.02 : 0.1);
    dir.normalize();
    b.active = true;
    b.from = "enemy";
    b.pos.copy(e.pos);
    b.vel.copy(dir).multiplyScalar(speed);
    b.life = heavy ? 2.2 : 3;
    b.damage = e.damage * (heavy ? 1 : 1);
    b.radius = heavy ? 1.1 : 0.55;
    b.colour = heavy ? "#f87171" : e.colour;
    this.onEvent({ type: "sfx", name: heavy ? "warn" : "shoot" });
  }

  // ---------------------------------------------------------------- projectiles
  private updateBullets(dt: number) {
    for (const b of this.world.pBullets) {
      if (!b.active) continue;
      b.pos.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.life <= 0 || outside(b.pos)) { b.active = false; continue; }
      // vs enemies
      for (const e of this.world.enemies) {
        if (!e.alive) continue;
        if (b.pos.distanceTo(e.pos) <= e.radius + b.radius) {
          this.hitEnemy(e, b.damage, b.crit, b.pos);
          b.active = false;
          break;
        }
      }
      if (!b.active) continue;
      // vs boss
      if (this.world.boss && this.world.boss.hitTest(b.pos, b.radius)) {
        this.world.boss.takeHit(b.damage, b.crit, b.pos, (dmg, part) => this.onBossHit(dmg, part));
        this.shotsHit += 1;
        this.spawnFx(b.pos, b.crit ? "hit" : "hit", 0.2, b.crit ? 2 : 1.2, b.colour);
        b.active = false;
        continue;
      }
      // vs asteroid
      for (const a of this.world.asteroids) {
        if (b.pos.distanceTo(a.pos) <= a.radius) { b.active = false; this.spawnFx(b.pos, "hit", 0.15, 0.8, "#9ca3af"); break; }
      }
    }

    for (const b of this.world.eBullets) {
      if (!b.active) continue;
      b.pos.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.life <= 0 || outside(b.pos)) { b.active = false; continue; }
      const p = this.world.player;
      if (p.alive && b.pos.distanceTo(p.pos) <= 1.7 + b.radius) {
        this.damagePlayer(b.damage, b.pos);
        b.active = false;
        continue;
      }
      for (const a of this.world.asteroids) {
        if (b.pos.distanceTo(a.pos) <= a.radius) { b.active = false; break; }
      }
    }
  }

  private updateMissiles(dt: number) {
    for (const m of this.world.missiles) {
      if (!m.active) continue;
      m.life -= dt;
      m.tracking -= dt;
      // reacquire
      let targetPos: THREE.Vector3 | null = null;
      if (m.targetId === -1 && this.world.boss?.targetable) targetPos = this.world.boss.pos;
      else {
        const e = this.world.enemies.find((x) => x.id === m.targetId && x.alive);
        if (e) targetPos = e.pos;
        else m.targetId = this.pickMissileTarget();
      }
      if (targetPos && m.tracking > 0) {
        const want = this._v.copy(targetPos).sub(m.pos).normalize().multiplyScalar(70);
        m.vel.lerp(want, 1 - Math.pow(0.04, dt));
      }
      if (m.vel.length() < 70) m.vel.setLength(Math.min(70, m.vel.length() + 90 * dt));
      m.pos.addScaledVector(m.vel, dt);

      let hit = false;
      for (const e of this.world.enemies) {
        if (!e.alive) continue;
        if (m.pos.distanceTo(e.pos) <= e.radius + 1.4) { hit = true; break; }
      }
      if (!hit && this.world.boss?.hitTest(m.pos, 1.6)) {
        this.world.boss.takeHit(m.damage, false, m.pos, (dmg, part) => this.onBossHit(dmg, part));
        hit = true;
      }
      if (hit || m.life <= 0 || outside(m.pos)) {
        if (hit || m.life <= 0) this.explode(m.pos, m.damage, 9, "#f472b6");
        m.active = false;
      }
    }
  }

  private explode(pos: THREE.Vector3, dmg: number, radius: number, colour: string) {
    this.spawnFx(pos, "explosion", 0.5, radius * 0.5, colour);
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(pos);
      if (d <= radius) this.hitEnemy(e, dmg * (1 - d / radius / 1.6), false, e.pos);
    }
    this.onEvent({ type: "sfx", name: "explosion" });
    this.world.camPunch = Math.min(1, this.world.camPunch + 0.25);
  }

  // ---------------------------------------------------------------- damage
  private hitEnemy(e: Enemy, dmg: number, crit: boolean, at: THREE.Vector3) {
    e.hull -= dmg;
    e.hitFlash = 1;
    this.shotsHit += 1;
    this.spawnFx(at, "hit", crit ? 0.22 : 0.16, crit ? 2.2 : 1.2, crit ? "#a3e635" : "#22d3ee");
    if (crit) this.onEvent({ type: "toast", toast: { text: "CRITICAL", kind: "crit" } });
    if (e.hull <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    e.alive = false;
    this.clearWarning("sniper-" + e.id);
    this.kills += 1;
    this.combo += 1;
    this.comboT = this.comboRefresh();
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const mult = 1 + Math.min(this.combo, 40) * 0.06;
    const gained = Math.round(e.score * mult);
    this.score += gained;
    this.explode(e.pos, 0, e.radius * 1.6, e.colour);
    this.spawnFx(e.pos, "big", 0.6, e.radius * 1.4, e.colour);
    this.onEvent({ type: "sfx", name: "explosion" });
    this.onEvent({ type: "kill", kind: e.kind, score: gained, crit: false });
    this.onEvent({ type: "toast", toast: { text: `+${gained}`, kind: "kill" } });

    // drops
    this.maybeDrop(e);

    // objective progress
    if (this.mission.objective.kind === "destroyCount") {
      const done = this.kills;
      if (done >= this.killTarget && !this.objectiveDone) this.completeObjective();
    }
  }

  private comboRefresh() {
    return this.combo >= 20 ? 2.2 : this.combo >= 8 ? 3 : 4;
  }

  private maybeDrop(e: Enemy) {
    const roll = Math.random();
    const p = this.world.pickups.find((x) => !x.active);
    if (!p) return;
    let kind: PickupKind | null = null;
    let value = 0;
    if (e.kind === "tanker" || e.kind === "guardian") {
      kind = "credits"; value = e.credits;
    } else if (roll < 0.14) { kind = "energy"; value = 30; }
    else if (roll < 0.24) { kind = "shield"; value = 25; }
    else if (roll < 0.30 && this.world.player.hull < this.world.player.hullMax * 0.6) { kind = "hull"; value = 20; }
    else if (roll < 0.40) { kind = "credits"; value = e.credits; }
    else if (roll < 0.46 && this.world.player.missiles < this.world.player.missilesMax) { kind = "missile"; value = 1; }
    if (!kind) return;
    p.active = true;
    p.kind = kind;
    p.value = value;
    p.pos.copy(e.pos);
    p.vel.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4);
    p.life = 14;
  }

  private damagePlayer(dmg: number, at: THREE.Vector3) {
    const p = this.world.player;
    if (!p.alive) return;
    const finalDmg = dmg * (this.mods.glassCannon ? 2 : 1);
    p.regenLock = 3;
    p.damageT = 0.3;
    this.world.camShake = Math.min(1, this.world.camShake + Math.min(0.5, finalDmg / 40) * this.settings.cameraShake);
    if (p.shield > 0) {
      const absorbed = Math.min(p.shield, finalDmg);
      p.shield -= absorbed;
      const leak = finalDmg - absorbed;
      this.spawnFx(at, "shield", 0.25, 2.4, "#22d3ee");
      this.onEvent({ type: "sfx", name: "shieldHit" });
      if (p.shield <= 0) this.shieldLost = true;
      if (leak > 0) this.applyHull(leak, at);
    } else {
      this.applyHull(finalDmg, at);
    }
  }

  private applyHull(dmg: number, at: THREE.Vector3) {
    const p = this.world.player;
    p.hull -= dmg;
    this.hullDamageTaken += dmg / p.hullMax;
    this.spawnFx(at, "hit", 0.2, 1.6, "#f87171");
    this.onEvent({ type: "sfx", name: "hullHit" });
    if (this.settings.screenFlash) this.onEvent({ type: "flash", colour: "#ef4444" });
    if (p.hull <= p.hullMax * 0.25 && p.hull > 0) {
      this.pushWarning("critical", "CRITICAL DAMAGE", "danger");
      this.onEvent({ type: "hull-critical" });
    }
    if (p.hull <= 0 && p.alive) this.destroyPlayer();
  }

  private destroyPlayer() {
    const p = this.world.player;
    p.hull = 0;
    p.alive = false;
    this.spawnFx(p.pos, "big", 1.2, 5, "#f97316");
    this.explode(p.pos, 0, 6, "#f97316");
    this.world.camShake = 1;
    this.onEvent({ type: "sfx", name: "bigExplosion" });
    this.finish("destroyed");
  }

  private onBossHit(dmg: number, part: string) {
    void dmg;
    void part;
    this.shotsHit += 1;
  }

  // ---------------------------------------------------------------- pickups & asteroids
  private updatePickups(dt: number) {
    const p = this.world.player;
    for (const pk of this.world.pickups) {
      if (!pk.active) continue;
      pk.life -= dt;
      pk.vel.multiplyScalar(Math.pow(0.2, dt));
      pk.pos.addScaledVector(pk.vel, dt);
      pk.pos.y += Math.sin(this.elapsed * 3 + pk.pos.x) * dt * 0.4;
      const d = pk.pos.distanceTo(p.pos);
      if (d < 14) pk.pos.lerp(p.pos, 1 - Math.pow(0.2, dt)); // magnet
      if (d < 2.2 || pk.life <= 0) {
        if (d < 2.2) this.collect(pk);
        pk.active = false;
      }
    }
  }

  private collect(pk: Pickup) {
    const p = this.world.player;
    switch (pk.kind) {
      case "energy": p.energy = Math.min(p.energyMax, p.energy + pk.value); break;
      case "shield": p.shield = Math.min(p.shieldMax, p.shield + pk.value); break;
      case "hull": p.hull = Math.min(p.hullMax, p.hull + pk.value); if (p.hull > p.hullMax * 0.25) this.clearWarning("critical"); break;
      case "missile": p.missiles = Math.min(p.missilesMax, p.missiles + pk.value); break;
      case "credits": this.score += pk.value * 2; this.onEvent({ type: "toast", toast: { text: `+${pk.value}c`, kind: "reward" } }); break;
      case "combo": this.comboT = this.comboRefresh() + 1; break;
    }
    this.spawnFx(pk.pos, "pickup", 0.3, 1.4, "#a3e635");
    this.onEvent({ type: "sfx", name: "pickup" });
  }

  private updateAsteroids(dt: number) {
    const p = this.world.player;
    for (const a of this.world.asteroids) {
      a.pos.addScaledVector(a.vel, dt);
      a.rot.x += a.spin.x * dt;
      a.rot.y += a.spin.y * dt;
      // wrap
      (["x", "z"] as const).forEach((ax) => {
        if (a.pos[ax] > ARENA + 6) a.pos[ax] = -ARENA - 6;
        if (a.pos[ax] < -ARENA - 6) a.pos[ax] = ARENA + 6;
      });
      if (p.alive && a.pos.distanceTo(p.pos) < a.radius + 1.6) {
        const push = this._v.copy(p.pos).sub(a.pos).normalize();
        p.pos.addScaledVector(push, a.radius + 1.6 - a.pos.distanceTo(p.pos));
        p.vel.addScaledVector(push, 12);
        this.damagePlayer(a.meteor ? 22 : 14, p.pos);
      }
    }
    // meteors
    if (ENVIRONMENTS[this.mission.environment].meteors && Math.random() < dt * 0.7) {
      const a = Math.random() * Math.PI * 2;
      this.world.asteroids.push({
        pos: new THREE.Vector3(Math.cos(a) * (ARENA + 4), (Math.random() - 0.5) * 12, Math.sin(a) * (ARENA + 4)),
        vel: new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(18 + Math.random() * 12),
        radius: 1.2 + Math.random() * 2.4,
        spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
        rot: new THREE.Euler(),
        meteor: true,
      });
      if (this.world.asteroids.length > 80) this.world.asteroids.shift();
    }
  }

  // ---------------------------------------------------------------- fx
  private spawnFx(pos: THREE.Vector3, kind: FX["kind"], maxLife: number, scale: number, colour: string) {
    if (this.settings.quality === "low" && (kind === "hit" || kind === "muzzle") && Math.random() < 0.4) return;
    const f = this.world.fx.find((x) => !x.active);
    if (!f) return;
    f.active = true;
    f.pos.copy(pos);
    f.kind = kind;
    f.life = maxLife;
    f.maxLife = maxLife;
    f.scale = scale;
    f.colour = colour;
  }

  private updateFx(dt: number) {
    for (const f of this.world.fx) {
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) f.active = false;
    }
    this.world.camShake = Math.max(0, this.world.camShake - dt * 2.4);
    this.world.camPunch = Math.max(0, this.world.camPunch - dt * 3);
  }

  // ---------------------------------------------------------------- objective / end
  private completeObjective() {
    if (this.objectiveDone) return;
    this.objectiveDone = true;
    this.onEvent({ type: "objective-complete" });
    this.onEvent({ type: "sfx", name: "objective" });
    this.onEvent({ type: "toast", toast: { text: "OBJECTIVE COMPLETE", kind: "objective" } });
    const k = this.mission.objective.kind;
    if (k === "destroyCount" || k === "reach" || k === "survive") {
      this.finish("complete");
    }
  }

  private checkObjective() {
    if (this.ended) return;
    const k = this.mission.objective.kind;
    if (k === "destroyAll") {
      if (this.waveIndex >= this.mission.waves.length && this.world.enemies.every((e) => !e.alive)) {
        this.completeObjective();
        this.finish("complete");
      }
    } else if (k === "survive") {
      const secs = this.mission.objective.seconds ?? 90;
      if (this.elapsed >= secs) this.completeObjective();
    } else if (k === "boss") {
      if (this.world.boss?.dead) {
        this.completeObjective();
        this.finish("complete");
      }
      if (this.world.boss?.missionFailed) this.finish("timeout");
    }
  }

  private finish(reason: "complete" | "destroyed" | "timeout") {
    if (this.ended) return;
    this.ended = reason;
    const success = reason === "complete";
    const accuracy = this.shotsFired > 0 ? THREE.MathUtils.clamp(this.shotsHit / this.shotsFired, 0, 1) : 0;
    const rank = this.computeRank(accuracy);
    const baseC = this.mission.reward.credits;
    const baseX = this.mission.reward.xp;
    const scoreBonusC = Math.round(this.score / 22);
    const result: MissionResult = {
      missionId: this.mission.id,
      success,
      score: this.score,
      rank,
      accuracy,
      kills: this.kills,
      maxCombo: this.maxCombo,
      timeSeconds: Math.round(this.elapsed),
      hullDamageTaken: THREE.MathUtils.clamp(this.hullDamageTaken, 0, 1),
      shieldLost: this.shieldLost,
      credits: success ? baseC + scoreBonusC : Math.round(scoreBonusC * 0.35),
      xp: success ? baseX + Math.round(this.score / 40) : Math.round(this.score / 120),
      optionalCleared: [],
      reason,
    };
    if (success) {
      for (const opt of this.mission.optional) {
        if (opt.test(result)) {
          result.optionalCleared.push(opt.id);
          result.credits += opt.credits;
          result.xp += opt.xp;
        }
      }
    }
    this.endResult = result;
    this.onEvent({ type: success ? "mission-complete" : "mission-failed", result });
    this.onEvent({ type: "sfx", name: success ? "win" : "fail" });
  }

  private computeRank(accuracy: number): Rank {
    let pts = 0;
    pts += Math.min(3, this.score / 6000);
    pts += accuracy * 2;
    pts += Math.min(1.6, this.maxCombo / 20);
    pts += (1 - THREE.MathUtils.clamp(this.hullDamageTaken, 0, 1)) * 2;
    const timeBudget = this.mission.objective.seconds ?? 180;
    pts += THREE.MathUtils.clamp(1 - this.elapsed / (timeBudget * 1.6), 0, 1);
    const idx = THREE.MathUtils.clamp(Math.floor(pts / 1.55), 0, RANKS.length - 1);
    return RANKS[idx];
  }

  // ---------------------------------------------------------------- warnings / toasts
  private pushWarning(id: string, label: string, kind: "danger" | "info") {
    if (this.warnings.find((w) => w.id === id)) return;
    this.warnings.push({ id, label, kind });
  }
  private clearWarning(id: string) {
    this.warnings = this.warnings.filter((w) => w.id !== id);
  }

  pushToast(t: Omit<Toast, "id" | "born">) {
    this.toasts.push({ ...t, id: nid(), born: this.elapsed });
    if (this.toasts.length > 6) this.toasts.shift();
  }

  // ---------------------------------------------------------------- main tick
  tick(dtRaw: number, fps: number) {
    if (this.ended && this.endResult) {
      // let explosions play out, but freeze sim
      this.updateFx(dtRaw);
      return;
    }
    const dt = Math.min(0.05, dtRaw);
    this.elapsed += dt;
    this.world.time = this.elapsed;
    this.fpsSmooth = this.fpsSmooth * 0.9 + fps * 0.1;

    // combo decay
    if (this.combo > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        this.combo = Math.max(0, this.combo - 1);
        this.comboT = this.comboRefresh();
      }
    }

    this.runWaves(dt);
    this.updatePlayer(dt);
    this.updateEnemies(dt);

    // boss lifecycle
    const bo = this.mission.objective;
    if (bo.kind === "boss" && bo.boss && !this.world.boss && this.elapsed > 2) {
      this.world.boss = createBoss(bo.boss, this.world.player, this.difficulty, {
        spawnEnemy: (k) => this.spawnEnemy(k),
        enemyBullet: (pos, dir, speed, dmg, radius, colour) => this.bossBullet(pos, dir, speed, dmg, radius, colour),
        fx: (pos, kind, life, scale, colour) => this.spawnFx(pos, kind, life, scale, colour),
        shake: (v) => { this.world.camShake = Math.min(1, this.world.camShake + v * this.settings.cameraShake); },
        sfx: (n) => this.onEvent({ type: "sfx", name: n }),
        warn: (id, label) => this.pushWarning(id, label, "danger"),
        clearWarn: (id) => this.clearWarning(id),
        toast: (text) => this.pushToast({ text, kind: "objective" }),
        setCountdown: (v) => { this.countdown = v; },
        damagePlayer: (d, at) => this.damagePlayer(d, at),
      });
      this.onEvent({ type: "boss-start", name: this.world.boss.name });
    }
    if (this.world.boss) {
      this.world.boss.update(dt, (phase) => this.onEvent({ type: "boss-phase", phase }));
      this.countdown = this.world.boss.countdown ?? this.countdown;
    }

    this.updateBullets(dt);
    this.updateMissiles(dt);
    this.updatePickups(dt);
    this.updateAsteroids(dt);
    this.updateFx(dt);

    // cull dead enemies (keep a couple frames for fx handled elsewhere)
    if (this.world.enemies.length > 0) {
      this.world.enemies = this.world.enemies.filter((e) => e.alive || false);
    }

    this.checkObjective();

    // target lock (soft assist: nearest enemy within a cone)
    this.updateLock();

    // critical warning maintenance
    const p = this.world.player;
    if (p.alive && p.hull > p.hullMax * 0.25) this.clearWarning("critical");
  }

  private bossBullet(
    pos: THREE.Vector3, dir: THREE.Vector3, speed: number, dmg: number, radius: number, colour: string,
  ) {
    const b = this.world.eBullets.find((x) => !x.active);
    if (!b) return;
    b.active = true;
    b.from = "boss";
    b.pos.copy(pos);
    b.vel.copy(dir).normalize().multiplyScalar(speed);
    b.life = 4;
    b.damage = dmg * (this.mods.glassCannon ? 2 : 1);
    b.radius = radius;
    b.colour = colour;
  }

  private updateLock() {
    const p = this.world.player;
    const dir = this._v.set(Math.sin(p.aimYaw), Math.sin(p.aimPitch), Math.cos(p.aimYaw)).normalize();
    let best: Enemy | null = null;
    let bestDot = this.settings.targetAssist ? 0.9 : 0.965;
    for (const e of this.world.enemies) {
      if (!e.alive) continue;
      const to = this._v2.copy(e.pos).sub(p.pos);
      const d = to.length();
      if (d > 160) continue;
      to.normalize();
      const dot = to.dot(dir);
      if (dot > bestDot) { bestDot = dot; best = e; }
    }
    this.lockedTargetId = best ? best.id : null;
  }

  // ---------------------------------------------------------------- HUD snapshot
  snapshot(): HudSnapshot {
    const p = this.world.player;
    const obj = this.mission.objective;
    let progress = "";
    if (obj.kind === "destroyCount") progress = `${Math.min(this.kills, this.killTarget)} / ${this.killTarget}`;
    else if (obj.kind === "destroyAll") {
      const remaining = this.world.enemies.filter((e) => e.alive).length + (this.mission.waves.length - this.waveIndex);
      progress = this.objectiveDone ? "CLEAR" : `${remaining} hostile${remaining === 1 ? "" : "s"}`;
    } else if (obj.kind === "survive") {
      const left = Math.max(0, (obj.seconds ?? 90) - this.elapsed);
      progress = `${Math.ceil(left)}s`;
    } else if (obj.kind === "reach") {
      progress = `${Math.round(this.world.reachProgress * 100)}%`;
    } else if (obj.kind === "boss") {
      progress = this.world.boss ? `${Math.round((this.world.boss.hull / this.world.boss.hullMax) * 100)}%` : "INBOUND";
    }

    let missionTimer: number | null = null;
    if (obj.kind === "survive") missionTimer = Math.max(0, (obj.seconds ?? 90) - this.elapsed);

    const target = this.lockedTargetId
      ? (() => {
          const e = this.world.enemies.find((x) => x.id === this.lockedTargetId && x.alive);
          if (!e) return null;
          return { name: e.name, hull: Math.max(0, e.hull), hullMax: e.hullMax, distance: e.pos.distanceTo(p.pos) };
        })()
      : null;

    const boss = this.world.boss
      ? {
          name: this.world.boss.name,
          phase: this.world.boss.phase,
          hull: Math.max(0, this.world.boss.hull),
          hullMax: this.world.boss.hullMax,
          invulnerable: this.world.boss.invulnerable,
          subLabel: this.world.boss.subLabel,
        }
      : null;

    const toasts = this.toasts.filter((t) => this.elapsed - t.born < 1.6);

    return {
      hull: Math.max(0, p.hull), hullMax: p.hullMax,
      shield: Math.max(0, p.shield), shieldMax: p.shieldMax,
      energy: Math.max(0, p.energy), energyMax: p.energyMax,
      missiles: p.missiles, missilesMax: p.missilesMax,
      empReady: THREE.MathUtils.clamp(1 - p.empCd / this.stats.empCooldown, 0, 1),
      boosting: p.boosting,
      score: this.score,
      combo: this.combo,
      comboTimer: THREE.MathUtils.clamp(this.comboT / this.comboRefresh(), 0, 1),
      objectiveLabel: obj.label,
      objectiveProgress: progress,
      objectiveDone: this.objectiveDone,
      missionName: this.mission.name,
      missionTimer,
      warnings: [...this.warnings],
      target,
      boss,
      toasts,
      critical: p.alive && p.hull <= p.hullMax * 0.25,
      countdown: this.countdown,
      fps: Math.round(this.fpsSmooth),
    };
  }

  get result(): MissionResult | null {
    return this.endResult;
  }
  get isEnded() {
    return this.ended !== null;
  }

  dispose() {
    this.world.enemies.length = 0;
    this.world.asteroids.length = 0;
    this.keys.clear();
  }
}

function outside(v: THREE.Vector3) {
  return Math.abs(v.x) > ARENA + 30 || Math.abs(v.z) > ARENA + 30 || Math.abs(v.y) > 60;
}
