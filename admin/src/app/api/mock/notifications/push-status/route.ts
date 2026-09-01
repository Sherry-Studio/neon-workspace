import { json, requireApiSession } from "@/lib/mock/http";
import { pushAvailable, pushProvider } from "@/lib/mock/push";

export async function GET() {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  return json({ available: pushAvailable(), provider: pushProvider() });
}
