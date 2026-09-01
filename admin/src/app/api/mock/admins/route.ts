import { db } from "@/lib/mock/store";
import { json, requireApiSession, tick } from "@/lib/mock/http";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();
  const admins = db().users.filter(
    (u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN",
  );
  return json(admins);
}
