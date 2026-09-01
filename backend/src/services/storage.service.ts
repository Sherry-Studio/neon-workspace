import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

export interface UploadResult {
  url: string;
  provider: string;
  key: string;
}

/**
 * Stores an uploaded image buffer with the configured provider and returns its
 * public URL. `local` writes to ./uploads (dev / single persistent host only);
 * `cloudinary` streams the buffer to Cloudinary (works on serverless).
 */
export async function storeImageBuffer(
  file: { buffer: Buffer; mimetype: string; originalname: string },
  folder: string,
): Promise<UploadResult> {
  const ext =
    ({
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/avif': '.avif',
    } as Record<string, string>)[file.mimetype] ?? path.extname(file.originalname) ?? '';

  if (env.STORAGE_PROVIDER === 'cloudinary') {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new ApiError(501, 'Image uploads are not configured (missing Cloudinary credentials)');
    }
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: `neon-arcade/${folder}`, resource_type: 'image' },
          (err, res) => (err || !res ? reject(err ?? new Error('upload failed')) : resolve(res)),
        )
        .end(file.buffer);
    });
    return { url: result.secure_url, key: result.public_id, provider: 'cloudinary' };
  }

  if (env.STORAGE_PROVIDER === 's3') {
    throw new ApiError(501, 'S3 uploads are not implemented — use STORAGE_PROVIDER=cloudinary');
  }

  // local
  const dir = path.resolve(process.cwd(), 'uploads', folder);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    throw new ApiError(
      501,
      'Local uploads require a writable filesystem — set STORAGE_PROVIDER=cloudinary in production',
    );
  }
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  fs.writeFileSync(path.join(dir, name), file.buffer);
  const base = env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, '');
  return { url: `${base}/${folder}/${name}`, key: `${folder}/${name}`, provider: 'local' };
}

export interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
  fields?: Record<string, string>;
  provider: string;
  expiresIn: number;
}

/**
 * Storage abstraction. Images (game thumbnails/banners, blog covers, avatars)
 * are never stored in MongoDB — only their public URLs are. The admin panel
 * requests a signed upload target here, uploads the binary directly to the
 * provider, then saves the returned `publicUrl` on the resource.
 *
 * Providers: `local` (dev), `cloudinary`, `s3`. Wire the real SDK calls where
 * indicated; the interface stays identical so callers never change.
 */
export function getSignedUpload(params: {
  folder: string;
  filename: string;
  contentType: string;
}): SignedUpload {
  const key = `${params.folder}/${Date.now()}-${params.filename}`.replace(/\s+/g, '_');

  switch (env.STORAGE_PROVIDER) {
    case 'cloudinary':
      // return cloudinary.utils.api_sign_request(...) based payload
      logger.warn('Cloudinary signing not implemented — returning placeholder');
      return {
        provider: 'cloudinary',
        uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
        publicUrl: `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/${key}`,
        expiresIn: 600,
      };
    case 's3':
      // return await createPresignedPost(s3Client, { Bucket, Key, ... })
      logger.warn('S3 presign not implemented — returning placeholder');
      return {
        provider: 's3',
        uploadUrl: `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/`,
        publicUrl: `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`,
        fields: { key },
        expiresIn: 600,
      };
    case 'local':
    default:
      return {
        provider: 'local',
        uploadUrl: `${env.STORAGE_PUBLIC_BASE_URL}/direct`,
        publicUrl: `${env.STORAGE_PUBLIC_BASE_URL}/${key}`,
        fields: { key },
        expiresIn: 600,
      };
  }
}
