import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const game = db().games.find((g) => g.id === id);
  if (!game) return errorJson(404, "Game not found.");
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (status !== "DRAFT" && status !== "PUBLISHED" && status !== "ARCHIVED")
    return errorJson(400, "Invalid status.");
  game.status = status;
  if (status !== "PUBLISHED") game.featured = false;
  game.updatedAt = new Date().toISOString();
  return json(game);
}
