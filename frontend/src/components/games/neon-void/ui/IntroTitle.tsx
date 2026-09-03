"use client";

import { useEffect, useRef, useState } from "react";
import type { OrbitBus } from "../orbit/bus";
import { INTRO } from "../orbit/config";

const NV_FONT = '"Space Grotesk", "Geist", system-ui, sans-serif';
const seg = (a: number, b: number, t: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));

/** Cinematic overlay: black → title → "take control". Reads the bus via rAF so
 *  it never forces React renders on the 3D loop. */
export default function IntroTitle({
  bus,
  onTakeControl,
}: {
  bus: OrbitBus;
  onTakeControl: () => void;
}) {
  const [t, setT] = useState(0);
  const [live, setLive] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    let last = 0;
    const loop = (now: number) => {
      if (now - last > 60) {
        last = now;
        setT(bus.introT);
        setLive(bus.phase === "live");
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [bus]);

  if (live) return null;

  const black = 1 - seg(INTRO.blackFade[0], INTRO.blackFade[1], t);
  const titleO = seg(INTRO.titleIn[0], INTRO.titleIn[1], t) * (1 - seg(INTRO.titleOut[0], INTRO.titleOut[1], t));
  const promptO = seg(INTRO.promptIn, INTRO.promptIn + 1.2, t);
  const canSkip = t >= INTRO.skipAfter;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none" style={{ fontFamily: NV_FONT }}>
      <div className="absolute inset-0 bg-black" style={{ opacity: black }} />

      <div
        className="absolute inset-x-0 top-[38%] flex flex-col items-center text-center"
        style={{ opacity: titleO, transform: `translateY(${(1 - titleO) * 12}px)` }}
      >
        <h1 className="text-5xl font-semibold tracking-[0.14em] text-white md:text-7xl">
          NEON <span className="text-[#66d9e8]">ORBIT</span>
        </h1>
        <p className="mt-3 text-[10px] uppercase tracking-[0.6em] text-white/40">Deep Field</p>
      </div>

      {canSkip && (
        <button
          onClick={onTakeControl}
          className="pointer-events-auto absolute inset-x-0 bottom-[16%] mx-auto flex w-fit flex-col items-center gap-2 text-white/70 transition-colors hover:text-white"
          style={{ opacity: Math.max(promptO, canSkip && t > INTRO.total - 2 ? 1 : promptO) }}
        >
          <span className="text-[11px] uppercase tracking-[0.4em]">Click to take control</span>
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/30">
            mouse / trackpad to steer · shift to boost
          </span>
        </button>
      )}
    </div>
  );
}
