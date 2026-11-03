import type { Scene } from "@babylonjs/core/scene";

/**
 * Developer-only recorder for the automated walkthrough (`?demo&record`). It records what is on screen into WebM segments, saved by the dev
 * server into docs/full-story-demo/video/. Each frame is the game's own rendered canvas with the page's own overlays (subtitles, chapter
 * display, journal, panels, choices, credits, fades) drawn over it. The overlays are a snapshot of the real page DOM, taken about five times a
 * second, so fast changes in them (a fade) are stepped. Nothing is posed or reconstructed. Not part of any production build.
 */
export class Recorder {
  private readonly out = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  private overlay: HTMLImageElement | null = null;
  private snapBusy = false;
  private lastSnap = 0;
  private lastDraw = 0;
  private rec: MediaRecorder | null = null;
  private upload: Promise<unknown> = Promise.resolve();
  private segment = 0;
  private segName = "";
  private bytes = 0;
  private readonly t0 = performance.now();
  /** Names every file of this run (`rYYYYMMDD-HHMMSS-...`), so a later run can never overwrite or append to an earlier run's files. */
  readonly runId = `r${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14).replace(/^(\d{8})/, "$1-")}`;
  uploadErrors = 0;
  private uploaded = 0;
  private readonly lines: string[] = [];
  readonly files: { name: string; bytes: number; label: string; seconds: number }[] = [];
  private segStart = 0;
  private obs: { remove(): void } | null = null;

  constructor(private readonly scene: Scene, private readonly source: HTMLCanvasElement) {
    this.out.width = source.width;
    this.out.height = source.height;
    this.ctx = this.out.getContext("2d")!;
  }

  get segmentCount(): number {
    return this.segment;
  }

  /** A timestamped line in the chronological log (seconds since the recorder was created). */
  log(text: string): void {
    this.lines.push(`${((performance.now() - this.t0) / 1000).toFixed(1).padStart(7)}s  ${text}`);
  }

  /** Uploads in order; a failed upload is retried twice and then counted (`uploadErrors`) instead of being silently lost. */
  private post(file: string, body: BlobPart, append: boolean): Promise<unknown> {
    const size = typeof body === "string" ? 0 : (body as Blob).size ?? 0;
    this.upload = this.upload.then(async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(`/__demo/save?file=${file}&mode=${append ? "append" : "write"}`, { method: "POST", body });
          if (r.ok) {
            if (append) this.uploaded += size;
            return;
          }
        } catch {
          /* retry */
        }
        await new Promise((res) => window.setTimeout(res, 500));
      }
      this.uploadErrors++;
    });
    return this.upload;
  }

  status(text: string): void {
    void this.post(`${this.runId}-status.txt`, `${text}\n`, false);
    void this.post(`${this.runId}-log.txt`, this.lines.join("\n") + "\n", false);
  }

  /** The passive watchdog's heartbeat (`<run>-progress.json`), rewritten every few seconds by the Observer. */
  progress(info: Record<string, unknown>): void {
    const body = JSON.stringify({ runId: this.runId, bootId: Math.round(performance.timeOrigin), wallMs: Date.now(), segment: this.segment, segmentName: this.segName, segmentBytes: this.bytes, uploadedBytes: this.uploaded, uploadErrors: this.uploadErrors, recorderActive: !!this.rec, ...info });
    void this.post(`${this.runId}-progress.json`, body, false);
  }

  /** Starts the next numbered segment (stopping the current one first). */
  async next(label: string): Promise<void> {
    await this.stop();
    this.segment++;
    this.segName = `${this.runId}-part-${String(this.segment).padStart(2, "0")}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.webm`;
    this.bytes = 0;
    this.segStart = performance.now();
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m))!;
    const stream = this.out.captureStream(30);
    this.rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_300_000 });
    const name = this.segName;
    this.rec.ondataavailable = (e) => {
      if (!e.data.size) return;
      this.bytes += e.data.size;
      void this.post(name, e.data, true);
    };
    void this.post(name, new Blob([]), false);
    this.rec.start(4000);
    if (!this.obs) {
      const o = this.scene.onAfterRenderObservable.add(() => this.frame());
      this.obs = { remove: () => this.scene.onAfterRenderObservable.remove(o) };
    }
    this.log(`SEGMENT ${this.segment} starts: ${name}`);
  }

  async stop(): Promise<void> {
    const r = this.rec;
    if (!r) return;
    this.rec = null;
    await new Promise<void>((res) => {
      r.onstop = () => res();
      r.stop();
    });
    await this.upload;
    this.files.push({ name: this.segName, bytes: this.bytes, label: this.segName, seconds: (performance.now() - this.segStart) / 1000 });
  }

  private frame(): void {
    const now = performance.now();
    if (!this.rec || now - this.lastDraw < 30) return;
    this.lastDraw = now;
    const { ctx, out } = this;
    ctx.drawImage(this.source, 0, 0, out.width, out.height);
    if (this.overlay) ctx.drawImage(this.overlay, 0, 0, out.width, out.height);
    if (now - this.lastSnap > 200 && !this.snapBusy) {
      this.lastSnap = now;
      this.snapshot();
    }
  }

  /** Draws the page's visible overlays (everything but the game canvas and the observer's control panel) into an image. */
  private snapshot(): void {
    this.snapBusy = true;
    try {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const skip = (e: Element): boolean => e.tagName === "CANVAS" || e.tagName === "SCRIPT" || e.tagName === "STYLE" || e.id === "obs" || e.id === "hud" || e.tagName === "LINK";
      const copy = (src: Element): Node | null => {
        if (skip(src)) return null;
        const cs = getComputedStyle(src);
        if (cs.display === "none" || cs.visibility === "hidden") return null;
        const dst = src.cloneNode(false) as HTMLElement;
        let css = "";
        for (let i = 0; i < cs.length; i++) css += `${cs[i]}:${cs.getPropertyValue(cs[i])};`;
        dst.setAttribute("style", css);
        dst.removeAttribute("id");
        for (const n of src.childNodes) {
          if (n.nodeType === 3) dst.appendChild(n.cloneNode());
          else if (n.nodeType === 1) {
            const c = copy(n as Element);
            if (c) dst.appendChild(c);
          }
        }
        return dst;
      };
      const root = document.createElement("div");
      root.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      root.setAttribute("style", `position:relative;width:${W}px;height:${H}px;overflow:hidden;background:transparent;`);
      for (const c of document.body.children) {
        const n = copy(c);
        if (n) root.appendChild(n);
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(root)}</foreignObject></svg>`;
      const img = new Image();
      img.onload = () => {
        this.overlay = img;
        this.snapBusy = false;
      };
      img.onerror = () => (this.snapBusy = false);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch {
      this.snapBusy = false;
    }
  }

  dispose(): void {
    this.obs?.remove();
    this.obs = null;
  }
}
