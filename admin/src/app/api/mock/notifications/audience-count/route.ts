import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { audience, recipientIds } = (await req.json().catch(() => ({}))) as {
    audience?: string;
    recipientIds?: string[];
  };
  const players = db().users.filter((u) => u.role === "USER");
  if (audience === "ALL_USERS") return json({ count: players.length });
  if (audience === "MULTIPLE_USERS" || audience === "ONE_USER")
    return json({ count: recipientIds?.length ?? 0 });
  return errorJson(400, "Invalid audience.");
}
