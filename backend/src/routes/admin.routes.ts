import { Router } from 'express';
import * as admin from '../controllers/admin.controller';
import * as game from '../controllers/game.controller';
import * as blog from '../controllers/blog.controller';
import * as score from '../controllers/score.controller';
import * as notification from '../controllers/notification.controller';
import * as upload from '../controllers/upload.controller';
import * as extras from '../controllers/adminExtras.controller';
import { uploadImage } from '../middleware/upload';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../validators/common.validators';
import {
  adminUpdateUserSchema,
  adminSetRoleSchema,
} from '../validators/user.validators';
import {
  createGameSchema,
  updateGameSchema,
  setStatusSchema,
  setFeaturedSchema,
} from '../validators/game.validators';
import { createBlogSchema, updateBlogSchema, publishBlogSchema } from '../validators/blog.validators';
import { adminScoresQuery, flagScoreSchema } from '../validators/score.validators';
import { adminSendNotificationSchema } from '../validators/notification.validators';
import {
  createAchievementSchema,
  updateAchievementSchema,
  grantAchievementSchema,
} from '../validators/achievement.validators';

const router = Router();

// Every admin route requires an authenticated ADMIN or SUPER_ADMIN.
router.use(requireAuth, requireAdmin);

// ── Dashboard & analytics (admin panel aggregates) ──
router.get('/dashboard', extras.dashboard);
router.get('/analytics', extras.analytics);

// ── Users ──
router.get('/users', admin.listUsers);
router.get('/users/:id', validate({ params: idParam }), admin.getUser);
router.get('/users/:id/scores', validate({ params: idParam }), extras.userScores);
router.get('/users/:id/notifications', validate({ params: idParam }), extras.userNotifications);
router.put('/users/:id', validate({ params: idParam, body: adminUpdateUserSchema }), admin.updateUser);
router.patch('/users/:id/suspend', validate({ params: idParam }), admin.suspendUser);
router.patch('/users/:id/activate', validate({ params: idParam }), admin.activateUser);
router.patch(
  '/users/:id/role',
  requireSuperAdmin,
  validate({ params: idParam, body: adminSetRoleSchema }),
  admin.setUserRole,
);
router.delete('/users/:id', requireSuperAdmin, validate({ params: idParam }), admin.deleteUser);

// ── Games ──
router.get('/games', game.adminList);
router.get('/games/:id', validate({ params: idParam }), game.adminGet);
router.post('/games', validate({ body: createGameSchema }), game.create);
router.put('/games/:id', validate({ params: idParam, body: updateGameSchema }), game.update);
router.delete('/games/:id', validate({ params: idParam }), game.remove);
router.patch('/games/:id/status', validate({ params: idParam, body: setStatusSchema }), game.setStatus);
router.patch('/games/:id/featured', validate({ params: idParam, body: setFeaturedSchema }), game.setFeatured);

// ── Blog ──
router.get('/blog', blog.adminList);
router.get('/blog/:id', validate({ params: idParam }), blog.adminGet);
router.post('/blog', validate({ body: createBlogSchema }), blog.create);
router.put('/blog/:id', validate({ params: idParam, body: updateBlogSchema }), blog.update);
router.delete('/blog/:id', validate({ params: idParam }), blog.remove);
router.patch('/blog/:id/publish', validate({ params: idParam, body: publishBlogSchema }), blog.setPublished);

// ── Scores & leaderboard ──
router.get('/scores', validate({ query: adminScoresQuery }), score.adminList);
router.patch('/scores/:id/flag', validate({ params: idParam, body: flagScoreSchema }), score.adminFlag);
router.delete('/scores/:id', validate({ params: idParam }), score.adminDelete);
router.post('/leaderboard/:gameId/reset', score.adminResetGameLeaderboard);

// ── Achievements ──
router.get('/achievements', admin.listAchievements);
router.post('/achievements', validate({ body: createAchievementSchema }), admin.createAchievement);
router.put('/achievements/:id', validate({ params: idParam, body: updateAchievementSchema }), admin.updateAchievement);
router.delete('/achievements/:id', validate({ params: idParam }), admin.deleteAchievement);
router.post('/achievements/grant', validate({ body: grantAchievementSchema }), admin.grantAchievement);

// ── Notifications ──
router.get('/notifications', extras.notificationHistory);
router.get('/notifications/push-status', extras.pushStatus);
router.post('/notifications/audience-count', extras.audienceCount);
router.post('/notifications', validate({ body: adminSendNotificationSchema }), notification.adminSend);

// ── Analytics ──
router.get('/analytics/overview', admin.analyticsOverview);
router.get('/analytics/games', admin.analyticsGames);
router.get('/analytics/users', admin.analyticsUsers);
router.get('/analytics/scores', admin.analyticsScores);

// ── Audit log & uploads ──
router.get('/audit-logs', admin.listAuditLogs);
router.post('/uploads/sign', upload.signUpload);
router.post('/uploads', uploadImage, upload.uploadDirect);

export default router;
