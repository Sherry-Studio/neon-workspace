"use client";

import dynamic from "next/dynamic";

// The whole experience (Three.js, R3F, GLB assets) loads only when this route is
// entered — it is never part of the homepage / other-route bundles.
const NeonOrbit = dynamic(() => import("@/components/games/neon-void/NeonVoid"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black">
      <p className="text-[10px] uppercase tracking-[0.5em] text-white/40">Loading NEON ORBIT…</p>
    </div>
  ),
});

export default function NeonVoidClient() {
  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <NeonOrbit />
    </div>
  );
}
