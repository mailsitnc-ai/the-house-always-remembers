import type { AudioManager } from "../atmosphere/AudioManager";
import type { LightingManager } from "../atmosphere/LightingManager";
import type { EventBus } from "../core/EventBus";
import type { PlayerController } from "../player/PlayerController";
import type { House } from "../world/House";
import { STAIRS, roomAt, type RoomId } from "../world/Layout";
import type { HorrorDirector } from "./HorrorDirector";
import type { Point } from "./Navigation";

/** Rooms that keep a lamp lit during the chase. She will not enter a lit room (the established rule), so these are where Daniel is safe. */
const REFUGES: { room: RoomId; lamp: string }[] = [
  { room: "foyer", lamp: "foyer-light" },
  { room: "living", lamp: "living-lamp-light" },
  { room: "study", lamp: "desk-lamp-light" },
  // The hall's sconce comes on once Daniel is safe in the foyer (see `lightHall`): the living room and the stairs are only reached through it.
  { room: "hall", lamp: "hall-sconce-light" },
];

const BOTTOM: Point = { x: (STAIRS.x0 + STAIRS.x1) / 2, z: STAIRS.z0 + 0.2 };
const TOP: Point = { x: (STAIRS.x0 + STAIRS.x1) / 2, z: STAIRS.z1 + 0.5 };

export interface ChaseDeps {
  horror: HorrorDirector;
  lighting: LightingManager;
  house: House;
  player: PlayerController;
  audio: AudioManager;
  events: EventBus;
  /** Called each time the Matron gets her hands on him. The chase is paused until `resumeAfterGrab`; the ending logic lives with the caller. */
  onCaught(): void;
  /** Called once, the first time Daniel stands in a lit room: the run is over, the house is the problem. */
  onSafe(): void;
}

/** Daniel's sprint is 3.1 m/s. She is a touch under that when close and surges when he opens a gap, so the gap never grows without limit. */
const BASE_SPEED = 3.0;
const SURGE = 0.95;

/**
 * The final chase. The Matron runs Daniel down through the house: she re-plans her route every third of a second, opens or throws open every
 * door she passes, calls out, and her footsteps are heavy and close. She still cannot cross lamplight: the foyer, the living room and the study
 * keep a lamp lit, and she stops at the edge of the light and waits. A lamp fails now and then (with a buzz and a flicker first) and the room
 * goes dark; Daniel has to move to another lit room before she crosses. She never catches him in a lit room, and she is a little slower than he
 * is at a run, so the chase is lost only by stopping, wandering or standing in a room when its lamp dies.
 */
export class Chase {
  active = false;
  private t = 0;
  private repath = 0;
  private stepT = 0;
  private cryT = 4;
  private slamT = 6;
  private failT = 14;
  private relight: { lamp: string; at: number }[] = [];
  private safeFired = false;
  private caughtFired = false;
  private waitT = 0;
  /** Seconds in which she cannot grab him (the start, and after he has broken free). */
  private grace = 0;
  private stuckT = 0;
  private stuckSample = 0;
  private lastPos = { x: 0, z: 0 };
  private lastDanger = -1;
  /** 0..1: how close she is, for the vignette and the heartbeat. */
  danger = 0;
  /** Number of times she has caught him in this chase. */
  grabs = 0;
  /** She stands where she appeared, calling, for this many seconds before she runs: Daniel's head start. */
  private hold = 3;
  /** The refuge whose lamp has just been warned about or is out (null when every refuge is lit). */
  dark: RoomId | null = null;
  /** Seconds since the chase began (game time). */
  get time(): number {
    return this.t;
  }

  constructor(private readonly d: ChaseDeps) {}

  private lamps(name: string) {
    return this.d.lighting.allLamps.filter((l) => l.light.name === name);
  }

