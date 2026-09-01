"use client";

import { MutableRefObject, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { segment, range } from "@/hooks/useScrollProgress";
import { getBlend } from "@/lib/themeStore";
import { T } from "./timeline";

/**
 * Lighting for the physical set only (the digital worlds carry their own).
 *
 *  void     — pitch black; the sign is the only source
 *  cabinet  — a warm key and a cool rim bring the machine out of the dark
 *  screen   — the CRT takes over as the dominant fill
 */
export default function Lighting({
  progressRef,
  reduced = false,
}: {
  progressRef: MutableRefObject<number>;
  reduced?: boolean;
}) {
  const key = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.PointLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const bounce = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const p = reduced ? 0.45 : progressRef.current;
    const inRoom = segment(p, T.cabinetStart, T.cabinetStart + 0.09);
    const screen = range(p, T.crtStart, T.enterCrtStart);
    // everything dims out once we're through the glass
    const gone = 1 - range(p, T.enterCrtEnd - 0.02, T.enterCrtEnd + 0.01);

    // daylight fills the room, so the dramatic key/rim ease off
    const b = getBlend();

    if (amb.current) amb.current.intensity = (0.02 + inRoom * 0.1) * gone + b * 0.75;
    if (key.current)
      key.current.intensity = inRoom * 90 * (1 - screen * 0.45) * gone * (1 - b * 0.55);
    if (rim.current) rim.current.intensity = inRoom * 34 * gone * (1 - b * 0.6);
    if (bounce.current) bounce.current.intensity = (2 + inRoom * 7) * gone * (1 - b * 0.5);
  });

  return (
    <>
      <ambientLight ref={amb} intensity={0.02} />
      <spotLight
        ref={key}
        position={[-5, 7, 5]}
        angle={0.7}
        penumbra={1}
        color="#ffd7a3"
        intensity={0}
        distance={26}
        decay={2}
      />
      <pointLight
        ref={rim}
        position={[5.2, 2.4, -3.4]}
        color="#22d3ee"
        intensity={0}
        distance={22}
        decay={2}
      />
      <pointLight
        ref={bounce}
        position={[0, -2, 3]}
        color="#243352"
        intensity={2}
        distance={14}
        decay={2}
      />
    </>
  );
}
