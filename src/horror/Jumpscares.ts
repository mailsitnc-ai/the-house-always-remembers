import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { HorrorDirector } from "./HorrorDirector";
import type { RoomId } from "../world/Layout";

/**
 * Authored jumpscares. Each one has a place, a condition, a cooldown and an effect, and they are paced by one shared gap
 * so the player is never scared twice in a short time. They are the sudden counterpart to the slow encounters in
 * Encounters.ts. Reduced scare intensity removes the visual punch and the light dip and leaves a quiet sound; nothing
 * here shakes the screen or plays loudly.
 */
export interface Scare {
  id: string;
  /** True: only ever once per game. False: repeatable after its cooldown. */
  once: boolean;
  cooldown: number;
  minChapter: number;
  maxChapter: number;
  /** Only in these rooms (authored trigger locations). */
  rooms: RoomId[];
  /** Attention and proximity check, evaluated about four times a second. */
  when(): boolean;
  /** The effect. Returns how many seconds it lasts. */
  run(): number;
  /** Called when the effect ends (or is cancelled). */
  end?(): void;
}

const GLOBAL_GAP = 50;
const tmp = new Vector3();

export class Jumpscares {
  private readonly scares: Scare[];
  private readonly done = new Set<string>();
  private readonly last = new Map<string, number>();
  private lastAny = -999;
  private running: { scare: Scare; left: number } | null = null;
  private tick = 0;
  /** Where the player last left a room through, and when: the "look back" scare uses it. */
  private left: { x: number; z: number; room: RoomId; at: number } | null = null;
  private roomSince = 0;
  private lastRoom: RoomId | null = null;
  private fovBase = 0;
  private fovLeft = 0;

  constructor(private readonly h: HorrorDirector) {
    const { hollow, matron } = h;
    this.scares = [
      // A figure stands in the doorway you just walked through, where there was nothing.
      {
        id: "doorway-behind",
        once: false,
        cooldown: 260,
        minChapter: 3,
        maxChapter: 8,
        rooms: ["hall", "uphall", "dining", "living", "kitchen", "study", "rear", "foyer"],
        when: () => {
          const l = this.left;
          if (!l || h.clock - l.at < 2.5 || h.clock - l.at > 14) return false;
          const d = this.dirTo(l.x, l.z);
          return d.dist > 3 && d.dist < 8 && d.dot > 0.82 && h.tension > 0.12;
        },
        run: () => {
          const l = this.left;
          if (!l) return 0;
          hollow.appear(l.x, l.z, h.level(), h.pos, 0.12);
          this.punch(0.1);
          this.sound("sting");
          this.left = null;
          h.later(0.9, () => hollow.vanish());
          return 1.2;
        },
        end: () => hollow.vanish(),
      },
      // At the far end of a corridor, something stutters toward you and is gone.
      {
        id: "corridor-run",
        once: false,
        cooldown: 320,
        minChapter: 5,
        maxChapter: 8,
        rooms: ["hall", "uphall"],
        when: () => {
          const p = this.farEnd();
          if (!p) return false;
          const d = this.dirTo(p.x, p.z);
          return d.dot > 0.86 && d.dist > 6 && h.tension > 0.2;
        },
        run: () => {
          const p = this.farEnd()!;
          hollow.appear(p.x, p.z, h.level(), h.pos, 0.2);
          for (const [t, dist] of [[0.5, 2.2], [0.95, 2.0], [1.4, 1.6]] as const) h.later(t, () => hollow.jumpToward(h.pos.x, h.pos.z, dist));
          this.sound("sting");
          h.later(1.9, () => hollow.vanish());
          return 2.4;
        },
        end: () => hollow.vanish(),
      },
      // In a dark room you glance into: a pale face, for half a second.
      {
        id: "face-in-dark",
        once: false,
        cooldown: 300,
        minChapter: 3,
        maxChapter: 8,
        rooms: ["dining", "study", "kitchen", "living", "storage", "daniel", "bathroom"],
        when: () => !h.roomLit(h.room()) && h.clock - this.roomSince > 7 && h.forward.y > -0.4 && h.tension > 0.15,
        run: () => {
          const f = h.forward;
          const len = Math.hypot(f.x, f.z) || 1;
          const x = h.pos.x + (f.x / len) * 5;
          const z = h.pos.z + (f.z / len) * 5;
          matron.headRate = 1.2;
          matron.appear(x, z, h.level(), Math.atan2(h.pos.x - x, h.pos.z - z), 0.12);
          this.punch(0.08);
          this.sound("drop");
          h.later(0.55, () => matron.leave(0.15));
          return 0.9;
        },
        end: () => matron.vanish(),
      },
      // She is behind you, in a lit passage, where you would have seen her.
      {
        id: "matron-behind",
        once: true,
        cooldown: 0,
        minChapter: 5,
        maxChapter: 8,
        rooms: ["hall", "uphall"],
        when: () => h.roomLit(h.room()) && h.sinceChapter(h.chapter) > 30 && h.tension > 0.25 && !h.speaking,
        run: () => {
          const p = h.awayPoint(3.2);
          matron.headRate = 0.6;
          matron.appear(p.x, p.z, h.level(), Math.atan2(h.pos.x - p.x, h.pos.z - p.z), 0.6);
          this.sound("swell");
          const watch = (): void => {
            if (!matron.visible) return;
            if (matron.seenBy(h.pos, h.forward, 0.92)) {
              h.later(0.8, () => matron.leave(1.6));
              this.punch(0.07);
            } else h.later(0.3, watch);
          };
          h.later(0.4, watch);
          h.later(7, () => matron.leave(1.5));
          return 8.5;
        },
        end: () => matron.leave(1),
      },
    ];
  }

