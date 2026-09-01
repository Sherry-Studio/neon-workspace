import { T } from "./timeline";

/** Where the digital half of the journey is parked, far from the physical set. */
export const DIGITAL_ORIGIN: Vec3 = [0, -1000, 0];

/** Local z landmarks inside the digital half. */
export const Z = {
  tunnelIn: 4,
  tunnelOut: -40,
  cityIn: -46,
  cityOut: -96,
  spaceIn: -102,
  spaceOut: -152,
  trackIn: -158,
  trackOut: -212,
};

/** Screen centre of the cabinet, in world space. */
export const SCREEN_WORLD: Vec3 = [0, 0.85, 0.75];

export type Vec3 = [number, number, number];

const dig = (x: number, y: number, z: number): Vec3 => [
  DIGITAL_ORIGIN[0] + x,
  DIGITAL_ORIGIN[1] + y,
  DIGITAL_ORIGIN[2] + z,
];

export interface Key {
  p: number;
  pos: Vec3;
  look: Vec3;
  fov: number;
}

export interface Shot {
  name: string;
  from: number;
  to: number;
  keys: Key[];
}

/**
 * Three shots. The cuts between them land exactly on the screen-flash beats,
 * so the whole thing reads as one continuous move.
 */
export const SHOTS: Shot[] = [
  {
    name: "logo",
    from: 0,
    to: T.enterLogoEnd,
    keys: [
      // the sign is framed large from the first frame, as in the reference
      { p: 0.0, pos: [0, 0.02, 8.6], look: [0, 0.02, 0], fov: 34 },
      { p: T.voidEnd, pos: [0, 0.02, 8.4], look: [0, 0.02, 0], fov: 34 },
      { p: T.formEnd, pos: [0, 0.04, 7.9], look: [0, 0.04, 0], fov: 35 },
      { p: T.holdEnd, pos: [0, 0.05, 7.4], look: [0, 0.05, 0], fov: 36 },
      // drift onto the "O" of NEON, then straight through the glow
      { p: T.enterLogoStart + 0.05, pos: [0.25, 0.4, 4.2], look: [0.36, 0.84, 0], fov: 42 },
      { p: T.enterLogoEnd, pos: [0.36, 0.84, 0.15], look: [0.36, 0.84, -6], fov: 72 },
    ],
  },
  {
    name: "cabinet",
    from: T.enterLogoEnd,
    to: T.enterCrtEnd,
    keys: [
      { p: T.cabinetStart, pos: [0, 1.0, 8.6], look: [0, 0.7, 0], fov: 44 },
      { p: T.cabinetStart + 0.07, pos: [-3.4, 1.35, 6.6], look: [0, 0.85, 0.2], fov: 42 },
      { p: T.cabinetEnd, pos: [4.0, 1.5, 5.5], look: [0, 0.95, 0.3], fov: 40 },
      { p: T.crtStart + 0.05, pos: [1.7, 1.15, 3.9], look: [0, 0.88, 0.6], fov: 35 },
      { p: T.enterCrtStart, pos: [0, 0.9, 2.5], look: SCREEN_WORLD, fov: 30 },
      { p: T.enterCrtEnd, pos: [0, 0.86, 0.9], look: SCREEN_WORLD, fov: 19 },
    ],
  },
  {
    name: "digital",
    from: T.enterCrtEnd,
    to: 1.0,
    keys: [
      { p: T.enterCrtEnd, pos: dig(0, 0, Z.tunnelIn + 2), look: dig(0, 0, -20), fov: 62 },
      { p: T.tunnelEnd, pos: dig(0, 0, Z.tunnelOut + 2), look: dig(0, 0, Z.cityIn), fov: 52 },
      // NEON RUNNER — down the middle of the street
      { p: 0.87, pos: dig(0, 0.4, Z.cityIn - 18), look: dig(0, 0, Z.cityOut), fov: 50 },
      { p: 0.9, pos: dig(0, 0.8, Z.cityOut), look: dig(2, 1, Z.spaceIn), fov: 50 },
      // SPACE SHOOTER — banking past the planet
      { p: 0.935, pos: dig(-3, 1.5, Z.spaceIn - 20), look: dig(6, 3, Z.spaceOut), fov: 55 },
      { p: 0.955, pos: dig(0, 1.2, Z.spaceOut), look: dig(0, 0, Z.trackIn), fov: 52 },
      // DRIFT RACER — chasing the car through the corner
      { p: 0.98, pos: dig(2.5, 1.6, Z.trackIn - 22), look: dig(0, -1, Z.trackOut + 20), fov: 48 },
      { p: 1.0, pos: dig(-1.5, 1.2, Z.trackOut + 26), look: dig(0, -1.5, Z.trackOut), fov: 44 },
    ],
  },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function shotIndexAt(p: number) {
  const i = SHOTS.findIndex((s) => p >= s.from && p <= s.to);
  if (i !== -1) return i;
  return p < SHOTS[0].to ? 0 : SHOTS.length - 1;
}

/** Pure camera pose for a given journey progress. */
export function sampleCamera(p: number): { pos: Vec3; look: Vec3; fov: number; shot: number } {
  const si = shotIndexAt(p);
  const keys = SHOTS[si].keys;

  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (p >= keys[i].p && p <= keys[i + 1].p) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  if (p <= keys[0].p) b = keys[0];
  if (p >= keys[keys.length - 1].p) a = keys[keys.length - 1];

  const k = smooth(clamp01((p - a.p) / (b.p - a.p || 1)));
  const mix = (u: Vec3, v: Vec3): Vec3 => [
    u[0] + (v[0] - u[0]) * k,
    u[1] + (v[1] - u[1]) * k,
    u[2] + (v[2] - u[2]) * k,
  ];

  return {
    pos: mix(a.pos, b.pos),
    look: mix(a.look, b.look),
    fov: a.fov + (b.fov - a.fov) * k,
    shot: si,
  };
}
