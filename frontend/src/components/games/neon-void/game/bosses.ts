/* ============================================================
   NEON VOID — boss framework + the three Rift bosses.
   Bosses are self-contained state machines the engine drives
   each tick. They talk back to the world through `Hooks`.
   ============================================================ */

import * as THREE from "three";
import type { BossId, EnemyKind } from "./types";
import type { PlayerState } from "./engine";
import type { AudioEngine } from "./audio";

export interface BossHooks {
  spawnEnemy: (kind: EnemyKind) => void;
  enemyBullet: (
    pos: THREE.Vector3,
    dir: THREE.Vector3,
    speed: number,
    dmg: number,
    radius: number,
    colour: string,
  ) => void;
  fx: (
    pos: THREE.Vector3,
    kind: "explosion" | "big" | "hit" | "shield" | "muzzle" | "emp" | "pickup" | "debris",
    life: number,
    scale: number,
    colour: string,
  ) => void;
  shake: (v: number) => void;
  sfx: (n: Parameters<AudioEngine["play"]>[0]) => void;
  warn: (id: string, label: string) => void;
  clearWarn: (id: string) => void;
  toast: (text: string) => void;
  setCountdown: (v: number | null) => void;
  damagePlayer: (dmg: number, at: THREE.Vector3) => void;
}

export interface Generator {
  pos: THREE.Vector3;
  hull: number;
  hullMax: number;
  alive: boolean;
  angle: number;
}

export interface Boss {
  id: BossId;
  name: string;
  pos: THREE.Vector3;
  hull: number;
  hullMax: number;
  phase: number;
  invulnerable: boolean;
  targetable: boolean;
  dead: boolean;
  missionFailed: boolean;
  subLabel: string | null;
  countdown: number | null;
  generators: Generator[];
  nodes: Generator[];
  quat: THREE.Quaternion;
  hitFlash: number;
  update: (dt: number, onPhase: (p: number) => void) => void;
  hitTest: (pos: THREE.Vector3, radius: number) => boolean;
  takeHit: (
    dmg: number,
    crit: boolean,
    at: THREE.Vector3,
    onHit: (dmg: number, part: string) => void,
  ) => void;
  onEmp?: (dur: number) => void;
}

export function createBoss(
  id: BossId,
  player: PlayerState,
  difficulty: number,
  h: BossHooks,
): Boss {
  if (id === "void-reaper") return voidReaper(player, difficulty, h);
  if (id === "rift-guardian") return riftGuardian(player, difficulty, h);
  return riftCore(player, difficulty, h);
}

// ------------------------------------------------------------------ shared
function ring(center: THREE.Vector3, count: number, radius: number, y = 0): THREE.Vector3[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return new THREE.Vector3(center.x + Math.cos(a) * radius, center.y + y, center.z + Math.sin(a) * radius);
  });
}

