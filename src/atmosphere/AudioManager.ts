import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

function setPannerPos(p: PannerNode, x: number, y: number, z: number): void {
  if (p.positionX) {
    p.positionX.value = x;
    p.positionY.value = y;
    p.positionZ.value = z;
  } else {
    p.setPosition(x, y, z);
  }
}

export interface AudioDiagnostics {
  state: string;
  sampleRate: number;
  masterGain: number;
  /** RMS of the signal leaving the master gain, measured by an analyser. 0 means nothing is being produced. */
  outputRms: number;
  error: string | null;
}

/**
 * All audio is synthesised with Web Audio, so the prototype ships no audio files.
 * Babylon is left-handed and Web Audio right-handed, so every position and direction has its Z negated.
 *
 * Noise colour matters: brown noise has almost no energy above ~1 kHz, so anything band-passed up there
 * (clicks, static, paper) must use white noise or it is effectively silent. Brown is kept for low rumbles.
 */
export type AmbienceLayer = "cold" | "warm" | "wind" | "damp" | "paper";

/** Which ambience layers are audible in each room (levels are small; they sit under the drone). */
const ROOM_AMBIENCE: Record<string, Partial<Record<AmbienceLayer, number>>> = {
  foyer: { cold: 0.07, wind: 0.03 },
  hall: { cold: 0.05, wind: 0.02 },
  rear: { cold: 0.04, damp: 0.04 },
  living: { warm: 0.07, paper: 0.02 },
  dining: { warm: 0.04, cold: 0.03 },
  kitchen: { warm: 0.05, damp: 0.03 },
  study: { paper: 0.06, warm: 0.03 },
  uphall: { wind: 0.07, cold: 0.03 },
  storage: { damp: 0.07, wind: 0.02 },
  daniel: { warm: 0.04, wind: 0.03 },
  emily: { warm: 0.03, wind: 0.04 },
  bathroom: { damp: 0.08, cold: 0.03 },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private analyser: AnalyserNode | null = null;
  private brown!: AudioBuffer;
  private white!: AudioBuffer;
  private volume = 0.8;
  private lastError: string | null = null;
  private readonly emitters = new Map<string, Emitter>();
  private sfx!: GainNode;
  private dialogueBus!: GainNode;
  private dialogueAnalyser: AnalyserNode | null = null;
  private effectsVolume = 1;
  private dialogueVolume = 1;
  private droneGain: GainNode | null = null;
  private presenceGain: GainNode | null = null;
  /** Room ambience layers, crossfaded as the player moves. Built with the audio graph. */
  private layers: Record<AmbienceLayer, GainNode> | null = null;
  private room: string | null = null;
  private musicTimer: number | null = null;
  /** 1 normally; lower when the player asks for reduced intensity. Scales sudden sounds only. */
  private intensity = 1;
  private music!: GainNode;
  private musicVolume = 1;

  /**
   * A positional looping sound source (clock tick, radio static, fridge hum, television hiss).
   * Can be declared before audio starts; the graph is built on the first user gesture.
   */
  addEmitter(id: string, pos: Vector3, kind: EmitterKind, on: boolean): void {
    const e: Emitter = { pos, kind, on, gain: null };
    this.emitters.set(id, e);
    if (this.ctx) this.buildEmitter(this.ctx, e);
  }

  setEmitter(id: string, on: boolean): void {
    const e = this.emitters.get(id);
    if (!e) return;
    e.on = on;
    if (this.ctx && e.gain) e.gain.gain.setTargetAtTime(on ? EMITTER_LEVEL[e.kind] : 0, this.ctx.currentTime, 0.08);
  }

  setMasterVolume(v: number): void {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /**
   * Creates (once) and resumes the audio context. Must be called from a user gesture, such as the Begin button.
   * Setup errors are recorded and rethrown rather than leaving a half-built graph behind.
   */
  async start(): Promise<void> {
    const firstTime = !this.ctx;
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state !== "running") await ctx.resume();
    if (firstTime) this.chime();
  }

  /** The audio context, or null until the first user gesture. */
  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Where dialogue clips connect. Separate from effects so each has its own volume. */
  get dialogueOut(): GainNode | null {
    return this.ctx ? this.dialogueBus : null;
  }

  /** Shared white-noise buffer (used for tape hiss and line noise). */
  get noiseBuffer(): AudioBuffer | null {
    return this.ctx ? this.white : null;
  }

  /** Reduced intensity softens the sudden sounds (stingers, thumps, the shutter) without touching ambience or dialogue. */
  setReducedIntensity(on: boolean): void {
    this.intensity = on ? 0.35 : 1;
  }

  /** Crossfades the room ambience layers (slowly, so doorways never click) and runs the music box in Emily's room. */
  setRoomAmbience(room: string): void {
    this.room = room;
    const ctx = this.ctx;
    if (!ctx || !this.layers) return;
    const levels = ROOM_AMBIENCE[room] ?? {};
    for (const k of Object.keys(this.layers) as AmbienceLayer[]) this.layers[k].gain.setTargetAtTime(levels[k] ?? 0, ctx.currentTime, 1.6);
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    if (room === "emily") this.musicTimer = window.setTimeout(() => this.musicBox(), 6000);
  }

  /** A few notes of a music box, very quiet, now and then, only in Emily's room. */
  private musicBox(): void {
    const ctx = this.ctx;
    this.musicTimer = null;
    if (!ctx || this.room !== "emily") return;
    const notes = [659.25, 587.33, 523.25, 587.33, 659.25, 659.25, 659.25];
    const t0 = ctx.currentTime + 0.05;
    notes.forEach((f, i) => {
      const t = t0 + i * 0.52;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f * (i === 4 ? 0.995 : 1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.028 * this.intensity + 0.012, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(this.music);
      o.start(t);
      o.stop(t + 1.5);
    });
    this.musicTimer = window.setTimeout(() => this.musicBox(), 16000 + Math.random() * 14000);
  }

  /** A soft, low pad under a chapter title: the only "music" besides the music box, and brief. */
  chapterPad(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.05, t + 2.2);
    out.gain.linearRampToValueAtTime(0, t + 6);
    out.connect(this.music);
    for (const f of [110, 130.8, 164.8]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(out);
      o.start(t);
      o.stop(t + 6.2);
    }
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.ctx) this.music.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setEffectsVolume(v: number): void {
    this.effectsVolume = v;
    if (this.ctx) this.sfx.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setDialogueVolume(v: number): void {
    this.dialogueVolume = v;
    if (this.ctx) this.dialogueBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Current loudness of dialogue, 0..1 (drives mouth movement). */
  dialogueLevel(): number {
    const a = this.dialogueAnalyser;
    if (!a) return 0;
    const d = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(d);
    let s = 0;
    for (const v of d) s += v * v;
    return Math.min(1, Math.sqrt(s / d.length) * 6);
  }

  /** The audio clock in seconds, or the wall clock if audio has not started. */
  now(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  /** Two rings of an old telephone. Returns how long they last, in seconds. */
  ring(): number {
    const ctx = this.ctx;
    if (!ctx) return 2.4;
    const t = ctx.currentTime + 0.05;
    for (const at of [0, 1.2]) {
      for (const f of [440, 480]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t + at);
        g.gain.linearRampToValueAtTime(0.13, t + at + 0.02);
        g.gain.setValueAtTime(0.13, t + at + 0.85);
        g.gain.linearRampToValueAtTime(0, t + at + 0.9);
        o.connect(g).connect(this.sfx);
        o.start(t + at);
        o.stop(t + at + 0.95);
      }
    }
    return 2.4;
  }

  /** A soft page-turn and pen sound when something is added to the journal. */
  journalNote(): void {
    this.burst(0.18, 2600, 0.18, "bandpass");
    this.later(0.12, () => this.tone("sine", 392, 0.7, 0.07));
    this.later(0.28, () => this.tone("sine", 587.33, 0.9, 0.06));
  }

  /** 0..1: raises the underlying drone as tension builds. */
  setTension(t: number): void {
    if (this.ctx && this.droneGain) this.droneGain.gain.setTargetAtTime(0.07 + t * 0.1, this.ctx.currentTime, 0.9);
  }

  /** 0..1: how close the Matron is. Fades in a low chord. */
  setPresence(level: number): void {
    if (this.ctx && this.presenceGain) this.presenceGain.gain.setTargetAtTime(level * 0.16, this.ctx.currentTime, 0.7);
  }

  /** A single low heartbeat thud. */
  pulse(): void {
    this.burst(0.14, 62, 0.9);
  }

  /** Drops the whole mix almost to silence for a moment, so what follows lands harder. */
  duck(seconds: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.sfx.gain.setTargetAtTime(this.effectsVolume * 0.15, ctx.currentTime, 0.12);
    this.later(seconds, () => this.sfx.gain.setTargetAtTime(this.effectsVolume, ctx.currentTime, 0.35));
  }

  /** Synthesised stings: "swell" builds slowly, "sting" is a short dissonant hit, "drop" is a deep impact. */
  stinger(kind: "swell" | "sting" | "drop"): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = this.intensity;
    out.connect(this.sfx);
    const osc = (type: OscillatorType, f: number, g: number, dur: number, attack: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(0, t);
      gg.gain.linearRampToValueAtTime(g, t + attack);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gg).connect(out);
      o.start(t);
      o.stop(t + dur + 0.1);
    };
    if (kind === "swell") {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(180, t);
      lp.frequency.linearRampToValueAtTime(1100, t + 2.6);
      out.disconnect();
      out.connect(lp).connect(this.sfx);
      osc("sine", 41, 0.4, 3.2, 1.8);
      osc("sawtooth", 174, 0.12, 3.2, 2.0);
      osc("sawtooth", 181, 0.12, 3.2, 2.0);
      osc("sawtooth", 262, 0.05, 3.2, 2.2);
    } else if (kind === "sting") {
      for (const f of [311, 330, 466, 622]) osc("sine", f, 0.1, 1.1, 0.01);
      this.burst(0.3, 2500, 0.3, "bandpass");
    } else {
      osc("sine", 48, 0.7, 1.6, 0.01);
      osc("sine", 31, 0.6, 2.2, 0.01);
      this.burst(0.8, 140, 0.6);
    }
  }

  diagnostics(): AudioDiagnostics {
    const ctx = this.ctx;
    let rms = 0;
    if (this.analyser) {
      const d = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(d);
      let s = 0;
      for (const v of d) s += v * v;
      rms = Math.sqrt(s / d.length);
    }
    return {
      state: ctx ? ctx.state : "not created",
      sampleRate: ctx?.sampleRate ?? 0,
      masterGain: ctx ? this.master.gain.value : 0,
      outputRms: Number(rms.toFixed(4)),
      error: this.lastError,
    };
  }

  update(pos: Vector3, forward: Vector3): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    if (l.positionX) {
      l.positionX.value = pos.x;
      l.positionY.value = pos.y;
      l.positionZ.value = -pos.z;
      l.forwardX.value = forward.x;
      l.forwardY.value = forward.y;
      l.forwardZ.value = -forward.z;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(pos.x, pos.y, -pos.z);
      l.setOrientation(forward.x, forward.y, -forward.z, 0, 1, 0);
    }
  }

  // ---- one-shot sounds -------------------------------------------------------------------------

  /** Clearly audible three-note test, triggered from the pause menu. */
  async playTest(): Promise<void> {
    await this.start();
    this.tone("sine", 440, 0.35, 0.35);
    this.later(0.3, () => this.tone("sine", 554.37, 0.35, 0.35));
    this.later(0.6, () => this.tone("sine", 659.25, 0.6, 0.35));
    this.later(0.95, () => this.burst(0.25, 1800, 0.6, "bandpass"));
  }

  /** Short feedback blip, used when the volume slider is released. */
  blip(): void {
    this.tone("sine", 660, 0.18, 0.3);
  }

  /** A footstep on the given surface: wood boards, tile, lino, carpet/rug, or the hollow stair treads. */
  footstep(run: boolean, surface: "wood" | "tile" | "lino" | "carpet" | "stairs" = "wood"): void {
    const k = run ? 1 : 0.65;
    const jitter = 0.85 + Math.random() * 0.3;
    switch (surface) {
      case "tile":
        this.burst(0.06, 220 * jitter, 0.7 * k);
        this.burst(0.05, 2600 + Math.random() * 600, 0.28 * k, "bandpass");
        break;
      case "lino":
        this.burst(0.07, 200 * jitter, 0.7 * k);
        this.burst(0.07, 1500 + Math.random() * 400, 0.16 * k, "bandpass");
        break;
      case "carpet":
        this.burst(0.12, 120 * jitter, 0.55 * k);
        break;
      case "stairs":
        this.burst(0.14, 140 * jitter, 1.0 * k);
        this.burst(0.18, 420 * jitter, 0.3 * k, "bandpass");
        break;
      default:
        this.burst(0.1, 160 * jitter, 1.0 * k);
        this.burst(0.05, 1100 + Math.random() * 500, 0.24 * k * (run ? 1 : 0.62), "bandpass");
    }
  }

  /** The Witness: a quiet camera-shutter click and a short projector whirr. Soft, so it never startles by volume. */
  shutter(): void {
    this.burst(0.03, 2200, 0.35, "bandpass");
    this.later(0.09, () => this.burst(0.05, 1500, 0.3, "bandpass"));
    this.later(0.2, () => this.burst(0.6, 700, 0.06, "bandpass"));
  }

  click(): void {
    this.burst(0.04, 2400, 0.7, "bandpass");
  }

  paper(): void {
    this.burst(0.3, 3000, 0.3, "highpass");
  }

  drawer(): void {
    this.burst(0.5, 260, 0.8, "bandpass");
    this.burst(0.35, 900, 0.18, "bandpass");
  }

  thud(): void {
    this.burst(0.18, 140, 0.9 * this.intensity);
    this.burst(0.12, 600, 0.35 * this.intensity);
  }

  /** A single soft step on the floor above: quiet, so it can be mistaken for the house. */
  distantStep(): void {
    this.burst(0.16, 110, 0.32 * this.intensity);
    this.burst(0.08, 380, 0.08 * this.intensity, "bandpass");
  }

  distantThump(): void {
    const k = this.intensity;
    this.burst(0.5, 110, 0.9 * k);
    this.burst(0.35, 500, 0.3 * k);
    this.later(0.45, () => {
      this.burst(0.4, 90, 0.6 * k);
      this.burst(0.25, 450, 0.2 * k);
    });
  }

  creak(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(62, t);
    osc.frequency.linearRampToValueAtTime(118, t + 0.5);
    osc.frequency.linearRampToValueAtTime(84, t + 0.95);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 520;
    bp.Q.value = 7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.25);
    g.gain.linearRampToValueAtTime(0, t + 1);
    osc.connect(bp).connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 1.05);
  }

  buzz(): void {
    this.tone("square", 120, 0.28, 0.14);
  }

  chime(): void {
    this.tone("sine", 523.25, 1.4, 0.22);
    this.later(0.12, () => this.tone("sine", 783.99, 1.6, 0.18));
  }

  // ---- internals -------------------------------------------------------------------------------

  private build(): void {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    try {
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      // A gentle compressor on the way out keeps sudden peaks from startling the player.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 18;
      comp.ratio.value = 4;
      comp.attack.value = 0.008;
      comp.release.value = 0.28;
      this.master.connect(comp).connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = this.effectsVolume;
      this.sfx.connect(this.master);
      // Music (the music box and chapter pads) has its own level, and passes through the effects bus.
      this.music = ctx.createGain();
      this.music.gain.value = this.musicVolume;
      this.music.connect(this.sfx);
      this.dialogueBus = ctx.createGain();
      this.dialogueBus.gain.value = this.dialogueVolume;
      this.dialogueBus.connect(this.master);
      this.dialogueAnalyser = ctx.createAnalyser();
      this.dialogueAnalyser.fftSize = 512;
      this.dialogueBus.connect(this.dialogueAnalyser);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.master.connect(this.analyser);

      this.brown = this.makeNoise(ctx, 4, true);
      this.white = this.makeNoise(ctx, 4, false);
      this.buildAmbience(ctx);
      for (const e of this.emitters.values()) this.buildEmitter(ctx, e);
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      console.error("[audio] setup failed", e);
      void ctx.close();
      throw e;
    }
    // Browsers may suspend the context (tab hidden, device change); any later input resumes it.
    const resume = () => {
      if (ctx.state === "suspended" || (ctx.state as string) === "interrupted") void ctx.resume().catch(() => undefined);
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    this.ctx = ctx;
  }

  private later(seconds: number, fn: () => void): void {
    window.setTimeout(fn, seconds * 1000);
  }

  private tone(type: OscillatorType, freq: number, dur: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Filtered noise burst. Frequencies up to ~450 Hz use brown noise (rumble); anything higher uses white noise. */
  private burst(dur: number, freq: number, gain: number, type: BiquadFilterType = "lowpass"): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const buf = freq <= 450 ? this.brown : this.white;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, Math.random() * (buf.duration - dur - 0.1));
    src.stop(t + dur + 0.05);
  }

  private makeNoise(ctx: AudioContext, seconds: number, brown: boolean): AudioBuffer {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        d[i] = w * 0.5;
      }
    }
    return buf;
  }

  private loopNoise(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    return s;
  }

  private buildAmbience(ctx: AudioContext): void {
    // Low room tone (felt more than heard on small speakers).
    const room = this.loopNoise(ctx, this.brown);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    const rg = ctx.createGain();
    rg.gain.value = 0.5;
    room.connect(lp).connect(rg).connect(this.sfx);
    room.start();

    // Mid-range air, like a draught through the house, with a slow swell. This is the part laptop speakers reproduce.
    const air = this.loopNoise(ctx, this.white);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 650;
    bp.Q.value = 0.6;
    const ag = ctx.createGain();
    ag.gain.value = 0.16;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.09;
    const swellGain = ctx.createGain();
    swellGain.gain.value = 0.08;
    swell.connect(swellGain).connect(ag.gain);
    swell.start();
    air.connect(bp).connect(ag).connect(this.sfx);
    air.start();

    // Room ambience layers: one shared air source split into differently shaped, individually faded layers.
    const mk = (type: BiquadFilterType, f: number, q: number, buf: AudioBuffer): GainNode => {
      const src = this.loopNoise(ctx, buf);
      const flt = ctx.createBiquadFilter();
      flt.type = type;
      flt.frequency.value = f;
      flt.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(flt).connect(g).connect(this.sfx);
      src.start();
      return g;
    };
    this.layers = {
      cold: mk("bandpass", 1100, 0.9, this.white),
      warm: mk("lowpass", 240, 0.7, this.brown),
      wind: mk("bandpass", 420, 1.6, this.white),
      damp: mk("highpass", 3800, 0.5, this.white),
      paper: mk("bandpass", 2600, 0.4, this.white),
    };
    if (this.room) this.setRoomAmbience(this.room);

    // Drone with audible upper partials; the level slowly breathes.
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.07;
    for (const [type, f] of [["sine", 55], ["sine", 82.4], ["triangle", 110], ["triangle", 164.8]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(droneGain);
      o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain).connect(droneGain.gain);
    lfo.start();
    droneGain.connect(this.sfx);
    this.droneGain = droneGain;

    // The Matron's presence: a very low, slowly beating chord that is only audible when she is near.
    const presence = ctx.createGain();
    presence.gain.value = 0;
    for (const f of [55, 58.4, 82.4]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(presence);
      o.start();
    }
    presence.connect(this.sfx);
    this.presenceGain = presence;
  }

  private makePanner(ctx: AudioContext, pos: Vector3): PannerNode {
    const p = ctx.createPanner();
    p.panningModel = "HRTF";
    p.distanceModel = "inverse";
    p.refDistance = 2;
    p.rolloffFactor = 1.2;
    setPannerPos(p, pos.x, pos.y, -pos.z);
    return p;
  }

  private buildEmitter(ctx: AudioContext, e: Emitter): void {
    const out = ctx.createGain();
    out.gain.value = e.on ? EMITTER_LEVEL[e.kind] : 0;
    e.gain = out;
    const panner = this.makePanner(ctx, e.pos);
    if (e.kind === "tick") {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (const start of [0, 1]) {
        const n = Math.floor(ctx.sampleRate * 0.04);
        for (let i = 0; i < n; i++) {
          const env = Math.exp(-i / (n / 6));
          d[Math.floor(start * ctx.sampleRate) + i] = (Math.sin(i * 0.28) * 0.6 + (Math.random() * 2 - 1) * 0.4) * env * (start ? 0.6 : 0.9);
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(panner).connect(out).connect(this.sfx);
      src.start();
    } else if (e.kind === "hum") {
      // Appliance hum: mains fundamental plus harmonics that small speakers can reproduce.
      for (const [f, g] of [[100, 0.5], [200, 0.35], [300, 0.2]] as const) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const og = ctx.createGain();
        og.gain.value = g;
        o.connect(og).connect(panner);
        o.start();
      }
      panner.connect(out).connect(this.sfx);
    } else {
      // "static" (radio) sweeps a band of noise; "tv" is a narrower, steadier hiss.
      const src = this.loopNoise(ctx, this.white);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = e.kind === "tv" ? 3200 : 1600;
      bp.Q.value = e.kind === "tv" ? 1.4 : 0.8;
      if (e.kind === "static") {
        const sweep = ctx.createOscillator();
        sweep.frequency.value = 0.13;
        const sweepGain = ctx.createGain();
        sweepGain.gain.value = 700;
        sweep.connect(sweepGain).connect(bp.frequency);
        sweep.start();
      }
      src.connect(bp).connect(panner).connect(out).connect(this.sfx);
      src.start();
    }
  }
}

export type EmitterKind = "tick" | "static" | "hum" | "tv";

interface Emitter {
  pos: Vector3;
  kind: EmitterKind;
  on: boolean;
  gain: GainNode | null;
}

const EMITTER_LEVEL: Record<EmitterKind, number> = { tick: 1.8, static: 1.6, hum: 0.5, tv: 0.9 };
