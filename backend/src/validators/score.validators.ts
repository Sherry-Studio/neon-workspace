import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const submitScoreSchema = z.object({
  gameId: objectId,
  score: z.number({ invalid_type_error: 'score must be a number' }).min(0).max(100_000_000),
  duration: z.number().min(0).max(86_400).optional(),
  playSessionId: objectId.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const leaderboardQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  range: z.enum(['day', 'week', 'month', 'all']).optional(),
});

export const myScoresQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(100).optional(),
  gameId: objectId.optional(),
});

export const adminScoresQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().max(100).optional(),
  search: z.string().trim().max(120).optional(),
  gameId: objectId.optional(),
  userId: objectId.optional(),
  flagged: z.enum(['true', 'false']).optional(),
});

export const flagScoreSchema = z.object({
  flagged: z.boolean(),
  reason: z.string().max(300).optional(),
});
