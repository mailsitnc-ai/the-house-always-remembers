import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { House } from "../world/House";
import type { InteractionSystem } from "../player/InteractionSystem";
import { floorHeight, roomAt, STAIRS } from "../world/Layout";

/**
 * Developer-only collision and softlock audit (reached through `__debug.audit()`, never part of a production build).
 *
 * It uses the real collision system (the camera's ellipsoid against every mesh with `checkCollisions`), not a model of it:
 * a grid of standing points is laid over each floor; each point is checked for being embedded in a collider; then a flood fill
 * from the front door walks between neighbouring points with real collision moves (doors open). It reports
 *  - `embedded`: points where the player would be pushed out of a collider (a spot he can be wedged in),
 *  - `unreachable`: free points the player cannot get to (a sealed pocket; fine if it is inside furniture, a bug if it is a floor area),
 *  - `oneWay`: steps that work forwards but not backwards (the way to get trapped),
 *  - `unusable`: interactive objects that no reachable standing point can pick with the player's own pick ray.
 */
const STEP = 0.3;
const X0 = 0.3;
const Z0 = 0.3;

type Cam = FreeCamera & { _collideWithWorld(v: Vector3): void };
type P = { i: number; j: number };

export interface AuditResult {
  level: 0 | 1;
  cells: number;
  free: number;
  reachable: number;
  embedded: { x: number; z: number; room: string }[];
  /** Open floor (the player could stand and move there) that cannot be reached from the main area: a sealed pocket. */
  unreachable: { x: number; z: number; room: string }[];
  /** Cells inside colliders (furniture, walls): not a problem by themselves. */
  solid: number;
  oneWay: { from: [number, number]; to: [number, number]; escape: boolean }[];
}

