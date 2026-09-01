import * as THREE from "three";

const FONT = (px: number) =>
  `700 ${px}px "Space Grotesk", "Arial Narrow", Impact, sans-serif`;

export interface Glyph {
  char: string;
  texture: THREE.CanvasTexture;
  /** world-space size of the plane that carries this glyph */
  width: number;
  height: number;
  /** world-space x offset from the word's centre */
  x: number;
}

export type GlyphTheme = "dark" | "light";

/**
 * Renders one character as an illuminated 3D sign: an extruded body receding
 * down-right, a chrome/neon gradient face, a bright top bevel and an outer
 * bloom. Drawn per-glyph so letters can be lit, flickered and flown through
 * independently.
 */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  char: string,
  cx: number,
  cy: number,
  theme: GlyphTheme
) {
  const DEPTH = 16; // extrude steps
  const STEP = 0.85;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (theme === "dark") {
    /* 1 · outer bloom */
    ctx.save();
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 68;
    ctx.lineWidth = 16;
    ctx.strokeStyle = "rgba(45,200,235,0.62)";
    ctx.strokeText(char, cx, cy);
    ctx.strokeText(char, cx, cy);
    ctx.restore();

    /* 2 · extruded body, darkening as it recedes */
    for (let i = DEPTH; i >= 1; i--) {
      const k = i / DEPTH;
      ctx.fillStyle = `rgb(${Math.round(8 + 30 * (1 - k))},${Math.round(
        40 + 90 * (1 - k)
      )},${Math.round(55 + 110 * (1 - k))})`;
      ctx.fillText(char, cx + i * STEP, cy + i * STEP * 0.72);
    }

    /* 3 · the face — chrome white falling into cyan */
    const g = ctx.createLinearGradient(0, cy - 108, 0, cy + 108);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.36, "#e8fbff");
    g.addColorStop(0.52, "#a5e9f8");
    g.addColorStop(0.7, "#4fc9e8");
    g.addColorStop(1, "#bff0fb");
    ctx.fillStyle = g;
    ctx.fillText(char, cx, cy);

    /* 4 · top bevel highlight */
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const hl = ctx.createLinearGradient(0, cy - 108, 0, cy - 10);
    hl.addColorStop(0, "rgba(255,255,255,0.95)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    ctx.fillText(char, cx, cy);
    ctx.restore();

    /* 5 · crisp cyan rim */
    ctx.save();
    ctx.shadowColor = "#9beeff";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "rgba(210,250,255,0.9)";
    ctx.strokeText(char, cx, cy);
    ctx.restore();
    return;
  }

  /* ── LIGHT: the same sign under daylight — dark metal, soft cool glow ── */
  ctx.save();
  ctx.shadowColor = "rgba(8,145,178,0.55)";
  ctx.shadowBlur = 34;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(56,189,248,0.32)";
  ctx.strokeText(char, cx, cy);
  ctx.restore();

  for (let i = DEPTH; i >= 1; i--) {
    const k = i / DEPTH;
    ctx.fillStyle = `rgb(${Math.round(120 + 70 * k)},${Math.round(
      135 + 75 * k
    )},${Math.round(155 + 80 * k)})`;
    ctx.fillText(char, cx + i * STEP, cy + i * STEP * 0.72);
  }

  const g = ctx.createLinearGradient(0, cy - 108, 0, cy + 108);
  g.addColorStop(0, "#2b3646");
  g.addColorStop(0.42, "#141d29");
  g.addColorStop(0.62, "#0d1620");
  g.addColorStop(1, "#233346");
  ctx.fillStyle = g;
  ctx.fillText(char, cx, cy);

  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const hl = ctx.createLinearGradient(0, cy - 108, 0, cy - 4);
  hl.addColorStop(0, "rgba(190,225,245,0.85)");
  hl.addColorStop(1, "rgba(190,225,245,0)");
  ctx.fillStyle = hl;
  ctx.fillText(char, cx, cy);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgba(8,145,178,0.55)";
  ctx.strokeText(char, cx, cy);
  ctx.restore();
}

export function buildNeonWord(
  text: string,
  worldHeight: number,
  theme: GlyphTheme = "dark"
): { glyphs: Glyph[]; width: number } {
  const FONT_PX = 200;
  const PAD = 96; // room for glow + extrude without clipping

  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = FONT(FONT_PX);

  const chars = text.split("");
  const advances = chars.map((c) => measure.measureText(c).width);
  const totalAdvance = advances.reduce((a, b) => a + b, 0);

  const cellH = FONT_PX + PAD * 2;
  const scale = worldHeight / cellH;

  const glyphs: Glyph[] = [];
  let cursor = -totalAdvance / 2;

  chars.forEach((char, i) => {
    const advance = advances[i];
    const cw = Math.ceil(advance + PAD * 2);

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = cellH;
    const ctx = canvas.getContext("2d")!;
    ctx.font = FONT(FONT_PX);
    drawGlyph(ctx, char, cw / 2, cellH / 2, theme);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    glyphs.push({
      char,
      texture,
      width: cw * scale,
      height: cellH * scale,
      x: (cursor + advance / 2) * scale,
    });

    cursor += advance;
  });

  return { glyphs, width: totalAdvance * scale };
}

/**
 * Samples solid pixels of `text` to produce world-space points that particles
 * can fly to — this is the shape the logo assembles into.
 */
export function sampleTextPoints(
  lines: { text: string; y: number; width: number }[],
  perLine: number
): Float32Array {
  const FONT_PX = 150;
  const W = 1800;
  const H = 320;
  const out: number[] = [];

  for (const line of lines) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = FONT(FONT_PX);
    ctx.fillStyle = "#fff";
    ctx.fillText(line.text, W / 2, H / 2);

    const data = ctx.getImageData(0, 0, W, H).data;

    // collect lit pixels and their bounding box, so the sampled cloud can be
    // normalised to exactly the world width of the rendered glyphs
    const lit: number[] = [];
    let minX = W;
    let maxX = 0;
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        if (data[(y * W + x) * 4 + 3] > 128) {
          lit.push(x, y);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    if (!lit.length) continue;

    const pxWidth = Math.max(maxX - minX, 1);
    const scale = line.width / pxWidth;
    const cx = (minX + maxX) / 2;

    const count = lit.length / 2;
    for (let i = 0; i < perLine; i++) {
      const idx = Math.floor((i / perLine) * count) * 2;
      const px = lit[idx];
      const py = lit[idx + 1];
      out.push(
        (px - cx) * scale,
        line.y - (py - H / 2) * scale,
        (Math.random() - 0.5) * 0.08
      );
    }
  }

  return new Float32Array(out);
}
