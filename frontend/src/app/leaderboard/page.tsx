"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Avatar from "@/components/ui/Avatar";
import { leaderboardService } from "@/services";
import { ApiError } from "@/lib/api/client";
import type { LeaderboardEntry } from "@/types/api";

const RANGES = [
  { key: "all", label: "ALL TIME" },
  { key: "month", label: "THIS MONTH" },
  { key: "week", label: "THIS WEEK" },
  { key: "day", label: "TODAY" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

export default function LeaderboardPage() {
  const [range, setRange] = useState<RangeKey>("all");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    setState("loading");
    leaderboardService
      .global({ range, limit: 50 })
      .then((page) => {
        setRows(page.items);
        setState("ready");
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setErrorMsg(e instanceof ApiError ? e.message : "Could not load the leaderboard.");
        setState("error");
      });
    return () => ctrl.abort();
  }, [range]);

  return (
    <div className="relative z-10 bg-surface/[0.95]">
      <div className="mx-auto max-w-4xl px-[var(--gutter)] pb-28 pt-36 md:pt-44">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <span className="eyebrow">Global Rankings</span>
          <h1 className="display mt-4 text-5xl text-white md:text-8xl">LEADERBOARD</h1>
          <p className="mt-4 text-sm tracking-wide text-text-muted">
            Best single run per player, across every game.
          </p>
        </motion.div>

        <div className="mb-10 flex gap-6 overflow-x-auto pb-2 scrollbar-hide">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`relative whitespace-nowrap pb-2 text-[11px] uppercase tracking-[0.24em] transition-colors duration-300 ${
                range === r.key ? "text-white" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {r.label}
              {range === r.key && (
                <motion.span
                  layoutId="activeRangeTab"
                  className="absolute inset-x-0 bottom-0 h-px bg-accent-cyan"
                  transition={{ duration: 0.3 }}
                />
              )}
            </button>
          ))}
        </div>

        {state === "loading" && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-14 w-full animate-pulse rounded border border-border bg-surface-elevated/40"
              />
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="py-20 text-center">
            <p className="text-sm uppercase tracking-wide text-text-muted">{errorMsg}</p>
            <button
              onClick={() => setRange((r) => r)}
              className="mt-4 border border-border px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-white transition-colors hover:border-accent-cyan/60"
            >
              Retry
            </button>
          </div>
        )}

        {state === "ready" && rows.length === 0 && (
          <div className="py-20 text-center text-sm uppercase tracking-wide text-text-muted">
            No scores in this window yet
          </div>
        )}

        {state === "ready" && rows.length > 0 && (
          <ol className="divide-y divide-border border-y border-border">
            {rows.map((r) => (
              <li
                key={r.userId}
                className="flex items-center justify-between py-4"
              >
                <span className="flex items-center gap-4">
                  <span
                    className={`w-8 text-center font-[family-name:var(--font-heading)] text-sm tabular-nums ${
                      r.rank <= 3 ? "text-accent-cyan" : "text-text-muted"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <Avatar avatarId={r.avatar} size={32} />
                  <span className="text-sm font-medium text-white">{r.username}</span>
                </span>
                <span className="flex items-center gap-6">
                  {typeof r.plays === "number" && (
                    <span className="hidden text-xs text-text-muted sm:inline">
                      {r.plays} run{r.plays !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="font-[family-name:var(--font-heading)] text-sm text-accent-cyan">
                    {r.score.toLocaleString()}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
