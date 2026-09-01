import { Blog } from '../models/Blog';
import { ApiError } from '../utils/ApiError';
import { slugify, uniqueSlug } from '../utils/slugify';
import { buildPaginated, buildSort } from '../utils/pagination';
import { BlogStatus, type ListQuery } from '../types';

const slugTaken = (slug: string, exceptId?: string) =>
  Blog.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).then(Boolean);

export async function listPublicPosts(q: ListQuery) {
  const filter: Record<string, unknown> = { status: BlogStatus.PUBLISHED };
  if (q.category) filter.category = q.category;
  if (q.search) filter.$text = { $search: q.search };

  const [docs, total] = await Promise.all([
    Blog.find(filter)
      .sort(buildSort(q.sort, { publishedAt: -1 }))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Blog.countDocuments(filter),
  ]);
  return buildPaginated(docs.map((d) => d.toPublicJSON()), total, q.page, q.limit);
}

export async function getPublicPost(slug: string, opts: { countView?: boolean } = {}) {
  const post = await Blog.findOne({ slug: slug.toLowerCase(), status: BlogStatus.PUBLISHED });
  if (!post) throw ApiError.notFound('Post not found');
  if (opts.countView) {
    post.views += 1;
    await post.save();
  }
  return post.toPublicJSON();
}

// ── Admin ──────────────────────────────────────────────────────────────────

export async function adminListPosts(q: ListQuery) {
  const filter: Record<string, unknown> = {};
  if (q.status) filter.status = q.status.toUpperCase();
  if (q.category) filter.category = q.category;
  if (q.search) filter.title = { $regex: q.search, $options: 'i' };
  const [docs, total] = await Promise.all([
    Blog.find(filter)
      .sort(buildSort(q.sort, { createdAt: -1 }))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Blog.countDocuments(filter),
  ]);
  return buildPaginated(docs.map((d) => d.toPublicJSON()), total, q.page, q.limit);
}

export async function adminGetPost(id: string) {
  const post = await Blog.findById(id);
  if (!post) throw ApiError.notFound('Post not found');
  return post.toPublicJSON();
}

export async function createPost(input: Record<string, unknown>, author: string, authorName: string) {
  const title = String(input.title);
  const slug = await uniqueSlug(String(input.slug || title), (c) => slugTaken(c));
  const status = (input.status as BlogStatus) ?? BlogStatus.DRAFT;
  const post = await Blog.create({
    ...input,
    title,
    slug,
    author,
    authorName: (input.authorName as string) || authorName,
    publishedAt: status === BlogStatus.PUBLISHED ? new Date() : undefined,
  });
  return post.toPublicJSON();
}

export async function updatePost(id: string, patch: Record<string, unknown>) {
  const post = await Blog.findById(id);
  if (!post) throw ApiError.notFound('Post not found');
  if (patch.slug && slugify(String(patch.slug)) !== post.slug) {
    post.slug = await uniqueSlug(String(patch.slug), (c) => slugTaken(c, id));
    delete patch.slug;
  }
  if (patch.status === BlogStatus.PUBLISHED && !post.publishedAt) post.publishedAt = new Date();
  Object.assign(post, patch);
  await post.save();
  return post.toPublicJSON();
}

export async function setPublished(id: string, published: boolean) {
  const post = await Blog.findById(id);
  if (!post) throw ApiError.notFound('Post not found');
  post.status = published ? BlogStatus.PUBLISHED : BlogStatus.DRAFT;
  if (published && !post.publishedAt) post.publishedAt = new Date();
  await post.save();
  return post.toPublicJSON();
}

export async function deletePost(id: string) {
  const post = await Blog.findByIdAndDelete(id);
  if (!post) throw ApiError.notFound('Post not found');
  return true;
}
