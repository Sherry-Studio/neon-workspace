/* ============================================================
   NEON ORBIT — EnemySystem  (Phase 4)
   ------------------------------------------------------------
   Scaffolding: exposes an (empty) list of Targetables so the
   TargetingSystem and radar can already iterate it. No AI, no
   spawns — that's a later phase, on top of good flight.
   ============================================================ */

import type { FlightState, Targetable } from "./types";

export class EnemySystem {
  readonly list: Targetable[] = [];

  update(dt: number, player: FlightState) {
    void dt;
    void player;
    // Phase 4: spawn waves, run behaviours, fire at the player
  }
}
