"use client";

import { HudState } from "../systems/state";

export function HUD({ hud }: { hud: HudState }) {
  const riding = hud.mode === "riding";
  const showMountPrompt = hud.mode === "onfoot" && hud.promptVisible;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 font-mono text-white">
      {/* interaction prompt */}
      {(showMountPrompt || riding) && (
        <div className="absolute left-1/2 top-[62%] -translate-x-1/2 rounded-md bg-black/55 px-4 py-2 text-sm tracking-wide backdrop-blur-sm">
          {riding ? (
            <>Press <b>E</b> to dismount</>
          ) : (
            <>🐎 Press <b>E</b> to mount</>
          )}
        </div>
      )}

      {/* horse HUD */}
      {riding && (
        <div className="absolute bottom-6 left-6 w-44 rounded-lg bg-black/45 p-3 backdrop-blur-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/45">Horse</span>
            <span className="text-[10px] tabular-nums text-white/45">{hud.horseKmh} km/h</span>
          </div>
          <div className="mt-1 text-lg font-semibold uppercase tracking-widest">{hud.horseGait}</div>
          <div className="mt-2 text-[9px] uppercase tracking-[0.25em] text-white/40">
            Stamina{!hud.canGallop && " · resting"}
          </div>
          <div className="mt-1 h-[4px] w-full overflow-hidden rounded bg-white/12">
            <div
              className={`h-full transition-[width] duration-200 ${
                hud.canGallop ? "bg-emerald-400/80" : "bg-amber-400/80"
              }`}
              style={{ width: `${hud.stamina}%` }}
            />
          </div>
        </div>
      )}

      {(hud.mode === "mounting" || hud.mode === "dismounting") && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-white/50">
          {hud.mode === "mounting" ? "Mounting…" : "Dismounting…"}
        </div>
      )}

      {hud.debug && (
        <div className="absolute right-4 top-4 rounded bg-black/60 p-2 text-[10px] leading-relaxed text-lime-300">
          DEBUG · F9 toggle<br />T: teleport to horse<br />R: reset horse<br />P: pause
        </div>
      )}
    </div>
  );
}
