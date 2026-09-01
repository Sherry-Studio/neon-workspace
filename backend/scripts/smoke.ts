/* Smoke test: boots the app against an in-memory MongoDB, seeds, hits key routes. */
import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.NODE_ENV = 'development';
  process.env.JWT_ACCESS_SECRET = 'smoke_access_secret_0123456789abcdef';
  process.env.JWT_REFRESH_SECRET = 'smoke_refresh_secret_0123456789abcdef';
  process.env.SEED_DEMO_USERS = 'true';
  process.env.SEED_ADMIN_PASSWORD = 'SmokeAdmin123';

  const { connectDatabase } = await import('../src/config/database');
  const { createApp } = await import('../src/app');
  await connectDatabase();

  // seed inline
  const { User } = await import('../src/models/User');
  const { Game } = await import('../src/models/Game');
  const { hashPassword } = await import('../src/utils/password');
  const { Role } = await import('../src/types');
  const admin = await User.create({
    username: 'neonadmin',
    usernameLower: 'neonadmin',
    email: 'admin@neonarcade.dev',
    passwordHash: await hashPassword('SmokeAdmin123'),
    role: Role.SUPER_ADMIN,
    isVerified: true,
  });
  await Game.create({
    title: 'Neon Runner',
    slug: 'neon-runner',
    category: 'ARCADE',
    status: 'PUBLISHED',
    featured: true,
    createdBy: admin._id,
  });

  const request = (await import('supertest')).default;
  const app = createApp();
  const results: string[] = [];
  const check = async (label: string, p: Promise<{ status: number }>) => {
    const r = await p;
    results.push(`${r.status < 400 ? 'OK ' : 'ERR'} ${r.status}  ${label}`);
  };

  await check('GET /api/health', request(app).get('/api/health'));
  await check('GET /api/games', request(app).get('/api/games'));
  await check('GET /api/games/neon-runner', request(app).get('/api/games/neon-runner'));
  await check('GET /api/games/featured', request(app).get('/api/games/featured'));
  await check('GET /api/leaderboard', request(app).get('/api/leaderboard'));
  await check('GET /api/blog', request(app).get('/api/blog'));
  await check('GET /api/achievements', request(app).get('/api/achievements'));
  await check('GET /api/openapi.json', request(app).get('/api/openapi.json'));

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'player_one', password: 'Password123', avatar: 'venom' });
  results.push(`${reg.status === 201 ? 'OK ' : 'ERR'} ${reg.status}  POST /api/auth/register`);
  const token = reg.body?.data?.accessToken;

  await check('GET /api/auth/me', request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`));

  const login = await request(app)
    .post('/api/auth/login')
    .send({ username: 'neonadmin', password: 'SmokeAdmin123' });
  const adminToken = login.body?.data?.accessToken;
  await check(
    'GET /api/admin/analytics/overview',
    request(app).get('/api/admin/analytics/overview').set('Authorization', `Bearer ${adminToken}`),
  );
  await check(
    'POST /api/admin/notifications',
    request(app)
      .post('/api/admin/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'hi', message: 'welcome', target: 'all' }),
  );

  const game = await Game.findOne({ slug: 'neon-runner' });
  await check(
    'POST /api/scores',
    request(app)
      .post('/api/scores')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameId: game!._id.toString(), score: 4200, duration: 90 }),
  );
  await check('GET /api/leaderboard/:gameId', request(app).get(`/api/leaderboard/${game!._id}`));

  // eslint-disable-next-line no-console
  console.log('\n' + results.join('\n') + '\n');
  const failed = results.filter((r) => r.startsWith('ERR'));
  await mongo.stop();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
