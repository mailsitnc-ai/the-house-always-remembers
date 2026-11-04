export type GamePhase = "loading" | "menu" | "playing" | "paused" | "inspecting" | "keypad" | "resuming" | "journal" | "recorder";

export interface GameEvents {
  "phase:changed": { from: GamePhase; to: GamePhase };
  "hint": { text: string | null };
  "toast": { text: string; ms?: number };
  "inspect:open": { id: string; title: string; text: string };
  "inspect:close": { id: string };
  "keypad:open": { id: string };
  "puzzle:solved": { id: string };
  "flag:set": { key: string; value: boolean };
  "inventory:changed": { items: { id: string; name: string }[] };
  "room:changed": { room: string };
  "evidence:added": { id: string; title: string; optional: boolean };
  "memory:added": { id: string };
  "memory:changed": { id: string };
  "chapter:changed": { number: number; title: string; objective: string; restored?: boolean };
  "state:restored": Record<string, never>;
  "save:done": { kind: "auto" | "manual" };
  "ending:start": { id: string };
  "cine:reveal": { on: boolean };
  "objective:current": { id: string; text: string; hint: string; remind: boolean };
  "finale:arrived": Record<string, never>;
  "choices:show": { choices: { id: string; text: string }[] };
  "choices:hide": Record<string, never>;
  "choice": { id: string };
  "card": { title: string; text: string; ms: number } | { title: null };
  "credits:show": { ending: string };
  "credits:done": Record<string, never>;
  "objective": { text: string; hint?: string };
  /** The Matron's proximity during the chase (0 = far or Daniel is in the light, 1 = at his shoulder). */
  "chase:danger": { level: number };
  /** The grab struggle. `on` false hides it. `keys` are arrow glyphs; `done` is how many are cleared. */
  "struggle": { on: boolean; keys: string[]; done: number; left: number; total: number; window: number; msg: string; tone: "" | "ok" | "bad" };
  "scare": { id: string; visual: boolean };
  "thought": { text: string };
  "subtitle": { speaker: string; text: string };
  "subtitle:clear": Record<string, never>;
  "recording:started": { id: string };
  "recording:ended": { id: string };
  "journal:open": { tab?: string };
  "recorder:open": { deckId: string };
  "controls:lock": { locked: boolean };
  "story:end": Record<string, never>;
  "cine:photo": { show: boolean; kind?: string };
  "cine:letterbox": { on: boolean };
  "cine:dolly": { on: boolean };
  "veil": { opacity: number; ms: number; color?: string };
  "byebye": { on: boolean };
  "postcredits:done": Record<string, never>;
}

type Handler<T> = (payload: T) => void;

/** Minimal typed pub/sub. Systems talk through events instead of holding references to each other. */
export class EventBus {
  private readonly handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    this.handlers.get(event)?.forEach((h) => (h as Handler<GameEvents[K]>)(payload));
  }
}
