import type * as THREE from "three";

/* Shared contracts between systems. Keeping these here means WeaponSystem etc.
   can be fleshed out in Phase 3 without the flight or camera code changing. */

/** Normalised per-frame intent from the InputManager. Nothing device-specific. */
export interface FlightCommand {
  /** -1..1, curve + deadzone applied. +x steer right, +y steer down */
  steerX: number;
  steerY: number;
  /** -1..1 — W/S: raise / lower the held throttle */
  throttleAxis: number;
  /** -1..1 — A/D yaw assist */
  yawAxis: number;
  /** -1..1 — Q/E roll */
  rollAxis: number;
  /** 0..1 — Shift */
  boost: number;
  /** held this frame — WeaponSystem will consume it (ignored for now) */
  firePrimary: boolean;
  firePrimaryPressed: boolean; // rising edge
}

/** Read-only snapshot of the ship other systems (camera, targeting, VFX) need. */
export interface FlightState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  forward: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  speed: number;
  speedRatio: number; // 0..1 across cruise → boost
  boost: number; // 0..1 eased
  throttle: number; // 0..1 held
  bankAngle: number; // rad, signed
  turnRate: number; // |angular velocity|, for camera lead + reticle lag
}

/** A candidate the TargetingSystem can lock (EnemySystem fills these later). */
export interface Targetable {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  alive: boolean;
}
