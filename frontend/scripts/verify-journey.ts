/**
 * Deterministic check of the hero journey's choreography.
 * Run: node --experimental-strip-types scripts/verify-journey.ts
 *
 * This verifies the maths that scroll drives — camera path, scene windows and
 * overlay timing — without needing a browser, a GPU or a render loop.
 */
import { T, WORLDS } from "../src/components/three/hero/timeline";
import { SHOTS, sampleCamera, shotIndexAt } from "../src/components/three/hero/cameraPath";

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.log(`  FAIL  ${msg}`);
  } else {
    console.log(`  ok    ${msg}`);
  }
};

const dist = (a: number[], b: number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// ── 1 · the timeline must be strictly ordered with no zero-width scenes ──
console.log("\nTIMELINE");
const beats = Object.entries(T) as [string, number][];
for (let i = 1; i < beats.length; i++) {
  const [pn, pv] = beats[i - 1];
  const [cn, cv] = beats[i];
  ok(cv >= pv, `${pn}(${pv}) <= ${cn}(${cv})`);
}
const scenes: [string, number, number][] = [
  ["void", T.voidStart, T.voidEnd],
  ["form", T.formStart, T.formEnd],
  ["hold", T.holdStart, T.holdEnd],
  ["enterLogo", T.enterLogoStart, T.enterLogoEnd],
  ["cabinet", T.cabinetStart, T.cabinetEnd],
  ["crt", T.crtStart, T.crtEnd],
  ["enterCrt", T.enterCrtStart, T.enterCrtEnd],
  ["tunnel", T.tunnelStart, T.tunnelEnd],
  ["worlds", T.worldsStart, T.worldsEnd],
];
for (const [n, a, b] of scenes) ok(b - a >= 0.05, `scene "${n}" spans ${(b - a).toFixed(3)} (>= 0.05)`);
ok(T.worldsEnd === 1, "journey ends at 1.0");

// ── 2 · every shot must be reachable and cover its range ──
console.log("\nSHOTS");
for (const s of SHOTS) {
  const mid = (s.from + s.to) / 2;
  ok(SHOTS[shotIndexAt(mid)].name === s.name, `"${s.name}" is selected at p=${mid.toFixed(2)}`);
  const sorted = s.keys.every((k, i) => i === 0 || k.p >= s.keys[i - 1].p);
  ok(sorted, `"${s.name}" keyframes are in order`);
}
ok(SHOTS.length === 3, "three shots (logo · cabinet · digital)");

// ── 3 · the camera must actually MOVE across every scene ──
console.log("\nCAMERA MOTION");
// The opening scenes deliberately hold a near-static frame: the reference
// composition wants the sign large and steady, with life coming from the
// particles, the light and pointer parallax rather than a travelling camera.
// The transition scenes still have to genuinely move.
const MIN_TRAVEL: Record<string, number> = {
  void: 0.1,
  form: 0.3,
  hold: 0.3,
  enterLogo: 1,
  cabinet: 1,
  crt: 1,
  enterCrt: 1,
  tunnel: 5,
  worlds: 5,
};
for (const [n, a, b] of scenes) {
  const A = sampleCamera(a + (b - a) * 0.05);
  const B = sampleCamera(a + (b - a) * 0.95);
  const d = dist(A.pos, B.pos);
  const min = MIN_TRAVEL[n] ?? 0.4;
  ok(d >= min, `camera travels ${d.toFixed(2)} units during "${n}" (min ${min})`);
}

// ── 4 · progress must never produce a stuck camera ──
console.log("\nCONTINUITY");
let prev = sampleCamera(0);
let stuck = 0;
let maxJump = 0;
let jumpAt = 0;
for (let i = 1; i <= 400; i++) {
  const p = i / 400;
  const cur = sampleCamera(p);
  const d = dist(prev.pos, cur.pos);
  if (d < 1e-6) stuck++;
  // jumps are only allowed where a shot changes (hidden by the flash)
  if (cur.shot === prev.shot && d > maxJump) {
    maxJump = d;
    jumpAt = p;
  }
  prev = cur;
}
ok(stuck < 20, `camera is static on only ${stuck}/400 steps`);
ok(maxJump < 30, `largest in-shot step is ${maxJump.toFixed(2)} at p=${jumpAt.toFixed(2)}`);

// ── 5 · shot cuts must coincide with the flash beats ──
console.log("\nCUTS");
const cuts: number[] = [];
for (let i = 1; i <= 2000; i++) {
  const p = i / 2000;
  if (shotIndexAt(p) !== shotIndexAt((i - 1) / 2000)) cuts.push(p);
}
ok(cuts.length === 2, `exactly 2 cuts, found ${cuts.length}`);
ok(
  cuts.some((c) => Math.abs(c - T.enterLogoEnd) < 0.01),
  `cut 1 lands on enterLogoEnd (${T.enterLogoEnd})`
);
ok(
  cuts.some((c) => Math.abs(c - T.enterCrtEnd) < 0.01),
  `cut 2 lands on enterCrtEnd (${T.enterCrtEnd})`
);

// ── 6 · each world gets its own on-screen window ──
console.log("\nWORLDS");
const span = (T.worldsEnd - T.worldsStart) / 3;
const segment = (x: number, a: number, b: number) => {
  const t = Math.min(Math.max((x - a) / (b - a || 1), 0), 1);
  return t * t * (3 - 2 * t);
};
const worldOpacity = (i: number, p: number) => {
  const a = T.worldsStart + i * span;
  return (
    segment(p, a + span * 0.06, a + span * 0.3) *
    (1 - segment(p, a + span * 0.74, a + span * 0.98))
  );
};
WORLDS.forEach((w, i) => {
  const centre = T.worldsStart + span * (i + 0.5);
  const mine = worldOpacity(i, centre);
  const others = WORLDS.map((_, j) => (j === i ? 0 : worldOpacity(j, centre)));
  ok(mine > 0.9, `${w.title} is fully visible at its centre (${mine.toFixed(2)})`);
  ok(Math.max(...others) < 0.15, `${w.title} does not overlap its neighbours`);
});

console.log(
  failures === 0
    ? "\nJOURNEY OK — all checks passed\n"
    : `\n${failures} CHECK(S) FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
