/* ============================================================
   NEON ORBIT — FlightController
   ------------------------------------------------------------
   Arcade 6DOF flight. The command chooses a DESIRED direction;
   the ship rotates toward it with weight, and banks into the
   turn.

   Orientation is composed, never Euler-integrated:
     heading  = yaw (about world-up) + pitch (about the horizon
                axis). World-referenced, so the mouse always maps
                to a direction and the craft can never spiral.
     bank     = a single damped scalar (auto from the yaw rate,
                or Q/E while held). It's applied as a local roll,
                so it tilts the ship without moving the nose.
   No gimbal lock, no snapping, no runaway roll.

   Physical feel ≠ sluggish: rotation answers immediately, only
   the *rate* ramps; momentum lives in the velocity vector.
   ============================================================ */

import * as THREE from "three";
import { FLIGHT } from "../orbit/config";
import type { FlightCommand, FlightState } from "./types";

const damp = THREE.MathUtils.damp;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const ROLL_AXIS = new THREE.Vector3(0, 0, 1); // +Z local roll → +bank tilts left

export class FlightController {
  readonly position = new THREE.Vector3();
  readonly quaternion = new THREE.Quaternion();
  readonly velocity = new THREE.Vector3();
  readonly forward = new THREE.Vector3(0, 0, -1);
  readonly right = new THREE.Vector3(1, 0, 0);
  readonly up = new THREE.Vector3(0, 1, 0);

  /** heading only — yaw + pitch, never any roll */
  private readonly heading = new THREE.Quaternion();
  /** eased pitch / yaw rates (rad/s) */
  private pitchRate = 0;
  private yawRate = 0;
  /** the one roll number — auto-bank or Q/E, always eased */
  bankAngle = 0;

  private speed = 0;
  private throttle = FLIGHT.startThrottle;
  private boostRamp = 0;

  private readonly _q = new THREE.Quaternion();
  private readonly _v = new THREE.Vector3();
  private readonly _rightFlat = new THREE.Vector3();

  /** seed from a transform (end of the cinematic hand-off) */
  init(position: THREE.Vector3, quaternion: THREE.Quaternion) {
    this.position.copy(position);
    this.heading.copy(quaternion);
    this.quaternion.copy(quaternion);
    this.pitchRate = 0;
    this.yawRate = 0;
    this.bankAngle = 0;
    this.throttle = FLIGHT.startThrottle;
    this.boostRamp = 0;
    this.refreshBasis();
    this.speed = this.targetSpeed();
    this.velocity.copy(this.forward).multiplyScalar(this.speed);
  }

