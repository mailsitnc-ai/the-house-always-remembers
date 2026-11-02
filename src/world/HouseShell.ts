import type { Builder } from "./Builder";
import type { WorldContext } from "./WorldContext";
import { LEVEL_Y, ROOMS, STAIRS, T, WALLS, WALL_H, roomAt, type Opening, type RoomId, type WallLine } from "./Layout";
import type { V3 } from "./geometry";

export interface PlacedOpening {
  key: string;
  axis: "x" | "z";
  fixed: number;
  level: 0 | 1;
  from: number;
  to: number;
  kind: Opening["kind"];
  top: number;
  rooms: RoomId[];
}

const CURTAINED: RoomId[] = ["living", "dining", "study", "daniel", "emily", "uphall"];
const STEPS = 17;

type Rect = { x0: number; x1: number; z0: number; z1: number };

function rectMinus(r: Rect, h: Rect): Rect[] {
  const out: Rect[] = [];
  const push = (x0: number, x1: number, z0: number, z1: number) => {
    if (x1 - x0 > 1e-6 && z1 - z0 > 1e-6) out.push({ x0, x1, z0, z1 });
  };
  push(r.x0, r.x1, r.z0, h.z0);
  push(r.x0, r.x1, h.z1, r.z1);
  push(r.x0, h.x0, h.z0, h.z1);
  push(h.x1, r.x1, h.z0, h.z1);
  return out;
}

/** Builds walls, openings, windows, floors, ceilings and the staircase from the floor plan. */
export class HouseShell {
  readonly openings: PlacedOpening[] = [];

  constructor(
    private readonly b: Builder,
    private readonly ctx: WorldContext,
  ) {}

  build(): void {
    for (const w of WALLS) this.wall(w);
    for (const r of ROOMS) this.slabs(r.id);
    this.stairs();
  }

  // ---- walls -----------------------------------------------------------------------------------

  private sideRooms(w: WallLine, along: number): [RoomId | null, RoomId | null] {
    const o = 0.4;
    return w.axis === "z" ? [roomAt(w.fixed - o, along, w.level), roomAt(w.fixed + o, along, w.level)] : [roomAt(along, w.fixed - o, w.level), roomAt(along, w.fixed + o, w.level)];
  }

