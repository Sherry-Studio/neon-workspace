"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Lock, Check } from "lucide-react";
import type { GameSave, Settings } from "../game/types";
import { MISSIONS } from "../data/missions";
import { missionUnlocked } from "../game/save";
import { levelFromXp } from "../data/upgrades";
import { ScreenShell, NeonButton, NV_FONT } from "./shared";
import { ShipModel } from "../scene/Scene";

/* ---------------- shared 3D backdrop ---------------- */
function DriftingPhantom() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.rotation.y += dt * 0.12;
    g.current.rotation.z = Math.sin(performance.now() / 3200) * 0.08;
    g.current.position.y = -0.4 + Math.sin(performance.now() / 2400) * 0.3;
  });
  return (
    <group ref={g} scale={1.05} position={[1.5, -0.6, 0]} rotation={[0.16, 2.55, 0.04]}>
      <ShipModel />
      <pointLight position={[0, 0, 3]} color="#63d3e8" intensity={2.4} distance={16} />
    </group>
  );
}

/** Menu 3D contents — rendered inside the single shared <Canvas>. */
export function MenuWorld({ quality }: { quality: Settings["quality"] }) {
  const { scene, camera } = useThree();
  const geo = useMemo(() => {
    const count = quality === "low" ? 900 : 2400;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 120 + Math.random() * 300;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [quality]);

  const applied = useRef(false);
  useFrame(({ clock }) => {
    if (!applied.current) {
      applied.current = true;
      scene.background = new THREE.Color("#05060a");
      scene.fog = new THREE.FogExp2("#05060a", 0.0016);
      const cam = camera as THREE.PerspectiveCamera;
      cam.fov = 42;
      cam.updateProjectionMatrix();
    }
    const t = clock.elapsedTime;
    camera.position.set(Math.sin(t * 0.05) * 3, 1.5 + Math.sin(t * 0.07) * 0.6, 12);
    camera.lookAt(0, -0.3, 0);
  });

  return (
    <>
      <ambientLight intensity={0.06} color="#26324b" />
      <directionalLight position={[40, 20, -30]} intensity={2.6} color="#fff2df" />
      <directionalLight position={[-30, -10, 20]} intensity={0.4} color="#3f63a8" />
      <points geometry={geo}>
        <pointsMaterial size={1} color="#c8d4e6" sizeAttenuation transparent opacity={0.7} depthWrite={false} />
      </points>
      {/* distant planet — enormous, half-lit, pure scale */}
      <group position={[-70, -34, -120]}>
        <mesh>
          <sphereGeometry args={[46, 48, 48]} />
          <meshStandardMaterial color="#1b2028" roughness={1} metalness={0} />
        </mesh>
        <mesh scale={1.04}>
          <sphereGeometry args={[46, 24, 24]} />
          <meshBasicMaterial color="#2b4a66" transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      {/* a carrier hull adrift in the far dark */}
      <group position={[60, 16, -90]} rotation={[0, 0.7, 0.05]}>
        <mesh scale={[7, 5, 62]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#20242b" metalness={0.8} roughness={0.5} />
        </mesh>
        <mesh position={[0, 4, 4]} scale={[3, 4, 12]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#2b313a" metalness={0.7} roughness={0.55} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 3.6, 0, 0]} scale={[0.2, 1.2, 40]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#d8a24a" toneMapped={false} transparent opacity={0.4} />
          </mesh>
        ))}
      </group>
      <DriftingPhantom />
    </>
  );
}

