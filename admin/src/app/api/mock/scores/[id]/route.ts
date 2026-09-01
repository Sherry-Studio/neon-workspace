import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const store = db();
  const idx = store.scores.findIndex((s) => s.id === id);
  if (idx === -1) return errorJson(404, "Score not found.");
  store.scores.splice(idx, 1);
  return json({ ok: true });
}
