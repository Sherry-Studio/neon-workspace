import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession, tick } from "@/lib/mock/http";

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE = [
  "title", "slug", "shortDescription", "fullDescription", "category",
  "thumbnail", "banner", "gameUrl", "version", "instructions", "controls",
  "featured", "status",
] as const;

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();
  const { id } = await params;
  const game = db().games.find((g) => g.id === id);
  if (!game) return errorJson(404, "Game not found.");
  return json(game);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const game = db().games.find((g) => g.id === id);
  if (!game) return errorJson(404, "Game not found.");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (typeof body.slug === "string" && body.slug !== game.slug) {
    if (db().games.some((g) => g.slug === body.slug && g.id !== id))
      return errorJson(409, "Another game already uses that slug.");
  }
  for (const key of EDITABLE) {
    if (key in body) (game as unknown as Record<string, unknown>)[key] = body[key];
  }
  game.updatedAt = new Date().toISOString();
  return json(game);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const store = db();
  const game = store.games.find((g) => g.id === id);
  if (!game) return errorJson(404, "Game not found.");
  // Soft-delete: archive rather than destroy, so scores/stats stay intact.
  game.status = "ARCHIVED";
  game.featured = false;
  game.updatedAt = new Date().toISOString();
  return json({ ok: true, softDeleted: true, game });
}
