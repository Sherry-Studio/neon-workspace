import type { NeonOrbitGame } from "../systems/Game";

/** The one object that crosses the React ⇄ R3F ⇄ DOM boundary.
 *  It just carries the game instance + a couple of cheap read-outs the DOM UI
 *  polls via rAF. Never triggers a React render. */
export interface OrbitBus {
  game: NeonOrbitGame;
  /** cheap telemetry for the minimal HUD (written each frame by the rig) */
  phase: "intro" | "live";
  introT: number;
  speedRatio: number;
  boost: number;
  throttle: number;
  reticleX: number;
  reticleY: number;
}

export function createBus(game: NeonOrbitGame): OrbitBus {
  return {
    game,
    phase: "intro",
    introT: 0,
    speedRatio: 0,
    boost: 0,
    throttle: 0.5,
    reticleX: 0,
    reticleY: 0,
  };
}
