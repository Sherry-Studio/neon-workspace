import { apiFetch, apiFetchPage, type Page } from "@/lib/api/client";
import { serverBackendBase } from "@/lib/api/backend-url";
import type { BlogPost } from "@/types/api";

export interface BlogListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: string;
}

const serverBase = () => serverBackendBase();

export const blogsService = {
  list: (params: BlogListParams = {}, opts?: { server?: boolean }): Promise<Page<BlogPost>> =>
    apiFetchPage<BlogPost>("/blog", {
      query: { ...params },
      base: opts?.server ? serverBase() : undefined,
    }),

  bySlug: (slug: string, opts?: { server?: boolean }): Promise<BlogPost> =>
    apiFetch<{ post: BlogPost }>(`/blog/${slug}`, {
      base: opts?.server ? serverBase() : undefined,
    }).then((d) => d.post),

  categories: (): Promise<string[]> =>
    apiFetch<{ categories: string[] }>("/blog/categories").then((d) => d.categories),
};
