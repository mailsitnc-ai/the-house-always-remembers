import { Bot, BotAbort, type ObserverContext } from "./Bot";
import { runRoute, type RouteName } from "./Route";
import { StoryUi } from "../../ui/StoryUi";
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
  private audioOn = !new URLSearchParams(location.search).has("mute");
  private baseVolume = 0.8;
  private panel!: HTMLElement;
  private note!: HTMLElement;
  private status!: HTMLElement;
  private noteTimer = 0;
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
    (window as unknown as { __observer: Observer }).__observer = this;
    if (!this.audioOn) c.audio.setMasterVolume(0);
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
    document.getElementById("menu")?.classList.remove("show");
    if (this.resume && this.c.save.hasSave()) this.c.save.load();
    this.c.begin();
    this.annotate(`Observer Mode: ${ROUTES.find((r) => r.id === this.route)!.label} walkthrough.`);
    void runRoute(this.bot, this.route, this.c)
      .then(() => this.annotate("Walkthrough complete."))
      .catch((e) => {
        if (!(e instanceof BotAbort)) {
          console.error(e);
          this.annotate(`Walkthrough stopped: ${String(e)}`);
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
    this.bot.update(dt);
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

  // ---- annotations -----------------------------------------------------------------------------

  private annotate(text: string): void {
    if (text === this.lastNote) return;
    this.lastNote = text;
    this.note.textContent = text;
    this.note.style.opacity = this.annotations ? "1" : "0";
    window.clearTimeout(this.noteTimer);
    this.noteTimer = window.setTimeout(() => (this.note.style.opacity = "0"), 6500);
  }

  private listen(): void {
    const e = this.c.events;
    e.on("evidence:added", ({ title, optional }) => this.annotate(`Evidence added to journal${optional ? " (optional)" : ""}: ${title}.`));
    e.on("objective:current", ({ text }) => this.annotate(`Objective: ${text}`));
    e.on("chapter:changed", ({ number, title, restored }) => {
      if (!restored) this.annotate(`Chapter ${number}: ${title.replace(/^[A-Z]+ — /, "")}.`);
    });
    e.on("puzzle:solved", ({ id }) => this.annotate(`Puzzle solved: ${id}.`));
    e.on("flag:set", ({ key }) => {
      if (key === "scripted:steps") this.annotate("Footsteps detected upstairs.");
      else if (key === "seen:witness") this.annotate("A silent figure stands in the room. It does not move toward Daniel.");
      else if (key === "seen:mirror") this.annotate("Chapter 8: the mirror sequence has played.");
      else if (key === "seen:body") this.annotate("Chapter 8: Emily's room.");
    });
    e.on("recording:started", ({ id }) => this.annotate(`Playing recording: ${id}.`));
    e.on("scare", () => this.annotate("A sudden event."));
    e.on("ending:start", ({ id }) => this.annotate(`Ending: ${id}.`));
    e.on("credits:show", () => this.annotate("Credits."));
  }

  // ---- panel -----------------------------------------------------------------------------------

  private buildPanel(): void {
    const css = document.createElement("style");
    css.textContent = `
      #obs { position: fixed; right: 10px; bottom: 10px; z-index: 99999; font: 11px/1.4 ui-monospace, Menlo, monospace; color: #ddd; background: rgba(8,8,10,0.82); border: 1px solid rgba(255,255,255,0.18); padding: 8px 10px; width: 244px; border-radius: 4px; }
      #obs button, #obs select { font: inherit; color: #ddd; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.2); padding: 3px 7px; margin: 2px 2px 0 0; cursor: pointer; letter-spacing: 0; border-radius: 3px; }
      #obs button.on { background: rgba(120,180,255,0.3); }
      #obs b { color: #9cf; }
      #obs-note { position: fixed; left: 50%; top: 46px; transform: translateX(-50%); z-index: 99998; font: 12px ui-monospace, Menlo, monospace; color: #cfe; background: rgba(0,0,0,0.55); padding: 3px 9px; border-radius: 3px; pointer-events: none; opacity: 0; transition: opacity 0.4s; max-width: 70vw; text-align: center; }
    `;
    document.head.appendChild(css);
    this.note = document.createElement("div");
    this.note.id = "obs-note";
    document.body.appendChild(this.note);
    this.panel = document.createElement("div");
    this.panel.id = "obs";
    this.panel.innerHTML = `
      <b>OBSERVER MODE</b> · developer only<br/>
      <span id="obs-status"></span>
      <div id="obs-start"><button id="obs-go" style="margin-top:6px">▶ Start the ${ROUTES.find((r) => r.id === this.route)!.label} walkthrough</button>
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
    q("#obs-route").addEventListener("change", (ev) => (location.search = `?observer=${(ev.target as HTMLSelectElement).value}${this.audioOn ? "" : "&mute"}`));
    q("#obs-route2").addEventListener("change", (ev) => (location.search = `?observer=${(ev.target as HTMLSelectElement).value}${this.audioOn ? "" : "&mute"}`));
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
    this.status.textContent = this.started ? ` ${this.paused ? "PAUSED" : this.fastUntilChapter ? "FAST-FORWARD" : `${this.speed}×`} · Ch ${n}${ch ? ` ${ch.title.replace(/^[A-Z]+ — /, "")}` : ""}` : "";
  }
}
