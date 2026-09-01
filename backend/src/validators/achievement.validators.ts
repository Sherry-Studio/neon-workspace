import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const createAchievementSchema = z.object({
  key: z.string().trim().min(2).max(60).toUpperCase(),
  title: z.string().trim().min(2).max(120),
  description: z.string().max(400).optional(),
  icon: z.string().max(60).optional(),
  ruleType: z
    .enum(['FIRST_GAME', 'GAMES_PLAYED', 'HIGH_SCORE', 'TOTAL_SCORE', 'FIRST_WIN', 'MANUAL'])
    .optional(),
  threshold: z.number().min(0).optional(),
  gameId: objectId.optional(),
  isActive: z.boolean().optional(),
});

export const updateAchievementSchema = createAchievementSchema.partial();

export const grantAchievementSchema = z.object({
  userId: objectId,
  achievementKey: z.string().trim().min(2).max(60),
});
