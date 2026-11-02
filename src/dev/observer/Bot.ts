import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import "@babylonjs/core/Culling/ray";
import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { EventBus } from "../../core/EventBus";
import type { GamePhase } from "../../core/EventBus";
import type { GameState } from "../../core/GameState";
import type { PlayerController } from "../../player/PlayerController";
import type { InteractionSystem } from "../../player/InteractionSystem";
import type { InspectionSystem } from "../../player/InspectionSystem";
import type { StoryDirector } from "../../story/StoryDirector";
import type { HorrorDirector } from "../../horror/HorrorDirector";
import type { Finale } from "../../story/Finale";
import type { House } from "../../world/House";
import type { LightingManager } from "../../atmosphere/LightingManager";
import type { Flashlight } from "../../atmosphere/Flashlight";
import type { AudioManager } from "../../atmosphere/AudioManager";
import type { InventorySystem } from "../../systems/InventorySystem";
import type { SaveSystem } from "../../platform/SaveSystem";
import { Grid, type P2 } from "./Pathing";
import { ROOM_BY_ID, STAIRS, roomAt } from "../../world/Layout";

/** Everything the observer is given by the Game (never imported from game code directly, so the game stays unaware of it). */
export interface ObserverContext {
  scene: Scene;
  events: EventBus;
  state: GameState;
  player: PlayerController;
  interaction: InteractionSystem;
  inspection: InspectionSystem;
  story: StoryDirector;
  horror: HorrorDirector;
  finale: Finale;
  house: House;
  lighting: LightingManager;
  flashlight: Flashlight;
  audio: AudioManager;
  inventory: InventorySystem;
  save: SaveSystem;
  phase(): GamePhase;
  begin(): void;
}

export class BotAbort extends Error {}

const TURN_RATE = 1.5;
const STAIR_X = (STAIRS.x0 + STAIRS.x1) / 2;

/**
 * The automated player. It does only what a person could do: it holds the movement keys, turns the camera smoothly, and
 * presses E, J and the other keys through real keyboard events, so every interaction goes through the same code as normal play.
 * All waiting is in game time, so pause and the speed control apply to it.
 */
export class Bot {
  private waiting: (() => void)[] = [];
  private dt = 0.016;
  clock = 0;
  private held = new Set<string>();
  readonly grid = new Grid();
  private gridReady = false;
  aborted = false;
  /** When true every pause is skipped and cinematics are skipped (fast-forward). */
  fast = false;
  private skipDwell = false;
  private lastWatch = new Map<string, number>();
  /** Counts of things the report needs to be honest about. */
  stats = { stuckNudges: 0, failedUses: [] as string[], replans: 0 };
  annotate: (text: string) => void = () => undefined;

  constructor(readonly c: ObserverContext) {}

  // ---- scheduling ------------------------------------------------------------------------------

  update(dt: number): void {
    if (dt <= 0) return;
    this.dt = dt;
    this.clock += dt;
    const w = this.waiting;
    this.waiting = [];
    for (const r of w) r();
  }

  frame(): Promise<number> {
    if (this.aborted) return Promise.reject(new BotAbort());
    return new Promise((res, rej) => this.waiting.push(() => (this.aborted ? rej(new BotAbort()) : res(this.dt))));
  }

  /** Waits `sec` seconds of game time; cut short by the skip control. */
  async sleep(sec: number): Promise<void> {
    const end = this.clock + (this.fast ? sec * 0.02 : sec);
    this.skipDwell = false;
    while (this.clock < end && !this.skipDwell) {
      await this.frame();
      await this.guide();
    }
  }

  async until(cond: () => boolean, maxSec = 60, label = ""): Promise<boolean> {
    const end = this.clock + maxSec;
    while (!cond()) {
      if (this.clock > end) {
        if (label) this.stats.failedUses.push(`timeout: ${label}`);
        return false;
      }
      await this.frame();
      await this.guide();
    }
    return true;
  }

  skipCurrentWait(): void {
    this.skipDwell = true;
  }

  stop(): void {
    this.aborted = true;
    this.releaseAll();
  }

  /** Lets a guided camera (cinematic look) or a scripted scene run without the bot fighting it. */
  private async guide(): Promise<void> {
    // Nothing to do while scenes are under way: the bot's own loops all check `busy()` before touching the camera or keys.
  }

