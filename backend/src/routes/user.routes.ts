import { Router } from 'express';
import * as ctrl from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateSelfSchema, usernameParam } from '../validators/user.validators';

const router = Router();

router.get('/me', requireAuth, ctrl.getMe);
router.put('/me', requireAuth, validate({ body: updateSelfSchema }), ctrl.updateMe);
router.patch('/me', requireAuth, validate({ body: updateSelfSchema }), ctrl.updateMe);
router.get('/me/achievements', requireAuth, ctrl.getMyAchievements);

router.get('/:username', validate({ params: usernameParam }), ctrl.getPublicProfile);

export default router;
