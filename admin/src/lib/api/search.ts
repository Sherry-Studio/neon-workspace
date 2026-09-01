import { apiRequest } from "./client";
import type { GlobalSearchResults } from "@/lib/types";

export const searchApi = {
  global: (q: string) =>
    apiRequest<GlobalSearchResults>("/search", { query: { q } }),
};
