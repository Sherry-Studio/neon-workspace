import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';
import { buildPaginated } from '../utils/pagination';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { Score } from '../models/Score';
import { GamePlay } from '../models/GamePlay';
import { Blog } from '../models/Blog';
import { Notification } from '../models/Notification';
import { BlogCategory, GameCategory } from '../types';
import { isFcmEnabled } from '../services/push.service';

const dayKey = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } as const;
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600_000);

function rangeToDays(range?: string): number | null {
  switch (range) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case 'all':
    default:
      return null;
  }
}

/** Fills gaps so the chart has one point per day in the window. */
function densify(rows: { _id: string; count: number }[], days: number | null) {
  const map = new Map(rows.map((r) => [r._id, r.count]));
  if (days == null) {
    return rows
      .map((r) => ({ date: r._id, value: r.count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600_000).toISOString().slice(0, 10);
    out.push({ date: d, value: map.get(d) ?? 0 });
  }
  return out;
}

// ── GET /admin/dashboard ─────────────────────────────────────────────────────
// Single aggregate the admin dashboard consumes in one request.
export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalUsers,
    activeUsers,
    totalGames,
    totalPlays,
    totalScores,
    mostPlayedGames,
    recentUsers,
    recentScoresRaw,
    recentBlogPosts,
    recentNotificationsRaw,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    Game.countDocuments(),
    GamePlay.countDocuments(),
    Score.countDocuments({ flagged: false }),
    Game.find().sort({ plays: -1 }).limit(5).select('title plays category').lean(),
    User.find().sort({ createdAt: -1 }).limit(6),
    Score.find({ flagged: false })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('userId', 'username')
      .populate('gameId', 'title')
      .lean(),
    Blog.find().sort({ createdAt: -1 }).limit(6).select('title status slug').lean(),
    Notification.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('recipient', 'username')
      .lean(),
  ]);

  res.json({
    success: true,
    message: 'Dashboard',
    data: {
      totalUsers,
      activeUsers,
      totalGames,
      totalPlays,
      totalScores,
      mostPlayedGames: mostPlayedGames.map((g) => ({
        id: String(g._id),
        title: g.title,
        plays: g.plays,
        category: g.category,
      })),
      recentUsers: recentUsers.map((u) => u.toAdminJSON()),
      recentScores: recentScoresRaw.map((s) => ({
        id: String(s._id),
        userId: String((s.userId as { _id?: unknown })?._id ?? s.userId),
        username: (s.userId as { username?: string })?.username ?? 'unknown',
        gameId: String((s.gameId as { _id?: unknown })?._id ?? s.gameId),
        gameTitle: (s.gameId as { title?: string })?.title ?? 'unknown',
        score: s.score,
        suspicious: s.flagged,
        createdAt: s.createdAt,
      })),
      recentBlogPosts: recentBlogPosts.map((b) => ({
        id: String(b._id),
        title: b.title,
        slug: b.slug,
        status: b.status,
      })),
      recentNotifications: recentNotificationsRaw.map((n) => ({
        id: String(n._id),
        title: n.title,
        message: n.message,
        type: n.type,
        audience: 'ONE_USER',
        recipientLabel: (n.recipient as { username?: string })?.username ?? 'user',
        read: n.isRead,
        recipientCount: 1,
        createdAt: n.createdAt,
      })),
    },
  });
});