  /**
   * Where she is put back when she is pulled out of the light or found stuck: the dark ground-floor room centre farthest from Daniel, never within 8 m of him
   * (so a reset can never put her at his shoulder), or null if he is not on the ground floor or nothing is far enough (then she is simply left alone).
   */
  private farDark(px: number, pz: number, pLevel: 0 | 1): Point | null {
    if (pLevel !== 0) return null;
    const lit = this.litRooms();
    const best = (["rear", "kitchen", "dining", "hall"] as RoomId[])
      .filter((r) => !lit.has(r))
      .map((r) => this.d.horror.nav.center(r))
      .filter((c) => Math.hypot(c.x - px, c.z - pz) >= 8)
      .sort((a, b) => Math.hypot(b.x - px, b.z - pz) - Math.hypot(a.x - px, a.z - pz))[0];
    return best ?? null;
  }

  /** Which refuge rooms have a lit lamp right now. */
  litRooms(): Set<RoomId> {
    const out = new Set<RoomId>();
    for (const r of REFUGES) if (this.lamps(r.lamp).some((l) => l.on && l.level > 0.5)) out.add(r.room);
    return out;
  }

  /** Starts the chase with the Matron at (x, z) on the given level. Every lamp but the three refuges goes out. */
  start(x: number, z: number, level: 0 | 1, yaw: number, hold = 3): void {
    this.hold = hold;
    const { horror, lighting } = this.d;
    this.active = true;
    this.t = 0;
    this.repath = 0;
    this.cryT = 3.5;
    this.slamT = 5.5;
    this.failT = 14;
    this.relight = [];
    this.safeFired = false;
    this.caughtFired = false;
    this.waitT = 0;
    this.grace = hold + 1.5;
    this.stuckT = 0;
    this.grabs = 0;
    for (const l of lighting.allLamps) l.setOn(REFUGES.some((r) => r.lamp === l.light.name && r.room !== "hall"));
    const m = horror.matron;
    m.run = true;
    m.headRate = 0.9;
    m.appear(x, z, level, yaw, 0.4);
    this.d.audio.duck(0.8);
    this.d.audio.stinger("drop");
    this.d.audio.matronCry("call");
  }

  /** Daniel has broken her hold: she is thrown off for `stun` seconds (and cannot grab for a second after that), then the chase goes on from where it stopped. */
  resumeAfterGrab(stun: number): void {
    this.active = true;
    this.caughtFired = false;
    // The chase clock keeps running (the lamp schedule is on it): only the hold deadline moves.
    this.hold = this.t + stun;
    this.grace = stun + 1.2;
    this.repath = 0;
    this.stuckT = 0;
    const m = this.d.horror.matron;
    m.run = true;
    m.stop();
    this.d.audio.matronCry("shriek");
  }

  /** The hall sconce flickers on: the way between the foyer, the living room and the stairs is lit, and she is driven back out of it. */
  lightHall(): void {
    for (const l of this.lamps("hall-sconce-light")) l.setOn(true);
  }

  /** Rooms with a lit lamp, for the automated player. */
  get litRefuges(): string[] {
    return [...this.litRooms()];
  }

  /** For a resumed chase: Daniel is already in the light, so the "he is safe" moment has passed. */
  markSafe(): void {
    this.safeFired = true;
  }

  stop(): void {
    this.active = false;
    this.dark = null;
    this.setDanger(0);
    const m = this.d.horror.matron;
    m.run = false;
    m.stop();
    for (const r of this.relight) for (const l of this.lamps(r.lamp)) l.setOn(true);
    this.relight = [];
  }

  /** The level of each point on a route (it changes at the stairs). */
  private levelsOf(route: Point[], start: 0 | 1): (0 | 1)[] {
    const out: (0 | 1)[] = [];
    let cur = start;
    for (const p of route) {
      if (Math.hypot(p.x - BOTTOM.x, p.z - BOTTOM.z) < 0.02) cur = 0;
      else if (Math.hypot(p.x - TOP.x, p.z - TOP.z) < 0.02) cur = 1;
      out.push(cur);
    }
    return out;
  }

