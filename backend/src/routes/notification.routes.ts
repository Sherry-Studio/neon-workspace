import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParam } from '../validators/common.validators';
import { registerDeviceSchema } from '../validators/notification.validators';

const router = Router();

router.use(requireAuth);

router.get('/', ctrl.list);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', validate({ params: idParam }), ctrl.markRead);
router.delete('/:id', validate({ params: idParam }), ctrl.remove);

router.post('/devices', validate({ body: registerDeviceSchema }), ctrl.registerDevice);
router.delete('/devices', ctrl.unregisterDevice);

export default router;
