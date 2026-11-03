import { Bot, BotAbort, type ObserverContext } from "./Bot";
import { runRoute, type RouteName } from "./Route";
import { StoryUi } from "../../ui/StoryUi";
import { Recorder } from "./Recorder";
import { CHAPTERS } from "../../story/StoryData";

/**
 * Observer Mode: an automated, watchable demonstration of the game, for the developer. Developer-only: the Game creates it
 * only in development builds and only when the page is opened with `?observer`. It drives the real game through keyboard
 * events and the game's own UI, keeps its save in its own storage namespace, and writes nothing to the player's save.
 */
const ROUTES: { id: RouteName; label: string }[] = [
  { id: "true", label: "True ending" },
  { id: "recognition", label: "Recognition ending" },
  { id: "denial", label: "Denial ending" },
];

function paramRoute(): RouteName {
  const v = new URLSearchParams(location.search).get("observer");
  return v === "recognition" || v === "denial" ? v : "true";
}

/** One line per chapter on why it matters. Only what the game itself establishes; no new facts. */
const WHY: Record<number, string> = {
  1: "A phone call brings Daniel, 24, back to the house after eleven years.",
  2: "The house is wrong in small ways; the family left things to read.",
  3: "Emily's room and her recordings: the first sign that the story Daniel was told does not hold.",
  4: "The family's photographs and the Matron's version disagree. Daniel starts to doubt what he remembers.",
  5: "A tape speaks in Emily's voice. The test shows it is not her.",
  6: "What the family did after the accident, and why the house was kept.",
  7: "Daniel pieces together the night Emily was last heard from, and his own part in it.",
  8: "The truth is faced: the mirror, the chase, Emily's room, and the Matron's offer.",
};

export class Observer {
  /** Multiplies the game's time step. 0 while paused. */
  timeScale = 1;
  private readonly bot: Bot;
  private readonly route = paramRoute();
  private readonly resume = new URLSearchParams(location.search).has("resume");
  private speed = 1;
  private paused = false;
  private started = false;
  private fastUntilChapter = 0;
  private annotations = true;
  private subtitles = true;
  /** Muted unless the page is opened with `&audio`. */
  private audioOn = new URLSearchParams(location.search).has("audio");
  private baseVolume = 0.8;
  private panel!: HTMLElement;
  private note!: HTMLElement;
  private status!: HTMLElement;
  /** `&record`: records the walkthrough into docs/full-story-demo/video/ (dev server only). */
  private recorder: Recorder | null = null;
  private lastProgress = 0;
  private clockSec = 0;
  private hud!: HTMLElement;
  private objective = "";
  private ended = false;
  private noteTimer = 0;
  /** Wall-clock supervision data for the passive watchdog (see `heartbeat`). */
  private storyWallMs = Date.now();
  private evidenceCount = 0;
  private routeDone = false;
  private beatTimer = 0;
  private lastNote = "";

  constructor(private readonly c: ObserverContext) {
    this.bot = new Bot(c);
    this.bot.annotate = (t) => this.annotate(t);
    try {
      this.baseVolume = (JSON.parse(localStorage.getItem("thar.settings.v1") ?? "{}") as { volume?: number }).volume ?? 0.8;
    } catch {
      /* default */
    }
    // The observer's own save slot starts empty every time, so a run always begins from the same state.
    // `&resume` continues from the observer's own last checkpoint (made by earlier automated play) instead.
    if (!this.resume) {
      c.save.clear();
      c.save.clearMeta();
    }
    this.buildPanel();
    this.listen();
    if (new URLSearchParams(location.search).has("timer")) this.driveFromTimer();
    (window as unknown as { __observer: Observer }).__observer = this;
    if (!this.audioOn) c.audio.setMasterVolume(0);
  }

  /**
   * `&timer`: a browser that throttles requestAnimationFrame (a background tab, or an embedded pane) makes the walkthrough crawl. This replaces the
   * engine's frame loop with a timer so the demonstration runs at its normal speed there. Developer-only, like everything in this module.
   */
  private driveFromTimer(): void {
    const engine = this.c.scene.getEngine() as unknown as { stopRenderLoop(): void; beginFrame(): void; endFrame(): void; _activeRenderLoops?: (() => void)[] };
    const loops = engine._activeRenderLoops ? [...engine._activeRenderLoops] : [];
    if (!loops.length) return;
    engine.stopRenderLoop();
    const frame = (): void => {
      engine.beginFrame();
      for (const f of loops) f();
      engine.endFrame();
    };
    // The page's own timers are slowed to about one tick a second when the browser treats the page as unattended, which made a recorded run
    // crawl. A worker's timer is not subject to that, so the worker only paces the frames (one tick per finished frame, so none can queue up).
    try {
      const pacer = new Worker(URL.createObjectURL(new Blob(["onmessage=()=>setTimeout(()=>postMessage(0),8)"], { type: "text/javascript" })));
      pacer.onmessage = () => {
        frame();
        pacer.postMessage(0);
      };
      pacer.postMessage(0);
      return;
    } catch {
      /* no worker available: fall back to the page's own timer */
    }
    const tick = (): void => {
      frame();
      window.setTimeout(tick, 8);
    };
    tick();
  }

