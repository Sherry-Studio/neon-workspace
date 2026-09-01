import { Types } from 'mongoose';
import { Score } from '../models/Score';
import { Game } from '../models/Game';
import { GamePlay } from '../models/GamePlay';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { buildPaginated, buildSort } from '../utils/pagination';
import { GameStatus, type ListQuery } from '../types';
import { evaluateForUser } from './achievement.service';
import { logger } from '../config/logger';

/** Hard ceiling — any score above this is rejected outright. */
const ABSOLUTE_MAX_SCORE = 100_000_000;
/** Above this rate (points per second) the score is accepted but flagged. */
const SUSPICIOUS_RATE = 5_000;

interface SubmitInput {
  userId: string;
  gameId: string;
  score: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  playSessionId?: string;
}

function antiAbuseCheck(score: number, duration?: number): { flagged: boolean; reason?: string } {
  if (duration && duration > 0) {
    const rate = score / duration;
    if (rate > SUSPICIOUS_RATE) {
      return { flagged: true, reason: `Implausible rate: ${Math.round(rate)} pts/s` };
    }
  }
  if (!duration && score > 1_000_000) {
    return { flagged: true, reason: 'Large score with no duration reported' };
  }
  return { flagged: false };
}

export async function submitScore(input: SubmitInput) {
  if (!Types.ObjectId.isValid(input.gameId)) throw ApiError.badRequest('Invalid game id');
  if (!Number.isFinite(input.score) || input.score < 0) throw ApiError.badRequest('Invalid score');
  if (input.score > ABSOLUTE_MAX_SCORE) throw ApiError.badRequest('Score exceeds allowed maximum');

  const game = await Game.findById(input.gameId);
  if (!game || game.status !== GameStatus.PUBLISHED) throw ApiError.notFound('Game not found');

  const score = Math.floor(input.score);
  const duration = input.duration && input.duration > 0 ? Math.floor(input.duration) : 0;

  // Validate play session if provided (defence against fabricated scores).
  let sessionId: Types.ObjectId | undefined;
  if (input.playSessionId) {
    const play = await GamePlay.findOne({ _id: input.playSessionId, userId: input.userId, gameId: input.gameId });
    if (!play) throw ApiError.badRequest('Invalid play session');
    sessionId = play._id;
  }

  const { flagged, reason } = antiAbuseCheck(score, duration);

  const doc = await Score.create({
    userId: input.userId,
    gameId: input.gameId,
    score,
    duration,
    metadata: input.metadata ?? {},
    playSessionId: sessionId,
    flagged,
    flagReason: reason,
  });

  if (flagged) {
    logger.warn({ userId: input.userId, gameId: input.gameId, score, reason }, 'score flagged');
  } else {
    await bumpUserStats(input.userId, score);
  }

  const unlocked = flagged ? [] : await evaluateForUser(input.userId);

  return { score: doc.toObject(), flagged, achievementsUnlocked: unlocked };
}

async function bumpUserStats(userId: string, score: number) {
  const user = await User.findById(userId);
  if (!user) return;
  user.stats.gamesPlayed += 1;
  user.stats.totalScore += score;
  user.stats.highestScore = Math.max(user.stats.highestScore, score);
  user.stats.lastPlayedAt = new Date();
  await user.save();
}

export async function myScores(userId: string, q: ListQuery & { gameId?: string }) {
  const filter: Record<string, unknown> = { userId };
  if (q.gameId && Types.ObjectId.isValid(q.gameId)) filter.gameId = q.gameId;
  const [items, total] = await Promise.all([
    Score.find(filter)
      .sort(buildSort(q.sort, { createdAt: -1 }))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('gameId', 'title slug thumbnail')
      .lean(),
    Score.countDocuments(filter),
  ]);
  return buildPaginated(items, total, q.page, q.limit);
}

export async function scoresForGame(gameId: string, q: ListQuery) {
  if (!Types.ObjectId.isValid(gameId)) throw ApiError.badRequest('Invalid game id');
  const filter = { gameId, flagged: false };
  const [items, total] = await Promise.all([
    Score.find(filter)
      .sort(buildSort(q.sort, { score: -1 }))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('userId', 'username avatar')
      .lean(),
    Score.countDocuments(filter),
  ]);
  return buildPaginated(items, total, q.page, q.limit);
}

// ── Leaderboards ───────────────────────────────────────────────────────────

function sinceForRange(range?: string): Date | undefined {
  const now = Date.now();
  switch (range) {
    case 'day':
      return new Date(now - 24 * 3600_000);
    case 'week':
      return new Date(now - 7 * 24 * 3600_000);
    case 'month':
      return new Date(now - 30 * 24 * 3600_000);
    default:
      return undefined;
  }
}