  update(dt: number): void {
    if (!this.active) return;
    const { horror, player, audio, house } = this.d;
    const m = horror.matron;
    this.t += dt;
    const p = horror.pos;
    const pLevel = horror.level();
    const lit = this.litRooms();
    const playerRoom = horror.room();
    const playerSafe = pLevel === 0 && playerRoom !== null && lit.has(playerRoom);
    if (playerSafe && !this.safeFired) {
      this.safeFired = true;
      this.d.onSafe();
    }
    // Where she is, and how far.
    const mLevel: 0 | 1 = m.root.position.y > 1.5 ? 1 : 0;
    const dist = Math.hypot(m.root.position.x - p.x, m.root.position.z - p.z);
    const sameStorey = Math.abs(m.root.position.y - player.floorBase) < 1.6;

    // Re-plan: run at him, but stop at the edge of any lit room.
    this.repath -= dt;
    if (this.t < this.hold) {
      m.stop();
      this.repath = 0;
    } else if (this.repath <= 0) {
      this.repath = 0.2;
      const mx = m.root.position.x;
      const mz = m.root.position.z;
      const onStairs = mx > 6.5 && mx < 8.1 && mz < 7.9 && mz > 3.2;
      let route: Point[];
      let levels: (0 | 1)[];
      if (mLevel === 1 && pLevel === 0) {
        // Upstairs, the stairwell is a hole in the floor she cannot cross in a straight line: round by the north end of the landing, to the top of the stairs, down.
        const pts: Point[] = [];
        if (!onStairs) {
          if (mx < 6.6 && mz < 8.0) pts.push({ x: 5.9, z: 8.4 });
          pts.push(TOP);
        }
        pts.push(BOTTOM, ...horror.nav.route(BOTTOM, 0, { x: p.x, z: p.z }, 0));
        route = pts;
        levels = [...pts.map((q) => (q === TOP || q.z > 7.8 || q.x === 5.9 ? 1 : 0) as 0 | 1)];
      } else {
        route = horror.nav.route({ x: mx, z: mz }, mLevel, { x: p.x, z: p.z }, pLevel);
        if (mLevel === 1 && mx < 6.6 && mz < 8.0 && p.x > 6.6) route = [{ x: 5.9, z: 8.4 }, ...route];
        levels = this.levelsOf(route, mLevel);
      }
      const safe: Point[] = [];
      for (let i = 0; i < route.length; i++) {
        const r = roomAt(route[i].x, route[i].z, levels[i]);
        if (levels[i] === 0 && r && lit.has(r)) break;
        safe.push(route[i]);
      }
      // She is just under his sprint when he is close, and surges as the gap opens (up to ~3.9 m/s at 10 m): she closes on a runner who wastes time, never on one who keeps moving.
      const surge = Math.max(0, Math.min(1, (dist - 4) / 6)) * SURGE;
      const speed = BASE_SPEED + Math.min(0.2, this.t * 0.003) + surge;
      if (safe.length) m.walk(safe, speed);
      else m.stop();
      // If a lamp came back on around her, the light pushes her out: she is somewhere dark a moment later.
      const here = roomAt(m.root.position.x, m.root.position.z, mLevel);
      if (mLevel === 0 && here && lit.has(here)) {
        this.waitT += 0.2;
        if (this.waitT > 0.9) {
          this.waitT = 0;
          const out = this.farDark(p.x, p.z, pLevel);
          if (out) {
            m.appear(out.x, out.z, 0, Math.atan2(p.x - out.x, p.z - out.z), 0.3);
            m.run = true;
          }
        }
      } else this.waitT = 0;
    }
    // She opens, or throws open, every door she passes.
    for (const d of Object.values(house.doors)) {
      const hp = d.hingePosition;
      if (!d.isOpen && !d.isFixed && Math.hypot(hp.x - m.root.position.x, hp.z - m.root.position.z) < 1.8 && Math.abs(hp.y - m.root.position.y) < 1.8) {
        d.setOpen(true);
        audio.slam(Math.max(0, 1 - dist / 14));
      }
    }
    // Heavy footfalls, closer and louder as she nears.
    this.stepT -= dt;
    if (m.state === "walking" && this.stepT <= 0) {
      this.stepT = 0.33;
      audio.chaseStep(Math.max(0, 1 - dist / 16));
    }
    // Her voice from time to time, and a door thrown somewhere else in the house.
    this.cryT -= dt;
    if (this.cryT <= 0) {
      this.cryT = 7 + Math.random() * 6;
      audio.matronCry(Math.random() < 0.35 ? "shriek" : "call");
    }
    this.slamT -= dt;
    if (this.slamT <= 0) {
      this.slamT = 9 + Math.random() * 7;
      audio.slam(0.4);
    }
    this.lampLife(dt, playerRoom, lit, dist);
    this.grace = Math.max(0, this.grace - dt);
    // She must not stay stuck in geometry: if she is running but has not moved, she is pulled out of the dark behind Daniel.
    this.stuckSample += dt;
    if (this.stuckSample >= 1) {
      this.stuckSample = 0;
      const moved = Math.hypot(m.root.position.x - this.lastPos.x, m.root.position.z - this.lastPos.z);
      this.lastPos = { x: m.root.position.x, z: m.root.position.z };
      this.stuckT = this.t > this.hold && m.state === "walking" && dist > 2.5 && moved < 0.5 ? this.stuckT + 1 : 0;
      if (this.stuckT >= 3) {
        this.stuckT = 0;
        const out = this.farDark(p.x, p.z, pLevel);
        if (out) {
          m.appear(out.x, out.z, 0, Math.atan2(p.x - out.x, p.z - out.z), 0.3);
          m.run = true;
        }
      }
    }
    // Warning: the closer she is, the stronger the vignette and the heartbeat. Silent in the light, and during her head start.
    const warn = !playerSafe && sameStorey && this.t >= this.hold ? Math.max(0, Math.min(1, 1 - (dist - 1.2) / 8)) : 0;
    this.setDanger(warn);
    if (warn > 0.35) {
      this.pulseT -= dt;
      if (this.pulseT <= 0) {
        this.pulseT = 0.95 - warn * 0.55;
        audio.pulse();
      }
    }
    // Grabbed: she reaches him anywhere that is not lit.
    if (!playerSafe && sameStorey && dist < 1.15 && this.grace <= 0 && !this.caughtFired) {
      this.caughtFired = true;
      this.active = false;
      this.grabs++;
      this.setDanger(0);
      this.d.onCaught();
    }
  }

