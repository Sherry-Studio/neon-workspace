import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import * as notificationService from '../services/notification.service';
import * as pushService from '../services/push.service';
import { recordAudit } from '../services/audit.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const page = Number(q.page) || 1;
  const limit = Number(q.limit) || 20;
  const { items, total, unread } = await notificationService.listForUser(req.user!.id, {
    page,
    limit,
    unreadOnly: q.unread === true || q.unread === 'true',
  });
  res.status(200).json({
    success: true,
    message: 'Notifications',
    data: items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), unread },
  });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const doc = await notificationService.markRead(req.user!.id, req.params.id);
  if (!doc) throw ApiError.notFound('Notification not found');
  sendSuccess(res, { notification: doc }, 'Marked as read');
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.markAllRead(req.user!.id);
  sendSuccess(res, result, 'All notifications marked as read');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const ok = await notificationService.remove(req.user!.id, req.params.id);
  if (!ok) throw ApiError.notFound('Notification not found');
  sendSuccess(res, null, 'Notification deleted');
});

// ── Push device registration ───────────────────────────────────────────────

export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  await pushService.registerDevice(req.user!.id, req.body.token, req.body.platform);
  sendSuccess(res, null, 'Device registered for push notifications');
});

export const unregisterDevice = asyncHandler(async (req: Request, res: Response) => {
  await pushService.unregisterDevice(req.body.token);
  sendSuccess(res, null, 'Device unregistered');
});

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminSend = asyncHandler(async (req: Request, res: Response) => {
  const { title, message, type, target, userId, userIds, push, link, gameId, blogId } = req.body;
  const metadata = {
    ...(req.body.metadata ?? {}),
    ...(link ? { link } : {}),
    ...(gameId ? { gameId } : {}),
    ...(blogId ? { blogId } : {}),
  };
  let result: { count: number };
  if (target === 'user') {
    await notificationService.notifyUser(userId, { title, message, type, metadata, createdBy: req.user!.id, push });
    result = { count: 1 };
  } else if (target === 'users') {
    result = await notificationService.notifyMany(userIds, {
      title,
      message,
      type,
      metadata,
      createdBy: req.user!.id,
      push,
    });
  } else {
    result = await notificationService.notifyAll({
      title,
      message,
      type,
      metadata,
      createdBy: req.user!.id,
      push,
    });
  }
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'notification.send',
    targetType: 'Notification',
    details: { target, count: result.count, title },
    ip: req.ip,
  });
  sendSuccess(res, result, `Notification sent to ${result.count} user(s)`, 201);
});
