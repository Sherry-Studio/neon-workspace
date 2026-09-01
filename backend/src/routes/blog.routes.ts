import { Router } from 'express';
import * as ctrl from '../controllers/blog.controller';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimit';
import { idParam, slugParam } from '../validators/common.validators';
import { createBlogSchema, updateBlogSchema, publishBlogSchema } from '../validators/blog.validators';

const router = Router();

router.get('/', ctrl.list);
router.get('/:slug', validate({ params: slugParam }), ctrl.getBySlug);

router.post('/', requireAuth, requireAdmin, writeLimiter, validate({ body: createBlogSchema }), ctrl.create);
router.put('/:id', requireAuth, requireAdmin, validate({ params: idParam, body: updateBlogSchema }), ctrl.update);
router.delete('/:id', requireAuth, requireAdmin, validate({ params: idParam }), ctrl.remove);
router.patch(
  '/:id/publish',
  requireAuth,
  requireAdmin,
  validate({ params: idParam, body: publishBlogSchema }),
  ctrl.setPublished,
);

export default router;
