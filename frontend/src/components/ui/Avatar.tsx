import {
  Sparkles,
  Cpu,
  Skull,
  Flame,
  Ghost,
  Crown,
  Zap,
  Swords,
  Bot,
  Star,
  Rocket,
  Gamepad2,
} from "lucide-react";
import { getAvatar } from "@/lib/avatars";

const ICONS = {
  sparkles: Sparkles,
  cpu: Cpu,
  skull: Skull,
  flame: Flame,
  ghost: Ghost,
  crown: Crown,
  zap: Zap,
  swords: Swords,
  bot: Bot,
  star: Star,
  rocket: Rocket,
  gamepad2: Gamepad2,
} as const;

interface AvatarProps {
  avatarId?: string | null;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function Avatar({
  avatarId,
  size = 56,
  className = "",
  strokeWidth = 1.75,
}: AvatarProps) {
  const def = getAvatar(avatarId);
  const Icon = ICONS[def.icon as keyof typeof ICONS] ?? Sparkles;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size, background: def.gradient }}
      aria-label={def.label}
    >
      <Icon size={Math.round(size * 0.44)} className="text-white" strokeWidth={strokeWidth} />
    </span>
  );
}