// ================================================================ VOID REAPER
function voidReaper(player: PlayerState, diff: number, h: BossHooks): Boss {
  const hullMax = 2600 * diff;
  const b: Boss = {
    id: "void-reaper",
    name: "VOID REAPER",
    pos: new THREE.Vector3(0, 4, -46),
    hull: hullMax,
    hullMax,
    phase: 1,
    invulnerable: false,
    targetable: true,
    dead: false,
    missionFailed: false,
    subLabel: null,
    countdown: null,
    generators: [],
    nodes: [],
    quat: new THREE.Quaternion(),
    hitFlash: 0,
    update: () => {},
    hitTest: (pos, radius) => pos.distanceTo(b.pos) <= 6.5 + radius,
    takeHit: () => {},
  };

  let fireCd = 1.4;
  let missileCd = 3;
  let sweepT = 0;
  let phase2Started = false;
  let empT = 0;

  b.onEmp = (d) => { empT = d; };

  b.takeHit = (dmg, crit, at, onHit) => {
    if (b.invulnerable) {
      h.fx(at, "shield", 0.2, 3, "#8b5cf6");
      return;
    }
    b.hull = Math.max(0, b.hull - dmg * (crit ? 1.15 : 1));
    b.hitFlash = 1;
    h.fx(at, "hit", 0.18, crit ? 2.4 : 1.4, "#c084fc");
    onHit(dmg, "core");
    if (b.hull <= 0 && !b.dead) {
      b.dead = true;
      b.targetable = false;
      h.toast("VOID REAPER DESTROYED");
      h.sfx("bigExplosion");
      for (let i = 0; i < 14; i++)
        setTimeout(() => h.fx(b.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 10)), "big", 0.8, 4, "#f97316"), i * 90);
      h.shake(1);
    }
  };

  b.update = (dt, onPhase) => {
    if (b.dead) return;
    b.hitFlash = Math.max(0, b.hitFlash - dt * 3);
    if (empT > 0) { empT -= dt; return; }

    // slow chase, keep ~34u
    const to = player.pos.clone().sub(b.pos);
    const d = to.length();
    to.normalize();
    const want = d > 40 ? 8 : d < 28 ? -5 : 0;
    b.pos.addScaledVector(to, want * dt);
    b.pos.y = THREE.MathUtils.clamp(THREE.MathUtils.lerp(b.pos.y, player.pos.y + 2, dt * 0.5), -6, 10);
    const look = new THREE.Matrix4().lookAt(b.pos, player.pos, new THREE.Vector3(0, 1, 0));
    b.quat.slerp(new THREE.Quaternion().setFromRotationMatrix(look), 1 - Math.pow(0.02, dt));

    const hpFrac = b.hull / b.hullMax;

    // phase transitions
    if (hpFrac <= 0.6 && b.phase === 1) {
      b.phase = 2;
      onPhase(2);
      b.invulnerable = true;
      b.subLabel = "SHIELD GENERATORS ONLINE";
      h.toast("DESTROY THE SHIELD GENERATORS");
      b.generators = ring(b.pos, 4, 12, 0).map((p, i) => ({
        pos: p, hull: 260 * diff, hullMax: 260 * diff, alive: true, angle: (i / 4) * Math.PI * 2,
      }));
      phase2Started = true;
      h.sfx("warn");
    }
    if (hpFrac <= 0.25 && b.phase === 2 && !b.invulnerable && b.generators.every((g) => !g.alive)) {
      b.phase = 3;
      onPhase(3);
      b.subLabel = "REACTOR EXPOSED";
      h.toast("CORE EXPOSED — FINISH IT");
    }

    // generators
    if (phase2Started && b.generators.some((g) => g.alive)) {
      for (const g of b.generators) {
        if (!g.alive) continue;
        g.angle += dt * 0.8;
        g.pos.set(
          b.pos.x + Math.cos(g.angle) * 12,
          b.pos.y + Math.sin(g.angle * 1.3) * 2,
          b.pos.z + Math.sin(g.angle) * 12,
        );
      }
      if (b.generators.every((g) => !g.alive)) {
        b.invulnerable = false;
        b.subLabel = null;
        h.toast("SHIELDS DOWN");
        h.sfx("emp");
      }
    }

    // weapons
    fireCd -= dt;
    missileCd -= dt;
    if (fireCd <= 0) {
      fireCd = b.phase === 3 ? 0.5 : 1.2;
      const spread = b.phase === 3 ? 5 : 3;
      for (let i = 0; i < spread; i++) {
        const dir = to.clone();
        dir.x += (i - (spread - 1) / 2) * 0.09;
        h.enemyBullet(b.pos.clone(), dir, 78, 12 * diff, 0.7, "#c084fc");
      }
      h.sfx("shoot");
    }
    if (missileCd <= 0 && b.phase !== 2) {
      missileCd = b.phase === 3 ? 2 : 4;
      for (let i = 0; i < 3; i++) {
        const off = new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
        h.enemyBullet(b.pos.clone().add(off), player.pos.clone().sub(b.pos).normalize(), 46, 20 * diff, 1.2, "#f472b6");
      }
      h.warn("reaper-missiles", "MISSILES INCOMING");
      setTimeout(() => h.clearWarn("reaper-missiles"), 1500);
      h.sfx("missile");
    }

    // phase 3: laser sweep + shockwave
    if (b.phase === 3) {
      sweepT += dt;
      if (sweepT > 4) {
        sweepT = 0;
        h.warn("reaper-sweep", "LASER SWEEP");
        h.sfx("warn");
        setTimeout(() => {
          h.clearWarn("reaper-sweep");
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            h.enemyBullet(b.pos.clone(), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 60, 14 * diff, 0.8, "#f87171");
          }
          h.shake(0.5);
          h.sfx("explosion");
        }, 900);
      }
    }

    if (b.phase === 1 && Math.random() < dt * 0.25) h.spawnEnemy("drone");
  };

  return b;
}

