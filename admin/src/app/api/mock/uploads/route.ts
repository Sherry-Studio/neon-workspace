import { json, errorJson, requireApiSession, tick } from "@/lib/mock/http";
import { newId } from "@/lib/mock/store";

/**
 * Stand-in for the backend storage endpoint (`STORAGE_PROVIDER` = local|cloudinary|s3).
 * The real backend returns a hosted URL; here we just echo a data URL back so the
 * admin's image previews work end-to-end.
 */
export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick(400);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return errorJson(400, "No file provided.");
  if (file.size > 4 * 1024 * 1024)
    return errorJson(413, "File too large (4MB max).");
  if (!file.type.startsWith("image/"))
    return errorJson(415, "Only image uploads are supported.");

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  return json({ id: newId("img"), url: dataUrl, filename: file.name, size: file.size });
}
