import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AudioManager } from "../atmosphere/AudioManager";
import type { EventBus } from "../core/EventBus";
import type { EvidenceSystem } from "./EvidenceSystem";
import { DialogueSystem, type DialogueSchedule } from "./DialogueSystem";
import { RECORDINGS, type RecordingDef } from "./StoryData";
import { FINALE_RECORDINGS } from "./FinaleData";

interface Current {
  rec: RecordingDef;
  schedule: DialogueSchedule | null;
  shown: number;
  /** Set when stop() is called while clips are still loading. */
  cancelled: boolean;
}

/**
 * Plays a recording and shows its subtitles. One recording at a time. Dialogue is real audio when clips are available;
 * subtitles follow the audio clock and the real clip lengths, so they stay in step with the voice. If audio is missing or
 * blocked the recording still runs as subtitles. Hearing a recording adds it to the evidence.
 */
export class RecordingPlayer {
  private current: Current | null = null;
  readonly dialogue: DialogueSystem;
  /** Called every frame while a recording plays; used to place the voice or drive mouth movement. */
  onLevel: ((level: number) => void) | null = null;

  constructor(
    private readonly audio: AudioManager,
    private readonly events: EventBus,
    private readonly evidence: EvidenceSystem,
  ) {
    this.dialogue = new DialogueSystem(audio);
  }

  /** Id of the recording that is playing or about to play. */
  get playing(): string | null {
    return this.current?.rec.id ?? null;
  }

  /** True once its sound (or subtitles) has actually started. */
  get started(): boolean {
    return !!this.current?.schedule;
  }

  static find(id: string): RecordingDef {
    const r = RECORDINGS.find((x) => x.id === id) ?? FINALE_RECORDINGS.find((x) => x.id === id);
    if (!r) throw new Error(`Unknown recording: ${id}`);
    return r;
  }

  /** Starts loading a recording's clips so it can play without delay. */
  preload(id: string): void {
    void this.dialogue.preload(RecordingPlayer.find(id));
  }

  /** Starts a recording. `position` places the voice at a point in the house. */
  play(id: string, lead = 0.4, position?: Vector3): boolean {
    this.stop();
    const rec = RecordingPlayer.find(id);
    const cur: Current = { rec, schedule: null, shown: -1, cancelled: false };
    this.current = cur;
    this.events.emit("recording:started", { id });
    this.evidence.markHeard(id);
    void this.dialogue.play(rec, lead, position).then((schedule) => {
      if (cur.cancelled) {
        schedule.stop();
        return;
      }
      cur.schedule = schedule;
    });
    return true;
  }

  stop(): void {
    const c = this.current;
    if (!c) return;
    c.cancelled = true;
    c.schedule?.stop();
    this.current = null;
    this.events.emit("subtitle:clear", {});
    this.events.emit("recording:ended", { id: c.rec.id });
  }

  update(): void {
    const c = this.current;
    if (!c || !c.schedule) return;
    const s = c.schedule;
    const t = this.audio.now() - s.startTime;
    this.onLevel?.(this.audio.dialogueLevel());
    for (let i = s.starts.length - 1; i >= 0; i--) {
      if (t >= s.starts[i]) {
        if (c.shown !== i) {
          c.shown = i;
          const line = c.rec.lines[i];
          this.events.emit("subtitle", { speaker: line.speaker, text: line.text });
        }
        break;
      }
    }
    if (t > s.total) {
      const id = c.rec.id;
      this.current = null;
      this.events.emit("subtitle:clear", {});
      this.events.emit("recording:ended", { id });
    }
  }
}
