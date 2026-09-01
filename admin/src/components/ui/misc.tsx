"use client";

import { motion } from "framer-motion";
import { cn, initials } from "@/lib/utils";
import type { BlogStatus, GameStatus, Role, UserStatus } from "@/lib/types";
import { Badge } from "./primitives";

export { Badge } from "./primitives";

export function Avatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="grid shrink-0 place-items-center rounded-full border border-cyan-glow/30 bg-gradient-to-br from-cyan-glow/20 to-violet-glow/20 font-semibold text-cyan-soft"
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  index = 0,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  delta?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 220, damping: 26 }}
      className="panel relative overflow-hidden p-5"
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-cyan-glow/5 blur-2xl" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-cyan-glow/70" />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-white">{value}</p>
      {delta && <p className="mt-1 text-xs text-slate-500">{delta}</p>}
    </motion.div>
  );
}

/* Status badges shared across pages */

const USER_STATUS_TONE: Record<UserStatus, Parameters<typeof Badge>[0]["tone"]> = {
  ACTIVE: "green",
  SUSPENDED: "rose",
  PENDING: "amber",
};
export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={USER_STATUS_TONE[status]}>{status}</Badge>;
}

const ROLE_TONE: Record<Role, Parameters<typeof Badge>[0]["tone"]> = {
  USER: "slate",
  ADMIN: "cyan",
  SUPER_ADMIN: "magenta",
};
export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={ROLE_TONE[role]}>{role.replace("_", " ")}</Badge>;
}

const GAME_STATUS_TONE: Record<GameStatus, Parameters<typeof Badge>[0]["tone"]> = {
  DRAFT: "amber",
  PUBLISHED: "green",
  ARCHIVED: "slate",
};
export function GameStatusBadge({ status }: { status: GameStatus }) {
  return <Badge tone={GAME_STATUS_TONE[status]}>{status}</Badge>;
}

const BLOG_STATUS_TONE: Record<BlogStatus, Parameters<typeof Badge>[0]["tone"]> = {
  DRAFT: "amber",
  PUBLISHED: "green",
  ARCHIVED: "slate",
};
export function BlogStatusBadge({ status }: { status: BlogStatus }) {
  return <Badge tone={BLOG_STATUS_TONE[status]}>{status}</Badge>;
}

export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {children}
    </div>
  );
}
