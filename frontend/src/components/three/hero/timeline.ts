/**
 * THE JOURNEY — one continuous shot, scrubbed by scroll progress (0..1).
 *
 *  VOID → LOGO FORMS → CAMERA THROUGH LETTER → ARCADE CABINET
 *       → CRT POWERS ON → CAMERA ENTERS SCREEN → TUNNEL → THREE WORLDS
 *
 * Every scene reads from this so the DOM overlays and the WebGL scene can
 * never drift out of sync.
 */
export const T = {
  /** near-black, a single distant light, "INSERT COIN" */
  voidStart: 0.0,
  voidEnd: 0.075,

  /** particles converge → neon tubes draw → letters light → flicker → full power */
  formStart: 0.075,
  formEnd: 0.2,

  /** the sign holds, lit. "PLAY. COMPETE. REPEAT." */
  holdStart: 0.2,
  holdEnd: 0.27,

  /** camera flies at a letter, it fills frame, we pass through the glow */
  enterLogoStart: 0.27,
  enterLogoEnd: 0.37,

  /** the room opens; the cabinet rises out of the dark and we orbit it */
  cabinetStart: 0.37,
  cabinetEnd: 0.53,

  /** CRT powers on, scanlines, the three games play on screen */
  crtStart: 0.53,
  crtEnd: 0.65,

  /** push into the screen until it swallows the frame */
  enterCrtStart: 0.65,
  enterCrtEnd: 0.73,

  /** digital tunnel */
  tunnelStart: 0.73,
  tunnelEnd: 0.82,

  /** three game worlds */
  worldsStart: 0.82,
  worldsEnd: 1.0,
} as const;

/** The three worlds, each with its own accent while the brand stays cyan. */
export const WORLDS = [
  {
    id: "runner",
    n: "GAME 01",
    title: "NEON RUNNER",
    tagline: "RUN FASTER. BEAT YOUR SCORE.",
    accent: "#22d3ee",
    accentRGB: [0.13, 0.83, 0.93] as [number, number, number],
  },
  {
    id: "shooter",
    n: "GAME 02",
    title: "NEON SPACE SHOOTER",
    tagline: "SURVIVE THE WAVES.",
    accent: "#a855f7",
    accentRGB: [0.66, 0.33, 0.97] as [number, number, number],
  },
  {
    id: "racer",
    n: "GAME 03",
    title: "NEON DRIFT RACER",
    tagline: "DRIFT. RACE. DOMINATE.",
    accent: "#f0369c",
    accentRGB: [0.94, 0.21, 0.61] as [number, number, number],
  },
] as const;
