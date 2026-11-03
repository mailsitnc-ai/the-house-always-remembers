import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";
import type { AudioManager } from "../atmosphere/AudioManager";
import type { LightingManager } from "../atmosphere/LightingManager";
import type { Flashlight } from "../atmosphere/Flashlight";
import type { PlayerController } from "../player/PlayerController";
import type { HorrorDirector } from "../horror/HorrorDirector";
import type { Stage } from "../world/Stage";
import { STAGE_ORIGIN } from "../world/Stage";
import type { StoryDirector } from "./StoryDirector";
import type { SaveSystem } from "../platform/SaveSystem";
import { ROUNDS, factsOf, type EndingId, type Round } from "./Endings";

/** Things a scene script can wait for. */
type Wait =
  | number
  | { rec: string }
  | { choose: Round["id"] }
  | { glide: { pos?: [number, number, number]; yaw?: number; pitch?: number; t: number } };

type Script = Generator<Wait, void, string | undefined>;

function isChoose(w: Wait | null): boolean {
  return !!w && typeof w === "object" && "choose" in w;
}

const BATHROOM_BACK = { x: 9.8, z: 9.0, level: 1 as const, yaw: -Math.PI / 2 };
const FOYER = { x: 6.5, z: 1.0, level: 0 as const, yaw: 0 };

const ENDING_CARDS: Record<EndingId, { title: string; text: string }> = {
  denial: { title: "DENIAL — THE ESCAPE", text: "Daniel chose comfort over the truth. The house kept him." },
  recognition: { title: "RECOGNITION — THE CONFESSION", text: "Daniel accepted what he did. He does not yet understand what was waiting for him." },
  true: { title: "THE HOUSE ALWAYS REMEMBERS", text: "Daniel faced the truth, and refused to let anything else decide what he does with it." },
};

/**
 * Chapter 8, THE LAST DOOR, as a set of scripted scenes: the mirror, the hunt, Emily's room, the confrontation and the
 * three endings. Each scene is a generator that yields what it is waiting for, so a scene reads top to bottom, can be
 * skipped by running it forward, and never leaves timers behind. Which ending plays is decided by Endings.ts alone.
 */
export class Finale {
  private run: Script | null = null;
  private wait: Wait | null = null;
  private waitLeft = 0;
  private glideFrom: { pos: Vector3; yaw: number; pitch: number } | null = null;
  private skipping = false;
  private recDone = false;
  private choices: { id: string; text: string }[] = [];
  private cam = { pos: new Vector3(), yaw: 0, pitch: 0 };
  private clock = 0;
  private mirrorT = -1;
  private mirrorMode = 0;
  private lastEnding: EndingId | null = null;

  constructor(
    private readonly d: {
      events: EventBus;
      state: GameState;
      audio: AudioManager;
      lighting: LightingManager;
      flashlight: Flashlight;
      player: PlayerController;
      horror: HorrorDirector;
      story: StoryDirector;
      stage: Stage;
      save: SaveSystem;
    },
  ) {
    const { events, state } = d;
    events.on("chapter:changed", ({ number, restored }) => {
      if (number !== 8) return;
      if (!restored) {
        events.emit("objective", { text: "The bathroom light is on. Something is waiting in the mirror." });
        this.after(5, () => events.emit("thought", { text: "The bathroom light is on. I didn't switch it on." }));
      } else this.resumeFromSave();
    });
    events.on("room:changed", ({ room }) => {
      if (room === "Bathroom" && d.story.chapterNumber === 8 && !state.get("seen:mirror") && !this.run) this.start(this.mirrorScene());
    });
    events.on("finale:arrived", () => {
      if (!this.run && d.story.chapterNumber === 8) this.start(this.chamberScene());
    });
    events.on("recording:ended", () => (this.recDone = true));
    events.on("choice", ({ id }) => this.onChoice(id));
  }

  get busy(): boolean {
    return this.run !== null;
  }

  private jobs: { at: number; fn: () => void }[] = [];
  private after(s: number, fn: () => void): void {
    this.jobs.push({ at: this.clock + s, fn });
  }