  // ---- control ---------------------------------------------------------------------------------

  private start(): void {
    if (this.started) return;
    // Wait for the loading screen (shader warm-up) to finish before beginning.
    if (this.c.phase() === "loading") {
      this.annotate("Loading… the walkthrough starts when the house is ready.");
      window.setTimeout(() => this.start(), 400);
      return;
    }
    this.started = true;
    this.panel.querySelector<HTMLElement>("#obs-start")!.style.display = "none";
    this.panel.querySelector<HTMLElement>("#obs-controls")!.style.display = "block";
    this.hud.style.display = "block";
    document.getElementById("menu")?.classList.remove("show");
    if (this.resume && this.c.save.hasSave()) this.c.save.load();
    this.c.begin();
    if (new URLSearchParams(location.search).has("record")) {
      const engine = this.c.scene.getEngine();
      // A larger render than the pane's pixels, so the video is sharper than the on-screen view.
      engine.setHardwareScalingLevel(2 / 3);
      engine.resize();
      const canvas = engine.getRenderingCanvas()!;
      this.recorder = new Recorder(this.c.scene, canvas);
      this.recorder.log("RUN STARTS (fresh observer save, 1x, muted, subtitles on)");
      void this.recorder.next("ch1-the-telephone");
      this.recorder.status("RUNNING chapter 1");
      this.beatTimer = window.setInterval(() => this.heartbeat("running"), 5000);
      this.heartbeat("running");
    }
    this.annotate(`Observer Mode: ${ROUTES.find((r) => r.id === this.route)!.label} walkthrough.`);
    void runRoute(this.bot, this.route, this.c)
      .then(() => {
        this.routeDone = true;
        this.annotate("Walkthrough complete.");
        this.recorder?.log("ROUTE FUNCTION RETURNED (credits are playing)");
      })
      .catch((e) => {
        if (!(e instanceof BotAbort)) {
          console.error(e);
          this.annotate(`Walkthrough stopped: ${String(e)}`);
          this.failRecording(`route threw: ${String(e)}`);
        }
      });
  }

  private setPaused(p: boolean): void {
    this.paused = p;
    this.applyScale();
    if (p) this.bot.releaseAll();
    try {
      if (p) void this.c.audio.context?.suspend();
      else void this.c.audio.context?.resume();
    } catch {
      /* audio may not exist yet */
    }
    this.panel.querySelector<HTMLElement>("#obs-pause")!.textContent = p ? "▶ Resume" : "⏸ Pause";
    this.refresh();
  }

  private applyScale(): void {
    this.timeScale = this.paused ? 0 : this.fastUntilChapter ? 6 : this.speed;
  }

  private skipScene(): void {
    const { finale, story, horror } = this.c;
    if (finale.busy) finale.skip();
    else if (story.inPrologue) story.skipPrologue();
    else horror.skipCine();
    this.bot.skipCurrentWait();
  }

  private nextChapter(): void {
    this.fastUntilChapter = this.c.story.chapterNumber + 1;
    this.bot.fast = true;
    this.applyScale();
    this.annotate(`Skipping ahead to chapter ${this.fastUntilChapter}.`);
  }

  private exit(): void {
    this.bot.stop();
    this.setPaused(true);
    window.location.href = window.location.pathname;
  }

  // ---- per frame -------------------------------------------------------------------------------

  update(dt: number): void {
    this.clockSec += dt;
    this.bot.update(dt);
    this.watchRecording();
    if (!this.started) return;
    if (this.fastUntilChapter) {
      const { finale, story } = this.c;
      if (story.chapterNumber >= this.fastUntilChapter) {
        this.fastUntilChapter = 0;
        this.bot.fast = false;
        this.applyScale();
      } else {
        // Fast-forward plays scenes through their end states, but leaves every question to the walkthrough.
        if (story.inPrologue) story.skipPrologue();
        else if (finale.busy) finale.skip();
        this.c.horror.skipCine();
      }
    }
    this.refresh();
  }

  // ---- recording supervision --------------------------------------------------------------------

