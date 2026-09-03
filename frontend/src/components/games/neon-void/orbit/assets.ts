import { useGLTF } from "@react-three/drei";

/* ============================================================
   NEON ORBIT — asset registry
   ------------------------------------------------------------
   Every GLB is declared here once, classified, and given a
   load tier. Components ask for assets by id — never by path.
   All GLBs: meshopt geometry + webp textures (drei bundles the
   meshopt decoder, so useDraco is off everywhere).
   ============================================================ */

const BASE = "/models/neon-orbit";

export type AssetCategory =
  | "player"
  | "celestial"
  | "environment"
  | "character"
  | "spacecraft"
  | "special";

/** core  — loaded before first frame (blocks the intro)
 *  world — streamed in during the cinematic, pops in when ready
 *  mission — only pulled when a mission/area needs it */
export type LoadTier = "core" | "world" | "mission";

export interface AssetDef {
  id: string;
  url: string;
  category: AssetCategory;
  tier: LoadTier;
  note: string;
}

export const ASSETS = {
  ship: {
    id: "ship",
    url: `${BASE}/ship.glb`,
    category: "player",
    tier: "core",
    note: "the player's fighter — the centrepiece",
  },
  skybox: {
    id: "skybox",
    url: `${BASE}/skybox.jpg`,
    category: "special",
    tier: "core",
    note: "Milky-Way equirect panorama — the world background + soft IBL",
  },
  moon: {
    id: "moon",
    url: `${BASE}/moon.glb`,
    category: "celestial",
    tier: "core",
    note: "the near landmark — genuinely dwarfs the ship",
  },
  blackHole: {
    id: "blackHole",
    url: `${BASE}/black-hole.glb`,
    category: "special",
    tier: "core",
    note: "the far draw — event horizon, accretion rings, distortion. Unreachable.",
  },
  mars: {
    id: "mars",
    url: `${BASE}/mars.glb`,
    category: "celestial",
    tier: "world",
    note: "opposite side of the field — a reason to turn and fly the other way",
  },
  earth: {
    id: "earth",
    url: `${BASE}/earth.glb`,
    category: "celestial",
    tier: "world",
    note: "home — a small pale dot, very far behind you",
  },
  galaxy: {
    id: "galaxy",
    url: `${BASE}/galaxy.glb`,
    category: "special",
    tier: "world",
    note: "a whole spiral galaxy in the deep background — tiny, luminous",
  },
  shuttle: {
    id: "shuttle",
    url: `${BASE}/shuttle.glb`,
    category: "spacecraft",
    tier: "world",
    note: "derelict shuttle — the drifting wrecks / scale reference",
  },
  astronaut: {
    id: "astronaut",
    url: `${BASE}/astronaut.glb`,
    category: "character",
    tier: "mission",
    note: "a lone EVA figure adrift at the near wreck — a discovery point, not gameplay yet",
  },
  // jupiter: RESERVED — source is a 721k-triangle mesh that won't decimate
  // cleanly; needs a proper re-topo in Blender before it's web-safe. Reserved
  // for a later mission area.
} as const satisfies Record<string, AssetDef>;

export type AssetId = keyof typeof ASSETS;

export const SKYBOX = ASSETS.skybox.url;

export const asset = (id: AssetId): AssetDef => ASSETS[id];
export const assetsByTier = (tier: LoadTier): AssetDef[] =>
  Object.values(ASSETS).filter((a) => a.tier === tier && !a.url.endsWith(".jpg"));

/** load a GLB scene by id (meshopt on, draco off) */
export const useModel = (id: AssetId) => useGLTF(ASSETS[id].url, false, true);

export function preloadTier(tier: LoadTier) {
  assetsByTier(tier).forEach((a) => useGLTF.preload(a.url, false, true));
}