  /** After loading a chapter 8 save: the mirror is armed again, or the hunt resumes. */
  private resumeFromSave(): void {
    const { state, events } = this.d;
    if (state.get("ending:done")) return;
    if (state.get("seen:mirror")) this.beginHunt();
    else events.emit("objective", { text: "The bathroom light is on. Something is waiting in the mirror." });
  }

  private beginHunt(): void {
    this.d.horror.beginHunt();
    this.d.events.emit("objective", { text: "She has stopped pretending. Get to Emily's room upstairs. She will not follow you into lamplight." });
  }

  // ---- running scenes ----------------------------------------------------------------------------

  private start(script: Script): void {
    const { events, player, horror, flashlight } = this.d;
    this.run = script;
    this.wait = null;
    this.skipping = false;
    this.cam = { pos: player.position.clone(), yaw: player.camera.rotation.y, pitch: player.camera.rotation.x };
    horror.enabled = false;
    if (!flashlight.on) flashlight.toggle();
    events.emit("controls:lock", { locked: true });
    events.emit("cine:reveal", { on: true });
    this.advance();
  }

  private finish(): void {
    const { events, horror } = this.d;
    this.run = null;
    this.wait = null;
    this.skipping = false;
    this.holdChoices = false;
    this.mirrorT = -1;
    this.d.events.emit("choices:hide", {});
    this.d.events.emit("subtitle:clear", {});
    events.emit("cine:letterbox", { on: false });
    events.emit("controls:lock", { locked: false });
    horror.enabled = true;
  }

  /** Skips to the end of the current scene (it still sets everything the story needs). Choices are never skipped. */
  skip(): void {
    if (!this.run || isChoose(this.wait)) return;
    this.skipping = true;
    this.d.story.recordings.stop();
    this.advance();
  }

  private advance(value?: string): void {
    while (this.run) {
      const r = this.run.next(value);
      value = undefined;
      if (r.done) {
        this.finish();
        return;
      }
      const w = r.value;
      if (this.skipping && (typeof w === "number" || "rec" in w)) continue;
      if (this.skipping && typeof w === "object" && "glide" in w) {
        this.applyGlide(w.glide, 1);
        continue;
      }
      this.wait = w;
      this.recDone = false;
      if (typeof w === "number") this.waitLeft = w;
      else if ("rec" in w) this.d.story.recordings.play(w.rec, 0.15);
      else if ("choose" in w) {
        this.skipping = false;
        // The choices wait for the Matron's transformation to finish, however quickly the scene was skipped to here.
        if (this.transformPending()) this.holdChoices = true;
        else this.showChoices();
      } else {
        this.waitLeft = w.glide.t;
        this.glideFrom = { pos: this.cam.pos.clone(), yaw: this.cam.yaw, pitch: this.cam.pitch };
      }
      return;
    }
  }

  private currentRound: Round["id"] = "offer";
  private holdChoices = false;

  /**
   * The choices wait for the Matron's transformation. This is decided by the story (the chamber scene), not by her animation level, so a scene that
   * has been skipped through at once, before her level has even risen, is still held until the 21-second sequence has finished.
   */
  private transformPending(): boolean {
    const m = this.d.horror.matron;
    return m.visible && this.d.state.get("finale:chamber") && !m.transformFinished;
  }

  private showChoices(): void {
    const round = ROUNDS[this.currentRound];
    this.choices = round.choices(factsOf(this.d.story.evidence, this.d.state));
    this.d.events.emit("choices:show", { choices: this.choices });
  }

  private onChoice(id: string): void {
    if (!isChoose(this.wait)) return;
    if (!this.choices.some((c) => c.id === id)) return;
    this.d.events.emit("choices:hide", {});
    this.advance(id);
  }

  private applyGlide(g: { pos?: [number, number, number]; yaw?: number; pitch?: number }, k: number): void {
    const from = this.glideFrom ?? { pos: this.cam.pos.clone(), yaw: this.cam.yaw, pitch: this.cam.pitch };
    const e = k * k * (3 - 2 * k);
    if (g.pos) this.cam.pos.copyFromFloats(from.pos.x + (g.pos[0] - from.pos.x) * e, from.pos.y + (g.pos[1] - from.pos.y) * e, from.pos.z + (g.pos[2] - from.pos.z) * e);
    if (g.yaw !== undefined) this.cam.yaw = from.yaw + (g.yaw - from.yaw) * e;
    if (g.pitch !== undefined) this.cam.pitch = from.pitch + (g.pitch - from.pitch) * e;
  }

