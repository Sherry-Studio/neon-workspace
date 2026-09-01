"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else {
        router.push("/profile");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(50% 40% at 50% 28%, rgba(37,99,235,0.10), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-10">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            NeonArcade
          </span>
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-white md:text-5xl">
            SIGN IN
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Welcome back. Pick up where you left off.
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-border bg-surface-elevated px-4 py-3.5 text-white placeholder-text-muted transition-colors duration-200 focus:border-white/60 focus:outline-none"
              placeholder="Enter your username"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-border bg-surface-elevated px-4 py-3.5 text-white placeholder-text-muted transition-colors duration-200 focus:border-white/60 focus:outline-none"
              placeholder="Enter your password"
            />
          </motion.div>

          <motion.button
            type="submit"
            disabled={loading}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="w-full bg-white py-4 text-sm font-medium uppercase tracking-[0.2em] text-black transition-colors duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </motion.button>
        </form>

        <p className="mt-8 text-sm text-text-secondary">
          New to NeonArcade?{" "}
          <Link href="/signup" className="text-white underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
