import type { AudioManager } from "../atmosphere/AudioManager";
import type { LightingManager } from "../atmosphere/LightingManager";
import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";
import { ChapterManager } from "./ChapterManager";
import { EvidenceSystem } from "./EvidenceSystem";
import { RecordingPlayer } from "./RecordingPlayer";
import { VOICE_TEST } from "./StoryData";
import { deductions } from "./Endings";
import { ObjectiveSystem } from "./Objectives";

/** Evidence that stirs a memory when it is found. */
const MEMORY_FOR: Record<string, string> = {
  "siblings-photo": "mem-sibling-photo",
  teddy: "mem-teddy",
  "drawing-house": "mem-drawing",
  "santa-letter": "mem-santa",
  "school-photo": "mem-school",
  "reading-chart": "mem-chart",
  calendar: "mem-calendar",
  "anna-unsent": "mem-estate",
};

/** First-visit thoughts, by room id. */
const ROOM_THOUGHT: Record<string, string> = { foyer: "room-foyer", living: "room-living", kitchen: "room-kitchen", emily: "room-emily" };

export interface VoiceTestResult {
  solved: boolean;
  /** Per line: whether the player's choice was right. */
  results: { index: number; correct: boolean; why: string }[];
}

/**
 * Connects the story systems to the game: it opens the prologue, reacts when a chapter begins, surfaces Daniel's
 * memories at the right moments, and judges the two evidence puzzles. Chapter 5 is prepared structurally only: it
 * changes the mood and makes the false tape available, and leaves a hook where Phase 4 will add the encounter.
 */
export class StoryDirector {
  readonly evidence: EvidenceSystem;
  readonly chapters: ChapterManager;
  readonly recordings: RecordingPlayer;
  readonly objectives: ObjectiveSystem;
  private room: string | null = null;
  /** Seconds spent in the living room since the objective to look at the photograph began. */
  private livingTime = 0;
  private readonly queue: { at: number; fn: () => void }[] = [];
  private clock = 0;
  private prologueActive = false;
  private readonly spoken = new Set<string>();
  /** Phase 4 hook: called when the Matron chapter begins. Nothing is registered in Phase 3. */
  onMatronChapter: (() => void) | null = null;

  constructor(
    private readonly events: EventBus,
    private readonly state: GameState,
    private readonly audio: AudioManager,
    private readonly lighting: LightingManager,
  ) {
    this.evidence = new EvidenceSystem(events, state);
    this.chapters = new ChapterManager(events, state, this.evidence);
    this.recordings = new RecordingPlayer(audio, events, this.evidence);
    this.objectives = new ObjectiveSystem(events, state, this.evidence);

    events.on("chapter:changed", ({ number, restored }) => {
      if (!restored) this.onChapter(number);
    });
    events.on("evidence:added", ({ id }) => {
      this.remember(MEMORY_FOR[id]);
      if (id === "living-photo") {
        this.evidence.introduce("m1");
        // The first small wrongness comes after the player has looked at the photograph, never before: footsteps overhead.
        this.after(10, () => {
          if (this.state.get("scripted:steps") || this.chapters.number !== 2) return;
          this.state.set("scripted:steps");
          for (let i = 0; i < 4; i++) this.after(i * 0.95, () => this.audio.distantStep());
          this.say("Someone is walking upstairs.", 0.5);
        });
      }
    });
    events.on("recording:ended", ({ id }) => {
      if (id === "open-vo" && this.prologueActive) {
        this.after(1.4, () => {
          this.events.emit("cine:photo", { show: false });
          this.audio.ring();
        });
        this.after(5.4, () => {
          if (!this.recordings.play("phonecall", 0.3)) this.returnToHouse();
        });
      }
      if (id === "phonecall" && this.prologueActive) this.after(1.6, () => this.returnToHouse());
      if (id === "return-vo" && this.prologueActive) this.after(0.8, () => this.finishPrologue());
      if (id === "fake") {
        this.evidence.introduce("m4");
        this.say("She forgave me. She said so.", 0.8);
      }
    });
  }

