import { apiRequest } from "./client";
import type { BlogPost, BlogStatus, Paginated } from "@/lib/types";

export interface BlogListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: BlogStatus | "";
  category?: string;
  sort?: string;
}

export interface BlogInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  category: string;
  tags: string[];
  status: BlogStatus;
}

export const blogApi = {
  list: (params: BlogListParams = {}) =>
    apiRequest<Paginated<BlogPost>>("/blog", { query: { ...params } }),

  get: (id: string) => apiRequest<BlogPost>(`/blog/${id}`),

  create: (input: BlogInput) =>
    apiRequest<BlogPost>("/blog", { method: "POST", body: input }),

  update: (id: string, input: Partial<BlogInput>) =>
    apiRequest<BlogPost>(`/blog/${id}`, { method: "PATCH", body: input }),

  setStatus: (id: string, status: BlogStatus) =>
    apiRequest<BlogPost>(`/blog/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  remove: (id: string) =>
    apiRequest<{ ok: true }>(`/blog/${id}`, { method: "DELETE" }),
};
