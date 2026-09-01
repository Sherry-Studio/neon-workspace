import { User } from '../models/User';
import { UserAchievement } from '../models/UserAchievement';
import { Score } from '../models/Score';
import { ApiError } from '../utils/ApiError';
import { buildPaginated, buildSort } from '../utils/pagination';
import type { ListQuery } from '../types';
import { isValidAvatarId } from '../utils/avatars';

export async function getSelf(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toSelfJSON();
}

export async function updateSelf(
  userId: string,
  patch: { username?: string; avatar?: string; bio?: string },
) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (patch.username !== undefined && patch.username !== user.username) {
    const lower = patch.username.toLowerCase();
    const taken = await User.exists({ usernameLower: lower, _id: { $ne: user._id } });
    if (taken) {
      throw ApiError.conflict('Username already taken', [
        { field: 'username', message: 'Username already taken' },
      ]);
    }
    user.username = patch.username;
    user.usernameLower = lower;
  }

  if (patch.avatar !== undefined) {
    if (!isValidAvatarId(patch.avatar)) {
      throw ApiError.badRequest('Invalid avatar', [{ field: 'avatar', message: 'Unknown avatar id' }]);
    }
    user.avatar = patch.avatar;
  }

  if (patch.bio !== undefined) user.bio = patch.bio;

  await user.save();
  return user.toSelfJSON();
}

export async function getPublicProfile(username: string) {
  const user = await User.findOne({ usernameLower: username.toLowerCase() });
  if (!user || !user.isActive) throw ApiError.notFound('Player not found');

  const recentScores = await Score.find({ userId: user._id, flagged: false })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('gameId', 'title slug')
    .lean();

  return {
    ...user.toPublicJSON(),
    recentActivity: recentScores.map((s) => ({
      game: (s.gameId as unknown as { title?: string })?.title ?? 'Unknown',
      score: s.score,
      playedAt: s.createdAt,
    })),
  };
}

export async function getSelfAchievements(userId: string) {
  const unlocked = await UserAchievement.find({ userId })
    .sort({ unlockedAt: -1 })
    .populate('achievementId')
    .lean();
  return unlocked
    .filter((u) => u.achievementId)
    .map((u) => {
      const a = u.achievementId as unknown as {
        _id: unknown;
        key: string;
        title: string;
        description: string;
        icon: string;
      };
      return {
        id: String(a._id),
        key: a.key,
        title: a.title,
        description: a.description,
        icon: a.icon,
        unlockedAt: u.unlockedAt,
      };
    });
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function adminListUsers(q: ListQuery) {
  const filter: Record<string, unknown> = {};
  if (q.search) {
    filter.$or = [
      { username: { $regex: q.search, $options: 'i' } },
      { email: { $regex: q.search, $options: 'i' } },
    ];
  }
  const status = q.status?.toLowerCase();
  if (status === 'active') filter.isActive = true;
  if (status === 'suspended') filter.isActive = false;
  if (status === 'verified') filter.isVerified = true;
  if (status === 'unverified') filter.isVerified = false;

  const roles = (q as ListQuery & { role?: string }).role;
  if (roles) {
    const list = String(roles)
      .split(',')
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);
    if (list.length) filter.role = { $in: list };
  }

  const sort = buildSort(q.sort, { createdAt: -1 });
  const [docs, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    User.countDocuments(filter),
  ]);
  return buildPaginated(
    docs.map((d) => d.toAdminJSON()),
    total,
    q.page,
    q.limit,
  );
}

export async function adminGetUser(id: string) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return user.toAdminJSON();
}

export async function adminUpdateUser(
  id: string,
  patch: { bio?: string; avatar?: string; isVerified?: boolean; username?: string },
) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  if (patch.username && patch.username !== user.username) {
    const lower = patch.username.toLowerCase();
    if (await User.exists({ usernameLower: lower, _id: { $ne: user._id } })) {
      throw ApiError.conflict('Username already taken');
    }
    user.username = patch.username;
    user.usernameLower = lower;
  }
  if (patch.bio !== undefined) user.bio = patch.bio;
  if (patch.avatar !== undefined) user.avatar = patch.avatar;
  if (patch.isVerified !== undefined) user.isVerified = patch.isVerified;
  await user.save();
  return user.toAdminJSON();
}

export async function adminSetActive(id: string, isActive: boolean) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  user.isActive = isActive;
  if (!isActive) user.tokenVersion += 1; // kill sessions on suspend
  await user.save();
  return user.toAdminJSON();
}

export async function adminSetRole(id: string, role: string) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  user.role = role as never;
  user.tokenVersion += 1;
  await user.save();
  return user.toAdminJSON();
}

export async function adminDeleteUser(id: string) {
  const res = await User.findByIdAndDelete(id);
  if (!res) throw ApiError.notFound('User not found');
  await Promise.all([
    Score.deleteMany({ userId: id }),
    UserAchievement.deleteMany({ userId: id }),
  ]);
  return true;
}
