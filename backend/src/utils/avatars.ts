/**
 * Preset avatar ids — mirrors src/lib/avatars.ts in the Sherry-Games-Website
 * frontend. Avatars are gradient + icon presets (no uploads), so the backend
 * only needs to validate the id.
 */
export const AVATAR_IDS = [
  'nebula',
  'circuit',
  'venom',
  'ember',
  'phantom',
  'apex',
  'volt',
  'striker',
  'mecha',
  'nova',
  'rush',
  'arcade',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const DEFAULT_AVATAR_ID: AvatarId = 'nebula';

export function isValidAvatarId(id: string): id is AvatarId {
  return (AVATAR_IDS as readonly string[]).includes(id);
}
