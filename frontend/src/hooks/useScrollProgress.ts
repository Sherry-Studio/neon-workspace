"use client";

import { RefObject, useEffect, useRef } from "react";

/**
 * Tracks how far a tall "scroll track" element has been scrolled through the
 * viewport, as a 0..1 value. 0 = element top at viewport top, 1 = element
 * bottom at viewport bottom.
 *
 * Writes into `targetRef` (so a render loop can read it without re-rendering)
 * AND calls `onChange` for DOM-side updates.
 */
export function useScrollProgress(
  trackRef: RefObject<HTMLElement | null>,
  targetRef: RefObject<number>,
  onChange?: (p: number) => void
) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      targetRef.current = p;
      cb.current?.(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [trackRef, targetRef]);
}

export function clamp(x: number, a = 0, b = 1) {
  return Math.min(Math.max(x, a), b);
}

/** Linear remap of x within [a,b] → [0,1], clamped. A zero-width span steps. */
export function range(x: number, a: number, b: number) {
  if (b <= a) return x >= b ? 1 : 0;
  return clamp((x - a) / (b - a));
}

/** Smoothstep remap of x within [a,b] → [0,1]. */
export function segment(x: number, a: number, b: number) {
  const t = range(x, a, b);
  return t * t * (3 - 2 * t);
}

/** 0→1→0 pulse across [a,b], peaking at the midpoint. */
export function pulse(x: number, a: number, b: number) {
  const t = range(x, a, b);
  return Math.sin(t * Math.PI);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
