import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';
import * as scoreService from '../services/score.service';
import { recordAudit } from '../services/audit.service';

// ── Player ─────────────────────────────────────────────────────────────────

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const result = await scoreService.submitScore({
    userId: req.user!.id,
    gameId: req.body.gameId,
    score: req.body.score,
    duration: req.body.duration,
    playSessionId: req.body.playSessionId,
    metadata: req.body.metadata,
  });
  sendSuccess(
    res,
    result,
    result.flagged ? 'Score recorded but flagged for review' : 'Score submitted',
    201,
  );
});

export const myScores = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const result = await scoreService.myScores(req.user!.id, {
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 20,
    sort: q.sort ? String(q.sort) : undefined,
    gameId: q.gameId ? String(q.gameId) : undefined,
  });
  sendPaginated(res, result, 'My scores');
});

export const gameScores = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const result = await scoreService.scoresForGame(req.params.gameId, {
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 20,
    sort: q.sort ? String(q.sort) : undefined,
  });
  sendPaginated(res, result, 'Game scores');
});

// ── Leaderboards ───────────────────────────────────────────────────────────

export const globalLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const result = await scoreService.globalLeaderboard({
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 20,
    range: q.range ? String(q.range) : undefined,
  });
  sendPaginated(res, result, 'Global leaderboard');
});

export const gameLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const result = await scoreService.gameLeaderboard(req.params.gameId, {
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 20,
    range: q.range ? String(q.range) : undefined,
  });
  res.status(200).json({
    success: true,
    message: 'Game leaderboard',
    data: result.items,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      game: result.game,
    },
  });
});

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const result = await scoreService.adminListScores({
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 20,
    sort: q.sort ? String(q.sort) : undefined,
    search: q.search ? String(q.search) : undefined,
    gameId: q.gameId ? String(q.gameId) : undefined,
    userId: q.userId ? String(q.userId) : undefined,
    flagged: q.flagged ? String(q.flagged) : undefined,
  });
  sendPaginated(res, result, 'Scores (admin)');
});

export const adminFlag = asyncHandler(async (req: Request, res: Response) => {
  const score = await scoreService.adminFlagScore(req.params.id, req.body.flagged, req.body.reason);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: req.body.flagged ? 'score.flag' : 'score.unflag',
    targetType: 'Score',
    targetId: req.params.id,
    details: { reason: req.body.reason },
    ip: req.ip,
  });
  sendSuccess(res, { score }, 'Score updated');
});

export const adminDelete = asyncHandler(async (req: Request, res: Response) => {
  await scoreService.adminDeleteScore(req.params.id);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'score.delete',
    targetType: 'Score',
    targetId: req.params.id,
    ip: req.ip,
  });
  sendSuccess(res, null, 'Score deleted');
});

export const adminResetGameLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const result = await scoreService.adminResetGameLeaderboard(req.params.gameId);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'leaderboard.reset',
    targetType: 'Game',
    targetId: req.params.gameId,
    details: result,
    ip: req.ip,
  });
  sendSuccess(res, result, 'Leaderboard reset');
});
