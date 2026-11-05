import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
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
import type { Scene } from "@babylonjs/core/scene";
import type { House } from "../world/House";
import type { InteractionSystem } from "../player/InteractionSystem";
import type { InventorySystem } from "../systems/InventorySystem";
import { Chase } from "../horror/Chase";
import { GRAB_SECONDS, Struggle } from "../horror/Struggle";
import type { Input } from "../core/Input";
import { Aftermath, CORPSE_AT } from "../world/Aftermath";
import { photograph } from "../world/PaperTextures";
import type { SaveSystem } from "../platform/SaveSystem";
import { ROUNDS, caughtEnding, factsOf, planReport, type EndingId, type Round } from "./Endings";

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
/** How far from the stage origin Daniel stands at the mirror (the glass is 1.8 m away; he is close enough to see his own face). */
const MIRROR_Z = 1.05;
const FOYER = { x: 6.5, z: 1.0, level: 0 as const, yaw: 0 };

const ENDING_CARDS: Record<EndingId, { title: string; text: string }> = {
  denial: { title: "DENIAL — THE ESCAPE", text: "Daniel asked to be taken to his family. She took him, and walked out through the door that never opened for him." },
  recognition: { title: "RECOGNITION — THE CONFESSION", text: "Daniel accepted what he did. He does not yet understand what was waiting for him." },
  true: { title: "THE HOUSE ALWAYS REMEMBERS", text: "Daniel faced the truth, took her out of the picture, and the door opened." },
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
  private readonly chase: Chase;
  private readonly aftermath: Aftermath;
  /** After the confrontation the director stays off: the chase and the front-door puzzle are scripted, not random. */
  private keepHorrorOff = false;

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
      scene: Scene;
      house: House;
      interaction: InteractionSystem;
      inventory: InventorySystem;
      input: Input;
    },
  ) {
    const { events, state } = d;
    this.aftermath = new Aftermath(d.scene);
    this.chase = new Chase({
      horror: d.horror,
      lighting: d.lighting,
      house: d.house,
      player: d.player,
      audio: d.audio,
      events: d.events,
      onCaught: () => this.onCaught(),
      onSafe: () => this.onSafe(),
    });
    d.story.frontDoorHook = () => this.frontDoor();
    this.installPuzzle();
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

  /** The grab in progress, if any. */
  private grab: Struggle | null = null;
  private grabEnd = 0;
  private grabStart = { yaw: 0, pitch: 0 };
  private grabNo = 0;
  /** Test/observer view of the current grab. */
  get struggle(): { keys: string[]; done: number; left: number } | null {
    return this.grab ? { keys: this.grab.keys, done: this.grab.done, left: this.grab.left } : null;
  }
  /** Grabs so far this chase, for the automated player. */
  get grabCount(): number {
    return this.grabNo;
  }
  /** True while Daniel is held: no saving, no journal, no pause menu state is stored. */
  get grabbed(): boolean {
    return this.grab !== null;
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
    if (state.get("finale:chase")) this.resumeChase();
    else if (state.get("seen:mirror")) this.beginHunt();
    else events.emit("objective", { text: "The bathroom light is on. Something is waiting in the mirror." });
  }

  private beginHunt(): void {
    this.d.horror.beginHunt();
    this.d.events.emit("objective", { text: "She has stopped pretending. Get to Emily's room upstairs. She will not follow you into lamplight.", room: "emily" });
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
    this.mirrorT = -1;
    this.d.events.emit("choices:hide", {});
    this.d.events.emit("subtitle:clear", {});
    events.emit("cine:letterbox", { on: false });
    events.emit("controls:lock", { locked: false });
    horror.enabled = !this.keepHorrorOff;
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
        this.showChoices();
      } else {
        this.waitLeft = w.glide.t;
        this.glideFrom = { pos: this.cam.pos.clone(), yaw: this.cam.yaw, pitch: this.cam.pitch };
      }
      return;
    }
  }

  private currentRound: Round["id"] = "offer";

  private showChoices(): void {
    const round = ROUNDS[this.currentRound];
    const facts = factsOf(this.d.story.evidence, this.d.state);
    this.choices = round.choices(facts);
    // For the final question, record exactly what it was built from (nothing is shown in the game): in the console, in `window.__finalQuestion`, and in the browser's storage
    // under `thar.diag.finalQuestion`, so that when the "True" line is absent a real playthrough can say precisely which requirement was not met.
    if (this.currentRound === "plan") {
      const report = planReport(this.d.story.evidence, this.d.state);
      console.info("[ending] final question", report);
      (window as unknown as { __finalQuestion?: unknown }).__finalQuestion = report;
      try {
        localStorage.setItem("thar.diag.finalQuestion", JSON.stringify({ at: new Date().toISOString(), ...report }));
      } catch {
        /* storage may be blocked */
      }
    }
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
    if (this.grab) this.d.horror.stageUpdate(dt);
    if (this.grab) {
      this.updateGrab(dt);
      const p = this.d.player;
      p.position.copyFrom(this.cam.pos);
      return;
    }
    if (this.chase.active || this.chasing) {
      this.d.horror.stageUpdate(dt);
      this.chase.update(dt);
      this.puzzleUpdate(dt);
    }
    if (!this.run) return;
    if (!this.chasing) this.d.horror.stageUpdate(dt);
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
    // Outside a scene the player owns the camera, so put the player there directly.
    if (!this.run) {
      this.d.player.position.copyFrom(this.cam.pos);
      this.d.player.setLook(yaw, 0);
    }
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
    this.setCam(O.x, 1.65, O.z + MIRROR_Z, 0, 0.02);
    this.mirrorHist = [];
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
    yield 1.6;
    // Daniel looks away, toward the towel. It does not: it keeps its eyes on him.
    yield { glide: { yaw: 0.55, t: 1 } };
    yield 1.8;
    yield { glide: { yaw: 0, t: 1 } };
    yield 1;
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

  private mirrorHist: { t: number; x: number; y: number; yaw: number }[] = [];

  /** Daniel's own recent sway, breath and gaze, `lag` seconds ago. */
  private mirrorSample(t: number, lag: number): { x: number; y: number; yaw: number } {
    const h = this.mirrorHist;
    const want = t - lag;
    let i = h.length - 1;
    while (i > 0 && h[i].t > want) i--;
    const a = h[i];
    const b = h[Math.min(h.length - 1, i + 1)];
    const k = b.t > a.t ? Math.max(0, Math.min(1, (want - a.t) / (b.t - a.t))) : 0;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, yaw: a.yaw + (b.yaw - a.yaw) * k };
  }

  /**
   * Animates the reflection. For its first seconds it is exactly Daniel in the glass: his sway, his breath and his gaze, at the same moment.
   * Then it is a little late. Then it has its own timing, and when Daniel looks away it does not look away with him: it keeps looking at him.
   * It tilts its head, lets its mouth go slack, stretches, comes to the glass and raises its hands. It is his guilt as the Matron has been
   * shaping it, not a monster, so the face and clothes stay his own and the wrongness is in the timing.
   */
  private updateMirror(dt: number): void {
    const f = this.d.stage.figure;
    if (!f) return;
    this.mirrorT += dt;
    const t = this.mirrorT;
    const O = STAGE_ORIGIN;
    const ease = (rate: number): number => Math.min(1, dt * rate);
    // Daniel barely moves: a slow breath and a slight sway, and wherever the scene has turned his head.
    const sway = Math.sin(t * 0.9) * 0.03;
    const breath = Math.sin(t * 1.3) * 0.006;
    this.cam.pos.x = O.x + sway;
    this.cam.pos.y = 1.65 + breath;
    this.cam.pos.z = O.z + MIRROR_Z;
    this.mirrorHist.push({ t, x: sway, y: breath, yaw: this.cam.yaw });
    if (this.mirrorHist.length > 900) this.mirrorHist.shift();
    const mode = this.mirrorMode;
    const lag = mode === 1 ? 0.8 : mode >= 2 ? 1.25 : 0;
    const s = this.mirrorSample(t, lag);
    // How much of its own mind it has: it stops copying his gaze first.
    const stare = mode >= 3 ? 1 : mode >= 2 ? 0.85 : 0;
    const k = mode >= 4 ? 1 : mode >= 3 ? 0.6 : mode >= 2 ? 0.25 : 0;
    const come = mode >= 3 ? Math.min(0.78, (t - this.modeStart(3)) * 0.42) : 0;
    f.root.position.set(O.x + s.x * (1 - stare * 0.5), -0.07 + s.y, O.z + MIRROR_Z - 0.1 + come);
    // As it nears the glass (and the light above it) it is lit less, so the face stays readable instead of washing out to a pale blank; and Daniel's eyes rise to it.
    this.d.stage.setFigureLight(1 - 0.72 * Math.min(1, come / 0.78));
    this.cam.pitch += ((mode >= 3 ? -0.1 : 0.02) - this.cam.pitch) * ease(1.2);
    // It comes through the glass past Daniel's shoulder and turns to face him: left facing the glass, all he saw of it was the back of its head.
    f.root.rotation.y = Math.PI * Math.max(0, Math.min(1, (come - 0.1) / 0.15));
    // Its head follows his gaze, until it stops doing that and keeps its eyes on him.
    const yaw = s.yaw * (1 - stare);
    f.head.rotation.y += (yaw - f.head.rotation.y) * ease(4);
    f.head.rotation.z += ((mode >= 2 ? 0.2 + 0.08 * Math.sin(t * 0.7) : 0) * (mode >= 4 ? 1.5 : 1) - f.head.rotation.z) * ease(1.5);
    // Its chin lifts as it comes to the glass (a downward tilt buried the eyes under the hair and left a blank face).
    f.head.rotation.x += ((mode >= 3 ? -0.04 : 0) - f.head.rotation.x) * ease(1.5);
    // The neck draws out and the shoulders lift a little; the head rides on the end of it.
    const stretch = 1 + 0.55 * k;
    f.neck.scaling.y += (stretch - f.neck.scaling.y) * ease(2);
    f.head.position.y = -0.015 + 0.07 * f.neck.scaling.y;
    f.body.scaling.y += (1 + 0.05 * k - f.body.scaling.y) * ease(2);
    f.setMouth(mode >= 4 ? 0.85 : mode >= 3 ? 0.3 : mode >= 2 ? 0.1 : 0);
    f.setSmile(mode >= 4 ? -1 : mode >= 3 ? -0.4 : 0);
    for (const [i, a] of f.armPivots.entries()) {
      const side = i ? 1 : -1;
      const target = mode >= 3 ? -1.4 : mode >= 2 ? -0.1 * side : 0;
      a.rotation.x += (target - a.rotation.x) * ease(1.6);
      a.rotation.z += ((mode >= 3 ? 0.12 * side : 0) - a.rotation.z) * ease(1.6);
    }
    // It blinks late, and sometimes not at all; its eyes take on a cold light from inside.
    const blink = mode >= 1 && Math.sin(t * 2.1) > 0.97 ? 0.12 : 1;
    for (const e of f.eyes) e.scaling.y = blink;
    const em = (f.eyes[0].material as unknown as { emissiveColor: { set(r: number, g: number, b: number): void } }).emissiveColor;
    const glow = 0.1 + 0.3 * k;
    em.set(glow * 0.9, glow, glow * 1.05);
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
    // Before anything is shown: the room goes quiet and nearly dark, and Daniel's own breathing is the loudest thing in it. Nothing here is new story; it is only time and sound
    // spent on the moment before he sees what the Matron has kept.
    stage.setLamp(0.05);
    audio.duck(9);
    yield 2.5;
    audio.breathAt(O.x, O.z - 2.4);
    yield 1.6;
    // The lamp comes up slowly, and in the wrong way: it catches the edge of a sheet, the shape of something laid out and tucked in, in a room where nobody has lived for eleven years.
    yield { glide: { pos: [O.x + 0.25, 1.25, O.z - 1.2], yaw: -0.05, pitch: 0.1, t: 6 } };
    for (let i = 0; i < 36; i++) {
      stage.setLamp(0.05 + 0.3 * (i / 36) + (i % 9 === 4 ? -0.12 : 0));
      if (i === 14) audio.breathAt(O.x, O.z - 2.4);
      yield 0.12;
    }
    // A long held look at the shape under the sheet before the camera is allowed any closer.
    yield 2.8;
    audio.breathAt(O.x, O.z - 2.4);
    yield { glide: { pos: [O.x - 0.1, 1.6, O.z - 0.2], yaw: 0.08, pitch: 0.28, t: 7 } };
    // The hand, and the ribbon on its wrist.
    state.set("seen:body");
    yield { glide: { pos: [O.x - 0.75, 1.55, O.z - 0.45], yaw: 0.5, pitch: 0.52, t: 4.5 } };
    // The hand, with the faded ribbon. A pause in which nothing happens: she does not breathe, and Daniel's breathing is all that moves.
    audio.breathAt(O.x - 0.75, O.z - 1.2);
    yield 3.2;
    audio.breathAt(O.x - 0.75, O.z - 1.2);
    yield 1.8;
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
    // The confrontation. Every attempt starts from clean decisions: nothing an earlier attempt stored can colour this one.
    for (const r of ["offer", "comfort", "plan"]) for (const c of ["stay", "unsure", "refuse", "own", "afraid", "accept"]) state.set(`decision:${r}:${c}`, false);
    this.currentRound = "offer";
    let result: EndingId | "chase" | null = null;
    while (!result) {
      const round: Round = ROUNDS[this.currentRound];
      for (const r of round.recording(factsOf(this.d.story.evidence, this.d.state))) yield { rec: r };
      const id: string | undefined = yield { choose: this.currentRound };
      state.set(`decision:${this.currentRound}:${id}`);
      const next = round.next(id ?? "");
      if (next === "denial" || next === "recognition" || next === "chase") result = next;
      else if (next !== "true") this.currentRound = next;
    }
    if (result === "chase") yield* this.unmaskAndRun();
    else yield* this.ending(result);
  }

  // ---- the chase and the front door ------------------------------------------------------------------

  /** True from the moment the chase begins until an ending takes over. */
  chasing = false;
  /** For the automated player: the refuge room whose lamp is failing or out. */
  get darkRefuge(): string | null {
    return this.chase.dark;
  }
  get litRefuges(): string[] {
    return this.chase.litRefuges;
  }

  /**
   * Daniel refuses her, and she stops pretending: the true form, in full, in the reconstructed room (the established 21 seconds). When it has
   * finished the room comes apart, Daniel is back in Emily's real room upstairs, and the objective says RUN.
   */
  private *unmaskAndRun(): Script {
    const { events, state, stage, audio, horror } = this.d;
    events.emit("choices:hide", {});
    yield { rec: "fin-unmask" };
    state.set("finale:unmasked");
    // The director raises her to the true form and, once she is fully visible, the transformation plays; nothing else happens until it is done.
    let waited = 0;
    while (!horror.matron.transformFinished && waited < 60) {
      yield 0.25;
      waited += 0.25;
    }
    yield 0.8;
    audio.stinger("drop");
    events.emit("objective", { text: "RUN" });
    events.emit("thought", { text: "Run." });
    for (let i = 0; i < 5; i++) {
      stage.setLamp(i % 2 ? 1.4 : 0.05);
      yield 0.2;
    }
    this.veil(1, 300, "#e8e4dc");
    yield 0.5;
    stage.hide();
    horror.matron.vanish();
    this.keepHorrorOff = true;
    state.set("finale:chase");
    this.d.lighting.setFogTarget(0.03, [0.02, 0.02, 0.022]);
    this.beginChase("emily");
    this.veil(0, 500);
    this.d.save.write();
    events.emit("save:done", { kind: "auto" });
  }

  /** Puts Daniel and the Matron where the chase begins. "emily": Emily's room, her at the far end of the landing. "foyer": a resumed chase. */
  private beginChase(from: "emily" | "foyer"): void {
    const { horror, events, flashlight } = this.d;
    this.chasing = true;
    horror.enabled = false;
    if (!flashlight.on) flashlight.toggle();
    if (from === "emily") {
      this.place(2.6, 8.0, 1, Math.PI / 2);
      // Her first act is to throw Emily's door open, so the way out is clear and he knows she is coming.
      this.d.house.doors.emily.setOpen(true);
      this.d.audio.slam(0.8);
      this.chase.start(5.8, 3.6, 1, 0, 5);
      events.emit("objective", { text: "RUN", hint: "She will not come into the light. Go down, toward the lit rooms." });
    } else {
      this.place(FOYER.x, FOYER.z + 0.3, 0, Math.PI);
      this.chase.start(6.5, 7, 0, Math.PI, 1);
    }
  }

  private resumeChase(): void {
    const { state, events } = this.d;
    this.keepHorrorOff = true;
    this.beginChase("foyer");
    this.d.player.setBase(0);
    if (state.get("finale:anchor")) {
      this.chase.stop();
      this.d.horror.matron.vanish();
      events.emit("objective", { text: "OPEN THE FRONT DOOR", hint: "Nothing holds it now. The door is in the foyer.", room: "foyer" });
    } else this.puzzleObjective();
    this.chase.markSafe();
    this.chase.lightHall();
  }

  /** The first time he stands in a lit room: the way out is the problem now. */
  private onSafe(): void {
    this.chase.lightHall();
    if (this.d.state.get("finale:door-tried")) return;
    this.puzzleObjective();
    this.d.events.emit("thought", { text: "She doesn't come into the light. The front door is right there." });
  }

  /**
   * The escape is guided one step at a time, and each step names the object and the place but not the answer:
   * 1 reach the door, 2 learn why it holds, 3 look at the false photograph, 4 find the true print, 5 swap them, 6 open the door.
   * `plain` is the same step said more plainly, shown when the player has been stuck on it for a minute.
   */
  private puzzleObjective(plain = false): void {
    const { state, events } = this.d;
    this.stageT = 0;
    this.plainShown = plain;
    const o = (text: string, hint: string, room?: string): void => events.emit("objective", { text, hint, room });
    if (state.get("finale:anchor")) o("OPEN THE FRONT DOOR", "Nothing holds it now. The door is in the foyer.", "foyer");
    else if (state.get("finale:print")) o("PUT THE TRUTH WHERE THE LIE HANGS", plain ? "Go to the living room. Use the photograph on the wall: swap it for the original print you are carrying." : "The picture in the living room has a fifth figure in it. You are holding the one that does not.", "living");
    else if (state.get("finale:photo-seen")) o("FIND THE ORIGINAL PRINT", plain ? "The photo album is in the study. Take out the original print of the front step." : "The same front step was photographed twice. The original is kept with the family's other pictures.", plain ? "study" : undefined);
    else if (state.get("finale:door-tried")) o("FIND WHAT HOLDS HER TO THE HOUSE", plain ? "Go to the living room and look closely at the family photograph on the wall." : "The door is not locked from outside: it is being held shut from in here. She was added to something the family keeps on display.", plain ? "living" : undefined);
    else o("TRY THE FRONT DOOR", "She cannot enter the light. The foyer is lit, and the front door is the way out.", "foyer");
  }

  private stageT = 0;
  private plainShown = false;

  /** The front door, during the finale. The same line it gave at the start of the game, and now Daniel understands it. */
  private frontDoor(): boolean {
    const { state, events, audio } = this.d;
    if (state.get("ending:done")) return true;
    if (state.get("finale:anchor")) {
      if (!this.run) this.start(this.escapeScene());
      return true;
    }
    audio.thud();
    events.emit("toast", { text: "Something is on the other side.", ms: 4200 });
    if (!state.get("finale:door-tried")) {
      state.set("finale:door-tried");
      this.after(2.2, () => events.emit("thought", { text: "Eleven years ago I took that for a threat. It isn't a threat. It's a place." }));
      this.after(6.5, () => events.emit("thought", { text: "Nothing is outside. It is being held shut from in here." }));
      this.puzzleObjective();
      this.d.save.write();
      events.emit("save:done", { kind: "auto" });
    }
    return true;
  }

  /**
   * The solution is in two photographs of the same front step: the one on the living-room wall has a fifth figure standing behind the family, at the door; the
   * original print in the study album has four people and an empty step. Taking the original out of the album and putting it where the false one hangs
   * breaks what the house has been keeping. The clues are the door's own line, Daniel's thoughts when he looks at each picture, the journal deduction about the
   * fifth figure, and objective hints that grow plainer the longer he is stuck. None of it needs guessing.
   */
  private installPuzzle(): void {
    const { interaction, state, inventory, events, audio } = this.d;
    const active = (): boolean => this.chasing && state.get("finale:door-tried") && !state.get("finale:anchor");
    interaction.override("read:album-print", {
      prompt: () => (active() && !state.get("finale:print") ? "Take the original print out of the album" : null),
      interact: () => {
        state.set("finale:print");
        inventory.add({ id: "original-print", name: "The original print" });
        audio.paper();
        events.emit("toast", { text: "You take the original print out of the album.", ms: 3200 });
        events.emit("thought", { text: "Four of us. Nobody behind us. The door shut, and the step beside it empty." });
        this.puzzleObjective();
      },
    });
    interaction.override("read:living-photo", {
      prompt: () => (active() ? (state.get("finale:print") ? "Replace the photograph with the original print" : "Look at the photograph") : null),
      interact: () => {
        if (!state.get("finale:print")) {
          events.emit("thought", { text: "The fifth figure, behind us, at the door. 'All of us.' She wrote herself in. Where is the print that doesn't have her?" });
          if (!state.get("finale:photo-seen")) {
            state.set("finale:photo-seen");
            this.puzzleObjective();
          }
          return;
        }
        this.breakAnchor();
      },
    });
  }

  /** Hints grow plainer with time, never all at once. */
  private puzzleUpdate(dt: number): void {
    const { state } = this.d;
    if (state.get("finale:anchor") || !this.chasing) return;
    this.stageT += dt;
    if (this.stageT > 60 && !this.plainShown && state.get("finale:door-tried")) this.puzzleObjective(true);
  }

  /** The original print goes in the frame. The fifth figure is gone, and what was holding the door has nothing left to hold. */
  private breakAnchor(): void {
    const { state, events, audio, inventory, interaction, lighting, horror } = this.d;
    state.set("finale:anchor");
    inventory.remove("original-print");
    audio.paper();
    // The picture on the wall changes: four people, and the empty step.
    for (const m of interaction.meshesFor("read:living-photo")) {
      const mat = m.material as StandardMaterial | null;
      if (mat) mat.diffuseTexture = photograph(this.d.scene, "anchor-true", 701, "family", 0.3 / 0.38);
    }
    events.emit("thought", { text: "No one behind us. There never was." });
    this.chase.stop();
    // She feels it go. Her cry, the lamps failing together, a long silence.
    this.after(0.8, () => {
      audio.matronCry("shriek");
      audio.stinger("drop");
      events.emit("veil", { opacity: 1, ms: 120, color: "#e8e4dc" });
      for (const l of lighting.allLamps) l.setOn(false);
      horror.matron.leave(1.4);
      audio.duck(3);
    });
    this.after(1.1, () => events.emit("veil", { opacity: 0, ms: 900 }));
    this.after(4.2, () => {
      for (const l of lighting.allLamps) l.setOn(["foyer-light", "living-lamp-light", "desk-lamp-light"].includes(l.light.name));
      events.emit("thought", { text: "The house is quiet. It has never been this quiet." });
      events.emit("objective", { text: "OPEN THE FRONT DOOR", hint: "Nothing holds it now. The door is in the foyer.", room: "foyer" });
      audio.click();
    });
    this.d.save.write();
    events.emit("save:done", { kind: "auto" });
  }

  /** The Matron reaches Daniel. Which ending follows is decided by what he said and what he knew, never by chance (see Endings.caughtEnding). */
  private onCaught(): void {
    if (this.run || this.grab) return;
    this.chasing = true;
    this.beginGrab();
  }

  /** She has him. Control is taken, she turns him to face her, and the 10-second escape begins (one continuous grab: every grab starts the clock again). */
  private beginGrab(): void {
    const { events, player, horror, audio, flashlight } = this.d;
    const m = horror.matron;
    this.grabNo++;
    this.grab = new Struggle(this.grabNo);
    this.grabEnd = 0;
    m.stop();
    audio.stinger("drop");
    audio.matronCry("shriek");
    audio.slam(0.9);
    if (!flashlight.on) flashlight.toggle();
    events.emit("controls:lock", { locked: true });
    const p = player.position;
    const face = Math.atan2(m.root.position.x - p.x, m.root.position.z - p.z);
    this.grabStart = { yaw: face, pitch: 0.12 };
    this.cam = { pos: p.clone(), yaw: face, pitch: 0.12 };
    this.emitStruggle();
  }

  private emitStruggle(): void {
    const g = this.grab;
    if (!g) return;
    this.d.events.emit("struggle", { on: true, keys: g.keys, done: g.done, left: g.left, total: GRAB_SECONDS, window: g.window, msg: g.msg, tone: g.tone });
  }

  private updateGrab(dt: number): void {
    const g = this.grab;
    if (!g) return;
    const { input, audio, player } = this.d;
    if (this.grabEnd) {
      // Brief beat after the result so the feedback is seen, then it plays out.
      this.grabEnd -= dt;
      return;
    }
    const pressed: ReturnType<typeof Struggle.dirOf>[] = [];
    for (const code of ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "KeyA", "KeyW", "KeyD", "KeyS"]) if (input.wasPressed(code)) pressed.push(Struggle.dirOf(code));
    const r = g.update(dt, pressed.filter((x): x is NonNullable<typeof x> => x !== null));
    if (g.event === "hit") audio.click();
    else if (g.event) audio.thud();
    // Her grip shakes the view harder as the time runs out.
    const k = 1 - g.left / GRAB_SECONDS;
    const t = this.clock * 22;
    player.setLook(this.grabStart.yaw + Math.sin(t) * 0.012 * (1 + k * 3), this.grabStart.pitch + Math.cos(t * 1.3) * 0.012 * (1 + k * 3) - k * 0.1);
    if (Math.floor(g.left) !== Math.floor(g.left + dt) && g.left < 6) audio.pulse();
    this.emitStruggle();
    if (r === "free") this.breakFree();
    else if (r === "lost") this.loseGrab();
  }

  /** The escape worked: she loses her hold, he is turned away from her, and the chase goes on with a head start. */
  private breakFree(): void {
    const { events, audio, player, horror } = this.d;
    this.grab = null;
    events.emit("struggle", { on: false, keys: [], done: 0, left: 0, total: GRAB_SECONDS, window: 0, msg: "", tone: "" });
    audio.slam(1);
    audio.stinger("sting");
    audio.matronCry("shriek");
    // Turned away from her, ready to run.
    player.setLook(this.grabStart.yaw + Math.PI, 0);
    events.emit("controls:lock", { locked: false });
    events.emit("toast", { text: "You tear free.", ms: 1800 });
    this.d.state.set(`finale:freed:${this.grabNo}`);
    this.chase.resumeAfterGrab(2.6);
    void horror;
  }

  /** Ten seconds held and still held: the chase is over, and the ending the evidence and his answers allow follows (see Endings.caughtEnding). */
  private loseGrab(): void {
    const { events } = this.d;
    this.grab = null;
    events.emit("struggle", { on: false, keys: [], done: 0, left: 0, total: GRAB_SECONDS, window: 0, msg: "", tone: "" });
    this.start(this.caughtScene());
  }

  private *caughtScene(): Script {
    const { events, state, audio, horror, player } = this.d;
    const m = horror.matron;
    this.chase.stop();
    m.run = false;
    audio.stinger("drop");
    audio.matronCry("shriek");
    this.veil(1, 180, "#e8e4dc");
    yield 0.25;
    // She is close and she does not hurry now.
    const yaw = this.cam.yaw;
    const x = this.cam.pos.x + Math.sin(yaw) * 1.1;
    const z = this.cam.pos.z + Math.cos(yaw) * 1.1;
    m.appear(x, z, player.floorBase > 1.5 ? 1 : 0, yaw + Math.PI, 0.05);
    this.cam.pitch = -0.55;
    this.veil(0, 250);
    yield 0.8;
    const ending = caughtEnding(state);
    this.keepHorrorOff = true;
    // The chase is over: the objective must stop saying RUN.
    if (ending === "denial") events.emit("objective", { text: "WATCH", hint: "He cannot move. Whatever she does, he sees it." });
    else events.emit("objective", { text: "LISTEN", hint: "He has stopped running. Let it be said." });
    if (ending === "denial") yield* this.denialScene(true);
    else yield* this.ending("recognition");
    void events;
  }

  /**
   * The True Ending: the front door opens. Not because Daniel said the right thing: because he put the truth where the lie hung, and what held the door shut had
   * nothing left. He walks out into the first light.
   */
  private *escapeScene(): Script {
    const { events, state, audio, lighting, horror, house } = this.d;
    this.lastEnding = "true";
    state.set("ending:true");
    events.emit("ending:start", { id: "true" });
    events.emit("objective", { text: "WALK OUT", hint: "The door is open." });
    this.chase.stop();
    horror.matron.vanish();
    events.emit("cine:letterbox", { on: true });
    this.setCam(FOYER.x, 1.65, 3.0, Math.PI, 0.02);
    yield 0.8;
    yield { glide: { pos: [FOYER.x, 1.65, 1.5], t: 2.5 } };
    audio.stinger("swell");
    house.doors.front.forceOpen();
    lighting.setFogTarget(0.012, [0.7, 0.7, 0.66]);
    this.firstLight();
    yield 1.5;
    this.veil(1, 2200, "#f1eee4");
    yield 2.6;
    yield { rec: "end3-door" };
    events.emit("cine:photo", { show: true, kind: "dawn" });
    this.light?.setEnabled(false);
    this.place(FOYER.x, FOYER.z, FOYER.level, FOYER.yaw);
    this.veil(0, 2000);
    yield { rec: "end3-dawn" };
    yield 3.5;
    yield* this.finishEnding("true");
  }

  private light: Mesh | null = null;

  /** What is outside the front door when it opens: nothing but the first light of morning. */
  private firstLight(): void {
    if (!this.light) {
      const m = MeshBuilder.CreatePlane("first-light", { width: 14, height: 7 }, this.d.scene);
      const mat = new StandardMaterial("first-light-mat", this.d.scene);
      mat.disableLighting = true;
      mat.emissiveColor = new Color3(1, 0.96, 0.86);
      mat.backFaceCulling = false;
      m.material = mat;
      m.position.set(6.5, 2.2, -3.5);
      m.isPickable = false;
      this.light = m;
    }
    this.light.setEnabled(true);
  }

  /** Cards, credits, and the credits ending the session. */
  private *finishEnding(id: EndingId): Script {
    const { events, state } = this.d;
    events.emit("cine:photo", { show: false });
    const card = ENDING_CARDS[id];
    events.emit("card", { title: card.title, text: card.text, ms: 7000 });
    yield 7.5;
    events.emit("card", { title: null });
    state.set("ending:done");
    this.chasing = false;
    this.d.save.recordEnding(id);
    events.emit("credits:show", { ending: id });
    // The scene stays "running" under the credits; the credits end the session.
    yield 100000;
  }

  /**
   * Denial: he asks to be taken to his family. She does. What follows is shown in the reconstructed room, not in the house: his body, the ritual that lets her
   * leave her own form, and Emily's body, which sits up and is not Emily. Then the front door, which would not open for Daniel, opens for her.
   */
  private *denialScene(caught: boolean): Script {
    const { events, state, stage, audio, lighting, flashlight, horror } = this.d;
    const O = STAGE_ORIGIN;
    const m = horror.matron;
    const soft = horror.reduced;
    this.lastEnding = "denial";
    state.set("ending:denial");
    events.emit("ending:start", { id: "denial" });
    this.chase.stop();
    yield { rec: caught ? "end1-catch" : "end1-offer" };
    // A cut to black. What happens in it is heard, not shown.
    this.veil(1, 160);
    audio.stinger("drop");
    yield 0.4;
    if (soft) {
      // Reduced scare intensity: the transfer stays unseen, as it always was.
      audio.slam(1);
      audio.matronCry("shriek");
      yield 0.9;
      audio.slam(1);
      yield 1.4;
      m.vanish();
    } else {
      // The transfer, in flashes between darkness: she kneels over him, her hand goes into his chest, the blood comes, and then it is dark again. Cut in a few short strokes, not
      // lingered on; the room and the wound are the ones the aftermath shows afterwards.
      stage.show("chamber", 0.16);
      this.aftermath.show(1.6);
      lighting.setFogTarget(0.06, [0.034, 0.012, 0.012]);
      if (!flashlight.on) flashlight.toggle();
      events.emit("cine:letterbox", { on: true });
      const CX = O.x + CORPSE_AT.x;
      const CZ = O.z + CORPSE_AT.z;
      const flash = function* (self: Finale, ms: number, sound: () => void): Script {
        self.veil(0, 30);
        sound();
        yield ms / 1000;
        self.veil(1, 40);
        yield 0.22;
      };
      // The framings are measured from where he lies (his chest is at CX + 0.34, CZ + 1.23; his head toward the bed) and where she kneels beside him (CX + 0.73, CZ + 1.17).
      // 1. From his feet, low: her silhouette beside him, close, looking down at him.
      m.appear(CX + 0.73, CZ + 1.17, 0, -Math.PI / 2, 0.05);
      this.setCam(CX + 0.35, 0.35, CZ + 0.05, 0.1, -0.35);
      yield* flash(this, 220, () => audio.slam(1));
      // 2. From above his chest: his body in the pool, her dress across the frame, her hands at him.
      this.setCam(CX + 0.35, 1.3, CZ + 0.75, 0, 1.25);
      yield* flash(this, 200, () => audio.matronCry("shriek"));
      // 3. Close: the wound, and her arm in it.
      this.setCam(CX + 0.34, 0.72, CZ + 1.02, 0, 1.45);
      yield* flash(this, 180, () => audio.slam(1));
      // 4. His face, from the side away from her: the mouth open on a cry that makes no sound.
      this.setCam(CX - 0.05, 0.55, CZ + 1.25, 1.08, 0.63);
      yield* flash(this, 240, () => audio.matronCry("call"));
      // 5. The dark threads leaving him, arching to the bed; she stands over it.
      this.aftermath.setThreads(0.8, this.clock);
      this.setCam(CX - 0.35, 0.55, CZ + 1.05, 1.0, -0.05);
      yield* flash(this, 220, () => audio.slam(1));
      // 6. The blood: the lens fills with it.
      this.veil(0.92, 30, "#6e0000");
      audio.stinger("sting");
      yield 0.34;
      this.veil(1, 60, "#000");
      yield 0.5;
      m.vanish();
    }
    yield 2.2;
    // The aftermath, in the reconstructed room.
    this.chasing = false;
    stage.show("chamber", 0.16);
    this.aftermath.show(soft ? 1.4 : 2.8);
    lighting.setFogTarget(0.06, [0.034, 0.012, 0.012]);
    this.setCam(O.x + 1.2, 1.6, O.z - 1.5, -0.75, 0.36);
    events.emit("cine:letterbox", { on: true });
    if (!flashlight.on) flashlight.toggle();
    this.veil(0, soft ? 2500 : 1200);
    audio.setRoomAmbience("emily");
    yield 3.2;
    // She stands over the bed and begins.
    m.appear(O.x + 0.1, O.z - 0.45, 0, 0, 2);
    yield { glide: { pos: [O.x + 0.55, 1.45, O.z - 1.6], yaw: -0.2, pitch: 0.12, t: 3 } };
    yield { rec: "end1-ritual" };
    for (let i = 0; i < 50; i++) {
      this.aftermath.setThreads(i / 49, this.clock);
      stage.setLamp(0.45 + 0.35 * Math.sin(this.clock * 2.4));
      if (i % 12 === 5) audio.pulse();
      yield 0.1;
    }
    yield { glide: { pos: [O.x - 0.7, 1.55, O.z + 0.15], yaw: 0.35, pitch: 0.4, t: 2.5 } };
    // Emily's body sits up, stiffly, all of a piece, and does not breathe as she does it.
    audio.stinger("swell");
    const emily = this.aftermath.emily;
    const P = this.aftermath.pivot;
    for (let i = 0; i <= 90; i++) {
      const k = i / 90;
      const step = Math.floor(k * 14) / 14;
      P.rotation.x = (Math.PI / 2) * (1 - (0.45 * k + 0.55 * step));
      this.aftermath.setThreads(1 - k * 0.8, this.clock);
      yield 0.06;
    }
    P.rotation.x = 0;
    horror.matron.leave(1.2);
    this.aftermath.possess();
    audio.matronCry("call");
    yield 1.4;
    // Her head goes on one side and stays there; she smiles for too long.
    for (let i = 0; i <= 30; i++) {
      emily.head.rotation.z = 0.55 * (i / 30);
      emily.setSmile(Math.min(1, i / 20));
      emily.setMouth(0.12);
      yield 0.08;
    }
    yield { rec: "end1-wake" };
    this.aftermath.setThreads(0);
    // She steps down and leaves by the door.
    for (let i = 0; i <= 40; i++) {
      P.position.y = 0.58 * (1 - i / 40);
      P.position.z = O.z + 0.3 - 0.01 * i;
      yield 0.04;
    }
    this.veil(1, 900);
    yield 1.2;
    // The foyer. The front door that would not open for him.
    stage.hide();
    this.aftermath.placeEmilyAt(FOYER.x, 3.4);
    lighting.setFogTarget(0.03, [0.02, 0.019, 0.017]);
    for (const l of lighting.allLamps) l.setOn(l.light.name === "foyer-light");
    // From the hall, west of the stairs (a camera on the stairs is inside them), looking down the length of the foyer at the door.
    this.setCam(5.9, 1.6, 5.6, Math.atan2(0.6, -3.6), 0.04);
    events.emit("cine:letterbox", { on: true });
    this.veil(0, 1400);
    yield 1.8;
    const door = this.d.house.doors.front;
    for (let i = 0; i <= 100; i++) {
      this.aftermath.walkEmily(FOYER.x, 3.4 - (2.5 * i) / 100, this.clock);
      yield 0.04;
    }
    audio.stinger("sting");
    door.forceOpen();
    lighting.setFogTarget(0.012, [0.7, 0.7, 0.66]);
    yield 1.6;
    for (let i = 0; i <= 50; i++) {
      this.aftermath.walkEmily(FOYER.x, 0.9 - (1.6 * i) / 50, this.clock);
      yield 0.04;
    }
    this.veil(1, 1400, "#f1eee4");
    yield 2.2;
    this.aftermath.hide();
    events.emit("cine:letterbox", { on: false });
    yield* this.finishEnding("denial");
  }

  // ---- the three endings ----------------------------------------------------------------------------

  /** Recognition, and the Denial that comes straight from the conversation (he asks to be taken). The True Ending is the front door (`escapeScene`). */
  private *ending(id: EndingId): Script {
    const { events, state, stage, lighting, horror } = this.d;
    if (id === "denial") {
      yield* this.denialScene(false);
      return;
    }
    this.lastEnding = id;
    state.set(`ending:${id}`);
    events.emit("ending:start", { id });
    this.veil(1, 1400);
    yield 1.8;
    stage.hide();
    horror.matron.vanish();
    lighting.setFogTarget(0.03, [0.02, 0.02, 0.022]);
    this.place(FOYER.x, FOYER.z, FOYER.level, FOYER.yaw);
    events.emit("cine:photo", { show: true, kind: "dawn-lit" });
    yield 0.5;
    this.veil(0, 1600);
    yield { rec: "end2-dawn" };
    yield 3.5;
    yield* this.finishEnding(id);
  }

  /**
   * After the True Ending's credits and silent telephone scene: black, about three seconds of silence, then the Matron in her true form very close,
   * one vocal sting, an instant cut to black, "BYE BYE." for about three seconds, then `done` (the main menu). Space or Enter skips ahead (Escape keeps its usual pause).
   * With reduced scare intensity she fades in slowly instead of appearing at once and the sting is quieter (see AudioManager.matronSting).
   */
  postCredits(done: () => void): void {
    const { events, horror, flashlight, audio } = this.d;
    const soft = horror.reduced;
    let stopSting: () => void = () => undefined;
    let phase = 0;
    let finished = false;
    const end = (): void => {
      if (finished) return;
      finished = true;
      window.removeEventListener("keydown", onKey);
      done();
    };
    const byebye = (): void => {
      if (phase >= 3) return;
      phase = 3;
      stopSting();
      horror.matron.vanish();
      this.veil(1, 0);
      events.emit("byebye", { on: true });
      this.after(3, end);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
      if (phase >= 3) end();
      else byebye();
    };
    window.addEventListener("keydown", onKey);
    events.emit("subtitle:clear", {});
    events.emit("card", { title: null });
    events.emit("cine:photo", { show: false });
    horror.matron.vanish();
    if (!flashlight.on) flashlight.toggle();
    this.veil(1, 0);
    // Black and silent. Then she is simply there: a metre from the camera.
    this.after(3, () => {
      if (phase !== 0) return;
      phase = 1;
      const cx = FOYER.x;
      const cz = FOYER.z;
      this.place(cx, cz, FOYER.level, 0);
      // Framing found by looking at it: a metre away, looking up the long neck to the sideways head, turned a little toward it.
      this.cam.yaw = 0.3;
      this.cam.pitch = -0.62;
      horror.matron.appear(cx, cz + 1.0, 0, Math.PI, soft ? 1.2 : 0.02);
      this.veil(0, soft ? 900 : 0);
      stopSting = audio.matronSting();
      this.after(soft ? 2.4 : 1.5, byebye);
    });
  }

  /** Which ending was reached in this session, if any. */
  get reached(): EndingId | null {
    return this.lastEnding;
  }
}
