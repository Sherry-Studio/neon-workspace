import { NextRequest } from "next/server";
import { db } from "@/lib/mock/store";
import { json, num, paginate, requireApiSession, tick } from "@/lib/mock/http";
import type { User } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.res;
  await tick();

  const sp = req.nextUrl.searchParams;
  const search = (sp.get("search") || "").toLowerCase().trim();
  const status = sp.get("status") || "";
  const role = sp.get("role") || "";
  const sort = sp.get("sort") || "createdAt:desc";

  let items = [...db().users];
  if (search)
    items = items.filter(
      (u) =>
        u.username.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search),
    );
  if (status) items = items.filter((u) => u.status === status);
  if (role) items = items.filter((u) => u.role === role);

  const [field, dir] = sort.split(":") as [keyof User, "asc" | "desc"];
  items.sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });

  return json(paginate(items, num(sp.get("page"), 1), num(sp.get("pageSize"), 10)));
}