// ================================================================ RIFT GUARDIAN
function riftGuardian(player: PlayerState, diff: number, h: BossHooks): Boss {
  const hullMax = 3400 * diff;
  const b: Boss = {
    id: "rift-guardian",
    name: "RIFT GUARDIAN",
    pos: new THREE.Vector3(0, 3, -40),
    hull: hullMax,
    hullMax,
    phase: 1,
    invulnerable: false,
    targetable: true,
    dead: false,
    missionFailed: false,
    subLabel: null,
    countdown: null,
    generators: [],
    nodes: [],
    quat: new THREE.Quaternion(),
    hitFlash: 0,
    update: () => {},
    hitTest: (pos, radius) => pos.distanceTo(b.pos) <= 7 + radius,
    takeHit: () => {},
  };

  let tpT = 5;
  let shieldT = 0;
  let summonT = 6;
  let volleyT = 2;
  let novaT = 8;
  let empT = 0;
  b.onEmp = (d) => { empT = d * 0.6; };

  b.takeHit = (dmg, crit, at, onHit) => {
    if (b.invulnerable) { h.fx(at, "shield", 0.2, 3.4, "#22d3ee"); return; }
    b.hull = Math.max(0, b.hull - dmg * (crit ? 1.15 : 1));
    b.hitFlash = 1;
    h.fx(at, "hit", 0.18, 1.6, "#22d3ee");
    onHit(dmg, "core");
    const frac = b.hull / b.hullMax;
    if (frac <= 0.66 && b.phase === 1) { b.phase = 2; }
    if (frac <= 0.33 && b.phase === 2) { b.phase = 3; b.subLabel = "UNBOUND"; h.toast("THE GUARDIAN IS UNBOUND"); }
    if (b.hull <= 0 && !b.dead) {
      b.dead = true; b.targetable = false;
      h.toast("RIFT GUARDIAN DESTROYED");
      h.sfx("bigExplosion"); h.shake(1);
      for (let i = 0; i < 16; i++)
        setTimeout(() => h.fx(b.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12)), "big", 0.8, 4, "#22d3ee"), i * 80);
    }
  };

  b.update = (dt, onPhase) => {
    if (b.dead) return;
    b.hitFlash = Math.max(0, b.hitFlash - dt * 3);
    if (empT > 0) { empT -= dt; return; }
    void onPhase;

    // hover, orbit the player slowly
    const to = player.pos.clone().sub(b.pos);
    const d = to.length();
    to.normalize();
    const tangent = new THREE.Vector3(-to.z, 0, to.x);
    b.pos.addScaledVector(to, (d > 44 ? 7 : d < 30 ? -6 : 0) * dt);
    b.pos.addScaledVector(tangent, 6 * dt);
    b.pos.y = THREE.MathUtils.lerp(b.pos.y, player.pos.y + 3 + Math.sin(performance.now() / 900) * 2, dt);
    b.quat.slerp(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(b.pos, player.pos, new THREE.Vector3(0, 1, 0))), 1 - Math.pow(0.03, dt));

    const speed = b.phase === 3 ? 1.6 : b.phase === 2 ? 1.25 : 1;

    // teleport
    tpT -= dt;
    if (tpT <= 0) {
      tpT = (b.phase === 3 ? 4 : 7) / speed;
      h.fx(b.pos.clone(), "emp", 0.4, 6, "#22d3ee");
      const a = Math.random() * Math.PI * 2;
      b.pos.set(player.pos.x + Math.cos(a) * 34, player.pos.y + 2, player.pos.z + Math.sin(a) * 34);
      h.fx(b.pos.clone(), "emp", 0.4, 6, "#22d3ee");
      h.sfx("emp");
      b.invulnerable = true;
      shieldT = 0.9;
    }
    if (shieldT > 0) { shieldT -= dt; if (shieldT <= 0) b.invulnerable = false; }

    // volleys
    volleyT -= dt;
    if (volleyT <= 0 && !b.invulnerable) {
      volleyT = (b.phase === 3 ? 0.9 : 1.7) / speed;
      const n = b.phase * 3;
      for (let i = 0; i < n; i++) {
        const dir = to.clone();
        dir.x += (i - (n - 1) / 2) * 0.11;
        dir.y += Math.sin(i) * 0.04;
        h.enemyBullet(b.pos.clone(), dir, 74, 10 * diff, 0.7, "#38bdf8");
      }
      h.sfx("shoot");
    }

    // summon drones
    summonT -= dt;
    if (summonT <= 0) {
      summonT = 9 / speed;
      for (let i = 0; i < (b.phase + 1); i++) h.spawnEnemy(Math.random() < 0.4 ? "interceptor" : "drone");
      h.toast("GUARDIAN SUMMONS");
    }

    // area nova (phase 2+)
    if (b.phase >= 2) {
      novaT -= dt;
      if (novaT <= 0) {
        novaT = 9 / speed;
        h.warn("guardian-nova", "AREA BURST — MOVE");
        h.sfx("warn");
        setTimeout(() => {
          h.clearWarn("guardian-nova");
          for (let i = 0; i < 30; i++) {
            const a = (i / 30) * Math.PI * 2;
            h.enemyBullet(b.pos.clone(), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 52, 12 * diff, 0.75, "#c084fc");
          }
          h.fx(b.pos.clone(), "emp", 0.5, 20, "#c084fc");
          h.shake(0.4);
        }, 1000);
      }
    }
  };

  return b;
}

