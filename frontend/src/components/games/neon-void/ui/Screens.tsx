"use client";

import { useEffect, useRef, useState } from "react";
import type { MissionDef, MissionResult, Rank } from "../game/types";
import { ScreenShell, Panel, NeonButton, Stat, GameTitle, NV_FONT } from "./shared";
import { nextMission } from "../data/missions";

/* ================================================ OPENING CINEMATIC */
const LINES: { text: string; delay: number; kind: "radio" | "sys" | "rift" | "mission" }[] = [
  { text: "COMMAND: Phantom, do you copy?", delay: 900, kind: "radio" },
  { text: "COMMAND: Fleet status?", delay: 2600, kind: "radio" },
  { text: "COMMAND: …we lost the entire defense line.", delay: 4400, kind: "radio" },
  { text: "COMMAND: They're opening another Rift.", delay: 6400, kind: "radio" },
  { text: "UNKNOWN: Your system belongs to the Rift.", delay: 8600, kind: "rift" },
  { text: "SYSTEM: PHANTOM ONLINE", delay: 10600, kind: "sys" },
  { text: "SYSTEM: WEAPONS ONLINE", delay: 11400, kind: "sys" },
  { text: "SYSTEM: SHIELDS ONLINE", delay: 12200, kind: "sys" },
  { text: "SYSTEM: NAVIGATION ONLINE", delay: 13000, kind: "sys" },
  { text: "MISSION: LAST DEFENSE", delay: 14200, kind: "mission" },
];