export function auditCollisions(ctx: { camera: FreeCamera; house: House; interaction: InteractionSystem; setBase(b: number): void; start?: [number, number] }): {
  levels: AuditResult[];
  stairs: { up: string; down: string };
  unusable: string[];
  usable: number;
} {
  const cam = ctx.camera as Cam;
  const prevDoors = ctx.house.setAllDoors(true);
  const NX = Math.floor((14.3 - X0) / STEP);
  const NZ = Math.floor((11.3 - Z0) / STEP);
  const levels: AuditResult[] = [];
  const reachableByLevel: Set<number>[] = [];
  const key = (i: number, j: number): number => j * 1000 + i;
  const pos = (p: P): [number, number] => [X0 + p.i * STEP, Z0 + p.j * STEP];

  const place = (level: 0 | 1, x: number, z: number): void => {
    ctx.setBase(level * 3);
    cam.position.set(x, floorHeight(x, z, level * 3) + 1.65, z);
  };
  const stepTo = (level: 0 | 1, x: number, z: number, tx: number, tz: number): { x: number; z: number } => {
    place(level, x, z);
    const n = 4;
    for (let s = 0; s < n; s++) {
      const dx = (tx - cam.position.x) / (n - s);
      const dz = (tz - cam.position.z) / (n - s);
      cam._collideWithWorld(new Vector3(dx, 0, dz));
    }
    return { x: cam.position.x, z: cam.position.z };
  };
  /** True if a small move in every direction is blocked: the point is inside a collider, or wedged so tightly that the player could not leave it. */
  const freeDirs = (level: 0 | 1, x: number, z: number): number => {
    let n = 0;
    for (let a = 0; a < 8; a++) {
      place(level, x, z);
      cam._collideWithWorld(new Vector3(Math.cos((a * Math.PI) / 4) * 0.06, 0, Math.sin((a * Math.PI) / 4) * 0.06));
      if (Math.hypot(cam.position.x - x, cam.position.z - z) > 0.05) n++;
    }
    return n;
  };
  const embeddedAt = (level: 0 | 1, x: number, z: number): boolean => freeDirs(level, x, z) === 0;
  const roomName = (level: 0 | 1, x: number, z: number): string => roomAt(x, z, level) ?? "(outside rooms)";

  /**
   * From a point, fine-grained (0.1 m) real-collision search for a way back to somewhere at least 1.4 m away that the main flood fill reached.
   * False means the point is a trap: the player could walk in and never leave.
   */
  const canEscape = (level: 0 | 1, x: number, z: number, main: Set<number>): boolean => {
    const F = 0.1;
    const k = (i: number, j: number): number => (j + 500) * 2000 + (i + 500);
    const seenF = new Set<number>([k(0, 0)]);
    const q: [number, number][] = [[0, 0]];
    let n = 0;
    while (q.length && n++ < 1500) {
      const [i, j] = q.shift()!;
      const ax = x + i * F;
      const az = z + j * F;
      if (Math.hypot(i * F, j * F) >= 1.4) {
        const ci = Math.round((ax - X0) / STEP);
        const cj = Math.round((az - Z0) / STEP);
        if (main.has(cj * 1000 + ci) && Math.hypot(ax - (X0 + ci * STEP), az - (Z0 + cj * STEP)) < 0.2) return true;
      }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di;
        const nj = j + dj;
        if (seenF.has(k(ni, nj)) || Math.abs(ni) > 16 || Math.abs(nj) > 16) continue;
        const end = stepTo(level, ax, az, x + ni * F, z + nj * F);
        if (Math.hypot(end.x - (x + ni * F), end.z - (z + nj * F)) < 0.03) {
          seenF.add(k(ni, nj));
          q.push([ni, nj]);
        }
      }
    }
    return false;
  };

  for (const level of [0, 1] as const) {
    const res: AuditResult = { level, cells: 0, free: 0, reachable: 0, embedded: [], unreachable: [], solid: 0, oneWay: [] };
    const inRoom = new Set<number>();
    const free = new Set<number>();
    const solidCells = new Set<number>();
    const openCells = new Set<number>();
    for (let j = 0; j <= NZ; j++) {
      for (let i = 0; i <= NX; i++) {
        const [x, z] = pos({ i, j });
        // Only floor that belongs to a room (and, on the ground floor, the stairwell column).
        if (roomAt(x, z, level) === null) continue;
        res.cells++;
        inRoom.add(key(i, j));
        if (embeddedAt(level, x, z)) {
          res.solid++;
          solidCells.add(key(i, j));
        } else {
          free.add(key(i, j));
          res.free++;
          // Open floor: the player can move in every direction from here, so it is not just a margin beside a wall or a piece of furniture.
          if (freeDirs(level, x, z) === 8) openCells.add(key(i, j));
        }
      }
    }
    // Flood fill from the front door (ground floor) or from the top of the stairs (upstairs).
    const startXZ: [number, number] = level === 0 ? (ctx.start ?? [6.5, 1.0]) : [(STAIRS.x0 + STAIRS.x1) / 2, STAIRS.z1 + 0.6];
    let start: P = { i: Math.round((startXZ[0] - X0) / STEP), j: Math.round((startXZ[1] - Z0) / STEP) };
    if (!free.has(key(start.i, start.j))) {
      // Nearest free point to the intended start.
      let best = 1e9;
      for (const k of free) {
        const p = { i: k % 1000, j: Math.floor(k / 1000) };
        const d = Math.hypot(pos(p)[0] - startXZ[0], pos(p)[1] - startXZ[1]);
        if (d < best) {
          best = d;
          start = p;
        }
      }
    }
    const seen = new Set<number>([key(start.i, start.j)]);
    const queue: P[] = [start];
    while (queue.length) {
      const a = queue.shift()!;
      const [ax, az] = pos(a);
      const ka = key(a.i, a.j);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const b = { i: a.i + di, j: a.j + dj };
        const kb = key(b.i, b.j);
        if (!free.has(kb)) continue;
        const [bx, bz] = pos(b);
        const end = stepTo(level, ax, az, bx, bz);
        const ok = Math.hypot(end.x - bx, end.z - bz) < 0.06;
        if (!ok) continue;
        if (!seen.has(kb)) {
          seen.add(kb);
          queue.push(b);
        }
        // The same step backwards must work too, or this is a one-way trap.
        const back = stepTo(level, bx, bz, ax, az);
        if (Math.hypot(back.x - ax, back.z - az) >= 0.06 && openCells.has(ka) && openCells.has(kb) && res.oneWay.length < 400) res.oneWay.push({ from: [+ax.toFixed(2), +az.toFixed(2)], to: [+bx.toFixed(2), +bz.toFixed(2)], escape: false });
      }
    }
    res.reachable = seen.size;
    // A one-way step is only dangerous if the player cannot find another way out of the place it leads to.
    for (const o of res.oneWay) o.escape = canEscape(level, o.to[0], o.to[1], seen);
    for (const k of openCells) {
      if (!seen.has(k)) {
        const [x, z] = pos({ i: k % 1000, j: Math.floor(k / 1000) });
        res.unreachable.push({ x: +x.toFixed(2), z: +z.toFixed(2), room: roomName(level, x, z) });
      }
    }
    reachableByLevel.push(seen);
    levels.push(res);
  }

  // The stairs themselves: up and down along their centre line.
  const sx = (STAIRS.x0 + STAIRS.x1) / 2;
  const walk = (level: 0 | 1, pts: [number, number][]): string => {
    place(level, pts[0][0], pts[0][1]);
    let base = level * 3;
    for (const [tx, tz] of pts.slice(1)) {
      for (let n = 0; n < 400; n++) {
        const dx = tx - cam.position.x;
        const dz = tz - cam.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.1) break;
        const s = Math.min(0.08, d);
        cam._collideWithWorld(new Vector3((dx / d) * s, 0, (dz / d) * s));
        base = floorHeight(cam.position.x, cam.position.z, base);
        ctx.setBase(base);
        cam.position.y = base + 1.65;
      }
      if (Math.hypot(tx - cam.position.x, tz - cam.position.z) > 0.2) return `stuck at ${cam.position.x.toFixed(2)},${cam.position.z.toFixed(2)} going to ${tx.toFixed(2)},${tz.toFixed(2)}`;
    }
    return "ok";
  };
  const up = walk(0, [[sx, STAIRS.z0 - 0.4], [sx, STAIRS.z0 + 0.5], [sx, STAIRS.z1 - 0.3], [sx, STAIRS.z1 + 0.6]]);
  const down = walk(1, [[sx, STAIRS.z1 + 0.6], [sx, STAIRS.z1 - 0.3], [sx, STAIRS.z0 + 0.5], [sx, STAIRS.z0 - 0.4]]);

  // Every interactive object must be pickable (by the player's own pick ray) from some reachable standing point.
  const unusable: string[] = [];
  let usable = 0;
  const tagged = (ctx.interaction as unknown as { tagged: Map<string, import("@babylonjs/core/Meshes/abstractMesh").AbstractMesh[]> }).tagged;
  for (const [tag, meshes] of tagged) {
    let ok = false;
    for (const m of meshes) {
      if (m.isDisposed()) continue;
      m.computeWorldMatrix(true);
      const c = m.getBoundingInfo().boundingBox.centerWorld;
      const level: 0 | 1 = c.y > 2 ? 1 : 0;
      for (const k of reachableByLevel[level]) {
        const [x, z] = pos({ i: k % 1000, j: Math.floor(k / 1000) });
        if (Math.hypot(x - c.x, z - c.z) > 2.4) continue;
        const eye = new Vector3(x, level * 3 + 1.65, z);
        const dir = c.subtract(eye);
        const dist = dir.length();
        if (dist > 2.6) continue;
        const hit = ctx.interaction.pickFrom(new Ray(eye, dir.normalize(), 3));
        if (hit && hit.tag === tag) {
          ok = true;
          break;
        }
      }
      if (ok) break;
    }
    if (ok) usable++;
    else unusable.push(tag);
  }
  for (const [id, open] of Object.entries(prevDoors)) ctx.house.doors[id]?.setOpen(open);
  return { levels, stairs: { up, down }, unusable, usable };
}
