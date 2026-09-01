import { db } from "@/lib/mock/store";
import { json, requireApiSession, tick } from "@/lib/mock/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();
  const { id } = await params;
  const items = db().notifications.filter(
    (n) => n.audience === "ALL_USERS" || n.recipientId === id,
  );
  return json(items.slice(0, 25));
}
