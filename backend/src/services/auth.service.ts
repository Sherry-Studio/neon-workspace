import { env } from '../config/env';
import { logger } from '../config/logger';
import { User, type IUser } from '../models/User';
import { Token } from '../models/Token';
import { ApiError } from '../utils/ApiError';
import { hashPassword, verifyPassword } from '../utils/password';
import { createSecureToken, hashToken } from '../utils/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { buildResetEmail, buildVerificationEmail, sendMail } from './email.service';
import { Role } from '../types';

export interface AuthResult {
  user: Record<string, unknown>;
  accessToken: string;
  refreshToken: string;
}

function issueTokens(user: IUser) {
  const base = { sub: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion };
  return {
    accessToken: signAccessToken(base),
    refreshToken: signRefreshToken(base),
  };
}

export async function register(input: {
  username: string;
  email?: string;
  password: string;
  avatar?: string;
}): Promise<AuthResult> {
  const usernameLower = input.username.toLowerCase();

  const clashes = await User.findOne({
    $or: [
      { usernameLower },
      ...(input.email ? [{ email: input.email.toLowerCase() }] : []),
    ],
  });
  if (clashes) {
    if (clashes.usernameLower === usernameLower) {
      throw ApiError.conflict('Username already taken', [
        { field: 'username', message: 'Username already taken' },
      ]);
    }
    throw ApiError.conflict('Email already registered', [
      { field: 'email', message: 'Email already registered' },
    ]);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    username: input.username,
    usernameLower,
    email: input.email ? input.email.toLowerCase() : undefined,
    passwordHash,
    avatar: input.avatar ?? 'nebula',
  });

  if (user.email) {
    await sendVerificationEmail(user).catch((err) =>
      logger.error({ err }, 'failed to send verification email'),
    );
  }

  const tokens = issueTokens(user);
  return { user: user.toSelfJSON(), ...tokens };
}

export async function login(input: {
  identifier: string; // username or email
  password: string;
}): Promise<AuthResult> {
  const id = input.identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ usernameLower: id }, { email: id }],
  }).select('+passwordHash');

  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('Account is suspended');

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = issueTokens(user);
  return { user: user.toSelfJSON(), ...tokens };
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  const payload = verifyRefreshToken(refreshToken);
  if (payload.type !== 'refresh') throw ApiError.unauthorized('Invalid token type');

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Session invalid');
  if (user.tokenVersion !== payload.tokenVersion) throw ApiError.unauthorized('Session expired');

  const tokens = issueTokens(user);
  return { user: user.toSelfJSON(), ...tokens };
}

/** Invalidates every issued token for the user (logout-all / password change). */
export async function revokeSessions(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

export async function getMe(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toSelfJSON();
}

export async function sendVerificationEmail(user: IUser): Promise<void> {
  if (!user.email) throw ApiError.badRequest('No email address on file');
  if (user.isVerified) throw ApiError.badRequest('Email already verified');

  await Token.deleteMany({ userId: user._id, purpose: 'EMAIL_VERIFICATION' });
  const { raw, hash } = createSecureToken();
  await Token.create({
    userId: user._id,
    tokenHash: hash,
    purpose: 'EMAIL_VERIFICATION',
    expiresAt: new Date(Date.now() + env.VERIFY_TOKEN_TTL_MIN * 60_000),
  });

  const link = `${env.FRONTEND_URL}/verify-email/${raw}`;
  const mail = buildVerificationEmail(user.username, link);
  mail.to = user.email;
  await sendMail(mail);
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenDoc = await Token.findOne({
    tokenHash: hashToken(rawToken),
    purpose: 'EMAIL_VERIFICATION',
    usedAt: { $exists: false },
  });
  if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
    throw ApiError.badRequest('Verification link is invalid or has expired');
  }
  await User.updateOne({ _id: tokenDoc.userId }, { isVerified: true });
  tokenDoc.usedAt = new Date();
  await tokenDoc.save();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always resolve without leaking whether the account exists.
  if (!user) {
    logger.info({ email }, 'password reset requested for unknown email');
    return;
  }
  await Token.deleteMany({ userId: user._id, purpose: 'PASSWORD_RESET' });
  const { raw, hash } = createSecureToken();
  await Token.create({
    userId: user._id,
    tokenHash: hash,
    purpose: 'PASSWORD_RESET',
    expiresAt: new Date(Date.now() + env.RESET_TOKEN_TTL_MIN * 60_000),
  });
  const link = `${env.FRONTEND_URL}/reset-password/${raw}`;
  const mail = buildResetEmail(user.username, link);
  mail.to = user.email as string;
  await sendMail(mail);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenDoc = await Token.findOne({
    tokenHash: hashToken(rawToken),
    purpose: 'PASSWORD_RESET',
    usedAt: { $exists: false },
  });
  if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }
  const user = await User.findById(tokenDoc.userId);
  if (!user) throw ApiError.notFound('User not found');

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1; // force re-login everywhere
  await user.save();

  tokenDoc.usedAt = new Date();
  await tokenDoc.save();
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');
  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');
  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1;
  await user.save();
}

export function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: maxAgeMs,
    path: '/',
  };
}

export const ADMIN_ROLES = [Role.ADMIN, Role.SUPER_ADMIN];
