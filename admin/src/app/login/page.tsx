"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { authApi } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui/primitives";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "forbidden"
      ? "That account is not allowed in the admin console."
      : null,
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.login(email, password);
      await qc.invalidateQueries({ queryKey: ["session"] });
      router.replace(params.get("next") || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="panel w-full max-w-sm p-7"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-cyan-glow/40 bg-cyan-glow/10 text-sm font-black text-cyan-soft">
            NA
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-widest text-white">NEONARCADE</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">
              Admin Console
            </p>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-white">Sign in</h1>
        <p className="mt-1 text-xs text-slate-500">
          Restricted to <span className="text-slate-400">ADMIN</span> and{" "}
          <span className="text-slate-400">SUPER_ADMIN</span> accounts.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@neonarcade.dev"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full"
          >
            <ShieldCheck className="h-4 w-4" />
            Sign in
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
