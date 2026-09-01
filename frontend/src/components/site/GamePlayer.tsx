"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Trophy, AlertCircle, Loader2 } from "lucide-react";
import { gamesService } from "@/services";
import { ApiError } from "@/lib/api/client";
import type { Game } from "@/types/api";

/**
 * Embeds the game (`game.gameUrl`) in a sandboxed iframe and wires the score
 * flow: start a play session on the backend, listen for a score message from
 * the game, then submit it. Games post:
 *   window.parent.postMessage(
 *     { type: "NEON_ARCADE_SCORE", score: <number>, duration: <seconds> }, "*")
 */

type Phase = "idle" | "starting" | "playing" | "submitting" | "done" | "error";

interface ScoreMessage {
  type: "NEON_ARCADE_SCORE";
  score: number;
  duration?: number;
}

function isScoreMessage(d: unknown): d is ScoreMessage {
  return (
    !!d &&
    typeof d === "object" &&
    (d as { type?: string }).type === "NEON_ARCADE_SCORE" &&
    typeof (d as { score?: unknown }).score === "number"
  );
}

export default function GamePlayer({ game }: { game: Game }) {
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ score: number; flagged: boolean } | null>(null);
  const sessionRef = useRef<string | null>(null);
  const startedAt = useRef<number>(0);

  const play = useCallback(async () => {
    setError("");
    setResult(null);
    if (isAuthed) {
      setPhase("starting");
      try {
        const { playSessionId } = await gamesService.startPlay(game.id);
        sessionRef.current = playSessionId;
      } catch (e) {
        // Play tracking failed — still let them play, just without scoring.
        sessionRef.current = null;
        if (e instanceof ApiError && e.status === 401) {
          // session expired mid-navigation; fall through to anonymous play
        }
      }
    }
    startedAt.current = Date.now();
    setPhase("playing");
  }, [game.id, isAuthed]);

  const submit = useCallback(
    async (score: number, duration?: number) => {
      if (!isAuthed) {
        setResult({ score, flagged: false });
        setPhase("done");
        return;
      }
      setPhase("submitting");
      try {
        const res = await gamesService.submitScore({
          gameId: game.id,
          score,
          duration:
            duration ?? Math.round((Date.now() - startedAt.current) / 1000),
          playSessionId: sessionRef.current ?? undefined,
        });
        setResult({ score, flagged: !!res.flagged });
        setPhase("done");
      } catch (e) {
        setError(
          e instanceof ApiError ? e.message : "Could not save your score.",
        );
        setPhase("error");
      }
    },
    [game.id, isAuthed],
  );

  useEffect(() => {
    if (phase !== "playing" && phase !== "submitting") return;
    const onMessage = (ev: MessageEvent) => {
      if (!isScoreMessage(ev.data)) return;
      void submit(Math.floor(ev.data.score), ev.data.duration);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [phase, submit]);

  return (
    <div className="mt-10">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black">
        {phase === "idle" || phase === "starting" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            <div
              className="absolute inset-0 opacity-30"
              style={{ background: game.gradient }}
            />
            <button
              onClick={play}
              disabled={phase === "starting"}
              className="relative z-10 inline-flex items-center gap-3 bg-white px-10 py-4 text-xs font-medium uppercase tracking-[0.2em] text-black transition-colors duration-300 hover:bg-accent-cyan disabled:opacity-60"
            >
              {phase === "starting" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Play size={15} />
              )}
              {phase === "starting" ? "Loading…" : "Play now"}
            </button>
            {!isAuthed && (
              <p className="relative z-10 text-xs tracking-wide text-white/70">
                <Link href="/login" className="underline underline-offset-4">
                  Sign in
                </Link>{" "}
                to save your score to the leaderboard
              </p>
            )}
          </div>
        ) : (
          <iframe
            src={game.gameUrl}
            title={game.title}
            className="absolute inset-0 h-full w-full"
            allow="fullscreen; gamepad; autoplay"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
          />
        )}
      </div>

      <AnimatePresence>
        {phase === "submitting" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 text-sm text-text-secondary"
          >
            <Loader2 size={14} className="animate-spin" /> Saving your score…
          </motion.p>
        )}

        {phase === "done" && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-3 border border-accent-green/30 bg-accent-green/5 px-4 py-3 text-sm text-accent-green"
          >
            <Trophy size={16} />
            <span>
              Score {result.score.toLocaleString()} recorded
              {result.flagged
                ? " — flagged for review, it won't appear on the leaderboard yet."
                : isAuthed
                  ? "."
                  : " locally. Sign in next time to save it."}
            </span>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-3 border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
