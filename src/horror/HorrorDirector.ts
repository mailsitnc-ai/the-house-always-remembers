import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { EventBus } from "../core/EventBus";
import type { GameState } from "../core/GameState";
import type { AudioManager } from "../atmosphere/AudioManager";
import type { LightingManager } from "../atmosphere/LightingManager";
import type { Flashlight } from "../atmosphere/Flashlight";
import type { PlayerController } from "../player/PlayerController";
import type { InteractionSystem } from "../player/InteractionSystem";
import type { RoomRegistry } from "../world/RoomRegistry";
import type { House } from "../world/House";
import type { StoryDirector } from "../story/StoryDirector";
import { ROOMS, ROOM_BY_ID, floorHeight, roomAt, type RoomId } from "../world/Layout";
import { Matron } from "./Matron";
import { Hollow } from "./Hollow";
import { Witness } from "./Witness";
import { Unremembered } from "./Unremembered";
import { Navigation } from "./Navigation";
import { Veil } from "./Veil";
import { DISTURBANCES } from "./Disturbances";
import { buildEncounters, type Encounter } from "./Encounters";
import { Jumpscares } from "./Jumpscares";
import { Staging } from "./Staging";
import { BathroomMirror } from "./BathroomMirror";
import { buildMatronScares } from "./MatronScares";
import { buildLesserEntities } from "./LesserEntities";
import { corruptionStage } from "./Corruption";

export interface HorrorDeps {
  scene: Scene;
  events: EventBus;
  state: GameState;
  audio: AudioManager;
  lighting: LightingManager;
  flashlight: Flashlight;
  player: PlayerController;
  registry: RoomRegistry;
  house: House;
  story: StoryDirector;
  interaction: InteractionSystem;
}

/** Where the Witness stands for each piece of key evidence, and what it faces. */
export const WITNESS_SPOTS: { evidence: string; room: RoomId; level: 0 | 1; at: [number, number]; faces: [number, number] }[] = [
  { evidence: "living-photo", room: "living", level: 0, at: [4.2, 1.2], faces: [0.1, 3.75] },
  { evidence: "kitchen-note", room: "kitchen", level: 0, at: [13.0, 6.2], faces: [11.95, 10.56] },
  { evidence: "emily-recorder", room: "emily", level: 1, at: [1.9, 10.2], faces: [0.4, 8.1] },
  { evidence: "album-print", room: "study", level: 0, at: [12.4, 3.8], faces: [8.35, 3.0] },
  { evidence: "machine-msg3", room: "rear", level: 0, at: [6.5, 10.3], faces: [7.7, 8.45] },
  { evidence: "anna-letter", room: "storage", level: 1, at: [5.7, 10.5], faces: [7.45, 10.1] },
];

/**
 * Runs the whole horror layer: a tension value that rises in the dark and falls in the light, an encounter manager
 * that decides when something may happen (with cooldowns so scares stay rare), small disturbances between encounters,
 * the three lesser entities, and the veils over evidence. The Matron's actual encounters live in Encounters.ts and are
 * tied to story chapters.
 */
export class HorrorDirector {
  readonly matron: Matron;
  readonly hollow: Hollow;
  readonly witness: Witness;
  readonly unremembered: Unremembered;
  readonly nav = new Navigation();
  readonly staging: Staging;
  /** Extra shader/GPU preparation registered by the scenes (their own lights, the mirror), run behind the loading screen with the entities' own warm-up. */
  readonly warmers: ((on: boolean) => void)[] = [];
  readonly mirror: BathroomMirror;
  private roomName: RoomId | null = null;
  private roomSince = 0;
  /** The room the player was last in before this one, and when they left it (for events that happen in the room just left). */
  prevRoom: RoomId | null = null;
  leftAt = -999;
  private lastDisturbance = "";
  private lastEncounterId = "";
  private witnessNoticed = false;
  tension = 0;
  scares = 0;
  enabled = true;
  clock = 0;
  active: Encounter | null = null;
  readonly done = new Set<string>();
  readonly lastEnd = new Map<string, number>();
  readonly chapterStart = new Map<number, number>();
  /** Set when the voice comparison is solved; the pursuit begins a few seconds later. */
  pursuitAt = -1;
  /** The final hunt: she keeps coming until the player reaches Emily's room. */
  hunt = false;
  /** Reduced scare intensity: no visual jolts, quieter stingers. Set from the settings. */
  reduced = false;
  readonly jumpscares: Jumpscares;
  /** Progressive horror: how far the presentation has failed, 0 (composed) to 3 (true form). Eased toward a story-derived target. */
  corruption = 0;
  /** Development tools only: forces a level (and applies it at once). Null in the game. */
  corruptionOverride: number | null = null;
  private corrTarget = 0;
  private corrApplied = -1;
  private corrPoll = 0;

