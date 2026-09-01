import { NextRequest } from "next/server";
import { db } from "@/lib/mock/store";
import { json, requireApiSession, tick } from "@/lib/mock/http";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick(150);

  const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase().trim();
  if (!q) return json({ users: [], games: [], blog: [], scores: [] });

  const store = db();
  return json({
    users: store.users
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
      .slice(0, 5),
    games: store.games.filter((g) => g.title.toLowerCase().includes(q)).slice(0, 5),
    blog: store.blog.filter((b) => b.title.toLowerCase().includes(q)).slice(0, 5),
    scores: store.scores
      .filter(
        (s) =>
          s.username.toLowerCase().includes(q) ||
          s.gameTitle.toLowerCase().includes(q),
      )
      .slice(0, 5),
  });
}
