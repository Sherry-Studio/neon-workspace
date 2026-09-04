import * as THREE from "three";
import { GIRL, HORSE, STAMINA, GaitName } from "../config";
import { InputManager } from "./input";
import { clamp, damp, lerp } from "./procAnim";
import { WorldState } from "./state";
import { CameraRig } from "./camera";

const GAIT_ORDER: GaitName[] = ["idle", "walk", "trot", "gallop"];

/** A physics-backed body the controller can push around. Implemented in Scene
 *  on top of a Rapier kinematic character controller. */
export interface KinematicBody {
  readonly position: THREE.Vector3;
  /** Hard teleport (spawn, mount/dismount sequences). */
  setPosition(p: THREE.Vector3): void;
  /** Move by `delta` with collide-and-slide. Returns whether the body is grounded. */
  moveAndSlide(delta: THREE.Vector3): boolean;
}

/** Owns all gameplay simulation. Called once per frame from the R3F loop. */
export class GameController {
  private mountSide = 1; // rider mounts from the horse's left
  private seqDuration = 0;
  private seqFrom = new THREE.Vector3();
  private seqFromYaw = 0;
  private _mountStage = new THREE.Vector3();
  private _horseVy = 0;
  private _delta = new THREE.Vector3();

  constructor(
    private w: WorldState,
    private input: InputManager,
    private girl: KinematicBody,
    private horse: KinematicBody,
    private cam: CameraRig,
  ) {}

  update(dt: number) {
    if (this.w.paused) return;
    dt = Math.min(dt, 1 / 30);
    this.cam.rotate(this.input.mouseDX, this.input.mouseDY);

    switch (this.w.mode) {
      case "onfoot":
        this.updateOnFoot(dt);
        break;
      case "riding":
        this.updateRiding(dt);
        break;
      case "mounting":
        this.updateMountSeq(dt);
        break;
      case "dismounting":
        this.updateDismountSeq(dt);
        break;
    }
    this.updateStamina(dt);
  }

  // ---- on foot ----------------------------------------------------------
  private updateOnFoot(dt: number) {
    const w = this.w;
    const ax = this.input.axis();
    const running = this.input.run();
    const wish = new THREE.Vector2(ax.x, ax.y);
    const moving = wish.lengthSq() > 0.01;

    let targetSpeed = 0;
    if (moving) {
      wish.normalize();
      const camYaw = this.cam.yaw;
      const dirX = wish.x * Math.cos(camYaw) + wish.y * Math.sin(camYaw);
      const dirZ = -wish.x * Math.sin(camYaw) + wish.y * Math.cos(camYaw);
      w.girlYaw = lerpAngle(w.girlYaw, Math.atan2(dirX, dirZ), damp(GIRL.turnLerp, dt));
      targetSpeed = running ? GIRL.runSpeed : GIRL.walkSpeed;
    }

    const dir = new THREE.Vector2(Math.sin(w.girlYaw), Math.cos(w.girlYaw)).multiplyScalar(targetSpeed);
    const curSpeed = Math.hypot(w.girlVel.x, w.girlVel.z);
    const rate = targetSpeed > curSpeed ? GIRL.accel : GIRL.decel;
    w.girlVel.x = lerp(w.girlVel.x, dir.x, damp(rate, dt));
    w.girlVel.z = lerp(w.girlVel.z, dir.y, damp(rate, dt));

    if (w.girlGrounded && this.input.justPressed("Space")) {
      w.girlVel.y = GIRL.jumpSpeed;
      w.girlGrounded = false;
    }
    w.girlVel.y = Math.max(w.girlVel.y + GIRL.gravity * dt, -30);

    this._delta.set(w.girlVel.x * dt, w.girlVel.y * dt, w.girlVel.z * dt);
    const grounded = this.girl.moveAndSlide(this._delta);
    w.girlGrounded = grounded;
    if (grounded && w.girlVel.y < 0) w.girlVel.y = 0;
    w.girlPos.copy(this.girl.position);

    const hspeed = Math.hypot(w.girlVel.x, w.girlVel.z);
    w.girlSpeed = hspeed;
    w.girlGait = hspeed < 0.4 ? 0 : hspeed > GIRL.walkSpeed + 1.2 ? 2 : 1;

    const d = w.girlPos.distanceTo(w.horsePos);
    w.promptVisible = d < GIRL.mountRange && w.girlGrounded;
    if (w.promptVisible && this.input.justPressed("KeyE")) this.beginMount();

    this.cam.setMode("foot");
  }

