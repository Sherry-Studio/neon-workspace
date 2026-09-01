import { Game, type IGame } from '../models/Game';
import { ApiError } from '../utils/ApiError';
import { slugify, uniqueSlug } from '../utils/slugify';
import { buildPaginated, buildSort } from '../utils/pagination';
import { GameStatus, type ListQuery } from '../types';

const slugTaken = (slug: string, exceptId?: string) =>
  Game.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).then(Boolean);

export async function listPublicGames(q: ListQuery & { featured?: boolean; category?: string }) {
  const filter: Record<string, unknown> = { status: GameStatus.PUBLISHED };
  if (q.featured) filter.featured = true;
  if (q.category) filter.category = q.category.toUpperCase();
  if (q.search) filter.$text = { $search: q.search };

  const sort = buildSort(q.sort, q.search ? { score: { $meta: 'textScore' } as never } : { featured: -1, plays: -1 });
  const [docs, total] = await Promise.all([
    Game.find(filter)
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Game.countDocuments(filter),
  ]);
  return buildPaginated(docs.map((d) => d.toPublicJSON()), total, q.page, q.limit);
}

export async function getPublicGameBySlug(slug: string) {
  const game = await Game.findOne({ slug: slug.toLowerCase(), status: GameStatus.PUBLISHED });
  if (!game) throw ApiError.notFound('Game not found');
  return game.toPublicJSON();
}

export async function getFeaturedGames(limit = 6) {
  const docs = await Game.find({ status: GameStatus.PUBLISHED, featured: true })
    .sort({ plays: -1 })
    .limit(limit);
  return docs.map((d) => d.toPublicJSON());
}

// ── Admin / management ─────────────────────────────────────────────────────

export async function adminListGames(q: ListQuery) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status.toUpperCase();
  if (q.category) filter.category = q.category.toUpperCase();
  if (q.search) filter.title = { $regex: q.search, $options: 'i' };

  const [docs, total] = await Promise.all([
    Game.find(filter)
      .sort(buildSort(q.sort, { createdAt: -1 }))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Game.countDocuments(filter),
  ]);
  return buildPaginated(docs.map((d) => d.toPublicJSON()), total, q.page, q.limit);
}

export async function adminGetGame(id: string): Promise<IGame> {
  const game = await Game.findById(id);
  if (!game) throw ApiError.notFound('Game not found');
  return game;
}

export async function createGame(input: Record<string, unknown>, createdBy: string) {
  const title = String(input.title);
  const slug = await uniqueSlug(String(input.slug || title), (c) => slugTaken(c));
  const game = await Game.create({ ...input, title, slug, createdBy });
  return game.toPublicJSON();
}

export async function updateGame(id: string, patch: Record<string, unknown>) {
  const game = await Game.findById(id);
  if (!game) throw ApiError.notFound('Game not found');

  if (patch.slug && slugify(String(patch.slug)) !== game.slug) {
    game.slug = await uniqueSlug(String(patch.slug), (c) => slugTaken(c, id));
    delete patch.slug;
  }
  Object.assign(game, patch);
  await game.save();
  return game.toPublicJSON();
}

export async function setGameStatus(id: string, status: GameStatus) {
  const game = await Game.findByIdAndUpdate(id, { status }, { new: true });
  if (!game) throw ApiError.notFound('Game not found');
  return game.toPublicJSON();
}

export async function setGameFeatured(id: string, featured: boolean) {
  const game = await Game.findByIdAndUpdate(id, { featured }, { new: true });
  if (!game) throw ApiError.notFound('Game not found');
  return game.toPublicJSON();
}

export async function deleteGame(id: string) {
  const game = await Game.findByIdAndDelete(id);
  if (!game) throw ApiError.notFound('Game not found');
  return true;
}

export async function incrementPlays(id: string) {
  await Game.updateOne({ _id: id }, { $inc: { plays: 1 } });
}
