import { User } from '../models/User';
import { Game } from '../models/Game';
import { Score } from '../models/Score';
import { GamePlay } from '../models/GamePlay';
import { Blog } from '../models/Blog';
import { Notification } from '../models/Notification';
import { GameStatus } from '../types';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600_000);

export async function overview() {
  const [
    totalUsers,
    newUsers7d,
    activeUsers7d,
    totalGames,
    publishedGames,
    totalPlays,
    totalScores,
    totalPosts,
    notifStats,
    mostPlayed,
    topPlayer,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
    User.countDocuments({ lastLoginAt: { $gte: daysAgo(7) } }),
    Game.countDocuments(),
    Game.countDocuments({ status: GameStatus.PUBLISHED }),
    GamePlay.countDocuments(),
    Score.countDocuments({ flagged: false }),
    Blog.countDocuments(),
    Notification.aggregate([
      { $group: { _id: null, total: { $sum: 1 }, unread: { $sum: { $cond: ['$isRead', 0, 1] } } } },
    ]),
    Game.find({ status: GameStatus.PUBLISHED }).sort({ plays: -1 }).limit(1).select('title slug plays'),
    User.find().sort({ 'stats.highestScore': -1 }).limit(1).select('username avatar stats'),
  ]);

  return {
    users: { total: totalUsers, new7d: newUsers7d, active7d: activeUsers7d },
    games: {
      total: totalGames,
      published: publishedGames,
      mostPlayed: mostPlayed[0]
        ? { title: mostPlayed[0].title, slug: mostPlayed[0].slug, plays: mostPlayed[0].plays }
        : null,
    },
    plays: { total: totalPlays },
    scores: {
      total: totalScores,
      topPlayer: topPlayer[0]
        ? {
            username: topPlayer[0].username,
            avatar: topPlayer[0].avatar,
            highestScore: topPlayer[0].stats.highestScore,
          }
        : null,
    },
    blog: { total: totalPosts },
    notifications: { total: notifStats[0]?.total ?? 0, unread: notifStats[0]?.unread ?? 0 },
  };
}

export async function gamesAnalytics() {
  const perGame = await Score.aggregate([
    { $match: { flagged: false } },
    { $group: { _id: '$gameId', scores: { $sum: 1 }, avgScore: { $avg: '$score' }, maxScore: { $max: '$score' } } },
    { $lookup: { from: 'games', localField: '_id', foreignField: '_id', as: 'game' } },
    { $unwind: '$game' },
    {
      $project: {
        _id: 0,
        gameId: '$_id',
        title: '$game.title',
        slug: '$game.slug',
        plays: '$game.plays',
        likes: '$game.likes',
        scores: 1,
        avgScore: { $round: ['$avgScore', 0] },
        maxScore: 1,
      },
    },
    { $sort: { plays: -1 } },
  ]);

  const playsByDay = await GamePlay.aggregate([
    { $match: { createdAt: { $gte: daysAgo(30) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return { perGame, playsByDay: playsByDay.map((d) => ({ date: d._id, plays: d.count })) };
}

export async function usersAnalytics() {
  const signupsByDay = await User.aggregate([
    { $match: { createdAt: { $gte: daysAgo(30) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const byRole = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
  const [verified, suspended] = await Promise.all([
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ isActive: false }),
  ]);
  return {
    signupsByDay: signupsByDay.map((d) => ({ date: d._id, count: d.count })),
    byRole: Object.fromEntries(byRole.map((r) => [r._id, r.count])),
    verified,
    suspended,
  };
}

export async function scoresAnalytics() {
  const [byDay, flagged, topScores] = await Promise.all([
    Score.aggregate([
      { $match: { createdAt: { $gte: daysAgo(30) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Score.countDocuments({ flagged: true }),
    Score.find({ flagged: false })
      .sort({ score: -1 })
      .limit(10)
      .populate('userId', 'username avatar')
      .populate('gameId', 'title slug')
      .lean(),
  ]);
  return {
    submittedByDay: byDay.map((d) => ({ date: d._id, count: d.count })),
    flaggedTotal: flagged,
    topScores,
  };
}
