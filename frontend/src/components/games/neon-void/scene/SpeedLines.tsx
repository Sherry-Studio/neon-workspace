"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitBus } from "../orbit/bus";

/** Streaks that only appear with speed / boost — reads as velocity, not decor.
 *  Anchored around the ship, stretched along its velocity. */
export default function SpeedLines({ bus, quality }: { bus: OrbitBus; quality: "low" | "high" }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const N = quality === "low" ? 44 : 90;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const offs = useMemo(
    () =>
      Array.from({ length: N }, () =>
        new THREE.Vector3((Math.random() - 0.5) * 110, (Math.random() - 0.5) * 110, (Math.random() - 0.5) * 110),
      ),
    [N],
  );

  useFrame(() => {
    const im = mesh.current;
    if (!im) return;
    const f = bus.game.flight.state;
    const intensity = bus.game.vfx.speedLines;
    if (mat.current) mat.current.opacity = THREE.MathUtils.clamp(intensity * 0.6, 0, 0.7);
    if (intensity < 0.03) {
      im.count = 0;
      im.instanceMatrix.needsUpdate = true;
      return;
    }
    dir.copy(f.velocity).normalize();
    if (dir.lengthSq() < 0.1) dir.copy(f.forward);
    q.setFromUnitVectors(zAxis, dir);
    const len = 2 + f.speed * 0.05 + f.boost * 22;

    for (let i = 0; i < N; i++) {
      const o = offs[i];
      o.addScaledVector(f.velocity, -0.016);
      if (o.lengthSq() > 110 * 110) o.set((Math.random() - 0.5) * 110, (Math.random() - 0.5) * 110, (Math.random() - 0.5) * 110);
      dummy.position.copy(f.position).add(o).addScaledVector(f.forward, 26);
      dummy.quaternion.copy(q);
      dummy.scale.set(0.05, 0.05, len);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    }
    im.count = N;
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        ref={mat}
        color="#dbe8ff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