  // ---- mount ----------------------------------------------------------
  private beginMount() {
    const w = this.w;
    w.mode = "mounting";
    w.seqT = 0;
    this.seqDuration = 2.0;
    this.seqFrom.copy(w.girlPos);
    this.seqFromYaw = w.girlYaw;
    w.girlVel.set(0, 0, 0);
    const left = new THREE.Vector3(Math.cos(w.horseYaw), 0, -Math.sin(w.horseYaw)).multiplyScalar(this.mountSide * 1.0);
    this._mountStage.copy(w.horsePos).add(left);
    this._mountStage.y = w.horsePos.y;
  }

  private updateMountSeq(dt: number) {
    const w = this.w;
    w.seqT = clamp(w.seqT + dt / this.seqDuration, 0, 1);
    const t = w.seqT;
    const faceHorse = Math.atan2(w.horsePos.x - this._mountStage.x, w.horsePos.z - this._mountStage.z);
    if (t < 0.45) {
      const k = easeInOut(t / 0.45);
      w.girlPos.lerpVectors(this.seqFrom, this._mountStage, k);
      w.girlYaw = lerpAngle(this.seqFromYaw, faceHorse, k);
    } else {
      const k = (t - 0.45) / 0.55;
      const seat = this.saddleWorld();
      w.girlPos.lerpVectors(this._mountStage, seat, easeInOut(k));
      w.girlPos.y = lerp(this._mountStage.y, seat.y, easeOutBack(k));
      w.girlYaw = lerpAngle(faceHorse, w.horseYaw, easeInOut(k));
    }
    this.girl.setPosition(w.girlPos);
    this.cam.setMode(t < 0.4 ? "foot" : "horse");
    if (t >= 1) {
      w.mode = "riding";
      w.seqT = 0;
      w.horseSpeed = 0;
      w.horseGait = "idle";
      this._horseVy = 0;
    }
  }

  private saddleWorld() {
    const w = this.w;
    const o = HORSE.saddleOffset;
    return new THREE.Vector3(
      o[0] * Math.cos(w.horseYaw) + o[2] * Math.sin(w.horseYaw),
      o[1],
      -o[0] * Math.sin(w.horseYaw) + o[2] * Math.cos(w.horseYaw),
    ).add(w.horsePos);
  }

  // ---- riding --------------------------------------------------------
  private updateRiding(dt: number) {
    const w = this.w;
    const ax = this.input.axis();
    const wantRun = this.input.run();

    let targetGaitIdx = 0;
    if (ax.y > 0.1) {
      if (wantRun) targetGaitIdx = w.canGallop ? 3 : 2;
      else targetGaitIdx = w.horseSpeed > HORSE.gaits.walk.speed + 0.5 ? 2 : 1;
    }
    const reversing = ax.y < -0.1;
    const targetName = reversing ? "idle" : GAIT_ORDER[targetGaitIdx];
    let targetSpeed = reversing ? -HORSE.reverseSpeed : HORSE.gaits[targetName].speed;
    if (!w.canGallop) targetSpeed = Math.min(targetSpeed, HORSE.gaits.trot.speed);
    if (w.stamina < 40) targetSpeed *= 0.6 + 0.4 * (w.stamina / 40);

    const rate = targetSpeed > w.horseSpeed ? HORSE.accel : HORSE.brake;
    w.horseSpeed = lerp(w.horseSpeed, targetSpeed, damp(rate / Math.max(2, Math.abs(targetSpeed) || 2), dt));
    if (Math.abs(w.horseSpeed) < 0.05) w.horseSpeed = 0;
    w.horseGait = speedToGait(Math.abs(w.horseSpeed));

    const speed01 = clamp(Math.abs(w.horseSpeed) / HORSE.gaits.gallop.speed, 0, 1);
    const turnRate = lerp(HORSE.turnRateLow, HORSE.turnRateHigh, speed01);
    if (Math.abs(ax.x) > 0.1 && Math.abs(w.horseSpeed) > 0.15) {
      w.horseYaw -= ax.x * turnRate * dt * Math.sign(w.horseSpeed);
    }

    if (w.horseGrounded && this.input.justPressed("Space")) {
      this._horseVy = HORSE.jumpSpeed;
      w.horseGrounded = false;
    }
    this._horseVy = Math.max(this._horseVy + HORSE.gravity * dt, -30);

    const fwd = new THREE.Vector3(Math.sin(w.horseYaw), 0, Math.cos(w.horseYaw));
    this._delta.copy(fwd).multiplyScalar(w.horseSpeed * dt);
    this._delta.y = this._horseVy * dt;
    const grounded = this.horse.moveAndSlide(this._delta);
    w.horseGrounded = grounded;
    if (grounded && this._horseVy < 0) this._horseVy = 0;
    const movedXZ = Math.hypot(this.horse.position.x - w.horsePos.x, this.horse.position.z - w.horsePos.z);
    if (movedXZ < Math.abs(w.horseSpeed) * dt * 0.4 && Math.abs(w.horseSpeed) > 1) w.horseSpeed *= 0.4; // wall
    w.horsePos.copy(this.horse.position);

    // rider glued to the saddle
    const seat = this.saddleWorld();
    w.girlPos.copy(seat);
    this.girl.setPosition(seat);
    w.girlYaw = w.horseYaw;

    w.promptVisible = true;
    if (this.input.justPressed("KeyE") && Math.abs(w.horseSpeed) < HORSE.gaits.walk.speed + 0.5) {
      this.beginDismount();
    }
    this.cam.setMode("horse");
  }

