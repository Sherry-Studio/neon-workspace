import { NextRequest } from "next/server";
import { db } from "@/lib/mock/store";
import { json, requireApiSession, tick } from "@/lib/mock/http";
import type { LeaderboardEntry } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();

  const sp = req.nextUrl.searchParams;
  const gameId = sp.get("gameId") || "";
  const userId = sp.get("userId") || "";
  const from = sp.get("from");
  const to = sp.get("to");
  const sort = (sp.get("sort") || "highest") as "highest" | "lowest" | "newest";
  const limit = Math.min(Number(sp.get("limit")) || 100, 250);

  let rows = [...db().scores];
  if (gameId) rows = rows.filter((s) => s.gameId === gameId);
  if (userId) rows = rows.filter((s) => s.userId === userId);
  if (from) rows = rows.filter((s) => +new Date(s.createdAt) >= +new Date(from));
  if (to) rows = rows.filter((s) => +new Date(s.createdAt) <= +new Date(to));

  rows.sort((a, b) => {
    if (sort === "newest") return +new Date(b.createdAt) - +new Date(a.createdAt);
    if (sort === "lowest") return a.score - b.score;
    return b.score - a.score;
  });

  const entries: LeaderboardEntry[] = rows
    .slice(0, limit)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  const byPlayer = new Map<string, number>();
  const byGame = new Map<string, number>();
  for (const s of rows) {
    byPlayer.set(s.username, Math.max(byPlayer.get(s.username) || 0, s.score));
    byGame.set(s.gameTitle, (byGame.get(s.gameTitle) || 0) + 1);
  }
  const topPlayers = [...byPlayer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
  const topGames = [...byGame.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return json({ entries, topPlayers, topGames });
}