/** Global leaderboard — best score per user across all games. */
export async function globalLeaderboard(opts: { page: number; limit: number; range?: string }) {
  const since = sinceForRange(opts.range);
  const match: Record<string, unknown> = { flagged: false };
  if (since) match.createdAt = { $gte: since };

  const pipeline: import('mongoose').PipelineStage[] = [
    { $match: match },
    { $group: { _id: '$userId', bestScore: { $max: '$score' }, totalScore: { $sum: '$score' }, plays: { $sum: 1 } } },
    { $sort: { bestScore: -1, totalScore: -1 } },
  ];

  const totalAgg = await Score.aggregate([...pipeline, { $count: 'count' }]);
  const total = totalAgg[0]?.count ?? 0;

  const rows = await Score.aggregate([
    ...pipeline,
    { $skip: (opts.page - 1) * opts.limit },
    { $limit: opts.limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        username: '$user.username',
        avatar: '$user.avatar',
        score: '$bestScore',
        totalScore: 1,
        plays: 1,
      },
    },
  ]);

  const items = rows.map((r, i) => ({ rank: (opts.page - 1) * opts.limit + i + 1, ...r }));
  return buildPaginated(items, total, opts.page, opts.limit);
}

/** Per-game leaderboard — best score per user for one game. */
export async function gameLeaderboard(
  gameId: string,
  opts: { page: number; limit: number; range?: string },
) {
  if (!Types.ObjectId.isValid(gameId)) throw ApiError.badRequest('Invalid game id');
  const since = sinceForRange(opts.range);
  const match: Record<string, unknown> = { gameId: new Types.ObjectId(gameId), flagged: false };
  if (since) match.createdAt = { $gte: since };

  const base: import('mongoose').PipelineStage[] = [
    { $match: match },
    { $sort: { score: -1 } },
    { $group: { _id: '$userId', score: { $first: '$score' }, duration: { $first: '$duration' }, achievedAt: { $first: '$createdAt' } } },
    { $sort: { score: -1, achievedAt: 1 } },
  ];

  const totalAgg = await Score.aggregate([...base, { $count: 'count' }]);
  const total = totalAgg[0]?.count ?? 0;

  const rows = await Score.aggregate([
    ...base,
    { $skip: (opts.page - 1) * opts.limit },
    { $limit: opts.limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        username: '$user.username',
        avatar: '$user.avatar',
        score: 1,
        duration: 1,
        achievedAt: 1,
      },
    },
  ]);

  const game = await Game.findById(gameId).select('title slug');
  const items = rows.map((r, i) => ({ rank: (opts.page - 1) * opts.limit + i + 1, ...r }));
  return { game: game ? { id: game._id.toString(), title: game.title, slug: game.slug } : null, ...buildPaginated(items, total, opts.page, opts.limit) };
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function adminListScores(q: ListQuery & { gameId?: string; userId?: string; flagged?: string }) {
  const filter: Record<string, unknown> = {};
  if (q.gameId && Types.ObjectId.isValid(q.gameId)) filter.gameId = q.gameId;
  if (q.userId && Types.ObjectId.isValid(q.userId)) filter.userId = q.userId;
  if (q.flagged === 'true') filter.flagged = true;
  if (q.flagged === 'false') filter.flagged = false;

  let userIds: Types.ObjectId[] | undefined;
  if (q.search) {
    userIds = await User.find({ username: { $regex: q.search, $options: 'i' } }).distinct('_id');
    filter.userId = { $in: userIds };
  }

  const [items, total] = await Promise.all([
    Score.find(filter)
      .sort(buildSort(q.sort, { createdAt: -1 }))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('userId', 'username avatar email')
      .populate('gameId', 'title slug')
      .lean(),
    Score.countDocuments(filter),
  ]);
  return buildPaginated(items, total, q.page, q.limit);
}

export async function adminFlagScore(id: string, flagged: boolean, reason?: string) {
  const score = await Score.findById(id);
  if (!score) throw ApiError.notFound('Score not found');
  const wasCounted = !score.flagged;
  score.flagged = flagged;
  score.flagReason = flagged ? reason ?? 'Flagged by admin' : undefined;
  await score.save();
  // Recompute the affected user's stats if countability changed.
  if (wasCounted !== !flagged) await recomputeUserStats(score.userId.toString());
  return score.toObject();
}

export async function adminDeleteScore(id: string) {
  const score = await Score.findByIdAndDelete(id);
  if (!score) throw ApiError.notFound('Score not found');
  await recomputeUserStats(score.userId.toString());
  return true;
}

export async function adminResetGameLeaderboard(gameId: string) {
  if (!Types.ObjectId.isValid(gameId)) throw ApiError.badRequest('Invalid game id');
  const affected: string[] = await Score.find({ gameId }).distinct('userId').then((v) => v.map(String));
  const res = await Score.deleteMany({ gameId });
  await Promise.all(affected.map((u) => recomputeUserStats(u)));
  return { deleted: res.deletedCount };
}

export async function recomputeUserStats(userId: string) {
  const agg = await Score.aggregate([
    { $match: { userId: new Types.ObjectId(userId), flagged: false } },
    { $group: { _id: null, total: { $sum: '$score' }, highest: { $max: '$score' }, count: { $sum: 1 } } },
  ]);
  const stats = agg[0] ?? { total: 0, highest: 0, count: 0 };
  await User.updateOne(
    { _id: userId },
    {
      'stats.totalScore': stats.total,
      'stats.highestScore': stats.highest,
      'stats.gamesPlayed': stats.count,
    },
  );
}
