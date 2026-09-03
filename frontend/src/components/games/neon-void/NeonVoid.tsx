"use client";

/* ============================================================
   NEON ORBIT — Phase II
   Cinematic deep-field entry + a spacecraft that feels genuinely
   good to fly, all provided GLB assets integrated, and the
   system architecture combat will slot into (no combat yet).
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { NeonOrbitGame } from "./systems/Game";
import type { InputMode } from "./systems/InputManager";
import { createBus } from "./orbit/bus";
import { preloadTier } from "./orbit/assets";
import { INTRO } from "./orbit/config";
import OrbitCanvas from "./scene/OrbitCanvas";
import IntroTitle from "./ui/IntroTitle";
import FlightHUD from "./ui/FlightHUD";

function webglOk() {
  if (typeof window === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function NeonOrbit() {
  const router = useRouter();
  const game = useMemo(() => new NeonOrbitGame(), []);
  const bus = useMemo(() => createBus(game), [game]);

  const rootRef = useRef<HTMLDivElement>(null);
  const [support, setSupport] = useState<"ok" | "webgl">("ok");
  const [ready, setReady] = useState(false);
  const [effects, setEffects] = useState(true);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    if (!webglOk()) {
      setSupport("webgl");
      setReady(true);
      return;
    }
    const q = new URLSearchParams(window.location.search);
    if (q.has("fly")) game.forceLive();
    const st = q.get("steer");
    if (st) {
      const [x, y] = st.split(",").map(Number);
      game.input.debugSteer = [x || 0, y || 0];
    }
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __ORBIT__?: unknown }).__ORBIT__ = { game, bus };
    }

    const lowEnd =
      window.matchMedia("(pointer: coarse)").matches ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      window.devicePixelRatio > 2.5;
    setEffects(!lowEnd);

    preloadTier("core");
    // stream the rest without blocking the intro
    const t1 = window.setTimeout(() => preloadTier("world"), 600);
    const t2 = window.setTimeout(() => preloadTier("mission"), 3500);
    setReady(true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [game, bus]);

  // attach input once the root <div> actually mounts (past the loader)
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !ready || support !== "ok") return;
    game.input.attach(el);
    game.input.onMode = (m) => setInputMode(m);
    return () => game.input.detach();
  }, [game, ready, support]);

  // arm pointer-lock once the prompt shows; go live at hand-off
  useEffect(() => {
    if (support !== "ok") return;
    const id = window.setInterval(() => {
      if (!game.input.armed && game.introT >= INTRO.skipAfter) game.input.armed = true;
      if (game.phase === "live") {
        game.input.setLive(true);
        window.clearInterval(id);
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [game, support]);

  const takeControl = useCallback(() => {
    game.skipRequested = true;
    game.input.armed = true;
    game.input.requestControl();
  }, [game]);

  if (!ready) {
    return (
      <div className="grid h-full w-full place-items-center bg-black">
        <p className="text-[10px] uppercase tracking-[0.5em] text-white/40">Initialising</p>
      </div>
    );
  }

  if (support === "webgl") {
    return (
      <div className="grid h-full w-full place-items-center bg-black px-8 text-center">
        <div className="max-w-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-white">Graphics not supported</p>
          <p className="mt-3 text-xs leading-relaxed text-white/50">
            NEON ORBIT needs WebGL. Try Chrome, Edge, Firefox or Safari on a desktop.
          </p>
          <button
            onClick={() => router.push("/games")}
            className="mt-6 border border-white/20 px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-white/70 hover:border-[#66d9e8]/60"
          >
            Back to Neon Arcade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-black"
      style={{ cursor: inputMode === "lock" ? "none" : "crosshair" }}
    >
      <OrbitCanvas bus={bus} effects={effects} onContextLost={() => setContextLost(true)} />

      <IntroTitle bus={bus} onTakeControl={takeControl} />
      <FlightHUD bus={bus} mode={inputMode} />

      <button
        onClick={() => router.push("/games")}
        className="absolute left-5 top-5 z-30 text-[9px] uppercase tracking-[0.3em] text-white/25 transition-colors hover:text-white/70"
      >
        ← Neon Arcade
      </button>

      {contextLost && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/90 px-8 text-center">
          <div className="max-w-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-white">Graphics context lost</p>
            <p className="mt-3 text-xs text-white/50">The GPU dropped the render context. Reload to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 border border-white/20 px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-white/70 hover:border-[#66d9e8]/60"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
