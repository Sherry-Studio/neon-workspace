import { NextRequest } from "next/server";
import { db, newId } from "@/lib/mock/store";
import { errorJson, json, num, paginate, requireApiSession, tick } from "@/lib/mock/http";
import type { BlogPost } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();

  const sp = req.nextUrl.searchParams;
  const search = (sp.get("search") || "").toLowerCase().trim();
  const status = sp.get("status") || "";
  const category = sp.get("category") || "";
  const sort = sp.get("sort") || "createdAt:desc";

  let items = [...db().blog];
  if (search) items = items.filter((b) => b.title.toLowerCase().includes(search));
  if (status) items = items.filter((b) => b.status === status);
  if (category) items = items.filter((b) => b.category === category);

  const [field, dir] = sort.split(":") as [keyof BlogPost, "asc" | "desc"];
  items.sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av ?? "").localeCompare(String(bv ?? ""));
    return dir === "asc" ? cmp : -cmp;
  });

  return json(paginate(items, num(sp.get("page"), 1), num(sp.get("pageSize"), 10)));
}

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || "").trim();
  const slug = String(body.slug || "").trim();
  if (!title || !slug) return errorJson(400, "Title and slug are required.");
  if (db().blog.some((b) => b.slug === slug))
    return errorJson(409, "A post with that slug already exists.");

  const now = new Date().toISOString();
  const status =
    body.status === "PUBLISHED" || body.status === "ARCHIVED" ? body.status : "DRAFT";
  const post: BlogPost = {
    id: newId("blog"),
    title,
    slug,
    excerpt: String(body.excerpt || ""),
    content: String(body.content || ""),
    coverImage: (body.coverImage as string) || null,
    category: String(body.category || "Gaming News"),
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : [],
    author: auth.user.username,
    status,
    views: 0,
    publishedAt: status === "PUBLISHED" ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  db().blog.unshift(post);
  return json(post, 201);
}