  private readonly encounters: Encounter[];
  private readonly veils = new Map<string, Veil>();
  private readonly jobs: { at: number; fn: () => void }[] = [];
  private lastMajorEnd = -999;
  private lastMinor = -999;
  private lastCheck = 0;
  private lastWitness = -999;
  private witnessId: string | null = null;
  private readonly witnessDone = new Set<string>();
  private pulseT = 0;
  private tensionSent = 0;
  /** A short, skippable camera guide toward something the player should see. The player keeps control throughout. */
  private cine: { target: Vector3; t: number } | null = null;
  private firstWitnessShown = false;

  constructor(readonly deps: HorrorDeps) {
    this.matron = new Matron(deps.scene);
    this.hollow = new Hollow(deps.scene);
    this.witness = new Witness(deps.scene);
    this.unremembered = new Unremembered(deps.scene);
    this.staging = new Staging(deps.scene, this);
    this.mirror = new BathroomMirror(deps.scene);
    this.encounters = [...buildEncounters(this), ...buildMatronScares(this), ...buildLesserEntities(this)];
    this.jumpscares = new Jumpscares(this);
    // The Matron's mouth and hands follow the level of her voice whenever she is on screen and speaking.
    deps.story.recordings.onLevel = (level) => this.matron.speak(this.matron.visible ? level : 0);
    deps.events.on("recording:ended", () => this.matron.speak(0));
    // Looking at something up close ends any guided camera, so the two never fight over the view.
    deps.events.on("inspect:open", () => this.skipCine());

    deps.events.on("chapter:changed", ({ number }) => {
      this.chapterStart.set(number, this.clock);
      this.tension = Math.min(1, this.tension + 0.1);
    });
    deps.events.on("puzzle:solved", ({ id }) => {
      if (id === "voice-analysis") this.pursuitAt = this.clock + 7;
    });
    deps.events.on("evidence:added", ({ id }) => {
      if (this.witnessId === id) {
        this.witness.acknowledge();
        this.deps.audio.shutter();
      }
      // She notices what he finds: from her chapters on, every piece of evidence brings her nearer, soon.
      this.provoke(0.45);
    });
    deps.events.on("recording:ended", () => this.provoke(0.35));
    // Phase 3 left a hook here for the Matron chapter; it is satisfied by the chapter-5 encounters.
    deps.story.onMatronChapter = () => this.chapterStart.set(5, this.clock);
  }

  // ---- helpers the encounters use --------------------------------------------------------------

  room(): RoomId | null {
    return this.deps.registry.currentRoom;
  }

  /**
   * The Matron reacts to what Daniel does: evidence, a recording, Emily's room. From chapter 6 this raises the tension to at least `level` and lets the next big moment come
   * without waiting out the gap (it still obeys its own cooldowns and conditions, and never interrupts one already playing).
   */
  provoke(level: number): void {
    if (this.chapter < 6) return;
    this.tension = Math.min(1, Math.max(this.tension, level));
    this.lastMajorEnd = Math.min(this.lastMajorEnd, this.clock - 60);
  }

  /** Switchable so the effect of the prewarm can be measured against itself (development). */
  prewarmEnabled = true;

  private async prewarmEntities(): Promise<void> {
    // The Matron's own lights are on while hers are compiled (that is the combination she appears in); the Hollow does the same with its rim light.
    for (const w of this.warmers) w(true);
    try {
      await this.matron.prewarm();
    } finally {
      for (const w of this.warmers) w(false);
    }
    await this.hollow.prewarm();
    await this.witness.prewarm();
    // One more level of the Unremembered's fragment models per call, in the background, so the first one a scare needs is already built.
    this.unremembered.primeNext();
  }

  /** A dip of the lights as part of a scare: skipped under "Reduced scare intensity" (no visual punch), like the jumpscares' own. */
  dim(seconds: number): void {
    if (!this.reduced) this.deps.lighting.dip(seconds);
  }

