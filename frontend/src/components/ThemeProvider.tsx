"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { setBlend, setThemeName, type Theme } from "@/lib/themeStore";

interface Ctx {
  theme: Theme;
  /** true while the luminous wave is crossing the screen */
  transitioning: boolean;
  toggle: (origin?: { x: number; y: number }) => void;
}

const ThemeCtx = createContext<Ctx>({
  theme: "dark",
  transitioning: false,
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeCtx);

const STORAGE_KEY = "neonarcade-theme";
const DURATION = 950;

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [transitioning, setTransitioning] = useState(false);
  const raf = useRef(0);
  const waveRef = useRef<HTMLDivElement>(null);

  // restore the saved choice (the inline script in layout has already applied
  // it to <html>, so this only syncs React state — no flash, no hydration gap)
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
    setTheme(saved);
    setThemeName(saved);
    setBlend(saved === "light" ? 1 : 0);
    document.documentElement.dataset.theme = saved;
  }, []);

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      setTheme((prev) => {
        const next: Theme = prev === "dark" ? "light" : "dark";
        const from = prev === "light" ? 1 : 0;
        const to = next === "light" ? 1 : 0;

        localStorage.setItem(STORAGE_KEY, next);
        setThemeName(next);
        document.documentElement.dataset.theme = next;

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
          setBlend(to);
          return next;
        }

        // luminous wave expands from the toggle
        const wave = waveRef.current;
        if (wave && origin) {
          const r = Math.hypot(
            Math.max(origin.x, window.innerWidth - origin.x),
            Math.max(origin.y, window.innerHeight - origin.y)
          );
          wave.style.setProperty("--wx", `${origin.x}px`);
          wave.style.setProperty("--wy", `${origin.y}px`);
          wave.style.setProperty("--wr", `${r}px`);
          wave.classList.remove("theme-wave-run");
          void wave.offsetWidth; // restart the animation
          wave.classList.add("theme-wave-run");
        }

        // drive the 3D blend on its own clock
        setTransitioning(true);
        cancelAnimationFrame(raf.current);
        const t0 = performance.now();
        const step = (now: number) => {
          const k = Math.min((now - t0) / DURATION, 1);
          // easeInOutCubic
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          setBlend(from + (to - from) * e);
          if (k < 1) raf.current = requestAnimationFrame(step);
          else setTransitioning(false);
        };
        raf.current = requestAnimationFrame(step);

        return next;
      });
    },
    []
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <ThemeCtx.Provider value={{ theme, transitioning, toggle }}>
      {children}
      <div ref={waveRef} className="theme-wave" aria-hidden />
    </ThemeCtx.Provider>
  );
}
