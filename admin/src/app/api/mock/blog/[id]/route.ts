import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession, tick } from "@/lib/mock/http";

type Ctx = { params: Promise<{ id: string }> };
const EDITABLE = [
  "title", "slug", "excerpt", "content", "coverImage", "category", "tags", "status",
] as const;

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();
  const { id } = await params;
  const post = db().blog.find((b) => b.id === id);
  if (!post) return errorJson(404, "Post not found.");
  return json(post);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const post = db().blog.find((b) => b.id === id);
  if (!post) return errorJson(404, "Post not found.");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (typeof body.slug === "string" && body.slug !== post.slug) {
    if (db().blog.some((b) => b.slug === body.slug && b.id !== id))
      return errorJson(409, "Another post already uses that slug.");
  }
  const wasPublished = post.status === "PUBLISHED";
  for (const key of EDITABLE) {
    if (key in body) (post as unknown as Record<string, unknown>)[key] = body[key];
  }
  if (post.status === "PUBLISHED" && !wasPublished && !post.publishedAt)
    post.publishedAt = new Date().toISOString();
  post.updatedAt = new Date().toISOString();
  return json(post);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const store = db();
  const idx = store.blog.findIndex((b) => b.id === id);
  if (idx === -1) return errorJson(404, "Post not found.");
  store.blog.splice(idx, 1);
  return json({ ok: true });
}
