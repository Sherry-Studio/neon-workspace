import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const record = db().users.find((u) => u.id === auth.user.id);
  if (!record) return errorJson(404, "Account not found.");

  const { currentPassword, newPassword } = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  const cred = db().credentials[record.email.toLowerCase()];
  if (!cred || cred.password !== currentPassword)
    return errorJson(400, "Current password is incorrect.");
  if (!newPassword || newPassword.length < 8)
    return errorJson(400, "New password must be at least 8 characters.");
  cred.password = newPassword;
  return json({ ok: true });
}
