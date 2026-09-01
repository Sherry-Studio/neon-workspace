"use client";

import { Toaster as Sonner } from "sonner";

/**
 * App-wide toast host, styled to the NEON ARCADE palette. Use via
 * `import { toast } from "sonner"` anywhere in a client component.
 */
export default function Toaster() {
  return (
    <Sonner
      position="top-center"
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-elevated !border !border-border !text-text-primary !rounded-lg !shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]",
          title: "!text-sm !font-medium",
          description: "!text-xs !text-text-secondary",
          success: "!border-accent-green/40",
          error: "!border-red-500/40",
          actionButton: "!bg-accent-cyan !text-black",
        },
      }}
    />
  );
}
