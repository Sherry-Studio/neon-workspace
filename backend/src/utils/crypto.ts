import crypto from 'crypto';

/** Returns a raw token (send to user) + its sha256 hash (store in DB). */
export function createSecureToken(bytes = 32): { raw: string; hash: string } {
  const raw = crypto.randomBytes(bytes).toString('hex');
  const hash = hashToken(raw);
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