/* ---------------- MAIN MENU ---------------- */
export function MainMenu({
  save,
  hasProgress,
  onPlay,
  onContinue,
  onMissions,
  onHangar,
  onLeaderboard,
  onAchievements,
  onDaily,
  onSettings,
  onExit,
  username,
}: {
  save: GameSave;
  hasProgress: boolean;
  onPlay: () => void;
  onContinue: () => void;
  onMissions: () => void;
  onHangar: () => void;
  onLeaderboard: () => void;
  onAchievements: () => void;
  onDaily: () => void;
  onSettings: () => void;
  onExit: () => void;
  username: string | null;
}) {
  const lvl = levelFromXp(save.xp);
  const items: { label: string; fn: () => void; primary?: boolean }[] = [
    hasProgress
      ? { label: "Continue", fn: onContinue, primary: true }
      : { label: "Play", fn: onPlay, primary: true },
    { label: "Missions", fn: onMissions },
    { label: "Hangar", fn: onHangar },
    { label: "Upgrades", fn: onHangar },
    { label: "Leaderboard", fn: onLeaderboard },
    { label: "Achievements", fn: onAchievements },
    { label: "Daily Challenge", fn: onDaily },
    { label: "Settings", fn: onSettings },
  ];

  return (
    <ScreenShell>
      <div className="relative z-10 flex h-full flex-col justify-center px-[8vw]">
        <div className="nv-in-left">
          <div className="text-left">
            <h1 className="text-6xl font-bold leading-[0.85] tracking-tight text-white md:text-8xl" style={{ fontFamily: NV_FONT }}>
              NEON<br />
              <span className="text-[#22d3ee]" style={{ textShadow: "0 0 60px rgba(34,211,238,0.6)" }}>VOID</span>
            </h1>
            <p className="mt-2 text-[11px] uppercase tracking-[0.7em] text-white/40">Last Orbit</p>
          </div>

          <div className="mt-10 flex max-w-[260px] flex-col gap-1">
            {items.map((it, i) => (
              <button
                key={it.label}
                onClick={it.fn}
                className={`nv-in-left group flex items-center gap-3 py-2 text-left text-sm uppercase tracking-[0.24em] transition-colors ${
                  it.primary ? "text-[#22d3ee]" : "text-white/55 hover:text-white"
                }`}
                style={{ fontFamily: NV_FONT, animationDelay: `${0.15 + i * 0.05}s` }}
              >
                <span className={`h-px transition-all duration-300 ${it.primary ? "w-8 bg-[#22d3ee]" : "w-3 bg-white/30 group-hover:w-8 group-hover:bg-[#22d3ee]"}`} />
                {it.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="absolute bottom-5 left-[8vw] right-6 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-white/35">
        <span>
          {username ? `Pilot ${username}` : "Guest pilot — sign in to sync progress"} · LVL {lvl.level} ·{" "}
          {save.credits.toLocaleString()}c
        </span>
        <button onClick={onExit} className="hover:text-white/70">← Neon Arcade</button>
      </div>
    </ScreenShell>
  );
}

/* ---------------- MISSION SELECT ---------------- */
export function MissionSelect({
  save,
  onPick,
  onBack,
}: {
  save: GameSave;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  const sectors = [1, 2, 3] as const;
  return (
    <ScreenShell className="overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-14">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Galaxy Map</p>
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: NV_FONT }}>Mission Select</h2>
          </div>
          <NeonButton onClick={onBack}>Back</NeonButton>
        </div>

        <div className="mt-10 space-y-8">
          {sectors.map((sec) => (
            <div key={sec}>
              <p className="mb-3 text-[10px] uppercase tracking-[0.34em] text-[#22d3ee]">
                {MISSIONS.find((m) => m.sector === sec)?.sectorName}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {MISSIONS.filter((m) => m.sector === sec).map((m) => {
                  const unlocked = missionUnlocked(save, m.id);
                  const rec = save.missions[m.id];
                  return (
                    <button
                      key={m.id}
                      disabled={!unlocked}
                      onClick={() => onPick(m.id)}
                      className={`group relative flex flex-col border p-4 text-left transition-all ${
                        unlocked
                          ? "border-white/10 bg-white/[0.03] hover:border-[#22d3ee]/60 hover:bg-[#22d3ee]/[0.05]"
                          : "border-white/5 bg-black/30 opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.24em] text-white/40">
                          {String(m.index).padStart(2, "0")}
                        </span>
                        {!unlocked ? (
                          <Lock size={13} className="text-white/40" />
                        ) : rec?.completed ? (
                          <Check size={14} className="text-[#a3e635]" />
                        ) : null}
                      </div>
                      <span className="mt-1 text-sm font-bold uppercase tracking-wide text-white" style={{ fontFamily: NV_FONT }}>
                        {m.name}
                      </span>
                      <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
                        {m.objective.kind === "boss" ? "Boss fight" : m.objective.label}
                      </span>
                      {rec?.completed && (
                        <span className="mt-2 text-[10px] tabular-nums text-white/45">
                          Best {rec.bestScore.toLocaleString()} · {rec.bestRank}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
