/* ============================================================
   NEON ORBIT — WeaponSystem  (Phase 3)
   ------------------------------------------------------------
   Scaffolding only. It already takes the fire command and a
   ProjectileSystem, so wiring real guns later is additive —
   the FlightController never changes.
   ============================================================ */

import type { FlightCommand, FlightState } from "./types";
import type { ProjectileSystem } from "./ProjectileSystem";
import type { TargetingSystem } from "./TargetingSystem";

export class WeaponSystem {
  enabled = false; // flipped on in Phase 3

  private cooldown = 0;
  readonly fireRate = 8; // rounds / s

  update(
    dt: number,
    cmd: FlightCommand,
    flight: FlightState,
    projectiles: ProjectileSystem,
    targeting: TargetingSystem,
  ) {
    void flight;
    void targeting;
    this.cooldown -= dt;
    if (!this.enabled || !cmd.firePrimary || this.cooldown > 0) return;
    this.cooldown = 1 / this.fireRate;
    // Phase 3: projectiles.spawn(muzzle, flight.forward, targeting.target)
    void projectiles;
  }
}
