import * as THREE from "three";
import { GameMode, GaitName } from "../config";

/** Mutable per-frame game state. Lives outside React; HUD reads a throttled copy. */
export interface WorldState {
  mode: GameMode;
  // girl
  girlPos: THREE.Vector3;
  girlYaw: number;
  girlVel: THREE.Vector3;
  girlGrounded: boolean;
  girlSpeed: number; // horizontal m/s, for anim
  girlGait: 0 | 1 | 2; // idle / walk / run
  // horse
  horsePos: THREE.Vector3;
  horseYaw: number;
  horseSpeed: number;
  horseGait: GaitName;
  horseGrounded: boolean;
  // systems
  stamina: number;
  canGallop: boolean;
  promptVisible: boolean;
  // mount sequence
  seqT: number; // 0..1 progress through mount/dismount
  // debug
  debug: boolean;
  paused: boolean;
}

export function createWorld(girlPos: [number, number, number], girlYaw: number, horsePos: [number, number, number], horseYaw: number): WorldState {
  return {
    mode: "onfoot",
    girlPos: new THREE.Vector3(...girlPos),
    girlYaw,
    girlVel: new THREE.Vector3(),
    girlGrounded: true,
    girlSpeed: 0,
    girlGait: 0,
    horsePos: new THREE.Vector3(...horsePos),
    horseYaw,
    horseSpeed: 0,
    horseGait: "idle",
    horseGrounded: true,
    stamina: 100,
    canGallop: true,
    promptVisible: false,
    seqT: 0,
    debug: false,
    paused: false,
  };
}

/** Snapshot the HUD cares about. */
export interface HudState {
  mode: GameMode;
  horseGait: GaitName;
  horseKmh: number;
  stamina: number;
  canGallop: boolean;
  promptVisible: boolean;
  debug: boolean;
}
export function toHud(w: WorldState): HudState {
  return {
    mode: w.mode,
    horseGait: w.horseGait,
    horseKmh: Math.round(w.horseSpeed * 3.6),
    stamina: Math.round(w.stamina),
    canGallop: w.canGallop,
    promptVisible: w.promptVisible,
    debug: w.debug,
  };
}
