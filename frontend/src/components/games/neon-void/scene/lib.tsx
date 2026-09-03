"use client";

import { forwardRef, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useModel, type AssetId } from "../orbit/assets";

type Vec = [number, number, number];

interface FittedProps {
  id: AssetId;
  /** longest axis of the model is scaled to this */
  size: number;
  /** meshStandardMaterial.envMapIntensity applied to every mesh */
  envMap?: number;
  /** mesh names matching this are hidden (e.g. a model's baked light rays) */
  hide?: RegExp;
  position?: Vec;
  rotation?: Vec;
  children?: ReactNode;
}

/**
 * Loads a registered GLB, clones it, recentres it on its own bounding box and
 * scales it so its longest axis == `size`. Returns a <group> you place freely.
 */
export const Fitted = forwardRef<THREE.Group, FittedProps>(function Fitted(
  { id, size, envMap = 0.35, hide, position, rotation, children },
  ref,
) {
  const { scene } = useModel(id);
  const object = useMemo(() => {
    const c = scene.clone(true);
    if (hide) c.traverse((o) => { if (hide.test(o.name)) o.visible = false; });
    const box = new THREE.Box3().setFromObject(c);
    const s = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(s);
    box.getCenter(center);
    const longest = Math.max(s.x, s.y, s.z) || 1;
    const k = size / longest;
    c.position.copy(center).multiplyScalar(-k);
    c.scale.setScalar(k);
    c.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = envMap;
    });
    return c;
  }, [scene, size, envMap, hide]);

  return (
    <group ref={ref} position={position} rotation={rotation}>
      <primitive object={object} />
      {children}
    </group>
  );
});
