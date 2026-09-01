import { z } from 'zod';
import { GameCategory, GameStatus } from '../types';

export const createGameSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(160).optional(),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(300).optional(),
  thumbnail: z.string().url().or(z.literal('')).optional(),
  banner: z.string().url().or(z.literal('')).optional(),
  category: z.nativeEnum(GameCategory).optional(),
  status: z.nativeEnum(GameStatus).optional(),
  gameUrl: z.string().url().or(z.literal('')).optional(),
  version: z.string().max(20).optional(),
  featured: z.boolean().optional(),
  instructions: z.string().max(5000).optional(),
  controls: z.array(z.string().max(120)).max(30).optional(),
  genre: z.string().max(60).optional(),
  tagline: z.string().max(200).optional(),
  gradient: z.string().max(400).optional(),
});

export const updateGameSchema = createGameSchema.partial();

export const setStatusSchema = z.object({ status: z.nativeEnum(GameStatus) });
export const setFeaturedSchema = z.object({ featured: z.boolean() });

export const categoryParam = z.object({
  category: z.string().transform((v) => v.toUpperCase()),
});

export const publicGamesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sort: z.string().max(100).optional(),
  category: z.string().max(40).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const completePlaySchema = z.object({
  playSessionId: z.string().regex(/^[a-f\d]{24}$/i),
  score: z.number().min(0).max(100_000_000).optional(),
  durationSeconds: z.number().min(0).max(86_400).optional(),
});