export function Cinematic({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const [shown, setShown] = useState<number>(0);
  const [ready, setReady] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const ts = timers.current;
    LINES.forEach((l, i) => {
      ts.push(window.setTimeout(() => setShown(i + 1), l.delay));
    });
    ts.push(window.setTimeout(() => setReady(true), 15000));
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <ScreenShell className="items-center justify-center bg-black">
      {/* portal glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.28), rgba(190,24,93,0.14) 45%, transparent 70%)",
          filter: "blur(30px)",
          animation: "drift 14s ease-in-out infinite",
        }}
      />
      <div className="relative z-10 w-full max-w-2xl px-6 font-mono text-sm">
        {LINES.slice(0, shown).map((l, i) => (
          <p
            key={i}
            className={`nv-in-left mb-2 tracking-wide ${
              l.kind === "rift" ? "text-[#f0abfc]" :
              l.kind === "sys" ? "text-[#22d3ee]" :
              l.kind === "mission" ? "mt-4 text-lg font-bold text-white" :
              "text-white/70"
            }`}
            style={l.kind === "mission" ? { fontFamily: NV_FONT } : undefined}
          >
            {l.text}
          </p>
        ))}
      </div>

      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-3">
        {ready && (
          <NeonButton variant="primary" glow onClick={onStart}>
            Start
          </NeonButton>
        )}
        <NeonButton variant="ghost" onClick={onSkip}>
          Skip
        </NeonButton>
      </div>
    </ScreenShell>
  );
}

/* ================================================ LOADING */
export function Loading({ label = "LOADING SECTOR" }: { label?: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setP((v) => Math.min(100, v + Math.random() * 22)), 130);
    return () => clearInterval(t);
  }, []);
  return (
    <ScreenShell className="items-center justify-center bg-black">
      <GameTitle small />
      <p className="mt-6 text-[10px] uppercase tracking-[0.4em] text-white/40">{label}…</p>
      <div className="mt-4 h-0.5 w-64 overflow-hidden bg-white/10">
        <div className="h-full bg-[#22d3ee]" style={{ width: `${p}%`, transition: "width 120ms linear" }} />
      </div>
    </ScreenShell>
  );
}

/* ================================================ BRIEFING */
export function Briefing({
  mission,
  onStart,
  onBack,
}: {
  mission: MissionDef;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <ScreenShell className="items-center justify-center">
      <Panel className="w-[min(680px,92vw)] p-8">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">{mission.sectorName}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-[#22d3ee]">
          Mission {String(mission.index).padStart(2, "0")}
        </p>
        <h2 className="mt-1 text-3xl font-bold text-white" style={{ fontFamily: NV_FONT }}>
          {mission.name}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">{mission.brief}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Threat" value={<span className={mission.threat === "EXTREME" ? "text-red-400" : mission.threat === "HIGH" ? "text-amber-400" : "text-[#22d3ee]"}>{mission.threat}</span>} />
          <Stat label="Objective" value={<span className="text-sm">{mission.objective.label}</span>} />
          <Stat label="Expected" value={<span className="text-xs text-white/70">{mission.expectedEnemies}</span>} />
          <Stat label="Reward" value={<span className="text-sm">{mission.reward.credits.toLocaleString()}c</span>} />
        </div>

        {mission.optional.length > 0 && (
          <div className="mt-4 border-l border-[#a3e635]/40 pl-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#a3e635]">Bonus objectives</p>
            {mission.optional.map((o) => (
              <p key={o.id} className="text-xs text-white/50">
                • {o.label} <span className="text-white/30">(+{o.credits}c)</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <NeonButton variant="primary" glow onClick={onStart}>
            Launch
          </NeonButton>
          <NeonButton onClick={onBack}>Back</NeonButton>
        </div>
      </Panel>
    </ScreenShell>
  );
}

/* ================================================ PAUSE */
export function PauseMenu({
  onResume,
  onRestart,
  onSettings,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onQuit: () => void;
}) {
  return (
    <ScreenShell className="items-center justify-center bg-black/70 backdrop-blur-sm">
      <Panel className="w-[min(360px,90vw)] p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.5em] text-white/40">Paused</p>
        <div className="mt-6 flex flex-col gap-3">
          <NeonButton variant="primary" onClick={onResume}>Resume</NeonButton>
          <NeonButton onClick={onRestart}>Restart Mission</NeonButton>
          <NeonButton onClick={onSettings}>Settings</NeonButton>
          <NeonButton variant="danger" onClick={onQuit}>Quit to Menu</NeonButton>
        </div>
      </Panel>
    </ScreenShell>
  );
}

/* ================================================ RESULTS */
const RANK_COLOUR: Record<Rank, string> = {
  D: "#9ca3af", C: "#60a5fa", B: "#22d3ee", A: "#a3e635", S: "#f472b6", "S+": "#fbbf24",
};

export function Results({
  result,
  mission,
  submitState,
  onNext,
  onReplay,
  onHangar,
  onSelect,
  onMenu,
}: {
  result: MissionResult;
  mission: MissionDef;
  submitState: "idle" | "sending" | "ok" | "flagged" | "signin" | "offline";
  onNext: () => void;
  onReplay: () => void;
  onHangar: () => void;
  onSelect: () => void;
  onMenu: () => void;
}) {
  const victory = result.success && mission.index === 9;
  const title = victory ? "RIFT CORE DESTROYED" : result.success ? "MISSION COMPLETE" : result.reason === "timeout" ? "RIFT COLLAPSE" : "SHIP DESTROYED";
  const has = nextMission(mission.id);

  return (
    <ScreenShell className="items-center justify-center overflow-y-auto py-10">
      <Panel className="w-[min(620px,92vw)] p-8">
        <p
          className="text-center text-2xl font-bold uppercase tracking-[0.14em]"
          style={{ fontFamily: NV_FONT, color: result.success ? "#22d3ee" : "#ef4444" }}
        >
          {title}
        </p>

        {result.success && (
          <div className="mt-4 text-center">
            <span className="text-[10px] uppercase tracking-[0.4em] text-white/40">Rank</span>
            <p
              className="text-6xl font-bold"
              style={{ fontFamily: NV_FONT, color: RANK_COLOUR[result.rank], textShadow: `0 0 40px ${RANK_COLOUR[result.rank]}` }}
            >
              {result.rank}
            </p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Score" value={result.score.toLocaleString()} />
          <Stat label="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
          <Stat label="Enemies" value={result.kills} />
          <Stat label="Max Combo" value={`×${result.maxCombo}`} />
          <Stat label="Time" value={`${Math.floor(result.timeSeconds / 60)}:${(result.timeSeconds % 60).toString().padStart(2, "0")}`} />
          <Stat label="Hull Damage" value={`${Math.round(result.hullDamageTaken * 100)}%`} />
        </div>

        <div className="mt-4 flex items-center justify-between border border-white/5 bg-white/[0.02] px-4 py-3 text-sm">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Rewards</span>
          <span className="text-white">
            <span className="text-[#fbbf24]">+{result.credits.toLocaleString()}c</span>{" "}
            <span className="text-[#a3e635]">+{result.xp} XP</span>
          </span>
        </div>

        {result.optionalCleared.length > 0 && (
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.24em] text-[#a3e635]">
            {result.optionalCleared.length} bonus objective{result.optionalCleared.length > 1 ? "s" : ""} cleared
          </p>
        )}

        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.24em] text-white/40">
          {submitState === "sending" && "Submitting to leaderboard…"}
          {submitState === "ok" && "Score submitted to the Neon Arcade leaderboard"}
          {submitState === "flagged" && "Score recorded — flagged for review"}
          {submitState === "signin" && "Sign in to save this score to the leaderboard"}
          {submitState === "offline" && "Leaderboard unavailable — progress saved locally"}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {victory ? (
            <NeonButton variant="primary" glow onClick={onMenu}>Continue</NeonButton>
          ) : result.success && has ? (
            <NeonButton variant="primary" glow onClick={onNext}>Next Mission</NeonButton>
          ) : (
            <NeonButton variant="primary" glow onClick={onReplay}>
              {result.success ? "Replay" : "Retry"}
            </NeonButton>
          )}
          {!victory && <NeonButton onClick={onReplay}>Replay</NeonButton>}
          <NeonButton onClick={onHangar}>Hangar</NeonButton>
          <NeonButton onClick={onSelect}>Mission Select</NeonButton>
        </div>
      </Panel>
    </ScreenShell>
  );
}

/* ================================================ VICTORY CINEMATIC */
export function VictoryCinematic({
  totals,
  onDone,
}: {
  totals: { missions: number; score: number; credits: number; xp: number; achievements: number };
  onDone: () => void;
}) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 2400);
    const t2 = setTimeout(() => setStage(2), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <ScreenShell className="items-center justify-center bg-black">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 60%, rgba(34,211,238,0.14), transparent 60%)" }}
      />
      <div className="relative z-10">
        {stage === 0 && (
          <p key="a" className="nv-in text-lg tracking-[0.3em] text-white/70">
            THE SYSTEM IS SAFE…
          </p>
        )}
        {stage === 1 && (
          <div key="b" className="nv-in text-center">
            <GameTitle />
            <p className="mt-4 text-sm uppercase tracking-[0.5em] text-[#22d3ee]">Campaign Complete</p>
          </div>
        )}
        {stage === 2 && (
          <div key="c" className="nv-in w-[min(520px,92vw)] text-center">
            <p className="text-sm uppercase tracking-[0.5em] text-[#22d3ee]">Campaign Complete</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Stat label="Missions" value={totals.missions} />
              <Stat label="Score" value={totals.score.toLocaleString()} />
              <Stat label="Credits" value={totals.credits.toLocaleString()} />
              <Stat label="XP" value={totals.xp.toLocaleString()} />
              <Stat label="Achievements" value={`${totals.achievements}`} />
              <Stat label="Cosmetic" value={<span className="text-[#f472b6]">PHANTOM VOID</span>} />
            </div>
            <div className="mt-8">
              <NeonButton variant="primary" glow onClick={onDone}>Return to Menu</NeonButton>
            </div>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}

/* ================================================ MOBILE / WEBGL fallback */
export function BlockingMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <ScreenShell className="items-center justify-center bg-black px-6">
      <Panel className="max-w-sm p-8 text-center">
        <p className="text-lg font-bold text-white" style={{ fontFamily: NV_FONT }}>{title}</p>
        <p className="mt-3 text-sm text-white/60">{body}</p>
        {action && (
          <div className="mt-6">
            <NeonButton variant="primary" onClick={action.onClick}>{action.label}</NeonButton>
          </div>
        )}
      </Panel>
    </ScreenShell>
  );
}

export function FirstTimeTips({ onDone }: { onDone: () => void }) {
  return (
    <ScreenShell className="items-center justify-center bg-black/60 backdrop-blur-sm">
      <Panel className="w-[min(420px,92vw)] p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-[#22d3ee]">Flight Check</p>
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-left text-sm text-white/70">
          <span className="text-white/40">Mouse</span><span>Steer — the nose follows the cursor</span>
          <span className="text-white/40">W / S</span><span>Throttle up / down</span>
          <span className="text-white/40">A / D</span><span>Yaw</span>
          <span className="text-white/40">Q / E</span><span>Roll</span>
          <span className="text-white/40">L-Click</span><span>Pulse Cannon</span>
          <span className="text-white/40">R-Click / R</span><span>Rift Missile (hold reticle to lock)</span>
          <span className="text-white/40">Shift</span><span>Afterburner</span>
          <span className="text-white/40">X</span><span>EMP Burst</span>
          <span className="text-white/40">Esc</span><span>Pause</span>
        </div>
        <div className="mt-6">
          <NeonButton variant="primary" glow onClick={onDone}>Got it</NeonButton>
        </div>
      </Panel>
    </ScreenShell>
  );
}
