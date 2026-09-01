"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { useSession } from "@/hooks/useSession";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useSession();

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(user?.permissions, item.permission),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-line px-5">
        <span className="grid h-8 w-8 place-items-center rounded-md border border-cyan-glow/40 bg-cyan-glow/10 text-sm font-black text-cyan-soft">
          NA
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-widest text-white">NEONARCADE</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Admin Console
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-cyan-glow/10 text-cyan-soft"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-cyan-glow"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-4 text-[10px] text-slate-600">
        {process.env.NEXT_PUBLIC_ENV_LABEL
          ? `env: ${process.env.NEXT_PUBLIC_ENV_LABEL}`
          : null}
      </div>
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-ink-900/70 backdrop-blur lg:block">
        <div className="fixed inset-y-0 w-64">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute inset-y-0 left-0 w-64 border-r border-line bg-ink-900"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-4 z-10 rounded-md p-1 text-slate-500 hover:bg-white/5"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={onClose} />
          </motion.aside>
        </div>
      )}
    </>
  );
}
