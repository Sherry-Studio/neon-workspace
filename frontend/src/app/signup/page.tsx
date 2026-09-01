"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { AVATARS, DEFAULT_AVATAR_ID } from "@/lib/avatars";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR_ID);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, avatar }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.error ||
            (res.status === 409
              ? "That username is already taken."
              : "Could not create your account."),
        );
        return;
      }

      setSuccess("Account created! Signing you in…");
      const result = await signIn("credentials", {
        identifier: username.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        // Account exists but auto sign-in failed — send them to login.
        router.push("/login");
      } else {
        router.push("/profile");
        router.refresh();
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(50% 40% at 50% 24%, rgba(124,58,237,0.12), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            NeonArcade
          </span>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-white md:text-5xl">
            CREATE PROFILE
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Choose a name, set a password, pick your avatar.
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400"
          >
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 border border-accent-green/30 bg-accent-green/5 px-4 py-3 text-sm text-accent-green"
          >
            <CheckCircle size={16} className="shrink-0" />
            {success}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="w-full border border-border bg-surface-elevated px-4 py-3.5 text-white placeholder-text-muted transition-colors duration-200 focus:border-white/60 focus:outline-none"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-border bg-surface-elevated px-4 py-3.5 text-white placeholder-text-muted transition-colors duration-200 focus:border-white/60 focus:outline-none"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-border bg-surface-elevated px-4 py-3.5 text-white placeholder-text-muted transition-colors duration-200 focus:border-white/60 focus:outline-none"
              placeholder="Confirm your password"
            />
          </div>

          {/* Avatar picker */}
          <div>
            <label className="mb-3 block text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
              Choose your avatar
            </label>
            <div className="grid grid-cols-6 gap-3">
              {AVATARS.map((a) => {
                const active = avatar === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAvatar(a.id)}
                    title={a.label}
                    aria-pressed={active}
                    className="flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-105"
                  >
                    <Avatar
                      avatarId={a.id}
                      size={44}
                      className={
                        active
                          ? "ring-2 ring-white ring-offset-2 ring-offset-surface"
                          : "opacity-60 hover:opacity-100"
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white py-4 text-sm font-medium uppercase tracking-[0.2em] text-black transition-colors duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-sm text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-white underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
