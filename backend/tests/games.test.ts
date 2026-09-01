import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, registerAndLogin } from './helpers';
import { Role } from '../src/types';

async function createGame(token: string, over: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/games')
    .set(auth(token))
    .send({
      title: 'Neon Runner',
      shortDescription: 'Run',
      category: 'ARCADE',
      status: 'PUBLISHED',
      ...over,
    });
}

describe('Games', () => {
  it('forbids non-admins from creating games', async () => {
    const { token } = await registerAndLogin(Role.USER);
    const res = await createGame(token);
    expect(res.status).toBe(403);
  });

  it('lets an admin create, publish and delete a game', async () => {
    const { token } = await registerAndLogin(Role.ADMIN);
    const created = await createGame(token);
    expect(created.status).toBe(201);
    const id = created.body.data.game.id;
    expect(created.body.data.game.slug).toBe('neon-runner');

    const list = await request(app).get('/api/games');
    expect(list.body.data).toHaveLength(1);

    const bySlug = await request(app).get('/api/games/neon-runner');
    expect(bySlug.status).toBe(200);

    const del = await request(app).delete(`/api/games/${id}`).set(auth(token));
    expect(del.status).toBe(200);
    const after = await request(app).get('/api/games');
    expect(after.body.data).toHaveLength(0);
  });

  it('hides DRAFT games from the public list', async () => {
    const { token } = await registerAndLogin(Role.ADMIN);
    await createGame(token, { title: 'Hidden', status: 'DRAFT' });
    const list = await request(app).get('/api/games');
    expect(list.body.data).toHaveLength(0);
  });
});
