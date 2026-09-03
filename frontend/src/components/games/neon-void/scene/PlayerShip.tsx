"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Fitted } from "./lib";
import { SCALE, SHIP_MODEL_ROTATION } from "../orbit/config";
import type { OrbitBus } from "../orbit/bus";

const CYAN = "#66d9e8";

/** The centrepiece. GLB fighter, nose corrected to −Z, with an engine plume
 *  that answers the VFXSystem drive. Banking is free — the flight quaternion
 *  is copied onto the parent group by GameRig. */
export default function PlayerShip({ bus }: { bus: OrbitBus }) {
  const plume = useRef<THREE.Mesh>(null);
  const plumeMat = useRef<THREE.MeshBasicMaterial>(null);
  const core = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const flick = useRef(0);
  const L = SCALE.shipLength;

  useFrame((_, dt) => {
    flick.current += dt;
    const f = 0.86 + Math.sin(flick.current * 42) * 0.05 + Math.sin(flick.current * 13) * 0.05;
    const drive = bus.game.vfx.drive;
    const boost = bus.game.flight.state.boost;

    if (plume.current && plumeMat.current) {
      plume.current.scale.set(0.7 + boost * 0.35, 0.7 + boost * 0.35, (0.5 + drive * 1.1) * f);
      plume.current.position.z = L * 0.46 + drive * L * 0.05;
      plumeMat.current.opacity = 0.16 + drive * 0.26;
    }
    if (core.current) core.current.scale.setScalar((0.55 + drive * 0.4) * f);
    if (light.current) light.current.intensity = 1.2 + drive * 3.6;
  });

  return (
    <>
      <group rotation={SHIP_MODEL_ROTATION}>
        <Fitted id="ship" size={L} />
      </group>

      {/* engine plume — nose is -Z, exhaust at +Z */}
      <mesh ref={plume} position={[0, 0, L * 0.46]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[L * 0.055, L * 0.42, 12, 1, true]} />
        <meshBasicMaterial
          ref={plumeMat}
          color={CYAN}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={core} position={[0, 0, L * 0.44]}>
        <sphereGeometry args={[L * 0.03, 12, 12]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0, L * 0.5]} color={CYAN} intensity={1.6} distance={L * 9} decay={1.5} />
    </>
  );
}
