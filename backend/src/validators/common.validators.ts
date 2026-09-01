import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParam = z.object({ id: objectId });
export const slugParam = z.object({ slug: z.string().min(1).max(200) });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sort: z.string().max(100).optional(),
  status: z.string().max(40).optional(),
  category: z.string().max(40).optional(),
});
