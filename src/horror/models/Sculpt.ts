import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

/**
 * A small procedural-sculpting toolkit: parametric grids that are displaced by hand-authored features, swept limbs, hands,
 * and cheap value noise. Everything is plain vertex data (positions, normals, vertex colours), so a figure is a handful of
 * meshes with no textures required for shape or shading, which keeps memory small on the target hardware.
 */
export type V3 = [number, number, number];
export type RGB = [number, number, number];

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** An anisotropic gaussian bump centred on (cx, cy, cz) with amplitude `amp`. */
export const gauss = (x: number, y: number, z: number, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, amp: number): number => {
  const dx = (x - cx) / sx;
  const dy = (y - cy) / sy;
  const dz = (z - cz) / sz;
  return amp * Math.exp(-(dx * dx + dy * dy + dz * dz));
};

const hash3 = (x: number, y: number, z: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Smooth value noise in 0..1. */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  const c = (a: number, b: number, d: number) => hash3(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), sx);
  const x10 = lerp(c(0, 1, 0), c(1, 1, 0), sx);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), sx);
  const x11 = lerp(c(0, 1, 1), c(1, 1, 1), sx);
  return lerp(lerp(x00, x10, sy), lerp(x01, x11, sy), sz);
}

export function fbm(x: number, y: number, z: number, octaves = 4): number {
  let a = 0.5;
  let f = 1;
  let s = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * noise3(x * f, y * f, z * f);
    f *= 2;
    a *= 0.5;
  }
  return s;
}

export const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
export const hex = (h: string): RGB => {
  const c = Color3.FromHexString(h);
  return [c.r, c.g, c.b];
};

export interface GridSpec {
  rings: number;
  segs: number;
  /** Position for (u, v): u runs around (0..1), v runs along (0..1). */
  pos(u: number, v: number): V3;
  color?(u: number, v: number, p: V3): RGB;
  /** Quads to leave out (a hole, a hairline, an opening). Receives the quad centre. */
  skip?(u: number, v: number): boolean;
  uv?(u: number, v: number): [number, number];
  /** The direction that counts as "outside", for orienting faces. Default: away from the centroid. */
  outward?(p: V3): V3;
  /** Swap the winding (after the automatic orientation). */
  flip?: boolean;
  /** An open sheet rather than a tube: the last column is its own column, not a copy of the first. */
  open?: boolean;
}

export interface Grid {
  mesh: Mesh;
  positions: Float32Array;
  /** Recomputes normals after the positions were changed and uploads both. */
  refresh(): void;
}

