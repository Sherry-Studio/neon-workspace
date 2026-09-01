import { NextRequest } from "next/server";
import { db, newId } from "@/lib/mock/store";
import { errorJson, json, num, paginate, requireApiSession, tick } from "@/lib/mock/http";
import type { Game } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();

  const sp = req.nextUrl.searchParams;
  const search = (sp.get("search") || "").toLowerCase().trim();
  const status = sp.get("status") || "";
  const category = sp.get("category") || "";
  const featured = sp.get("featured");
  const sort = sp.get("sort") || "createdAt:desc";

  let items = [...db().games];
  if (search) items = items.filter((g) => g.title.toLowerCase().includes(search));
  if (status) items = items.filter((g) => g.status === status);
  if (category) items = items.filter((g) => g.category === category);
  if (featured === "true") items = items.filter((g) => g.featured);

  const [field, dir] = sort.split(":") as [keyof Game, "asc" | "desc"];
  items.sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });

  return json(paginate(items, num(sp.get("page"), 1), num(sp.get("pageSize"), 10)));
}

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || "").trim();
  const slug = String(body.slug || "").trim();
  const gameUrl = String(body.gameUrl || "").trim();
  if (!title || !slug || !gameUrl)
    return errorJson(400, "Title, slug and game URL are required.");
  if (db().games.some((g) => g.slug === slug))
    return errorJson(409, "A game with that slug already exists.");

  const now = new Date().toISOString();
  const game: Game = {
    id: newId("game"),
    title,
    slug,
    shortDescription: String(body.shortDescription || ""),
    fullDescription: String(body.fullDescription || ""),
    category: String(body.category || "Arcade"),
    thumbnail: (body.thumbnail as string) || null,
    banner: (body.banner as string) || null,
    gameUrl,
    version: String(body.version || "1.0.0"),
    instructions: String(body.instructions || ""),
    controls: String(body.controls || ""),
    featured: !!body.featured,
    status:
      body.status === "PUBLISHED" || body.status === "ARCHIVED"
        ? body.status
        : "DRAFT",
    plays: 0,
    createdAt: now,
    updatedAt: now,
  };
  db().games.unshift(game);
  return json(game, 201);
}
