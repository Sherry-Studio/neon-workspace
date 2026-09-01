import { Router } from 'express';
import * as ctrl from '../controllers/score.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, ctrl.globalLeaderboard);
router.get('/:gameId', optionalAuth, ctrl.gameLeaderboard);

export default router;
