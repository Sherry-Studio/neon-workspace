import { Types } from 'mongoose';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { NotificationType } from '../types';
import { sendPushToUsers } from './push.service';
import { logger } from '../config/logger';

interface CreateParams {
  title: string;
  message: string;
  type?: NotificationType;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  push?: boolean;
}

export async function notifyUser(userId: string, params: CreateParams) {
  const doc = await Notification.create({
    recipient: userId,
    title: params.title,
    message: params.message,
    type: params.type ?? NotificationType.SYSTEM,
    metadata: params.metadata ?? {},
    createdBy: params.createdBy,
  });
  if (params.push !== false) {
    sendPushToUsers([userId], { title: params.title, body: params.message }).catch((err) =>
      logger.error({ err }, 'push fan-out failed'),
    );
  }
  return doc;
}

export async function notifyMany(userIds: string[], params: CreateParams) {
  if (!userIds.length) return { count: 0 };
  const unique = [...new Set(userIds.map(String))];
  const docs = unique.map((id) => ({
    recipient: new Types.ObjectId(id),
    title: params.title,
    message: params.message,
    type: params.type ?? NotificationType.ADMIN,
    metadata: params.metadata ?? {},
    createdBy: params.createdBy,
  }));
  await Notification.insertMany(docs, { ordered: false });
  if (params.push !== false) {
    sendPushToUsers(unique, { title: params.title, body: params.message }).catch(() => undefined);
  }
  return { count: unique.length };
}

export async function notifyAll(params: CreateParams) {
  const ids: string[] = await User.find({ isActive: true }).distinct('_id').then((v) => v.map(String));
  return notifyMany(ids, params);
}

export async function listForUser(
  userId: string,
  opts: { page: number; limit: number; unreadOnly?: boolean },
) {
  const filter: Record<string, unknown> = { recipient: userId };
  if (opts.unreadOnly) filter.isRead = false;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.limit)
      .limit(opts.limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);
  return { items, total, unread };
}

export async function markRead(userId: string, notificationId: string) {
  const doc = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true },
  );
  return doc;
}

export async function markAllRead(userId: string) {
  const res = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() },
  );
  return { modified: res.modifiedCount };
}

export async function remove(userId: string, notificationId: string) {
  const res = await Notification.deleteOne({ _id: notificationId, recipient: userId });
  return res.deletedCount === 1;
}
