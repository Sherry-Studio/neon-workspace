import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const ALLOWED = new Set(['games', 'banners', 'blog', 'avatars']);
const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const folder = ALLOWED.has(String(req.query.folder)) ? String(req.query.folder) : 'games';
    const dir = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = MIME_EXT[file.mimetype] ?? path.extname(file.originalname) ?? '';
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

/** Single-image upload, max 5 MB, images only. Field name: `file`. */
export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (!MIME_EXT[file.mimetype]) {
      cb(new ApiError(400, 'Only PNG, JPEG, WebP, GIF or AVIF images are allowed'));
      return;
    }
    cb(null, true);
  },
}).single('file');
