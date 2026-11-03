import type { EventBus, GamePhase } from "../core/EventBus";
import type { StoryDirector } from "../story/StoryDirector";
import { DECKS } from "../story/Decks";
import { CHAPTERS, EVIDENCE, VOICE_TEST } from "../story/StoryData";
import { END_OF_PHASE_3, KIND_LABEL, MEMORY_STATUS_TEXT } from "../story/Narrative";
import { RecordingPlayer } from "../story/RecordingPlayer";
import type { AudioManager } from "../atmosphere/AudioManager";

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as T;
}

const CREDITS: [string, string][] = [
  ["THE HOUSE ALWAYS REMEMBERS", ""],
  ["Written, designed and built", "by the project team, with Claude"],
  ["Engine", "Babylon.js"],
  ["Daniel, Emily and the Matron", "voice references approved by the project owner (final recordings to come)"],
  ["Procedural world, textures, music box and sound", "all generated in the game"],
  ["Thank you for playing", ""],
];

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type Tab = "objective" | "evidence" | "timeline" | "memories" | "deductions" | "recordings";

/**
 * Everything the player sees for the story: chapter cards, thoughts, subtitles, evidence notices, the journal and the
 * tape/answering-machine panel. It reads the story systems and calls them for the two puzzles; it holds no story rules.
 */
export class StoryUi {
  private tab: Tab = "evidence";
  private selected: string | null = null;
  private deckId = "";
  private order: string[] = [];
  private reconstructing = false;
  private voiceMsg = "";
  private picks = new Set<number>();
  private thoughts: string[] = [];
  private thoughtBusy = false;
  private cardTimer = 0;
  private noticeTimer = 0;
  private notices: string[] = [];
  private noticeBusy = false;

