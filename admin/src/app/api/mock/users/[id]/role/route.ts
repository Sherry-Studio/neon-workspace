import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  if (auth.user.role !== "SUPER_ADMIN")
    return errorJson(403, "Only a SUPER_ADMIN can change roles.");
  const { id } = await params;
  const user = db().users.find((u) => u.id === id);
  if (!user) return errorJson(404, "User not found.");
  const { role } = (await req.json().catch(() => ({}))) as { role?: string };
  if (role !== "USER" && role !== "ADMIN" && role !== "SUPER_ADMIN")
    return errorJson(400, "Invalid role.");
  user.role = role;
  return json(user);
}
