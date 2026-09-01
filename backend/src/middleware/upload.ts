import multer from 'multer';
import { ApiError } from '../utils/ApiError';

export const ALLOWED_UPLOAD_FOLDERS = new Set(['games', 'banners', 'blog', 'avatars']);
export const UPLOAD_MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

/**
 * Single-image upload held in memory (max 5 MB, images only). The controller
 * streams the buffer to the configured storage provider. Field name: `file`.
 * Memory storage keeps this working on read-only filesystems (e.g. serverless).
 */
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!UPLOAD_MIME_EXT[file.mimetype]) {
      cb(new ApiError(400, 'Only PNG, JPEG, WebP, GIF or AVIF images are allowed'));
      return;
    }
    cb(null, true);
  },
}).single('file');
