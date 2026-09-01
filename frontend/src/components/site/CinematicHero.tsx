"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion, useIsLowPower } from "@/hooks/useReducedMotion";
import { useScrollProgress, range, segment, pulse, clamp } from "@/hooks/useScrollProgress";
import { T, WORLDS } from "@/components/three/hero/timeline";
import { scrollToY } from "@/lib/smoothScroll";
import MagneticButton from "@/components/ui/MagneticButton";

/** Matches INTRO_SECONDS in NeonLogo — when the name has finished forming. */
const INTRO_MS = 3100;

const HeroScene = dynamic(() => import("@/components/three/hero/HeroScene"), {
  ssr: false,
  loading: () => null,
});

export default function CinematicHero() {
  const reduced = useReducedMotion();
  const lowPower = useIsLowPower();
  const cinematic = !reduced;

  const trackRef = useRef<HTMLDivElement>(null);
  /** the single value the whole 3D journey is scrubbed by */
  const progressRef = useRef(0);

  const [mounted, setMounted] = useState(false);
  const [sceneOn, setSceneOn] = useState(true);
  /** true once the name has finished assembling itself */
  const [signLit, setSignLit] = useState(false);
  const signLitRef = useRef(false);
  /** INSERT COIN shows while the machine "boots", then hands over to the sign */
  const [booted, setBooted] = useState(false);
  const enteringRef = useRef(false);

  // overlay refs — driven imperatively so scrolling never re-renders React
  const coinRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const cabinetRef = useRef<HTMLDivElement>(null);
  const crtRef = useRef<HTMLDivElement>(null);
  const worldRefs = useRef<(HTMLDivElement | null)[]>([]);
  const outroRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  /** separate from flashRef so the click transition can't fight the scroll one */
  const portalRef = useRef<HTMLDivElement>(null);
  const hotspotRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 100);
    return () => window.clearTimeout(id);
  }, []);

  // the sign finishes forming on its own clock, so the "enter" affordance
  // appears at the same moment the letters are fully lit
  useEffect(() => {
    if (!cinematic) {
      setBooted(true);
      setSignLit(true);
      signLitRef.current = true;
      return;
    }
    const a = window.setTimeout(() => setBooted(true), 1200);
    const b = window.setTimeout(() => {
      signLitRef.current = true;
      setSignLit(true);
      // reveal the tagline immediately rather than waiting for a scroll tick
      onProgressRef.current?.(progressRef.current);
    }, INTRO_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [cinematic]);

  /**
   * Fly through the letter and land on the site. Scrolls the journey up to the
   * pass-through beat so you actually see the camera go through the glow, then
   * cuts under the flash to the top of the page content.
   */
  const enterThroughLetter = useCallback(() => {
    const el = trackRef.current;
    if (!el || enteringRef.current) return;
    enteringRef.current = true;

    const top = el.offsetTop;
    const travel = el.offsetHeight - window.innerHeight;
    const portal = portalRef.current;

    if (!cinematic) {
      scrollToY(top + el.offsetHeight, { immediate: true });
      enteringRef.current = false;
      return;
    }

    // 1 · fly at the letter
    scrollToY(top + T.enterLogoEnd * travel, { duration: 1.15 });

    // 2 · white-out just as we reach the glow
    window.setTimeout(() => {
      if (portal) portal.style.opacity = "1";
    }, 950);

    // 3 · cut to the site behind the flash, then fade it off
    window.setTimeout(() => {
      scrollToY(top + el.offsetHeight, { immediate: true });
      window.setTimeout(() => {
        if (portal) portal.style.opacity = "0";
        enteringRef.current = false;
      }, 90);
    }, 1320);
  }, [cinematic]);

  // R3F sometimes needs a resize tick before it starts compositing
  useEffect(() => {
    if (!mounted) return;
    const ticks = [50, 200, 600].map((d) =>
      window.setTimeout(() => window.dispatchEvent(new Event("resize")), d)
    );
    return () => ticks.forEach(window.clearTimeout);
  }, [mounted]);

  // hold the WebGL context only while the journey is actually on screen
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setSceneOn(e.isIntersecting),
      { rootMargin: "10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onProgress = useCallback(
    (p: number) => {
      if (!cinematic) return;

      const set = (el: HTMLElement | null, o: number, y = 0, scale = 1) => {
        if (!el) return;
        el.style.opacity = String(clamp(o));
        el.style.transform = `translate3d(0,${y}px,0) scale(${scale})`;
      };

      // 1 · INSERT COIN is on its own boot timer (see `booted`), not on scroll.

      // 2 · the sign lights on the intro clock, so the tagline and the way in
      //     appear with it — scroll only fades them as we approach the letter
      const tag = signLitRef.current
        ? 1 - segment(p, T.holdEnd, T.enterLogoStart + 0.03)
        : 0;
      set(taglineRef.current, tag, (1 - tag) * 14);

      // the way in is only live while the sign is actually on screen — a
      // faded button must not keep swallowing clicks
      const live = tag > 0.5;
      if (taglineRef.current)
        taglineRef.current.style.pointerEvents = live ? "" : "none";
      if (hotspotRef.current)
        hotspotRef.current.style.pointerEvents = live ? "auto" : "none";

      // 3 · in the room with the machine
      const cab =
        segment(p, T.cabinetStart + 0.05, T.cabinetStart + 0.12) *
        (1 - segment(p, T.cabinetEnd - 0.04, T.crtStart + 0.01));
      set(cabinetRef.current, cab, (1 - cab) * 12);

      // 4 · the screen is live
      const crt = segment(p, T.crtStart + 0.02, T.crtStart + 0.06) *
        (1 - segment(p, T.enterCrtStart - 0.01, T.enterCrtStart + 0.03));
      set(crtRef.current, crt, (1 - crt) * 10);

      // 5 · the three worlds
      const span = (T.worldsEnd - T.worldsStart) / 3;
      worldRefs.current.forEach((el, i) => {
        const a = T.worldsStart + i * span;
        const o =
          segment(p, a + span * 0.06, a + span * 0.3) *
          (1 - segment(p, a + span * 0.74, a + span * 0.98));
        set(el, o, (1 - o) * 26);
      });

      // 6 · final CTA as the ride ends
      const out = segment(p, 0.972, 0.999);
      set(outroRef.current, out, (1 - out) * 20);

      set(hintRef.current, 1 - segment(p, 0.004, 0.02));

      // the two cuts — a hard flash of light hides each camera jump
      const f =
        Math.max(
          pulse(p, T.enterLogoEnd - 0.022, T.enterLogoEnd + 0.022),
          pulse(p, T.enterCrtEnd - 0.02, T.enterCrtEnd + 0.02)
        ) ** 1.6;
      if (flashRef.current) flashRef.current.style.opacity = String(clamp(f * 0.92));

      // vignette breathes closed during the two push-ins
      if (vignetteRef.current) {
        const v = Math.max(
          range(p, T.enterLogoStart, T.enterLogoEnd),
          range(p, T.enterCrtStart, T.enterCrtEnd)
        );
        vignetteRef.current.style.opacity = String(0.35 + v * 0.5);
      }
    },
    [cinematic]
  );

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useScrollProgress(trackRef, progressRef, onProgress);

  // reduced motion: no journey, just the destination
  useEffect(() => {
    if (cinematic) return;
    const el = outroRef.current;
    if (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
    }
  }, [cinematic]);

  const trackHeight = reduced ? "100svh" : lowPower ? "620vh" : "900vh";

  return (
    <section
      ref={trackRef}
      style={{ height: trackHeight }}
      aria-label="Neon Arcade — enter the arcade"
    >
      {/* the journey renders here, behind everything */}
      {mounted && sceneOn && (
        <div className="pointer-events-none fixed inset-0 -z-10">
          <HeroScene progressRef={progressRef} reduced={reduced} lowPower={lowPower} />
        </div>
      )}

      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {!sceneOn && <div className="absolute inset-0 bg-[#040406]" />}

        {/* ── SCENE 1 · INSERT COIN ── on the boot timer, before the name forms */}
        {cinematic && (
          <div
            ref={coinRef}
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
            style={{
              opacity: booted ? 0 : 1,
              transition: "opacity 700ms ease-out",
            }}
          >
            <span className="animate-[coin-blink_1.5s_steps(1,end)_infinite] text-[11px] font-medium uppercase tracking-[0.62em] text-accent-cyan/90">
              Insert Coin
            </span>
          </div>
        )}

        {/* the lit sign is itself a doorway — click it to fly through the letter */}
        {cinematic && signLit && (
          <button
            ref={hotspotRef}
            type="button"
            onClick={enterThroughLetter}
            aria-label="Enter Neon Arcade"
            className="absolute left-1/2 top-1/2 z-[3] h-[36vh] w-[min(80vw,54rem)] -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-pan-y bg-transparent"
          />
        )}

        {/* ── SCENE 2 · under the lit sign ── */}
        <div
          ref={taglineRef}
          className="pointer-events-none absolute inset-x-0 bottom-[18%] z-[3] flex flex-col items-center gap-6 px-6 opacity-0"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.52em] text-text-secondary sm:text-xs">
            Play. Compete. Repeat.
          </span>

          {cinematic && signLit && (
            <MagneticButton className="pointer-events-auto">
              <button
                type="button"
                onClick={enterThroughLetter}
                data-cursor="hot"
                className="group inline-flex items-center gap-3 border border-accent-cyan/45 bg-accent-cyan/[0.05] px-10 py-4 text-[11px] font-medium uppercase tracking-[0.3em] text-text-primary backdrop-blur-sm transition-all duration-300 hover:border-accent-cyan hover:bg-accent-cyan hover:text-surface hover:shadow-[0_0_44px_-6px_var(--c-accent-cyan)]"
              >
                Enter Arcade
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </button>
            </MagneticButton>
          )}
        </div>

        {/* ── SCENE 4 · the machine ── */}
        <div
          ref={cabinetRef}
          className="pointer-events-none absolute inset-x-0 bottom-[13%] z-[2] flex flex-col items-center gap-2 px-6 text-center opacity-0"
        >
          <span className="text-[10px] uppercase tracking-[0.45em] text-text-muted">
            Cabinet 01
          </span>
          <span className="font-[family-name:var(--font-heading)] text-sm font-bold uppercase tracking-[0.3em] text-text-primary">
            The Original
          </span>
        </div>

        {/* ── SCENE 5 · the screen is live ── */}
        <div
          ref={crtRef}
          className="pointer-events-none absolute inset-x-0 top-[13%] z-[2] flex flex-col items-center gap-2 px-6 text-center opacity-0"
        >
          <span className="text-[10px] uppercase tracking-[0.45em] text-accent-cyan">
            ● Now Playing
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] text-text-muted">
            Three games · one machine
          </span>
        </div>

        {/* ── SCENE 7 · the three worlds ── */}
        {WORLDS.map((w, i) => (
          <div
            key={w.id}
            ref={(el) => {
              worldRefs.current[i] = el;
            }}
            className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center px-[var(--gutter)] text-center opacity-0"
          >
            <span
              className="text-[10px] font-medium uppercase tracking-[0.5em]"
              style={{ color: w.accent }}
            >
              {w.n}
            </span>
            <h2 className="display mt-5 text-[clamp(2.25rem,8.5vw,6.5rem)] text-text-primary">
              {w.title}
            </h2>
            <p className="mt-5 text-[11px] uppercase tracking-[0.42em] text-text-secondary sm:text-xs">
              {w.tagline}
            </p>
          </div>
        ))}

        {/* ── SCENE 8 · arrival ── */}
        <div
          ref={outroRef}
          className="absolute inset-0 z-[3] flex flex-col items-center justify-center px-[var(--gutter)] text-center opacity-0"
        >
          <h1 className="display text-text-primary [line-height:0.9]">
            <span className="block text-[clamp(2.75rem,12vw,9rem)]">NEON ARCADE</span>
          </h1>
          <p className="mt-6 text-[11px] uppercase tracking-[0.5em] text-text-secondary sm:text-xs">
            Play. Compete. Repeat.
          </p>
          <div className="mt-11 flex flex-wrap items-center justify-center gap-4">
            <MagneticButton>
              <Link
                href="/games"
                data-cursor="hot"
                className="group inline-flex items-center gap-3 bg-text-primary px-10 py-4 text-xs font-medium uppercase tracking-[0.24em] text-surface transition-colors duration-300 hover:bg-accent-cyan"
              >
                Enter Arcade
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </MagneticButton>
            <Link
              href="#games"
              className="border border-border px-8 py-4 text-xs font-medium uppercase tracking-[0.24em] text-text-primary transition-colors duration-300 hover:border-accent-cyan/60 hover:bg-accent-cyan/[0.06]"
            >
              Explore Games
            </Link>
          </div>
        </div>

        {/* cinematic vignette */}
        <div
          ref={vignetteRef}
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            opacity: 0.35,
            background:
              "radial-gradient(72% 66% at 50% 50%, transparent 46%, color-mix(in srgb, var(--c-surface) 92%, transparent) 100%)",
          }}
        />

        {/* portal flash — covers the cut when you click through the letter */}
        <div
          ref={portalRef}
          className="pointer-events-none fixed inset-0 z-[60] opacity-0"
          style={{
            transition: "opacity 340ms ease-out",
            background:
              "radial-gradient(65% 65% at 50% 50%, #eaffff 0%, #22d3ee 46%, #05161c 100%)",
          }}
        />

        {/* transition flash — hides the two camera cuts */}
        <div
          ref={flashRef}
          className="pointer-events-none absolute inset-0 z-[4] opacity-0"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 50%, #d8fbff 0%, #22d3ee 42%, rgba(8,20,26,0) 78%)",
          }}
        />

        {cinematic && (
          <div
            ref={hintRef}
            className="pointer-events-none absolute bottom-7 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-2"
          >
            <span className="text-[9px] uppercase tracking-[0.42em] text-text-muted">
              Scroll
            </span>
            <span className="relative block h-10 w-px overflow-hidden bg-text-muted/35">
              <span className="absolute left-0 top-0 h-3 w-px animate-[slide-in_1.7s_ease-in-out_infinite] bg-accent-cyan" />
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
