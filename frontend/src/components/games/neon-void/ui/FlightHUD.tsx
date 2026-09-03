"use client";

import { useEffect, useRef, useState } from "react";
import type { OrbitBus } from "../orbit/bus";
import type { InputMode } from "../systems/InputManager";

const NV_FONT = '"Space Grotesk", "Geist", system-ui, sans-serif';

/** Minimal: a stable aim reticle (where the ship is pointing), a faint flight-
 *  director bracket (where you're steering it), throttle + speed, and a hint
 *  that fades. The environment and ship stay the focus. */
export default function FlightHUD({ bus, mode }: { bus: OrbitBus; mode: InputMode }) {
  const [show, setShow] = useState(false);
  const [hint, setHint] = useState(true);
  const pip = useRef<HTMLDivElement>(null);
  const director = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const thr = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const since = useRef(0);

  useEffect(() => {
    let last = 0;
    const loop = (now: number) => {
      if (bus.phase === "live") {
        if (!since.current) since.current = now;
        if (now - last > 33) {
          last = now;
          if (pip.current) pip.current.style.transform = `translate(${bus.reticleX * 44}px, ${bus.reticleY * 44}px)`;
          const c = bus.game.input.cursor;
          if (director.current)
            director.current.style.transform = `translate(${c.x * 120}px, ${c.y * 120}px)`;
          if (bar.current) bar.current.style.width = `${6 + bus.speedRatio * 94}%`;
          if (thr.current) thr.current.style.left = `${bus.throttle * 100}%`;
        }
        if (!show) setShow(true);
        if (hint && now - since.current > 7000) setHint(false);
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [bus, show, hint]);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none" style={{ fontFamily: NV_FONT }}>
      {/* flight director — where you're steering toward */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div ref={director}>
          <svg width="40" height="40" viewBox="0 0 40 40" className="opacity-30">
            {[
              [4, 4, 4, 12], [4, 4, 12, 4],
              [36, 4, 36, 12], [36, 4, 28, 4],
              [4, 36, 4, 28], [4, 36, 12, 36],
              [36, 36, 36, 28], [36, 36, 28, 36],
            ].map((l, i) => (
              <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="#9fdbe6" strokeWidth="1.5" />
            ))}
          </svg>
        </div>
      </div>

      {/* aim pipper — where the nose is actually pointing */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div ref={pip}>
          <svg width="44" height="44" viewBox="0 0 44 44" className="opacity-60">
            <circle cx="22" cy="22" r="13" fill="none" stroke="#9fdbe6" strokeWidth="1" />
            {[0, 90, 180, 270].map((a) => (
              <line key={a} x1="22" y1="4" x2="22" y2="9" stroke="#9fdbe6" strokeWidth="1.4" transform={`rotate(${a} 22 22)`} />
            ))}
            <circle cx="22" cy="22" r="1.3" fill="#9fdbe6" />
          </svg>
        </div>
      </div>

      {/* throttle + speed */}
      <div className="absolute bottom-6 left-1/2 w-44 -translate-x-1/2">
        <div className="relative h-[3px] w-full bg-white/10">
          <div ref={bar} className="absolute inset-y-0 left-0 bg-[#66d9e8]" style={{ width: "6%", boxShadow: "0 0 8px #66d9e8" }} />
          <div ref={thr} className="absolute -top-[3px] h-[9px] w-[2px] -translate-x-1/2 bg-white/70" style={{ left: "50%" }} />
        </div>
        <div className="mt-1 flex justify-between text-[8px] uppercase tracking-[0.3em] text-white/25">
          <span>Throttle</span>
          <span>{bus.boost > 0.15 ? "BOOST" : ""}</span>
        </div>
      </div>

      {hint && (
        <div className="absolute bottom-6 right-6 text-right text-[9px] uppercase leading-relaxed tracking-[0.3em] text-white/30">
          <div>{mode === "lock" ? "esc — release mouse" : "click — mouse-lock steering"}</div>
          <div>mouse / trackpad steer · w/s throttle · shift boost · q/e roll</div>
        </div>
      )}
    </div>
  );
}
