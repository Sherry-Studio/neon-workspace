import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { User } from '../models/User';
import { Role } from '../types';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  if (typeof req.cookies?.accessToken === 'string') return req.cookies.accessToken;
  return null;
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  const payload = verifyAccessToken(token);
  if (payload.type !== 'access') throw ApiError.unauthorized('Invalid token type');

  const user = await User.findById(payload.sub).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account is suspended');
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    username: user.username,
    email: user.email,
    tokenVersion: user.tokenVersion,
  };
  next();
});

/** Attaches req.user when a valid token is present, but never rejects. */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return next();
    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub);
      if (user && user.isActive && user.tokenVersion === payload.tokenVersion) {
        req.user = {
          id: user._id.toString(),
          role: user.role,
          username: user.username,
          email: user.email,
          tokenVersion: user.tokenVersion,
        };
      }
    } catch {
      /* ignore — anonymous request */
    }
    next();
  },
);

function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

export const requireAdmin = requireRole(Role.ADMIN, Role.SUPER_ADMIN);
export const requireSuperAdmin = requireRole(Role.SUPER_ADMIN);
