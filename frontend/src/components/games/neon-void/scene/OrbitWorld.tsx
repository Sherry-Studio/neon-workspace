"use client";

import { Suspense, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import Skybox from "./Skybox";
import Starfield from "./Starfield";
import SpeedLines from "./SpeedLines";
import Lighting from "./Lighting";
import { CoreBodies, WorldBodies } from "./CelestialBodies";
import Astronaut from "./Astronaut";
import PlayerShip from "./PlayerShip";
import GameRig from "./GameRig";
import type { OrbitBus } from "../orbit/bus";

function DevProbe() {
  const three = useThree();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __three?: unknown }).__three = three;
    }
  }, [three]);
  return null;
}

export default function OrbitWorld({ bus, effects }: { bus: OrbitBus; effects: boolean }) {
  const shipRef = useRef<THREE.Group>(null);
  return (
    <>
      <DevProbe />
      <Lighting />

      {/* core — blocks the first frame: skybox, ship, near landmarks */}
      <Suspense fallback={null}>
        <Skybox />
        <CoreBodies />
        <group ref={shipRef}>
          <PlayerShip bus={bus} />
        </group>
      </Suspense>

      {/* world — streams in during the cinematic, no pop of the whole scene */}
      <Suspense fallback={null}>
        <WorldBodies />
      </Suspense>

      {/* mission-tier discovery — the astronaut, heaviest asset, last */}
      <Suspense fallback={null}>
        <Astronaut />
      </Suspense>

      <Starfield />
      <SpeedLines bus={bus} quality={effects ? "high" : "low"} />
      <GameRig bus={bus} shipRef={shipRef} />

      {effects && (
        <Suspense fallback={null}>
          <EffectComposer>
            <Bloom intensity={0.6} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur />
            <Vignette eskil={false} offset={0.2} darkness={0.9} />
          </EffectComposer>
        </Suspense>
      )}
    </>
  );
}
