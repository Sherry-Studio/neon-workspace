"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GameCoverCard from "@/components/site/GameCoverCard";
import { gamesService } from "@/services";
import { ApiError } from "@/lib/api/client";
import type { Game } from "@/types/api";

/** Only games that are actually built into this site (internal routes). */
const isPlayable = (g: Game) => typeof g.gameUrl === "string" && g.gameUrl.startsWith("/games/");

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");
    gamesService
      .list({ limit: 48 }, ctrl.signal)
      .then((page) => {
        setGames(page.items.filter(isPlayable));
        setStatus("ready");
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setErrorMsg(err instanceof ApiError ? err.message : "Could not load games right now.");
        setStatus("error");
      });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="relative z-10 bg-surface/[0.94]">
      <div className="mx-auto max-w-7xl px-[var(--gutter)] pb-28 pt-36 md:pt-44">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14"
        >
          <span className="eyebrow">The Showcase</span>
          <h1 className="display mt-4 text-5xl text-white md:text-8xl">ALL GAMES</h1>
          <p className="mt-4 text-sm tracking-wide text-text-muted">
            {status === "ready"
              ? `${games.length} TITLE${games.length !== 1 ? "S" : ""} · BROWSER-NATIVE`
              : "BROWSER-NATIVE"}
          </p>
        </motion.div>

        {status === "loading" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] w-full animate-pulse rounded-xl border border-border bg-surface-elevated/40"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="py-24 text-center">
            <p className="text-sm uppercase tracking-wide text-text-muted">{errorMsg}</p>
          </div>
        )}

        {status === "ready" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
              >
                <GameCoverCard
                  title={game.title}
                  genre={game.genre || game.category}
                  tagline={game.tagline || game.shortDescription}
                  platform={game.platform || "Browser"}
                  image={game.image || game.thumbnail || "/images/quantum-break.jpg"}
                  gradient={game.gradient}
                  href={`/games/${game.slug}`}
                />
              </motion.div>
            ))}
          </div>
        )}

        {status === "ready" && games.length === 0 && (
          <div className="py-24 text-center text-sm uppercase tracking-wide text-text-muted">
            Nothing to show yet
          </div>
        )}
      </div>
    </div>
  );
}
