import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { getSignedUpload } from '../services/storage.service';
import { env } from '../config/env';

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

/**
 * Direct multipart upload handler (used when STORAGE_PROVIDER=local). The
 * `uploadImage` multer middleware has already written the file to disk.
 */
export const uploadDirect = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) {
    res.status(400).json({ success: false, message: 'No file received', errors: [] });
    return;
  }
  const folder = ['games', 'banners', 'blog', 'avatars'].includes(String(req.query.folder))
    ? String(req.query.folder)
    : 'games';
  const base = env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, '');
  const url = `${base}/${folder}/${file.filename}`;
  sendSuccess(res, { url, provider: 'local', key: `${folder}/${file.filename}` }, 'Uploaded', 201);
});
