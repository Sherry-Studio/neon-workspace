"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { leaderboardService } from "@/services";
import type { LeaderboardEntry } from "@/types/api";

export default function GameLeaderboard({ gameId }: { gameId: string }) {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    leaderboardService
      .byGame(gameId, { limit: 10 })
      .then((page) => {
        if (!alive) return;
        setRows(page.items);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [gameId]);

  if (state === "loading") {
    return (
      <div className="mt-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-11 w-full animate-pulse rounded border border-border bg-surface-elevated/40"
          />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <p className="mt-4 text-sm text-text-muted">Couldn&apos;t load the leaderboard.</p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-text-muted">
        No scores yet — be the first to set a time.
      </p>
    );
  }

  return (
    <ol className="mt-4 divide-y divide-border border-y border-border">
      {rows.map((r) => (
        <li key={r.userId} className="flex items-center justify-between py-3">
          <span className="flex items-center gap-3">
            <span className="w-6 text-xs tabular-nums text-text-muted">
              {r.rank}
            </span>
            <Avatar avatarId={r.avatar} size={24} />
            <span className="text-sm text-white">{r.username}</span>
          </span>
          <span className="font-[family-name:var(--font-heading)] text-sm text-accent-cyan">
            {r.score.toLocaleString()}
          </span>
        </li>
      ))}
    </ol>
  );
}
