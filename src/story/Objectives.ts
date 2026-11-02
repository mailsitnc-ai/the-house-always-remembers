import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";
import type { EvidenceSystem } from "./EvidenceSystem";
import { CHAPTERS } from "./StoryData";

interface Step {
  id: string;
  chapter: number;
  text: string;
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
 * Nothing here points at an object the player cannot currently use.
 */
const STEPS: Step[] = [
  { id: "living", chapter: 2, text: "The lights are on, and nobody should be here. Start with the living room.", done: (c) => c.state.get("visited:living") },
  { id: "photo", chapter: 2, text: "A family photograph hangs on the living room's west wall. Look at it closely.", done: (c) => c.evidence.has("living-photo") },
  { id: "ground", chapter: 2, text: "Look through the rest of the ground floor for what has changed. Read what the family left.", done: (c) => c.evidence.has("kitchen-note") },
  { id: "upstairs", chapter: 3, text: "Something moved upstairs. Find Emily's room.", done: (c) => c.state.get("visited:emily") },
  {
    id: "watcher",
    chapter: 3,
    text: "Someone stood in Emily's room, facing her tape recorder. Go and look at what it was looking at.",
    done: (c) => c.evidence.has("emily-recorder"),
    available: (c) => c.state.get("seen:witness"),
  },
  { id: "recorder", chapter: 3, text: "Look through Emily's room, and listen to what she recorded.", done: (c) => c.evidence.has("emily-recorder") },
];

export class ObjectiveSystem {
  private override: string | null = null;
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
    events.on("objective", ({ text }) => {
      this.override = text || null;
      this.refresh(true);
    });
  }

  private get ctx(): Ctx {
    return { state: this.state, evidence: this.evidence };
  }

  /** The objective to show now. */
  current(): { id: string; text: string } {
    if (this.override) return { id: "scene", text: this.override };
    const c = this.ctx;
    for (const s of STEPS) if (s.chapter === this.chapter && !s.done(c) && (s.available?.(c) ?? true)) return { id: s.id, text: s.text };
    const def = CHAPTERS[Math.max(0, this.chapter - 1)];
    return { id: `chapter-${this.chapter}`, text: def?.objective ?? "" };
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
    const key = `${cur.id}|${cur.text}`;
    if (key === this.lastKey && !remind) return;
    const changed = key !== this.lastKey;
    this.lastKey = key;
    this.events.emit("objective:current", { id: cur.id, text: cur.text, remind: changed || remind });
  }

  /** A gentle nudge: the same objective, highlighted again. */
  remind(): void {
    this.refresh(true);
  }
}
