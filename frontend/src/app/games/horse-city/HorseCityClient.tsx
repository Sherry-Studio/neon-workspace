"use client";

import dynamic from "next/dynamic";

// Three.js / R3F / GLB assets load only when this route is entered.
const HorseCity = dynamic(() => import("@/components/games/horse-city/HorseCity"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0e1116]">
      <p className="text-[10px] uppercase tracking-[0.5em] text-white/40">Loading HOOFBEAT…</p>
    </div>
  ),
});

export default function HorseCityClient() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0e1116]">
      <HorseCity />
    </div>
  );
}
