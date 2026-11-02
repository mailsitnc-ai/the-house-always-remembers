import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Scene } from "@babylonjs/core/scene";

interface ChromeMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface PerfReport {
  frames: number;
  fpsAvg: number;
  frameMsAvg: number;
  frameMsP95: number;
  frameMsP99: number;
  frameMsMax: number;
  hitchesOver33ms: number;
  jsHeapMB: number | null;
  jsHeapPressurePct: number | null;
  estTextureMB: number;
  activeMeshes: number;
  renderSize: string;
  gpu: string;
  loadMarksMs: Record<string, number>;
}

export interface BenchRow {
  room: string;
  frames: number;
  fps: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  hitches: number;
}

const WINDOW = 600;
const HITCH_MS = 33.4;

/**
 * Measures what actually happens on the device: frame times, JS heap (Chrome only; Safari does not expose it),
 * estimated texture memory and load-stage timings. Toggle the HUD with F3; call window.__perf.report() for numbers.
 */
export class PerfMonitor {
  private readonly samples = new Float32Array(WINDOW);
  private filled = 0;
  private head = 0;
  private totalFrames = 0;
  private hitches = 0;
  private lastHud = 0;
  private readonly marks: { label: string; t: number }[] = [];
  visible = true;
  private bench: Map<string, number[]> | null = null;
  /** Optional extra HUD line (used for audio status). */
  extraLine: (() => string) | null = null;

  constructor(
    private readonly engine: Engine,
    private readonly scene: Scene,
    private readonly hud: HTMLElement,
  ) {
    (window as unknown as { __perf: PerfMonitor }).__perf = this;
  }

  /** Records a load-stage timestamp, in ms since page navigation start. */
  mark(label: string): void {
    this.marks.push({ label, t: performance.now() });
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.hud.style.display = v ? "block" : "none";
  }

  /** Starts collecting frame times per room (benchmark walk). */
  beginBench(): void {
    this.bench = new Map();
  }

  /** Stops collecting and returns one row per room, plus an overall row. */
  endBench(): BenchRow[] {
    const rows: BenchRow[] = [];
    const all: number[] = [];
    for (const [room, v] of this.bench ?? []) {
      rows.push(this.row(room, v));
      all.push(...v);
    }
    if (all.length) rows.push(this.row("ALL ROOMS", all));
    this.bench = null;
    return rows;
  }

  private row(room: string, v: number[]): BenchRow {
    const s = [...v].sort((a, b) => a - b);
    const q = (p: number) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    const avg = s.reduce((x, y) => x + y, 0) / s.length;
    return { room, frames: s.length, fps: 1000 / avg, avgMs: avg, p95Ms: q(0.95), p99Ms: q(0.99), maxMs: s[s.length - 1], hitches: s.filter((x) => x > HITCH_MS).length };
  }

  /** Call once per rendered gameplay frame with the frame time in ms. */
  frame(ms: number, room?: string): void {
    if (this.bench && room) {
      const arr = this.bench.get(room);
      if (arr) arr.push(ms);
      else this.bench.set(room, [ms]);
    }
    this.samples[this.head] = ms;
    this.head = (this.head + 1) % WINDOW;
    this.filled = Math.min(this.filled + 1, WINDOW);
    this.totalFrames++;
    if (ms > HITCH_MS) this.hitches++;
    const now = performance.now();
    if (this.visible && now - this.lastHud > 500) {
      this.lastHud = now;
      this.hud.textContent = this.formatHud(this.report());
    }
  }

  report(): PerfReport {
    const n = this.filled;
    const sorted = Array.from(this.samples.subarray(0, n)).sort((a, b) => a - b);
    const avg = n ? sorted.reduce((s, v) => s + v, 0) / n : 0;
    const pct = (p: number) => (n ? sorted[Math.min(n - 1, Math.floor(n * p))] : 0);
    const mem = (performance as unknown as { memory?: ChromeMemory }).memory;
    const loadMarksMs: Record<string, number> = {};
    for (const m of this.marks) loadMarksMs[m.label] = Math.round(m.t);
    return {
      frames: this.totalFrames,
      fpsAvg: avg ? 1000 / avg : 0,
      frameMsAvg: avg,
      frameMsP95: pct(0.95),
      frameMsP99: pct(0.99),
      frameMsMax: n ? sorted[n - 1] : 0,
      hitchesOver33ms: this.hitches,
      jsHeapMB: mem ? mem.usedJSHeapSize / 1048576 : null,
      jsHeapPressurePct: mem ? (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100 : null,
      estTextureMB: this.estimateTextureMB(),
      activeMeshes: this.scene.getActiveMeshes().length,
      renderSize: `${this.engine.getRenderWidth()}x${this.engine.getRenderHeight()}`,
      gpu: this.engine.getGlInfo().renderer,
      loadMarksMs,
    };
  }

  private estimateTextureMB(): number {
    let bytes = 0;
    for (const t of this.scene.textures) {
      const { width, height } = t.getSize();
      bytes += width * height * 4 * (t.noMipmap ? 1 : 1.33);
    }
    return bytes / 1048576;
  }

  private formatHud(r: PerfReport): string {
    const heap = r.jsHeapMB === null ? "n/a (browser hides it)" : `${r.jsHeapMB.toFixed(0)} MB (${r.jsHeapPressurePct!.toFixed(1)}% of limit)`;
    const marks = Object.entries(r.loadMarksMs)
      .map(([k, v]) => `${k} ${v}ms`)
      .join(" · ");
    return [
      `${r.fpsAvg.toFixed(0)} fps · avg ${r.frameMsAvg.toFixed(1)} ms · p95 ${r.frameMsP95.toFixed(1)} · p99 ${r.frameMsP99.toFixed(1)} · max ${r.frameMsMax.toFixed(1)}`,
      `hitches >33ms: ${r.hitchesOver33ms} of ${r.frames} frames`,
      `JS heap ${heap} · tex ≈ ${r.estTextureMB.toFixed(1)} MB`,
      `render ${r.renderSize} · active meshes ${r.activeMeshes}`,
      `load: ${marks}`,
      ...(this.extraLine ? [this.extraLine()] : []),
      `F3 hide`,
    ].join("\n");
  }
}