  /** Plays one of Daniel's short memories or thoughts, once, and only when nothing else is being said. */
  private remember(rec: string | undefined, delay = 1.4): void {
    if (!rec || this.spoken.has(rec)) return;
    this.after(delay, () => {
      if (this.prologueActive || this.recordings.playing || this.spoken.has(rec)) return;
      this.spoken.add(rec);
      this.recordings.play(rec, 0.2);
    });
  }

  /** Called when the player enters a room. A few rooms have a first-visit thought. */
  onRoom(room: string): void {
    this.room = room;
    if (this.chapters.number >= 2) this.state.set(`visited:${room}`);
    if (this.chapters.number < 2) return;
    this.remember(ROOM_THOUGHT[room], 2.2);
  }

  snapshotSpoken(): string[] {
    return [...this.spoken];
  }

  restoreSpoken(ids: string[]): void {
    this.spoken.clear();
    for (const id of ids) this.spoken.add(id);
  }

  /** A loaded game skips the opening: the prologue is over and the controls are free. */
  markResumed(): void {
    this.prologueActive = false;
  }

  /** What the evidence lets Daniel work out, for the journal. */
  deductions(): { id: string; text: string }[] {
    return deductions(this.evidence, this.state);
  }

  get chapterNumber(): number {
    return this.chapters.number;
  }

  /** Called when the player first enters the house. */
  begin(): void {
    if (this.chapters.started) return;
    this.prologueActive = true;
    this.events.emit("controls:lock", { locked: true });
    this.chapters.start();
    // Opening: a photograph of the two children and Daniel's thoughts, then the telephone, then the gate.
    this.recordings.preload("phonecall");
    this.recordings.preload("return-vo");
    this.events.emit("cine:photo", { show: true, kind: "siblings" });
    this.after(1.2, () => this.recordings.play("open-vo", 0.2));
  }

  get inPrologue(): boolean {
    return this.prologueActive;
  }

  skipPrologue(): void {
    if (!this.prologueActive) return;
    this.recordings.stop();
    this.queue.length = 0;
    this.finishPrologue();
  }

  /** Daniel's return: the screen opens on the house and the camera drifts toward the door while he thinks. */
  private returnToHouse(): void {
    if (!this.prologueActive) return;
    this.events.emit("cine:dolly", { on: true });
    this.events.emit("cine:letterbox", { on: true });
    this.recordings.play("return-vo", 0.9);
    this.after(12, () => this.finishPrologue());
  }

  private finishPrologue(): void {
    if (!this.prologueActive) return;
    this.prologueActive = false;
    this.events.emit("cine:photo", { show: false });
    this.events.emit("cine:dolly", { on: false });
    this.events.emit("cine:letterbox", { on: false });
    this.events.emit("controls:lock", { locked: false });
    this.state.set("prologue:done");
  }

