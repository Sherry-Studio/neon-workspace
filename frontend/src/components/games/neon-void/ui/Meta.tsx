"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { GameSave, Settings, UpgradeKey } from "../game/types";
import { UPGRADES, resolveStats, levelFromXp } from "../data/upgrades";
import { ACHIEVEMENTS } from "../data/achievements";
import { fetchLeaderboard, type LeaderRow } from "../game/service";
import { dailyChallengeFor } from "../data/dailyChallenge";
import { ScreenShell, Panel, NeonButton, NV_FONT } from "./shared";

/* ================================================ HANGAR / UPGRADES */
export function Hangar({
  save,
  onBuy,
  onBack,
}: {
  save: GameSave;
  onBuy: (key: UpgradeKey) => void;
  onBack: () => void;
}) {
  const stats = resolveStats(save);
  const lvl = levelFromXp(save.xp);
  const [tab, setTab] = useState<"ship" | "weapons" | "upgrades">("upgrades");

  const shipStats: [string, string][] = [
    ["Hull", `${Math.round(stats.hullMax)}`],
    ["Shield", `${Math.round(stats.shieldMax)}`],
    ["Energy", `${Math.round(stats.energyMax)}`],
    ["Speed", `${Math.round(stats.speed)}`],
    ["Pulse DMG", `${stats.damage.toFixed(1)}`],
    ["Fire Rate", `${stats.fireRate.toFixed(1)}/s`],
    ["Missiles", `${stats.missileMax}`],
    ["Missile DMG", `${stats.missileDamage}`],
  ];

  const weaponRows = UPGRADES.filter((u) =>
    ["damage", "fireRate", "missileDamage", "missileCapacity", "empStrength", "empCooldown"].includes(u.key),
  );
  const shipRows = UPGRADES.filter((u) => !weaponRows.includes(u));

  const rows = tab === "weapons" ? weaponRows : tab === "ship" ? shipRows : UPGRADES;

  return (
    <ScreenShell className="overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">NX-01 · Phantom</p>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: NV_FONT }}>Hangar</h2>
          </div>
          <div className="text-right text-sm">
            <p className="text-[#fbbf24]">{save.credits.toLocaleString()}c</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              LVL {lvl.level} · {lvl.into}/{lvl.need} XP
            </p>
          </div>
        </div>

        <div className="mt-4 h-1 w-full overflow-hidden bg-white/10">
          <div className="h-full bg-[#a3e635]" style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
        </div>

        <div className="mt-6 grid gap-2 grid-cols-4 sm:grid-cols-8">
          {shipStats.map(([k, v]) => (
            <div key={k} className="border border-white/5 bg-white/[0.02] px-2 py-2 text-center">
              <p className="text-[8px] uppercase tracking-[0.15em] text-white/40">{k}</p>
              <p className="text-sm tabular-nums text-white" style={{ fontFamily: NV_FONT }}>{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-4 border-b border-white/10">
          {(["ship", "weapons", "upgrades"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-[11px] uppercase tracking-[0.24em] ${tab === t ? "border-b border-[#22d3ee] text-white" : "text-white/40"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          {rows.map((u) => {
            const level = save.upgrades[u.key] ?? 0;
            const maxed = level >= u.max;
            const cost = maxed ? 0 : u.cost(level + 1);
            const cur = u.base + u.step * level;
            const next = u.base + u.step * (level + 1);
            const afford = save.credits >= cost;
            return (
              <div key={u.key} className="flex items-center gap-4 border border-white/5 bg-white/[0.02] px-4 py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white" style={{ fontFamily: NV_FONT }}>{u.name}</span>
                    <span className="text-[10px] tabular-nums text-white/40">LV {level}/{u.max}</span>
                  </div>
                  <p className="text-[11px] text-white/45">{u.description}</p>
                  {!maxed && (
                    <p className="mt-0.5 text-[10px] tabular-nums text-white/55">
                      {u.format(cur)} <span className="text-white/30">→</span> <span className="text-[#22d3ee]">{u.format(next)}</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-1">
                    {Array.from({ length: u.max }).map((_, i) => (
                      <span key={i} className="h-1.5 w-3" style={{ background: i < level ? "#22d3ee" : "rgba(255,255,255,0.12)" }} />
                    ))}
                  </div>
                  {maxed ? (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#a3e635]">MAX</span>
                  ) : (
                    <NeonButton
                      variant={afford ? "primary" : "ghost"}
                      disabled={!afford}
                      onClick={() => onBuy(u.key)}
                      className="!px-3 !py-1.5 !text-[10px]"
                    >
                      {cost.toLocaleString()}c
                    </NeonButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <NeonButton onClick={onBack}>Back</NeonButton>
        </div>
      </div>
    </ScreenShell>
  );
}

/* ================================================ SETTINGS */
export function SettingsPanel({
  settings,
  onChange,
  onClose,
  inGame,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  inGame?: boolean;
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/55">{label}</span>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
  const Slider = ({ v, on, min = 0, max = 1, step = 0.05 }: { v: number; on: (n: number) => void; min?: number; max?: number; step?: number }) => (
    <>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(parseFloat(e.target.value))} className="w-32 accent-[#22d3ee]" />
      <span className="w-8 text-right text-[10px] tabular-nums text-white/40">{Math.round(((v - min) / (max - min)) * 100)}</span>
    </>
  );
  const Toggle = ({ v, on }: { v: boolean; on: (b: boolean) => void }) => (
    <button
      onClick={() => on(!v)}
      className={`h-5 w-9 border transition-colors ${v ? "border-[#22d3ee] bg-[#22d3ee]/20" : "border-white/20 bg-white/5"}`}
    >
      <span className={`block h-3.5 w-3.5 bg-white transition-transform ${v ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );

  return (
    <ScreenShell className={`items-center justify-center ${inGame ? "bg-black/70 backdrop-blur-sm" : ""}`}>
      <Panel className="relative z-10 w-[min(460px,92vw)] p-8">
        <p className="text-[11px] uppercase tracking-[0.4em] text-white/40">Settings</p>
        <div className="mt-4 divide-y divide-white/5">
          <Row label="Master Volume"><Slider v={settings.masterVolume} on={(n) => set("masterVolume", n)} /></Row>
          <Row label="Music"><Slider v={settings.musicVolume} on={(n) => set("musicVolume", n)} /></Row>
          <Row label="SFX"><Slider v={settings.sfxVolume} on={(n) => set("sfxVolume", n)} /></Row>
          <Row label="Graphics">
            {(["low", "medium", "high"] as const).map((q) => (
              <button
                key={q}
                onClick={() => set("quality", q)}
                className={`px-2 py-1 text-[10px] uppercase tracking-[0.15em] ${settings.quality === q ? "bg-[#22d3ee] text-black" : "border border-white/15 text-white/50"}`}
              >
                {q}
              </button>
            ))}
          </Row>
          <Row label="Camera Shake"><Slider v={settings.cameraShake} on={(n) => set("cameraShake", n)} /></Row>
          <Row label="Mouse Sensitivity"><Slider v={settings.sensitivity} on={(n) => set("sensitivity", n)} min={0.3} max={2} step={0.05} /></Row>
          <Row label="Screen Flash"><Toggle v={settings.screenFlash} on={(b) => set("screenFlash", b)} /></Row>
          <Row label="Reduced Motion"><Toggle v={settings.reducedMotion} on={(b) => set("reducedMotion", b)} /></Row>
          <Row label="Target Assist"><Toggle v={settings.targetAssist} on={(b) => set("targetAssist", b)} /></Row>
        </div>
        <div className="mt-6">
          <NeonButton variant="primary" onClick={onClose}>Done</NeonButton>
        </div>
      </Panel>
    </ScreenShell>
  );
}

/* ================================================ ACHIEVEMENTS */
export function AchievementsPanel({ save, onBack }: { save: GameSave; onBack: () => void }) {
  const unlocked = ACHIEVEMENTS.filter((a) => (save.achievements[a.id] ?? 0) >= a.target).length;
  return (
    <ScreenShell className="overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 py-14">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">
              {unlocked} / {ACHIEVEMENTS.length}
            </p>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: NV_FONT }}>Achievements</h2>
          </div>
          <NeonButton onClick={onBack}>Back</NeonButton>
        </div>
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => {
            const prog = save.achievements[a.id] ?? 0;
            const done = prog >= a.target;
            return (
              <div key={a.id} className={`border p-4 ${done ? "border-[#a3e635]/40 bg-[#a3e635]/[0.04]" : "border-white/5 bg-white/[0.02]"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${done ? "text-[#a3e635]" : "text-white/70"}`} style={{ fontFamily: NV_FONT }}>{a.name}</span>
                  {done && <Check size={14} className="text-[#a3e635]" />}
                </div>
                <p className="mt-1 text-[11px] text-white/45">{a.description}</p>
                {a.target > 1 && !done && (
                  <div className="mt-2 h-1 w-full overflow-hidden bg-white/10">
                    <div className="h-full bg-white/40" style={{ width: `${(prog / a.target) * 100}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScreenShell>
  );
}

/* ================================================ LEADERBOARD */
export function LeaderboardPanel({ onBack }: { onBack: () => void }) {
  const [range, setRange] = useState<"day" | "week" | "all">("all");
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "empty" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    fetchLeaderboard(range).then((res) => {
      if (!alive) return;
      if (res.error) setState("error");
      else {
        setRows(res.rows);
        setState(res.rows.length ? "ok" : "empty");
      }
    });
    return () => { alive = false; };
  }, [range]);

  return (
    <ScreenShell className="overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-xl px-6 py-14">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Neon Arcade</p>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: NV_FONT }}>Leaderboard</h2>
          </div>
          <NeonButton onClick={onBack}>Back</NeonButton>
        </div>

        <div className="mt-6 flex gap-4 border-b border-white/10">
          {(["day", "week", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`pb-2 text-[11px] uppercase tracking-[0.24em] ${range === r ? "border-b border-[#22d3ee] text-white" : "text-white/40"}`}
            >
              {r === "day" ? "Today" : r === "week" ? "This Week" : "All Time"}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {state === "loading" && <p className="py-8 text-center text-xs uppercase tracking-[0.3em] text-white/30">Loading…</p>}
          {state === "error" && <p className="py-8 text-center text-xs uppercase tracking-[0.3em] text-white/40">Leaderboard temporarily unavailable</p>}
          {state === "empty" && <p className="py-8 text-center text-xs uppercase tracking-[0.3em] text-white/40">No scores yet — be the first</p>}
          {state === "ok" && (
            <ol className="divide-y divide-white/5 border-y border-white/5">
              {rows.map((r) => (
                <li key={r.rank + r.username} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-3">
                    <span className={`w-6 text-center text-xs tabular-nums ${r.rank <= 3 ? "text-[#22d3ee]" : "text-white/40"}`}>{r.rank}</span>
                    <span className="text-sm text-white">{r.username}</span>
                  </span>
                  <span className="text-sm tabular-nums text-[#22d3ee]" style={{ fontFamily: NV_FONT }}>
                    {r.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}

/* ================================================ DAILY CHALLENGE */
export function DailyChallengePanel({
  onPlay,
  onBack,
}: {
  onPlay: () => void;
  onBack: () => void;
}) {
  const dc = dailyChallengeFor();
  return (
    <ScreenShell className="items-center justify-center">
      <Panel className="relative z-10 w-[min(460px,92vw)] p-8 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Daily Challenge · {dc.date}</p>
        <h2 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: NV_FONT }}>{dc.missionName}</h2>
        <p className="mt-1 text-sm uppercase tracking-[0.3em] text-[#f472b6]">{dc.modifierLabel}</p>
        <p className="mt-4 text-sm text-white/55">{dc.target}</p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
          Everyone gets the same challenge. Resets at 00:00 UTC.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <NeonButton variant="primary" glow onClick={onPlay}>Run It</NeonButton>
          <NeonButton onClick={onBack}>Back</NeonButton>
        </div>
      </Panel>
    </ScreenShell>
  );
}
