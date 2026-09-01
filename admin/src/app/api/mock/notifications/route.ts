import { NextRequest } from "next/server";
import { db, newId } from "@/lib/mock/store";
import { errorJson, json, num, paginate, requireApiSession, tick } from "@/lib/mock/http";
import { pushAvailable } from "@/lib/mock/push";
import type { NotificationRecord } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();

  const sp = req.nextUrl.searchParams;
  const search = (sp.get("search") || "").toLowerCase().trim();
  const type = sp.get("type") || "";

  let items = [...db().notifications];
  if (search)
    items = items.filter(
      (n) =>
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search) ||
        n.recipientLabel.toLowerCase().includes(search),
    );
  if (type) items = items.filter((n) => n.type === type);

  return json(paginate(items, num(sp.get("page"), 1), num(sp.get("pageSize"), 12)));
}

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  const audience = body.audience as NotificationRecord["audience"];
  const type = (body.type as NotificationRecord["type"]) || "SYSTEM";
  if (!title || !message) return errorJson(400, "Title and message are required.");
  if (!["ONE_USER", "MULTIPLE_USERS", "ALL_USERS"].includes(audience))
    return errorJson(400, "Invalid audience.");

  const store = db();
  const players = store.users.filter((u) => u.role === "USER");
  const recipientIds = Array.isArray(body.recipientIds)
    ? (body.recipientIds as string[])
    : [];

  let recipientCount = 0;
  let recipientLabel = "";
  let recipientId: string | null = null;
  if (audience === "ALL_USERS") {
    recipientCount = players.length;
    recipientLabel = "All users";
  } else if (audience === "MULTIPLE_USERS") {
    if (recipientIds.length < 1)
      return errorJson(400, "Select at least one recipient.");
    recipientCount = recipientIds.length;
    recipientLabel = `${recipientIds.length} users`;
  } else {
    if (recipientIds.length !== 1)
      return errorJson(400, "Select exactly one recipient.");
    recipientId = recipientIds[0];
    recipientCount = 1;
    recipientLabel =
      store.users.find((u) => u.id === recipientId)?.username || "1 user";
  }

  // The DB record is always written, even if push delivery fails.
  const pushReady = pushAvailable();
  const record: NotificationRecord = {
    id: newId("ntf"),
    title,
    message,
    type,
    audience,
    recipientId,
    recipientLabel,
    link: (body.link as string) || null,
    gameId: (body.gameId as string) || null,
    blogId: (body.blogId as string) || null,
    read: false,
    pushDelivered: pushReady,
    recipientCount,
    createdAt: new Date().toISOString(),
  };
  store.notifications.unshift(record);

  return json(record, 201);
}