/** A parametric surface as one mesh, with welded smooth normals and optional vertex colours. */
export function gridMesh(scene: Scene, name: string, s: GridSpec, updatable = false): Grid {
  const { rings, segs } = s;
  const nv = (rings + 1) * (segs + 1);
  const positions = new Float32Array(nv * 3);
  const colors = new Float32Array(nv * 4);
  const uvs = new Float32Array(nv * 2);
  for (let j = 0; j <= rings; j++) {
    const v = j / rings;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const k = j * (segs + 1) + i;
      const p = s.pos(!s.open && i === segs ? 0 : u, v);
      positions[k * 3] = p[0];
      positions[k * 3 + 1] = p[1];
      positions[k * 3 + 2] = p[2];
      const c = s.color ? s.color(u, v, p) : ([1, 1, 1] as RGB);
      colors[k * 4] = c[0];
      colors[k * 4 + 1] = c[1];
      colors[k * 4 + 2] = c[2];
      colors[k * 4 + 3] = 1;
      const t = s.uv ? s.uv(u, v) : ([u, v] as [number, number]);
      uvs[k * 2] = t[0];
      uvs[k * 2 + 1] = t[1];
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segs; i++) {
      if (s.skip?.((i + 0.5) / segs, (j + 0.5) / rings)) continue;
      const a = j * (segs + 1) + i;
      const b = a + 1;
      const c = a + segs + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Weld coincident vertices (the seam and the poles) so their normals are shared.
  const group = new Int32Array(nv);
  const seen = new Map<string, number>();
  let groups = 0;
  for (let k = 0; k < nv; k++) {
    const key = `${Math.round(positions[k * 3] * 2e4)},${Math.round(positions[k * 3 + 1] * 2e4)},${Math.round(positions[k * 3 + 2] * 2e4)}`;
    let g = seen.get(key);
    if (g === undefined) {
      g = groups++;
      seen.set(key, g);
    }
    group[k] = g;
  }
  const normals = new Float32Array(nv * 3);
  const acc = new Float32Array(groups * 3);
  const compute = (): void => {
    VertexData.ComputeNormals(positions, indices, normals);
    acc.fill(0);
    for (let k = 0; k < nv; k++) {
      const g = group[k] * 3;
      acc[g] += normals[k * 3];
      acc[g + 1] += normals[k * 3 + 1];
      acc[g + 2] += normals[k * 3 + 2];
    }
    for (let k = 0; k < nv; k++) {
      const g = group[k] * 3;
      const l = Math.hypot(acc[g], acc[g + 1], acc[g + 2]) || 1;
      normals[k * 3] = acc[g] / l;
      normals[k * 3 + 1] = acc[g + 1] / l;
      normals[k * 3 + 2] = acc[g + 2] / l;
    }
  };
  compute();
  // Orient faces outward (automatic), so lighting is right whichever way the grid was parameterised.
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let k = 0; k < nv; k++) {
    cx += positions[k * 3];
    cy += positions[k * 3 + 1];
    cz += positions[k * 3 + 2];
  }
  cx /= nv;
  cy /= nv;
  cz /= nv;
  let facing = 0;
  for (let k = 0; k < nv; k++) {
    const p: V3 = [positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]];
    const o = s.outward ? s.outward(p) : ([p[0] - cx, 0, p[2] - cz] as V3);
    facing += normals[k * 3] * o[0] + normals[k * 3 + 1] * o[1] + normals[k * 3 + 2] * o[2];
  }
  if ((facing < 0) !== !!s.flip) {
    for (let t = 0; t < indices.length; t += 3) {
      const tmp = indices[t + 1];
      indices[t + 1] = indices[t + 2];
      indices[t + 2] = tmp;
    }
    compute();
  }
  const mesh = new Mesh(name, scene);
  const vd = new VertexData();
  vd.positions = positions;
  vd.indices = indices;
  vd.normals = normals;
  vd.colors = colors;
  vd.uvs = uvs;
  vd.applyToMesh(mesh, updatable);
  mesh.isPickable = false;
  return {
    mesh,
    positions,
    refresh: () => {
      compute();
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
      mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
      mesh.refreshBoundingInfo();
    },
  };
}

/** A smooth curve through control points (Catmull-Rom), as `n` points. */
export function spline(pts: V3[], n: number): Vector3[] {
  const out: Vector3[] = [];
  const m = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const f = (i / (n - 1)) * m;
    const k = Math.min(m - 1, Math.floor(f));
    const t = f - k;
    const p0 = pts[Math.max(0, k - 1)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(m, k + 2)];
    const c = (a: number, b: number, c2: number, d: number) =>
      0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t * t + (-a + 3 * b - 3 * c2 + d) * t * t * t);
    out.push(new Vector3(c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), c(p0[2], p1[2], p2[2], p3[2])));
  }
  return out;
}

export interface SweepSpec {
  path: Vector3[];
  /** Cross-section half-width and half-depth along the path (t in 0..1). */
  rx(t: number): number;
  ry?(t: number): number;
  /** Extra radial relief (wrinkles, folds) as a fraction of the radius. */
  relief?(a: number, t: number): number;
  color?(a: number, t: number, p: V3): RGB;
  segs?: number;
  /** Fraction of each end that is rounded off (a closed cap). */
  round?: number;
  up?: V3;
}

