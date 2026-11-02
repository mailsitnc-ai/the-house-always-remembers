/** The save format version. Bump it when the shape changes and add a step to `migrate`. */
export const SAVE_VERSION = 1;
/** Default storage namespace. Developer tools use another one so they can never touch a real player's save. */
const DEFAULT_NAMESPACE = "thar";

export interface SaveData {
  v: number;
  savedAt: string;
  /** Why this save was made, for the Continue button ("Chapter 4 · Family portraits"). */
  label: string;
  chapter: number;
  flags: string[];
  evidence: { found: { id: string; order: number; thumb: string | null }[]; introduced: string[]; heard: string[] };
  inventory: { id: string; name: string }[];
  /** Recordings and thoughts that have already played once. */
  spoken: string[];
  /** Encounters and scares that must not repeat. */
  horror: { done: string[]; witness: string[]; scares: string[] };
  /** Where the player stands. Only ever a position the collision system produced, so it is always valid. */
  player: { x: number; z: number; level: 0 | 1; yaw: number };
}

export interface SaveMeta {
  /** Endings the player has reached, across all playthroughs. */
  endings: string[];
}

/** What the save system needs from the rest of the game. */
export interface SaveProviders {
  capture(): Omit<SaveData, "v" | "savedAt">;
  apply(data: SaveData): void;
}

export type ReadResult = { ok: true; data: SaveData } | { ok: false; reason: "none" | "corrupt" | "newer" };

/**
 * Versioned browser save. A save that cannot be read is moved aside (never deleted silently) so the player is not locked
 * out, and a save from a newer build is left untouched and refused. Storage can be blocked, so every access is guarded.
 */
export class SaveSystem {
  private readonly KEY: string;
  private readonly BACKUP_KEY: string;
  private readonly META_KEY: string;

  constructor(
    private readonly providers: SaveProviders,
    namespace = DEFAULT_NAMESPACE,
  ) {
    this.KEY = `${namespace}.save`;
    this.BACKUP_KEY = `${namespace}.save.unreadable`;
    this.META_KEY = `${namespace}.meta`;
  }

  /** Brings an older save up to the current shape. Returns null if it cannot be understood. */
  static migrate(raw: unknown): SaveData | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.v !== "number") return null;
    // Future: if (r.v === 1) { ...convert to 2... }
    if (r.v !== SAVE_VERSION) return null;
    const ok =
      typeof r.chapter === "number" && Array.isArray(r.flags) && !!r.evidence && Array.isArray(r.inventory) && Array.isArray(r.spoken) && !!r.horror && !!r.player;
    return ok ? (r as unknown as SaveData) : null;
  }

  read(): ReadResult {
    let text: string | null = null;
    try {
      text = localStorage.getItem(this.KEY);
    } catch {
      return { ok: false, reason: "none" };
    }
    if (!text) return { ok: false, reason: "none" };
    try {
      const parsed = JSON.parse(text) as { v?: number };
      if (typeof parsed.v === "number" && parsed.v > SAVE_VERSION) return { ok: false, reason: "newer" };
      const data = SaveSystem.migrate(parsed);
      if (data) return { ok: true, data };
    } catch {
      /* falls through to the unreadable case */
    }
    try {
      localStorage.setItem(this.BACKUP_KEY, text);
      localStorage.removeItem(this.KEY);
    } catch {
      /* ignore */
    }
    return { ok: false, reason: "corrupt" };
  }

  hasSave(): boolean {
    return this.read().ok;
  }

  write(): boolean {
    try {
      const data: SaveData = { v: SAVE_VERSION, savedAt: new Date().toISOString(), ...this.providers.capture() };
      localStorage.setItem(this.KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  load(): ReadResult {
    const r = this.read();
    if (r.ok) this.providers.apply(r.data);
    return r;
  }

  clear(): void {
    try {
      localStorage.removeItem(this.KEY);
    } catch {
      /* ignore */
    }
  }

  meta(): SaveMeta {
    try {
      const m = JSON.parse(localStorage.getItem(this.META_KEY) ?? "null") as SaveMeta | null;
      if (m && Array.isArray(m.endings)) return m;
    } catch {
      /* ignore */
    }
    return { endings: [] };
  }

  /** Remembers an ending across playthroughs. It never affects a new game. */
  recordEnding(id: string): void {
    const m = this.meta();
    if (!m.endings.includes(id)) m.endings.push(id);
    try {
      localStorage.setItem(this.META_KEY, JSON.stringify(m));
    } catch {
      /* ignore */
    }
  }

  clearMeta(): void {
    try {
      localStorage.removeItem(this.META_KEY);
    } catch {
      /* ignore */
    }
  }
}
