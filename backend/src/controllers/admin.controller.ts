import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';
import { parseListQuery, buildPaginated } from '../utils/pagination';
import * as userService from '../services/user.service';
import * as achievementService from '../services/achievement.service';
import * as analyticsService from '../services/analytics.service';
import { recordAudit } from '../services/audit.service';
import { AuditLog } from '../models/AuditLog';
import { ApiError } from '../utils/ApiError';
import { Role } from '../types';

// ── Users ──────────────────────────────────────────────────────────────────

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.adminListUsers(parseListQuery(req));
  sendPaginated(res, result, 'Users');
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.adminGetUser(req.params.id);
  sendSuccess(res, { user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.adminUpdateUser(req.params.id, req.body);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'user.update',
    targetType: 'User',
    targetId: req.params.id,
    details: req.body,
    ip: req.ip,
  });
  sendSuccess(res, { user }, 'User updated');
});

export const suspendUser = asyncHandler(async (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) throw ApiError.badRequest('You cannot suspend your own account');
  const user = await userService.adminSetActive(req.params.id, false);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'user.suspend',
    targetType: 'User',
    targetId: req.params.id,
    ip: req.ip,
  });
  sendSuccess(res, { user }, 'User suspended');
});

export const activateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.adminSetActive(req.params.id, true);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'user.activate',
    targetType: 'User',
    targetId: req.params.id,
    ip: req.ip,
  });
  sendSuccess(res, { user }, 'User activated');
});

export const setUserRole = asyncHandler(async (req: Request, res: Response) => {
  // Only SUPER_ADMIN reaches this route (enforced by router).
  if (req.params.id === req.user!.id) throw ApiError.badRequest('You cannot change your own role');
  const user = await userService.adminSetRole(req.params.id, req.body.role as Role);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'user.role',
    targetType: 'User',
    targetId: req.params.id,
    details: { role: req.body.role },
    ip: req.ip,
  });
  sendSuccess(res, { user }, `Role updated to ${req.body.role}`);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) throw ApiError.badRequest('You cannot delete your own account');
  await userService.adminDeleteUser(req.params.id);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'user.delete',
    targetType: 'User',
    targetId: req.params.id,
    ip: req.ip,
  });
  sendSuccess(res, null, 'User deleted');
});

// ── Achievements ───────────────────────────────────────────────────────────

export const listAchievements = asyncHandler(async (_req: Request, res: Response) => {
  const achievements = await achievementService.adminListAll();
  sendSuccess(res, { achievements });
});

export const createAchievement = asyncHandler(async (req: Request, res: Response) => {
  const achievement = await achievementService.createAchievement(req.body);
  sendSuccess(res, { achievement }, 'Achievement created', 201);
});

export const updateAchievement = asyncHandler(async (req: Request, res: Response) => {
  const achievement = await achievementService.updateAchievement(req.params.id, req.body);
  sendSuccess(res, { achievement }, 'Achievement updated');
});

export const deleteAchievement = asyncHandler(async (req: Request, res: Response) => {
  await achievementService.deleteAchievement(req.params.id);
  sendSuccess(res, null, 'Achievement deleted');
});

export const grantAchievement = asyncHandler(async (req: Request, res: Response) => {
  const result = await achievementService.grantAchievement(req.body.userId, req.body.achievementKey);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'achievement.grant',
    targetType: 'User',
    targetId: req.body.userId,
    details: { achievementKey: req.body.achievementKey },
    ip: req.ip,
  });
  sendSuccess(res, result, 'Achievement granted');
});

// ── Analytics ──────────────────────────────────────────────────────────────

export const analyticsOverview = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await analyticsService.overview(), 'Analytics overview');
});
export const analyticsGames = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await analyticsService.gamesAnalytics(), 'Games analytics');
});
export const analyticsUsers = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await analyticsService.usersAnalytics(), 'Users analytics');
});
export const analyticsScores = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await analyticsService.scoresAnalytics(), 'Scores analytics');
});

// ── Audit log ──────────────────────────────────────────────────────────────

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = parseListQuery(req);
  const filter: Record<string, unknown> = {};
  if (q.search) filter.action = { $regex: q.search, $options: 'i' };
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  sendPaginated(res, buildPaginated(items, total, q.page, q.limit), 'Audit logs');
});
