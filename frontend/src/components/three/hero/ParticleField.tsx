"use client";

import { MutableRefObject, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getBlend, PALETTE } from "@/lib/themeStore";
import { segment } from "@/hooks/useScrollProgress";
import { T } from "./timeline";

/**
 * The field of glowing fragments the wordmark appears to be made of.
 *
 * Genuinely volumetric: every particle has its own depth, size and colour, and
 * the cloud is simulated on the CPU so the cursor can shove it around with real
 * inertia and a spring back to rest. Point size attenuates with distance, so
 * depth reads correctly as the camera moves.
 */

/** Density falls off from the centre — dense on the logo, sparse outside. */
function scatter(i: number, n: number, out: THREE.Vector3) {
  const u = i / n;
  // golden-angle spiral distributes evenly without clumping
  const a = i * 2.399963;
  const r = Math.pow(u, 0.58) * 17;
  const squash = 0.46; // wider than tall, like the reference
  out.set(
    Math.cos(a) * r,
    Math.sin(a) * r * squash + (Math.random() - 0.5) * 1.6,
    (Math.random() - 0.5) * 13 - r * 0.26
  );
  return out;
}

export default function ParticleField({
  progressRef,
  count = 2600,
  reduced = false,
}: {
  progressRef: MutableRefObject<number>;
  count?: number;
  reduced?: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const { camera, pointer, size } = useThree();

  const tmp = useRef(new THREE.Vector3());
  const cursor = useRef(new THREE.Vector3(0, 0, 0));
  const cursorSmooth = useRef(new THREE.Vector3(0, 0, 0));
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const ray = useRef(new THREE.Raycaster());
  const startedAt = useRef(0);

  /* ── static buffers ─────────────────────────────────────────────────── */
  const { geometry, home, vel, seed, darkCol, lightCol } = useMemo(() => {
    const home = new Float32Array(count * 3);
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const aSize = new Float32Array(count);
    const darkCol = new Float32Array(count * 3);
    const lightCol = new Float32Array(count * 3);

    const v = new THREE.Vector3();
    const c = new THREE.Color();
    const dPal = PALETTE.dark.particles.map((h) => new THREE.Color(h));
    const lPal = PALETTE.light.particles.map((h) => new THREE.Color(h));

    for (let i = 0; i < count; i++) {
      scatter(i, count, v);
      const i3 = i * 3;
      home[i3] = pos[i3] = v.x;
      home[i3 + 1] = pos[i3 + 1] = v.y;
      home[i3 + 2] = pos[i3 + 2] = v.z;

      seed[i] = Math.random() * Math.PI * 2;

      // a few large fragments among many fine motes
      const roll = Math.random();
      aSize[i] =
        roll > 0.99
          ? 0.3 + Math.random() * 0.2 // rare large fragments
          : roll > 0.88
            ? 0.15 + Math.random() * 0.1 // mid shards
            : 0.05 + Math.random() * 0.075; // fine motes

      // magenta stays rare, so it reads as a highlight not a second brand colour
      const pick = roll > 0.97 ? 3 : Math.floor(Math.random() * 3);
      const near = 1 - Math.min(Math.hypot(v.x, v.y) / 17, 1);

      c.copy(dPal[Math.min(pick, dPal.length - 1)]).multiplyScalar(0.75 + near * 0.85);
      darkCol[i3] = c.r;
      darkCol[i3 + 1] = c.g;
      darkCol[i3 + 2] = c.b;

      c.copy(lPal[Math.min(pick, lPal.length - 1)]).multiplyScalar(0.7 + near * 0.4);
      lightCol[i3] = c.r;
      lightCol[i3 + 1] = c.g;
      lightCol[i3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(darkCol.slice(), 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    return { geometry, home, vel, seed, darkCol, lightCol };
  }, [count]);

  /* ── shader: soft round sprites, size attenuated by depth ───────────── */
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uOpacity: { value: 0 },
          uScale: { value: 900 },
          uSoft: { value: 1 },
        },
        vertexShader: `
          attribute vec3 aColor;
          attribute float aSize;
          varying vec3 vColor;
          varying float vFade;
          uniform float uScale;
          void main() {
            vColor = aColor;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            float dist = -mv.z;
            gl_PointSize = aSize * uScale / max(dist, 0.35);
            vFade = clamp(1.0 - (dist - 4.0) / 26.0, 0.12, 1.0);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vFade;
          uniform float uOpacity;
          uniform float uSoft;
          void main() {
            vec2 d = gl_PointCoord - vec2(0.5);
            float r = length(d);
            if (r > 0.5) discard;
            float core = smoothstep(0.5, 0.0, r);
            float glow = pow(core, mix(1.6, 3.0, uSoft));
            gl_FragColor = vec4(vColor, glow * vFade * uOpacity);
          }
        `,
      }),
    []
  );

  useFrame((state, dt) => {
    const g = points.current;
    if (!g) return;
    const d = Math.min(dt, 1 / 30); // keep the physics stable if a frame drops
    // wall clock for anything the viewer perceives as elapsed time
    const now = performance.now();
    if (!startedAt.current) startedAt.current = now;
    const t = (now - startedAt.current) / 1000;
    const p = progressRef.current;

    // the cloud belongs to the opening scenes only
    const alive = p < T.enterLogoEnd + 0.03;
    g.visible = alive;
    if (!alive) return;

    /* ── theme ── */
    const blend = getBlend();
    const colAttr = g.geometry.attributes.aColor as THREE.BufferAttribute;
    const dst = colAttr.array as Float32Array;
    for (let i = 0; i < dst.length; i++) {
      dst[i] = darkCol[i] + (lightCol[i] - darkCol[i]) * blend;
    }
    colAttr.needsUpdate = true;
    material.blending = blend > 0.5 ? THREE.NormalBlending : THREE.AdditiveBlending;
    material.uniforms.uSoft.value = 1 - blend * 0.55;
    material.uniforms.uScale.value = size.height * 1.15;

    /* ── emerge from the dark, then blow outward as we fly in ── */
    const emerge = Math.min(t / 2.2, 1);
    const expand = 1 + segment(p, T.holdStart, T.enterLogoEnd) * 1.9;
    const exit = 1 - segment(p, T.enterLogoStart + 0.03, T.enterLogoEnd);
    material.uniforms.uOpacity.value = emerge * exit * (blend > 0.5 ? 0.8 : 1);
    g.scale.setScalar(expand);

    /* ── cursor → a point in world space on the logo plane ── */
    if (!reduced) {
      ray.current.setFromCamera(pointer as THREE.Vector2, camera);
      const hit = ray.current.ray.intersectPlane(plane.current, tmp.current);
      if (hit) cursor.current.copy(hit);
    }
    // ease the force point so a fast flick doesn't tear the cloud apart
    cursorSmooth.current.lerp(cursor.current, reduced ? 1 : 0.18);
    const cx = cursorSmooth.current.x;
    const cy = cursorSmooth.current.y;

    /* ── simulate ── */
    const posAttr = g.geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;

    const R = 3.6; // influence radius
    const R2 = R * R;
    const push = reduced ? 0 : 46;
    const spring = 3.1;
    const damp = Math.pow(0.86, d * 60);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // rest position drifts gently, so the field is never static
      const s = seed[i];
      const hx = home[i3] + Math.sin(t * 0.32 + s) * 0.16;
      const hy = home[i3 + 1] + Math.cos(t * 0.27 + s * 1.3) * 0.16;
      const hz = home[i3 + 2] + Math.sin(t * 0.21 + s * 0.7) * 0.22;

      let vx = vel[i3];
      let vy = vel[i3 + 1];
      let vz = vel[i3 + 2];

      // spring back toward rest
      vx += (hx - pos[i3]) * spring * d;
      vy += (hy - pos[i3 + 1]) * spring * d;
      vz += (hz - pos[i3 + 2]) * spring * d;

      // cursor repulsion — smooth falloff, strongest at the centre
      if (push > 0) {
        const dx = pos[i3] - cx;
        const dy = pos[i3 + 1] - cy;
        const q = dx * dx + dy * dy;
        if (q < R2) {
          const dist = Math.sqrt(q) || 0.0001;
          const falloff = 1 - dist / R;
          const f = (falloff * falloff * push * d) / dist;
          vx += dx * f;
          vy += dy * f;
          // a nudge toward the viewer too, so the scatter reads as 3D
          vz += falloff * falloff * push * 0.16 * d;
        }
      }

      vx *= damp;
      vy *= damp;
      vz *= damp;

      vel[i3] = vx;
      vel[i3 + 1] = vy;
      vel[i3 + 2] = vz;

      pos[i3] += vx * d;
      pos[i3 + 1] += vy * d;
      pos[i3 + 2] += vz * d;
    }
    posAttr.needsUpdate = true;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
