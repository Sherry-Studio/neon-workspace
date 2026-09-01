import { z } from 'zod';
import { BlogCategory, BlogStatus } from '../types';

export const createBlogSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().max(50_000).optional(),
  contentBlocks: z.array(z.string().max(10_000)).max(100).optional(),
  coverImage: z.string().url().or(z.literal('')).optional(),
  heroGradient: z.string().max(400).optional(),
  category: z.nativeEnum(BlogCategory).optional(),
  authorName: z.string().max(120).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  status: z.nativeEnum(BlogStatus).optional(),
  readTime: z.string().max(40).optional(),
  pullQuote: z.string().max(500).optional(),
  relatedGames: z.array(z.string().max(120)).max(20).optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

export const publishBlogSchema = z.object({ published: z.boolean() });

export const blogQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  sort: z.string().max(100).optional(),
  category: z.string().max(60).optional(),
  status: z.string().max(40).optional(),
});