/** A tube along a path with an elliptical, optionally wrinkled cross-section and rounded ends: limbs, fingers, cords. */
export function sweep(scene: Scene, name: string, s: SweepSpec, updatable = false): Grid {
  const n = s.path.length;
  const ref = s.up ? new Vector3(...s.up) : new Vector3(0, 0, 1);
  const frames = s.path.map((p, i) => {
    const t = s.path[Math.min(n - 1, i + 1)].subtract(s.path[Math.max(0, i - 1)]).normalize();
    let nrm = Vector3.Cross(t, ref);
    if (nrm.lengthSquared() < 1e-4) nrm = Vector3.Cross(t, new Vector3(1, 0, 0));
    nrm.normalize();
    const b = Vector3.Cross(t, nrm).normalize();
    return { p, nrm, b };
  });
  const e = s.round ?? 0.06;
  return gridMesh(
    scene,
    name,
    {
      rings: n - 1,
      segs: s.segs ?? 12,
      pos: (u, v) => {
        const f = Math.min(n - 1, Math.max(0, v * (n - 1)));
        const k = Math.min(n - 2, Math.floor(f));
        const w = f - k;
        const a = frames[k];
        const b = frames[k + 1];
        const px = lerp(a.p.x, b.p.x, w);
        const py = lerp(a.p.y, b.p.y, w);
        const pz = lerp(a.p.z, b.p.z, w);
        const nrm = a.nrm.scale(1 - w).add(b.nrm.scale(w));
        const bin = a.b.scale(1 - w).add(b.b.scale(w));
        const ang = u * Math.PI * 2;
        const edge = Math.min(v, 1 - v) / e;
        const cap = edge >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - edge) * (1 - edge)));
        const rel = 1 + (s.relief ? s.relief(ang, v) : 0);
        const rx = s.rx(v) * cap * rel;
        const ry = (s.ry ? s.ry(v) : s.rx(v)) * cap * rel;
        const cA = Math.cos(ang);
        const sA = Math.sin(ang);
        return [px + nrm.x * cA * rx + bin.x * sA * ry, py + nrm.y * cA * rx + bin.y * sA * ry, pz + nrm.z * cA * rx + bin.z * sA * ry];
      },
      color: s.color ? (u, v, p) => s.color!(u * Math.PI * 2, v, p) : undefined,
      outward: (p) => {
        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < n; i++) {
          const q = s.path[i];
          const d = (p[0] - q.x) ** 2 + (p[1] - q.y) ** 2 + (p[2] - q.z) ** 2;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        const q = s.path[best];
        return [p[0] - q.x, p[1] - q.y, p[2] - q.z];
      },
    },
    updatable,
  );
}

export function material(scene: Scene, name: string, o: { diffuse?: RGB | string; spec?: number; power?: number; emissive?: RGB; ambient?: number; backFace?: boolean }): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  const d = typeof o.diffuse === "string" ? hex(o.diffuse) : (o.diffuse ?? [1, 1, 1]);
  m.diffuseColor = new Color3(d[0], d[1], d[2]);
  const sp = o.spec ?? 0.05;
  m.specularColor = new Color3(sp, sp, sp);
  m.specularPower = o.power ?? 32;
  if (o.emissive) m.emissiveColor = new Color3(o.emissive[0], o.emissive[1], o.emissive[2]);
  m.ambientColor = new Color3(o.ambient ?? 1, o.ambient ?? 1, o.ambient ?? 1);
  if (o.backFace) m.backFaceCulling = false;
  return m;
}

export interface HandSpec {
  skin: StandardMaterial;
  /** +1 for a left hand, -1 for a right hand, so the thumb is on the correct side. */
  side: 1 | -1;
  /** Curl of each finger joint in radians (index to little finger), 0 = straight, positive = curled toward the palm. */
  curl?: [number, number, number][];
  thumb?: [number, number, number];
  /** Spread between neighbouring fingers, radians. */
  splay?: number;
  scale?: number;
  tone?: RGB;
}

