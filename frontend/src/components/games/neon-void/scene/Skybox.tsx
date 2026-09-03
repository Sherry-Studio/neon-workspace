"use client";

import { useLayoutEffect } from "react";
import { useThree, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { SKYBOX } from "../orbit/assets";

/** Equirectangular Milky-Way panorama as the world background + a faint image
 *  based light for soft, believable fill. Dimmed so it reads as *distant*. */
export default function Skybox() {
  const texture = useLoader(THREE.TextureLoader, SKYBOX);
  const scene = useThree((s) => s.scene);

  useLayoutEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const prevBg = scene.background;
    const prevEnv = scene.environment;
    scene.background = texture;
    scene.environment = texture;
    scene.backgroundIntensity = 0.9;
    scene.environmentIntensity = 0.28;
    return () => {
      scene.background = prevBg;
      scene.environment = prevEnv;
    };
  }, [texture, scene]);

  return null;
}
