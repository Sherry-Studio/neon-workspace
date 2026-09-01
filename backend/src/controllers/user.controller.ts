import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as userService from '../services/user.service';
import * as achievementService from '../services/achievement.service';

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getSelf(req.user!.id);
  sendSuccess(res, { user });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateSelf(req.user!.id, req.body);
  sendSuccess(res, { user }, 'Profile updated');
});

export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.getPublicProfile(req.params.username);
  sendSuccess(res, { profile });
});

export const getMyAchievements = asyncHandler(async (req: Request, res: Response) => {
  const achievements = await userService.getSelfAchievements(req.user!.id);
  sendSuccess(res, { achievements });
});

export const listAllAchievements = asyncHandler(async (_req: Request, res: Response) => {
  const achievements = await achievementService.listAchievements();
  sendSuccess(res, { achievements });
});
