import * as THREE from "three";

const W = 640;
const H = 480;

type Ctx = CanvasRenderingContext2D;

/* ────────────────────────── GAME 01 · NEON RUNNER ────────────────────────── */
function drawRunner(ctx: Ctx, t: number) {
  const horizon = H * 0.44;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#070a18");
  sky.addColorStop(1, "#2a1550");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);

  // sun
  ctx.fillStyle = "#ff4d6d";
  ctx.beginPath();
  ctx.arc(W / 2, horizon + 8, 62, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#070a18";
  for (let i = 0; i < 6; i++) ctx.fillRect(W / 2 - 70, horizon - 44 + i * 10, 140, 4);

  // parallax skyline
  for (let layer = 0; layer < 3; layer++) {
    const d = 0.4 + layer * 0.3;
    ctx.fillStyle = ["#12183a", "#0d1330", "#080c22"][layer];
    const speed = 22 * d;
    const off = (t * speed) % 90;
    for (let i = -1; i < 10; i++) {
      const x = i * 90 - off;
      const h = 40 + ((i * 37 + layer * 13) % 9) * 11 * d;
      ctx.fillRect(x, horizon - h, 62, h);
      // lit windows
      ctx.fillStyle = layer === 2 ? "rgba(34,211,238,0.5)" : "rgba(34,211,238,0.18)";
      for (let wy = 0; wy < h - 12; wy += 14)
        for (let wx = 0; wx < 46; wx += 16)
          if ((i * 7 + wy + wx) % 3 === 0) ctx.fillRect(x + 8 + wx, horizon - h + 8 + wy, 6, 7);
      ctx.fillStyle = ["#12183a", "#0d1330", "#080c22"][layer];
    }
  }

  // road
  ctx.fillStyle = "#05060d";
  ctx.fillRect(0, horizon, W, H - horizon);

  ctx.strokeStyle = "rgba(34,211,238,0.85)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const k = (i / 12 + ((t * 0.55) % (1 / 12))) % 1;
    const y = horizon + Math.pow(k, 2.4) * (H - horizon);
    ctx.globalAlpha = k;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 16, horizon);
    ctx.lineTo(W / 2 + i * 150, H);
    ctx.stroke();
  }

  // runner
  const jump = Math.max(0, Math.sin(t * 3.1)) * 54;
  const rx = W / 2 - 90;
  const ry = horizon + 132 - jump;
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#eafdff";
  ctx.fillRect(rx, ry - 34, 15, 34);
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(rx - 4, ry - 40, 23, 8);
  const legs = Math.sin(t * 16) * 8;
  ctx.fillStyle = "#eafdff";
  ctx.fillRect(rx + 2, ry, 5, 12 + legs);
  ctx.fillRect(rx + 9, ry, 5, 12 - legs);
  ctx.shadowBlur = 0;

  // obstacles
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.42 + i * 0.33) % 1);
    const y = horizon + Math.pow(k, 2.4) * (H - horizon);
    const s = Math.pow(k, 2.2) * 46 + 4;
    ctx.fillStyle = "#f0369c";
    ctx.shadowColor = "#f0369c";
    ctx.shadowBlur = 16;
    ctx.fillRect(W / 2 + 40 * (k * 4) - s / 2, y - s, s, s);
    ctx.shadowBlur = 0;
  }
}

