/* ============================================================
   NEON ORBIT — VFXSystem
   ------------------------------------------------------------
   Central home for transient visual state the scene reads:
   engine drive, speed-line intensity, screen shake. Phase 3
   adds muzzle flashes, impacts, explosions here.
   ============================================================ */

import * as THREE from "three";
import type { FlightState } from "./types";

export class VFXSystem {
  /** 0..~2 — engine plume length / brightness */
  drive = 0;
  /** 0..1 — how strongly stars streak past */
  speedLines = 0;
  /** 0..1 — additive screen shake (boost, later: impacts) */
  shake = 0;

  update(dt: number, f: FlightState) {
    dt = Math.min(dt, 0.05);
    const targetDrive = 0.35 + f.throttle * 0.7 + f.boost * 1.5;
    this.drive = THREE.MathUtils.damp(this.drive, targetDrive, 6, dt);
    this.speedLines = THREE.MathUtils.damp(
      this.speedLines,
      THREE.MathUtils.clamp(f.speedRatio * 0.7 + f.boost, 0, 1),
      5,
      dt,
    );
    this.shake = THREE.MathUtils.damp(this.shake, f.boost * 0.6, 5, dt);
  }
}