  update(dt: number): void {
    this.clock += dt;
    for (let i = this.jobs.length - 1; i >= 0; i--) if (this.jobs[i].at <= this.clock) this.jobs.splice(i, 1)[0].fn();
    if (!this.run) return;
    this.d.horror.stageUpdate(dt);
    const w = this.wait;
    if (typeof w === "number") {
      this.waitLeft -= dt;
      if (this.waitLeft <= 0) this.advance();
    } else if (w && "rec" in w) {
      if (this.recDone) this.advance();
    } else if (w && "glide" in w) {
      this.waitLeft -= dt;
      this.applyGlide(w.glide, Math.min(1, 1 - this.waitLeft / w.glide.t));
      if (this.waitLeft <= 0) {
        this.applyGlide(w.glide, 1);
        this.glideFrom = null;
        this.advance();
      }
    }
    if (this.holdChoices && !this.transformPending()) {
      this.holdChoices = false;
      this.showChoices();
    }
    if (this.mirrorT >= 0) this.updateMirror(dt);
    // The camera is ours for the whole scene, whichever wait is active.
    const p = this.d.player;
    p.position.copyFrom(this.cam.pos);
    p.setLook(this.cam.yaw, this.cam.pitch);
  }

  // ---- helpers for scripts -------------------------------------------------------------------------

  private setCam(x: number, y: number, z: number, yaw: number, pitch = 0): void {
    this.cam.pos.copyFromFloats(x, y, z);
    this.cam.yaw = yaw;
    this.cam.pitch = pitch;
    this.d.player.setBase(0);
  }

  private veil(opacity: number, ms: number, color = "#000"): void {
    this.d.events.emit("veil", { opacity, ms, color });
  }

  private place(x: number, z: number, level: 0 | 1, yaw: number): void {
    this.d.player.setBase(level * 3);
    this.cam.pos.copyFromFloats(x, level * 3 + 1.65, z);
    this.cam.yaw = yaw;
    this.cam.pitch = 0;
  }

  // ---- scene: the mirror ---------------------------------------------------------------------------

  private *mirrorScene(): Script {
    const { events, state, stage, audio } = this.d;
    const O = STAGE_ORIGIN;
    this.veil(1, 900);
    yield 1.1;
    state.set("finale:mirror");
    stage.show("mirror", 0.5);
    events.emit("cine:letterbox", { on: true });
    // Daniel stands at the sink of a bathroom he remembers; the mirror is in front of him.
    this.setCam(O.x, 1.65, O.z + 0.45, 0, 0.02);
    this.mirrorT = 0;
    this.mirrorMode = 0;
    this.veil(0, 1600);
    audio.setRoomAmbience("bathroom");
    yield 2.4;
    yield { rec: "fin-mirror-1" };
    yield 2.5;
    this.mirrorMode = 1; // it starts to lag behind him
    yield { rec: "fin-mirror-2" };
    yield 2.2;
    this.mirrorMode = 2; // it moves on its own
    yield 4;
    this.mirrorMode = 3; // it comes to the glass
    yield { rec: "fin-mirror-3" };
    yield 1.2;
    audio.stinger("sting");
    this.mirrorMode = 4; // the face at the glass
    stage.setLamp(0.15);
    yield 1.3;
    this.veil(1, 120, "#d8e4ea");
    yield 0.5;
    stage.hide();
    this.mirrorT = -1;
    state.set("seen:mirror");
    this.place(BATHROOM_BACK.x, BATHROOM_BACK.z, BATHROOM_BACK.level, BATHROOM_BACK.yaw);
    this.veil(0, 1800);
    audio.setRoomAmbience("bathroom");
    yield { rec: "fin-mirror-4" };
    yield 1;
    this.beginHunt();
    this.d.save.write();
    events.emit("save:done", { kind: "auto" });
  }

