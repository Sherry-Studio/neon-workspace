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

/**
 * Accepts both the backend-native shape (`target` + `userId`/`userIds`) and the
 * admin-panel shape (`audience` = ONE_USER | MULTIPLE_USERS | ALL_USERS +
 * `recipientIds`). Normalises everything to `target` + `userId`/`userIds`.
 */
export const adminSendNotificationSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(1000),
    type: z.nativeEnum(NotificationType).optional(),
    metadata: z.record(z.unknown()).optional(),
    target: z.enum(['all', 'user', 'users']).optional(),
    audience: z.enum(['ONE_USER', 'MULTIPLE_USERS', 'ALL_USERS']).optional(),
    userId: objectId.optional(),
    userIds: z.array(objectId).max(10_000).optional(),
    recipientIds: z.array(objectId).max(10_000).optional(),
    link: z.string().url().nullish(),
    gameId: objectId.nullish(),
    blogId: objectId.nullish(),
    push: z.boolean().optional(),
  })
  .transform((d) => {
    let { target, userId, userIds } = d;
    if (!target && d.audience) {
      if (d.audience === 'ALL_USERS') target = 'all';
      else if (d.audience === 'MULTIPLE_USERS') {
        target = 'users';
        userIds = userIds ?? d.recipientIds;
      } else {
        target = 'user';
        userId = userId ?? d.recipientIds?.[0];
      }
    }
    return { ...d, target: target ?? 'all', userId, userIds };
  })
  .refine((d) => d.target !== 'user' || Boolean(d.userId), {
    message: 'A recipient is required for a single-user notification',
    path: ['userId'],
  })
  .refine((d) => d.target !== 'users' || (d.userIds && d.userIds.length > 0), {
    message: 'At least one recipient is required',
    path: ['userIds'],
  });

export const registerDeviceSchema = z.object({
  token: z.string().min(10).max(4096),
  platform: z.enum(['android', 'ios', 'web']).default('web'),
});
