import { db } from "@/lib/mock/store";
import { json, requireApiSession, tick } from "@/lib/mock/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();
  const { id } = await params;
  const scores = db()
    .scores.filter((s) => s.userId === id)
    .slice(0, 25);
  return json(scores);
}
