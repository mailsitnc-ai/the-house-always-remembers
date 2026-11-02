import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";

export const STUDY_CODE = "317";

interface CodePuzzle {
  code: string;
  onSolved: () => void;
}

/** Registry of code-lock puzzles. The world registers them; the keypad UI submits attempts here. */
export class PuzzleSystem {
  private readonly puzzles = new Map<string, CodePuzzle>();

  constructor(
    private readonly state: GameState,
    private readonly events: EventBus,
  ) {}

  registerCode(id: string, code: string, onSolved: () => void): void {
    this.puzzles.set(id, { code, onSolved });
  }

  codeLength(id: string): number {
    return this.puzzles.get(id)?.code.length ?? 0;
  }

  /** Re-applies the effect of every puzzle that was solved when a save was made (for example, an unlocked door). */
  reapplySolved(): void {
    for (const [id, p] of this.puzzles) if (this.isSolved(id)) p.onSolved();
  }

  isSolved(id: string): boolean {
    return this.state.get(`puzzle:${id}`);
  }

  attempt(id: string, entered: string): boolean {
    const p = this.puzzles.get(id);
    if (!p || this.isSolved(id)) return false;
    if (entered !== p.code) return false;
    this.state.set(`puzzle:${id}`);
    p.onSolved();
    this.events.emit("puzzle:solved", { id });
    return true;
  }
}
