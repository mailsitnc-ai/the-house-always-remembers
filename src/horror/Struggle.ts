export type Dir = "←" | "↑" | "→" | "↓";

const DIRS: Dir[] = ["←", "↑", "→", "↓"];
const CODES: Record<Dir, string[]> = { "←": ["ArrowLeft", "KeyA"], "↑": ["ArrowUp", "KeyW"], "→": ["ArrowRight", "KeyD"], "↓": ["ArrowDown", "KeyS"] };

/** One grab lasts this long. If he is still held when it runs out, the chase is over. */
export const GRAB_SECONDS = 10;
const LENGTH = 5;
/** Each arrow has to be answered within this long, or progress is lost: standing still while held does not work. */
const WINDOW = 2.4;
/** Presses faster than this are ignored (mashing), and a wrong key locks the hands for this long. */
const DEBOUNCE = 0.16;
const LOCKOUT = 0.45;

export type StruggleResult = "held" | "free" | "lost";

/**
 * The escape from the Matron's grip: a short sequence of arrows, each pressed in turn within a time window. A wrong key, or letting a window run out, costs
 * progress, so only an accurate, responsive player gets through in time and mashing does not. Pure logic (no DOM, no audio): the caller feeds it key
 * presses and shows `view`.
 */
export class Struggle {
  readonly keys: Dir[] = [];
  done = 0;
  left = GRAB_SECONDS;
  windowLeft = WINDOW;
  msg = "";
  tone: "" | "ok" | "bad" = "";
  /** What happened on the last update: for the caller's audio. */
  event: "" | "hit" | "miss" | "slow" = "";
  private lock = 0;
  private since = 0;
  private msgT = 0;

  /** @param seed a different sequence for every grab, but the same one for the same seed. */
  constructor(seed: number) {
    let x = (seed * 2654435761 + 1013904223) >>> 0;
    let last = -1;
    for (let i = 0; i < LENGTH; i++) {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      let k = (x >>> 16) % 4;
      if (k === last) k = (k + 1) % 4;
      last = k;
      this.keys.push(DIRS[k]);
    }
    this.say("PRESS " + this.keys[0], "");
  }

  private say(msg: string, tone: "" | "ok" | "bad", t = 0.7): void {
    this.msg = msg;
    this.tone = tone;
    this.msgT = t;
  }

  /** The arrow glyph a key press stands for, if any. */
  static dirOf(code: string): Dir | null {
    for (const d of DIRS) if (CODES[d].includes(code)) return d;
    return null;
  }

  update(dt: number, pressed: Dir[]): StruggleResult {
    this.event = "";
    this.left -= dt;
    this.lock = Math.max(0, this.lock - dt);
    this.since += dt;
    this.windowLeft -= dt;
    this.msgT -= dt;
    if (this.msgT <= 0 && this.tone) this.say(this.done < LENGTH ? "PRESS " + this.keys[this.done] : "", "");
    for (const d of pressed) {
      if (this.lock > 0 || this.since < DEBOUNCE) continue;
      this.since = 0;
      if (d === this.keys[this.done]) {
        this.done++;
        this.windowLeft = WINDOW;
        this.event = "hit";
        this.say("GOOD", "ok", 0.35);
        if (this.done >= LENGTH) return "free";
      } else {
        this.done = Math.max(0, this.done - 1);
        this.lock = LOCKOUT;
        this.windowLeft = WINDOW;
        this.event = "miss";
        this.say("WRONG KEY", "bad");
      }
    }
    if (this.windowLeft <= 0) {
      this.windowLeft = WINDOW;
      if (this.done > 0) this.done--;
      this.event = "slow";
      this.say("TOO SLOW", "bad");
    }
    return this.left <= 0 ? "lost" : "held";
  }

  get window(): number {
    return this.windowLeft / WINDOW;
  }
}
