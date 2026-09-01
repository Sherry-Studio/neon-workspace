/**
 * Theme state that the WebGL scene can read every frame without React
 * re-rendering — and without relying on context crossing the R3F reconciler.
 *
 * `blend` is the animated value: 0 = fully dark, 1 = fully light. The provider
 * drives it; the 3D scene samples it in useFrame.
 */
export type Theme = "dark" | "light";

let blend = 0;
let theme: Theme = "dark";

export const getBlend = () => blend;
export const setBlend = (v: number) => {
  blend = v < 0 ? 0 : v > 1 ? 1 : v;
};

export const getThemeName = () => theme;
export const setThemeName = (t: Theme) => {
  theme = t;
};

/* ── palettes the 3D scene mixes between ───────────────────────────────── */

export interface ScenePalette {
  background: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  /** particle colours, sampled per-particle */
  particles: string[];
  /** overall particle brightness multiplier */
  particleIntensity: number;
  /** additive glow looks wrong on white — dial it back in light mode */
  additive: number;
  ambient: number;
  keyLight: string;
  rimLight: string;
}

export const PALETTE: Record<Theme, ScenePalette> = {
  dark: {
    background: "#040406",
    fog: "#040406",
    fogNear: 9,
    fogFar: 34,
    particles: ["#22d3ee", "#38bdf8", "#8b5cf6", "#c026d3", "#e0f7ff"],
    particleIntensity: 1,
    additive: 1,
    ambient: 0.02,
    keyLight: "#ffd7a3",
    rimLight: "#22d3ee",
  },
  light: {
    background: "#eef1f6",
    fog: "#eef1f6",
    fogNear: 11,
    fogFar: 40,
    particles: ["#0891b2", "#2563eb", "#7c3aed", "#db2777", "#64748b"],
    particleIntensity: 0.72,
    additive: 0,
    ambient: 0.55,
    keyLight: "#ffffff",
    rimLight: "#38bdf8",
  },
};