  /** Stops with an honest failure if the walkthrough makes no progress for five minutes of game time. */
  private watchRecording(): void {
    if (!this.recorder || !this.started || this.paused) return;
    if (this.clockSec - this.lastProgress > 300) this.failRecording("no progress for 5 minutes of game time");
  }

  /** Writes `<run>-progress.json` for the passive watchdog (scripts/demo-watchdog.mjs). Reads game state only; changes nothing. */
  private heartbeat(state: "running" | "done" | "failed", why = ""): void {
    this.recorder?.progress({
      state,
      why,
      paused: this.paused,
      speed: this.speed,
      clockSec: Math.round(this.clockSec * 10) / 10,
      chapter: this.c.story.chapterNumber,
      objective: this.objective,
      evidence: this.evidenceCount,
      storyWallMs: this.storyWallMs,
      botActive: !this.bot.aborted && !this.routeDone,
      routeDone: this.routeDone,
      fps: Math.round(this.c.scene.getEngine().getFps()),
    });
  }

  private failRecording(why: string): void {
    const r = this.recorder;
    if (!r) return;
    this.heartbeat("failed", why);
    window.clearInterval(this.beatTimer);
    this.recorder = null;
    r.log(`FAILED: ${why}; chapter ${this.c.story.chapterNumber}; objective: ${this.objective}`);
    r.status(`FAILED ${why}; chapter ${this.c.story.chapterNumber}`);
    void r.stop();
  }

  private async finishRecording(): Promise<void> {
    const r = this.recorder;
    if (!r) return;
    window.clearInterval(this.beatTimer);
    this.recorder = null;
    await r.stop();
    r.log(`ENDING REACHED: ${["true", "recognition", "denial"].filter((k) => this.c.state.get(`ending:${k}`)).join(",")}`);
    r.log(`FILES: ${r.files.map((f) => `${f.name} ${(f.bytes / 1e6).toFixed(1)}MB ${f.seconds.toFixed(0)}s`).join(" | ")}`);
    r.status(`DONE ${JSON.stringify(r.files)}`);
    r.progress({ state: "done", why: "", clockSec: Math.round(this.clockSec), chapter: this.c.story.chapterNumber, objective: this.objective, evidence: this.evidenceCount, storyWallMs: this.storyWallMs, botActive: false, routeDone: this.routeDone, paused: this.paused, speed: this.speed, fps: 0, files: r.files });
  }

  // ---- annotations -----------------------------------------------------------------------------

  private annotate(text: string): void {
    if (text === this.lastNote) return;
    this.lastNote = text;
    this.lastProgress = this.clockSec;
    this.recorder?.log(`NOTE: ${text}`);
    this.note.textContent = text;
    this.note.style.opacity = this.annotations ? "1" : "0";
    window.clearTimeout(this.noteTimer);
    this.noteTimer = window.setTimeout(() => (this.note.style.opacity = "0"), 6500);
  }

