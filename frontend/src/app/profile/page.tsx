"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Pencil, X, Gamepad2, Trophy, Star } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { AVATARS, DEFAULT_AVATAR_ID, getAvatar } from "@/lib/avatars";

const stats = [
  { icon: Gamepad2, label: "Games Played", value: "42" },
  { icon: Trophy, label: "High Score", value: "98,750" },
  { icon: Star, label: "Global Rank", value: "#7" },
];

const activity = [
  { game: "Cyber Runner", score: "12,500", time: "2 hours ago" },
  { game: "Neon Drift", score: "8,700", time: "5 hours ago" },
  { game: "Grid Wars", score: "15,200", time: "1 day ago" },
];

export default function ProfilePage() {
  const { status, update } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR_ID);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d?.username) setUsername(d.username);
        if (d?.avatar) setAvatar(d.avatar);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  }

  async function selectAvatar(id: string) {
    if (id === avatar) {
      setPickerOpen(false);
      return;
    }
    const previous = avatar;
    setAvatar(id);
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: id }),
      });
      if (!res.ok) throw new Error();
      await update({ avatar: id });
      setPickerOpen(false);
      flash("Avatar updated");
    } catch {
      setAvatar(previous);
      setError("Could not update avatar. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveName() {
    const next = nameDraft.trim();
    if (next === username) {
      setEditingName(false);
      return;
    }
    if (next.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update username");
        return;
      }
      setUsername(data.username);
      await update({ name: data.username });
      setEditingName(false);
      flash("Username updated");
    } catch {
      setError("Could not update username");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-white" />
      </div>
    );
  }

  if (status !== "authenticated") return null;

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-28 sm:px-10">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 border border-accent-green/30 bg-surface-elevated px-4 py-2.5 text-sm text-accent-green shadow-lg"
          >
            <Check size={15} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {/* Gradient halo */}
          <div
            className="absolute -inset-2 rounded-full opacity-40 blur-xl"
            style={{ background: getAvatar(avatar).gradient }}
          />
          <Avatar avatarId={avatar} size={120} className="relative ring-1 ring-white/10" />
          <button
            onClick={() => setPickerOpen((v) => !v)}
            aria-label="Change avatar"
            className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-elevated text-text-secondary transition-colors hover:text-white"
          >
            {pickerOpen ? <X size={15} /> : <Pencil size={14} />}
          </button>
        </div>

        {/* Username */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setError("");
                  }
                }}
                className="border-b border-border bg-transparent px-1 py-1 text-center text-2xl font-bold text-white focus:border-white focus:outline-none"
              />
              <button
                onClick={saveName}
                disabled={saving}
                className="text-accent-green transition-opacity hover:opacity-80 disabled:opacity-40"
                aria-label="Save username"
              >
                <Check size={20} />
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setError("");
                }}
                className="text-text-muted transition-colors hover:text-white"
                aria-label="Cancel"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-white">
                {username}
              </h1>
              <button
                onClick={() => {
                  setEditingName(true);
                  setNameDraft(username);
                  setError("");
                }}
                className="text-text-muted transition-colors hover:text-white"
                aria-label="Edit username"
              >
                <Pencil size={16} />
              </button>
            </>
          )}
        </div>

        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-text-muted">
          {getAvatar(avatar).label} · NeonArcade Member
        </p>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>

      {/* ── Avatar picker ── */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-10 border border-border p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.25em] text-text-muted">
                  Choose your avatar
                </span>
                {saving && (
                  <span className="text-[10px] uppercase tracking-widest text-text-muted">
                    Saving…
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-5 sm:grid-cols-6">
                {AVATARS.map((a) => {
                  const active = avatar === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => selectAvatar(a.id)}
                      disabled={saving}
                      title={a.label}
                      className="flex flex-col items-center gap-2 disabled:cursor-not-allowed"
                    >
                      <Avatar
                        avatarId={a.id}
                        size={56}
                        className={`transition-all duration-200 ${
                          active
                            ? "ring-2 ring-white ring-offset-2 ring-offset-surface"
                            : "opacity-60 hover:scale-105 hover:opacity-100"
                        }`}
                      />
                      <span
                        className={`text-[10px] uppercase tracking-wide ${
                          active ? "text-white" : "text-text-muted"
                        }`}
                      >
                        {a.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats ── */}
      <div className="mt-16 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center bg-surface px-6 py-10 text-center">
            <stat.icon size={22} className="mb-4 text-text-secondary" strokeWidth={1.5} />
            <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-white">
              {stat.value}
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-text-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Recent activity ── */}
      <div className="mt-8 border border-border p-8">
        <h2 className="mb-6 text-xs font-medium uppercase tracking-[0.25em] text-text-muted">
          Recent Activity
        </h2>
        <div className="divide-y divide-border">
          {activity.map((item) => (
            <div key={item.game} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <span className="font-medium text-white">{item.game}</span>
              <div className="flex items-center gap-6">
                <span className="font-[family-name:var(--font-heading)] text-sm text-accent-blue">
                  {item.score}
                </span>
                <span className="text-xs text-text-muted">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