  private wall(w: WallLine): void {
    const base = LEVEL_Y[w.level];
    const ops = [...w.openings].sort((p, q) => p.from - q.from);
    const pieces: { from: number; to: number; y0: number; y1: number }[] = [];
    let cursor = w.from - T / 2;
    for (const o of ops) {
      if (o.from > cursor) pieces.push({ from: cursor, to: o.from, y0: 0, y1: WALL_H });
      if (o.bottom > 0) pieces.push({ from: o.from, to: o.to, y0: 0, y1: o.bottom });
      if (o.top < WALL_H) pieces.push({ from: o.from, to: o.to, y0: o.top, y1: WALL_H });
      cursor = o.to;
    }
    pieces.push({ from: cursor, to: w.to + T / 2, y0: 0, y1: WALL_H });

    const breaks = new Set<number>();
    for (const r of ROOMS) {
      if (r.level !== w.level) continue;
      const lo = w.axis === "z" ? r.z0 : r.x0;
      const hi = w.axis === "z" ? r.z1 : r.x1;
      breaks.add(lo);
      breaks.add(hi);
    }

    for (const p of pieces) {
      const cuts = [p.from, ...[...breaks].filter((v) => v > p.from + 0.01 && v < p.to - 0.01).sort((a, c) => a - c), p.to];
      const allRooms = new Set<RoomId>();
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i];
        const c = cuts[i + 1];
        const mid = (a + c) / 2;
        const [ra, rb] = this.sideRooms(w, mid);
        if (ra) allRooms.add(ra);
        if (rb) allRooms.add(rb);
        this.skin(w, a, c, p.y0, p.y1, base, ra, -1);
        this.skin(w, a, c, p.y0, p.y1, base, rb, +1);
      }
      // Physical collision for anything the player's body can touch (not high lintels).
      if (p.y0 < 1.5) {
        const len = p.to - p.from;
        const c = (p.from + p.to) / 2;
        const h = p.y1 - p.y0;
        const yc = base + (p.y0 + p.y1) / 2;
        const size: V3 = w.axis === "z" ? [T, h, len] : [len, h, T];
        const pos: V3 = w.axis === "z" ? [w.fixed, yc, c] : [c, yc, w.fixed];
        this.b.collider(`wall-${w.axis}${w.fixed}`, size, pos, { rooms: [...allRooms] });
      }
    }

    for (const o of ops) this.opening(w, o, base);
  }

  /** One finished face of a wall: a half-thickness box in the room's wall material, with baseboard and cornice. */
  private skin(w: WallLine, a: number, c: number, y0: number, y1: number, base: number, room: RoomId | null, side: -1 | 1): void {
    if (!room) return;
    const len = c - a;
    if (len < 0.02) return;
    const mid = (a + c) / 2;
    const yc = base + (y0 + y1) / 2;
    const h = y1 - y0;
    const off = (T / 4) * side;
    const size: V3 = w.axis === "z" ? [T / 2, h, len] : [len, h, T / 2];
    const pos: V3 = w.axis === "z" ? [w.fixed + off, yc, mid] : [mid, yc, w.fixed + off];
    const mat = this.ctx.mats.walls[room];
    this.b.box(`skin-${room}`, size, pos, mat, { rooms: [room], tile: 2 });

    const face = (T / 2) * side;
    const trim = this.ctx.mats.trim;
    if (y0 === 0) {
      const bs: V3 = w.axis === "z" ? [0.03, 0.12, len] : [len, 0.12, 0.03];
      const bp: V3 = w.axis === "z" ? [w.fixed + face + 0.015 * side, base + 0.06, mid] : [mid, base + 0.06, w.fixed + face + 0.015 * side];
      this.b.box("baseboard", bs, bp, trim, { rooms: [room] });
    }
    // Soft darkening where the wall meets the ceiling and the floor.
    const planeRot: V3 = [0, w.axis === "z" ? Math.PI / 2 : 0, 0];
    const pp = (y: number): V3 => (w.axis === "z" ? [w.fixed + face + 0.004 * side, y, mid] : [mid, y, w.fixed + face + 0.004 * side]);
    if (y0 === 0 && y1 === WALL_H) {
      this.b.plane("ao-top", [len, 0.5], pp(base + WALL_H - 0.3), this.ctx.mats.aoTop, { rooms: [room], rot: planeRot });
      this.b.plane("ao-bottom", [len, 0.35], pp(base + 0.17), this.ctx.mats.aoBottom, { rooms: [room], rot: planeRot });
    }
    if (y1 === WALL_H) {
      const cs: V3 = w.axis === "z" ? [0.06, 0.08, len] : [len, 0.08, 0.06];
      const cp: V3 = w.axis === "z" ? [w.fixed + face + 0.03 * side, base + WALL_H - 0.04, mid] : [mid, base + WALL_H - 0.04, w.fixed + face + 0.03 * side];
      this.b.box("cornice", cs, cp, trim, { rooms: [room] });
    }
  }

  // ---- openings --------------------------------------------------------------------------------

  private opening(w: WallLine, o: Opening, base: number): void {
    const mid = (o.from + o.to) / 2;
    const [ra, rb] = this.sideRooms(w, mid);
    const rooms = [ra, rb].filter((r): r is RoomId => !!r);
    this.openings.push({ key: `${w.level}${w.axis}${w.fixed}@${o.from}`, axis: w.axis, fixed: w.fixed, level: w.level, from: o.from, to: o.to, kind: o.kind, top: o.top, rooms });
    if (o.kind === "window") this.window(w, o, base, rooms, ra, rb);
    else this.frame(w, o, base, rooms);
  }

  /** Painted architrave around a door or cased opening. */
  private frame(w: WallLine, o: Opening, base: number, rooms: RoomId[]): void {
    const trim = this.ctx.mats.trim;
    const len = o.to - o.from;
    const jw = 0.07;
    const th = T + 0.05;
    const pos = (along: number, y: number): V3 => (w.axis === "z" ? [w.fixed, base + y, along] : [along, base + y, w.fixed]);
    const sz = (along: number, y: number): V3 => (w.axis === "z" ? [th, y, along] : [along, y, th]);
    this.b.box("jamb", sz(jw, o.top), pos(o.from - jw / 2, o.top / 2), trim, { rooms });
    this.b.box("jamb", sz(jw, o.top), pos(o.to + jw / 2, o.top / 2), trim, { rooms });
    this.b.box("head", sz(len + jw * 2, 0.08), pos((o.from + o.to) / 2, o.top + 0.04), trim, { rooms });
  }

  private window(w: WallLine, o: Opening, base: number, rooms: RoomId[], ra: RoomId | null, rb: RoomId | null): void {
    const { mats } = this.ctx;
    const len = o.to - o.from;
    const h = o.top - o.bottom;
    const mid = (o.from + o.to) / 2;
    const ymid = base + (o.bottom + o.top) / 2;
    const at = (along: number, y: number, off = 0): V3 => (w.axis === "z" ? [w.fixed + off, y, along] : [along, y, w.fixed + off]);
    const sz = (along: number, y: number, depth: number): V3 => (w.axis === "z" ? [depth, y, along] : [along, y, depth]);
    // Dark night sky behind the glass: cheap, reads as a window, needs no transparency.
    this.b.box("window-glass", sz(len, h, 0.02), at(mid, ymid), mats.night, { rooms });
    const f = 0.06;
    const th = T + 0.04;
    this.b.box("win-l", sz(f, h, th), at(o.from + f / 2, ymid), mats.trim, { rooms });
    this.b.box("win-r", sz(f, h, th), at(o.to - f / 2, ymid), mats.trim, { rooms });
    this.b.box("win-t", sz(len, f, th), at(mid, base + o.top - f / 2), mats.trim, { rooms });
    this.b.box("win-b", sz(len, f, th), at(mid, base + o.bottom + f / 2), mats.trim, { rooms });
    this.b.box("win-mullion", sz(0.04, h, 0.06), at(mid, ymid), mats.trim, { rooms });
    this.b.box("win-rail", sz(len, 0.04, 0.06), at(mid, ymid + 0.1), mats.trim, { rooms });
    for (const [room, side] of [[ra, -1], [rb, 1]] as const) {
      if (!room) continue;
      const off = (T / 2 + 0.06) * side;
      this.b.box("sill", sz(len + 0.16, 0.04, 0.14), at(mid, base + o.bottom - 0.02, (T / 2 + 0.03) * side), mats.trim, { rooms: [room] });
      if (CURTAINED.includes(room)) this.curtains(o, base, room, off, side, at, sz);
      // A patch of cool moonlight on the floor, with the shadow of the glazing bars.
      const mx = w.axis === "z" ? w.fixed + side * 0.95 : mid;
      const mz = w.axis === "z" ? mid : w.fixed + side * 0.95;
      this.b.plane("moon", [len * 1.15, 1.4], [mx, base + 0.026, mz], mats.moon, { rooms: [room], rot: [Math.PI / 2, w.axis === "z" ? Math.PI / 2 : 0, 0] });
    }
  }

  private curtains(
    o: Opening,
    base: number,
    room: RoomId,
    off: number,
    side: number,
    at: (along: number, y: number, off?: number) => V3,
    sz: (along: number, y: number, depth: number) => V3,
  ): void {
    const { mats } = this.ctx;
    const top = base + o.top + 0.28;
    const hang = top - (base + o.bottom - 0.25);
    const wdt = 0.55;
    const d = off + 0.06 * side;
    this.b.box("curtain", sz(wdt, hang, 0.07), at(o.from - 0.05 + wdt / 2 - 0.1, top - hang / 2, d), mats.curtain, { rooms: [room], tile: 1 });
    this.b.box("curtain", sz(wdt, hang, 0.07), at(o.to + 0.05 - wdt / 2 + 0.1, top - hang / 2, d), mats.curtain, { rooms: [room], tile: 1 });
    this.b.box("curtain-rod", sz(o.to - o.from + 0.9, 0.025, 0.025), at((o.from + o.to) / 2, top + 0.05, d), mats.brass, { rooms: [room] });
  }

  // ---- floors, ceilings, stairs ----------------------------------------------------------------

  private slabs(id: RoomId): void {
    const r = ROOMS.find((x) => x.id === id)!;
    const { mats } = this.ctx;
    const hole: Rect = { x0: STAIRS.x0, x1: STAIRS.x1, z0: STAIRS.z0, z1: STAIRS.z1 };
    const rect: Rect = { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 };
    const hasHole = id === "hall" || id === "uphall";
    const parts = hasHole ? rectMinus(rect, hole) : [rect];
    const base = LEVEL_Y[r.level];
    for (const p of parts) {
      const w = p.x1 - p.x0;
      const d = p.z1 - p.z0;
      const cx = (p.x0 + p.x1) / 2;
      const cz = (p.z0 + p.z1) / 2;
      if (r.level === 0) {
        this.b.box(`floor-${id}`, [w, 0.1, d], [cx, -0.05, cz], mats.floors[id], { rooms: [id], tile: 2 });
        this.b.box(`slab-${id}`, [w, 0.1, d], [cx, 2.85, cz], mats.ceilings[id], { rooms: [id], tile: 2 });
      } else {
        this.b.box(`floor-${id}`, [w, 0.1, d], [cx, base - 0.05, cz], mats.floors[id], { rooms: [id], tile: 2 });
        this.b.box(`ceiling-${id}`, [w, 0.1, d], [cx, base + WALL_H + 0.05, cz], mats.ceilings[id], { rooms: [id], tile: 2 });
      }
    }
  }

  private stairs(): void {
    const { mats } = this.ctx;
    const width = STAIRS.x1 - STAIRS.x0;
    const cx = (STAIRS.x0 + STAIRS.x1) / 2;
    const depth = (STAIRS.z1 - STAIRS.z0) / STEPS;
    const rise = STAIRS.rise / STEPS;
    const rooms: RoomId[] = ["hall", "uphall"];
    for (let i = 0; i < STEPS; i++) {
      const top = (i + 1) * rise;
      const z = STAIRS.z0 + depth * (i + 0.5);
      this.b.box("stair-step", [width, top, depth], [cx, top / 2, z], mats.woodDark, { rooms, tile: 1 });
      this.b.box("stair-runner", [width - 0.3, 0.012, depth - 0.02], [cx, top + 0.006, z], mats.runner, { rooms, tile: 1 });
      this.b.cyl("baluster", { h: 0.85, top: 0.026, bottom: 0.034, sides: 8 }, [STAIRS.x0 + 0.02, top + 0.45, z], mats.woodPale, { rooms });
      // Nosing: the rounded lip on the front edge of each tread.
      this.b.box("nosing", [width + 0.03, 0.028, 0.035], [cx, top - 0.014, STAIRS.z0 + depth * i - 0.012], mats.woodDark, { rooms, round: 0.012 });
    }
    const len = Math.hypot(STAIRS.z1 - STAIRS.z0, STAIRS.rise);
    const ang = Math.atan2(STAIRS.rise, STAIRS.z1 - STAIRS.z0);
    this.b.cyl("handrail", { h: len, bottom: 0.065, sides: 10 }, [STAIRS.x0 + 0.02, STAIRS.rise / 2 + 0.92, (STAIRS.z0 + STAIRS.z1) / 2], mats.woodDark, { rooms, rot: [Math.PI / 2 - ang, 0, 0] });
    for (const [y, z] of [[0, STAIRS.z0 - 0.05], [STAIRS.rise, STAIRS.z1 + 0.05]] as const) {
      this.b.box("newel", [0.1, 1.1, 0.1], [STAIRS.x0 + 0.02, y + 0.55, z], mats.woodDark, { rooms, round: 0.015 });
      this.b.sphere("newel-cap", 0.13, [STAIRS.x0 + 0.02, y + 1.15, z], mats.woodDark, { rooms });
    }
    // Closed string along the wall side, so the treads meet a board rather than bare plaster.
    this.b.box("stair-string", [0.03, 0.28, len], [STAIRS.x1 - 0.015, STAIRS.rise / 2 + 0.14, (STAIRS.z0 + STAIRS.z1) / 2], mats.trim, { rooms, rot: [-ang, 0, 0] });
    // Landing rail along the stairwell edge upstairs is the same handrail seen from above; the collider keeps the player out of the hole.
    this.b.collider("stair-rail", [0.1, 5.8, STAIRS.z1 - STAIRS.z0], [STAIRS.x0, 2.9, (STAIRS.z0 + STAIRS.z1) / 2], { rooms });
    // Level gates: stop a ground-floor player entering the ramp from its top, and an upstairs player from its bottom.
    this.b.collider("stair-top-gate-ground", [width, WALL_H, 0.2], [cx, WALL_H / 2, STAIRS.z1 + 0.1], { rooms });
    this.b.collider("stair-bottom-gate-up", [width, WALL_H, 0.2], [cx, LEVEL_Y[1] + WALL_H / 2, STAIRS.z0 - 0.1], { rooms });
  }
}
