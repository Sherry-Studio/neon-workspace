/* ============================================================
   NEON ORBIT — tuning
   ------------------------------------------------------------
   Every feel number lives here. Systems read this; nothing here
   reads a system. Grouped by concern so flight, camera and the
   targeting foundation can each be dialled in isolation.
   ============================================================ */

type V3 = [number, number, number];

/** Cinematic scale. 1 unit ≈ 1 metre, distances dramatised. */
export const SCALE = {
  shipLength: 19, // GLBs normalised so their longest axis == a target size
  near: 1,
  far: 220_000,
};

/** GLB orientation fix for the fighter — verified in-browser (nose → −Z). */
export const SHIP_MODEL_ROTATION: V3 = [0, -Math.PI / 2, 0];

/* ---------------------------------------------------------------- FLIGHT */
export const FLIGHT = {
  /** speed you settle to at zero throttle — space, so you always drift a little */
  idleSpeed: 42,
  maxSpeed: 300,
  boostSpeed: 780,
  /** starting throttle (0..1) so you're moving the moment you take control */
  startThrottle: 0.5,
  /** how fast the held throttle follows W/S (per second, 0..1) */
  throttleRate: 0.8,

  /** how fast current speed chases the throttle target (exp λ) */
  accelLambda: 2.2,
  brakeLambda: 2.8,
  boostAccelLambda: 1.9,

  /** how fast the velocity vector re-aligns to the nose.
   *  high = tight/arcade, low = drifts through turns. Scales DOWN a little
   *  while turning hard so you can feel the ship carve. */
  velAlignLambda: 3.2,
  driftFromTurn: 0.55, // 0..1 — how much a hard turn loosens velAlign

  /** peak rotation rates at full stick (rad/s) — tuned for combat, not a sim */
  yawRate: 1.15,
  pitchRate: 1.05,
  rollRate: 2.2, // Q/E
  /** how fast angular velocity chases the requested rate (exp λ) — the
   *  single biggest "responsiveness" knob. Higher = snappier. */
  turnAccelLambda: 5.2,
  /** boost trades agility for speed: rates × this while boosting */
  boostTurnScale: 0.5,

  /** automatic bank into turns */
  maxBank: 0.52, // rad (~30°) — hard cap, never a barrel roll from steering
  bankFromYaw: 1.0,
  bankLambda: 6.0, // how quickly the bank forms / levels

  keyboardYawRate: 0.8, // A/D assist
  yawKeyLeadsBank: true,

  /** the universe curves you back this far out — never a wall; keeps float
   *  precision sane. You can still fly a very long way. */
  softBound: 34_000,
  softBoundPush: 0.28,
};

/* ---------------------------------------------------------------- INPUT */
export const INPUT = {
  sensitivity: 1.0, // global multiplier (user-tunable later)
  deadzone: 0.06, // centre band that reads as neutral
  expoX: 1.9, // yaw response curve — small = precise, large = aggressive
  expoY: 1.75, // pitch curve, a touch gentler

  /* Pointer Lock — relative movement builds a virtual cursor that eases back
     to centre slowly, so you can hold a turn but the ship self-stabilises. */
  lockGain: 0.0019, // movementX/Y → cursor units
  lockClamp: 1.0,
  lockRecenterLambda: 0.55, // ~1.8s time constant — gentle

  /* Virtual stick (no lock — trackpad / Safari / restricted): the pointer's
     position from screen centre IS the cursor. */
  stickSpan: 0.42, // fraction of half-viewport that maps to full deflection
  stickRecenterLambda: 9, // snaps back when the pointer leaves the surface
};

/* ---------------------------------------------------------------- CAMERA */
export const CAMERA = {
  distance: 34,
  height: 8,
  lookAhead: 58,
  lookUp: 2.5,

  posLagLambda: 4.0, // positional follow — tight enough to never feel detached
  rotLagLambda: 3.2, // orientation follow — the beat of lag you feel in a turn
  rollBleed: 0.35, // fraction of ship roll the camera shares

  turnLead: 4.0, // camera slides opposite a turn so you see into it
  turnLeadLambda: 3.0,

  baseFov: 58,
  boostFov: 26, // added at full boost
  speedFov: 0.02, // added per (unit/s) over cruise
  fovAttackLambda: 4.5, // FOV widens fast …
  fovReleaseLambda: 1.6, // … and narrows slowly

  boostPullback: 11, // extra follow distance at full boost
  boostShake: 0.14,
  /** weapon recoil kick decay (Phase 3 hooks it up; camera already reads it) */
  recoilDecay: 6,
};

/* ------------------------------------------------------ TARGETING (foundation) */
export const TARGETING = {
  /** the reticle trails the turn slightly — the classic "pipper lag" */
  reticleLagLambda: 7,
  reticleFromTurn: 0.32, // screen fraction the reticle drifts at full turn rate

  /* lock-on stubs — EnemySystem is empty for now, wired for Phase 3 */
  lockConeDot: 0.965, // how centred a target must be
  lockRange: 1100,
  lockSeconds: 1.2,
};

/* ---------------------------------------------------------------- CINEMATIC */
export const INTRO: {
  total: number;
  blackFade: [number, number];
  starsIn: [number, number];
  reveal: [number, number];
  titleIn: [number, number];
  titleOut: [number, number];
  promptIn: number;
  shipIn: [number, number];
  handoff: [number, number];
  skipAfter: number;
} = {
  total: 9.0,
  blackFade: [0.5, 2.2],
  starsIn: [0.8, 3.4],
  reveal: [1.6, 5.6],
  titleIn: [2.2, 3.6],
  titleOut: [6.4, 7.6],
  promptIn: 4.0,
  shipIn: [3.6, 7.6],
  handoff: [6.8, 9.0],
  skipAfter: 2.6,
};

/* ------------------------------------------------------ SCENE COMPOSITION
   Foreground → far. Every body has a reason to be where it is.
   Positions are world-space; the ship starts at the origin facing −Z. */
export const COMPOSITION: {
  /** derelict shuttles — scale reference + the astronaut's location */
  wrecks: { pos: V3; scale: number; tumble: number; astronaut?: boolean }[];
  moon: { pos: V3; radius: number };
  mars: { pos: V3; radius: number };
  earth: { pos: V3; radius: number };
  galaxy: { pos: V3; radius: number };
  blackHole: { pos: V3; radius: number };
} = {
  wrecks: [
    // close pass on the right — an EVA figure drifts at its hull (a discovery)
    { pos: [260, -40, -560], scale: 52, tumble: 0.02, astronaut: true },
    // a larger hulk further out, tumbling slowly — a navigation landmark
    { pos: [-900, 150, -2100], scale: 140, tumble: 0.01 },
  ],
  // near landmark — genuinely dwarfs the ship
  moon: { pos: [-3600, 1900, -10500], radius: 1500 },
  // opposite side, a reason to turn and fly the other way
  mars: { pos: [11000, -1100, -14000], radius: 2300 },
  // home — a pale blue dot, very far, small on screen
  earth: { pos: [6800, 3400, 22000], radius: 620 },
  // deep background — a whole galaxy, tiny and luminous
  galaxy: { pos: [17000, 6000, -60000], radius: 5200 },
  // the far draw — huge, dangerous, unreachable, off to one side
  blackHole: { pos: [-13000, -4200, -38000], radius: 7800 },
};
