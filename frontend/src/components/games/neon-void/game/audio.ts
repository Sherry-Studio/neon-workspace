/* ============================================================
   NEON VOID — procedural audio (Web Audio API, no asset files).
   All SFX/music are synthesised so the game ships with zero
   binary audio downloads. Respects browser autoplay rules:
   nothing sounds until `resume()` is called from a user gesture.
   ============================================================ */

import type { Settings } from "./types";

type Sfx =
  | "shoot"
  | "missile"
  | "explosion"
  | "bigExplosion"
  | "shieldHit"
  | "hullHit"
  | "boost"
  | "emp"
  | "pickup"
  | "warn"
  | "lock"
  | "ui"
  | "uiBack"
  | "objective"
  | "levelUp"
  | "fail"
  | "win";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private musicTimer: number | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private started = false;
  private mode: "menu" | "combat" | "boss" | "none" = "none";
  settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  private ensure() {
    if (this.ctx) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();

      const len = this.ctx.sampleRate * 1.2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    } catch {
      this.ctx = null;
    }
  }

  applyVolumes() {
    if (!this.master || !this.musicGain || !this.sfxGain) return;
    const s = this.settings;
    this.master.gain.value = s.masterVolume;
    this.musicGain.gain.value = s.musicVolume * 0.5;
    this.sfxGain.gain.value = s.sfxVolume;
  }

  /** call from a user gesture */
  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    this.started = true;
  }

  suspend() {
    if (this.ctx && this.ctx.state === "running") this.ctx.suspend().catch(() => {});
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) this.ctx.close().catch(() => {});
    this.ctx = null;
    this.master = null;
  }

  private now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
  ) {
    if (!this.ctx || !this.sfxGain || !this.started) return;
    const t = this.now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, lp: number) {
    if (!this.ctx || !this.sfxGain || !this.noiseBuf || !this.started) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(lp, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(120, lp * 0.2), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(sfx: Sfx) {
    if (!this.started) return;
    this.ensure();
    switch (sfx) {
      case "shoot":
        this.tone(880, 0.09, "square", 0.12, 240);
        break;
      case "missile":
        this.tone(180, 0.4, "sawtooth", 0.16, 90);
        this.noise(0.4, 0.06, 1400);
        break;
      case "explosion":
        this.noise(0.45, 0.5, 1800);
        this.tone(120, 0.4, "sine", 0.28, 40);
        break;
      case "bigExplosion":
        this.noise(1.1, 0.7, 2400);
        this.tone(70, 1.0, "sine", 0.42, 28);
        this.tone(160, 0.6, "sawtooth", 0.2, 40);
        break;
      case "shieldHit":
        this.tone(1400, 0.14, "sine", 0.14, 500);
        break;
      case "hullHit":
        this.noise(0.16, 0.32, 900);
        this.tone(90, 0.12, "square", 0.2, 50);
        break;
      case "boost":
        this.noise(0.5, 0.14, 3200);
        break;
      case "emp":
        this.tone(60, 0.6, "sawtooth", 0.3, 900);
        this.noise(0.6, 0.2, 4000);
        break;
      case "pickup":
        this.tone(660, 0.08, "sine", 0.12);
        this.tone(990, 0.12, "sine", 0.12);
        break;
      case "warn":
        this.tone(440, 0.12, "square", 0.16);
        break;
      case "lock":
        this.tone(1200, 0.05, "sine", 0.1);
        break;
      case "ui":
        this.tone(520, 0.05, "sine", 0.08);
        break;
      case "uiBack":
        this.tone(320, 0.06, "sine", 0.08);
        break;
      case "objective":
        this.tone(523, 0.1, "sine", 0.12);
        this.tone(784, 0.16, "sine", 0.12);
        break;
      case "levelUp":
        [523, 659, 784, 1046].forEach((f, i) =>
          setTimeout(() => this.tone(f, 0.16, "triangle", 0.13), i * 70),
        );
        break;
      case "fail":
        this.tone(220, 0.8, "sawtooth", 0.24, 70);
        break;
      case "win":
        [392, 523, 659, 784, 1046].forEach((f, i) =>
          setTimeout(() => this.tone(f, 0.28, "triangle", 0.14), i * 130),
        );
        break;
    }
  }

  // --- music: slow evolving pad + arpeggio bed ---
  setMusic(mode: "menu" | "combat" | "boss" | "none") {
    if (mode === this.mode) return;
    this.mode = mode;
    this.stopMusic();
    if (mode === "none" || !this.started) return;
    this.ensure();
    if (!this.ctx || !this.musicGain) return;

    const scales: Record<string, number[]> = {
      menu: [220, 261.63, 329.63, 392, 523.25],
      combat: [196, 233.08, 293.66, 349.23, 466.16],
      boss: [146.83, 174.61, 220, 277.18, 349.23],
    };
    const scale = scales[mode];
    const bpm = mode === "boss" ? 132 : mode === "combat" ? 112 : 76;
    const step = 60 / bpm / 2;

    // drone
    const drone = this.ctx.createOscillator();
    const dg = this.ctx.createGain();
    drone.type = "sawtooth";
    drone.frequency.value = scale[0] / 2;
    dg.gain.value = 0.05;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    drone.connect(lp);
    lp.connect(dg);
    dg.connect(this.musicGain);
    drone.start();
    this.musicNodes.push(drone);

    let i = 0;
    const tick = () => {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      const f = scale[(i * 2) % scale.length] * (i % 8 < 4 ? 1 : 2);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = mode === "menu" ? "sine" : "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(mode === "menu" ? 0.04 : 0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step * 1.4);
      o.connect(g);
      g.connect(this.musicGain);
      o.start(t);
      o.stop(t + step * 1.6);
      i++;
    };
    this.musicTimer = window.setInterval(tick, step * 1000);
  }

  private stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicNodes.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    });
    this.musicNodes = [];
  }
}
