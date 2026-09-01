import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const user = db().users.find((u) => u.id === id);
  if (!user) return errorJson(404, "User not found.");
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (status !== "ACTIVE" && status !== "SUSPENDED" && status !== "PENDING")
    return errorJson(400, "Invalid status.");
  user.status = status;
  return json(user);
}
