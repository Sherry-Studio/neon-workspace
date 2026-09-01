import { env } from '../config/env';
import { logger } from '../config/logger';

export interface UploadResult {
  url: string;
  provider: string;
  key: string;
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
