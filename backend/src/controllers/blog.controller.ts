import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';
import * as blogService from '../services/blog.service';
import { recordAudit } from '../services/audit.service';
import { parseListQuery } from '../utils/pagination';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await blogService.listPublicPosts(parseListQuery(req));
  sendPaginated(res, result, 'Posts');
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const post = await blogService.getPublicPost(req.params.slug, { countView: true });
  sendSuccess(res, { post });
});

export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const result = await blogService.adminListPosts(parseListQuery(req));
  sendPaginated(res, result, 'Posts (admin)');
});

export const adminGet = asyncHandler(async (req: Request, res: Response) => {
  const post = await blogService.adminGetPost(req.params.id);
  sendSuccess(res, { post });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const post = await blogService.createPost(req.body, req.user!.id, req.user!.username);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'blog.create',
    targetType: 'Blog',
    targetId: String(post.id),
    ip: req.ip,
  });
  sendSuccess(res, { post }, 'Post created', 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const post = await blogService.updatePost(req.params.id, req.body);
  sendSuccess(res, { post }, 'Post updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await blogService.deletePost(req.params.id);
  await recordAudit({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    action: 'blog.delete',
    targetType: 'Blog',
    targetId: req.params.id,
    ip: req.ip,
  });
  sendSuccess(res, null, 'Post deleted');
});

export const setPublished = asyncHandler(async (req: Request, res: Response) => {
  const post = await blogService.setPublished(req.params.id, req.body.published);
  sendSuccess(res, { post }, req.body.published ? 'Post published' : 'Post unpublished');
});