  private listen(): void {
    const e = this.c.events;
    // Story progress as the watchdog sees it, in wall-clock time: an evidence item, an objective, a chapter, a puzzle or a story flag.
    const story = (): void => void (this.storyWallMs = Date.now());
    e.on("evidence:added", () => (this.evidenceCount++, story()));
    e.on("objective:current", story);
    e.on("chapter:changed", story);
    e.on("puzzle:solved", story);
    e.on("flag:set", ({ key, value }) => value && /^(seen|scripted|puzzle|ending|finale|prologue):/.test(key) && story());
    e.on("evidence:added", ({ title, optional }) => this.annotate(`Evidence added to journal${optional ? " (optional)" : ""}: ${title}.`));
    e.on("objective:current", ({ text }) => this.annotate(`Objective: ${text}`));
    e.on("objective:current", ({ text }) => {
      this.objective = text;
      this.recorder?.log(`OBJECTIVE: ${text}`);
    });
    e.on("flag:set", ({ key, value }) => {
      if (value && /^(seen|scripted|puzzle|ending|finale|prologue):/.test(key)) this.recorder?.log(`STORY FLAG: ${key}`);
    });
    e.on("scare", () => this.recorder?.log("EVENT: a scare plays"));
    e.on("evidence:added", ({ id, title }) => this.recorder?.log(`EVIDENCE: ${id} (${title})`));
    e.on("recording:ended", ({ id }) => this.recorder?.log(`RECORDING ENDED: ${id}`));
    e.on("objective", ({ text }) => (this.objective = text));
    e.on("chapter:changed", ({ number, title, restored }) => {
      if (!restored && this.recorder && number > 1) {
        this.recorder.log(`CHAPTER ${number}: ${title}`);
        void this.recorder.next(`ch${number}-${title.replace(/^[A-Z]+ — /, "")}`);
        this.recorder.status(`RUNNING chapter ${number}`);
      }
      if (!restored) this.annotate(`Chapter ${number}: ${title.replace(/^[A-Z]+ — /, "")}. ${WHY[number] ?? ""}`);
    });
    e.on("puzzle:solved", ({ id }) => this.annotate(`Puzzle solved: ${id}.`));
    e.on("flag:set", ({ key }) => {
      if (key === "scripted:steps") this.annotate("Footsteps detected upstairs.");
      else if (key === "seen:witness") this.annotate("A silent figure stands in the room. It does not move toward Daniel.");
      else if (key === "seen:mirror") this.annotate("Chapter 8: the mirror sequence has played.");
      else if (key === "seen:body") this.annotate("Chapter 8: Emily's room. Her body has been kept, not buried and gone: the Matron preserved it as a vessel.");
      else if (key === "seen:true-form") this.annotate("The Matron stops holding the human shape. She is the same entity, no longer constrained by a body. Watch the head, the hair and the neck.");
      else if (key === "finale:chamber") this.annotate("The reconstructed room. The Matron cannot become Emily; she needs Daniel's guilt and attachment as the bridge to Emily's body.");
    });
    e.on("recording:started", ({ id }) => this.annotate(`Playing recording: ${id}.`));
    e.on("scare", () => this.annotate("A sudden event."));
    e.on("ending:start", ({ id }) => this.annotate(`Ending: ${id}.`));
    e.on("credits:done", () => {
      this.recorder?.log("CREDITS AND POST-CREDIT TELEPHONE SCENE FINISHED");
      window.setTimeout(() => void this.finishRecording(), 2500);
    });
    e.on("credits:show", () => {
      this.recorder?.log("CREDITS SHOWN (the telephone rings after them in the true ending)");
      this.ended = true;
      this.annotate("Credits.");
    });
  }

  // ---- panel -----------------------------------------------------------------------------------

