import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, registerAndLogin } from './helpers';

describe('Auth', () => {
  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'neo_runner',
      email: 'neo@test.dev',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects weak passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'weakling', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects duplicate username', async () => {
    await request(app).post('/api/auth/register').send({ username: 'dupe', password: 'Password123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupe', password: 'Password123' });
    expect(res.status).toBe(409);
  });

  it('logs in with username and rejects a bad password', async () => {
    await request(app).post('/api/auth/register').send({ username: 'loginme', password: 'Password123' });

    const good = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginme', password: 'Password123' });
    expect(good.status).toBe(200);
    expect(good.body.data.accessToken).toBeTruthy();

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginme', password: 'wrongpass' });
    expect(bad.status).toBe(401);
  });

  it('protects /api/auth/me', async () => {
    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);

    const { token } = await registerAndLogin();
    const me = await request(app).get('/api/auth/me').set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.data.user.username).toBeTruthy();
  });
});
