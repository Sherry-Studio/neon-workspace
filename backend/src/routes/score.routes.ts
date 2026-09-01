import { Router } from 'express';
import * as ctrl from '../controllers/score.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimit';
import { submitScoreSchema } from '../validators/score.validators';

const router = Router();

router.post('/', requireAuth, writeLimiter, validate({ body: submitScoreSchema }), ctrl.submit);
router.get('/my', requireAuth, ctrl.myScores);
router.get('/game/:gameId', ctrl.gameScores);

export default router;