  private buildPanel(): void {
    const css = document.createElement("style");
    css.textContent = `
      #obs { position: fixed; right: 10px; bottom: 10px; z-index: 99999; font: 11px/1.4 ui-monospace, Menlo, monospace; color: #ddd; background: rgba(8,8,10,0.82); border: 1px solid rgba(255,255,255,0.18); padding: 8px 10px; width: 244px; border-radius: 4px; }
      #obs button, #obs select { font: inherit; color: #ddd; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.2); padding: 3px 7px; margin: 2px 2px 0 0; cursor: pointer; letter-spacing: 0; border-radius: 3px; }
      #obs button.on { background: rgba(120,180,255,0.3); }
      #obs b { color: #9cf; }
      #obs-hud { position: fixed; left: 10px; top: 10px; z-index: 99998; width: 330px; font: 11px/1.4 ui-monospace, Menlo, monospace; color: #ddd; background: rgba(8,8,10,0.6); border: 1px solid rgba(255,255,255,0.14); padding: 6px 9px; border-radius: 4px; pointer-events: none; }
      #obs-hud-ch { color: #9cf; font-weight: bold; letter-spacing: 0.04em; }
      #obs-hud-obj { margin-top: 2px; color: #cfd; min-height: 2.8em; }
      #obs-hud-bar { margin-top: 4px; height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; }
      #obs-hud-bar i { display: block; height: 3px; width: 0; background: #9cf; border-radius: 2px; }
      #obs-note { position: fixed; left: 50%; top: 46px; transform: translateX(-50%); z-index: 99998; font: 12px ui-monospace, Menlo, monospace; color: #cfe; background: rgba(0,0,0,0.55); padding: 3px 9px; border-radius: 3px; pointer-events: none; opacity: 0; transition: opacity 0.4s; max-width: 70vw; text-align: center; }
    `;
    document.head.appendChild(css);
    this.hud = document.createElement("div");
    this.hud.id = "obs-hud";
    this.hud.style.display = "none";
    this.hud.innerHTML = `<div id="obs-hud-ch"></div><div id="obs-hud-obj"></div><div id="obs-hud-bar"><i></i></div>`;
    document.body.appendChild(this.hud);
    this.note = document.createElement("div");
    this.note.id = "obs-note";
    document.body.appendChild(this.note);
    this.panel = document.createElement("div");
    this.panel.id = "obs";
    this.panel.innerHTML = `
      <b>OBSERVER MODE</b> · developer only<br/>
      <span id="obs-status"></span>
      <div id="obs-start"><button id="obs-go" style="margin-top:6px">▶ Play the ${ROUTES.find((r) => r.id === this.route)!.label} walkthrough</button>
        <div style="margin-top:4px">Route: <select id="obs-route">${ROUTES.map((r) => `<option value="${r.id}" ${r.id === this.route ? "selected" : ""}>${r.label}</option>`).join("")}</select></div></div>
      <div id="obs-controls" style="display:none">
        <button id="obs-pause">⏸ Pause</button><button id="obs-restart">↺ Restart</button><button id="obs-skip">Skip scene</button><button id="obs-next">Next chapter</button><br/>
        Speed: <button data-speed="0.5">0.5×</button><button data-speed="1" class="on">1×</button><button data-speed="2">2×</button><button data-speed="4">4×</button><br/>
        <button id="obs-ann" class="on">Annotations</button><button id="obs-sub" class="on">Subtitles</button><button id="obs-aud">Audio</button><br/>
        Route: <select id="obs-route2">${ROUTES.map((r) => `<option value="${r.id}" ${r.id === this.route ? "selected" : ""}>${r.label}</option>`).join("")}</select>
        <button id="obs-exit">Exit</button>
      </div>`;
    document.body.appendChild(this.panel);
    this.status = this.panel.querySelector("#obs-status")!;
    const q = <T extends HTMLElement>(s: string): T => this.panel.querySelector<T>(s)!;
    q("#obs-go").addEventListener("click", () => this.start());
    q("#obs-route").addEventListener("change", (ev) => (location.search = `?observer=${(ev.target as HTMLSelectElement).value}${this.audioOn ? "&audio" : ""}`));
    q("#obs-route2").addEventListener("change", (ev) => (location.search = `?observer=${(ev.target as HTMLSelectElement).value}${this.audioOn ? "&audio" : ""}`));
    q("#obs-pause").addEventListener("click", () => this.setPaused(!this.paused));
    q("#obs-restart").addEventListener("click", () => location.reload());
    q("#obs-skip").addEventListener("click", () => this.skipScene());
    q("#obs-next").addEventListener("click", () => this.nextChapter());
    q("#obs-exit").addEventListener("click", () => this.exit());
    this.panel.querySelectorAll<HTMLElement>("[data-speed]").forEach((b) =>
      b.addEventListener("click", () => {
        this.speed = Number(b.dataset.speed);
        this.panel.querySelectorAll("[data-speed]").forEach((x) => x.classList.toggle("on", x === b));
        this.applyScale();
      }),
    );
    q("#obs-ann").addEventListener("click", (ev) => {
      this.annotations = !this.annotations;
      (ev.target as HTMLElement).classList.toggle("on", this.annotations);
      this.note.style.opacity = this.annotations ? "1" : "0";
    });
    q("#obs-sub").addEventListener("click", (ev) => {
      this.subtitles = !this.subtitles;
      StoryUi.subtitlesEnabled = this.subtitles;
      (ev.target as HTMLElement).classList.toggle("on", this.subtitles);
    });
    const aud = q("#obs-aud");
    aud.classList.toggle("on", this.audioOn);
    aud.addEventListener("click", () => {
      this.audioOn = !this.audioOn;
      aud.classList.toggle("on", this.audioOn);
      this.c.audio.setMasterVolume(this.audioOn ? this.baseVolume : 0);
    });
    // Keyboard shortcuts must not reach the game as player input while a panel control has focus.
    this.panel.addEventListener("keydown", (ev) => ev.stopPropagation());
  }

  private refresh(): void {
    const n = this.c.story.chapterNumber;
    const ch = CHAPTERS[Math.max(0, n - 1)];
    if (this.started) {
      const { state } = this.c;
      const p = this.ended || state.get("ending:done") ? 1 : Math.min(0.97, (n - 1) / 8 + (state.get("finale:chamber") ? 0.06 : 0) + (state.get("seen:body") ? 0.03 : 0));
      this.hud.querySelector("#obs-hud-ch")!.textContent = `${ch ? `CHAPTER ${n} · ${ch.title.replace(/^[A-Z]+ — /, "")}` : ""}${this.paused ? "  (paused)" : ""}`;
      this.hud.querySelector("#obs-hud-obj")!.textContent = this.objective ? `Objective: ${this.objective}` : "";
      (this.hud.querySelector("#obs-hud-bar i") as HTMLElement).style.width = `${Math.round(p * 100)}%`;
    }
    this.status.textContent = this.started ? ` ${this.paused ? "PAUSED" : this.fastUntilChapter ? "FAST-FORWARD" : `${this.speed}×`} · Ch ${n}${ch ? ` ${ch.title.replace(/^[A-Z]+ — /, "")}` : ""}` : "";
  }
}
