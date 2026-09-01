import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { GamePlay } from '../models/GamePlay';
import { Game } from '../models/Game';
import { ApiError } from '../utils/ApiError';
import { GameStatus } from '../types';
import { incrementPlays } from './game.service';

export async function startPlay(params: {
  userId: string;
  gameId: string;
  ip?: string;
  userAgent?: string;
}) {
  if (!Types.ObjectId.isValid(params.gameId)) throw ApiError.badRequest('Invalid game id');
  const game = await Game.findById(params.gameId);
  if (!game || game.status !== GameStatus.PUBLISHED) throw ApiError.notFound('Game not found');

  const play = await GamePlay.create({
    userId: params.userId,
    gameId: params.gameId,
    startedAt: new Date(),
    ipHash: params.ip ? createHash('sha256').update(params.ip).digest('hex').slice(0, 32) : undefined,
    userAgent: params.userAgent?.slice(0, 300),
  });

  await incrementPlays(params.gameId);

  return {
    playSessionId: play._id.toString(),
    game: game.toPublicJSON(),
    startedAt: play.startedAt,
  };
}

export async function completePlay(params: {
  userId: string;
  playSessionId: string;
  score?: number;
  durationSeconds?: number;
}) {
  const play = await GamePlay.findOne({ _id: params.playSessionId, userId: params.userId });
  if (!play) throw ApiError.notFound('Play session not found');
  if (play.completedAt) throw ApiError.badRequest('Play session already completed');

  play.completedAt = new Date();
  if (typeof params.score === 'number') play.score = Math.max(0, Math.floor(params.score));
  play.durationSeconds =
    params.durationSeconds ?? Math.round((play.completedAt.getTime() - play.startedAt.getTime()) / 1000);
  await play.save();
  return play.toObject();
}

export async function listUserPlays(userId: string, page: number, limit: number) {
  const [items, total] = await Promise.all([
    GamePlay.find({ userId })
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('gameId', 'title slug thumbnail')
      .lean(),
    GamePlay.countDocuments({ userId }),
  ]);
  return { items, total };
}
