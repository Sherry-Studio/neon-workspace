"use client";

import { MutableRefObject, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { range, segment, clamp } from "@/hooks/useScrollProgress";
import { getBlend } from "@/lib/themeStore";
import { T } from "./timeline";
import { buildNeonWord, sampleTextPoints, type Glyph } from "./neonText";

/* Sized so the wordmark fills most of the frame, as in the reference. */
const NEON_H = 2.25;
const ARCADE_H = 1.8;
const NEON_Y = 0.84;
const ARCADE_Y = -0.33;

/** How long the name takes to assemble itself when the site opens. */
const INTRO_SECONDS = 3.1;
/** How far particles scatter around their target while scrambling. */
const SCRAMBLE = 0.16;

/** deterministic pseudo-random so flicker is stable frame to frame */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export default function NeonLogo({
  progressRef,
  reduced = false,
}: {
  progressRef: MutableRefObject<number>;
  reduced?: boolean;
}) {
  const { camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const glow = useRef<THREE.PointLight>(null);
  const glow2 = useRef<THREE.PointLight>(null);
  const backing = useRef<THREE.Mesh>(null);
  /** wall-clock start of the title sequence */
  const startedAt = useRef(0);

  // ── letters, built once per theme treatment ──────────────────────────
  const words = useMemo(
    () => ({
      neonDark: buildNeonWord("NEON", NEON_H, "dark"),
      arcadeDark: buildNeonWord("ARCADE", ARCADE_H, "dark"),
      neonLight: buildNeonWord("NEON", NEON_H, "light"),
      arcadeLight: buildNeonWord("ARCADE", ARCADE_H, "light"),
    }),
    []
  );

  // one slot per letter, holding both treatments so they can crossfade
  const slots = useRef<{ dark: THREE.Mesh[]; light: THREE.Mesh[] }>({
    dark: [],
    light: [],
  });
  slots.current = { dark: [], light: [] };

  // ── particles that assemble into the wordmark ────────────────────────
  const { targets, starts, geometry } = useMemo(() => {
    const targets = sampleTextPoints(
      [
        { text: "NEON", y: NEON_Y, width: words.neonDark.width },
        { text: "ARCADE", y: ARCADE_Y, width: words.arcadeDark.width },
      ],
      700
    );
    const n = targets.length / 3;
    const starts = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 10;
      starts[i * 3] = Math.cos(a) * r;
      starts[i * 3 + 1] = (Math.random() - 0.5) * 9;
      starts[i * 3 + 2] = -6 - Math.random() * 14;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(starts.slice(), 3));
    return { targets, starts, geometry };
  }, [words]);

  useFrame(() => {
    const p = reduced ? 0.23 : progressRef.current;
    const blend = getBlend();

    // Wall-clock, not accumulated delta: if frames are dropped or the tab is
    // backgrounded while loading, the sequence still reads at the right point
    // when the viewer actually looks at it.
    const now = performance.now();
    if (!startedAt.current) startedAt.current = now;
    const t = (now - startedAt.current) / 1000;

    // ── overall visibility / camera pass-through ──────────────────────
    const through = segment(p, T.enterLogoStart, T.enterLogoEnd);
    const alive = p < T.enterLogoEnd + 0.02;
    if (group.current) {
      group.current.visible = alive;
      // the sign rushes past the camera as we fly into it
      group.current.position.z = through * 9;

      // Fit the wordmark to whatever aspect we are on. On a phone the frame is
      // far narrower than the desktop design, so the sign is scaled down to
      // keep the same generous margins rather than overflowing.
      const cam = camera as THREE.PerspectiveCamera;
      const dist = Math.max(cam.position.z, 0.5);
      const visibleW =
        2 * Math.tan((cam.fov * Math.PI) / 360) * dist * (size.width / size.height);
      const widest = Math.max(words.arcadeDark.width, words.neonDark.width);
      const fit = Math.min(1, (visibleW * 0.86) / widest);

      group.current.scale.setScalar(fit * (1 + through * 2.2));
    }
    if (points.current) points.current.visible = alive;
    if (!alive) {
      if (glow.current) glow.current.intensity = 0;
      if (glow2.current) glow2.current.intensity = 0;
      return;
    }

    // ── particle assembly ─────────────────────────────────────────────
    // Runs on a clock, not on scroll: the name assembles itself the moment
    // the site opens. Scroll only takes over for the fly-through later.
    const form = reduced ? 1 : clamp(t / INTRO_SECONDS);

    const pos = points.current?.geometry.attributes.position as
      | THREE.BufferAttribute
      | undefined;
    if (pos) {
      // the swarm settles out of a scramble in the last third of the intro
      const settle = clamp((form - 0.55) / 0.45);
      const scramble = (1 - settle * settle) * SCRAMBLE;

      const n = targets.length / 3;
      for (let i = 0; i < n; i++) {
        const delay = hash(i) * 0.4;
        const local = clamp((form - delay) / (1 - delay));
        const e = 1 - Math.pow(1 - local, 3); // easeOutCubic
        const i3 = i * 3;

        const swirl = (1 - e) * 0.5;
        const jx = Math.sin(t * 9 + i * 12.9898) * scramble;
        const jy = Math.cos(t * 11 + i * 78.233) * scramble;

        pos.array[i3] =
          starts[i3] +
          (targets[i3] - starts[i3]) * e +
          Math.sin(t * 1.4 + i) * swirl * 0.25 +
          jx;
        pos.array[i3 + 1] =
          starts[i3 + 1] +
          (targets[i3 + 1] - starts[i3 + 1]) * e +
          Math.cos(t * 1.2 + i) * swirl * 0.25 +
          jy;
        pos.array[i3 + 2] = starts[i3 + 2] + (targets[i3 + 2] - starts[i3 + 2]) * e;
      }
      pos.needsUpdate = true;
    }
    const pMat = points.current?.material as THREE.PointsMaterial | undefined;
    if (pMat) {
      const handover = clamp((form - 0.86) / 0.14);
      pMat.opacity = Math.min(form * 3, 1) * (1 - handover) * (1 - through);
      pMat.size = 0.03 - form * 0.009;
      pMat.color.setRGB(0.5 + 0.5 * (1 - blend), 0.85 - 0.35 * blend, 1 - 0.25 * blend);
      pMat.blending = blend > 0.5 ? THREE.NormalBlending : THREE.AdditiveBlending;
    }

    // ── per-letter power-on ───────────────────────────────────────────
    const { dark, light } = slots.current;
    const count = dark.length || 1;
    let litSum = 0;

    for (let i = 0; i < count; i++) {
      // letters ignite one after another, in a scrambled order, as the
      // particles settle — driven by the intro clock, not by scroll
      const order = hash(i + 11);
      const a = 0.6 + order * 0.3;
      const on = range(form, a, a + 0.14);

      // once on: a settled neon flicker, stronger right after ignition
      const justOn = 1 - range(form, a + 0.14, a + 0.34);
      const f = hash(Math.floor(t * 22) + i * 7) > 0.82 - justOn * 0.35 ? 0.55 : 1;
      const flicker = 1 - (1 - f) * (0.25 + justOn * 0.6);

      // light mode is a lit sign in daylight — it doesn't flicker as hard
      const lit = on * (flicker + (1 - flicker) * blend);
      litSum += lit;

      const dm = dark[i]?.material as THREE.MeshBasicMaterial | undefined;
      if (dm && dark[i]) {
        dm.opacity = lit * (1 - blend);
        dark[i].visible = dm.opacity > 0.002;
      }
      const lm = light[i]?.material as THREE.MeshBasicMaterial | undefined;
      if (lm && light[i]) {
        lm.opacity = lit * blend;
        light[i].visible = lm.opacity > 0.002;
      }
    }

    const litAvg = litSum / count;
    const bm = backing.current?.material as THREE.MeshBasicMaterial | undefined;
    if (bm) bm.opacity = litAvg * 0.13 * (1 - blend);

    if (glow.current) glow.current.intensity = litAvg * 26 * (1 - blend * 0.75);
    if (glow2.current) glow2.current.intensity = litAvg * 18 * (1 - blend * 0.75);
  });

  const renderWord = (
    darkWord: { glyphs: Glyph[] },
    lightWord: { glyphs: Glyph[] },
    y: number,
    key: string
  ) =>
    darkWord.glyphs.map((g, i) => {
      const lg = lightWord.glyphs[i];
      return (
        <group key={`${key}-${i}`} position={[g.x, y, 0]}>
          {/* the illuminated sign — dark treatment */}
          <mesh
            ref={(m) => {
              if (m) slots.current.dark.push(m);
            }}
          >
            <planeGeometry args={[g.width, g.height]} />
            <meshBasicMaterial
              map={g.texture}
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>

          {/* the same sign in daylight — normal blending so dark metal reads */}
          <mesh
            ref={(m) => {
              if (m) slots.current.light.push(m);
            }}
            position={[0, 0, 0.01]}
          >
            <planeGeometry args={[lg.width, lg.height]} />
            <meshBasicMaterial
              map={lg.texture}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      );
    });

  return (
    <group>
      <group ref={group}>
        <pointLight
          ref={glow}
          position={[0, NEON_Y, 1.4]}
          color="#22d3ee"
          intensity={0}
          distance={16}
          decay={2}
        />
        <pointLight
          ref={glow2}
          position={[0, ARCADE_Y, 1.4]}
          color="#67e8f9"
          intensity={0}
          distance={14}
          decay={2}
        />
        {/* one soft pool of light behind the whole sign */}
        <mesh ref={backing} position={[0, 0, -0.6]}>
          <planeGeometry args={[11, 6]} />
          <meshBasicMaterial
            color="#0e7f96"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        {renderWord(words.neonDark, words.neonLight, NEON_Y, "n")}
        {renderWord(words.arcadeDark, words.arcadeLight, ARCADE_Y, "a")}
      </group>

      <points ref={points} geometry={geometry}>
        <pointsMaterial
          size={0.028}
          color="#7fe9ff"
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}
