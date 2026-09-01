"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { leaderboardApi, type LeaderboardParams } from "@/lib/api/leaderboard";
import { gamesApi } from "@/lib/api/games";
import { scoresApi } from "@/lib/api/scores";
import { ApiRequestError } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/types";
import { useDebounce } from "@/hooks/useDebounce";
import { useSession } from "@/hooks/useSession";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Toolbar, Badge } from "@/components/ui/misc";
import { Card, CardHeader, Input, Select } from "@/components/ui/primitives";
import { DataTable, Td, Th, Tr } from "@/components/ui/table";
import { BarSeriesChart } from "@/components/charts/charts";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatNumber } from "@/lib/utils";

function LeaderboardInner() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useSession();
  const initialPlayer = useSearchParams().get("player") ?? "";

  const [gameId, setGameId] = useState("");
  const [player, setPlayer] = useState(initialPlayer);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"highest" | "lowest" | "newest">("highest");
  const debouncedPlayer = useDebounce(player);

  const gamesQ = useQuery({
    queryKey: ["games", "all-for-filter"],
    queryFn: () => gamesApi.list({ pageSize: 100 }),
  });

  const params: LeaderboardParams = {
    gameId,
    from: from || undefined,
    to: to || undefined,
    sort,
    limit: 100,
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leaderboard", params],
    queryFn: () => leaderboardApi.get(params),
  });

  const [toDelete, setToDelete] = useState<LeaderboardEntry | null>(null);
  const [toView, setToView] = useState<LeaderboardEntry | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => scoresApi.remove(id),
    onSuccess: () => {
      toast.success("Score deleted successfully.");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  const rows = (data?.entries ?? []).filter((e) =>
    debouncedPlayer
      ? e.username.toLowerCase().includes(debouncedPlayer.toLowerCase())
      : true,
  );

  return (
    <>
      <PageHeader
        title="Leaderboard"
        description="Every score on the platform. Remove suspicious entries to keep rankings clean."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top players" subtitle="By best score in range" />
          <div className="h-64 p-4">
            {data?.topPlayers.length ? (
              <BarSeriesChart data={data.topPlayers} horizontal />
            ) : (
              <EmptyState title="No data" />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Top games" subtitle="By score volume in range" />
          <div className="h-64 p-4">
            {data?.topGames.length ? (
              <BarSeriesChart data={data.topGames} horizontal />
            ) : (
              <EmptyState title="No data" />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <Toolbar>
          <Select value={gameId} onChange={(e) => setGameId(e.target.value)} className="sm:max-w-[12rem]">
            <option value="">All games</option>
            {gamesQ.data?.data.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </Select>
          <Input
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
            placeholder="Filter by player…"
            className="sm:max-w-[12rem]"
          />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:max-w-[10rem]" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:max-w-[10rem]" />
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="sm:max-w-[10rem]">
            <option value="highest">Highest score</option>
            <option value="lowest">Lowest score</option>
            <option value="newest">Newest</option>
          </Select>
        </Toolbar>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState
            message={error instanceof ApiRequestError ? error.message : "Failed to load leaderboard."}
            onRetry={() => refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState title="No scores match these filters" />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Rank</Th>
                <Th>Player</Th>
                <Th>Game</Th>
                <Th>Score</Th>
                <Th>Date</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <Tr key={e.id}>
                  <Td className="tabular-nums text-slate-500">#{e.rank}</Td>
                  <Td className="font-medium text-slate-200">{e.username}</Td>
                  <Td className="text-slate-400">{e.gameTitle}</Td>
                  <Td className="tabular-nums text-cyan-soft">
                    {formatNumber(e.score)}
                    {e.suspicious && (
                      <Badge tone="rose" className="ml-2">
                        <AlertTriangle className="h-3 w-3" /> flagged
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-slate-400">{formatDateTime(e.createdAt)}</Td>
                  <Td>
                    <span className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setToView(e)}
                        className="rounded-md border border-line px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
                      >
                        View
                      </button>
                      {can(PERMISSIONS.SCORES_DELETE) && (
                        <button
                          onClick={() => setToDelete(e)}
                          className="rounded-md border border-line p-1.5 text-rose-400 hover:border-rose-500/40"
                          title="Delete score"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete.id)}
        loading={deleteMut.isPending}
        confirmLabel="Delete score"
        title="Delete this score?"
        description={
          toDelete
            ? `${toDelete.username}'s score of ${formatNumber(toDelete.score)} on ${toDelete.gameTitle} will be permanently removed and rankings recalculated.`
            : ""
        }
      />

      {toView && (
        <ConfirmDialog
          open
          onClose={() => setToView(null)}
          onConfirm={() => setToView(null)}
          tone="primary"
          confirmLabel="Close"
          title={`Score — ${toView.username}`}
          description={`Game: ${toView.gameTitle}\nScore: ${formatNumber(toView.score)}\nRank: #${toView.rank}\nRecorded: ${formatDateTime(toView.createdAt)}${toView.suspicious ? "\n\n⚠ This score was automatically flagged as suspicious." : ""}`}
        />
      )}
    </>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={null}>
      <LeaderboardInner />
    </Suspense>
  );
}
