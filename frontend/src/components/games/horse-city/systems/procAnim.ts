/**
 * Procedural animation helpers.
 *
 * The source models are unrigged photogrammetry scans — there are no bones and no
 * clips. Believable motion here comes from *stride-locked* body oscillation: the
 * phase advances with distance travelled, not wall-clock time, which is what kills
 * the "ice-skating" look even without articulated legs.
 */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Frame-rate independent smoothing factor for a given per-second rate. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Advances a 0..2PI phase by distance, so cadence always matches ground speed. */
export class StridePhase {
  phase = 0;
  /** @param strideLength metres of travel per full cycle */
  advance(distance: number, strideLength: number) {
    if (strideLength > 0.001) this.phase = (this.phase + (distance / strideLength) * Math.PI * 2) % (Math.PI * 2);
    return this.phase;
  }
  /** Idle: drift slowly by time so the model breathes when standing still. */
  idle(dt: number, rate = 1.1) {
    this.phase = (this.phase + dt * rate) % (Math.PI * 2);
    return this.phase;
  }
}

/** Bipedal walk/run body motion, returned as local offsets to apply to a rig root. */
export function bipedPose(phase: number, gait: number) {
  // gait 0 = idle, 1 = walk, 2 = run
  const stride = clamp(gait, 0, 1) + clamp(gait - 1, 0, 1) * 0.6;
  return {
    heave: Math.abs(Math.sin(phase)) * 0.06 * stride, // 2 steps per cycle -> abs
    sway: Math.sin(phase) * 0.035 * stride,
    roll: Math.sin(phase) * 0.05 * stride,
    pitch: -0.04 * clamp(gait, 0, 2) + Math.sin(phase * 2) * 0.015 * stride,
    yawBob: Math.sin(phase) * 0.03 * stride,
  };
}

/** Quadruped body motion for a galloping/trotting/walking horse. */
export function quadrupedPose(phase: number, gait: number) {
  // gait: 0 idle, 1 walk, 2 trot, 3 gallop
  const g = clamp(gait, 0, 3);
  const intensity = clamp(g / 3, 0, 1);
  const gallop = clamp(g - 2, 0, 1);
  return {
    heave: (Math.abs(Math.sin(phase)) - 0.5) * (0.05 + gallop * 0.13),
    // gallop pitches the whole body like a rocking horse; walk barely does
    pitch: Math.sin(phase) * (0.02 + gallop * 0.11) + gallop * 0.03,
    roll: Math.sin(phase * 0.5) * 0.03 * intensity,
    surge: Math.cos(phase) * (0.02 + gallop * 0.06),
    headBob: Math.sin(phase + 0.6) * (0.04 + gallop * 0.09),
    tailSway: Math.sin(phase * 0.5 + 1.2) * (0.15 + intensity * 0.25),
  };
}
