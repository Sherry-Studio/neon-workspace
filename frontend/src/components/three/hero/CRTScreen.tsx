"use client";

import { MutableRefObject, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { range, segment } from "@/hooks/useScrollProgress";
import { T } from "./timeline";
import { createGameScreen } from "./GameScreen";

function makeScanlines() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 8;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, 4, 8);
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, 0, 4, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 150);
  return t;
}

/**
 * A slightly barrel-curved CRT face. Geometry is bent on the z axis so the
 * glass reads as physical when the camera swings past it.
 */
function curvedScreen(w: number, h: number, bulge: number) {
  const g = new THREE.PlaneGeometry(w, h, 24, 24);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2);
    const y = pos.getY(i) / (h / 2);
    pos.setZ(i, (1 - x * x) * (1 - y * y) * bulge);
  }
  g.computeVertexNormals();
  return g;
}

export default function CRTScreen({
  progressRef,
  width = 1.62,
  height = 1.24,
  reduced = false,
}: {
  progressRef: MutableRefObject<number>;
  width?: number;
  height?: number;
  reduced?: boolean;
}) {
  const game = useMemo(() => createGameScreen(), []);
  const scan = useMemo(() => makeScanlines(), []);
  const geo = useMemo(() => curvedScreen(width, height, 0.075), [width, height]);
  const scanGeo = useMemo(() => curvedScreen(width, height, 0.078), [width, height]);

  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.PointLight>(null);
  const t = useRef(0);

  useEffect(() => () => game.dispose(), [game]);

  useFrame((_, dt) => {
    t.current += dt;
    const p = reduced ? 0.6 : progressRef.current;

    const power = segment(p, T.crtStart, T.crtStart + 0.075);
    // the three previews cycle as the camera closes in on the glass
    const cycle = range(p, T.crtStart + 0.04, T.enterCrtEnd) * 2.999;

    game.update(t.current, power, cycle);

    if (mat.current) {
      const flick = 0.95 + Math.sin(t.current * 47) * 0.025 + Math.random() * 0.03;
      mat.current.color.setScalar(power * flick);
    }
    if (glow.current) glow.current.intensity = power * 22;
  });

  return (
    <group>
      <mesh geometry={geo} position={[0, 0, 0.015]}>
        <meshBasicMaterial ref={mat} map={game.texture} toneMapped={false} color="#000" />
      </mesh>

      <mesh geometry={scanGeo} position={[0, 0, 0.02]}>
        <meshBasicMaterial
          map={scan}
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.MultiplyBlending}
        />
      </mesh>

      {/* glass sheen */}
      <mesh geometry={scanGeo} position={[0, 0, 0.024]}>
        <meshBasicMaterial
          color="#8fe6ff"
          transparent
          opacity={0.045}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight ref={glow} position={[0, 0, 0.9]} color="#8fe6ff" intensity={0} distance={7} decay={2} />
    </group>
  );
}
