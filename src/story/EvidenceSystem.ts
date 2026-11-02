import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";
import { EVIDENCE, RECOLLECTIONS, TIMELINE, TIMELINE_GAP, RECORDINGS, type EvidenceDef, type RecollectionDef, type TimelineEventDef } from "./StoryData";

export interface FoundEvidence {
  def: EvidenceDef;
  /** Order of discovery, starting at 1. */
  order: number;
  /** Small picture of the object, if it has one (photographs, documents, drawings). */
  thumb: string | null;
}

export type MemoryStatus = "held" | "doubted" | "refuted";

export interface MemoryView {
  def: RecollectionDef;
  status: MemoryStatus;
  /** Evidence found so far that contradicts it. */
  because: EvidenceDef[];
}

export type TimelineRow =
  | { kind: "event"; def: TimelineEventDef; known: boolean }
  | { kind: "gap"; time: string; text: string };

/**
 * Everything the player has found, what Daniel believes, and what the evidence says about both.
 * Story content lives in StoryData; this class only tracks state and emits events.
 */
export class EvidenceSystem {
  private readonly defs = new Map(EVIDENCE.map((e) => [e.id, e]));
  private readonly found = new Map<string, FoundEvidence>();
  private readonly introduced = new Set<string>();
  private readonly heard = new Set<string>();

  constructor(
    private readonly events: EventBus,
    private readonly state: GameState,
  ) {}

  has(id: string): boolean {
    return this.found.has(id);
  }

  get(id: string): FoundEvidence | undefined {
    return this.found.get(id);
  }

  def(id: string): EvidenceDef {
    const d = this.defs.get(id);
    if (!d) throw new Error(`Unknown evidence id: ${id}`);
    return d;
  }

  /** Adds evidence. Returns true the first time. `source` supplies the thumbnail picture. */
  collect(id: string, source?: HTMLCanvasElement | null): boolean {
    const def = this.def(id);
    if (this.found.has(id)) return false;
    let thumb: string | null = null;
    try {
      // A small JPEG is plenty for the journal and keeps memory low (about 10 KB instead of 130 KB).
      if (source) {
        const k = 192 / Math.max(source.width, source.height);
        const c = document.createElement("canvas");
        c.width = Math.round(source.width * k);
        c.height = Math.round(source.height * k);
        c.getContext("2d")?.drawImage(source, 0, 0, c.width, c.height);
        thumb = c.toDataURL("image/jpeg", 0.8);
      }
    } catch {
      thumb = null;
    }
    this.found.set(id, { def, order: this.found.size + 1, thumb });
    this.state.set(`evidence:${id}`);
    this.events.emit("evidence:added", { id, title: def.title, optional: !!def.optional });
    for (const m of RECOLLECTIONS) if (this.introduced.has(m.id) && m.contradictedBy.includes(id)) this.events.emit("memory:changed", { id: m.id });
    if (def.thought) this.events.emit("thought", { text: def.thought });
    return true;
  }

  /** What a save stores: the evidence found (with order and thumbnail), memories shown, and recordings heard. */
  snapshot(): { found: { id: string; order: number; thumb: string | null }[]; introduced: string[]; heard: string[] } {
    return {
      found: [...this.found.values()].map((f) => ({ id: f.def.id, order: f.order, thumb: f.thumb })),
      introduced: [...this.introduced],
      heard: [...this.heard],
    };
  }

  /** Rebuilds the journal state from a save. Unknown ids (from an older or newer build) are skipped. */
  restore(s: { found: { id: string; order: number; thumb: string | null }[]; introduced: string[]; heard: string[] }): void {
    this.found.clear();
    this.introduced.clear();
    this.heard.clear();
    for (const f of s.found) {
      const def = this.defs.get(f.id);
      if (def) this.found.set(f.id, { def, order: f.order, thumb: f.thumb });
    }
    for (const id of s.introduced) this.introduced.add(id);
    for (const id of s.heard) this.heard.add(id);
  }

  list(): FoundEvidence[] {
    return [...this.found.values()].sort((a, b) => a.order - b.order);
  }

  /** Counts for the journal header. Totals are deliberately not exposed. */
  counts(): { key: number; optional: number } {
    let key = 0;
    let optional = 0;
    for (const f of this.found.values()) f.def.optional ? optional++ : key++;
    return { key, optional };
  }

  // ---- recordings ------------------------------------------------------------------------------

  markHeard(recordingId: string): void {
    this.heard.add(recordingId);
    const e = EVIDENCE.find((x) => x.recording === recordingId);
    if (e) this.collect(e.id);
  }

  hasHeard(recordingId: string): boolean {
    return this.heard.has(recordingId);
  }

  heardRecordings(): string[] {
    return RECORDINGS.filter((r) => this.heard.has(r.id)).map((r) => r.id);
  }

  /** How many of Emily's genuine recordings have been heard. */
  genuineHeard(): number {
    return RECORDINGS.filter((r) => r.genuine && this.heard.has(r.id)).length;
  }

  // ---- memories --------------------------------------------------------------------------------

  /** Surfaces one of Daniel's recollections in the journal. */
  introduce(id: string): void {
    if (this.introduced.has(id)) return;
    this.introduced.add(id);
    this.events.emit("memory:added", { id });
  }

  memories(): MemoryView[] {
    return RECOLLECTIONS.filter((m) => this.introduced.has(m.id)).map((def) => {
      const because = def.contradictedBy.filter((id) => this.found.has(id)).map((id) => this.def(id));
      const status: MemoryStatus = because.length === 0 ? "held" : because.length === def.contradictedBy.length ? "refuted" : "doubted";
      return { def, status, because };
    });
  }

  memory(id: string): MemoryView | undefined {
    return this.memories().find((m) => m.def.id === id);
  }

  // ---- timeline --------------------------------------------------------------------------------

  /** Rows for the evening. Essential events not yet found appear as unknowns, so the player can see what is missing. */
  night(): TimelineRow[] {
    const rows: TimelineRow[] = [];
    const events = TIMELINE.filter((t) => t.lane === "night").sort((a, b) => a.order - b.order);
    for (const t of events) {
      if (t.order === 4) rows.push({ kind: "gap", ...TIMELINE_GAP });
      rows.push({ kind: "event", def: t, known: this.found.has(t.evidence) });
    }
    return rows;
  }

  /** Rows for the aftermath. Only discovered events are shown. */
  after(): TimelineRow[] {
    return TIMELINE.filter((t) => t.lane === "after" && this.found.has(t.evidence))
      .sort((a, b) => a.order - b.order)
      .map((def) => ({ kind: "event", def, known: true }) as TimelineRow);
  }

  /** The essential events of the night, in the correct order. */
  nightOrder(): TimelineEventDef[] {
    return TIMELINE.filter((t) => t.lane === "night" && t.essential).sort((a, b) => a.order - b.order);
  }

  nightKnown(): boolean {
    return this.nightOrder().every((t) => this.found.has(t.evidence));
  }
}