  private dirTo(x: number, z: number): { dist: number; dot: number } {
    const p = this.h.pos;
    const f = this.h.forward;
    tmp.set(x - p.x, 0, z - p.z);
    const dist = tmp.length() || 1e-6;
    const fl = Math.hypot(f.x, f.z) || 1;
    return { dist, dot: (tmp.x * f.x + tmp.z * f.z) / (dist * fl) };
  }

  /** The end of the current corridor the player is looking down. */
  private farEnd(): { x: number; z: number } | null {
    const h = this.h;
    const f = h.forward;
    const fl = Math.hypot(f.x, f.z) || 1;
    const x = h.pos.x + (f.x / fl) * 7;
    const z = h.pos.z + (f.z / fl) * 7;
    return Math.abs(x - 6.5) < 1.4 ? { x: 6.5, z: Math.max(1.2, Math.min(10.3, z)) } : null;
  }

  private sound(kind: "sting" | "drop" | "swell"): void {
    this.h.deps.audio.stinger(kind);
  }

  /** A brief field-of-view kick and a one-frame dim. Off when the player has chosen reduced scare intensity. */
  punch(amount: number): void {
    if (this.h.reduced) return;
    const cam = this.h.deps.player.camera;
    if (this.fovLeft <= 0) this.fovBase = cam.fov;
    cam.fov = this.fovBase + amount;
    this.fovLeft = 0.22;
    this.h.deps.events.emit("veil", { opacity: 0.35, ms: 40, color: "#000" });
    this.h.later(0.12, () => this.h.deps.events.emit("veil", { opacity: 0, ms: 400, color: "#000" }));
  }

  get doneIds(): string[] {
    return [...this.done];
  }

  restore(ids: string[]): void {
    this.done.clear();
    for (const id of ids) this.done.add(id);
  }

  /** True while a scare's effect is running, so other systems can stay quiet. */
  get active(): boolean {
    return this.running !== null;
  }

  update(dt: number): void {
    const h = this.h;
    if (this.fovLeft > 0) {
      this.fovLeft -= dt;
      const cam = h.deps.player.camera;
      cam.fov += (this.fovBase - cam.fov) * Math.min(1, dt * 12);
      if (this.fovLeft <= 0) cam.fov = this.fovBase;
    }
    const room = h.room();
    if (room !== this.lastRoom) {
      if (this.lastRoom && room) this.left = { x: h.pos.x, z: h.pos.z, room: this.lastRoom, at: h.clock };
      this.lastRoom = room;
      this.roomSince = h.clock;
    }
    if (this.running) {
      this.running.left -= dt;
      if (this.running.left <= 0) {
        this.running.scare.end?.();
        this.running = null;
      }
      return;
    }
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 0.25;
    if (!room || h.active || h.speaking || h.hunt || h.clock - this.lastAny < (h.chapter >= 6 ? GLOBAL_GAP * 0.65 : GLOBAL_GAP) || h.deps.story.inPrologue) return;
    for (const s of this.scares) {
      if (h.chapter < s.minChapter || h.chapter > s.maxChapter || !s.rooms.includes(room)) continue;
      if (s.once && this.done.has(s.id)) continue;
      const last = this.last.get(s.id);
      if (last !== undefined && h.clock - last < s.cooldown) continue;
      if (!s.when()) continue;
      this.done.add(s.id);
      this.last.set(s.id, h.clock);
      this.lastAny = h.clock;
      h.deps.events.emit("scare", { id: s.id, visual: !h.reduced });
      this.running = { scare: s, left: s.run() };
      return;
    }
  }

  /** Starts a scare by id, ignoring its conditions (tests). */
  force(id: string): void {
    const s = this.scares.find((x) => x.id === id);
    if (!s) throw new Error(`Unknown scare ${id}`);
    this.running?.scare.end?.();
    this.running = { scare: s, left: s.run() };
  }
}
