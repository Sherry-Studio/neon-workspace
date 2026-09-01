"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import { ApiRequestError } from "@/lib/api";
import type { AnalyticsRange } from "@/lib/types";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/primitives";
import { ErrorState, Skeleton } from "@/components/ui/states";
import {
  AreaSeriesChart,
  BarSeriesChart,
  ChartCard,
  LineSeriesChart,
} from "@/components/charts/charts";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["analytics", range],
    queryFn: () => analyticsApi.overview(range),
  });

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Platform trends over time, from the backend."
        actions={
          <div className="flex rounded-lg border border-line bg-ink-850 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  range === r.value
                    ? "bg-cyan-glow/15 text-cyan-soft"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {isError ? (
        <Card>
          <ErrorState
            message={error instanceof ApiRequestError ? error.message : "Failed to load analytics."}
            onRetry={() => refetch()}
          />
        </Card>
      ) : isLoading || !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[320px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Users over time" subtitle="Cumulative registered players">
            <AreaSeriesChart data={data.usersOverTime} />
          </ChartCard>
          <ChartCard title="Game plays over time" subtitle="Daily play sessions">
            <LineSeriesChart data={data.playsOverTime} />
          </ChartCard>
          <ChartCard title="Scores over time" subtitle="Scores submitted per day">
            <AreaSeriesChart data={data.scoresOverTime} color="#d946ef" />
          </ChartCard>
          <ChartCard title="New registrations" subtitle="New accounts per day">
            <AreaSeriesChart data={data.newRegistrations} color="#8b5cf6" />
          </ChartCard>
          <ChartCard title="Most played games" subtitle="By total plays">
            <BarSeriesChart data={data.mostPlayedGames} horizontal />
          </ChartCard>
          <ChartCard title="Top players" subtitle="By total score">
            <BarSeriesChart data={data.topPlayers} horizontal />
          </ChartCard>
        </div>
      )}
    </>
  );
}
