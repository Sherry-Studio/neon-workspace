"use client";

import { MutableRefObject, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { range } from "@/hooks/useScrollProgress";
import { T } from "./timeline";

/** Slow atmospheric dust in the physical room — reads as depth, not decoration. */
export default function Particles({
  count = 140,
  progressRef,
}: {
  count?: number;
  progressRef: MutableRefObject<number>;
}) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 1] = Math.random() * 9 - 2.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count]);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const p = progressRef.current;
    g.visible = p < T.enterCrtEnd;
    g.rotation.y = state.clock.elapsedTime * 0.01;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.13) * 0.18;
    const m = g.material as THREE.PointsMaterial;
    // barely there in the void, fuller once the room has light in it
    m.opacity = 0.18 + range(p, T.formStart, T.cabinetEnd) * 0.34;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.022}
        color="#a8c0d4"
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
