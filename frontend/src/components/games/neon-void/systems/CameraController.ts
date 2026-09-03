/* ============================================================
   NEON ORBIT — CameraController
   ------------------------------------------------------------
   A chase camera that FOLLOWS the ship — never rigid, never
   fighting it. Position + orientation lag, shared roll, a slide
   *into* turns so you see where you're going, asymmetric FOV
   (widens fast on boost, narrows slow), boost pull-back + shake,
   and a recoil hook for Phase 3.

   Frame-work free: update() writes into `position`, `quaternion`
   and `fov`; the R3F rig copies them onto the real camera.
   ============================================================ */

import * as THREE from "three";
import { CAMERA, FLIGHT } from "../orbit/config";
import type { FlightState } from "./types";

const expLerp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);
const FLIGHT_CRUISE = FLIGHT.maxSpeed * 0.6; // reference for the speed-FOV term

export class CameraController {
  readonly position = new THREE.Vector3(0, CAMERA.height, CAMERA.distance);
  readonly quaternion = new THREE.Quaternion();
  fov = CAMERA.baseFov;

  /** transient kick from weapon fire (Phase 3 sets this) */
  recoil = 0;

  private readonly followQ = new THREE.Quaternion();
  private readonly lookAt = new THREE.Vector3(0, 0, -CAMERA.lookAhead);
  private readonly camUp = new THREE.Vector3(0, 1, 0);
  private lead = 0;
  private prevSpeed = 0;

  private readonly _off = new THREE.Vector3();
  private readonly _desired = new THREE.Vector3();
  private readonly _look = new THREE.Vector3();
  private readonly _up = new THREE.Vector3();
  private readonly _shake = new THREE.Vector3();
  private readonly _m = new THREE.Matrix4();
  private seed = Math.random() * 100;

  /** snap the rig behind a given ship pose (hand-off / spawn) */
  snapTo(f: FlightState) {
    this.followQ.copy(f.quaternion);
    this._off.set(0, CAMERA.height, CAMERA.distance).applyQuaternion(this.followQ);
    this.position.copy(f.position).add(this._off);
    this.lookAt.copy(f.position).addScaledVector(f.forward, CAMERA.lookAhead);
    this.camUp.set(0, 1, 0);
    this.fov = CAMERA.baseFov;
    this.lead = 0;
    this.prevSpeed = f.speed;
    this.applyLook();
  }

  update(dt: number, f: FlightState, time: number) {
    dt = Math.min(dt, 0.05);

    // orientation follow — the lag you feel through a turn
    this.followQ.slerp(f.quaternion, expLerp(CAMERA.rotLagLambda, dt));

    // slide the seat opposite the turn so the nose leads into the corner
    const targetLead = THREE.MathUtils.clamp(-f.turnRate * Math.sign(f.bankAngle || 1) * 6, -CAMERA.turnLead, CAMERA.turnLead);
    this.lead += (targetLead - this.lead) * expLerp(CAMERA.turnLeadLambda, dt);

    const pullback = f.boost * CAMERA.boostPullback;
    this._off.set(this.lead, CAMERA.height, CAMERA.distance + pullback).applyQuaternion(this.followQ);
    this._desired.copy(f.position).add(this._off);
    this.position.lerp(this._desired, expLerp(CAMERA.posLagLambda, dt));

    // boost vibration + recoil kick, along the camera's own forward
    const camFwd = this._up.set(0, 0, -1).applyQuaternion(this.followQ);
    const amp = f.boost * CAMERA.boostShake;
    this._shake
      .set(Math.sin(time * 47 + this.seed) + Math.sin(time * 19), Math.sin(time * 31) + Math.sin(time * 11), 0)
      .multiplyScalar(amp);
    this.recoil = Math.max(0, this.recoil - CAMERA.recoilDecay * this.recoil * dt);
    this.position.addScaledVector(camFwd, -this.recoil * 1.4).add(this._shake);

    // aim a little ahead of the nose, biased up so the ship sits low in frame
    this._look
      .copy(f.position)
      .addScaledVector(f.forward, CAMERA.lookAhead)
      .addScaledVector(f.up, CAMERA.lookUp);
    this.lookAt.lerp(this._look, expLerp(6, dt));

    // share ~35% of the ship's roll
    this._up.set(0, 1, 0).lerp(f.up, CAMERA.rollBleed).normalize();
    this.camUp.lerp(this._up, expLerp(5, dt));
    this.applyLook();

    // asymmetric FOV — fast to open on boost / acceleration, slow to close
    const accel = Math.max(0, f.speed - this.prevSpeed) / Math.max(dt, 1e-4);
    this.prevSpeed = f.speed;
    const targetFov =
      CAMERA.baseFov +
      f.boost * CAMERA.boostFov +
      Math.max(0, f.speed - FLIGHT_CRUISE) * CAMERA.speedFov +
      Math.min(6, accel * 0.02);
    const lambda = targetFov > this.fov ? CAMERA.fovAttackLambda : CAMERA.fovReleaseLambda;
    this.fov += (Math.min(102, targetFov) - this.fov) * expLerp(lambda, dt);
  }

  /** cinematic: point straight at a world point, no smoothing */
  lookAtDirect(target: THREE.Vector3) {
    this.lookAt.copy(target);
    this.camUp.set(0, 1, 0);
    this.applyLook();
  }

  private applyLook() {
    this._m.lookAt(this.position, this.lookAt, this.camUp);
    this.quaternion.setFromRotationMatrix(this._m);
  }
}
