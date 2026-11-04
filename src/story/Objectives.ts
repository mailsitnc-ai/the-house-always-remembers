import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";
import type { EvidenceSystem } from "./EvidenceSystem";
import { CHAPTERS } from "./StoryData";

interface Step {
  id: string;
  chapter: number;
  /** One short instruction. */
  text: string;
  /** Where it is and how to do it, in a sentence. */
  hint: string;
  /** Where the objective is, for the house map: only rooms Daniel knows from the hint text. */
  room?: string;
  /** Satisfied by what the player has actually done. */
  done(c: Ctx): boolean;
  /** The step is only offered once this is true (default: always). */
  available?(c: Ctx): boolean;
}

interface Ctx {
  state: GameState;
  evidence: EvidenceSystem;
}

/**
 * One current objective at a time, always derived from what the player has actually done (flags and evidence), never from a
 * timer. Because it is derived, it is correct after loading a save. Chapters without steps use the chapter's own objective.
 * Nothing here points at an object the player cannot currently use. Each step is one short instruction plus a line saying
 * where the thing is and how to use it; in the opening the player is never left to guess.
 */
const STEPS: Step[] = [
  {
    id: "living",
    room: "living",
    chapter: 2,
    text: "Go into the living room.",
    hint: "Through the doorway on your left as you enter the house. Walk with W A S D.",
    done: (c) => c.state.get("visited:living") || c.evidence.has("living-photo"),
  },
  {
    id: "photo",
    room: "living",
    chapter: 2,
    text: "Examine the family photograph.",
    hint: "It hangs on the living room's west wall. Walk up to it and press E.",
    done: (c) => c.evidence.has("living-photo"),
  },
  {
    id: "note",
    room: "kitchen",
    chapter: 2,
    text: "Read Mum's note in the kitchen.",
    hint: "Down the hallway to the very end, then east into the kitchen. It lies on the worktop by the kettle. Press E to read.",
    done: (c) => c.evidence.has("kitchen-note"),
  },
  {
    id: "upstairs",
    room: "emily",
    chapter: 3,
    text: "Find Emily's bedroom.",
    hint: "Take the stairs in the hallway. At the top, Emily's door is the first on your left.",
    done: (c) => c.state.get("visited:emily"),
  },
  {
    id: "watcher",
    room: "emily",
    chapter: 3,
    text: "Look at what the figure was watching.",
    hint: "Emily's toy recorder, on her desk. Press E to use it.",
    done: (c) => c.evidence.has("emily-recorder"),
    available: (c) => c.state.get("seen:witness"),
  },
  {
    id: "recorder",
    room: "emily",
    chapter: 3,
    text: "Investigate the recording.",
    hint: "Emily's toy recorder is on her desk. Press E to use it, then play the tape.",
    done: (c) => c.evidence.has("emily-recorder"),
  },
  {
    id: "play-fake",
    room: "study",
    chapter: 5,
    text: "Play the tape that was left in the study.",
    hint: "Dad's tape deck sits on the right of the desk in the study, east of the foyer: a cream cassette deck with a red button. Look at it, press E, and play \"FOR DANIEL\".",
    done: (c) => c.evidence.hasHeard("fake"),
  },
  {
    id: "real-tapes",
    chapter: 5,
    text: "Listen to two real recordings of Emily.",
    hint: "\"EM 7 — CANDLES\" is on Dad's deck. The cassette player in the living room and Emily's toy recorder upstairs have others. Look at one and press E.",
    done: (c) => c.evidence.genuineHeard() >= 2,
    available: (c) => c.evidence.hasHeard("fake"),
  },
  {
    id: "compare-voices",
    chapter: 5,
    text: "Compare the voices in your journal.",
    hint: "Press J, open Recordings, and pick the lines Emily would never have said.",
    done: (c) => c.state.get("puzzle:voice-analysis"),
    available: (c) => c.evidence.hasHeard("fake") && c.evidence.genuineHeard() >= 2,
  },
  {
    id: "album",
    room: "study",
    chapter: 4,
    text: "Find the original photograph.",
    hint: "The family kept their prints in an album in the study, east of the foyer. The study door is locked: look for a way in.",
    done: (c) => c.evidence.has("album-print"),
  },
];

export class ObjectiveSystem {
  private override: { text: string; hint: string; room?: string } | null = null;
  private lastKey = "";
  private chapter = 0;

  constructor(
    private readonly events: EventBus,
    private readonly state: GameState,
    private readonly evidence: EvidenceSystem,
  ) {
    events.on("chapter:changed", ({ number, restored }) => {
      this.chapter = number;
      this.override = null;
      this.refresh(!restored);
    });
    events.on("evidence:added", () => this.refresh());
    events.on("flag:set", () => this.refresh());
    events.on("state:restored", () => this.refresh());
    // The finale (and any scripted scene) can set its own wording; it lasts until the next chapter or until cleared.
    events.on("objective", ({ text, hint, room }) => {
      this.override = text ? { text, hint: hint ?? "", room } : null;
      this.refresh(true);
    });
  }

  private get ctx(): Ctx {
    return { state: this.state, evidence: this.evidence };
  }

  /** The objective to show now. */
  current(): { id: string; text: string; hint: string; room?: string } {
    if (this.override) return { id: "scene", text: this.override.text, hint: this.override.hint, room: this.override.room };
    const c = this.ctx;
    for (const s of STEPS) if (s.chapter === this.chapter && !s.done(c) && (s.available?.(c) ?? true)) return { id: s.id, text: s.text, hint: s.hint, room: s.room };
    const def = CHAPTERS[Math.max(0, this.chapter - 1)];
    return { id: `chapter-${this.chapter}`, text: def?.objective ?? "", hint: "" };
  }

  /** Steps already completed, oldest first, for the journal. */
  completed(): string[] {
    const c = this.ctx;
    return STEPS.filter((s) => s.chapter < this.chapter || (s.chapter === this.chapter && s.done(c))).map((s) => s.text);
  }

  /** Re-evaluates and tells the UI if it changed. `remind` re-highlights it even if the text is the same. */
  refresh(remind = false): void {
    if (this.chapter < 2) return;
    const cur = this.current();
    const key = `${cur.id}|${cur.text}|${cur.hint}`;
    if (key === this.lastKey && !remind) return;
    const changed = key !== this.lastKey;
    this.lastKey = key;
    this.events.emit("objective:current", { id: cur.id, text: cur.text, hint: cur.hint, remind: changed || remind, room: cur.room });
  }

  /** A gentle nudge: the same objective, highlighted again. */
  remind(): void {
    this.refresh(true);
  }
}
