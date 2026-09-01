"use client";

import { MutableRefObject, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { T } from "./timeline";
import { sampleCamera, shotIndexAt } from "./cameraPath";

/**
 * Drives the camera along the pure path in `cameraPath.ts`. Interpolation is
 * damped within a shot; on a shot change it snaps, because that beat is
 * covered by the full-screen flash.
 */
export default function CameraController({
  progressRef,
  reduced = false,
}: {
  progressRef: MutableRefObject<number>;
  reduced?: boolean;
}) {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 0.05, 15.5));
  const look = useRef(new THREE.Vector3(0, 0.05, 0));
  const tPos = useRef(new THREE.Vector3());
  const tLook = useRef(new THREE.Vector3());
  const shot = useRef(-1);

  useFrame((state, dt) => {
    const p = reduced ? 0.45 : progressRef.current;

    const s = sampleCamera(p);
    tPos.current.fromArray(s.pos);
    tLook.current.fromArray(s.look);

    // pointer parallax — eases off whenever we're pushing into something
    const still =
      p > T.enterCrtStart - 0.04 || (p > T.enterLogoStart && p < T.enterLogoEnd);
    const par = still ? 0 : 0.42;
    tPos.current.x += state.pointer.x * par;
    tPos.current.y += state.pointer.y * par * 0.55;

    const si = shotIndexAt(p);
    const cut = shot.current !== si;
    shot.current = si;
    const damp = cut || reduced ? 1 : 1 - Math.pow(0.0015, dt);

    pos.current.lerp(tPos.current, damp);
    look.current.lerp(tLook.current, damp);
    camera.position.copy(pos.current);
    camera.lookAt(look.current);

    const pc = camera as THREE.PerspectiveCamera;
    const nf = cut ? s.fov : pc.fov + (s.fov - pc.fov) * damp;
    if (Math.abs(pc.fov - nf) > 0.005) {
      pc.fov = nf;
      pc.updateProjectionMatrix();
    }
  });

  return null;
}
