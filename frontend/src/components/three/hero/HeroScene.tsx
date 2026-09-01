"use client";

import { MutableRefObject, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getBlend, PALETTE } from "@/lib/themeStore";
import Lighting from "./Lighting";
import NeonLogo from "./NeonLogo";
import ParticleField from "./ParticleField";
import ArcadeCabinet from "./ArcadeCabinet";
import DigitalWorlds from "./DigitalWorlds";
import Particles from "./Particles";
import CameraController from "./CameraController";

/**
 * Eases the whole environment between the two lighting worlds — background,
 * fog and floor all travel with the theme, so it reads as the room changing
 * its light rather than a CSS colour swap behind a static scene.
 */
function Environment() {
  const { scene } = useThree();
  const floor = useRef<THREE.MeshStandardMaterial>(null);

  const c = useMemo(
    () => ({
      bgD: new THREE.Color(PALETTE.dark.background),
      bgL: new THREE.Color(PALETTE.light.background),
      fogD: new THREE.Color(PALETTE.dark.fog),
      fogL: new THREE.Color(PALETTE.light.fog),
      floorD: new THREE.Color("#08090c"),
      floorL: new THREE.Color("#dfe4ec"),
      bg: new THREE.Color(PALETTE.dark.background),
      fog: new THREE.Color(PALETTE.dark.fog),
      fl: new THREE.Color("#08090c"),
    }),
    []
  );

  useFrame(() => {
    const b = getBlend();
    c.bg.copy(c.bgD).lerp(c.bgL, b);
    c.fog.copy(c.fogD).lerp(c.fogL, b);
    c.fl.copy(c.floorD).lerp(c.floorL, b);

    if (scene.background instanceof THREE.Color) scene.background.copy(c.bg);
    else scene.background = c.bg.clone();

    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(c.fog);
      fog.near = PALETTE.dark.fogNear + (PALETTE.light.fogNear - PALETTE.dark.fogNear) * b;
      fog.far = PALETTE.dark.fogFar + (PALETTE.light.fogFar - PALETTE.dark.fogFar) * b;
    }
    if (floor.current) {
      floor.current.color.copy(c.fl);
      floor.current.metalness = 0.55 - b * 0.35;
      floor.current.roughness = 0.42 + b * 0.35;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
      <planeGeometry args={[90, 90]} />
      <meshStandardMaterial ref={floor} color="#08090c" roughness={0.42} metalness={0.55} />
    </mesh>
  );
}

export default function HeroScene({
  progressRef,
  reduced = false,
  lowPower = false,
}: {
  progressRef: MutableRefObject<number>;
  reduced?: boolean;
  lowPower?: boolean;
}) {
  return (
    <Canvas
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0, 0.05, 15.5], fov: 28, near: 0.05, far: 400 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      <color attach="background" args={[PALETTE.dark.background]} />
      <fog attach="fog" args={[PALETTE.dark.fog, PALETTE.dark.fogNear, PALETTE.dark.fogFar]} />

      <Environment />
      <Lighting progressRef={progressRef} reduced={reduced} />

      {/* the cloud the wordmark is made of */}
      <ParticleField
        progressRef={progressRef}
        reduced={reduced}
        count={lowPower ? 900 : 2600}
      />
      <NeonLogo progressRef={progressRef} reduced={reduced} />

      <ArcadeCabinet progressRef={progressRef} reduced={reduced} />
      {!lowPower && <Particles progressRef={progressRef} count={reduced ? 50 : 110} />}

      <DigitalWorlds progressRef={progressRef} />

      <CameraController progressRef={progressRef} reduced={reduced} />
    </Canvas>
  );
}
