import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sendVerificationSchema,
  verifyEmailParam,
} from '../validators/auth.validators';

const router = Router();

router.post('/register', authLimiter, validate({ body: registerSchema }), ctrl.register);
// Alias matching the existing frontend route (`/api/auth/signup`).
router.post('/signup', authLimiter, validate({ body: registerSchema }), ctrl.register);

router.post('/login', authLimiter, validate({ body: loginSchema }), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', requireAuth, ctrl.logout);

router.get('/me', requireAuth, ctrl.me);
router.get('/verify', requireAuth, ctrl.verify);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate({ body: forgotPasswordSchema }),
  ctrl.forgotPassword,
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate({ body: resetPasswordSchema }),
  ctrl.resetPassword,
);
router.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  ctrl.changePassword,
);

router.post(
  '/send-verification',
  requireAuth,
  passwordResetLimiter,
  validate({ body: sendVerificationSchema }),
  ctrl.sendVerification,
);
router.get('/verify-email/:token', validate({ params: verifyEmailParam }), ctrl.verifyEmail);

export default router;