// ── GET /admin/analytics?range=7d|30d|90d|all ────────────────────────────────
export const analytics = asyncHandler(async (req: Request, res: Response) => {
  const range = typeof req.query.range === 'string' ? req.query.range : '30d';
  const days = rangeToDays(range);
  const since = days == null ? undefined : daysAgo(days);
  const dateMatch = since ? { createdAt: { $gte: since } } : {};

  const [users, plays, scores, signups, topGames, topPlayers] = await Promise.all([
    User.aggregate([{ $match: dateMatch }, { $group: { _id: dayKey, count: { $sum: 1 } } }]),
    GamePlay.aggregate([{ $match: dateMatch }, { $group: { _id: dayKey, count: { $sum: 1 } } }]),
    Score.aggregate([
      { $match: { flagged: false, ...dateMatch } },
      { $group: { _id: dayKey, count: { $sum: 1 } } },
    ]),
    User.aggregate([{ $match: dateMatch }, { $group: { _id: dayKey, count: { $sum: 1 } } }]),
    Game.find().sort({ plays: -1 }).limit(8).select('title plays').lean(),
    User.find().sort({ 'stats.highestScore': -1 }).limit(8).select('username stats').lean(),
  ]);

  res.json({
    success: true,
    message: 'Analytics',
    data: {
      range,
      usersOverTime: densify(users, days),
      playsOverTime: densify(plays, days),
      scoresOverTime: densify(scores, days),
      newRegistrations: densify(signups, days),
      mostPlayedGames: topGames.map((g) => ({ label: g.title, value: g.plays })),
      topPlayers: topPlayers.map((u) => ({
        label: u.username,
        value: u.stats?.highestScore ?? 0,
      })),
    },
  });
});

// ── GET /admin/users/:id/scores ─────────────────────────────────────────────
export const userScores = asyncHandler(async (req: Request, res: Response) => {
  const rows = await Score.find({ userId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('gameId', 'title')
    .lean();
  sendSuccess(
    res,
    {
      scores: rows.map((s) => ({
        id: String(s._id),
        gameId: String((s.gameId as { _id?: unknown })?._id ?? s.gameId),
        gameTitle: (s.gameId as { title?: string })?.title ?? 'unknown',
        score: s.score,
        suspicious: s.flagged,
        createdAt: s.createdAt,
      })),
    },
    'User scores',
  );
});

// ── GET /admin/users/:id/notifications ──────────────────────────────────────
export const userNotifications = asyncHandler(async (req: Request, res: Response) => {
  const rows = await Notification.find({ recipient: req.params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  sendSuccess(
    res,
    {
      notifications: rows.map((n) => ({
        id: String(n._id),
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.isRead,
        createdAt: n.createdAt,
      })),
    },
    'User notifications',
  );
});

// ── GET /admin/notifications  (history) ─────────────────────────────────────
export const notificationHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const filter: Record<string, unknown> = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) filter.title = { $regex: String(req.query.search), $options: 'i' };

  const [rows, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('recipient', 'username')
      .lean(),
    Notification.countDocuments(filter),
  ]);

  sendPaginated(
    res,
    buildPaginated(
      rows.map((n) => ({
        id: String(n._id),
        title: n.title,
        message: n.message,
        type: n.type,
        audience: 'ONE_USER',
        recipientId: String((n.recipient as { _id?: unknown })?._id ?? n.recipient),
        recipientLabel: (n.recipient as { username?: string })?.username ?? 'user',
        read: n.isRead,
        pushDelivered: false,
        recipientCount: 1,
        createdAt: n.createdAt,
      })),
      total,
      page,
      limit,
    ),
    'Notification history',
  );
});

// ── POST /admin/notifications/audience-count ────────────────────────────────
export const audienceCount = asyncHandler(async (req: Request, res: Response) => {
  const { audience, recipientIds } = req.body as {
    audience?: string;
    recipientIds?: string[];
  };
  let count = 0;
  if (audience === 'ALL_USERS') {
    count = await User.countDocuments({ isActive: true });
  } else if (audience === 'MULTIPLE_USERS') {
    count = Array.isArray(recipientIds)
      ? await User.countDocuments({ _id: { $in: recipientIds } })
      : 0;
  } else {
    count = recipientIds && recipientIds.length ? 1 : 0;
  }
  sendSuccess(res, { count }, 'Audience count');
});

// ── GET /admin/notifications/push-status ────────────────────────────────────
export const pushStatus = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(
    res,
    { available: isFcmEnabled(), provider: isFcmEnabled() ? 'fcm' : 'none' },
    'Push status',
  );
});

// ── GET /blog/categories ───────────────────────────────────────────────────
export const blogCategories = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { categories: Object.values(BlogCategory) }, 'Blog categories');
});

// ── GET /games/categories ──────────────────────────────────────────────────
export const gameCategories = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { categories: Object.values(GameCategory) }, 'Game categories');
});
