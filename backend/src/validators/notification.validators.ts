import { z } from 'zod';
import { NotificationType } from '../types';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const notificationsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const adminSendNotificationSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(1000),
    type: z.nativeEnum(NotificationType).optional(),
    metadata: z.record(z.unknown()).optional(),
    target: z.enum(['all', 'user', 'users']).default('all'),
    userId: objectId.optional(),
    userIds: z.array(objectId).max(10_000).optional(),
    push: z.boolean().optional(),
  })
  .refine((d) => d.target !== 'user' || Boolean(d.userId), {
    message: 'userId is required when target is "user"',
    path: ['userId'],
  })
  .refine((d) => d.target !== 'users' || (d.userIds && d.userIds.length > 0), {
    message: 'userIds is required when target is "users"',
    path: ['userIds'],
  });

export const registerDeviceSchema = z.object({
  token: z.string().min(10).max(4096),
  platform: z.enum(['android', 'ios', 'web']).default('web'),
});
