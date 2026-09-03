"use client";

import { useProgress } from "@react-three/drei";

export function LoadingScreen() {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-[#0e1116] text-white">
      <div className="w-64 text-center">
        <p className="mb-4 text-[10px] uppercase tracking-[0.55em] text-white/50">Loading the city</p>
        <div className="h-[3px] w-full overflow-hidden rounded bg-white/10">
          <div
            className="h-full bg-white/80 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(6, progress).toFixed(0)}%` }}
          />
        </div>
        <p className="mt-3 text-[10px] tabular-nums tracking-widest text-white/40">
          {progress.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
