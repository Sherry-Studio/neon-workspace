/* ============================================================
   NEON ORBIT — Game
   ------------------------------------------------------------
   Owns every system and the single tick(). During the intro it
   directs a scripted camera + ship reveal; at the hand-off it
   seeds the FlightController and the CameraController and lets
   the player fly. Combat systems are wired in but inert until
   their phase.

   The R3F rig does exactly two things each frame:
     game.tick(dt, time)
     copy game.shipPosition / shipQuaternion / camera.* to R3F
   ============================================================ */

import * as THREE from "three";
import { INTRO } from "../orbit/config";
import { InputManager } from "./InputManager";
import { FlightController } from "./FlightController";
import { CameraController } from "./CameraController";
import { TargetingSystem } from "./TargetingSystem";
import { WeaponSystem } from "./WeaponSystem";
import { ProjectileSystem } from "./ProjectileSystem";
import { EnemySystem } from "./EnemySystem";
import { VFXSystem } from "./VFXSystem";

const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

type Key = { t: number; p: THREE.Vector3; look: THREE.Vector3 };

export class NeonOrbitGame {
  readonly input = new InputManager();
  readonly flight = new FlightController();
  readonly camera = new CameraController();
  readonly targeting = new TargetingSystem();
  readonly weapons = new WeaponSystem();
  readonly projectiles = new ProjectileSystem();
  readonly enemies = new EnemySystem();
  readonly vfx = new VFXSystem();

  phase: "intro" | "live" = "intro";
  introT = 0;
  skipRequested = false;

  /** what the rig copies onto the ship group every frame */
  readonly shipPosition = new THREE.Vector3();
  readonly shipQuaternion = new THREE.Quaternion();
  shipVisible = false;

  private liveSeeded = false;

  // cinematic scratch
  private readonly _s = {
    a: new THREE.Vector3(),
    look: new THREE.Vector3(),
    zero: new THREE.Vector3(),
    qStart: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.16, 0.5, -0.28)),
    qId: new THREE.Quaternion(),
    shipStart: new THREE.Vector3(-320, -54, 380),
    shipMid: new THREE.Vector3(-30, -4, 60),
    chaseOff: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
  };
  private readonly camKeys: Key[] = [
    { t: 0, p: new THREE.Vector3(90, 130, -5200), look: new THREE.Vector3(-1700, 760, -8000) },
    { t: INTRO.starsIn[1], p: new THREE.Vector3(70, 96, -2400), look: new THREE.Vector3(-1500, 640, -7500) },
    { t: INTRO.reveal[1], p: new THREE.Vector3(165, 40, 175), look: new THREE.Vector3(-40, 8, -240) },
    { t: INTRO.handoff[0], p: new THREE.Vector3(120, 28, 130), look: new THREE.Vector3(0, 4, -200) },
  ];

  /** jump straight to flight (QA / ?fly=1) */
  forceLive() {
    this.phase = "live";
    this.introT = INTRO.total + 1;
    this.skipRequested = true;
    this.input.armed = true;
    this.input.setLive(true);
    this.shipPosition.set(0, 0, 0);
    this.shipQuaternion.identity();
    this.shipVisible = true;
  }

  tick(dt: number, time: number) {
    dt = Math.min(dt, 0.05);

    if (this.phase === "intro") {
      this.updateIntro(dt);
      return;
    }

    if (!this.liveSeeded) {
      this.liveSeeded = true;
      this.flight.init(this.shipPosition, this.shipQuaternion);
      this.camera.snapTo(this.flight.state);
      this.input.setLive(true);
    }

    this.input.tick(dt);
    const cmd = this.input.getCommand();

    this.flight.update(dt, cmd);
    const f = this.flight.state;

    this.enemies.update(dt, f);
    this.targeting.update(dt, f, this.enemies.list);
    this.weapons.update(dt, cmd, f, this.projectiles, this.targeting);
    this.projectiles.update(dt, this.enemies);
    this.vfx.update(dt, f);
    this.camera.update(dt, f, time);

    this.shipPosition.copy(this.flight.position);
    this.shipQuaternion.copy(this.flight.quaternion);
    this.shipVisible = true;
  }

  // ---- cinematic --------------------------------------------------------
  private sampleKeys(t: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
    const keys = this.camKeys;
    if (t <= keys[0].t) {
      outPos.copy(keys[0].p);
      outLook.copy(keys[0].look);
      return;
    }
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i];
      const b = keys[i + 1];
      if (t <= b.t) {
        const k = smoothstep(a.t, b.t, t);
        outPos.lerpVectors(a.p, b.p, k);
        outLook.lerpVectors(a.look, b.look, k);
        return;
      }
    }
    outPos.copy(keys[keys.length - 1].p);
    outLook.copy(keys[keys.length - 1].look);
  }

  private updateIntro(dt: number) {
    const s = this._s;
    this.introT += dt * (this.skipRequested ? 4.5 : 1);
    const t = this.introT;

    // ship flies into frame, settles onto the live start pose
    const inK = smoothstep(INTRO.shipIn[0], INTRO.shipIn[1], t);
    const settle = smoothstep(INTRO.shipIn[1], INTRO.handoff[1], t);
    this.shipVisible = t >= INTRO.shipIn[0] - 0.2;
    this.shipPosition.lerpVectors(s.shipStart, s.shipMid, inK).lerp(s.zero, settle);
    this.shipQuaternion.copy(s.qStart).slerp(s.qId, Math.max(inK, settle));

    // camera: scripted reveal, then blend to the chase seat
    this.sampleKeys(t, this.camera.position, s.look);
    const handoffK = smoothstep(INTRO.handoff[0], INTRO.handoff[1], t);
    if (handoffK > 0) {
      s.fwd.set(0, 0, -1).applyQuaternion(this.shipQuaternion);
      s.chaseOff.set(0, 8, 30).applyQuaternion(this.shipQuaternion);
      s.a.copy(this.shipPosition).add(s.chaseOff);
      this.camera.position.lerp(s.a, handoffK);
      s.a.copy(this.shipPosition).addScaledVector(s.fwd, 55);
      s.look.lerp(s.a, handoffK);
    }
    this.camera.lookAtDirect(s.look);
    this.camera.fov = THREE.MathUtils.lerp(38, 58, handoffK);

    if (t >= INTRO.total || (this.skipRequested && t >= INTRO.handoff[1])) {
      this.phase = "live";
    }
  }
}
