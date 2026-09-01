"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Gamepad2,
  Trophy,
  Users as UsersIcon,
  Zap,
} from "lucide-react";
import { analyticsApi, ApiRequestError } from "@/lib/api";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/primitives";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { formatNumber, formatDate, relativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: analyticsApi.dashboard,
  });

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card>
          <ErrorState
            message={
              error instanceof ApiRequestError ? error.message : "Failed to load dashboard."
            }
            onRetry={() => refetch()}
          />
        </Card>
      </>
    );
  }

  const stats = [
    { label: "Total Users", value: data?.totalUsers, icon: UsersIcon },
    { label: "Active Users", value: data?.activeUsers, icon: Activity },
    { label: "Total Games", value: data?.totalGames, icon: Gamepad2 },
    { label: "Total Plays", value: data?.totalPlays, icon: Zap },
    { label: "Total Scores", value: data?.totalScores, icon: Trophy },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live platform overview, straight from the backend."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s, i) =>
          isLoading || s.value == null ? (
            <Skeleton key={s.label} className="h-[104px]" />
          ) : (
            <StatCard
              key={s.label}
              index={i}
              label={s.label}
              value={formatNumber(s.value)}
              icon={s.icon}
            />
          ),
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Most Played Games" />
          {isLoading ? (
            <ListSkeleton />
          ) : data && data.mostPlayedGames.length ? (
            <ul className="divide-y divide-line/60">
              {data.mostPlayedGames.map((g, i) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-4 text-xs text-slate-600">{i + 1}</span>
                    <Link
                      href={`/games/${g.id}/edit`}
                      className="text-slate-200 hover:text-cyan-soft"
                    >
                      {g.title}
                    </Link>
                    <span className="text-xs text-slate-600">{g.category}</span>
                  </span>
                  <span className="tabular-nums text-slate-400">
                    {formatNumber(g.plays)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No games yet" />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent Users"
            action={
              <Link href="/users" className="text-xs text-cyan-soft hover:underline">
                View all
              </Link>
            }
          />
          {isLoading ? (
            <ListSkeleton />
          ) : data && data.recentUsers.length ? (
            <ul className="divide-y divide-line/60">
              {data.recentUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <Link
                    href={`/users/${u.id}`}
                    className="text-slate-200 hover:text-cyan-soft"
                  >
                    {u.username}
                  </Link>
                  <span className="text-xs text-slate-600">
                    {formatDate(u.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No users yet" />
          )}
        </Card>

        <Card>
          <CardHeader title="Recent Scores" />
          {isLoading ? (
            <ListSkeleton />
          ) : data && data.recentScores.length ? (
            <ul className="divide-y divide-line/60">
              {data.recentScores.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="text-slate-300">
                    <span className="text-slate-200">{s.username}</span>{" "}
                    <span className="text-xs text-slate-600">· {s.gameTitle}</span>
                  </span>
                  <span className="tabular-nums text-cyan-soft">
                    {formatNumber(s.score)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No scores yet" />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent Blog Posts"
            action={
              <Link href="/blog" className="text-xs text-cyan-soft hover:underline">
                The Vault
              </Link>
            }
          />
          {isLoading ? (
            <ListSkeleton />
          ) : data && data.recentBlogPosts.length ? (
            <ul className="divide-y divide-line/60">
              {data.recentBlogPosts.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <Link
                    href={`/blog/${b.id}/edit`}
                    className="truncate text-slate-200 hover:text-cyan-soft"
                  >
                    {b.title}
                  </Link>
                  <span className="ml-3 shrink-0 text-xs text-slate-600">
                    {b.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No posts yet" />
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent Notifications" />
          {isLoading ? (
            <ListSkeleton />
          ) : data && data.recentNotifications.length ? (
            <ul className="divide-y divide-line/60">
              {data.recentNotifications.map((n) => (
                <li key={n.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200">{n.title}</span>
                    <span className="text-xs text-slate-600">
                      {relativeTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {n.recipientLabel} · {n.type}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No notifications yet" />
          )}
        </Card>
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8" />
      ))}
    </div>
  );
}
