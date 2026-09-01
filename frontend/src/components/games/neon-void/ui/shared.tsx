"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

export const NV_FONT = "var(--font-heading), 'Space Grotesk', system-ui, sans-serif";

export function ScreenShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`nv-in absolute inset-0 z-20 flex flex-col ${className}`}>
      {children}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative border border-[color:var(--glass-border)] bg-[rgba(6,8,16,0.72)] backdrop-blur-md ${className}`}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 40px 120px -60px rgba(34,211,238,0.4)" }}
    >
      <span className="pointer-events-none absolute -left-px top-4 h-8 w-px bg-[#22d3ee]" />
      <span className="pointer-events-none absolute -right-px bottom-4 h-8 w-px bg-[#8b5cf6]" />
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  glow?: boolean;
};

export function NeonButton({ variant = "ghost", glow, className = "", children, ...rest }: BtnProps) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-[12px] font-medium uppercase tracking-[0.22em] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-[#22d3ee] text-black hover:bg-[#67e8f9]"
      : variant === "danger"
        ? "border border-red-500/40 text-red-300 hover:border-red-400 hover:bg-red-500/10"
        : "border border-[color:var(--glass-border)] text-[#c8cdd8] hover:border-[#22d3ee]/70 hover:text-white hover:bg-[#22d3ee]/[0.06]";
  return (
    <button
      {...rest}
      className={`${base} ${styles} ${glow ? "shadow-[0_0_36px_-6px_rgba(34,211,238,0.6)]" : ""} ${className}`}
      style={{ fontFamily: NV_FONT }}
    >
      <span className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-current opacity-60" />
      <span className="absolute right-0 bottom-0 h-1.5 w-1.5 border-r border-b border-current opacity-60" />
      {children}
    </button>
  );
}

export function Bar({
  value,
  max,
  colour,
  label,
  sub,
  flash,
}: {
  value: number;
  max: number;
  colour: string;
  label: string;
  sub?: string;
  flash?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.28em] text-white/50">
        <span>{label}</span>
        <span className="tabular-nums text-white/70">{sub ?? Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-white/[0.08]">
        <div
          className={`h-full transition-[width] duration-150 ${flash ? "animate-pulse" : ""}`}
          style={{ width: `${pct * 100}%`, background: colour, boxShadow: `0 0 10px ${colour}` }}
        />
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border border-white/5 bg-white/[0.02] px-4 py-3">
      <span className="text-[9px] uppercase tracking-[0.28em] text-white/40">{label}</span>
      <span className="text-lg text-white tabular-nums" style={{ fontFamily: NV_FONT }}>
        {value}
      </span>
    </div>
  );
}

export function GameTitle({ small }: { small?: boolean }) {
  return (
    <div className="select-none text-center">
      <h1
        className={`${small ? "text-3xl md:text-4xl" : "text-5xl md:text-7xl"} font-bold leading-[0.9] tracking-tight text-white`}
        style={{ fontFamily: NV_FONT, textShadow: "0 0 40px rgba(139,92,246,0.5)" }}
      >
        NEON <span className="text-[#22d3ee]" style={{ textShadow: "0 0 40px rgba(34,211,238,0.7)" }}>VOID</span>
      </h1>
      <p className="mt-2 text-[10px] uppercase tracking-[0.6em] text-white/45">Last Orbit</p>
    </div>
  );
}
