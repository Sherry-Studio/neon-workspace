import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, makeUser, registerAndLogin } from './helpers';
import { Role } from '../src/types';

describe('Admin', () => {
  it('blocks USER role from every admin route', async () => {
    const { token } = await registerAndLogin(Role.USER);
    for (const path of ['/api/admin/users', '/api/admin/analytics/overview', '/api/admin/scores']) {
      const res = await request(app).get(path).set(auth(token));
      expect(res.status).toBe(403);
    }
  });

  it('suspends a user and blocks their login', async () => {
    const admin = await registerAndLogin(Role.ADMIN);
    const victim = await makeUser({ username: 'victim' });

    const suspend = await request(app)
      .patch(`/api/admin/users/${victim._id}/suspend`)
      .set(auth(admin.token));
    expect(suspend.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'victim', password: 'Password123' });
    expect(login.status).toBe(403);
  });

  it('returns analytics overview for an admin', async () => {
    const admin = await registerAndLogin(Role.ADMIN);
    const res = await request(app).get('/api/admin/analytics/overview').set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.data.users.total).toBeGreaterThanOrEqual(1);
  });

  it('only SUPER_ADMIN can change roles', async () => {
    const admin = await registerAndLogin(Role.ADMIN);
    const superAdmin = await registerAndLogin(Role.SUPER_ADMIN);
    const target = await makeUser({ username: 'promoteme' });

    const denied = await request(app)
      .patch(`/api/admin/users/${target._id}/role`)
      .set(auth(admin.token))
      .send({ role: 'ADMIN' });
    expect(denied.status).toBe(403);

    const ok = await request(app)
      .patch(`/api/admin/users/${target._id}/role`)
      .set(auth(superAdmin.token))
      .send({ role: 'ADMIN' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.role).toBe('ADMIN');
  });
});
