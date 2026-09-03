/** Central tuning for HOOFBEAT — the medieval horse-riding city game. */

export const ASSETS = {
  city: "/models/horse-city/city.glb",
  girl: "/models/horse-city/girl.glb",
  horse: "/models/horse-city/horse.glb",
} as const;

/** Where things start in world space (metres). Tuned to the city GLB after import. */
export const SPAWN = {
  girl: [2, 3, 10] as [number, number, number],
  girlFacing: Math.PI, // radians, yaw
  horse: [-4, 3, -12] as [number, number, number],
  horseFacing: Math.PI * 0.5,
};

/** Safety floor height — the city mesh has gaps; nothing may fall below this. */
export const GROUND_Y = 2.98;

export const GIRL = {
  walkSpeed: 2.4, // m/s
  runSpeed: 6.0,
  accel: 14,
  decel: 18,
  turnLerp: 12, // rotation smoothing toward move dir
  jumpSpeed: 5.2,
  gravity: -18,
  radius: 0.34, // capsule radius for collision
  height: 1.7,
  mountRange: 2.6, // distance to horse that shows the prompt
};

export const HORSE = {
  gaits: {
    idle: { speed: 0, stride: 0 },
    walk: { speed: 2.6, stride: 1.7 },
    trot: { speed: 6.2, stride: 2.6 },
    gallop: { speed: 12.5, stride: 4.2 },
  },
  accel: 3.2, // m/s^2 — deliberately soft, it's an animal
  brake: 5.0,
  reverseSpeed: 1.6,
  // turn rate (rad/s) falls off with speed: sharp at a walk, wide at a gallop
  turnRateLow: 1.9,
  turnRateHigh: 0.5,
  turnLerp: 6,
  gravity: -18,
  jumpSpeed: 6.0,
  radius: 0.75,
  length: 2.4,
  saddleOffset: [0, 1.5, -0.1] as [number, number, number], // rider seat, local to horse
};

export const STAMINA = {
  max: 100,
  gallopDrain: 18, // per second
  trotDrain: 4,
  recover: 10, // per second at walk/idle
  gallopLockout: 25, // can't gallop again until stamina climbs back to this
};

export const CAMERA = {
  foot: { distance: 4.6, height: 1.75, fov: 55 },
  horse: { distance: 8.0, height: 2.6, fov: 60 },
  minPitch: -0.55,
  maxPitch: 1.15,
  followLerp: 6,
  rotateLerp: 14,
  transitionLerp: 3.5, // mount/dismount blend
  collisionRadius: 0.3,
  sensitivity: 0.0026,
};

/** Half-extents of the invisible play boundary, centred on origin. Tune to city. */
export const BOUNDS = { x: 44, z: 44 };

export type GameMode = "onfoot" | "mounting" | "riding" | "dismounting";
export type GaitName = keyof typeof HORSE.gaits;
