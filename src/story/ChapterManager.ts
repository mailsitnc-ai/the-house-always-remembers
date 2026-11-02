import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";
import type { EvidenceSystem } from "./EvidenceSystem";
import { CHAPTERS, type ChapterDef } from "./StoryData";

/**
 * The eight chapters, in fixed order. A chapter is complete when its condition is met; completion is checked whenever
 * evidence or a flag changes, so evidence found early still counts when its chapter arrives.
 */
export class ChapterManager {
  private index = -1;
  private readonly complete: ((e: EvidenceSystem, s: GameState) => boolean)[] = [
    (_e, s) => s.get("prologue:done"),
    (e) => e.has("living-photo") && e.has("kitchen-note"),
    (e) => e.has("emily-recorder"),
    (e) => e.has("album-print"),
    (_e, s) => s.get("puzzle:voice-analysis"),
    (e) => e.has("anna-letter"),
    (_e, s) => s.get("puzzle:reconstruct"),
    (_e, s) => s.get("ending:done"),
  ];

  constructor(
    private readonly events: EventBus,
    private readonly state: GameState,
    private readonly evidence: EvidenceSystem,
  ) {
    events.on("evidence:added", () => this.evaluate());
    events.on("flag:set", () => this.evaluate());
  }

  get current(): ChapterDef {
    return CHAPTERS[Math.max(0, this.index)];
  }

  get number(): number {
    return this.index + 1;
  }

  get started(): boolean {
    return this.index >= 0;
  }

  start(): void {
    if (this.started) return;
    this.enter(0);
    this.evaluate();
  }

  /** Puts the story at a saved chapter without replaying its introduction. */
  restore(number: number): void {
    const i = Math.max(0, Math.min(CHAPTERS.length - 1, number - 1));
    this.index = i;
    const c = CHAPTERS[i];
    this.events.emit("chapter:changed", { number: c.number, title: c.title, objective: c.objective, restored: true });
  }

  /** Moves on through every chapter whose condition is already satisfied. */
  evaluate(): void {
    if (!this.started) return;
    while (this.index < CHAPTERS.length - 1 && this.complete[this.index](this.evidence, this.state)) this.enter(this.index + 1);
  }

  private enter(i: number): void {
    this.index = i;
    const c = CHAPTERS[i];
    this.state.set(`chapter:${c.number}`);
    this.events.emit("chapter:changed", { number: c.number, title: c.title, objective: c.objective });
  }
}
