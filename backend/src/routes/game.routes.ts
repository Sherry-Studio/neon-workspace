import { Router } from 'express';
import * as ctrl from '../controllers/game.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimit';
import { idParam, slugParam } from '../validators/common.validators';
import {
  categoryParam,
  createGameSchema,
  updateGameSchema,
  setStatusSchema,
  setFeaturedSchema,
  completePlaySchema,
} from '../validators/game.validators';

const router = Router();

// Public
router.get('/', ctrl.listGames);
router.get('/featured', ctrl.getFeatured);
router.get('/category/:category', validate({ params: categoryParam }), ctrl.getByCategory);
router.get('/:slug', validate({ params: slugParam }), ctrl.getGameBySlug);

// Play tracking (auth)
router.post('/:gameId/play', requireAuth, ctrl.startPlay);
router.post(
  '/play/complete',
  requireAuth,
  validate({ body: completePlaySchema }),
  ctrl.completePlay,
);

// Admin CRUD
router.post('/', requireAuth, requireAdmin, writeLimiter, validate({ body: createGameSchema }), ctrl.create);
router.put('/:id', requireAuth, requireAdmin, validate({ params: idParam, body: updateGameSchema }), ctrl.update);
router.delete('/:id', requireAuth, requireAdmin, validate({ params: idParam }), ctrl.remove);
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  validate({ params: idParam, body: setStatusSchema }),
  ctrl.setStatus,
);
router.patch(
  '/:id/featured',
  requireAuth,
  requireAdmin,
  validate({ params: idParam, body: setFeaturedSchema }),
  ctrl.setFeatured,
);

export default router;
