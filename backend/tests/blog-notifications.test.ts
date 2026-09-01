import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, auth, registerAndLogin } from './helpers';
import { Role } from '../src/types';

describe('Blog', () => {
  it('admin creates a post; public sees it only once published', async () => {
    const admin = await registerAndLogin(Role.ADMIN);
    const created = await request(app)
      .post('/api/blog')
      .set(auth(admin.token))
      .send({ title: 'The Vault Opens', excerpt: 'hi', content: 'body', status: 'DRAFT' });
    expect(created.status).toBe(201);
    const id = created.body.data.post.id;

    let list = await request(app).get('/api/blog');
    expect(list.body.data).toHaveLength(0);

    await request(app).patch(`/api/blog/${id}/publish`).set(auth(admin.token)).send({ published: true });
    list = await request(app).get('/api/blog');
    expect(list.body.data).toHaveLength(1);

    const bySlug = await request(app).get('/api/blog/the-vault-opens');
    expect(bySlug.status).toBe(200);
  });
});

describe('Notifications', () => {
  it('admin broadcasts and the user can read + mark read', async () => {
    const admin = await registerAndLogin(Role.ADMIN);
    const user = await registerAndLogin(Role.USER);

    const send = await request(app)
      .post('/api/admin/notifications')
      .set(auth(admin.token))
      .send({ title: 'New game available!', message: 'Neon Drift Racer is live', target: 'all' });
    expect(send.status).toBe(201);

    const list = await request(app).get('/api/notifications').set(auth(user.token));
    expect(list.body.data.length).toBeGreaterThanOrEqual(1);
    const notifId = list.body.data[0]._id;

    const read = await request(app)
      .patch(`/api/notifications/${notifId}/read`)
      .set(auth(user.token));
    expect(read.status).toBe(200);
    expect(read.body.data.notification.isRead).toBe(true);
  });
});
