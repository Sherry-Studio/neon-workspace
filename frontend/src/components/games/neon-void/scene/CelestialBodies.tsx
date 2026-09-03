"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Fitted } from "./lib";
import { COMPOSITION } from "../orbit/config";
import type { AssetId } from "../orbit/assets";

/* soft circular falloff for glows that must not read as a hard quad */
function useRadialTexture(inner = "rgba(210,225,255,0.9)", outer = "rgba(150,180,255,0)") {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.32)"));
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [inner, outer]);
}

function Body({
  id,
  pos,
  radius,
  spin,
  tilt = 0.35,
}: {
  id: AssetId;
  pos: [number, number, number];
  radius: number;
  spin: number;
  tilt?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += spin * dt;
  });
  return (
    <group position={pos} rotation={[tilt, 0, 0.08]}>
      <Fitted ref={ref} id={id} size={radius * 2} />
    </group>
  );
}

/* -------------------- CORE — moon + black hole (block the intro) */
function BlackHole() {
  const bh = COMPOSITION.blackHole;
  const face = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const tex = useRadialTexture("rgba(255,214,170,0.9)", "rgba(210,150,110,0)");
  const tilt = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0, 0.12)), []);

  useFrame((state) => {
    // the accretion disk always presents its face (+ a fixed tilt for depth) —
    // a distant object, so you never notice it isn't parallaxing
    if (face.current) {
      face.current.quaternion.copy(state.camera.quaternion).multiply(tilt);
    }
    if (spin.current) spin.current.rotation.z += 0.0006;
    if (glow.current) glow.current.quaternion.copy(state.camera.quaternion);
  });

  return (
    <group position={bh.pos}>
      <mesh ref={glow}>
        <planeGeometry args={[bh.radius * 5, bh.radius * 5]} />
        <meshBasicMaterial map={tex} transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={face}>
        <group ref={spin}>
          <Fitted id="blackHole" size={bh.radius * 2} hide={/light\d|blackoutside/i} />
        </group>
        {/* the void itself — a hard black disc the accretion ring wraps */}
        <mesh position={[0, 0, 1]}>
          <circleGeometry args={[bh.radius * 0.32, 48]} />
          <meshBasicMaterial color="#000000" toneMapped={false} />
        </mesh>
      </group>
      <pointLight color="#ffb884" intensity={3} distance={bh.radius * 42} decay={1.4} />
    </group>
  );
}

export function CoreBodies() {
  return (
    <>
      <Body id="moon" pos={COMPOSITION.moon.pos} radius={COMPOSITION.moon.radius} spin={0.004} />
      <BlackHole />
    </>
  );
}

/* -------------------- WORLD — mars, earth, galaxy, wrecks (stream in) */
function Wreck({ pos, scale, tumble }: { pos: [number, number, number]; scale: number; tumble: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += tumble * dt;
    ref.current.rotation.y += tumble * 0.6 * dt;
  });
  return (
    <group position={pos}>
      <Fitted ref={ref} id="shuttle" size={scale} rotation={[0.4, 1.1, 0.6]} />
    </group>
  );
}

function Galaxy() {
  const { pos, radius } = COMPOSITION.galaxy;
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.008;
  });
  return (
    <group position={pos} rotation={[1.1, 0.4, 0]}>
      <Fitted ref={ref} id="galaxy" size={radius * 2} envMap={0} />
    </group>
  );
}

export function WorldBodies() {
  return (
    <>
      <Body id="mars" pos={COMPOSITION.mars.pos} radius={COMPOSITION.mars.radius} spin={0.003} tilt={0.25} />
      <Body id="earth" pos={COMPOSITION.earth.pos} radius={COMPOSITION.earth.radius} spin={0.006} tilt={0.4} />
      <Galaxy />
      {COMPOSITION.wrecks.map((w, i) => (
        <Wreck key={i} pos={w.pos} scale={w.scale} tumble={w.tumble} />
      ))}
    </>
  );
}
