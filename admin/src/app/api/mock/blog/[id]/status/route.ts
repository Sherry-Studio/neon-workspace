import { db } from "@/lib/mock/store";
import { errorJson, json, requireApiSession } from "@/lib/mock/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const { id } = await params;
  const post = db().blog.find((b) => b.id === id);
  if (!post) return errorJson(404, "Post not found.");
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (status !== "DRAFT" && status !== "PUBLISHED" && status !== "ARCHIVED")
    return errorJson(400, "Invalid status.");
  post.status = status;
  if (status === "PUBLISHED" && !post.publishedAt)
    post.publishedAt = new Date().toISOString();
  post.updatedAt = new Date().toISOString();
  return json(post);
}
