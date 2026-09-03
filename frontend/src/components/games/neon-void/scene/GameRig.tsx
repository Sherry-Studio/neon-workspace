"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitBus } from "../orbit/bus";

/**
 * The only bridge between the game systems and R3F. Each frame:
 *   1. game.tick(dt)
 *   2. copy the ship pose onto the ship group
 *   3. copy the camera pose + FOV onto the real camera
 * Nothing else lives here — flight/camera/targeting logic is in systems/.
 */
export default function GameRig({
  bus,
  shipRef,
}: {
  bus: OrbitBus;
  shipRef: React.RefObject<THREE.Group | null>;
}) {
  const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const started = useRef(false);

  useFrame((state, deltaRaw) => {
    const dt = Math.min(deltaRaw, 0.05);
    const g = bus.game;

    if (!started.current) {
      started.current = true;
      cam.near = 1;
      cam.far = 220_000;
    }

    g.tick(dt, state.clock.elapsedTime);

    const ship = shipRef.current;
    if (ship) {
      ship.position.copy(g.shipPosition);
      ship.quaternion.copy(g.shipQuaternion);
      ship.visible = g.shipVisible;
    }

    cam.position.copy(g.camera.position);
    cam.quaternion.copy(g.camera.quaternion);
    if (Math.abs(cam.fov - g.camera.fov) > 0.01) {
      cam.fov = g.camera.fov;
      cam.updateProjectionMatrix();
    }

    // telemetry for the DOM HUD
    const f = g.flight.state;
    bus.phase = g.phase;
    bus.introT = g.introT;
    bus.speedRatio = f.speedRatio;
    bus.boost = f.boost;
    bus.throttle = f.throttle;
    bus.reticleX = g.targeting.reticleX;
    bus.reticleY = g.targeting.reticleY;
  });

  return null;
}