  constructor(
    events: EventBus,
    private readonly story: StoryDirector,
    private readonly audio: AudioManager,
    onClose: () => void,
  ) {
    events.on("chapter:changed", (c) => {
      if (!c.restored) this.showChapter(c.number, c.title);
    });
    events.on("objective:current", ({ text, hint, remind }) => this.setObjective(text, hint, remind));
    events.on("evidence:added", ({ title, optional }) => {
      this.notice(`${optional ? "Optional evidence" : "Evidence"} added: ${title}`);
      this.audio.journalNote();
      this.refreshIfOpen();
    });
    events.on("memory:added", () => {
      this.notice("A memory has been added to the journal");
      this.refreshIfOpen();
    });
    events.on("memory:changed", () => this.refreshIfOpen());
    events.on("thought", ({ text }) => this.thought(text));
    events.on("subtitle", ({ speaker, text }) => {
      if (!StoryUi.subtitlesEnabled) return;
      el("subtitle").innerHTML = `<b>${esc(speaker)}</b> ${esc(text)}`;
      el("subtitle").classList.add("show");
    });
    events.on("subtitle:clear", () => el("subtitle").classList.remove("show"));
    events.on("veil", ({ opacity, ms, color }) => {
      const v = el("veil");
      v.style.transition = `opacity ${ms}ms`;
      if (color) v.style.background = color;
      v.style.opacity = String(opacity);
    });
    events.on("controls:lock", ({ locked }) => el("cutscene").classList.toggle("show", locked));
    events.on("cine:reveal", ({ on }) => el("cutscene").classList.toggle("show", !on));
    events.on("cine:dolly", ({ on }) => {
      if (on) el("cutscene").classList.remove("show");
    });
    events.on("cine:letterbox", ({ on }) => {
      el("bar-top").classList.toggle("on", on);
      el("bar-bottom").classList.toggle("on", on);
    });
    events.on("cine:photo", ({ show, kind }) => {
      this.photoWanted = show;
      if (show) {
        const c = el("cine-canvas") as HTMLCanvasElement;
        void import("../world/PhotoPainter").then(({ paintPhoto }) => {
          const dawn = kind === "dawn" || kind === "dawn-lit";
          paintPhoto(c, (dawn ? "house" : kind ?? "siblings") as Parameters<typeof paintPhoto>[1], 7);
          if (dawn) this.paintDawn(c, kind === "dawn-lit");
          // The painter loads asynchronously; if the scene was skipped meanwhile, the picture must not appear afterwards.
          if (this.photoWanted) el("cine-photo").classList.add("show");
        });
      } else el("cine-photo").classList.remove("show");
    });
    events.on("choices:show", ({ choices }) => this.showChoices(choices));
    events.on("choices:hide", () => el("choices").classList.remove("show"));
    events.on("card", (c) => this.showCard(c));
    events.on("credits:show", ({ ending }) => this.showCredits(ending));
    window.addEventListener("keydown", (e) => {
      if (!el("choices").classList.contains("show")) return;
      const i = Number(e.key) - 1;
      const btn = el("choices").querySelectorAll("button")[i];
      if (btn) (btn as HTMLButtonElement).click();
    });
    this.onChoice = (id) => events.emit("choice", { id });
    this.onCreditsDone = () => events.emit("credits:done", {});
    events.on("story:end", () => {
      el("end-title").textContent = END_OF_PHASE_3.title;
      el("end-body").textContent = END_OF_PHASE_3.body;
      el("story-end").classList.add("show");
    });
    events.on("recorder:open", ({ deckId }) => {
      this.deckId = deckId;
      this.renderRecorder();
    });
    events.on("journal:open", ({ tab }) => {
      if (tab) this.tab = tab as Tab;
      this.renderJournal();
    });
    events.on("recording:ended", () => this.refreshIfOpen());
    events.on("recording:started", () => this.refreshIfOpen());
    el("end-close").addEventListener("click", () => el("story-end").classList.remove("show"));
    el("journal").addEventListener("click", (e) => this.onJournalClick(e.target as HTMLElement));
    el("recorder").addEventListener("click", (e) => this.onRecorderClick(e.target as HTMLElement));
    window.addEventListener("keydown", (e) => {
      const open = el("journal").classList.contains("show") || el("recorder").classList.contains("show");
      if (open && (e.key === "Escape" || e.key.toLowerCase() === "j")) onClose();
    });
  }

  /** Shows or hides panels for the current game phase. */
  showPhase(phase: GamePhase): void {
    el("journal").classList.toggle("show", phase === "journal");
    el("recorder").classList.toggle("show", phase === "recorder");
    el("hint-keys").style.display = phase === "playing" ? "block" : "none";
  }

  // ---- chapter card, thoughts, notices ---------------------------------------------------------

  /** Set from the accessibility settings. Dialogue is always also recorded in the journal. */
  static subtitlesEnabled = true;

  private photoWanted = false;
  private onChoice: (id: string) => void = () => undefined;
  private onCreditsDone: () => void = () => undefined;
  private creditsTimer = 0;

