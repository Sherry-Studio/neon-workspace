"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Two point-cloud shells that sit *in front of* the panorama so the universe
 *  gains real parallax as you fly — not "black screen + white dots". */
function Shell({ count, radius, spread, size, opacity }: { count: number; radius: number; spread: number; size: number; opacity: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = radius + (Math.random() - 0.5) * spread;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
      const t = Math.random();
      c.setHSL(0.58 + t * 0.05, 0.25, 0.7 + Math.random() * 0.3);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count, radius, spread]);

  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial size={size} vertexColors sizeAttenuation transparent opacity={opacity} depthWrite={false} />
    </points>
  );
}

export default function Starfield() {
  const group = useRef<THREE.Group>(null);
  // keep the shells centred on the camera so they never run out
  useFrame((state) => {
    if (group.current) group.current.position.copy(state.camera.position);
  });
  return (
    <group ref={group}>
      <Shell count={2200} radius={6000} spread={3000} size={7} opacity={0.75} />
      <Shell count={1400} radius={16000} spread={6000} size={16} opacity={0.5} />
    </group>
  );
}