  busy(): boolean {
    return this.c.finale.busy || this.c.story.inPrologue || this.c.horror.guiding || this.c.phase() === "paused";
  }

  // ---- keys ------------------------------------------------------------------------------------

  private key(code: string, down: boolean, key?: string): void {
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { code, key: key ?? code, bubbles: true }));
  }

  hold(code: string, on: boolean): void {
    if (on === this.held.has(code)) return;
    if (on) this.held.add(code);
    else this.held.delete(code);
    this.key(code, on);
  }

  releaseAll(): void {
    for (const c of [...this.held]) this.hold(c, false);
  }

  tap(code: string, key?: string): void {
    this.key(code, true, key);
    this.key(code, false, key);
  }

  // ---- camera ----------------------------------------------------------------------------------

  private get yaw(): number {
    return this.c.player.camera.rotation.y;
  }

  private get pitch(): number {
    return this.c.player.camera.rotation.x;
  }

  /** Turns the view toward a yaw and pitch at a human pace. Returns true when close enough. */
  private turn(yaw: number, pitch: number, dt: number, rate = TURN_RATE): boolean {
    if (this.c.horror.guiding) return false;
    let dy = yaw - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const step = rate * dt;
    const ny = this.yaw + Math.max(-step, Math.min(step, dy));
    const np = this.pitch + Math.max(-step * 0.6, Math.min(step * 0.6, pitch - this.pitch));
    this.c.player.setLook(ny, np);
    return Math.abs(dy) < 0.05 && Math.abs(pitch - this.pitch) < 0.05;
  }

  async lookAt(p: Vector3, maxSec = 4): Promise<void> {
    const end = this.clock + maxSec;
    while (this.clock < end) {
      const dt = await this.frame();
      const pos = this.c.player.position;
      const dx = p.x - pos.x;
      const dz = p.z - pos.z;
      if (this.turn(Math.atan2(dx, dz), -Math.atan2(p.y - pos.y, Math.hypot(dx, dz)), dt)) return;
    }
  }

  async lookAround(sec = 3.5): Promise<void> {
    const base = this.yaw;
    const start = this.clock;
    while (this.clock - start < sec && !this.skipDwell) {
      const dt = await this.frame();
      const t = (this.clock - start) / sec;
      this.turn(base + Math.sin(t * Math.PI * 2) * 0.9, 0.04, dt, 0.7);
    }
  }

  // ---- world helpers ---------------------------------------------------------------------------

  private level(): 0 | 1 {
    return this.c.player.floorBase > 1.5 ? 1 : 0;
  }

  private prepareGrid(): void {
    if (this.gridReady) return;
    const leaves = new Set<AbstractMesh>(Object.values(this.c.house.doors).map((d) => d.leaf));
    this.grid.build(this.c.scene, leaves);
    this.gridReady = true;
  }

  /** Waits for a recording to end (or for a short time when fast). */
  async hear(id: string, maxSec = 40): Promise<void> {
    const r = this.c.story.recordings;
    await this.until(() => r.playing === id || !!this.c.story.evidence.hasHeard(id), 4);
    const end = this.clock + (this.fast ? 1.5 : maxSec);
    while (r.playing === id && this.clock < end && !this.skipDwell) await this.frame();
    if (r.playing === id) r.stop();
  }

  // ---- walking ---------------------------------------------------------------------------------

  async walkTo(target: P2, level: 0 | 1, label = "", tol = 0.3): Promise<boolean> {
    this.prepareGrid();
    if (this.level() !== level) await this.changeLevel(level);
    for (let attempt = 0; attempt < 4; attempt++) {
      const pos = this.c.player.position;
      const path = this.grid.path(level, { x: pos.x, z: pos.z }, target);
      if (!path) {
        // No route on the grid: record it, then still try walking straight at the target (doors and the real collision decide).
        this.stats.failedUses.push(`no grid path to ${label || `${target.x.toFixed(1)},${target.z.toFixed(1)}`} (walked straight)`);
        if (attempt > 0) return false;
      }
      const ok = await this.follow(path ?? [target], level, tol);
      if (ok) return true;
      this.stats.replans++;
    }
    return false;
  }

  private async follow(path: P2[], level: 0 | 1, tol: number): Promise<boolean> {
    let i = 0;
    let lastCheck = this.clock;
    let lastPos = this.c.player.position.clone();
    let stuckFor = 0;
    while (i < path.length) {
      const dt = await this.frame();
      if (this.busy()) {
        this.hold("KeyW", false);
        continue;
      }
      await this.maybeWatch();
      const pos = this.c.player.position;
      const wp = path[i];
      const dx = wp.x - pos.x;
      const dz = wp.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const last = i === path.length - 1;
      if (dist < (last ? tol : 0.35)) {
        i++;
        continue;
      }
      // Look slightly ahead along the path so turns are rounded, never snapped.
      const aim = path[Math.min(path.length - 1, i + (dist < 1 ? 1 : 0))];
      const yaw = Math.atan2(aim.x - pos.x, aim.z - pos.z);
      let err = yaw - this.yaw;
      err = Math.atan2(Math.sin(err), Math.cos(err));
      this.turn(yaw, 0.04, dt);
      this.hold("KeyW", Math.abs(err) < 0.6);
      if (await this.doorAhead(aim)) continue;
      // Stuck detection: no real progress for a while.
      if (this.clock - lastCheck > 1.2) {
        const moved = Math.hypot(pos.x - lastPos.x, pos.z - lastPos.z);
        lastCheck = this.clock;
        lastPos = pos.clone();
        if (moved < 0.1) {
          stuckFor++;
          if (stuckFor === 1) await this.sidestep();
          else if (stuckFor >= 3) {
            this.hold("KeyW", false);
            return false;
          }
        } else stuckFor = 0;
      }
    }
    this.hold("KeyW", false);
    void level;
    return true;
  }

  private async sidestep(): Promise<void> {
    const key = Math.random() < 0.5 ? "KeyA" : "KeyD";
    this.hold(key, true);
    await this.sleep(0.5);
    this.hold(key, false);
  }

  /** If a closed door is just ahead, stop, look at it and open it, as a person would. */
  private readonly doorTries = new Map<string, { n: number; at: number }>();

  private async doorAhead(aim: P2): Promise<boolean> {
    const pos = this.c.player.position;
    const f = this.c.player.forward;
    for (const [id, d] of Object.entries(this.c.house.doors)) {
      if (d.isOpen || d.isFixed) continue;
      const m = d.leaf.getBoundingInfo().boundingBox.centerWorld;
      if (Math.abs(m.y - pos.y) > 2) continue;
      const dx = m.x - pos.x;
      const dz = m.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.5 || (dx * f.x + dz * f.z) / (dist * Math.hypot(f.x, f.z) || 1) < 0.35) continue;
      // Only a door that is actually on the way: close to the line toward the next waypoint.
      const sx = aim.x - pos.x;
      const sz = aim.z - pos.z;
      const len2 = sx * sx + sz * sz || 1;
      const t = Math.max(0, Math.min(1, (dx * sx + dz * sz) / len2));
      if (Math.hypot(dx - sx * t, dz - sz * t) > 0.75) continue;
      // And it must lie in the direction of travel, not beside or behind the player.
      if ((dx * sx + dz * sz) / (dist * Math.sqrt(len2)) < 0.6) continue;
      // A door that will not open (locked) is left alone after two tries.
      const tries = this.doorTries.get(id) ?? { n: 0, at: this.clock };
      if (tries.n >= 2 && this.clock - tries.at < 40) continue;
      this.doorTries.set(id, { n: tries.n + 1, at: tries.n >= 1 ? tries.at : this.clock });
      this.hold("KeyW", false);
      await this.lookAt(m, 2.5);
      const tag = this.c.interaction.peek()?.tag;
      this.annotate("Daniel opens the door.");
      if (tag?.startsWith("door:")) {
        this.tap("KeyE", "e");
        await this.sleep(0.5);
        if (d.locked) {
          // A locked door that has just been unlocked with a key needs a second press to open.
          this.tap("KeyE", "e");
          await this.sleep(0.4);
        }
        await this.sleep(1.0);
      } else await this.sleep(0.3);
      return true;
    }
    return false;
  }

  /** Climbs or descends the real staircase by walking it. */
  private async changeLevel(to: 0 | 1): Promise<void> {
    const up = to === 1;
    const startZ = up ? STAIRS.z0 - 0.5 : STAIRS.z1 + 0.6;
    await this.walkTo({ x: STAIR_X, z: startZ }, up ? 0 : 1, "stairs", 0.25);
    this.annotate(up ? "Daniel goes upstairs." : "Daniel goes downstairs.");
    const goalZ = up ? STAIRS.z1 + 0.9 : STAIRS.z0 - 0.7;
    const yaw = up ? 0 : Math.PI;
    const end = this.clock + 25;
    while (this.clock < end) {
      const dt = await this.frame();
      if (this.busy()) {
        this.hold("KeyW", false);
        continue;
      }
      const pos = this.c.player.position;
      this.turn(yaw, 0.08, dt);
      // Keep to the middle of the stairs.
      // Facing +z the right-hand key moves toward +x; facing -z it moves toward -x.
      const toEast = pos.x < STAIR_X - 0.25;
      const toWest = pos.x > STAIR_X + 0.25;
      this.hold(up ? "KeyD" : "KeyA", toEast);
      this.hold(up ? "KeyA" : "KeyD", toWest);
      this.hold("KeyW", true);
      if ((up && pos.z > goalZ && this.level() === 1) || (!up && pos.z < goalZ && this.level() === 0)) break;
    }
    this.hold("KeyW", false);
    this.hold("KeyA", false);
    this.hold("KeyD", false);
  }

  // ---- watching things that appear -------------------------------------------------------------

  private async maybeWatch(): Promise<void> {
    const h = this.c.horror;
    const pursuing = h.active?.id === "matron-pursuit";
    for (const [name, e] of [["witness", h.witness], ["matron", h.matron], ["hollow", h.hollow]] as const) {
      if (!e.visible || (name === "matron" && pursuing)) continue;
      if (this.clock - (this.lastWatch.get(name) ?? -999) < 40) continue;
      const pos = this.c.player.position;
      const d = Math.hypot(e.root.position.x - pos.x, e.root.position.z - pos.z);
      if (d > 14 || Math.abs(e.root.position.y - pos.y + 1.65) > 2.5) continue;
      this.lastWatch.set(name, this.clock);
      this.hold("KeyW", false);
      this.annotate(name === "witness" ? "A figure appears. Daniel stops to look at it." : name === "matron" ? "A tall figure appears. Daniel stops." : "Something moves in the dark. Daniel stops.");
      const end = this.clock + 4.5;
      while (this.clock < end && e.visible && !this.skipDwell) {
        const dt = await this.frame();
        const hp = new Vector3(e.root.position.x, e.root.position.y + 1.5, e.root.position.z);
        const p = this.c.player.position;
        this.turn(Math.atan2(hp.x - p.x, hp.z - p.z), -Math.atan2(hp.y - p.y, Math.hypot(hp.x - p.x, hp.z - p.z)), dt, 1.1);
      }
      return;
    }
  }

  // ---- interacting -----------------------------------------------------------------------------

  /** Finds a spot to stand where the real view ray reaches the target: the same ray the player's own view uses. */
  private findStand(center: Vector3, meshes: AbstractMesh[], level: 0 | 1): P2 | null {
    this.prepareGrid();
    const pos = this.c.player.position;
    const cands: { x: number; z: number; d: number }[] = [];
    for (const r of [0.8, 1.0, 1.2, 1.45, 1.7]) {
      for (let a = 0; a < 360; a += 20) {
        const x = center.x + Math.cos((a * Math.PI) / 180) * r;
        const z = center.z + Math.sin((a * Math.PI) / 180) * r;
        if (!this.grid.free(level, x, z)) continue;
        cands.push({ x, z, d: Math.hypot(x - pos.x, z - pos.z) + r * 0.5 });
      }
    }
    cands.sort((p, q) => p.d - q.d);
    const set = new Set(meshes);
    let checked = 0;
    for (const c of cands.slice(0, 120)) {
      const eye = new Vector3(c.x, level * 3 + 1.65, c.z);
      const dir = center.subtract(eye);
      const len = dir.length();
      if (len > 2.2) continue;
      const hit = this.c.interaction.pickFrom(new Ray(eye, dir.normalize(), 2.3));
      if (!hit || !set.has(hit.mesh)) continue;
      // The spot must also be reachable on foot (not a pocket cut off by furniture).
      if (this.level() === level && !this.grid.path(level, { x: pos.x, z: pos.z }, { x: c.x, z: c.z })) {
        if (++checked > 60) break;
        continue;
      }
      return { x: c.x, z: c.z };
    }
    return null;
  }

  /** Walks to an object and looks at it until the game offers it as the current interaction. */
  async approach(tag: string, maxSec = 20, optional = false): Promise<boolean> {
    const meshes = this.c.interaction.meshesFor(tag);
    if (!meshes.length) {
      if (!optional) this.stats.failedUses.push(`not found: ${tag}`);
      return false;
    }
    const m = meshes[0];
    m.computeWorldMatrix(true);
    const center = m.getBoundingInfo().boundingBox.centerWorld.clone();
    const level: 0 | 1 = center.y > 2.5 ? 1 : 0;
    // Rooms far from the player are switched off by the game, and their objects cannot be picked. Walk into the room first.
    const there = roomAt(center.x, center.z, level);
    if (there && roomAt(this.c.player.position.x, this.c.player.position.z, this.level()) !== there) {
      await this.walkTo(this.c.horror.nav.center(there), level, `room of ${tag}`, 0.6);
      await this.sleep(0.3);
    }
    const stand = this.findStand(center, meshes, level);
    if (!stand) {
      this.stats.failedUses.push(`no stand position: ${tag}`);
      return false;
    }
    if (!(await this.walkTo(stand, level, tag, 0.2))) return false;
    const end = this.clock + maxSec;
    let tries = 0;
    while (this.clock < end) {
      // Things on drawers and doors move, so aim at where the object is now.
      m.computeWorldMatrix(true);
      const now = m.getBoundingInfo().boundingBox.centerWorld;
      await this.lookAt(now, 3);
      if (this.c.interaction.peek()?.tag === tag) return true;
      await this.frame();
      if (++tries % 3 === 0) {
        const again = this.findStand(now, meshes, level);
        if (again) await this.walkTo(again, level, tag, 0.2);
      }
    }
    this.stats.failedUses.push(`could not target: ${tag}`);
    return false;
  }

  /** Approach, pause to take it in, and press E. */
  async use(tag: string, opts: { dwell?: number; note?: string } = {}): Promise<boolean> {
    if (!(await this.approach(tag))) return false;
    const prompt = this.c.interaction.peek()?.prompt ?? "";
    this.annotate(opts.note ?? `Daniel: ${prompt}.`);
    await this.sleep(opts.dwell ?? 0.9);
    this.tap("KeyE", "e");
    // Drawers, doors and lids take a moment to move; let them settle before the next action.
    await this.sleep(tag.startsWith("drawer:") || tag.startsWith("door:") || tag === "suitcase" ? 1.6 : 0.25);
    return true;
  }

  /** Reads what is open in the inspection view, then puts it away. */
  async closeInspection(read = 3.2): Promise<void> {
    if (this.c.phase() !== "inspecting") return;
    await this.sleep(read);
    this.tap("KeyE", "e");
    await this.until(() => this.c.phase() !== "inspecting", 4);
    await this.sleep(0.3);
  }

  async examine(evidenceId: string, read = 3.2): Promise<boolean> {
    const ok = await this.use(`read:${evidenceId}`, { note: "Daniel is examining it closely." });
    if (!ok) return false;
    await this.until(() => this.c.phase() === "inspecting", 2);
    await this.closeInspection(read);
    return true;
  }

  async openJournal(tab: string, sec = 3): Promise<void> {
    this.annotate("Daniel checks the journal.");
    this.hold("KeyW", false);
    this.tap("KeyJ", "j");
    if (!(await this.until(() => this.c.phase() === "journal", 3))) return;
    const t = document.querySelector<HTMLElement>(`#journal [data-tab="${tab}"]`);
    t?.click();
    await this.sleep(sec);
  }

  async closeOverlay(): Promise<void> {
    this.tap("Escape", "Escape");
    await this.until(() => this.c.phase() === "playing", 3);
    await this.sleep(0.3);
  }

  /** Aims the flashlight at the dark that lies over some evidence until it shrinks away, as the game teaches the player. */
  async clearVeil(sec = 14): Promise<void> {
    const v = this.c.horror.activeVeils()[0];
    if (!v) return;
    if (!this.c.flashlight.on) this.tap("KeyF", "f");
    const level: 0 | 1 = v.position.y > 2.5 ? 1 : 0;
    // Stand a couple of metres away, inside the room, with a clear line of sight.
    this.prepareGrid();
    const pos = this.c.player.position;
    let best: P2 | null = null;
    let bd = Infinity;
    for (let r = 1.6; r <= 2.8 && !best; r += 0.4) {
      for (let a = 0; a < 360; a += 20) {
        const x = v.position.x + Math.cos((a * Math.PI) / 180) * r;
        const z = v.position.z + Math.sin((a * Math.PI) / 180) * r;
        if (!this.grid.free(level, x, z)) continue;
        const d = Math.hypot(x - pos.x, z - pos.z);
        if (d < bd) {
          bd = d;
          best = { x, z };
        }
      }
    }
    if (best) await this.walkTo(best, level, "the dark", 0.4);
    this.annotate("Daniel shines the flashlight at the dark.");
    const end = this.clock + sec;
    const target = v.position.clone();
    while (this.clock < end && this.c.horror.activeVeils().length) {
      await this.lookAt(target, 1.5);
      await this.frame();
    }
  }

  /** Plays a tape from a deck through the tape panel's own buttons, and listens to it. */
  async playTape(deckId: string, recording: string): Promise<boolean> {
    if (!(await this.use(`deck:${deckId}`, { note: "Daniel uses the recorder." }))) return false;
    if (!(await this.until(() => this.c.phase() === "recorder", 3, `open deck ${deckId}`))) return false;
    await this.sleep(0.8);
    const b = document.querySelector<HTMLElement>(`#recorder [data-tape="${recording}"]`);
    if (!b) {
      await this.closeOverlay();
      this.stats.failedUses.push(`tape not offered: ${recording}`);
      return false;
    }
    b.click();
    await this.hear(recording, 30);
    await this.closeOverlay();
    return true;
  }

  /** Types a code on the keypad overlay with the keys a person would press. */
  async typeCode(code: string): Promise<void> {
    await this.until(() => this.c.phase() === "keypad", 3, "keypad");
    await this.sleep(0.6);
    for (const ch of code) {
      this.tap(`Digit${ch}`, ch);
      await this.sleep(0.45);
    }
    this.tap("Enter", "Enter");
    await this.sleep(0.8);
  }

  /** Waits for a scripted scene to finish; if it is asking a question, answers with the first matching option. */
  async finaleChoices(order: string[]): Promise<void> {
    const queue = [...order];
    while (this.c.finale.busy) {
      await this.frame();
      const box = document.getElementById("choices");
      if (box?.classList.contains("show") && queue.length) {
        const buttons = [...box.querySelectorAll<HTMLElement>("button")];
        const want = queue[0];
        const i = buttons.findIndex((b) => b.dataset.choice === want);
        if (i >= 0) {
          queue.shift();
          this.annotate("Daniel decides what to say.");
          await this.sleep(2.2);
          this.tap(`Digit${i + 1}`, String(i + 1));
          await this.sleep(1);
        }
      }
    }
  }

  /** The room centre nearest to the player where a lamp is on (the pursuit's only safe places). */
  litRoomTarget(): { x: number; z: number; level: 0 | 1 } | null {
    const pos = this.c.player.position;
    const lamps = this.c.lighting.allLamps.filter((l) => l.on && l.room);
    let best: { x: number; z: number; level: 0 | 1; d: number } | null = null;
    for (const l of lamps) {
      const room = l.room!;
      const rooms = this.c.horror.nav.center(room);
      const lvl = ROOM_BY_ID[room].level;
      const d = Math.hypot(rooms.x - pos.x, rooms.z - pos.z) + (lvl !== this.level() ? 8 : 0);
      if (!best || d < best.d) best = { x: rooms.x, z: rooms.z, level: lvl, d };
    }
    return best;
  }

  /** The room the player is standing in, for annotations. */
  roomName(): string | null {
    return roomAt(this.c.player.position.x, this.c.player.position.z, this.level());
  }
}
