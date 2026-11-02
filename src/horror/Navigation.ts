import { LINKS, ROOMS, ROOM_BY_ID, STAIRS, WALLS, roomAt, type RoomId } from "../world/Layout";

export interface Point {
  x: number;
  z: number;
}

interface Edge {
  to: RoomId;
  /** Points to pass through to get there (the opening, or the stair bottom and top). */
  via: Point[];
  cost: number;
}

const center = (r: RoomId): Point => {
  const d = ROOM_BY_ID[r];
  return { x: (d.x0 + d.x1) / 2, z: (d.z0 + d.z1) / 2 };
};

/**
 * Finds routes through the house for entities. Rooms are the nodes; each opening or the stairs is an edge with the
 * points to pass through. Rooms are rectangles, so a straight line from a room point to its opening never crosses a wall.
 */
export class Navigation {
  private readonly edges = new Map<RoomId, Edge[]>();

  constructor() {
    for (const r of ROOMS) this.edges.set(r.id, []);
    for (const w of WALLS) {
      for (const o of w.openings) {
        if (o.kind === "window") continue;
        const mid = (o.from + o.to) / 2;
        const p: Point = w.axis === "z" ? { x: w.fixed, z: mid } : { x: mid, z: w.fixed };
        const a = w.axis === "z" ? roomAt(w.fixed - 0.4, mid, w.level) : roomAt(mid, w.fixed - 0.4, w.level);
        const b = w.axis === "z" ? roomAt(w.fixed + 0.4, mid, w.level) : roomAt(mid, w.fixed + 0.4, w.level);
        if (a && b) {
          this.edges.get(a)!.push({ to: b, via: [p], cost: 1 });
          this.edges.get(b)!.push({ to: a, via: [p], cost: 1 });
        }
      }
    }
    // The staircase joins the hall and the landing.
    const bottom: Point = { x: (STAIRS.x0 + STAIRS.x1) / 2, z: STAIRS.z0 + 0.2 };
    const top: Point = { x: (STAIRS.x0 + STAIRS.x1) / 2, z: STAIRS.z1 + 0.5 };
    this.edges.get("hall")!.push({ to: "uphall", via: [bottom, top], cost: 3 });
    this.edges.get("uphall")!.push({ to: "hall", via: [top, bottom], cost: 3 });
    void LINKS;
  }

  /** Room-to-room route as a list of points, starting after `from` and ending at `to`. */
  route(from: Point, fromLevel: 0 | 1, to: Point, toLevel: 0 | 1): Point[] {
    const a = roomAt(from.x, from.z, fromLevel);
    const b = roomAt(to.x, to.z, toLevel);
    if (!a || !b) return [to];
    if (a === b) return [to];
    // Dijkstra over rooms.
    const dist = new Map<RoomId, number>([[a, 0]]);
    const prev = new Map<RoomId, { room: RoomId; via: Point[] }>();
    const open = new Set<RoomId>([a]);
    while (open.size) {
      let cur: RoomId | null = null;
      for (const r of open) if (cur === null || dist.get(r)! < dist.get(cur)!) cur = r;
      if (cur === null) break;
      open.delete(cur);
      if (cur === b) break;
      for (const e of this.edges.get(cur)!) {
        const nd = dist.get(cur)! + e.cost + Math.hypot(center(cur).x - center(e.to).x, center(cur).z - center(e.to).z) * 0.1;
        if (nd < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, nd);
          prev.set(e.to, { room: cur, via: e.via });
          open.add(e.to);
        }
      }
    }
    const pts: Point[] = [];
    let r: RoomId | undefined = b;
    const chain: Point[][] = [];
    while (r && r !== a) {
      const p = prev.get(r);
      if (!p) return [to];
      chain.unshift(p.via);
      r = p.room;
    }
    for (const v of chain) pts.push(...v);
    pts.push(to);
    return pts;
  }

  /** Number of room links between two points, a rough measure of how far apart they are in the house. */
  hops(a: Point, la: 0 | 1, b: Point, lb: 0 | 1): number {
    const ra = roomAt(a.x, a.z, la);
    const rb = roomAt(b.x, b.z, lb);
    if (!ra || !rb) return 0;
    if (ra === rb) return 0;
    return this.route(a, la, b, lb).length - 1;
  }

  center(r: RoomId): Point {
    return center(r);
  }
}
