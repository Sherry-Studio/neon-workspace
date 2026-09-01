import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { env, isTest } from '../config/env';

const windowMs = env.RATE_LIMIT_WINDOW_MIN * 60 * 1000;

const common = {
  windowMs,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, message: 'Too many requests, please try again later', errors: [] },
};

export const globalLimiter: RateLimitRequestHandler = rateLimit({
  ...common,
  max: env.RATE_LIMIT_MAX,
});

export const authLimiter: RateLimitRequestHandler = rateLimit({
  ...common,
  max: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
});

export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  max: 5,
});

export const writeLimiter: RateLimitRequestHandler = rateLimit({
  ...common,
  max: Math.max(30, Math.floor(env.RATE_LIMIT_MAX / 3)),
});