  /** Animates the reflection. It begins as an exact copy and stops being one. */
  private updateMirror(dt: number): void {
    const f = this.d.stage.figure;
    if (!f) return;
    this.mirrorT += dt;
    const t = this.mirrorT;
    const O = STAGE_ORIGIN;
    const sway = (u: number) => Math.sin(u * 0.9) * 0.03;
    // Daniel barely moves: a slow breath.
    this.cam.pos.x = O.x + sway(t);
    this.cam.pos.y = 1.65 + Math.sin(t * 1.3) * 0.006;
    const mode = this.mirrorMode;
    let x = O.x + sway(t);
    let z = O.z + 0.15;
    if (mode === 1) x = O.x + sway(t - 0.7); // a moment late
    else if (mode >= 2) x = O.x + sway(t + 0.9); // a moment early
    if (mode >= 3) z += Math.min(0.9, (t - this.modeStart(3)) * 0.55);
    f.root.position.set(x, 0, z);
    f.root.rotation.y = 0;
    const k = mode >= 4 ? 1 : mode >= 3 ? 0.6 : mode >= 2 ? 0.25 : 0;
    f.body.scaling.y += (1 + 0.2 * k - f.body.scaling.y) * Math.min(1, dt * 2);
    f.neck.scaling.y += (1 + 1.6 * k - f.neck.scaling.y) * Math.min(1, dt * 2);
    f.head.position.y += (1.64 + 0.2 * k - f.head.position.y) * Math.min(1, dt * 2);
    f.head.rotation.z += ((mode >= 2 ? 0.38 : 0) - f.head.rotation.z) * Math.min(1, dt * 1.5);
    f.head.rotation.x += ((mode >= 3 ? 0.18 : 0) - f.head.rotation.x) * Math.min(1, dt * 1.5);
    const open = mode >= 4 ? 7 : mode >= 3 ? 2.5 : mode >= 2 ? 1.5 : 1;
    // The mouth is a thin ellipsoid (0.07 x 0.012 wide); it opens relative to that resting shape.
    f.jaw.scaling.y += (0.012 * open - f.jaw.scaling.y) * Math.min(1, dt * 3);
    f.jaw.scaling.x += (0.07 * (mode >= 4 ? 1.2 : 1) - f.jaw.scaling.x) * Math.min(1, dt * 3);
    for (const [i, a] of f.armPivots.entries()) {
      const target = mode >= 3 ? -1.45 : mode >= 2 ? -0.18 * (i ? 1 : -1) : 0;
      a.rotation.x += (target - a.rotation.x) * Math.min(1, dt * 1.6);
    }
    // It blinks late, and sometimes not at all.
    const blink = mode >= 1 && Math.sin(t * 2.1) > 0.97 ? 0.1 : 1;
    for (const e of f.eyes) e.scaling.y = 0.02 * blink + 0.0001;
    if (mode >= 4) this.d.stage.setLamp(0.15 + Math.max(0, Math.sin(t * 38)) * 0.9);
  }

  private modeTimes: Record<number, number> = {};
  private modeStart(m: number): number {
    if (this.modeTimes[m] === undefined || this.mirrorMode < m) this.modeTimes[m] = this.mirrorT;
    return this.modeTimes[m];
  }

  // ---- scene: Emily's room, and the confrontation ---------------------------------------------------

