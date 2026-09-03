"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import OrbitWorld from "./OrbitWorld";
import { SCALE } from "../orbit/config";
import type { OrbitBus } from "../orbit/bus";

export default function OrbitCanvas({
  bus,
  effects,
  onContextLost,
}: {
  bus: OrbitBus;
  effects: boolean;
  onContextLost?: () => void;
}) {
  return (
    <Canvas
      frameloop="always"
      dpr={[1, effects ? 1.75 : 1.4]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false, depth: true }}
      camera={{ position: [0, 40, 200], fov: 55, near: SCALE.near, far: SCALE.far }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener("webglcontextlost", () => onContextLost?.(), { once: true });
      }}
    >
      <OrbitWorld bus={bus} effects={effects} />
    </Canvas>
  );
}
