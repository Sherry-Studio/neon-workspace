/* eslint-disable no-console */
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { Blog } from '../models/Blog';
import { Achievement } from '../models/Achievement';
import { Score } from '../models/Score';
import { hashPassword } from './password';
import { Role } from '../types';
import { seedAchievements, seedGames, seedPosts } from './seedData';
import { AVATAR_IDS } from './avatars';

async function upsertAdmin(): Promise<string> {
  const usernameLower = env.SEED_ADMIN_USERNAME.toLowerCase();
  let admin = await User.findOne({ usernameLower });
  if (!admin) {
    admin = await User.create({
      username: env.SEED_ADMIN_USERNAME,
      usernameLower,
      email: env.SEED_ADMIN_EMAIL.toLowerCase(),
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      avatar: 'apex',
      role: Role.SUPER_ADMIN,
      isActive: true,
      isVerified: true,
    });
    console.log(`✓ created SUPER_ADMIN "${admin.username}" <${admin.email}>`);
  } else {
    admin.role = Role.SUPER_ADMIN;
    admin.isVerified = true;
    admin.isActive = true;
    await admin.save();
    console.log(`✓ ensured SUPER_ADMIN "${admin.username}"`);
  }
  return admin._id.toString();
}

async function seedGamesCollection(adminId: string): Promise<void> {
  for (const g of seedGames) {
    const res = await Game.updateOne(
      { slug: g.slug },
      { $set: { ...g, createdBy: adminId }, $setOnInsert: { plays: 0, likes: 0 } },
      { upsert: true },
    );
    console.log(`  game ${g.slug}: ${res.upsertedCount ? 'created' : 'updated'}`);
  }
}

async function seedAchievementsCollection(): Promise<void> {
  for (const a of seedAchievements) {
    await Achievement.updateOne({ key: a.key }, { $set: a }, { upsert: true });
  }
  console.log(`  ${seedAchievements.length} achievements ensured`);
}

async function seedBlogCollection(adminId: string): Promise<void> {
  for (const p of seedPosts) {
    const res = await Blog.updateOne(
      { slug: p.slug },
      {
        $set: {
          ...p,
          content: p.contentBlocks.join('\n\n'),
          author: adminId,
        },
        $setOnInsert: { views: 0, publishedAt: new Date() },
      },
      { upsert: true },
    );
    console.log(`  post ${p.slug}: ${res.upsertedCount ? 'created' : 'updated'}`);
  }
}

async function seedDemoUsers(): Promise<void> {
  if (!env.SEED_DEMO_USERS) return;
  const names = ['nova_pilot', 'drift_king', 'pixel_ghost', 'zero_cool', 'byte_runner'];
  const games = await Game.find({ status: 'PUBLISHED' });
  const pw = await hashPassword('DemoPass123');

  for (const name of names) {
    const lower = name.toLowerCase();
    let user = await User.findOne({ usernameLower: lower });
    if (!user) {
      user = await User.create({
        username: name,
        usernameLower: lower,
        email: `${lower}@demo.neonarcade.dev`,
        passwordHash: pw,
        avatar: AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)],
        isVerified: true,
      });
    }
    // Give each demo user a few scores across games.
    for (const game of games) {
      const rounds = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < rounds; i += 1) {
        const score = 2000 + Math.floor(Math.random() * 90_000);
        // eslint-disable-next-line no-await-in-loop
        await Score.create({
          userId: user._id,
          gameId: game._id,
          score,
          duration: 60 + Math.floor(Math.random() * 240),
          metadata: { seeded: true },
        });
      }
    }
    // Recompute stats from seeded scores.
    // eslint-disable-next-line no-await-in-loop
    const agg = await Score.aggregate([
      { $match: { userId: user._id, flagged: false } },
      { $group: { _id: null, total: { $sum: '$score' }, highest: { $max: '$score' }, count: { $sum: 1 } } },
    ]);
    const s = agg[0] ?? { total: 0, highest: 0, count: 0 };
    user.stats.totalScore = s.total;
    user.stats.highestScore = s.highest;
    user.stats.gamesPlayed = s.count;
    user.stats.lastPlayedAt = new Date();
    // eslint-disable-next-line no-await-in-loop
    await user.save();
  }
  console.log(`  ${names.length} demo users with leaderboard data ensured`);
}

async function main(): Promise<void> {
  await connectDatabase();
  console.log(`\n🌱  Seeding NEON ARCADE database (${env.MONGODB_URI})\n`);

  const adminId = await upsertAdmin();
  await seedAchievementsCollection();
  await seedGamesCollection(adminId);
  await seedBlogCollection(adminId);
  await seedDemoUsers();

  console.log('\n✅  Seed complete.\n');
  console.log('   Admin login:');
  console.log(`     username: ${env.SEED_ADMIN_USERNAME}`);
  console.log(`     password: (from SEED_ADMIN_PASSWORD in your .env)\n`);

  await disconnectDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
