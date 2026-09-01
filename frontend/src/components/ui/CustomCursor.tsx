"use client";

import { useEffect, useRef } from "react";

/**
 * A minimal glowing point with a ring that trails it. The ring swells over
 * anything interactive, so buttons feel magnetic before you even click.
 * Desktop only — hidden entirely on coarse pointers.
 */
export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf = 0;
    let running = false;

    const loop = () => {
      // the ring lags the dot — that trail is what reads as "expensive"
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };
    const kick = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      root.classList.add("cursor-active");
      kick();
    };
    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      const hot = t?.closest?.(
        "a, button, [role='button'], input, textarea, select, [data-cursor='hot']"
      );
      root.classList.toggle("cursor-hot", !!hot);
    };
    const onLeave = () => root.classList.remove("cursor-active");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      root.classList.remove("cursor-active", "cursor-hot");
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden />
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}
