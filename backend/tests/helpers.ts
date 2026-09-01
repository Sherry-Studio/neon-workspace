import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { hashPassword } from '../src/utils/password';
import { Role } from '../src/types';

export const app: Express = createApp();

export async function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  const username = (overrides.username as string) || `user_${Math.random().toString(36).slice(2, 8)}`;
  const user = await User.create({
    username,
    usernameLower: username.toLowerCase(),
    email: (overrides.email as string) || `${username}@test.dev`,
    passwordHash: await hashPassword('Password123'),
    role: (overrides.role as Role) || Role.USER,
    isActive: overrides.isActive === undefined ? true : (overrides.isActive as boolean),
    isVerified: true,
  });
  return user;
}

export async function registerAndLogin(role: Role = Role.USER) {
  const user = await makeUser({ role });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: user.username, password: 'Password123' });
  return { user, token: res.body.data.accessToken as string };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
