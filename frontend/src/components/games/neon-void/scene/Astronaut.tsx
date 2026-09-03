"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useModel } from "../orbit/assets";
import { COMPOSITION } from "../orbit/config";

/**
 * A lone EVA figure adrift beside the near wreck — world-building, not
 * gameplay. Uses the model's own animation if it ships one; otherwise gives it
 * a slow, weightless tumble so it never reads as a pasted-in prop.
 */
export default function Astronaut() {
  const wreck = COMPOSITION.wrecks.find((w) => w.astronaut) ?? COMPOSITION.wrecks[0];
  const { scene, animations } = useModel("astronaut");

  const object = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const k = 3.2 / (Math.max(size.x, size.y, size.z) || 1); // ~3.2m tall figure
    c.position.copy(center).multiplyScalar(-k);
    c.scale.setScalar(k);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.4;
    });
    return c;
  }, [scene]);

  const root = useRef<THREE.Group>(null);
  const mixer = useMemo(() => (animations.length ? new THREE.AnimationMixer(object) : null), [animations, object]);

  useEffect(() => {
    if (!mixer || !animations.length) return;
    const clip = animations.find((a) => /idle|float|breath/i.test(a.name)) ?? animations[0];
    const action = mixer.clipAction(clip);
    action.play();
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer, animations]);

  useFrame((state, dt) => {
    mixer?.update(dt);
    if (!root.current) return;
    // weightless drift — slow, off-axis, never a spin
    const t = state.clock.elapsedTime;
    root.current.rotation.x = 0.3 + Math.sin(t * 0.11) * 0.25;
    root.current.rotation.y += dt * 0.06;
    root.current.rotation.z = Math.sin(t * 0.07) * 0.18;
    root.current.position.y = Math.sin(t * 0.19) * 0.6;
  });

  // just outside the hull of the near wreck, catching the key light
  const base: [number, number, number] = [wreck.pos[0] + 26, wreck.pos[1] + 10, wreck.pos[2] + 14];

  return (
    <group position={base}>
      <group ref={root}>
        <primitive object={object} />
      </group>
      {/* faint helmet-lamp glow so the eye finds the figure */}
      <pointLight position={[0, 1.4, 1]} color="#dfeaff" intensity={0.5} distance={40} decay={1.6} />
    </group>
  );
}