  /** A flicker of the flashlight as part of a scare: skipped under "Reduced scare intensity". */
  flick(seconds: number): void {
    if (!this.reduced) this.deps.flashlight.flicker(seconds);
  }

  /** How long the player has been in the current room. */
  roomSeconds(): number {
    return this.clock - this.roomSince;
  }

  level(): 0 | 1 {
    return this.deps.player.floorBase > 1.5 ? 1 : 0;
  }

  get chapter(): number {
    return this.deps.story.chapterNumber;
  }

  get pos(): Vector3 {
    return this.deps.player.position;
  }

  get forward(): Vector3 {
    return this.deps.player.forward;
  }

  sinceChapter(n: number): number {
    const t = this.chapterStart.get(n);
    return t === undefined ? -1 : this.clock - t;
  }

  /** Is any lamp on in this room? Light is where the player is safe. */
  roomLit(room: RoomId | null): boolean {
    if (!room) return false;
    return this.deps.lighting.allLamps.some((l) => l.room === room && l.on && l.level > 0.5);
  }

  /** True if `room` is on the player's storey and within two links of the current room. */
  sameLevelNear(room: RoomId): boolean {
    const here = this.room();
    if (!here) return false;
    return ROOM_BY_ID[room].level === ROOM_BY_ID[here].level && this.nav.hops(this.nav.center(here), ROOM_BY_ID[here].level, this.nav.center(room), ROOM_BY_ID[room].level) <= 2;
  }

  /** A point `dist` metres behind the player's view, kept inside the current room. */
  awayPoint(dist: number): { x: number; z: number } {
    const f = this.forward;
    const len = Math.hypot(f.x, f.z) || 1;
    const room = this.room();
    const d = room ? ROOM_BY_ID[room] : ROOMS[0];
    const x = this.pos.x - (f.x / len) * dist;
    const z = this.pos.z - (f.z / len) * dist;
    return { x: Math.max(d.x0 + 0.5, Math.min(d.x1 - 0.5, x)), z: Math.max(d.z0 + 0.5, Math.min(d.z1 - 0.5, z)) };
  }

  /** The point in the current room farthest from the player, preferring somewhere outside the view. */
  farPoint(): { x: number; z: number; dist: number } {
    const room = this.room();
    const d = room ? ROOM_BY_ID[room] : ROOMS[0];
    const f = this.forward;
    const fl = Math.hypot(f.x, f.z) || 1;
    let best = { x: d.x0 + 1, z: d.z0 + 1, dist: 0 };
    let bestScore = -Infinity;
    for (let x = d.x0 + 0.6; x <= d.x1 - 0.6; x += 0.5) {
      for (let z = d.z0 + 0.6; z <= d.z1 - 0.6; z += 0.5) {
        const dx = x - this.pos.x;
        const dz = z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        const inView = (dx * f.x + dz * f.z) / (dist * fl + 1e-6) > 0.6;
        const score = dist - (inView ? 1.5 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = { x, z, dist };
        }
      }
    }
    return best;
  }

  /** Plays a line in the Matron's voice with subtitles. Returns false if something else is already playing. */
  say(id: string, interrupt = false): boolean {
    if (this.deps.story.recordings.playing) {
      if (!interrupt) return false;
      this.deps.story.recordings.stop();
    }
    // Her voice comes from where she stands, so it can be located in the house.
    const at = this.matron.visible ? this.matron.position.clone() : undefined;
    if (at) at.y += 1.9;
    return this.deps.story.recordings.play(id, 0.2, at);
  }

  /**
   * Opens a short cinematic beat: letterbox bars and a slow turn of the view toward `target`. Moving the mouse or pressing
   * Space/Enter ends it at once, and it ends by itself after a few seconds. Movement is never locked.
   */
  focus(target: Vector3, seconds = 4.5): void {
    this.cine = { target, t: seconds };
    this.deps.player.resetLookMoved();
    this.deps.events.emit("cine:letterbox", { on: true });
  }

  /** The veils currently over evidence (developer tools use this to aim the flashlight at them). */
  activeVeils(): { position: Vector3; cleared: boolean }[] {
    return [...this.veils.values()].filter((v) => !v.cleared);
  }

  /** True while a short guided camera look is running. */
  get guiding(): boolean {
    return this.cine !== null;
  }

