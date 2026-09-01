import { NextRequest } from "next/server";
import { db } from "@/lib/mock/store";
import { json, num, paginate, requireApiSession, tick } from "@/lib/mock/http";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();

  const sp = req.nextUrl.searchParams;
  const gameId = sp.get("gameId") || "";
  const userId = sp.get("userId") || "";
  const search = (sp.get("search") || "").toLowerCase().trim();
  const from = sp.get("from");
  const to = sp.get("to");
  const sort = sp.get("sort") || "score:desc";

  let items = [...db().scores];
  if (gameId) items = items.filter((s) => s.gameId === gameId);
  if (userId) items = items.filter((s) => s.userId === userId);
  if (search)
    items = items.filter(
      (s) =>
        s.username.toLowerCase().includes(search) ||
        s.gameTitle.toLowerCase().includes(search),
    );
  if (from) items = items.filter((s) => +new Date(s.createdAt) >= +new Date(from));
  if (to) items = items.filter((s) => +new Date(s.createdAt) <= +new Date(to));

  const [field, dir] = sort.split(":");
  items.sort((a, b) => {
    const cmp =
      field === "createdAt"
        ? +new Date(a.createdAt) - +new Date(b.createdAt)
        : a.score - b.score;
    return dir === "asc" ? cmp : -cmp;
  });

  return json(paginate(items, num(sp.get("page"), 1), num(sp.get("pageSize"), 15)));
}