  private pulseT = 0;

  private setDanger(v: number): void {
    this.danger = v;
    if (Math.abs(v - this.lastDanger) < 0.03 && !(v === 0 && this.lastDanger !== 0)) return;
    this.lastDanger = v;
    this.d.events.emit("chase:danger", { level: v });
  }

  /** Lamps die and come back. The failing room is warned about with a buzz and a flicker first, and only one is ever out at a time. */
  private lampLife(dt: number, playerRoom: RoomId | null, lit: Set<RoomId>, dist: number): void {
    const now = this.t;
    for (let i = this.relight.length - 1; i >= 0; i--) {
      if (this.relight[i].at <= now) {
        for (const l of this.lamps(this.relight[i].lamp)) l.setOn(true);
        this.relight.splice(i, 1);
        this.dark = null;
      }
    }
    if (!this.safeFired || this.relight.length) return;
    this.failT -= dt;
    if (this.failT > 0) return;
    this.failT = 15 + Math.random() * 8;
    // Prefer the room Daniel is in: that is the point of it.
    // Fair: a lamp never dies under Daniel while she is waiting at the edge of its light (she must be 5 m or more away).
    const here = dist > 5 ? REFUGES.find((r) => r.room === playerRoom && lit.has(r.room)) : undefined;
    const other = REFUGES.filter((r) => lit.has(r.room));
    if (other.length < 2) return;
    const away = other.filter((r) => r.room !== playerRoom);
    const target = here ?? (away.length ? away : other)[Math.floor(Math.random() * (away.length ? away.length : other.length))];
    this.d.audio.lampBuzz();
    this.dark = target.room;
    const lamps = this.lamps(target.lamp);
    // Warned first: the buzz, a flicker about a second later, and dark about a second after that.
    window.setTimeout(() => lamps.forEach((l) => l.setOn(false)), 700);
    window.setTimeout(() => lamps.forEach((l) => l.setOn(true)), 880);
    window.setTimeout(() => lamps.forEach((l) => l.setOn(false)), 1700);
    this.relight.push({ lamp: target.lamp, at: now + 11 });
  }
}
