"use client";

import { useEffect, useRef, useState } from "react";
import type { GameEngine } from "../game/engine";
import type { HudSnapshot } from "../game/types";
import { NV_FONT } from "./shared";

const EMPTY: HudSnapshot = {
  hull: 100, hullMax: 100, shield: 60, shieldMax: 60, energy: 100, energyMax: 100,
  missiles: 4, missilesMax: 4, empReady: 1, boosting: false, score: 0, combo: 0, comboTimer: 0,
  objectiveLabel: "", objectiveProgress: "", objectiveDone: false, missionName: "",
  missionTimer: null, warnings: [], target: null, boss: null, toasts: [], critical: false,
  countdown: null, fps: 60,
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export default function Hud({
  engine,
  debug,
}: {
  engine: GameEngine;
  debug: boolean;
}) {
  const [s, setS] = useState<HudSnapshot>(EMPTY);
  const raf = useRef(0);

  useEffect(() => {
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 80) {
        last = t;
        setS(engine.snapshot());
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [engine]);

  const hullPct = s.hull / s.hullMax;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none" style={{ fontFamily: NV_FONT }}>
      {/* screen-edge danger vignette */}
      {s.critical && (
        <div className="absolute inset-0 animate-pulse" style={{ boxShadow: "inset 0 0 160px 20px rgba(239,68,68,0.35)" }} />
      )}

      {/* TOP LEFT — mission + objective */}
      <div className="absolute left-6 top-6 max-w-xs">
        <p className="text-[9px] uppercase tracking-[0.3em] text-white/40">Mission</p>
        <p className="text-sm uppercase tracking-[0.15em] text-white">{s.missionName}</p>
        <div className="mt-2 border-l border-[#22d3ee]/50 pl-2">
          <p className={`text-[10px] uppercase tracking-[0.2em] ${s.objectiveDone ? "text-[#a3e635]" : "text-white/60"}`}>
            {s.objectiveDone ? "OBJECTIVE COMPLETE" : s.objectiveLabel}
          </p>
          {!s.objectiveDone && s.objectiveProgress && (
            <p className="text-xs tabular-nums text-[#22d3ee]">{s.objectiveProgress}</p>
          )}
        </div>
      </div>

      {/* TOP CENTER — score + combo */}
      <div className="absolute left-1/2 top-6 -translate-x-1/2 text-center">
        <p className="text-2xl tabular-nums text-white" style={{ textShadow: "0 0 20px rgba(34,211,238,0.6)" }}>
          {s.score.toLocaleString()}
        </p>
        {s.combo > 1 && (
          <div className="nv-in mt-1">
            <span
              className="text-sm font-bold tabular-nums"
              style={{
                color: s.combo >= 20 ? "#f472b6" : s.combo >= 8 ? "#a3e635" : "#22d3ee",
                textShadow: `0 0 ${8 + s.combo}px currentColor`,
              }}
            >
              COMBO ×{s.combo}
            </span>
            <div className="mx-auto mt-0.5 h-0.5 w-20 overflow-hidden bg-white/10">
              <div className="h-full bg-white/60" style={{ width: `${s.comboTimer * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* TOP RIGHT — timer / countdown */}
      <div className="absolute right-6 top-6 text-right">
        {s.countdown !== null ? (
          <div className="animate-pulse">
            <p className="text-[9px] uppercase tracking-[0.3em] text-red-400">Rift Collapse</p>
            <p className="text-3xl tabular-nums text-red-400" style={{ textShadow: "0 0 24px rgba(239,68,68,0.8)" }}>
              0:{Math.ceil(s.countdown).toString().padStart(2, "0")}
            </p>
          </div>
        ) : s.missionTimer !== null ? (
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/40">Hold</p>
            <p className="text-2xl tabular-nums text-white">{fmtTime(s.missionTimer)}</p>
          </div>
        ) : null}
        {debug && (
          <p className="mt-2 text-[10px] text-white/30">
            {s.fps} fps · {engine.world.enemies.length} enemies ·{" "}
            {engine.world.pBullets.filter((b) => b.active).length + engine.world.eBullets.filter((b) => b.active).length} shots
          </p>
        )}
      </div>

      {/* BOSS bar */}
      {s.boss && (
        <div className="absolute left-1/2 top-24 w-[min(560px,70vw)] -translate-x-1/2 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#c084fc]">
            {s.boss.name} · PHASE {s.boss.phase}
          </p>
          <div className="mt-1 h-2 w-full overflow-hidden border border-white/10 bg-black/50">
            <div
              className="h-full transition-[width] duration-200"
              style={{
                width: `${(s.boss.hull / s.boss.hullMax) * 100}%`,
                background: s.boss.invulnerable
                  ? "repeating-linear-gradient(45deg,#6b7280,#6b7280 6px,#4b5563 6px,#4b5563 12px)"
                  : "linear-gradient(90deg,#8b5cf6,#e879f9)",
              }}
            />
          </div>
          {s.boss.subLabel && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-[#f0abfc]">{s.boss.subLabel}</p>
          )}
        </div>
      )}

      {/* Target lock */}
      {s.target && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-6 text-center">
          <div className="inline-block border border-[#22d3ee]/50 bg-black/40 px-3 py-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#22d3ee]">{s.target.name}</p>
            <div className="mt-1 h-1 w-28 overflow-hidden bg-white/10">
              <div className="h-full bg-red-400" style={{ width: `${(s.target.hull / s.target.hullMax) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-[9px] tabular-nums text-white/40">{Math.round(s.target.distance)}m</p>
          </div>
        </div>
      )}

      {/* Crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-6 w-6 rounded-full border transition-colors"
          style={{ borderColor: s.target ? "#22d3ee" : "rgba(255,255,255,0.35)" }}
        />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22d3ee]" />
      </div>

      {/* Warnings */}
      <div className="absolute left-1/2 top-1/3 flex -translate-x-1/2 flex-col items-center gap-2">
        {s.warnings.map((w) => (
          <div
            key={w.id}
            className={`nv-in border px-4 py-1.5 text-[11px] uppercase tracking-[0.28em] ${
              w.kind === "danger"
                ? "border-red-500/60 bg-red-500/10 text-red-300 animate-pulse"
                : "border-[#22d3ee]/50 bg-[#22d3ee]/10 text-[#22d3ee]"
            }`}
          >
            ⚠ {w.label}
          </div>
        ))}
      </div>

      {/* Toasts (right of centre) */}
      <div className="absolute left-1/2 top-[55%] flex translate-x-16 flex-col gap-1">
        {s.toasts.map((t) => (
          <span
            key={t.id}
            className="nv-in-left text-sm font-bold"
            style={{
              color:
                t.kind === "crit" ? "#a3e635" :
                t.kind === "objective" ? "#22d3ee" :
                t.kind === "reward" ? "#fbbf24" :
                t.kind === "level" ? "#f472b6" : "#e5e7eb",
              textShadow: "0 0 12px currentColor",
            }}
          >
            {t.text}
          </span>
        ))}
      </div>

      {/* BOTTOM LEFT — hull / shield */}
      <div className="absolute bottom-6 left-6 w-56 space-y-2">
        <Bar label="Hull" value={s.hull} max={s.hullMax} colour={hullPct < 0.25 ? "#ef4444" : "#a3e635"} flash={hullPct < 0.25} />
        <Bar label="Shield" value={s.shield} max={s.shieldMax} colour="#22d3ee" />
      </div>

      {/* BOTTOM RIGHT — energy / missiles / emp */}
      <div className="absolute bottom-6 right-6 w-56 space-y-2">
        <Bar label="Energy" value={s.energy} max={s.energyMax} colour={s.boosting ? "#f472b6" : "#38bdf8"} />
        <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.28em] text-white/50">
          <span>Missiles</span>
          <span className="flex gap-1">
            {Array.from({ length: s.missilesMax }).map((_, i) => (
              <span
                key={i}
                className="h-2 w-2"
                style={{ background: i < s.missiles ? "#f472b6" : "rgba(255,255,255,0.12)" }}
              />
            ))}
          </span>
        </div>
        <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.28em]">
          <span className={s.empReady >= 1 ? "text-[#8b5cf6]" : "text-white/40"}>EMP · E</span>
          <div className="h-1.5 w-24 overflow-hidden bg-white/10">
            <div className="h-full bg-[#8b5cf6]" style={{ width: `${s.empReady * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({
  value, max, colour, label, flash,
}: { value: number; max: number; colour: string; label: string; flash?: boolean }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.28em] text-white/50">
        <span>{label}</span>
        <span className="tabular-nums text-white/70">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-white/[0.08]">
        <div
          className={`h-full ${flash ? "animate-pulse" : ""}`}
          style={{ width: `${pct * 100}%`, background: colour, boxShadow: `0 0 10px ${colour}`, transition: "width 140ms linear" }}
        />
      </div>
    </div>
  );
}