  private *chamberScene(): Script {
    const { events, state, stage, audio, flashlight, lighting } = this.d;
    const O = STAGE_ORIGIN;
    this.veil(1, 900);
    yield 1.2;
    state.set("finale:chamber");
    stage.show("chamber", 0.22);
    lighting.setFogTarget(0.05, [0.02, 0.02, 0.026]);
    events.emit("cine:letterbox", { on: true });
    this.setCam(O.x, 1.65, O.z - 1.5, 0, 0.12);
    if (!flashlight.on) flashlight.toggle();
    audio.setRoomAmbience("emily");
    this.veil(0, 1800);
    yield 2.5;
    yield { glide: { pos: [O.x - 0.1, 1.6, O.z - 0.2], yaw: 0.08, pitch: 0.28, t: 7 } };
    // The hand, and the ribbon on its wrist.
    state.set("seen:body");
    yield { glide: { pos: [O.x - 0.75, 1.55, O.z - 0.45], yaw: 0.5, pitch: 0.52, t: 4.5 } };
    yield { rec: "fin-reveal-1" };
    audio.stinger("drop");
    stage.setLamp(0.4);
    yield 2.2;
    stage.setLamp(1);
    yield { rec: "fin-reveal-2" };
    // The Matron has been standing in the doorway.
    this.d.horror.matron.appear(O.x, O.z - 1.7, 0, 0, 2.6);
    // Daniel turns around: she is standing in the doorway behind him.
    // (Daniel is at O.x - 0.75, she is at O.x: she is about 30 degrees off the line he was facing, at the very edge of his torch's beam. He turns to her.)
    yield { glide: { yaw: Math.atan2(0.75, -1.25), pitch: -0.2, t: 3.2 } };
    yield 1.5;
    yield { rec: "fin-reveal-3" };
    yield 1;
    // The confrontation.
    this.currentRound = "offer";
    let result: EndingId | null = null;
    while (!result) {
      const round: Round = ROUNDS[this.currentRound];
      for (const r of round.recording(factsOf(this.d.story.evidence, this.d.state))) yield { rec: r };
      const id: string | undefined = yield { choose: this.currentRound };
      state.set(`decision:${this.currentRound}:${id}`);
      const next: Round["id"] | EndingId = round.next(id ?? "");
      if (next === "denial" || next === "recognition" || next === "true") result = next;
      else this.currentRound = next;
    }
    yield* this.ending(result);
  }

  // ---- the three endings ----------------------------------------------------------------------------

  private *ending(id: EndingId): Script {
    const { events, state, stage, audio, lighting, flashlight, horror } = this.d;
    const O = STAGE_ORIGIN;
    this.lastEnding = id;
    state.set(`ending:${id}`);
    events.emit("ending:start", { id });
    if (id === "denial") {
      horror.matron.walk([{ x: O.x - 0.3, z: O.z - 0.9 }], 0.6);
      yield 2;
      stage.show("bedroom", 0.8);
      lighting.setFogTarget(0.02, [0.032, 0.024, 0.016]);
      yield { rec: "end1-room" };
      yield 2.5;
      stage.setLamp(0);
      flashlight.kill(30);
      horror.matron.vanish();
      yield 3;
      this.veil(1, 1200);
      yield 1.6;
      stage.hide();
      this.place(FOYER.x, FOYER.z, FOYER.level, FOYER.yaw);
      lighting.setFogTarget(0.03, [0.02, 0.019, 0.017]);
      this.veil(0, 1500);
      yield 2.5;
      audio.ring();
      yield 2.6;
      yield { rec: "end1-phone" };
      yield 2;
    } else if (id === "recognition") {
      this.veil(1, 1400);
      yield 1.8;
      stage.hide();
      horror.matron.vanish();
      this.place(FOYER.x, FOYER.z, FOYER.level, FOYER.yaw);
      events.emit("cine:photo", { show: true, kind: "dawn-lit" });
      yield 0.5;
      this.veil(0, 1600);
      yield { rec: "end2-dawn" };
      yield 3.5;
    } else {
      yield { rec: "end3-refuse" };
      yield 0.6;
      yield { rec: "end3-matron" };
      // The reconstructed room comes apart: the light fails and returns, the walls shudder, and she is gone.
      audio.stinger("swell");
      for (let i = 0; i < 6; i++) {
        stage.setLamp(i % 2 ? 1.4 : 0.05);
        yield 0.22;
      }
      horror.matron.vanish();
      this.veil(1, 400, "#e8e4dc");
      yield 1.2;
      stage.hide();
      lighting.setFogTarget(0.03, [0.02, 0.02, 0.022]);
      this.place(FOYER.x, FOYER.z, FOYER.level, FOYER.yaw);
      events.emit("cine:photo", { show: true, kind: "dawn" });
      this.veil(0, 2400);
      yield { rec: "end3-dawn" };
      yield 3.5;
    }
    events.emit("cine:photo", { show: false });
    const card = ENDING_CARDS[id];
    events.emit("card", { title: card.title, text: card.text, ms: 7000 });
    yield 7.5;
    events.emit("card", { title: null });
    state.set("ending:done");
    this.d.save.recordEnding(id);
    events.emit("credits:show", { ending: id });
    // The scene stays "running" under the credits; the credits end the session.
    yield 100000;
  }

  /** Which ending was reached in this session, if any. */
  get reached(): EndingId | null {
    return this.lastEnding;
  }
}
