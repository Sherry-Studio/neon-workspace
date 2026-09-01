import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession, tick } from "@/lib/mock/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();
  const { id } = await params;
  const user = db().users.find((u) => u.id === id);
  if (!user) return errorJson(404, "User not found.");
  return json(user);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const store = db();
  const user = store.users.find((u) => u.id === id);
  if (!user) return errorJson(404, "User not found.");

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.username === "string" && body.username.trim().length >= 3)
    user.username = body.username.trim();
  if (typeof body.email === "string" && body.email.includes("@"))
    user.email = body.email.trim();
  if (body.status === "ACTIVE" || body.status === "SUSPENDED" || body.status === "PENDING")
    user.status = body.status;
  if (
    (body.role === "USER" || body.role === "ADMIN" || body.role === "SUPER_ADMIN") &&
    auth.user.role === "SUPER_ADMIN"
  )
    user.role = body.role;

  return json(user);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const store = db();
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) return errorJson(404, "User not found.");
  if (store.users[idx].role === "SUPER_ADMIN")
    return errorJson(403, "A SUPER_ADMIN account cannot be deleted from here.");
  store.users.splice(idx, 1);
  return json({ ok: true });
}
