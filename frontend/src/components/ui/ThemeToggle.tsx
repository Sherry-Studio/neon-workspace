"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Two-state switch. The luminous wave that crosses the page originates from
 * this button's centre, so the light really does spread from the control.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const light = theme === "light";

  return (
    <button
      type="button"
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={light}
      data-cursor="hot"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      className={`group relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border border-white/12 bg-white/[0.04] px-1 transition-colors duration-500 hover:border-accent-cyan/50 ${className}`}
    >
      {/* travelling knob */}
      <span
        className="pointer-events-none absolute left-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-cyan text-black shadow-[0_0_14px_var(--c-accent-cyan)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: light ? "translateX(24px)" : "translateX(0)" }}
      >
        {light ? <Sun size={12} strokeWidth={2.4} /> : <Moon size={12} strokeWidth={2.4} />}
      </span>
      {/* the inactive icon sits on the far side */}
      <span className="pointer-events-none ml-auto mr-0.5 text-text-muted transition-opacity duration-500">
        {light ? <Moon size={12} strokeWidth={2} /> : <Sun size={12} strokeWidth={2} />}
      </span>
    </button>
  );
}
