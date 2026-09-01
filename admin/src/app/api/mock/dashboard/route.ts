import { db } from "@/lib/mock/store";
import { json, requireApiSession, tick } from "@/lib/mock/http";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick(300);

  const store = db();
  const totalPlays = store.games.reduce((sum, g) => sum + g.plays, 0);

  const mostPlayedGames = [...store.games]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 5)
    .map((g) => ({ id: g.id, title: g.title, plays: g.plays, category: g.category }));

  const recentUsers = [...store.users]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  const recentScores = [...store.scores]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  const recentBlogPosts = [...store.blog]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  const recentNotifications = [...store.notifications].slice(0, 5);

  return json({
    totalUsers: store.users.length,
    activeUsers: store.users.filter((u) => u.status === "ACTIVE").length,
    totalGames: store.games.length,
    totalPlays,
    totalScores: store.scores.length,
    mostPlayedGames,
    recentUsers,
    recentScores,
    recentBlogPosts,
    recentNotifications,
  });
}
