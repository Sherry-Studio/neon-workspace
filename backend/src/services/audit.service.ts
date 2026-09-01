import { createHash } from 'crypto';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../config/logger';

export async function recordAudit(params: {
  actorId: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await AuditLog.create({
      actor: params.actorId,
      actorUsername: params.actorUsername,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details ?? {},
      ipHash: params.ip ? createHash('sha256').update(params.ip).digest('hex').slice(0, 32) : undefined,
    });
  } catch (err) {
    logger.error({ err }, 'failed to write audit log');
  }
}
