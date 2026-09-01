import { NextRequest } from "next/server";
import { db } from "@/lib/mock/store";
import { json, requireApiSession, tick } from "@/lib/mock/http";
import type { AnalyticsRange, TimeSeriesPoint } from "@/lib/types";

function rangeDays(range: AnalyticsRange): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
}

function series(days: number, base: number, variance: number): TimeSeriesPoint[] {
  const out: TimeSeriesPoint[] = [];
  let acc = base;
  for (let i = days - 1; i >= 0; i--) {
    acc += Math.round((Math.random() - 0.45) * variance);
    if (acc < 0) acc = Math.abs(acc);
    out.push({
      date: new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10),
      value: acc,
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick(300);

  const range = (req.nextUrl.searchParams.get("range") || "30d") as AnalyticsRange;
  const days = rangeDays(range);
  const store = db();

  const scoresByDay = new Map<string, number>();
  for (const s of store.scores) {
    const key = s.createdAt.slice(0, 10);
    scoresByDay.set(key, (scoresByDay.get(key) || 0) + 1);
  }
  const scoresOverTime = Array.from({ length: days }, (_, idx) => {
    const i = days - 1 - idx;
    const date = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    return { date, value: scoresByDay.get(date) || 0 };
  });

  const mostPlayedGames = [...store.games]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 6)
    .map((g) => ({ label: g.title, value: g.plays }));

  const byPlayer = new Map<string, number>();
  for (const s of store.scores)
    byPlayer.set(s.username, (byPlayer.get(s.username) || 0) + s.score);
  const topPlayers = [...byPlayer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return json({
    range,
    usersOverTime: series(days, Math.max(20, store.users.length - days), 3),
    playsOverTime: series(days, 400, 90),
    scoresOverTime,
    newRegistrations: series(days, 4, 4),
    mostPlayedGames,
    topPlayers,
  });
}
