/* ============================================================
   NEON ORBIT — InputManager
   ------------------------------------------------------------
   Owns every pointer/keyboard listener. Turns messy device
   input into one normalised FlightCommand.

   Steering is a single model in both paths — a "virtual cursor"
   in [-1,1]² that means "desired steering offset from centre":
     • lock  — Pointer Lock on: relative movement builds the
               cursor; it eases back to centre slowly, so you
               can hold a turn and the ship still self-stabilises.
     • stick — no lock (Mac trackpad / Safari / restricted): the
               pointer's position from screen centre IS the cursor.
   Components never touch DOM events — they read getCommand().
   ============================================================ */

import { INPUT } from "../orbit/config";
import type { FlightCommand } from "./types";

export type InputMode = "idle" | "lock" | "stick";

const clamp = (v: number, lo = -1, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

function curve(v: number, expo: number) {
  const s = clamp(v);
  const a = Math.abs(s);
  if (a <= INPUT.deadzone) return 0;
  const n = (a - INPUT.deadzone) / (1 - INPUT.deadzone);
  return Math.sign(s) * Math.pow(n, expo) * INPUT.sensitivity;
}

export class InputManager {
  private el: HTMLElement | null = null;
  mode: InputMode = "idle";
  onMode: ((m: InputMode) => void) | null = null;

  private live = false;
  armed = false; // orchestrator opens the gate once the intro prompt shows

  /** the virtual cursor — the single source of steering, both modes */
  private cx = 0;
  private cy = 0;
  /** raw pointer position, element-normalised -1..1 (stick mode) */
  private px = 0;
  private py = 0;
  private inside = false;

  private keys = new Set<string>();
  private firePrev = false;
  private firePressed = false;
  private lockWatchdog: number | null = null;

  /** QA: forces a constant steering signal (?steer=x,y) */
  debugSteer: [number, number] | null = null;

  attach(el: HTMLElement) {
    this.el = el;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointerleave", this.onPointerLeave);
    el.addEventListener("pointercancel", this.onPointerLeave);
    el.addEventListener("contextmenu", this.prevent);
    el.addEventListener("dragstart", this.prevent);
    el.addEventListener("wheel", this.prevent, { passive: false });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    document.addEventListener("pointerlockchange", this.onLockChange);
    document.addEventListener("pointerlockerror", this.onLockError);
  }

  detach() {
    const el = this.el;
    if (el) {
      el.removeEventListener("pointerdown", this.onPointerDown);
      el.removeEventListener("pointermove", this.onPointerMove);
      el.removeEventListener("pointerup", this.onPointerUp);
      el.removeEventListener("pointerleave", this.onPointerLeave);
      el.removeEventListener("pointercancel", this.onPointerLeave);
      el.removeEventListener("contextmenu", this.prevent);
      el.removeEventListener("dragstart", this.prevent);
      el.removeEventListener("wheel", this.prevent);
    }
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    document.removeEventListener("pointerlockerror", this.onLockError);
    if (this.lockWatchdog) window.clearTimeout(this.lockWatchdog);
    this.el = null;
  }

  /** call from a user gesture — tries Pointer Lock, falls back to the stick */
  requestControl() {
    if (!this.el) return;
    this.resetSteering();
    const canLock = typeof this.el.requestPointerLock === "function" && !this.isCoarse();
    if (!canLock) return this.setMode("stick");
    try {
      const p = this.el.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.then === "function") p.catch(() => this.setMode("stick"));
    } catch {
      return this.setMode("stick");
    }
    if (this.lockWatchdog) window.clearTimeout(this.lockWatchdog);
    this.lockWatchdog = window.setTimeout(() => {
      if (document.pointerLockElement !== this.el) this.setMode("stick");
    }, 300);
  }

  /** the cinematic has handed over — Esc now drops to the stick, never a dead state */
  setLive(v: boolean) {
    this.live = v;
    if (v && this.mode === "idle") this.setMode("stick");
  }

  releaseControl() {
    if (document.pointerLockElement === this.el) document.exitPointerLock();
    this.resetSteering();
    this.setMode(this.live ? "stick" : "idle");
  }

  get active() {
    return this.mode !== "idle";
  }

  /** advance the cursor smoothing; call once per frame before getCommand() */
  tick(dt: number) {
    dt = Math.min(dt, 0.05);
    if (this.mode === "lock") {
      const k = Math.exp(-INPUT.lockRecenterLambda * dt);
      this.cx *= k;
      this.cy *= k;
    } else if (this.mode === "stick") {
      const tx = this.inside ? clamp(this.px / INPUT.stickSpan) : 0;
      const ty = this.inside ? clamp(this.py / INPUT.stickSpan) : 0;
      const s = 1 - Math.exp(-INPUT.stickRecenterLambda * dt);
      this.cx += (tx - this.cx) * s;
      this.cy += (ty - this.cy) * s;
    }
  }

  getCommand(): FlightCommand {
    let sx = 0;
    let sy = 0;
    if (this.debugSteer) {
      sx = curve(this.debugSteer[0], INPUT.expoX);
      sy = curve(this.debugSteer[1], INPUT.expoY);
    } else if (this.mode !== "idle") {
      sx = curve(this.cx, INPUT.expoX);
      sy = curve(this.cy, INPUT.expoY);
    }
    const k = this.keys;
    const throttleAxis =
      (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const yawAxis = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const rollAxis = (k.has("KeyE") ? 1 : 0) - (k.has("KeyQ") ? 1 : 0);
    const boost = k.has("ShiftLeft") || k.has("ShiftRight") ? 1 : 0;
    const firePrimary = this.firePrimary();
    const firePressed = this.firePressed;
    this.firePressed = false;
    return { steerX: sx, steerY: sy, throttleAxis, yawAxis, rollAxis, boost, firePrimary, firePrimaryPressed: firePressed };
  }

  /** where the virtual cursor sits, -1..1 — the flight-aim indicator */
  get cursor() {
    return { x: clamp(this.cx), y: clamp(this.cy) };
  }

  // ---- internals ---------------------------------------------------------
  private firePrimary() {
    return this.keys.has("Space") || this.keys.has("MouseLeft");
  }
  private setMode(m: InputMode) {
    if (this.mode === m) return;
    this.mode = m;
    this.onMode?.(m);
  }
  private resetSteering() {
    this.cx = this.cy = 0;
  }
  private isCoarse() {
    return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  }
  private prevent = (e: Event) => {
    if (this.active) e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button === 0) {
      this.keys.add("MouseLeft");
      if (!this.firePrev) this.firePressed = true;
      this.firePrev = true;
    }
    if (e.button !== 0 || !this.armed) return;
    if (this.mode !== "lock" && !this.isCoarse()) this.requestControl();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.button === 0) {
      this.keys.delete("MouseLeft");
      this.firePrev = false;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.mode === "lock" && document.pointerLockElement === this.el) {
      this.cx = clamp(this.cx + e.movementX * INPUT.lockGain, -INPUT.lockClamp, INPUT.lockClamp);
      this.cy = clamp(this.cy + e.movementY * INPUT.lockGain, -INPUT.lockClamp, INPUT.lockClamp);
      return;
    }
    const el = this.el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.px = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.py = ((e.clientY - r.top) / r.height) * 2 - 1;
    this.inside = true;
  };

  private onPointerLeave = () => {
    this.inside = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      if (this.active) this.releaseControl();
      return;
    }
    const tracked = [
      "KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "Space",
      "ShiftLeft", "ShiftRight", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    ];
    if (tracked.includes(e.code)) {
      if (this.active) e.preventDefault();
      if (e.code === "Space" && !this.keys.has("Space")) this.firePressed = true;
      this.keys.add(e.code);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
    this.firePrev = false;
    this.resetSteering();
  };

  private onVisibility = () => {
    if (document.hidden) {
      this.keys.clear();
      this.firePrev = false;
      this.resetSteering();
    }
  };

  private onLockChange = () => {
    if (this.lockWatchdog) {
      window.clearTimeout(this.lockWatchdog);
      this.lockWatchdog = null;
    }
    if (document.pointerLockElement === this.el) {
      this.resetSteering();
      this.setMode("lock");
    } else if (this.mode === "lock") {
      this.resetSteering();
      this.setMode(this.live ? "stick" : "idle");
    }
  };

  private onLockError = () => {
    if (this.lockWatchdog) {
      window.clearTimeout(this.lockWatchdog);
      this.lockWatchdog = null;
    }
    this.setMode("stick");
  };
}
