"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type {
  GameSave,
  MissionDef,
  MissionResult,
  Screen,
  Settings,
  UpgradeKey,
} from "./game/types";
import { GameEngine, type EngineEvent } from "./game/engine";
import { AudioEngine } from "./game/audio";
import { ENVIRONMENTS } from "./data/environments";
import { MISSIONS, missionById, nextMission } from "./data/missions";
import { UPGRADES, resolveStats } from "./data/upgrades";
import { ACHIEVEMENTS } from "./data/achievements";
import { dailyChallengeFor } from "./data/dailyChallenge";

const ACHIEVEMENTS_UNLOCKED = (s: GameSave) =>
  ACHIEVEMENTS.filter((a) => (s.achievements[a.id] ?? 0) >= a.target).length;

const MENU_BACKDROP_SCREENS = new Set<string>([
  "menu",
  "mission-select",
  "hangar",
  "settings",
  "achievements",
  "leaderboard",
  "daily",
]);
import {
  loadLocal,
  persistLocal,
  mergeSaves,
  applyResult,
  missionUnlocked,
} from "./game/save";
import {
  beginPlaySession,
  submitScore,
  loadCloudSave,
  saveCloud,
  track,
  type PlaySession,
} from "./game/service";

import GameCanvas from "./scene/GameCanvas";
import Hud from "./ui/Hud";
import { MainMenu, MissionSelect } from "./ui/Menus";
import {
  Cinematic,
  Loading,
  Briefing,
  PauseMenu,
  Results,
  VictoryCinematic,
  BlockingMessage,
  FirstTimeTips,
} from "./ui/Screens";
import {
  Hangar,
  SettingsPanel,
  AchievementsPanel,
  LeaderboardPanel,
  DailyChallengePanel,
} from "./ui/Meta";

