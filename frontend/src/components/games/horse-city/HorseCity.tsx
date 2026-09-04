"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";

import Scene from "./Scene";
import { SPAWN } from "./config";
import { createWorld, HudState } from "./systems/state";
import { HUD } from "./ui/HUD";
import { LoadingScreen } from "./ui/LoadingScreen";
import { ControlsCard } from "./ui/ControlsCard";

export default function HorseCity() {
  const world = useMemo(
    () => createWorld(SPAWN.girl, SPAWN.girlFacing, SPAWN.horse, SPAWN.horseFacing),
    [],
  );
  const [hud, setHud] = useState<HudState>(() => ({
    mode: "onfoot",
    horseGait: "idle",
    horseKmh: 0,
    stamina: 100,
    canGallop: true,
    promptVisible: false,
    debug: false,
  }));
  const [started, setStarted] = useState(false);
  const hudRef = useRef(hud);
  const onHud = useCallback((h: HudState) => {
    // only re-render when something the HUD shows actually changed
    const p = hudRef.current;
    if (
      p.mode !== h.mode ||
      p.horseGait !== h.horseGait ||
      p.horseKmh !== h.horseKmh ||
      p.stamina !== h.stamina ||
      p.canGallop !== h.canGallop ||
      p.promptVisible !== h.promptVisible ||
      p.debug !== h.debug
    ) {
      hudRef.current = h;
      setHud(h);
    }
  }, []);

  return (
    <div className="fixed inset-0 select-none bg-[#cdd6e4]">
      <Canvas
        shadows
        frameloop="always"
        dpr={[1, 1.75]}
        camera={{ position: [0, 3, 10], fov: 55, near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene world={world} onHud={onHud} />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>

      {started && <HUD hud={hud} />}
      {!started && <ControlsCard onStart={() => setStarted(true)} />}
      <LoadingScreen />
    </div>
  );
}
