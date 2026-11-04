import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

/**
 * A walkable-cell grid built from the real collision meshes (Observer Mode only), one per storey, so the automated player can
 * find a route that the real collision system will accept. Doors are left open in the grid: the bot opens them as it arrives.
 */
const CELL = 0.12;
const X0 = -0.6;
const Z0 = -0.6;
const W = Math.ceil(15.4 / CELL);
const H = Math.ceil(12.4 / CELL);
/** Player radius plus a margin. */
const INFLATE = 0.33;

export interface P2 {
  x: number;
  z: number;
}

export class Grid {
  private readonly blocked = [new Uint8Array(W * H), new Uint8Array(W * H)];

  /** `ignore` holds meshes that must not count (door leaves). */
  build(scene: Scene, ignore: Set<AbstractMesh>): void {
    this.blocked[0].fill(0);
    this.blocked[1].fill(0);
    for (const m of scene.meshes) {
      if (!m.checkCollisions || ignore.has(m) || m.isDisposed()) continue;
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      const lo = bb.minimumWorld;
      const hi = bb.maximumWorld;
      for (const level of [0, 1] as const) {
        const y0 = level * 3 + 0.25;
        const y1 = level * 3 + 1.5;
        if (lo.y > y1 || hi.y < y0) continue;
        this.fill(level, lo.x - INFLATE, hi.x + INFLATE, lo.z - INFLATE, hi.z + INFLATE);
      }
    }
  }

  private fill(level: 0 | 1, x0: number, x1: number, z0: number, z1: number): void {
    const a = Math.max(0, Math.floor((x0 - X0) / CELL));
    const b = Math.min(W - 1, Math.floor((x1 - X0) / CELL));
    const c = Math.max(0, Math.floor((z0 - Z0) / CELL));
    const d = Math.min(H - 1, Math.floor((z1 - Z0) / CELL));
    for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) this.blocked[level][j * W + i] = 1;
  }

  private idx(x: number, z: number): number {
    const i = Math.floor((x - X0) / CELL);
    const j = Math.floor((z - Z0) / CELL);
    return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i;
  }

  /** When set, cells it returns true for are treated as blocked (the chase: stay in the lit rooms). */
  forbidden: ((level: 0 | 1, x: number, z: number) => boolean) | null = null;

  free(level: 0 | 1, x: number, z: number): boolean {
    if (this.forbidden?.(level, x, z)) return false;
    const k = this.idx(x, z);
    return k >= 0 && !this.blocked[level][k];
  }

  /** Nearest free cell centre to a point, within a few metres. */
  nearestFree(level: 0 | 1, x: number, z: number): P2 | null {
    if (this.free(level, x, z)) return { x, z };
    for (let r = CELL; r < 3; r += CELL) {
      for (let a = 0; a < 360; a += 15) {
        const px = x + Math.cos((a * Math.PI) / 180) * r;
        const pz = z + Math.sin((a * Math.PI) / 180) * r;
        if (this.free(level, px, pz)) return { x: px, z: pz };
      }
    }
    return null;
  }

  /** A* over 8-connected cells, then straightened so the walk is smooth. Null if there is no route. */
  path(level: 0 | 1, from: P2, to: P2): P2[] | null {
    const s = this.nearestFree(level, from.x, from.z);
    const g = this.nearestFree(level, to.x, to.z);
    if (!s || !g) return null;
    let grid = this.blocked[level];
    if (this.forbidden) {
      // Cells the caller forbids count as blocked for this search.
      grid = new Uint8Array(grid);
      for (let k = 0; k < grid.length; k++) if (!grid[k] && this.forbidden(level, X0 + ((k % W) + 0.5) * CELL, Z0 + (Math.floor(k / W) + 0.5) * CELL)) grid[k] = 1;
    }
    const start = this.idx(s.x, s.z);
    const goal = this.idx(g.x, g.z);
    const gx = goal % W;
    const gz = Math.floor(goal / W);
    const gScore = new Float32Array(W * H).fill(Infinity);
    const prev = new Int32Array(W * H).fill(-1);
    const open: number[] = [start];
    const inOpen = new Uint8Array(W * H);
    inOpen[start] = 1;
    gScore[start] = 0;
    const f = (k: number): number => gScore[k] + Math.hypot((k % W) - gx, Math.floor(k / W) - gz);
    let guard = 0;
    while (open.length && guard++ < 200000) {
      let bi = 0;
      for (let q = 1; q < open.length; q++) if (f(open[q]) < f(open[bi])) bi = q;
      const cur = open[bi];
      open.splice(bi, 1);
      inOpen[cur] = 0;
      if (cur === goal) break;
      const ci = cur % W;
      const cj = Math.floor(cur / W);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
          const nk = nj * W + ni;
          if (grid[nk]) continue;
          if (di && dj && (grid[cj * W + ni] || grid[nj * W + ci])) continue;
          const ng = gScore[cur] + (di && dj ? 1.414 : 1);
          if (ng < gScore[nk]) {
            gScore[nk] = ng;
            prev[nk] = cur;
            if (!inOpen[nk]) {
              open.push(nk);
              inOpen[nk] = 1;
            }
          }
        }
      }
    }
    if (prev[goal] < 0 && goal !== start) return null;
    const cells: P2[] = [];
    for (let k = goal; k >= 0; k = prev[k]) {
      cells.push({ x: X0 + ((k % W) + 0.5) * CELL, z: Z0 + (Math.floor(k / W) + 0.5) * CELL });
      if (k === start) break;
    }
    cells.reverse();
    return this.straighten(level, cells);
  }

  /** Drops waypoints that a straight, collision-free line can skip. */
  private straighten(level: 0 | 1, pts: P2[]): P2[] {
    if (pts.length < 3) return pts;
    const out: P2[] = [pts[0]];
    let anchor = 0;
    for (let i = 2; i < pts.length; i++) {
      if (!this.clear(level, pts[anchor], pts[i])) {
        out.push(pts[i - 1]);
        anchor = i - 1;
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  clear(level: 0 | 1, a: P2, b: P2): boolean {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (CELL * 0.5));
    for (let i = 0; i <= n; i++) if (!this.free(level, a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n)) return false;
    return true;
  }
}