// ================================================================ RIFT CORE (final)
function riftCore(player: PlayerState, diff: number, h: BossHooks): Boss {
  const hullMax = 5000 * diff;
  const center = new THREE.Vector3(0, 2, -30);
  const b: Boss = {
    id: "rift-core",
    name: "THE RIFT CORE",
    pos: center.clone(),
    hull: hullMax,
    hullMax,
    phase: 1,
    invulnerable: true,
    targetable: false,
    dead: false,
    missionFailed: false,
    subLabel: "DESTROY THE ENERGY NODES",
    countdown: null,
    generators: [],
    nodes: ring(center, 4, 20, 0).map((p, i) => ({
      pos: p, hull: 520 * diff, hullMax: 520 * diff, alive: true, angle: (i / 4) * Math.PI * 2,
    })),
    quat: new THREE.Quaternion(),
    hitFlash: 0,
    update: () => {},
    hitTest: (pos, radius) => {
      if (b.targetable && pos.distanceTo(b.pos) <= 9 + radius) return true;
      return false;
    },
    takeHit: () => {},
  };

  let spawnT = 3;
  let beamT = 5;
  let collapseTimer: number | null = null;
  let empT = 0;
  b.onEmp = (d) => { empT = d * 0.4; };

  const hitNode = (n: Generator, dmg: number, at: THREE.Vector3) => {
    n.hull = Math.max(0, n.hull - dmg);
    h.fx(at, "hit", 0.18, 1.6, "#e879f9");
    if (n.hull <= 0 && n.alive) {
      n.alive = false;
      h.fx(n.pos.clone(), "big", 0.7, 4, "#e879f9");
      h.sfx("explosion");
      h.toast(`NODE DOWN — ${b.nodes.filter((x) => x.alive).length} LEFT`);
    }
  };

  b.takeHit = (dmg, crit, at, onHit) => {
    // route damage to nearest live node in phase 1, core in phase 2+
    if (b.phase === 1) {
      let best: Generator | null = null;
      let bd = 8;
      for (const n of b.nodes) {
        if (!n.alive) continue;
        const d = n.pos.distanceTo(at);
        if (d < bd) { bd = d; best = n; }
      }
      if (best) hitNode(best, dmg, at);
      return;
    }
    if (!b.targetable) { h.fx(at, "shield", 0.2, 3, "#a21caf"); return; }
    b.hull = Math.max(0, b.hull - dmg * (crit ? 1.1 : 1));
    b.hitFlash = 1;
    h.fx(at, "hit", 0.2, 2, "#e879f9");
    onHit(dmg, "core");
    if (b.hull <= 0 && !b.dead) {
      b.dead = true;
      b.targetable = false;
      h.setCountdown(null);
      h.toast("RIFT CORE DESTROYED");
      h.sfx("bigExplosion");
      h.shake(1);
    }
  };

  b.update = (dt, onPhase) => {
    if (b.dead) return;
    b.hitFlash = Math.max(0, b.hitFlash - dt * 3);
    b.quat.x += dt * 0.05;
    b.quat.y += dt * 0.12;

    for (const n of b.nodes) {
      if (!n.alive) continue;
      n.angle += dt * 0.5;
      n.pos.set(center.x + Math.cos(n.angle) * 20, center.y + Math.sin(n.angle * 2) * 3, center.z + Math.sin(n.angle) * 20);
    }

    if (empT > 0) { empT -= dt; }

    // phase 1 -> 2 when all nodes dead
    if (b.phase === 1 && b.nodes.every((n) => !n.alive)) {
      b.phase = 2;
      onPhase(2);
      b.invulnerable = false;
      b.targetable = true;
      b.subLabel = "CORE EXPOSED";
      h.toast("THE CORE IS OPEN");
      h.sfx("emp");
    }

    // phase 2 -> 3 at 40%
    if (b.phase === 2 && b.hull / b.hullMax <= 0.4) {
      b.phase = 3;
      onPhase(3);
      collapseTimer = 60;
      b.subLabel = "RIFT COLLAPSE";
      h.warn("collapse", "RIFT COLLAPSE — DESTROY THE CORE");
      h.sfx("warn");
    }

    if (collapseTimer !== null) {
      collapseTimer -= dt;
      b.countdown = Math.max(0, collapseTimer);
      h.setCountdown(b.countdown);
      if (collapseTimer <= 0) {
        b.missionFailed = true;
        h.clearWarn("collapse");
      }
    }

    // continuous adds in phase 2+
    if (b.phase >= 2 && empT <= 0) {
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = b.phase === 3 ? 3 : 5;
        h.spawnEnemy(Math.random() < 0.5 ? "interceptor" : "drone");
      }
    }

    // core beams
    if (b.phase >= 1 && empT <= 0) {
      beamT -= dt;
      if (beamT <= 0) {
        beamT = b.phase === 3 ? 1.6 : b.phase === 2 ? 2.4 : 3.2;
        const src = b.phase === 1
          ? (b.nodes.find((n) => n.alive)?.pos ?? center)
          : b.pos;
        const dir = player.pos.clone().sub(src).normalize();
        const n = 4 + b.phase;
        for (let i = 0; i < n; i++) {
          const d2 = dir.clone();
          d2.x += (i - (n - 1) / 2) * 0.08;
          h.enemyBullet(src.clone(), d2, 66, 12 * diff, 0.8, "#e879f9");
        }
        h.sfx("shoot");
      }
    }
  };

  return b;
}
