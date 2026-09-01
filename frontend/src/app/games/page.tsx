"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GameCoverCard from "@/components/site/GameCoverCard";

const categories = [
  { label: "ALL", key: "All" },
  { label: "ACTION", key: "Action" },
  { label: "RACING", key: "Racing" },
  { label: "PUZZLE", key: "Puzzle" },
  { label: "STRATEGY", key: "Strategy" },
] as const;

const allGames = [
  { title: "Cyber Runner", genre: "Action", tagline: "Dash through neon-lit cityscapes.", category: "Action", platform: "Browser", image: "/images/cyber-runner.jpg", gradient: "linear-gradient(135deg,#0f1027,#16213e 55%,#0f3460)" },
  { title: "Neon Drift", genre: "Racing", tagline: "Master the art of the drift.", category: "Racing", platform: "Browser", image: "/images/neon-drift.jpg", gradient: "linear-gradient(135deg,#241435,#1a0a2e 55%,#16213e)" },
  { title: "Pixel Blaster", genre: "Action", tagline: "Retro-inspired shoot-'em-up.", category: "Action", platform: "Browser", image: "/images/pixel-blaster.jpg", gradient: "linear-gradient(135deg,#221a0f,#2a1c10 55%,#170f0a)" },
  { title: "Grid Wars", genre: "Puzzle", tagline: "Strategic grid-based combat.", category: "Puzzle", platform: "Browser", image: "/images/grid-wars.jpg", gradient: "linear-gradient(135deg,#0b1b18,#10241f 55%,#0a1a16)" },
  { title: "Shadow Protocol", genre: "Stealth", tagline: "Stealth missions in the dark.", category: "Action", platform: "Browser", image: "/images/shadow-protocol.jpg", gradient: "linear-gradient(135deg,#10182e,#141428 55%,#0a0a14)" },
  { title: "Quantum Break", genre: "Puzzle", tagline: "Bend time, solve the impossible.", category: "Puzzle", platform: "Browser", image: "/images/quantum-break.jpg", gradient: "linear-gradient(135deg,#141a2e,#1a1030 55%,#0a0e1a)" },
  { title: "Velocity X", genre: "Racing", tagline: "Pure speed, zero limits.", category: "Racing", platform: "Browser", image: "/images/velocity-x.jpg", gradient: "linear-gradient(135deg,#0a1628,#1a2332 55%,#0d1b2a)" },
  { title: "Neural Link", genre: "Strategy", tagline: "Connect minds, conquer worlds.", category: "Strategy", platform: "Browser", image: "/images/neural-link.jpg", gradient: "linear-gradient(135deg,#0b1b18,#12241f 55%,#0a1a16)" },
];

export default function GamesPage() {
  const [active, setActive] = useState<string>("All");
  const games = active === "All" ? allGames : allGames.filter((g) => g.category === active);

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
            {games.length} TITLE{games.length !== 1 ? "S" : ""} · BROWSER-NATIVE
          </p>
        </motion.div>

        <div className="mb-16 flex gap-7 overflow-x-auto pb-2 scrollbar-hide md:gap-9">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActive(cat.key)}
              className={`relative whitespace-nowrap pb-2 text-[11px] uppercase tracking-[0.24em] transition-colors duration-300 ${
                active === cat.key ? "text-white" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {cat.label}
              {active === cat.key && (
                <motion.span
                  layoutId="activeGameTab"
                  className="absolute inset-x-0 bottom-0 h-px bg-accent-cyan"
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          ))}
        </div>

        <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {games.map((game, i) => (
              <motion.div
                key={game.title}
                layout
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
              >
                <GameCoverCard
                  title={game.title}
                  genre={game.genre}
                  tagline={game.tagline}
                  platform={game.platform}
                  image={game.image}
                  gradient={game.gradient}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {games.length === 0 && (
          <div className="py-24 text-center text-sm uppercase tracking-wide text-text-muted">
            No games in this category
          </div>
        )}
      </div>
    </div>
  );
}