  private showChoices(choices: { id: string; text: string }[]): void {
    const box = el("choices");
    box.innerHTML = choices.map((c, i) => `<button data-choice="${c.id}"><span>${i + 1}</span> ${esc(c.text)}</button>`).join("");
    box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => this.onChoice((b as HTMLElement).dataset.choice!)));
    box.classList.add("show");
  }

  private showCard(c: { title: string | null; text?: string; ms?: number }): void {
    const card = el("end-card");
    if (c.title === null) {
      card.classList.remove("show");
      return;
    }
    el("end-card-title").textContent = c.title;
    el("end-card-text").textContent = c.text ?? "";
    card.classList.add("show");
  }

  /** Dawn at the front of the house: a soft wash over the painted print, with or without the lit upstairs window. */
  private paintDawn(c: HTMLCanvasElement, lit: boolean): void {
    const g = c.getContext("2d");
    if (!g) return;
    g.fillStyle = "rgba(255,190,150,0.18)";
    g.fillRect(0, 0, c.width, c.height);
    if (lit) {
      // One upstairs window is still lit, and something tall stands behind it.
      const x = c.width * 0.62, y = c.height * 0.3, w = c.width * 0.07, h = c.height * 0.14;
      g.fillStyle = "rgba(255,214,130,0.95)";
      g.fillRect(x, y, w, h);
      g.fillStyle = "rgba(18,12,10,0.92)";
      g.beginPath();
      g.ellipse(x + w / 2, y + h * 0.3, w * 0.16, h * 0.18, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x + w * 0.3, y + h * 0.4, w * 0.4, h * 0.6);
    }
  }

  private showCredits(ending: string): void {
    const box = el("credits");
    const lines = CREDITS.map(([role, who]) => (who ? `<p><i>${esc(role)}</i><br>${esc(who)}</p>` : `<h2>${esc(role)}</h2>`)).join("");
    el("credits-roll").innerHTML = lines;
    box.classList.add("show");
    const roll = el("credits-roll");
    roll.style.animation = "none";
    void roll.offsetHeight;
    roll.style.animation = "";
    const finish = (): void => {
      window.clearTimeout(this.creditsTimer);
      window.removeEventListener("keydown", onKey);
      if (ending === "true") {
        // After the credits, the telephone rings in the empty house. Nobody speaks.
        el("credits-roll").style.display = "none";
        el("credits-after").classList.add("show");
        this.audio.ring();
        this.creditsTimer = window.setTimeout(done, 7000);
      } else done();
    };
    const done = (): void => {
      window.clearTimeout(this.creditsTimer);
      box.classList.remove("show");
      this.onCreditsDone();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === " " || e.key === "Enter" || e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    this.creditsTimer = window.setTimeout(finish, 42000);
  }

  private showChapter(n: number, title: string): void {
    const card = el("chapter-card");
    el("chapter-num").textContent = n === 1 ? "" : `CHAPTER ${n}`;
    el("chapter-title").textContent = title;
    card.classList.add("show");
    window.clearTimeout(this.cardTimer);
    this.cardTimer = window.setTimeout(() => card.classList.remove("show"), n === 1 ? 4200 : 3800);
  }

  private objectiveTimer = 0;

  /** One quiet line at the bottom of the screen. It brightens when it changes, then fades back. */
  private setObjective(text: string, hint: string, bright = true): void {
    const o = el("objective");
    o.innerHTML = `<span class="o-main">${esc(text)}</span>${hint ? `<span class="o-hint">${esc(hint)}</span>` : ""}`;
    if (!bright) return;
    o.classList.add("bright");
    window.clearTimeout(this.objectiveTimer);
    this.objectiveTimer = window.setTimeout(() => o.classList.remove("bright"), 9000);
  }

  private thought(text: string): void {
    this.thoughts.push(text);
    if (!this.thoughtBusy) this.nextThought();
  }

  private nextThought(): void {
    const text = this.thoughts.shift();
    const box = el("thought");
    if (!text) {
      this.thoughtBusy = false;
      box.classList.remove("show");
      return;
    }
    this.thoughtBusy = true;
    box.textContent = text;
    box.classList.add("show");
    window.setTimeout(() => {
      box.classList.remove("show");
      window.setTimeout(() => this.nextThought(), 700);
    }, 4800);
  }

  private notice(text: string): void {
    this.notices.push(text);
    if (!this.noticeBusy) this.nextNotice();
  }

  private nextNotice(): void {
    const text = this.notices.shift();
    const box = el("evidence-toast");
    if (!text) {
      this.noticeBusy = false;
      box.classList.remove("show");
      return;
    }
    this.noticeBusy = true;
    box.innerHTML = `${esc(text)}<span>Journal [J]</span>`;
    box.classList.add("show");
    window.clearTimeout(this.noticeTimer);
    this.noticeTimer = window.setTimeout(() => {
      box.classList.remove("show");
      window.setTimeout(() => this.nextNotice(), 450);
    }, 3600);
  }

  // ---- journal ---------------------------------------------------------------------------------

  private refreshIfOpen(): void {
    if (el("journal").classList.contains("show")) this.renderJournal();
    if (el("recorder").classList.contains("show")) this.renderRecorder();
  }

  private renderJournal(): void {
    const ch = CHAPTERS[Math.max(0, this.story.chapterNumber - 1)];
    const counts = this.story.evidence.counts();
    const tabs: [Tab, string][] = [["objective", "Objective"], ["evidence", "Evidence"], ["timeline", "Timeline"], ["memories", "Memories"], ["deductions", "Deductions"], ["recordings", "Recordings"]];
    const body = this.tab === "objective" ? this.objectiveTab() : this.tab === "evidence" ? this.evidenceTab() : this.tab === "timeline" ? this.timelineTab() : this.tab === "memories" ? this.memoriesTab() : this.tab === "deductions" ? this.deductionsTab() : this.recordingsTab();
    el("journal").innerHTML = `
      <div class="jbox">
        <div class="jhead">
          <div><div class="jtitle">JOURNAL</div><div class="jsub">${esc(ch.number === 1 ? ch.title : `Chapter ${ch.number} — ${ch.title}`)}</div></div>
          <div class="jsub">${counts.key} key found · ${counts.optional} optional</div>
        </div>
        <div class="jobj">${esc(ch.objective || "Listen.")}</div>
        <div class="jtabs">${tabs.map(([id, label]) => `<button data-tab="${id}" class="${id === this.tab ? "on" : ""}">${label}</button>`).join("")}</div>
        <div class="jbody">${body}</div>
        <div class="jfoot">[J] or Esc to close</div>
      </div>`;
  }

  private evidenceTab(): string {
    const found = this.story.evidence.list();
    if (!found.length) return `<p class="empty">Nothing yet. Look around the house, and read what the family left.</p>`;
    const sel = found.find((f) => f.def.id === this.selected) ?? found[found.length - 1];
    this.selected = sel.def.id;
    const list = found
      .map((f) => `<button data-ev="${f.def.id}" class="row ${f.def.id === sel.def.id ? "on" : ""}"><b>${esc(f.def.title)}</b><i>${KIND_LABEL[f.def.kind]}${f.def.optional ? " · optional" : ""}</i></button>`)
      .join("");
    const d = sel.def;
    const play = d.recording ? `<button class="act" data-play="${d.recording}">${this.story.recordings.playing === d.recording ? "Stop" : "Play"} recording</button>` : "";
    return `<div class="two"><div class="list">${list}</div><div class="detail">
      ${sel.thumb ? `<img class="thumb" src="${sel.thumb}" alt="">` : ""}
      <h3>${esc(d.title)}</h3>
      <div class="meta">${KIND_LABEL[d.kind]}${d.optional ? " · optional" : ""} · ${esc(d.where)}</div>
      <p>${esc(d.detail)}</p>${play}</div></div>`;
  }

  private timelineTab(): string {
    const ev = this.story.evidence;
    const row = (r: ReturnType<typeof ev.night>[number]): string => {
      if (r.kind === "gap") return `<div class="trow gap"><span>${esc(r.time)}</span><p>${esc(r.text)}</p></div>`;
      if (!r.known) return `<div class="trow unknown"><span>?</span><p>Something is missing here. There must be a record of it somewhere in the house.</p></div>`;
      return `<div class="trow"><span>${esc(r.def.time)}</span><p>${esc(r.def.text)}<i>${esc(ev.def(r.def.evidence).title)}</i></p></div>`;
    };
    const night = ev.night().map(row).join("");
    const after = ev.after().map(row).join("");
    const solved = this.story.chapters.number >= 8;
    let action = "";
    if (solved) action = `<p class="ok">You have put the evening in order.</p>`;
    else if (this.story.chapterNumber >= 7 && ev.nightKnown()) action = this.reconstructing ? this.reconstructUi() : `<button class="act" data-act="reconstruct">Reconstruct the night</button>`;
    else if (this.story.chapterNumber >= 7) action = `<p class="empty">You cannot put the evening in order until you know all of it.</p>`;
    return `<h4>That night</h4>${night}${after ? `<h4>Afterwards</h4>${after}` : ""}<div class="action">${action}</div>`;
  }

  private reconstructUi(): string {
    const events = this.story.evidence.nightOrder();
    const shuffled = [events[3], events[0], events[4], events[1], events[2]];
    const chosen = this.order.map((id, i) => `<div class="pick">${i + 1}. ${esc(events.find((e) => e.id === id)!.text)}</div>`).join("");
    const rest = shuffled.filter((e) => !this.order.includes(e.id)).map((e) => `<button class="card" data-order="${e.id}">${esc(e.text)}</button>`).join("");
    return `<p>Put what you know in the order it happened.</p><div class="picked">${chosen || "<i>Choose the first thing that happened.</i>"}</div><div class="cards">${rest}</div>
      <div class="acts"><button class="act" data-act="order-reset">Start again</button>${this.order.length === events.length ? `<button class="act" data-act="order-check">Check</button>` : ""}</div><p class="msg">${esc(this.voiceMsg)}</p>`;
  }

  private memoriesTab(): string {
    const mems = this.story.evidence.memories();
    if (!mems.length) return `<p class="empty">Nothing has surfaced yet.</p>`;
    return mems
      .map(
        (m) => `<div class="mem ${m.status}"><p class="said">“${esc(m.def.text)}”</p><div class="stat">${MEMORY_STATUS_TEXT[m.status]}</div>${m.because.map((b) => `<div class="because">${esc(b.title)}</div>`).join("")}</div>`,
      )
      .join("");
  }

  private objectiveTab(): string {
    const cur = this.story.objectives.current();
    const done = this.story.objectives.completed();
    return `<div class="mem refuted"><div class="stat">What to do now</div><p class="said">${esc(cur.text)}</p>${cur.hint ? `<p class="because">${esc(cur.hint)}</p>` : ""}</div>${
      done.length ? `<h3 style="font-weight:normal;letter-spacing:.1em;margin:18px 0 6px">Done</h3>` + done.map((t) => `<div class="because">${esc(t)}</div>`).join("") : ""
    }`;
  }

  private deductionsTab(): string {
    const ds = this.story.deductions();
    if (!ds.length) return `<p class="empty">Nothing has been worked out yet. Deductions appear here when the evidence supports them.</p>`;
    return ds.map((d) => `<div class="mem refuted"><p class="said">${esc(d.text)}</p></div>`).join("");
  }

  private recordingsTab(): string {
    const heard = this.story.evidence.heardRecordings();
    const all = [...(this.story.evidence.hasHeard("phonecall") ? ["phonecall"] : []), ...heard.filter((h) => h !== "phonecall")];
    if (!all.length) return `<p class="empty">You have not heard any recordings yet.</p>`;
    const items = all
      .map((id) => {
        const r = RecordingPlayer.find(id);
        const lines = r.lines.map((l) => `<div class="tl"><b>${esc(l.speaker)}</b> ${esc(l.text)}</div>`).join("");
        return `<div class="rec"><div class="rtop"><b>${esc(r.title)}</b><button class="act" data-play="${r.id}">${this.story.recordings.playing === r.id ? "Stop" : "Play"}</button></div>${lines}</div>`;
      })
      .join("");
    return items + this.voiceTestUi();
  }

  private voiceTestUi(): string {
    if (!this.story.evidence.hasHeard("fake")) return "";
    if (this.story.evidence.has("tape-analysis")) return `<div class="rec ok"><b>Comparison</b><p>${esc(EVIDENCE.find((e) => e.id === "tape-analysis")!.detail)}</p></div>`;
    const st = this.story.voiceTestStatus();
    if (!st.ready) return `<div class="rec"><b>Compare the tape</b><p class="empty">To judge whether the tape is really Emily, hear more of her genuine recordings first (${st.have} of ${st.need}).</p></div>`;
    const rows = VOICE_TEST.lines
      .map((l, i) => `<label class="pickrow"><input type="checkbox" data-voice="${i}" ${this.picks.has(i) ? "checked" : ""}> “${esc(l.text)}”</label>`)
      .join("");
    return `<div class="rec"><b>Compare the tape</b><p>Which of these would Emily never say? Use the tapes you have heard.</p>${rows}<button class="act" data-act="voice-check">Check</button><p class="msg">${esc(this.voiceMsg)}</p></div>`;
  }

  private onJournalClick(t: HTMLElement): void {
    const b = t.closest("button, input") as HTMLElement | null;
    if (!b) return;
    const ds = (b as HTMLElement).dataset;
    if (ds.tab) {
      this.tab = ds.tab as Tab;
      this.voiceMsg = "";
    } else if (ds.ev) this.selected = ds.ev;
    else if (ds.play) {
      if (this.story.recordings.playing === ds.play) this.story.recordings.stop();
      else this.story.recordings.play(ds.play, 0.3);
    } else if (ds.voice !== undefined) {
      const i = Number(ds.voice);
      if ((b as HTMLInputElement).checked) this.picks.add(i);
      else this.picks.delete(i);
      return;
    } else if (ds.act === "voice-check") {
      const r = this.story.submitVoiceTest([...this.picks]);
      this.voiceMsg = r.solved ? "" : r.results.filter((x) => !x.correct).length > 2 ? "Not yet. Listen to how she talks on the genuine tapes: the names she uses, the words she picks." : "Close. One or two of your choices don't match how she talks on the other tapes.";
    } else if (ds.act === "reconstruct") {
      this.reconstructing = true;
      this.order = [];
      this.voiceMsg = "";
    } else if (ds.order) this.order.push(ds.order);
    else if (ds.act === "order-reset") {
      this.order = [];
      this.voiceMsg = "";
    } else if (ds.act === "order-check") {
      const r = this.story.submitNightOrder(this.order);
      this.voiceMsg = r.solved ? "" : "That is not how the evening went. Look at the times in the timeline above.";
      if (r.solved) this.reconstructing = false;
      else this.order = [];
    }
    this.renderJournal();
  }

  // ---- recorder panel --------------------------------------------------------------------------

  private renderRecorder(): void {
    const deck = DECKS[this.deckId];
    if (!deck) return;
    const playing = this.story.recordings.playing;
    const rows = deck.tapes
      .filter((t) => !t.needsFalseTape || this.story.falseTapeAvailable)
      .map((t) => {
        const r = RecordingPlayer.find(t.recording);
        const on = playing === r.id;
        return `<div class="tape"><div><b>${esc(t.label)}</b><i>${this.story.evidence.hasHeard(r.id) ? "heard" : "not heard"}</i></div><button class="act" data-tape="${r.id}">${on ? "Stop" : "Play"}</button></div>`;
      })
      .join("");
    el("recorder").innerHTML = `<div class="jbox small"><div class="jhead"><div class="jtitle">${esc(deck.name.toUpperCase())}</div></div><div class="jbody">${rows}</div><div class="jfoot">[Esc] to close. The tape keeps playing.</div></div>`;
  }

  private onRecorderClick(t: HTMLElement): void {
    const b = t.closest("button") as HTMLElement | null;
    const id = b?.dataset.tape;
    if (!id) return;
    if (this.story.recordings.playing === id) this.story.recordings.stop();
    else this.story.recordings.play(id, 0.4);
    this.renderRecorder();
  }
}

