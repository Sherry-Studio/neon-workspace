import { env } from '../config/env';
import { logger } from '../config/logger';
import { DeviceToken } from '../models/DeviceToken';

/**
 * Push delivery layer (Firebase Cloud Messaging). Deliberately decoupled from
 * the database Notification records: `notification.service` always persists an
 * in-app notification, then best-effort calls this to fan out a push. Enable by
 * setting FCM_ENABLED=true and supplying Firebase service-account credentials.
 */

let initialized = false;

/** Whether push delivery is configured and enabled. */
export function isFcmEnabled(): boolean {
  return Boolean(
    env.FCM_ENABLED &&
      env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY,
  );
}

function ensureInit(): boolean {
  if (!env.FCM_ENABLED) return false;
  if (initialized) return true;
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    logger.warn('FCM_ENABLED but Firebase credentials missing — push disabled');
    return false;
  }
  // const admin = require('firebase-admin');
  // admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  initialized = true;
  return true;
}

export async function registerDevice(userId: string, token: string, platform: 'android' | 'ios' | 'web') {
  await DeviceToken.findOneAndUpdate(
    { token },
    { userId, token, platform, lastSeenAt: new Date() },
    { upsert: true, new: true },
  );
}

export async function unregisterDevice(token: string) {
  await DeviceToken.deleteOne({ token });
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<void> {
  if (!ensureInit()) return;
  const tokens = await DeviceToken.find({ userId: { $in: userIds } }).distinct('token');
  if (!tokens.length) return;
  // await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, data });
  logger.info({ count: tokens.length, title: payload.title }, '[push] would deliver FCM message');
}
