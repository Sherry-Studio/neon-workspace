import type { Request, Response } from 'express';
import ms from '../utils/ms';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import * as authService from '../services/auth.service';
import { User } from '../models/User';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, authService.cookieOptions(ms(env.JWT_ACCESS_EXPIRES_IN)));
  res.cookie('refreshToken', refreshToken, authService.cookieOptions(ms(env.JWT_REFRESH_EXPIRES_IN)));
}

function clearAuthCookies(res: Response) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, avatar } = req.body;
  const result = await authService.register({ username, email, password, avatar });
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(
    res,
    { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
    'Account created successfully',
    201,
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const identifier = req.body.identifier || req.body.email || req.body.username;
  const result = await authService.login({ identifier, password: req.body.password });
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(
    res,
    { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
    'Signed in',
  );
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized('Refresh token missing');
  const result = await authService.refresh(token);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) await authService.revokeSessions(req.user.id);
  clearAuthCookies(res);
  sendSuccess(res, null, 'Signed out');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  sendSuccess(res, { user });
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  // requireAuth already validated the token; just echo identity.
  sendSuccess(res, { valid: true, user: { id: req.user!.id, role: req.user!.role, username: req.user!.username } });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.requestPasswordReset(req.body.email);
  sendSuccess(res, null, 'If that email exists, a reset link has been sent');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, null, 'Password has been reset. Please sign in.');
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  clearAuthCookies(res);
  sendSuccess(res, null, 'Password changed. Please sign in again.');
});

export const sendVerification = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.notFound('User not found');
  if (req.body.email && !user.email) {
    user.email = String(req.body.email).toLowerCase();
    await user.save();
  }
  await authService.sendVerificationEmail(user);
  sendSuccess(res, null, 'Verification email sent');
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.params.token);
  sendSuccess(res, null, 'Email verified');
});
