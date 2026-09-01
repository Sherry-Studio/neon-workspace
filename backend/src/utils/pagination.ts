import type { Request } from 'express';
import type { ListQuery, Paginated } from '../types';

export function parseListQuery(req: Request, defaults?: Partial<ListQuery>): ListQuery {
  const page = Math.max(1, parseInt(String(req.query.page ?? defaults?.page ?? 1), 10) || 1);
  const rawLimit = parseInt(String(req.query.limit ?? defaults?.limit ?? 20), 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));

  return {
    page,
    limit,
    search: req.query.search ? String(req.query.search).trim() : undefined,
    sort: req.query.sort ? String(req.query.sort) : defaults?.sort,
    status: req.query.status ? String(req.query.status) : undefined,
    category: req.query.category ? String(req.query.category) : undefined,
  };
}

/**
 * Converts an API `sort` string ("-createdAt,score") into a Mongoose sort object.
 */
export function buildSort(sort?: string, fallback: Record<string, 1 | -1> = { createdAt: -1 }) {
  if (!sort) return fallback;
  const out: Record<string, 1 | -1> = {};
  for (const part of sort.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('-')) out[trimmed.slice(1)] = -1;
    else out[trimmed] = 1;
  }
  return Object.keys(out).length ? out : fallback;
}

export function buildPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
