"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check } from "lucide-react";
import { notificationsService } from "@/services";
import type { NotificationItem } from "@/types/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsService.list({ limit: 8 });
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      /* silent — the bell just shows nothing */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAll() {
    setUnread(0);
    setItems((xs) => xs.map((x) => ({ ...x, isRead: true })));
    try {
      await notificationsService.markAllRead();
    } catch {
      load();
    }
  }

  async function markOne(id: string) {
    setItems((xs) => xs.map((x) => (x._id === id ? { ...x, isRead: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await notificationsService.markRead(id);
    } catch {
      load();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative text-text-secondary transition-colors hover:text-text-primary"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-cyan px-1 text-[9px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong absolute right-0 top-8 z-50 w-80 overflow-hidden rounded-xl border border-border"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-secondary">
                Notifications
              </span>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-accent-cyan hover:opacity-80"
                >
                  <Check size={11} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && items.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-text-muted">Loading…</p>
              ) : items.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-text-muted">
                  You&apos;re all caught up.
                </p>
              ) : (
                items.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => !n.isRead && markOne(n._id)}
                    className={`block w-full border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.03] ${
                      n.isRead ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-cyan" />
                      )}
                      <div className={n.isRead ? "pl-3.5" : ""}>
                        <p className="text-xs font-medium text-white">{n.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
