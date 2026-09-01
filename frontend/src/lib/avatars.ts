export interface AvatarDef {
  id: string;
  label: string;
  /** Key into the icon map in components/ui/Avatar.tsx */
  icon: string;
  /** CSS gradient rendered as the avatar background */
  gradient: string;
}

/**
 * Preset avatars. No image uploads — each avatar is a signature gradient + icon,
 * so they render instantly, weigh nothing, and stay on-brand with the palette.
 */
export const AVATARS: AvatarDef[] = [
  { id: "nebula", label: "Nebula", icon: "sparkles", gradient: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)" },
  { id: "circuit", label: "Circuit", icon: "cpu", gradient: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)" },
  { id: "venom", label: "Venom", icon: "skull", gradient: "linear-gradient(135deg, #84cc16 0%, #059669 100%)" },
  { id: "ember", label: "Ember", icon: "flame", gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)" },
  { id: "phantom", label: "Phantom", icon: "ghost", gradient: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)" },
  { id: "apex", label: "Apex", icon: "crown", gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)" },
  { id: "volt", label: "Volt", icon: "zap", gradient: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)" },
  { id: "striker", label: "Striker", icon: "swords", gradient: "linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)" },
  { id: "mecha", label: "Mecha", icon: "bot", gradient: "linear-gradient(135deg, #64748b 0%, #334155 100%)" },
  { id: "nova", label: "Nova", icon: "star", gradient: "linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)" },
  { id: "rush", label: "Rush", icon: "rocket", gradient: "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)" },
  { id: "arcade", label: "Arcade", icon: "gamepad2", gradient: "linear-gradient(135deg, #84cc16 0%, #22c55e 100%)" },
];

export const DEFAULT_AVATAR_ID = "nebula";

export function isValidAvatarId(id: string): boolean {
  return AVATARS.some((a) => a.id === id);
}

export function getAvatar(id?: string | null): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
