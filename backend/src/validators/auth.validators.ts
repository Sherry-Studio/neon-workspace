import { z } from 'zod';
import { isStrongPassword } from '../utils/password';
import { AVATAR_IDS } from '../utils/avatars';

const username = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username must be at most 24 characters')
  .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, _ . -');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .refine(isStrongPassword, 'Password must contain at least one letter and one number');

export const registerSchema = z
  .object({
    username,
    email: z.string().email('Invalid email address').toLowerCase().optional(),
    password,
    confirmPassword: z.string().optional(),
    avatar: z.enum(AVATAR_IDS).optional(),
  })
  .refine((d) => d.confirmPassword === undefined || d.confirmPassword === d.password, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z
  .object({
    username: z.string().trim().optional(),
    email: z.string().trim().optional(),
    identifier: z.string().trim().optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((d) => Boolean(d.username || d.email || d.identifier), {
    message: 'username or email is required',
    path: ['username'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export const sendVerificationSchema = z.object({
  email: z.string().email().toLowerCase().optional(),
});

export const verifyEmailParam = z.object({ token: z.string().min(10) });

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});