  skipCine(): void {
    if (!this.cine) return;
    this.cine = null;
    this.deps.events.emit("cine:letterbox", { on: false });
  }

  private updateCine(dt: number): void {
    const c = this.cine;
    if (!c) return;
    c.t -= dt;
    if (c.t <= 0 || !this.deps.player.guideLook(c.target, 0.7, dt)) this.skipCine();
  }

  get speaking(): boolean {
    return this.deps.story.recordings.playing !== null;
  }

  later(seconds: number, fn: () => void): void {
    this.jobs.push({ at: this.clock + seconds, fn });
  }

  /** Coordinated scare: a sound, a light event and optional silence before it, all at once. */
  scare(o: { sting?: "swell" | "sting" | "drop"; dip?: number; duck?: number; flicker?: number }): void {
    const { audio, lighting, flashlight } = this.deps;
    if (o.duck) audio.duck(o.duck);
    this.later(o.duck ? o.duck * 0.8 : 0, () => {
      if (o.sting) audio.stinger(o.sting);
      if (o.dip) lighting.dip(o.dip);
      if (o.flicker) flashlight.flicker(o.flicker);
    });
    this.scares++;
  }

  // ---- main loop -------------------------------------------------------------------------------

  /**
   * For scenes that switch the director off (the finale): the Matron still has to fade in, move and change, and the story-derived level (the chamber
   * scene is what raises it to the true form) has to keep following the story. Nothing else of the director runs.
   */
  stageUpdate(dt: number): void {
    this.updateCorruption(dt);
    if (this.matron.visible) {
      this.matron.update(dt, this.pos);
      // On the stairs she has to follow the ramp (the full director does this; the finale only runs this much of it).
      if (this.matron.state === "walking" && this.matron.root.position.x < 30) this.matron.snapToFloor(this.floorFor(this.matron.root.position));
    }
  }

  update(dt: number): void {
    if (!this.enabled) return;
    this.clock += dt;
    const rm = this.room();
    if (rm !== this.roomName) {
      if (this.roomName && rm) {
        this.prevRoom = this.roomName;
        this.leftAt = this.clock;
      }
      this.roomName = rm;
      this.roomSince = this.clock;
      if (rm === "emily") this.provoke(0.3);
      // A moment after entering a room (its lamps are settled), the entities' shaders for this lighting are made ready, so a scare here compiles nothing.
      if (this.prewarmEnabled) this.later(0.5, () => void this.prewarmEntities());
    }
    this.updateCorruption(dt);
    const { player } = this.deps;
    this.matron.update(dt, this.pos);
    this.hollow.update(dt);
    this.hollow.setViewer(this.pos);
    this.witness.update(dt);
    this.unremembered.update(dt, this.pos, this.forward);
    // Keep walking figures on the floor (and on the stairs).
    if (this.matron.visible && this.matron.state === "walking") this.matron.snapToFloor(this.floorFor(this.matron.root.position));
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      if (this.jobs[i].at <= this.clock) this.jobs.splice(i, 1)[0].fn();
    }

    this.updateTension(dt);
    this.updateVeils(dt);
    this.updatePresence();
    this.updateWitness(dt);
    this.updateCine(dt);
    this.jumpscares.update(dt);
    // The final hunt ends the moment the player is in Emily's room, whether or not the pursuit happens to be running.
    // (If a recording is playing the pursuit cannot start, so this must not depend on it.)
    if (this.hunt && this.level() === 1 && this.room() === "emily") {
      this.endHunt();
      if (this.active?.id === "matron-pursuit") this.endActive();
      this.matron.vanish();
      this.deps.events.emit("finale:arrived", {});
    }
    void player;

