"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { GameEngine } from "../game/engine";
import type { Settings, EnvKey } from "../game/types";
import { GameWorld } from "./Scene";
import { MenuWorld } from "../ui/Menus";

/**
 * ONE persistent WebGL canvas for the whole game. It never unmounts while the
 * route is open — only its *contents* switch between the menu world and the
 * mission world. Mounting/unmounting separate <Canvas> elements leaks GL
 * contexts and eventually renders black, so this is the single source.
 */
export default function GameCanvas({
  mode,
  engine,
  settings,
  env,
  running,
  onContextLost,
}: {
  mode: "menu" | "game";
  engine: GameEngine | null;
  settings: Settings;
  env: EnvKey;
  running: () => boolean;
  onContextLost?: () => void;
}) {
  const q = settings.quality;
  return (
    <Canvas
      frameloop="always"
      dpr={q === "low" ? [1, 1] : q === "medium" ? [1, 1.4] : [1, 1.75]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0, 6, 46], fov: 62, near: 0.5, far: 900 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        gl.domElement.addEventListener("webglcontextlost", () => onContextLost?.(), { once: true });
      }}
    >
      {mode === "game" && engine ? (
        <GameWorld engine={engine} settings={settings} env={env} running={running} />
      ) : (
        <MenuWorld quality={q} />
      )}
    </Canvas>
  );
}
