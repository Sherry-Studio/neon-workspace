import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { getSignedUpload } from '../services/storage.service';

const signSchema = z.object({
  folder: z.enum(['games', 'banners', 'blog', 'avatars']).default('games'),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(3).max(100),
});

export const signUpload = asyncHandler(async (req: Request, res: Response) => {
  const input = signSchema.parse(req.body);
  const signed = getSignedUpload(input);
  sendSuccess(res, signed, 'Signed upload target');
});