  // ---- dismount ------------------------------------------------------
  private beginDismount() {
    const w = this.w;
    w.mode = "dismounting";
    w.seqT = 0;
    this.seqDuration = 1.6;
    w.horseSpeed = 0;
    w.horseGait = "idle";
    this.seqFrom.copy(w.girlPos);
    const left = new THREE.Vector3(Math.cos(w.horseYaw), 0, -Math.sin(w.horseYaw)).multiplyScalar(this.mountSide * 1.1);
    this._mountStage.copy(w.horsePos).add(left);
    this._mountStage.y = w.horsePos.y;
  }

  private updateDismountSeq(dt: number) {
    const w = this.w;
    w.seqT = clamp(w.seqT + dt / this.seqDuration, 0, 1);
    const k = easeInOut(w.seqT);
    w.girlPos.lerpVectors(this.seqFrom, this._mountStage, k);
    w.girlPos.y = lerp(this.seqFrom.y, this._mountStage.y, easeInCubic(w.seqT));
    w.girlYaw = lerpAngle(w.horseYaw, w.horseYaw + Math.PI * 0.5 * this.mountSide, k);
    this.girl.setPosition(w.girlPos);
    this.cam.setMode(w.seqT > 0.6 ? "foot" : "horse");
    if (w.seqT >= 1) {
      w.mode = "onfoot";
      w.seqT = 0;
      w.girlVel.set(0, 0, 0);
      w.girlGrounded = true;
      // let physics settle the exact ground height
      this.girl.moveAndSlide(new THREE.Vector3(0, -1.5, 0));
      w.girlPos.copy(this.girl.position);
    }
  }

  // ---- stamina ------------------------------------------------------
  private updateStamina(dt: number) {
    const w = this.w;
    if (w.mode === "riding" && w.horseGait === "gallop") w.stamina -= STAMINA.gallopDrain * dt;
    else if (w.mode === "riding" && w.horseGait === "trot") w.stamina -= STAMINA.trotDrain * dt;
    else w.stamina += STAMINA.recover * dt;
    w.stamina = clamp(w.stamina, 0, STAMINA.max);
    if (w.stamina <= 1) w.canGallop = false;
    if (!w.canGallop && w.stamina >= STAMINA.gallopLockout) w.canGallop = true;
  }
}

// --- helpers ---
function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeInCubic = (t: number) => t * t * t;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
function speedToGait(s: number): GaitName {
  if (s < 0.4) return "idle";
  if (s < HORSE.gaits.walk.speed + 1.4) return "walk";
  if (s < HORSE.gaits.trot.speed + 2.5) return "trot";
  return "gallop";
}
