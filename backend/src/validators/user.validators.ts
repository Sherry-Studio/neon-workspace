import { z } from 'zod';
import { AVATAR_IDS } from '../utils/avatars';
import { Role } from '../types';

export const updateSelfSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_.-]+$/)
      .optional(),
    avatar: z.enum(AVATAR_IDS).optional(),
    bio: z.string().max(280).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const adminUpdateUserSchema = z.object({
  username: z.string().trim().min(3).max(24).optional(),
  bio: z.string().max(280).optional(),
  avatar: z.enum(AVATAR_IDS).optional(),
  isVerified: z.boolean().optional(),
});

export const adminSetRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const adminSetActiveSchema = z.object({
  isActive: z.boolean(),
});

export const usernameParam = z.object({
  username: z.string().trim().min(1).max(40),
});
