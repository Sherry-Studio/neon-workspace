import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import gameRoutes from './game.routes';
import scoreRoutes from './score.routes';
import leaderboardRoutes from './leaderboard.routes';
import blogRoutes from './blog.routes';
import notificationRoutes from './notification.routes';
import adminRoutes from './admin.routes';
import * as userCtrl from '../controllers/user.controller';
import * as extras from '../controllers/adminExtras.controller';
import { Game } from '../models/Game';
import { mongoStateName } from '../utils/health';

const router = Router();

router.get('/health', async (_req, res) => {
  res.json({
    success: true,
    message: 'ok',
    data: {
      status: 'up',
      db: mongoStateName(),
      time: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Lightweight stats endpoint used by the marketing homepage counters.
router.get('/stats/public', async (_req, res) => {
  const [games, plays] = await Promise.all([
    Game.countDocuments({ status: 'PUBLISHED' }),
    Game.aggregate([{ $group: { _id: null, total: { $sum: '$plays' } } }]),
  ]);
  res.json({
    success: true,
    message: 'Public stats',
    data: { publishedGames: games, totalPlays: plays[0]?.total ?? 0 },
  });
});

router.get('/games/categories', extras.gameCategories);
router.get('/blog/categories', extras.blogCategories);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/games', gameRoutes);
router.use('/scores', scoreRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/blog', blogRoutes);
router.get('/achievements', userCtrl.listAllAchievements);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