  private refreshBasis() {
    this.forward.set(0, 0, -1).applyQuaternion(this.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(this.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.quaternion);
  }

  private targetSpeed() {
    const cruise = THREE.MathUtils.lerp(FLIGHT.idleSpeed, FLIGHT.maxSpeed, this.throttle);
    return THREE.MathUtils.lerp(cruise, FLIGHT.boostSpeed, this.boostRamp);
  }

  update(dt: number, cmd: FlightCommand) {
    dt = Math.min(dt, 0.05);

    // ---- held throttle --------------------------------------------------
    this.throttle = THREE.MathUtils.clamp(
      this.throttle + cmd.throttleAxis * FLIGHT.throttleRate * dt,
      0,
      1,
    );

    // ---- boost — trades agility for speed ------------------------------
    this.boostRamp = damp(this.boostRamp, cmd.boost, cmd.boost > 0.5 ? 2.0 : 3.2, dt);
    const agility = THREE.MathUtils.lerp(1, FLIGHT.boostTurnScale, this.boostRamp);

    // ---- desired pitch / yaw rates ------------------------------------
    const wantYaw =
      -cmd.steerX * FLIGHT.yawRate * agility + cmd.yawAxis * -FLIGHT.keyboardYawRate * agility;
    const wantPitch = -cmd.steerY * FLIGHT.pitchRate * agility;

    this.pitchRate = damp(this.pitchRate, wantPitch, FLIGHT.turnAccelLambda, dt);
    this.yawRate = damp(this.yawRate, wantYaw, FLIGHT.turnAccelLambda, dt);

    // ---- heading: yaw about world-up, pitch about the horizon axis ----
    this._q.setFromAxisAngle(WORLD_UP, this.yawRate * dt);
    this.heading.premultiply(this._q);

    this.forward.set(0, 0, -1).applyQuaternion(this.heading);
    this._rightFlat.crossVectors(this.forward, WORLD_UP);
    if (this._rightFlat.lengthSq() < 1e-5) this._rightFlat.set(1, 0, 0).applyQuaternion(this.heading);
    else this._rightFlat.normalize();

    let pitch = this.pitchRate * dt;
    if (this.forward.y > 0.985 && pitch > 0) pitch = 0;
    if (this.forward.y < -0.985 && pitch < 0) pitch = 0;
    this._q.setFromAxisAngle(this._rightFlat, pitch);
    this.heading.premultiply(this._q).normalize();

    // ---- bank: one eased scalar -------------------------------------
    const manualRoll = Math.abs(cmd.rollAxis) > 0.01;
    let bankTarget: number;
    if (manualRoll) {
      bankTarget = cmd.rollAxis * 1.4; // ~80° while Q/E held, eases back after
    } else {
      bankTarget = THREE.MathUtils.clamp(
        this.yawRate * FLIGHT.bankFromYaw,
        -FLIGHT.maxBank,
        FLIGHT.maxBank,
      );
    }
    this.bankAngle = damp(this.bankAngle, bankTarget, FLIGHT.bankLambda, dt);

    // ---- compose: heading, then local roll --------------------------
    this._q.setFromAxisAngle(ROLL_AXIS, this.bankAngle);
    this.quaternion.copy(this.heading).multiply(this._q);
    this.refreshBasis();

    // ---- speed + momentum -----------------------------------------
    const tgt = this.targetSpeed();
    const speedLambda =
      this.boostRamp > 0.05
        ? FLIGHT.boostAccelLambda
        : tgt < this.speed
          ? FLIGHT.brakeLambda
          : FLIGHT.accelLambda;
    this.speed = damp(this.speed, tgt, speedLambda, dt);

    // velocity eases toward "nose × speed" — loosened while turning hard so the
    // ship visibly carves, tight otherwise so it never feels like ice
    const turn = Math.abs(this.yawRate) + Math.abs(this.pitchRate);
    const align = FLIGHT.velAlignLambda * (1 - Math.min(1, turn * 0.7) * FLIGHT.driftFromTurn);
    this._v.copy(this.forward).multiplyScalar(this.speed);
    this.velocity.lerp(this._v, 1 - Math.exp(-align * dt));
    this.position.addScaledVector(this.velocity, dt);

    // ---- soft return (never a wall) ------------------------------
    const d = this.position.length();
    if (d > FLIGHT.softBound) {
      this._v.copy(this.position).multiplyScalar(-1 / d);
      this.velocity.addScaledVector(this._v, (d - FLIGHT.softBound) * FLIGHT.softBoundPush * dt);
      if (d > FLIGHT.softBound * 1.3) this.position.setLength(FLIGHT.softBound * 1.3);
    }
  }

  get state(): FlightState {
    return {
      position: this.position,
      quaternion: this.quaternion,
      velocity: this.velocity,
      forward: this.forward,
      right: this.right,
      up: this.up,
      speed: this.speed,
      speedRatio: THREE.MathUtils.clamp(
        (this.speed - FLIGHT.maxSpeed * 0.5) / (FLIGHT.boostSpeed - FLIGHT.maxSpeed * 0.5),
        0,
        1,
      ),
      boost: this.boostRamp,
      throttle: this.throttle,
      bankAngle: this.bankAngle,
      turnRate: Math.abs(this.yawRate) + Math.abs(this.pitchRate),
    };
  }
}
