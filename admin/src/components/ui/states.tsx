"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "./primitives";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-cyan-glow", className)} />;
}

export function LoadingRow({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Spinner />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-9 flex-1", c === 0 && "max-w-[3rem]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
  icon: Icon = Inbox,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-ink-800">
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-slate-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl border border-rose-500/30 bg-rose-500/10">
        <AlertTriangle className="h-5 w-5 text-rose-400" />
      </div>
      <p className="text-sm font-medium text-slate-300">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Convenience wrapper: renders the right state for a react-query-ish result.
 */
export function QueryBoundary({
  isLoading,
  isError,
  errorMessage,
  isEmpty,
  onRetry,
  emptyProps,
  skeleton,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  onRetry?: () => void;
  emptyProps?: Parameters<typeof EmptyState>[0];
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) return <>{skeleton ?? <LoadingRow />}</>;
  if (isError) return <ErrorState message={errorMessage} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState {...emptyProps} />;
  return <>{children}</>;
}
