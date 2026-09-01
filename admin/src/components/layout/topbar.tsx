"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu } from "lucide-react";
import { authApi, notificationsApi } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Avatar, RoleBadge } from "@/components/ui/misc";
import { GlobalSearch } from "./global-search";
import { relativeTime } from "@/lib/utils";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const { data: notifs } = useQuery({
    queryKey: ["topbar-notifications"],
    queryFn: () => notificationsApi.list({ pageSize: 5 }),
  });

  const logout = async () => {
    await authApi.logout();
    qc.clear();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-ink-900/80 px-4 backdrop-blur">
      <button
        onClick={onMenu}
        className="rounded-md p-2 text-slate-400 hover:bg-white/5 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden flex-1 sm:block">
        <GlobalSearch />
      </div>
      <div className="flex-1 sm:hidden" />

      <div className="relative">
        <button
          onClick={() => setBellOpen((v) => !v)}
          className="relative rounded-md p-2 text-slate-400 hover:bg-white/5"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {!!notifs?.data.some((n) => !n.read) && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-glow glow-cyan" />
          )}
        </button>
        {bellOpen && (
          <div className="panel absolute right-0 z-50 mt-2 w-80 p-2 shadow-2xl">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Recent notifications
            </p>
            {notifs?.data.length ? (
              notifs.data.map((n) => (
                <div key={n.id} className="rounded-md px-2 py-2 hover:bg-white/5">
                  <p className="text-xs font-medium text-slate-200">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-600">
                    {n.recipientLabel} · {relativeTime(n.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-2 py-4 text-center text-xs text-slate-500">
                Nothing yet.
              </p>
            )}
            <Link
              href="/notifications"
              onClick={() => setBellOpen(false)}
              className="mt-1 block rounded-md px-2 py-2 text-center text-xs text-cyan-soft hover:bg-white/5"
            >
              View all
            </Link>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-2 py-1.5 hover:border-line-strong"
        >
          <Avatar name={user?.username ?? "?"} size={26} />
          <span className="hidden text-xs font-medium text-slate-300 sm:block">
            {user?.username}
          </span>
        </button>
        {menuOpen && (
          <div className="panel absolute right-0 z-50 mt-2 w-56 p-2 shadow-2xl">
            <div className="border-b border-line px-2 pb-2">
              <p className="text-sm font-medium text-slate-200">{user?.username}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
              <div className="mt-1.5">{user && <RoleBadge role={user.role} />}</div>
            </div>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="mt-1 block rounded-md px-2 py-2 text-xs text-slate-300 hover:bg-white/5"
            >
              Settings
            </Link>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