/* ─────────────────────── GAME 02 · NEON SPACE SHOOTER ─────────────────────── */
function drawShooter(ctx: Ctx, t: number) {
  ctx.fillStyle = "#03040c";
  ctx.fillRect(0, 0, W, H);

  // starfield
  for (let i = 0; i < 90; i++) {
    const sp = 20 + (i % 5) * 42;
    const x = (i * 97) % W;
    const y = ((i * 61 + t * sp) % (H + 20)) - 10;
    const s = (i % 5) * 0.35 + 0.6;
    ctx.fillStyle = i % 7 === 0 ? "rgba(168,85,247,0.9)" : `rgba(200,235,255,${0.25 + (i % 4) * 0.2})`;
    ctx.fillRect(x, y, s, s * 2.4);
  }

  // planet
  const px = W * 0.76;
  const py = H * 0.26;
  const g = ctx.createRadialGradient(px - 18, py - 18, 6, px, py, 66);
  g.addColorStop(0, "#7c3aed");
  g.addColorStop(0.6, "#3b1d73");
  g.addColorStop(1, "#0a0620");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, py, 62, 0, Math.PI * 2);
  ctx.fill();

  // ship
  const sx = W / 2 + Math.sin(t * 1.1) * 110;
  const sy = H - 92;
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#eafdff";
  ctx.beginPath();
  ctx.moveTo(sx, sy - 26);
  ctx.lineTo(sx + 19, sy + 16);
  ctx.lineTo(sx, sy + 6);
  ctx.lineTo(sx - 19, sy + 16);
  ctx.closePath();
  ctx.fill();
  // thruster
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(sx - 5, sy + 6, 10, 12 + Math.sin(t * 28) * 7);
  ctx.shadowBlur = 0;

  // lasers
  for (let i = 0; i < 5; i++) {
    const k = (t * 1.7 + i * 0.2) % 1;
    const ly = sy - 26 - k * (H * 0.8);
    ctx.fillStyle = `rgba(34,211,238,${1 - k})`;
    ctx.fillRect(sx - 1.5, ly, 3, 22);
  }

  // enemies
  for (let i = 0; i < 5; i++) {
    const ex = 70 + i * 125 + Math.sin(t * 0.8 + i) * 26;
    const ey = 96 + Math.sin(t * 1.3 + i * 1.7) * 26;
    ctx.strokeStyle = "#f0369c";
    ctx.shadowColor = "#f0369c";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ex - 17, ey);
    ctx.lineTo(ex, ey + 13);
    ctx.lineTo(ex + 17, ey);
    ctx.lineTo(ex, ey - 8);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