    if (this.active) {
      if (this.active.update(dt)) this.endActive();
    } else if (this.clock - this.lastCheck > 1) {
      this.lastCheck = this.clock;
      this.chooseEncounter();
      if (!this.active) this.maybeDisturb();
    }
  }

  // ---- progressive horror -----------------------------------------------------------------------

  /** The story-derived target, eased toward slowly (a few seconds per step) so a transformation is seen, never a pop. */
  private updateCorruption(dt: number): void {
    this.corrPoll += dt;
    if (this.corrPoll > 0.5) {
      this.corrPoll = 0;
      // From what Daniel has found and done, never from a timer, and it never goes back down.
      this.corrTarget = Math.max(this.corrTarget, corruptionStage(this.deps.story.evidence, this.deps.state) - 1);
    }
    const target = this.corruptionOverride ?? this.corrTarget;
    const rate = target > this.corruption ? (target >= 3 ? 0.6 : 0.3) : 1;
    this.corruption += Math.max(-rate * dt, Math.min(rate * dt, target - this.corruption));
    if (Math.abs(this.corruption - this.corrApplied) > 0.002) this.applyCorruption();
    // The first time the Matron changes into her true form is remembered, so a loaded game shows the finished form and does not play it again.
    if (this.matron.transforming && !this.deps.state.get("seen:true-form")) this.deps.state.set("seen:true-form");
  }

  private applyCorruption(): void {
    this.corrApplied = this.corruption;
    this.matron.setCorruption(this.corruption);
    this.witness.setCorruption(this.corruption);
    this.hollow.setCorruption(this.corruption);
    this.unremembered.setCorruption(this.corruption);
  }

  /** Jumps to a level at once (loading a save, and development screenshots). */
  setCorruptionNow(c: number, override = false): void {
    this.corruption = c;
    if (override) this.corruptionOverride = c;
    this.applyCorruption();
  }

  private floorFor(p: Vector3): number {
    // On the stairs the ramp decides; elsewhere the figure stays on the storey it is on.
    return floorHeight(p.x, p.z, p.y);
  }

  private updateTension(dt: number): void {
    const dark = !this.roomLit(this.room());
    // From the Matron's chapters on the house does not let him rest: tension climbs faster in the dark and barely falls in the light.
    const late = this.chapter >= 6;
    this.tension += dt * (dark ? (late ? 0.02 : 0.012) : late ? -0.006 : -0.03);
    if (this.chapter >= 4) this.tension += dt * 0.004;
    if (this.matron.visible) this.tension += dt * 0.02;
    this.tension = Math.max(0, Math.min(1, this.tension));
    this.tensionSent += dt;
    if (this.tensionSent > 1) {
      this.tensionSent = 0;
      this.deps.audio.setTension(this.tension);
    }
    if (this.tension > 0.75 && !this.speaking) {
      this.pulseT += dt;
      if (this.pulseT > 1.0 - this.tension * 0.4) {
        this.pulseT = 0;
        this.deps.audio.pulse();
      }
    }
  }

  private updatePresence(): void {
    const m = this.matron;
    const near = m.visible ? Math.max(0, 1 - m.distanceTo(this.pos) / 10) : 0;
    this.deps.audio.setPresence(near);
  }

  // ---- encounters ------------------------------------------------------------------------------

  private chooseEncounter(): void {
    if (this.speaking && !this.active) return;
    // The gap between big moments tightens as the story does: patient early, relentless in the last chapters.
    const gap = this.chapter >= 8 ? 24 : this.chapter >= 7 ? 32 : this.chapter >= 6 ? 40 : 55;
    const major = this.hunt || this.clock - this.lastMajorEnd > gap;
    const options = this.encounters.filter((e) => {
      if (e.major && !major) return false;
      if (e.once && this.done.has(e.id)) return false;
      if (this.chapter < e.minChapter || this.chapter > e.maxChapter) return false;
      if (this.tension < e.minTension) return false;
      const last = this.lastEnd.get(e.id);
      if (last !== undefined && this.clock - last < e.cooldown) return false;
      return e.canStart();
    });
    if (!options.length) return;
    // Fair rotation: of everything that could play now, what has never played this session, or not for the longest time, is favoured over what played last. Priority still
    // matters (the story's own encounters keep their weight), but one scare can no longer crowd the others out, and none is forced: it only wins if its own conditions hold.
    const score = (e: Encounter): number => {
      const last = this.lastEnd.get(e.id);
      const fresh = last === undefined ? 3.5 : Math.min(3, (this.clock - last) / 90);
      const justPlayed = this.lastEncounterId === e.id ? -4 : 0;
      return e.priority + fresh + justPlayed + Math.random() * 1.2;
    };
    const pick = options.sort((a, b) => score(b) - score(a))[0];
    this.lastEncounterId = pick.id;
    this.active = pick;
    pick.start();
  }

  private endActive(): void {
    const e = this.active!;
    e.end?.();
    this.active = null;
    this.done.add(e.id);
    this.lastEnd.set(e.id, this.clock);
    if (e.major) this.lastMajorEnd = this.clock;
    this.tension = Math.max(0, this.tension - 0.5);
  }

  /** The encounters and scares that have played, so a loaded game does not repeat them. */
  snapshot(): { done: string[]; witness: string[]; scares: string[] } {
    return { done: [...this.done], witness: [...this.witnessDone], scares: this.jumpscares.doneIds };
  }

  restore(s: { done: string[]; witness: string[]; scares: string[] }): void {
    this.done.clear();
    for (const id of s.done) this.done.add(id);
    this.witnessDone.clear();
    for (const id of s.witness) this.witnessDone.add(id);
    this.firstWitnessShown = s.witness.length > 0 || this.deps.state.get("seen:witness");
    this.jumpscares.restore(s.scares);
    this.chapterStart.set(this.chapter, this.clock);
    this.active = null;
    // A loaded game shows the same presentation it was saved with, from the first frame.
    this.corrTarget = corruptionStage(this.deps.story.evidence, this.deps.state) - 1;
    this.setCorruptionNow(this.corrTarget);
    if (this.corrTarget >= 2.5 && this.deps.state.get("seen:true-form")) this.matron.skipTransformation();
  }

  /** Starts the final hunt (chapter 8). The pursuit repeats, with pauses, until the player reaches Emily's room. */
  beginHunt(): void {
    this.hunt = true;
    this.pursuitAt = this.clock + 4;
  }

  endHunt(): void {
    this.hunt = false;
    this.pursuitAt = -1;
  }

  /** Starts an encounter by id regardless of its conditions (tests and debugging). */
  force(id: string): void {
    const e = this.encounters.find((x) => x.id === id);
    if (!e) throw new Error(`Unknown encounter ${id}`);
    if (this.active) this.endActive();
    this.active = e;
    e.start();
  }

  /** Forces an encounter to end (used when the player leaves, or for tests). */
  abort(): void {
    if (this.active) this.endActive();
    this.matron.vanish();
    this.hollow.vanish();
    this.unremembered.clear();
  }

  private maybeDisturb(): void {
    // No random wrongness until the player has looked at the family photograph: the opening is paced by the story, not by chance.
    if (this.chapter < 2 || this.hunt || this.speaking || !this.deps.story.evidence.has("living-photo")) return;
    // The house is quiet early and restless late: the gap and the chance both tighten with the chapter.
    const gap = this.chapter >= 6 ? 14 : this.chapter >= 4 ? 24 : 38;
    const chance = this.chapter >= 6 ? 0.7 : this.chapter >= 4 ? 0.5 : 0.35;
    if (this.clock - this.lastMinor < gap) return;
    const options = DISTURBANCES.filter((d) => this.tension >= d.minTension && this.chapter >= (d.minChapter ?? 2) && (!d.when || d.when(this)));
    if (!options.length || Math.random() > chance) return;
    // Not the same one twice in a row.
    const fresh = options.filter((d) => d.id !== this.lastDisturbance);
    const pool = fresh.length ? fresh : options;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.lastDisturbance = pick.id;
    pick.run(this);
    this.lastMinor = this.clock;
    this.tension = Math.max(0, this.tension - 0.05);
  }

  // ---- veils over evidence ---------------------------------------------------------------------

  private updateVeils(dt: number): void {
    const { story } = this.deps;
    const room = this.room();
    const need = (id: string, room_: RoomId, minChapter: number, evidence: string, at: Vector3, r: number) => {
      if (this.veils.has(id) || this.chapter < minChapter || story.evidence.has(evidence) || room !== room_) return;
      this.veils.set(id, new Veil(this.deps.scene, at, r, this.deps.interaction, this.deps.flashlight, this.deps.audio, this.deps.events, () => this.deps.events.emit("toast", { text: "The dark thins and is gone.", ms: 2500 })));
      this.scares += 0;
    };
    need("album", "study", 4, "album-print", new Vector3(8.35, 1.36, 3.0), 0.55);
    need("suitcase", "storage", 6, "anna-letter", new Vector3(7.45, 3.3, 10.1), 0.6);
    for (const v of this.veils.values()) v.update(dt);
  }

  // ---- the Witness -----------------------------------------------------------------------------

  private updateWitness(dt: number): void {
    const w = this.witness;
    const { story } = this.deps;
    if (w.visible && this.witnessId) {
      const spot = WITNESS_SPOTS.find((s) => s.evidence === this.witnessId)!;
      const d = w.distanceTo(this.pos);
      const seen = w.seenBy(this.pos, this.forward, 0.9);
      w.setSeen(w.seenBy(this.pos, this.forward, 0.6));
      w.guide(this.pos, this.forward, dt);
      w.gaze = seen ? w.gaze + 0.016 : Math.max(0, w.gaze - 0.01);
      // The first time it is properly noticed, the shutter: a click and a blink of the light, like a photograph being taken. Never hostile, once per sighting.
      if (seen && !this.witnessNoticed) {
        this.witnessNoticed = true;
        w.noticed();
        this.deps.audio.shutter();
        if (!this.reduced) this.deps.lighting.dip(0.14);
      }
      if (d < 1.6 || w.gaze > 7 || w.satisfied || this.room() !== spot.room) {
        w.hide(1.6);
        if (!this.deps.state.get("said:witness-gone") && spot.evidence === "emily-recorder") {
          this.deps.state.set("said:witness-gone");
          this.later(1.5, () => this.deps.events.emit("thought", { text: "It was looking at that little recorder. Whatever it is, it wanted me to see it." }));
        }
        this.witnessDone.add(spot.evidence);
        this.witnessId = null;
        this.lastWitness = this.clock;
      }
      return;
    }
    // The first sighting is never held back by tension or a cooldown: it is a story beat, not a random scare.
    if (this.clock - this.lastWitness < 20 || this.active || this.chapter < 3 || (this.firstWitnessShown && this.tension > 0.6)) return;
    const room = this.room();
    // The first sighting is the one in Emily's room, so it can be introduced properly. If the recorder was already taken
    // before chapter 3, that sighting can no longer happen and the first one is simply the next place it guards.
    const firstAtRecorder = !story.evidence.has("emily-recorder");
    for (const s of WITNESS_SPOTS) {
      if (s.room !== room || this.witnessDone.has(s.evidence) || story.evidence.has(s.evidence)) continue;
      if (!this.firstWitnessShown && firstAtRecorder && s.evidence !== "emily-recorder") continue;
      // Seen from a distance: the first sighting is across the room, never close.
      if (Math.hypot(this.pos.x - s.at[0], this.pos.z - s.at[1]) < (this.firstWitnessShown ? 1.8 : 3.2)) continue;
      w.appear(s.at[0], s.at[1], s.level, s.faces[0], s.faces[1]);
      this.deps.audio.shutter();
      if (!this.firstWitnessShown) {
        // The first time, the view turns slowly toward it, and Daniel says something short.
        this.firstWitnessShown = true;
        this.deps.state.set("seen:witness");
        this.focus(new Vector3(s.at[0], this.floorFor(w.root.position) + 1.5, s.at[1]), 3.5);
        // Daniel describes what he sees and nothing more: it is not the woman from the hall, and it is not threatening.
        this.later(2.5, () => this.deps.events.emit("thought", { text: "Someone is standing there. A hat, a long coat, something held to its chest. It isn't looking at me." }));
      }
      this.witnessId = s.evidence;
      this.witnessNoticed = false;
      return;
    }
  }

  // ---- misc ------------------------------------------------------------------------------------

  roomAtPlayer(): RoomId | null {
    return roomAt(this.pos.x, this.pos.z, this.level());
  }

  /** Compiles entity materials behind the loading screen. */
  warm(on: boolean): void {
    this.matron.warm(on);
    this.hollow.warm(on);
    this.witness.warm(on);
    this.unremembered.warm(on);
    // Their lights, the bathroom mirror and the placement colliders are prepared now, so the first scare does not stall the frame to build them.
    if (on) this.staging.prime();
    for (const w of this.warmers) w(on);
    this.mirror.warm(on, this.matron.meshList);
  }

  /** Status line for the performance overlay. */
  status(): string {
    const seen = [this.matron.visible ? "matron" : "", this.hollow.visible ? "hollow" : "", this.witness.visible ? "witness" : "", this.unremembered.count ? "fragments" : ""].filter(Boolean).join(",");
    return `horror tension ${this.tension.toFixed(2)} · scares ${this.scares}${this.active ? ` · ${this.active.id}` : ""}${seen ? ` · ${seen}` : ""}`;
  }
}
