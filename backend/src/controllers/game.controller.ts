import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';
import * as gameService from '../services/game.service';
import * as gamePlayService from '../services/gameplay.service';
import { recordAudit } from '../services/audit.service';
import { GameStatus } from '../types';
import { parseListQuery } from '../utils/pagination';

// ── Public ─────────────────────────────────────────────────────────────────

export const listGames = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, unknown>;
  const result = await gameService.listPublicGames({
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 20,
    search: q.search ? String(q.search) : undefined,
    sort: q.sort ? String(q.sort) : undefined,
    category: q.category ? String(q.category) : undefined,
    featured: q.featured === true || q.featured === 'true',
  });
  sendPaginated(res, result, 'Games');
});

export const getGameBySlug = asyncHandler(async (req: Request, res: Response) => {
  const game = await gameService.getPublicGameBySlug(req.params.slug);
  sendSuccess(res, { game });
});

export const getFeatured = asyncHandler(async (req: Request, res: Response) => {
  const games = await gameService.getFeaturedGames(Number(req.query.limit) || 6);
  sendSuccess(res, { games });
});

export const getByCategory = asyncHandler(async (req: Request, res: Response) => {
  const q = parseListQuery(req);
  const result = await gameService.listPublicGames({ ...q, category: req.params.category });
  sendPaginated(res, result, `Games in ${req.params.category}`);
});

// ── Play tracking (auth) ───────────────────────────────────────────────────

export const startPlay = asyncHandler(async (req: Request, res: Response) => {
  const result = await gamePlayService.startPlay({
    userId: req.user!.id,
    gameId: req.params.gameId,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  });
  sendSuccess(res, result, 'Play session started', 201);
});

export const completePlay = asyncHandler(async (req: Request, res: Response) => {
  const result = await gamePlayService.completePlay({
    userId: req.user!.id,
    playSessionId: req.body.playSessionId,
    score: req.body.score,
    durationSeconds: req.body.durationSeconds,
  });
  sendSuccess(res, { play: result }, 'Play session completed');
});

// ── Admin / management ─────────────────────────────────────────────────────

export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const result = await gameService.adminListGames(parseListQuery(req));
  sendPaginated(res, result, 'Games (admin)');
});

export const adminGet = asyncHandler(async (req: Request, res: Response) => {
  const game = await gameService.adminGetGame(req.params.id);
  sendSuccess(res, { game: game.toPublicJSON() });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const game = await gameService.createGame(req.body, req.user!.id);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'game.create',
    targetType: 'Game',
    targetId: String(game.id),
    ip: req.ip,
  });
  sendSuccess(res, { game }, 'Game created', 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const game = await gameService.updateGame(req.params.id, req.body);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'game.update',
    targetType: 'Game',
    targetId: req.params.id,
    details: req.body,
    ip: req.ip,
  });
  sendSuccess(res, { game }, 'Game updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await gameService.deleteGame(req.params.id);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'game.delete',
    targetType: 'Game',
    targetId: req.params.id,
    ip: req.ip,
  });
  sendSuccess(res, null, 'Game deleted');
});

export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const game = await gameService.setGameStatus(req.params.id, req.body.status as GameStatus);
  sendSuccess(res, { game }, `Game status set to ${req.body.status}`);
});

export const setFeatured = asyncHandler(async (req: Request, res: Response) => {
  const game = await gameService.setGameFeatured(req.params.id, req.body.featured);
  sendSuccess(res, { game }, req.body.featured ? 'Game featured' : 'Game unfeatured');
});
