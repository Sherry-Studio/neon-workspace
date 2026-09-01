import { Achievement, type IAchievement } from '../models/Achievement';
import { UserAchievement } from '../models/UserAchievement';
import { User, type IUser } from '../models/User';
import { Notification } from '../models/Notification';
import { NotificationType } from '../types';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';

export async function listAchievements() {
  return Achievement.find({ isActive: true }).sort({ threshold: 1 }).lean();
}

async function unlock(user: IUser, achievement: IAchievement) {
  try {
    await UserAchievement.create({ userId: user._id, achievementId: achievement._id });
  } catch {
    return false; // already unlocked (unique index)
  }
  await User.updateOne({ _id: user._id }, { $addToSet: { achievements: achievement._id } });
  await Notification.create({
    recipient: user._id,
    title: 'Achievement unlocked',
    message: `${achievement.title} — ${achievement.description}`,
    type: NotificationType.ACHIEVEMENT,
    metadata: { achievementKey: achievement.key },
  });
  return true;
}

/**
 * Evaluates rule-based achievements after a play/score event. Safe to call
 * frequently — unlocks are idempotent via the unique (userId, achievementId) index.
 */
export async function evaluateForUser(userId: string): Promise<string[]> {
  const [user, achievements, alreadyUnlocked] = await Promise.all([
    User.findById(userId),
    Achievement.find({ isActive: true, ruleType: { $ne: 'MANUAL' } }),
    UserAchievement.find({ userId }).distinct('achievementId'),
  ]);
  if (!user) return [];

  const unlockedSet = new Set(alreadyUnlocked.map(String));
  const newlyUnlocked: string[] = [];

  for (const a of achievements) {
    if (unlockedSet.has(a._id.toString())) continue;
    let qualifies = false;
    switch (a.ruleType) {
      case 'FIRST_GAME':
        qualifies = user.stats.gamesPlayed >= 1;
        break;
      case 'GAMES_PLAYED':
        qualifies = user.stats.gamesPlayed >= a.threshold;
        break;
      case 'HIGH_SCORE':
        qualifies = user.stats.highestScore >= a.threshold;
        break;
      case 'TOTAL_SCORE':
        qualifies = user.stats.totalScore >= a.threshold;
        break;
      case 'FIRST_WIN':
        qualifies = user.stats.highestScore > 0;
        break;
      default:
        qualifies = false;
    }
    if (qualifies) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await unlock(user, a);
      if (ok) newlyUnlocked.push(a.key);
    }
  }

  if (newlyUnlocked.length) {
    logger.info({ userId, achievements: newlyUnlocked }, 'achievements unlocked');
  }
  return newlyUnlocked;
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function adminListAll() {
  return Achievement.find().sort({ createdAt: -1 }).lean();
}

export async function createAchievement(input: Record<string, unknown>) {
  return Achievement.create(input);
}

export async function updateAchievement(id: string, patch: Record<string, unknown>) {
  const doc = await Achievement.findByIdAndUpdate(id, patch, { new: true });
  if (!doc) throw ApiError.notFound('Achievement not found');
  return doc;
}

export async function deleteAchievement(id: string) {
  const doc = await Achievement.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound('Achievement not found');
  await UserAchievement.deleteMany({ achievementId: id });
  return true;
}

export async function grantAchievement(userId: string, achievementKey: string) {
  const [user, achievement] = await Promise.all([
    User.findById(userId),
    Achievement.findOne({ key: achievementKey.toUpperCase() }),
  ]);
  if (!user) throw ApiError.notFound('User not found');
  if (!achievement) throw ApiError.notFound('Achievement not found');
  const ok = await unlock(user, achievement);
  return { unlocked: ok };
}
