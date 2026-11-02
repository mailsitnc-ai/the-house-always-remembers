import type { EventBus } from "./EventBus";

/** Boolean story/puzzle flags. Will become the basis of save data in a later phase. */
export class GameState {
  private readonly flags = new Map<string, boolean>();

  constructor(private readonly events: EventBus) {}

  get(key: string): boolean {
    return this.flags.get(key) ?? false;
  }

  /** Every flag that is currently true. This is what a save stores. */
  snapshot(): string[] {
    return [...this.flags].filter(([, v]) => v).map(([k]) => k);
  }

  /** Replaces all flags with a saved set, without raising per-flag events (systems re-sync on "state:restored"). */
  restore(keys: string[]): void {
    this.flags.clear();
    for (const k of keys) this.flags.set(k, true);
    this.events.emit("state:restored", {});
  }

  set(key: string, value = true): void {
    if (this.get(key) === value) return;
    this.flags.set(key, value);
    this.events.emit("flag:set", { key, value });
  }
}
