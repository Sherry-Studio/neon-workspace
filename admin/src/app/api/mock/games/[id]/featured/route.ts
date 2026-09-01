import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const game = db().games.find((g) => g.id === id);
  if (!game) return errorJson(404, "Game not found.");
  const { featured } = (await req.json().catch(() => ({}))) as { featured?: boolean };
  if (typeof featured !== "boolean") return errorJson(400, "`featured` must be boolean.");
  if (featured && game.status !== "PUBLISHED")
    return errorJson(409, "Only published games can be featured.");
  game.featured = featured;
  game.updatedAt = new Date().toISOString();
  return json(game);
}