/** A hand with a palm, four jointed fingers and a thumb, fingertips along +z and the palm facing -y. One merged mesh. */
export function buildHand(scene: Scene, name: string, h: HandSpec): Mesh {
  const k = h.scale ?? 1;
  const tone = h.tone ?? [0.78, 0.7, 0.62];
  const parts: Mesh[] = [];
  const skinColor = (t: number, a: number): RGB => {
    let c = shade(tone, 0.94 + 0.06 * Math.cos(a));
    // Knuckles a touch darker, nail beds lighter and cooler at the tip.
    c = mix(c, shade(tone, 0.8), gauss(t, 0, 0, 0.18, 0, 0, 0.14, 1, 1, 1));
    if (Math.sin(a) > 0.3 && t > 0.88) c = mix(c, [0.82, 0.74, 0.7], 0.55);
    return c;
  };
  // Palm: narrow at the wrist, widest across the knuckles, thick in the heel of the hand and flatter on the palm side.
  const palm = gridMesh(scene, `${name}-palm`, {
    rings: 10,
    segs: 16,
    pos: (u, v) => {
      const a = u * Math.PI * 2;
      const z = lerp(-0.012, 0.092, v) * k;
      // The ends are rounded off (the wrist into the forearm, the knuckles under the fingers) so the palm is a closed form.
      const edge = Math.min(v, 1 - v) / 0.1;
      const cap = edge >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - edge) * (1 - edge)));
      const w = (0.025 + 0.017 * smooth(0, 0.75, v) - 0.003 * smooth(0.85, 1, v)) * k * (0.35 + 0.65 * cap);
      const th = (0.012 + 0.008 * Math.sin(Math.PI * Math.min(1, 0.12 + 0.88 * v)) ** 0.8) * k * cap;
      const sa = Math.sin(a);
      return [Math.cos(a) * w, sa * th * (sa < 0 ? 0.62 : 1), z];
    },
    color: (_u, _v, p) => skinColor(0.1, p[1] * 90),
    outward: (p) => [p[0], p[1], 0],
  }).mesh;
  parts.push(palm);
  const base: [number, number, number, number][] = [
    [0.031, 0.075, 0.0088, 0.0072],
    [0.0105, 0.082, 0.0092, 0.0074],
    [-0.0105, 0.078, 0.0088, 0.0072],
    [-0.031, 0.062, 0.0078, 0.0062],
  ];
  const curl = h.curl ?? [[0.1, 0.15, 0.1], [0.1, 0.15, 0.1], [0.1, 0.15, 0.1], [0.1, 0.15, 0.1]];
  base.forEach(([x, len, r0, r1], f) => {
    // Three phalanges, each rotated further toward the palm (-y).
    const lens = [len * 0.45, len * 0.32, len * 0.23];
    let ang = 0;
    let y = 0;
    let z = 0.088 * k;
    const pts: V3[] = [[x * h.side * k, 0, z]];
    for (let j = 0; j < 3; j++) {
      ang += curl[f][j];
      y -= Math.sin(ang) * lens[j] * k;
      z += Math.cos(ang) * lens[j] * k;
      pts.push([x * h.side * k, y, z]);
    }
    const a = (h.splay ?? 0) * (f - 1.5) * h.side;
    if (a !== 0) {
      const bx = pts[0][0];
      const bz = pts[0][2];
      for (const q of pts) {
        const dz = q[2] - bz;
        q[0] = bx + (q[0] - bx) + dz * Math.sin(a);
        q[2] = bz + dz * Math.cos(a);
      }
    }
    parts.push(
      sweep(scene, `${name}-finger${f}`, {
        path: spline(pts, 7),
        rx: (t) => lerp(r0, r1, t) * k * (1 + 0.1 * Math.sin(t * 9)),
        ry: (t) => lerp(r0, r1, t) * 0.97 * k,
        segs: 8,
        round: 0.14,
        up: [1, 0, 0],
        color: (a, t) => skinColor(t, a),
      }).mesh,
    );
  });
  const th = h.thumb ?? [0.5, 0.35, 0.2];
  {
    let ang = 0.55;
    let x = -0.03 * h.side * k;
    let z = 0.012 * k;
    let y = 0;
    const pts: V3[] = [[0.03 * h.side * k, 0, 0.012 * k]];
    x = 0.03 * h.side * k;
    for (let j = 0; j < 3; j++) {
      ang += th[j] * 0.35;
      const l = [0.036, 0.03, 0.026][j] * k;
      x += Math.sin(ang) * l * h.side;
      z += Math.cos(ang) * l;
      y -= th[j] * 0.02 * k;
      pts.push([x, y, z]);
    }
    parts.push(
      sweep(scene, `${name}-thumb`, { path: spline(pts, 6), rx: (t) => lerp(0.0115, 0.0085, t) * k, ry: (t) => lerp(0.01, 0.0075, t) * k, segs: 8, round: 0.16, up: [0, 1, 0], color: (a, t) => skinColor(t, a) }).mesh,
    );
  }
  const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, false)!;
  merged.name = name;
  merged.material = h.skin;
  merged.isPickable = false;
  return merged;
}