function webglOk() {
  if (typeof window === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type Modifiers = NonNullable<ConstructorParameters<typeof GameEngine>[0]["modifiers"]>;

export default function NeonVoid() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const username = authSession?.user?.name ?? null;

  const [ready, setReady] = useState(false);
  const [support, setSupport] = useState<"ok" | "webgl" | "mobile">("ok");
  const [save, setSave] = useState<GameSave>(() => (typeof window === "undefined" ? loadLocal() : loadLocal()));
  const [screen, setScreen] = useState<Screen>("cinematic");
  const [returnScreen, setReturnScreen] = useState<Screen>("menu");
  const [activeMission, setActiveMission] = useState<MissionDef | null>(null);
  const [modifiers, setModifiers] = useState<Modifiers>({});
  const [result, setResult] = useState<MissionResult | null>(null);
  const [submitState, setSubmitState] = useState<
    "idle" | "sending" | "ok" | "flagged" | "signin" | "offline"
  >("idle");
  const [showTips, setShowTips] = useState(false);
  const [fs, setFs] = useState(false);
  const [debug, setDebug] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const audioRef = useRef<AudioEngine | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const runningRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const playSession = useRef<PlaySession>({ playSessionId: null });
  const sessionId = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `nv-${Date.now()}`,
  );

  const settings = save.settings;

  /* -------------------------------------------------- boot */
  useEffect(() => {
    if (!webglOk()) {
      setSupport("webgl");
      setReady(true);
      return;
    }
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const small = window.innerWidth < 900;
    if (coarse && small) setSupport("mobile");

    audioRef.current = new AudioEngine(save.settings);

    // cloud save merge (best effort)
    loadCloudSave().then((cloud) => {
      if (cloud) {
        const merged = mergeSaves(loadLocal(), cloud);
        setSave(merged);
        persistLocal(merged);
      }
    });

    const anyProgress = MISSIONS.some((m) => loadLocal().missions[m.id]?.completed);
    setScreen(anyProgress || loadLocal().seenTutorial ? "menu" : "cinematic");
    setReady(true);

    track({ event: "game_started", props: { session: sessionId.current } });
    return () => {
      audioRef.current?.dispose();
      engineRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------- persist save (debounced) */
  const commitSave = useCallback((next: GameSave) => {
    setSave(next);
    persistLocal(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (authSession?.user) saveCloud(next);
    }, 1200);
  }, [authSession]);

  const updateSettings = useCallback((s: Settings) => {
    const next = { ...save, settings: s };
    commitSave(next);
    if (audioRef.current) {
      audioRef.current.settings = s;
      audioRef.current.applyVolumes();
    }
  }, [save, commitSave]);

  /* -------------------------------------------------- audio unlock on first gesture */
  useEffect(() => {
    const unlock = () => audioRef.current?.resume();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /* -------------------------------------------------- music per screen */
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (screen === "playing") {
      const boss = activeMission?.objective.kind === "boss";
      a.setMusic(boss ? "boss" : "combat");
    } else if (screen === "menu" || screen === "mission-select" || screen === "hangar") {
      a.setMusic("menu");
    } else if (screen === "cinematic" || screen === "victory") {
      a.setMusic("none");
    } else {
      a.setMusic("menu");
    }
  }, [screen, activeMission]);

  /* -------------------------------------------------- engine event handler */
  const handleEvent = useCallback(
    (e: EngineEvent) => {
      const eng = engineRef.current;
      const a = audioRef.current;
      switch (e.type) {
        case "sfx":
          a?.play(e.name);
          break;
        case "toast":
          eng?.pushToast(e.toast);
          break;
        case "kill":
          if (e.kind === "guardian") track({ event: "elite_destroyed" });
          break;
        case "boss-start":
          track({ event: "boss_started", props: { name: e.name } });
          break;
        case "boss-phase":
          break;
        case "flash":
          if (settings.screenFlash) flash(e.colour);
          break;
        case "hull-critical":
          eng?.pushToast({ text: "CRITICAL DAMAGE", kind: "warn" });
          break;
        case "objective-complete":
          track({ event: "objective_completed" });
          break;
        case "mission-complete":
        case "mission-failed":
          finishMission(e.result);
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.screenFlash],
  );

  const flashRef = useRef<HTMLDivElement>(null);
  const flash = (colour: string) => {
    const el = flashRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.background = colour;
    el.style.opacity = "0.28";
    requestAnimationFrame(() => {
      el.style.transition = "opacity 260ms ease";
      el.style.opacity = "0";
    });
  };

  /* -------------------------------------------------- mission lifecycle */
  const startMission = useCallback(
    async (mission: MissionDef, mods: Modifiers = {}) => {
      engineRef.current?.dispose();
      const effectiveSave = mods.noUpgrades
        ? { ...save, upgrades: UPGRADES.reduce((acc, u) => ({ ...acc, [u.key]: 0 }), {} as GameSave["upgrades"]) }
        : save;
      const stats = resolveStats(effectiveSave);

      setActiveMission(mission);
      setModifiers(mods);
      setResult(null);
      setSubmitState("idle");
      setScreen("loading");
      runningRef.current = false;

      playSession.current = await beginPlaySession();
      track({ event: "mission_started", props: { mission: mission.id, mods } });

      const engine = new GameEngine({
        mission,
        stats,
        settings,
        audio: audioRef.current!,
        modifiers: mods,
        onEvent: handleEvent,
      });
      engineRef.current = engine;

      // small delay so the loading screen shows + assets warm
      window.setTimeout(() => {
        setScreen("playing");
        runningRef.current = true;
        if (!save.seenTutorial && mission.tutorial) setShowTips(true);
      }, 900);
    },
    [save, settings, handleEvent],
  );

  const finishMission = (r: MissionResult) => {
    runningRef.current = false;
    const { save: nextSave, leveledUp, unlocked } = applyResult(save, r);
    commitSave(nextSave);
    if (leveledUp) audioRef.current?.play("levelUp");
    setResult(r);

    if (r.success && activeMission?.index === 9) {
      track({ event: "game_completed" });
      window.setTimeout(() => setScreen("victory"), 2600);
    } else {
      window.setTimeout(() => setScreen(r.success ? "mission-complete" : "game-over"), 1400);
    }
    track({
      event: r.success ? "mission_completed" : "mission_failed",
      props: { mission: r.missionId, score: r.score, rank: r.rank },
    });
    void unlocked;

    // leaderboard submission
    if (r.score > 0) {
      setSubmitState("sending");
      submitScore(r, playSession.current).then((out) => {
        if (out.submitted) setSubmitState(out.flagged ? "flagged" : "ok");
        else if (out.reason === "sign-in") setSubmitState("signin");
        else setSubmitState("offline");
      });
    } else {
      setSubmitState("idle");
    }
  };

  /* -------------------------------------------------- input */
  useEffect(() => {
    const eng = () => engineRef.current;

    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") {
        if (screen === "playing") pause();
        else if (screen === "paused") resume();
        return;
      }
      if (screen !== "playing") return;
      if (["w", "a", "s", "d", "q", "e", "r", "x", "shift", " "].includes(k)) {
        e.preventDefault();
        const en = eng();
        if (!en) return;
        en.keys.add(k);
        if (k === "r") { en.missileHeld = true; en.requestMissile(); }
      }
      if (k === "f2") setDebug((v) => !v);
    };
    const ku = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      eng()?.keys.delete(k);
      if (k === "r") { const en = eng(); if (en) en.missileHeld = false; }
    };
    const mm = (e: MouseEvent) => {
      if (screen !== "playing" || !rootRef.current) return;
      const r = rootRef.current.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      const en = eng();
      if (en) {
        en.mouse.x = Math.max(-1, Math.min(1, x));
        en.mouse.y = Math.max(-1, Math.min(1, y));
      }
    };
    const md = (e: MouseEvent) => {
      if (screen !== "playing") return;
      const en = eng();
      if (!en) return;
      if (e.button === 0) en.firing = true;
      if (e.button === 2) { en.missileHeld = true; en.requestMissile(); }
    };
    const mu = (e: MouseEvent) => {
      const en = eng();
      if (!en) return;
      if (e.button === 0) en.firing = false;
      if (e.button === 2) en.missileHeld = false;
    };
    const ctx = (e: Event) => {
      if (screen === "playing") e.preventDefault();
    };
    const blur = () => {
      const en = eng();
      if (en) {
        en.keys.clear();
        en.firing = false;
        en.missileHeld = false;
      }
    };
    const vis = () => {
      if (document.hidden && screen === "playing") pause();
    };

    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mousedown", md);
    window.addEventListener("mouseup", mu);
    window.addEventListener("contextmenu", ctx);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mousedown", md);
      window.removeEventListener("mouseup", mu);
      window.removeEventListener("contextmenu", ctx);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  /* -------------------------------------------------- fullscreen */
  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };

  /* -------------------------------------------------- nav helpers */
  const pause = () => {
    if (screen !== "playing") return;
    runningRef.current = false;
    setScreen("paused");
    audioRef.current?.suspend();
    const en = engineRef.current;
    if (en) { en.keys.clear(); en.firing = false; en.missileHeld = false; }
  };
  const resume = () => {
    setScreen("playing");
    audioRef.current?.resume();
    runningRef.current = true;
  };
  const quitToMenu = () => {
    engineRef.current?.dispose();
    engineRef.current = null;
    runningRef.current = false;
    setActiveMission(null);
    setScreen("menu");
  };

  const openMeta = (s: Screen) => {
    setReturnScreen(screen === "playing" || screen === "paused" ? "paused" : screen);
    setScreen(s);
  };

  const buyUpgrade = (key: UpgradeKey) => {
    const u = UPGRADES.find((x) => x.key === key)!;
    const level = save.upgrades[key] ?? 0;
    if (level >= u.max) return;
    const cost = u.cost(level + 1);
    if (save.credits < cost) return;
    commitSave({
      ...save,
      credits: save.credits - cost,
      upgrades: { ...save.upgrades, [key]: level + 1 },
    });
    audioRef.current?.play("ui");
    engineRef.current?.pushToast({ text: "UPGRADE PURCHASED", kind: "reward" });
    track({ event: "upgrade_purchased", props: { key, level: level + 1 } });
  };

  const firstUnfinished = useMemo(() => {
    const done = MISSIONS.filter((m) => save.missions[m.id]?.completed);
    if (done.length === 0) return MISSIONS[0];
    const last = done[done.length - 1];
    return nextMission(last.id) ?? last;
  }, [save.missions]);

  const hasProgress = MISSIONS.some((m) => save.missions[m.id]?.completed);

  /* -------------------------------------------------- render */
  if (!ready) {
    return (
      <div className="relative h-full w-full bg-black">
        <Loading label="INITIALISING PHANTOM" />
      </div>
    );
  }

  if (support === "webgl") {
    return (
      <div className="relative h-full w-full bg-black">
        <BlockingMessage
          title="Graphics not supported"
          body="Your browser or device does not support the WebGL graphics NEON VOID needs. Try Chrome, Edge or Firefox on a desktop."
          action={{ label: "Back to Neon Arcade", onClick: () => router.push("/games") }}
        />
      </div>
    );
  }

  const env = activeMission ? activeMission.environment : "outer-orbit";
  const canvasMode: "menu" | "game" =
    (screen === "playing" || screen === "paused") && engineRef.current ? "game" : "menu";
  const showMenuBackdrop =
    MENU_BACKDROP_SCREENS.has(screen) && !(screen === "settings" && returnScreen === "paused");

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-black select-none"
      style={{ cursor: screen === "playing" ? "none" : "default" }}
    >
      {/* ONE persistent 3D canvas — contents switch, the canvas never remounts */}
      <div
        className="absolute inset-0 z-[5]"
        style={{
          opacity: canvasMode === "game" || showMenuBackdrop ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      >
        <GameCanvas
          mode={canvasMode}
          engine={engineRef.current}
          settings={settings}
          env={env}
          running={() => runningRef.current}
          onContextLost={() => {
            runningRef.current = false;
            setContextLost(true);
          }}
        />
      </div>
      {canvasMode === "menu" && showMenuBackdrop && (
        <div
          className="pointer-events-none absolute inset-0 z-[6]"
          style={{ background: "linear-gradient(90deg, rgba(4,3,10,0.9) 0%, rgba(4,3,10,0.2) 45%, transparent 70%)" }}
        />
      )}

      {screen === "playing" && engineRef.current && (
        <Hud engine={engineRef.current} debug={debug} />
      )}

      {/* screen-flash layer */}
      <div ref={flashRef} className="pointer-events-none absolute inset-0 z-30 opacity-0" />

      {/* fullscreen toggle */}
      {(screen === "playing" || screen === "menu" || screen === "mission-select") && (
        <button
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 z-40 border border-white/15 bg-black/40 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-white/50 hover:text-white"
        >
          {fs ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      )}

      {screen !== "playing" && (
      <div className="absolute inset-0 z-20">
        {screen === "cinematic" && (
          <Cinematic
            key="cin"
            onStart={() => startMission(MISSIONS[0])}
            onSkip={() => {
              commitSave({ ...save, seenTutorial: true });
              setScreen("menu");
            }}
          />
        )}

        {screen === "menu" && (
          <MainMenu
            key="menu"
            save={save}
            hasProgress={hasProgress}
            username={username}
            onPlay={() => startMission(MISSIONS[0])}
            onContinue={() => {
              setReturnScreen("menu");
              setActiveMission(firstUnfinished);
              setScreen("briefing");
            }}
            onMissions={() => setScreen("mission-select")}
            onHangar={() => { setReturnScreen("menu"); setScreen("hangar"); }}
            onLeaderboard={() => { setReturnScreen("menu"); setScreen("leaderboard"); }}
            onAchievements={() => { setReturnScreen("menu"); setScreen("achievements"); }}
            onDaily={() => { setReturnScreen("menu"); setScreen("daily"); }}
            onSettings={() => { setReturnScreen("menu"); setScreen("settings"); }}
            onExit={() => router.push("/games")}
          />
        )}

        {screen === "mission-select" && (
          <MissionSelect
            key="ms"
            save={save}
            onBack={() => setScreen(returnScreen === "paused" ? "menu" : "menu")}
            onPick={(id) => {
              const m = missionById(id);
              if (m && missionUnlocked(save, id)) {
                setReturnScreen("mission-select");
                setActiveMission(m);
                setScreen("briefing");
              }
            }}
          />
        )}

        {screen === "briefing" && activeMission && (
          <Briefing
            key="brief"
            mission={activeMission}
            onBack={() => setScreen(returnScreen)}
            onStart={() => startMission(activeMission, modifiers)}
          />
        )}

        {screen === "loading" && <Loading key="load" label={`ENTERING ${ENVIRONMENTS[env].key.replace("-", " ").toUpperCase()}`} />}

        {screen === "paused" && (
          <PauseMenu
            key="pause"
            onResume={resume}
            onRestart={() => activeMission && startMission(activeMission, modifiers)}
            onSettings={() => openMeta("settings")}
            onQuit={quitToMenu}
          />
        )}

        {screen === "mission-complete" && result && activeMission && (
          <Results
            key="mc"
            result={result}
            mission={activeMission}
            submitState={submitState}
            onNext={() => {
              const n = nextMission(activeMission.id);
              if (n) startMission(n);
            }}
            onReplay={() => startMission(activeMission, modifiers)}
            onHangar={() => { setReturnScreen("mission-complete"); setScreen("hangar"); }}
            onSelect={() => setScreen("mission-select")}
            onMenu={() => setScreen("menu")}
          />
        )}

        {screen === "game-over" && result && activeMission && (
          <Results
            key="go"
            result={result}
            mission={activeMission}
            submitState={submitState}
            onNext={() => {}}
            onReplay={() => startMission(activeMission, modifiers)}
            onHangar={() => { setReturnScreen("game-over"); setScreen("hangar"); }}
            onSelect={() => setScreen("mission-select")}
            onMenu={() => setScreen("menu")}
          />
        )}

        {screen === "victory" && (
          <VictoryCinematic
            key="vic"
            totals={{
              missions: save.totals.missionsCompleted,
              score: MISSIONS.reduce((s, m) => s + (save.missions[m.id]?.bestScore ?? 0), 0),
              credits: save.credits,
              xp: save.xp,
              achievements: ACHIEVEMENTS_UNLOCKED(save),
            }}
            onDone={() => setScreen("menu")}
          />
        )}

        {screen === "hangar" && (
          <Hangar key="hangar" save={save} onBuy={buyUpgrade} onBack={() => setScreen(returnScreen)} />
        )}

        {screen === "settings" && (
          <SettingsPanel
            key="set"
            settings={settings}
            onChange={updateSettings}
            inGame={returnScreen === "paused"}
            onClose={() => setScreen(returnScreen)}
          />
        )}

        {screen === "achievements" && (
          <AchievementsPanel key="ach" save={save} onBack={() => setScreen(returnScreen)} />
        )}

        {screen === "leaderboard" && (
          <LeaderboardPanel key="lb" onBack={() => setScreen(returnScreen)} />
        )}

        {screen === "daily" && (
          <DailyChallengePanel
            key="daily"
            onBack={() => setScreen(returnScreen)}
            onPlay={() => {
              const dc = dailyChallengeFor();
              const m = missionById(dc.missionId);
              if (!m) return;
              const mods: Modifiers = {};
              if (dc.rule.kind === "noUpgrades") mods.noUpgrades = true;
              if (dc.rule.kind === "doubleSpawn") mods.doubleSpawn = true;
              if (dc.rule.kind === "glassCannon") mods.glassCannon = true;
              if (dc.rule.kind === "timeAttack") mods.fastSpawn = true;
              track({ event: "daily_challenge_started", props: { id: dc.id } });
              startMission(m, mods);
            }}
          />
        )}
      </div>
      )}

      {showTips && (
        <FirstTimeTips
          key="tips"
          onDone={() => {
            setShowTips(false);
            commitSave({ ...save, seenTutorial: true });
          }}
        />
      )}

      {contextLost && (
        <BlockingMessage
          title="Graphics context lost"
          body="The browser dropped the WebGL context (this can happen after the GPU is under load for a long time). Your progress is saved — reload to keep flying."
          action={{ label: "Reload", onClick: () => window.location.reload() }}
        />
      )}
    </div>
  );
}