  /** Advances delayed actions. Runs on game time, so pausing the game pauses the story. */
  update(dt: number): void {
    this.clock += dt;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (this.queue[i].at <= this.clock) {
        const [job] = this.queue.splice(i, 1);
        job.fn();
      }
    }
    this.recordings.update();
    this.updateHints(dt);
  }

  /**
   * Gentle reminders that never assume the player has done anything. If they linger in the living room without looking at
   * the photograph, first a thought nudges them, then the objective is highlighted again.
   */
  private updateHints(dt: number): void {
    if (this.chapters.number !== 2 || this.evidence.has("living-photo") || this.room !== "living") return;
    this.livingTime += dt;
    if (this.livingTime > 35 && !this.state.get("hint:photo1")) {
      this.state.set("hint:photo1");
      this.events.emit("thought", { text: "There's a framed photograph on the west wall. I haven't looked at it properly in years." });
    }
    if (this.livingTime > 80 && !this.state.get("hint:photo2")) {
      this.state.set("hint:photo2");
      this.objectives.remind();
    }
  }

  private after(seconds: number, fn: () => void): void {
    this.queue.push({ at: this.clock + seconds, fn });
  }

  private say(text: string, delay = 0): void {
    if (delay > 0) this.after(delay, () => this.events.emit("thought", { text }));
    else this.events.emit("thought", { text });
  }

  private surface(id: string, delay: number, thoughtText: string): void {
    this.after(delay, () => {
      this.evidence.introduce(id);
      this.events.emit("thought", { text: thoughtText });
    });
  }

  private onChapter(n: number): void {
    switch (n) {
      case 2:
        this.say("Eleven years. It looks as if nobody ever left.", 4.5);
        break;
      case 3:
        // A small disturbance, after the player has had time to settle: a door upstairs, and a light that dips.
        this.after(7, () => this.audio.creak());
        this.after(9, () => this.lighting.dip(0.9));
        this.surface("m2", 4, "I wasn't here. I came back afterwards. That's how it was.");
        this.surface("m3", 11, "We never fought. Not really. Not ever.");
        break;
      case 5:
        // Mood change only. Phase 4 attaches the Matron's encounter through onMatronChapter.
        this.after(2.5, () => {
          this.lighting.dip(2);
          this.audio.distantThump();
        });
        this.after(6, () => this.events.emit("toast", { text: "Something has been left in the tape deck in the study.", ms: 5000 }));
        this.onMatronChapter?.();
        break;
      case 6:
        this.surface("m5", 4, "They never asked me. So they never knew.");
        break;
      case 7:
        this.surface("m6", 4, "I called as soon as I could. As soon as I could.");
        break;
      default:
        break;
    }
  }

  /** The false tape only appears in the deck once the Matron chapter has begun. */
  get falseTapeAvailable(): boolean {
    return this.chapters.number >= 5;
  }

  // ---- puzzle: whose voice is this? ------------------------------------------------------------

  voiceTestStatus(): { ready: boolean; have: number; need: number; heardFake: boolean } {
    const have = this.evidence.genuineHeard();
    const heardFake = this.evidence.hasHeard("fake");
    return { ready: heardFake && have >= VOICE_TEST.needHeard, have, need: VOICE_TEST.needHeard, heardFake };
  }

  /** `picked` holds the indexes of the lines the player thinks Emily would never say. */
  submitVoiceTest(picked: number[]): VoiceTestResult {
    const results = VOICE_TEST.lines.map((l, index) => ({ index, correct: picked.includes(index) === l.wrong, why: l.why }));
    const solved = results.every((r) => r.correct);
    if (solved && !this.state.get("puzzle:voice-analysis")) {
      this.evidence.collect("tape-analysis");
      this.state.set("puzzle:voice-analysis");
      this.audio.chime();
      this.events.emit("puzzle:solved", { id: "voice-analysis" });
    }
    return { solved, results };
  }

  // ---- puzzle: put the evening in order --------------------------------------------------------

  /** `ids` are timeline event ids in the order the player chose. */
  submitNightOrder(ids: string[]): { solved: boolean; wrong: number[] } {
    const expected = this.evidence.nightOrder().map((t) => t.id);
    const wrong = expected.map((id, i) => (ids[i] === id ? -1 : i)).filter((i) => i >= 0);
    const solved = ids.length === expected.length && wrong.length === 0;
    if (solved && !this.state.get("puzzle:reconstruct")) {
      this.state.set("puzzle:reconstruct");
      this.audio.chime();
      this.events.emit("puzzle:solved", { id: "reconstruct" });
      this.events.emit("toast", { text: "The evening is in order. An hour of it is still missing.", ms: 5000 });
    }
    return { solved, wrong };
  }

  // ---- the last door ---------------------------------------------------------------------------

  /** Returns true if the front door was handled by the story. */
  onFrontDoor(): boolean {
    if (this.chapters.number < 8) return false;
    // The front door opens only once the house has finished with Daniel: after an ending.
    this.events.emit("toast", { text: "The door will not open. Not yet. She is still in the house.", ms: 4500 });
    return true;
  }
}
