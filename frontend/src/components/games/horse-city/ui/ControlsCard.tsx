"use client";

const ROWS: [string, string][] = [
  ["W A S D", "Move"],
  ["Shift", "Run / Gallop"],
  ["Space", "Jump"],
  ["Mouse", "Look around"],
  ["E", "Mount / Dismount"],
  ["P", "Pause"],
];

export function ControlsCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 backdrop-blur-sm">
      <div className="w-[min(90vw,420px)] rounded-2xl border border-white/12 bg-[#12151b]/95 p-8 text-white shadow-2xl">
        <p className="text-[10px] uppercase tracking-[0.5em] text-white/40">Neon Arcade</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">HOOFBEAT</h1>
        <p className="mt-1 text-sm text-white/55">
          Explore the medieval city on foot, find your horse, and ride.
        </p>
        <div className="mt-6 space-y-2">
          {ROWS.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-sm">
              <kbd className="rounded bg-white/10 px-2 py-1 font-mono text-xs tracking-wide">{k}</kbd>
              <span className="text-white/60">{v}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onStart}
          className="mt-7 w-full rounded-lg bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/85"
        >
          Enter the city
        </button>
        <p className="mt-3 text-center text-[10px] text-white/30">Click the scene to capture the mouse · Esc to release</p>
      </div>
    </div>
  );
}
