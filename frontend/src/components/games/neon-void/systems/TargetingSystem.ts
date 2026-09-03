/* ============================================================
   NEON ORBIT — TargetingSystem (foundation)
   ------------------------------------------------------------
   Right now it only produces the flight-aim reticle: a point
   that represents WHERE THE SHIP IS AIMING, stable at screen
   centre but trailing the turn slightly (the classic pipper
   lag). Phase 3 fills in acquire / lock against EnemySystem.
   ============================================================ */

import * as THREE from "three";
import { TARGETING } from "../orbit/config";
import type { FlightState, Targetable } from "./types";

export interface TargetInfo {
  id: number;
  name: string;
  distance: number;
  lock: number; // 0..1
}

export class TargetingSystem {
  /** reticle position, screen-space -1..1 (0,0 = centre) */
  reticleX = 0;
  reticleY = 0;

  /** current soft-lock candidate (null until EnemySystem has entities) */
  target: TargetInfo | null = null;
  private lockT = 0;
  private lockedId: number | null = null;

  private readonly _to = new THREE.Vector3();

  update(dt: number, f: FlightState, candidates: Targetable[]) {
    dt = Math.min(dt, 0.05);

    // pipper lag — reticle drifts opposite the turn, eases home at centre
    const driftX = THREE.MathUtils.clamp(-f.turnRate * Math.sign(f.bankAngle || 1), -1, 1) * TARGETING.reticleFromTurn;
    this.reticleX += (driftX - this.reticleX) * (1 - Math.exp(-TARGETING.reticleLagLambda * dt));
    this.reticleY += (0 - this.reticleY) * (1 - Math.exp(-TARGETING.reticleLagLambda * dt));

    // ---- soft lock (no-op while candidates is empty) ------------------
    let best: Targetable | null = null;
    let bestDot = TARGETING.lockConeDot;
    for (const c of candidates) {
      if (!c.alive) continue;
      this._to.copy(c.position).sub(f.position);
      const dist = this._to.length();
      if (dist > TARGETING.lockRange) continue;
      const dot = this._to.normalize().dot(f.forward);
      if (dot > bestDot) {
        bestDot = dot;
        best = c;
      }
    }
    if (best && best.id === this.lockedId) {
      this.lockT = Math.min(TARGETING.lockSeconds, this.lockT + dt);
    } else {
      this.lockT = 0;
      this.lockedId = best ? best.id : null;
    }
    this.target = best
      ? {
          id: best.id,
          name: "CONTACT",
          distance: best.position.distanceTo(f.position),
          lock: THREE.MathUtils.clamp(this.lockT / TARGETING.lockSeconds, 0, 1),
        }
      : null;
  }
}
