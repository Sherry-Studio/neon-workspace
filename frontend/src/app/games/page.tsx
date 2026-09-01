"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GameCoverCard from "@/components/site/GameCoverCard";
import { gamesService } from "@/services";
import { ApiError } from "@/lib/api/client";
import type { Game } from "@/types/api";

const FALLBACK_CATEGORIES = ["ARCADE", "RACING", "SHOOTER", "ACTION", "CASUAL"];

export default function GamesPage() {
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [active, setActive] = useState<string>("All");
  const [games, setGames] = useState<Game[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    gamesService
      .categories()
      .then((c) => c.length && setCategories(c))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");
    gamesService
      .list(
        { limit: 48, ...(active !== "All" ? { category: active } : {}) },
        ctrl.signal,
      )
      .then((page) => {
        setGames(page.items);
        setStatus("ready");
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setErrorMsg(
          err instanceof ApiError ? err.message : "Could not load games right now.",
        );
        setStatus("error");
      });
    return () => ctrl.abort();
  }, [active]);

  const tabs = useMemo(
    () => ["All", ...categories],
    [categories],
  );

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

        <div className="mb-16 flex gap-7 overflow-x-auto pb-2 scrollbar-hide md:gap-9">
          {tabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`relative whitespace-nowrap pb-2 text-[11px] uppercase tracking-[0.24em] transition-colors duration-300 ${
                active === cat ? "text-white" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {cat}
              {active === cat && (
                <motion.span
                  layoutId="activeGameTab"
                  className="absolute inset-x-0 bottom-0 h-px bg-accent-cyan"
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          ))}
        </div>

        {status === "loading" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
            <button
              onClick={() => setActive((a) => a)}
              className="mt-4 border border-border px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-white transition-colors hover:border-accent-cyan/60"
            >
              Retry
            </button>
          </div>
        )}

        {status === "ready" && (
          <motion.div
            layout
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {games.map((game, i) => (
                <motion.div
                  key={game.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.5,
                    delay: Math.min(i * 0.05, 0.3),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <GameCoverCard
                    title={game.title}
                    genre={game.genre || game.category}
                    tagline={game.tagline || game.shortDescription}
                    platform={game.platform || "Browser"}
                    image={game.image || game.thumbnail || "/images/cyber-runner.jpg"}
                    gradient={game.gradient}
                    href={`/games/${game.slug}`}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {status === "ready" && games.length === 0 && (
          <div className="py-24 text-center text-sm uppercase tracking-wide text-text-muted">
            No games in this category yet
          </div>
        )}
      </div>
    </div>
  );
}