/* ──────────────────────── GAME 03 · NEON DRIFT RACER ──────────────────────── */
function drawRacer(ctx: Ctx, t: number) {
  const horizon = H * 0.38;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#0b0420");
  sky.addColorStop(1, "#5c1140");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon);

  ctx.fillStyle = "#08070f";
  ctx.fillRect(0, horizon, W, H - horizon);

  // curving track
  const curve = Math.sin(t * 0.62) * 190;
  for (let i = 0; i < 26; i++) {
    const k = i / 26;
    const y = horizon + Math.pow(k, 2.1) * (H - horizon);
    const w = 26 + Math.pow(k, 2.1) * 620;
    const cx = W / 2 + curve * Math.pow(k, 2.4);
    ctx.fillStyle = i % 2 ? "#12101f" : "#0d0b18";
    const nk = (i + 1) / 26;
    const ny = horizon + Math.pow(nk, 2.1) * (H - horizon);
    const nw = 26 + Math.pow(nk, 2.1) * 620;
    const ncx = W / 2 + curve * Math.pow(nk, 2.4);
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, y);
    ctx.lineTo(cx + w / 2, y);
    ctx.lineTo(ncx + nw / 2, ny);
    ctx.lineTo(ncx - nw / 2, ny);
    ctx.closePath();
    ctx.fill();

    // glowing edges
    ctx.strokeStyle = i % 2 ? "rgba(240,54,156,0.9)" : "rgba(34,211,238,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, y);
    ctx.lineTo(ncx - nw / 2, ny);
    ctx.moveTo(cx + w / 2, y);
    ctx.lineTo(ncx + nw / 2, ny);
    ctx.stroke();
  }

  // drifting car
  const drift = Math.sin(t * 0.62) * 60;
  const cx = W / 2 + drift;
  const cy = H - 96;

  // light trails
  for (let i = 1; i < 9; i++) {
    ctx.fillStyle = `rgba(240,54,156,${0.22 / i})`;
    ctx.fillRect(cx - 44 - i * 7 + drift * i * 0.1, cy + 12, 88, 9);
  }
  // smoke
  for (let i = 0; i < 7; i++) {
    const k = ((t * 1.5 + i * 0.14) % 1);
    ctx.fillStyle = `rgba(190,200,230,${0.18 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(cx - 40 - k * 90, cy + 22 - k * 14, 5 + k * 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = "#f0369c";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#f5f7ff";
  ctx.beginPath();
  ctx.moveTo(cx - 44, cy + 16);
  ctx.lineTo(cx - 32, cy - 14);
  ctx.lineTo(cx + 32, cy - 14);
  ctx.lineTo(cx + 44, cy + 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(cx - 26, cy - 10, 52, 11);
  ctx.shadowBlur = 0;
}

const GAMES = [drawRunner, drawShooter, drawRacer];
const LABELS = ["NEON RUNNER", "NEON SPACE SHOOTER", "NEON DRIFT RACER"];

/**
 * The CRT's picture: three arcade previews, plus power-on, glitch and
 * chromatic aberration baked into the canvas.
 */
export function createGameScreen() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // offscreen buffer we can re-composite with an RGB split
  const buf = document.createElement("canvas");
  buf.width = W;
  buf.height = H;
  const bctx = buf.getContext("2d")!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  /**
   * @param t     seconds
   * @param power 0..1 CRT warm-up
   * @param game  which preview (float — whole numbers select, it hard-cuts
   *              with a glitch band between games like a real attract mode)
   */
  function update(t: number, power: number, game: number) {
    // ── power-on: black → hot horizontal line → full picture ──
    if (power < 0.32) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);
      if (power > 0.05) {
        const k = (power - 0.05) / 0.27;
        const halfH = Math.pow(k, 3) * (H / 2);
        const bright = 1 - k * 0.35;
        ctx.fillStyle = `rgba(190,250,255,${bright})`;
        ctx.fillRect(0, H / 2 - Math.max(halfH, 1.2), W, Math.max(halfH * 2, 2.4));
      }
      texture.needsUpdate = true;
      return;
    }

    const on = Math.min((power - 0.32) / 0.25, 1);
    const idx = Math.min(Math.max(Math.round(game), 0), GAMES.length - 1);

    bctx.fillStyle = "#05060d";
    bctx.fillRect(0, 0, W, H);
    GAMES[idx](bctx, t);

    // ── HUD ──
    bctx.font = "600 15px 'Space Grotesk', monospace";
    bctx.fillStyle = "rgba(234,253,255,0.92)";
    bctx.textAlign = "left";
    bctx.fillText(`GAME 0${idx + 1}`, 18, 30);
    bctx.font = "600 13px 'Space Grotesk', monospace";
    bctx.fillStyle = "rgba(34,211,238,0.95)";
    bctx.fillText(LABELS[idx], 18, 50);
    bctx.textAlign = "right";
    bctx.fillStyle = "rgba(234,253,255,0.85)";
    bctx.fillText(String(Math.floor(t * 213) % 100000).padStart(6, "0"), W - 18, 30);
    bctx.textAlign = "left";
    if (Math.sin(t * 4) > 0) {
      bctx.fillStyle = "rgba(234,253,255,0.75)";
      bctx.font = "600 13px 'Space Grotesk', monospace";
      bctx.textAlign = "center";
      bctx.fillText("INSERT COIN", W / 2, H - 22);
      bctx.textAlign = "left";
    }

    // ── composite with chromatic aberration ──
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const ab = 1.6 + Math.sin(t * 0.8) * 0.6;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.85;
    ctx.filter = "url(#none)";
    // cheap RGB split: draw the buffer three times, offset, tinted by channel
    ctx.drawImage(buf, -ab, 0);
    ctx.drawImage(buf, 0, 0);
    ctx.drawImage(buf, ab, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // ── occasional glitch bands ──
    const gl = Math.sin(t * 0.9) > 0.93 || Math.sin(t * 3.7) > 0.985;
    if (gl) {
      for (let i = 0; i < 4; i++) {
        const y = Math.random() * H;
        const h = 4 + Math.random() * 18;
        const dx = (Math.random() - 0.5) * 40;
        ctx.drawImage(buf, 0, y, W, h, dx, y, W, h);
      }
    }

    // ── warm-up veil ──
    if (on < 1) {
      ctx.fillStyle = `rgba(0,0,0,${1 - on})`;
      ctx.fillRect(0, 0, W, H);
    }

    texture.needsUpdate = true;
  }

  return { texture, update, dispose: () => texture.dispose() };
}
