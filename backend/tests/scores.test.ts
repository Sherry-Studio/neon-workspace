import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, auth, registerAndLogin } from './helpers';
import { Game } from '../src/models/Game';
import { Role } from '../src/types';

async function seedGame() {
  return Game.create({
    title: 'Neon Runner',
    slug: 'neon-runner',
    category: 'ARCADE',
    status: 'PUBLISHED',
  });
}

describe('Scores & leaderboard', () => {
  let gameId: string;
  beforeEach(async () => {
    gameId = (await seedGame())._id.toString();
  });

  it('submits a score and updates the player stats', async () => {
    const { token, user } = await registerAndLogin();
    const res = await request(app)
      .post('/api/scores')
      .set(auth(token))
      .send({ gameId, score: 5000, duration: 120 });
    expect(res.status).toBe(201);
    expect(res.body.data.flagged).toBe(false);

    const me = await request(app).get('/api/auth/me').set(auth(token));
    expect(me.body.data.user.stats.highestScore).toBe(5000);
    expect(String(user._id)).toBeTruthy();
  });

  it('flags an implausible score', async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post('/api/scores')
      .set(auth(token))
      .send({ gameId, score: 9_000_000, duration: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.flagged).toBe(true);
  });

  it('builds a per-game leaderboard and excludes flagged scores', async () => {
    const a = await registerAndLogin();
    const b = await registerAndLogin();
    await request(app).post('/api/scores').set(auth(a.token)).send({ gameId, score: 8000, duration: 100 });
    await request(app).post('/api/scores').set(auth(b.token)).send({ gameId, score: 3000, duration: 100 });

    const lb = await request(app).get(`/api/leaderboard/${gameId}`);
    expect(lb.status).toBe(200);
    expect(lb.body.data[0].score).toBe(8000);
    expect(lb.body.data[0].rank).toBe(1);
  });

  it('lets an admin delete a fraudulent score', async () => {
    const player = await registerAndLogin();
    const adminSession = await registerAndLogin(Role.ADMIN);
    const sub = await request(app)
      .post('/api/scores')
      .set(auth(player.token))
      .send({ gameId, score: 4000, duration: 90 });
    const scoreId = sub.body.data.score._id;

    const del = await request(app).delete(`/api/admin/scores/${scoreId}`).set(auth(adminSession.token));
    expect(del.status).toBe(200);

    const mine = await request(app).get('/api/scores/my').set(auth(player.token));
    expect(mine.body.data).toHaveLength(0);
  });
});
