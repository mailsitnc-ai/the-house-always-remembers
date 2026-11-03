import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { fbm, gauss, gridMesh, lerp, mix, noise3, shade, smooth, type Grid, type RGB, type V3 } from "./Sculpt";

export interface HeadCfg {
  /** Skull radii in metres (width, height, depth). */
  rx: number;
  ry: number;
  rz: number;
  /** 0 = a smooth, unresolved face; 1 = fully carved features. */
  feature: number;
  skin: RGB;
  /** Age lines, hollows under the cheekbones and the eyes. 0..1. */
  age: number;
  /** false: no mouth at all (the Hollow). Default true. */
  mouth?: boolean;
  /** Extra darkness in the eye sockets (the Hollow's empty eyes). */
  sockets?: number;
  /** How far the two sides differ, 0..1. Default 1. */
  asym?: number;
  /** Paint brows into the skin. Default true. */
  brows?: boolean;
}

export interface Head {
  grid: Grid;
  mesh: Mesh;
  /** The skin, baked from the same feature functions at a much finer resolution than the mesh. */
  texture: DynamicTexture;
  /** The mouth cavity and teeth behind the slit; the caller parents them to the head node. */
  inside: Mesh[];
  /** Opens the jaw: 0 closed .. 1 open. */
  setMouth(open: number): void;
  /** Corners of the mouth: -1 dragged down .. 1 smiling. */
  setSmile(v: number): void;
  /** Surface position for a direction, without features: used to fit hair and hats over the skull. */
  shape(dx: number, dy: number, dz: number): V3;
  cfg: HeadCfg;
}

const MOUTH_Y = -0.0745;

/** Direction on the unit sphere. The seam is at the back of the head (u = 0), the face looks along +z. */
export const dirOf = (u: number, v: number): V3 => {
  const th = u * Math.PI * 2;
  const ph = v * Math.PI;
  return [Math.sin(ph) * Math.sin(th), Math.cos(ph), -Math.sin(ph) * Math.cos(th)];
};

/** The bare skull and face as a grid displaced by hand-placed features. All feature sizes are in metres. */
export function buildHead(scene: Scene, name: string, cfg: HeadCfg): Head {
  const { rx, ry, rz, feature: F, age: A } = cfg;
  const M = cfg.mouth === false ? 0 : 1;
  const AS = cfg.asym ?? 1;
  // Half-width of the skull by height, from the crown to the chin (metres); the depth follows the same profile.
  const PROF: [number, number][] = [[1.0, 0], [0.9, 0.032], [0.74, 0.057], [0.5, 0.069], [0.17, 0.0745], [-0.17, 0.073], [-0.43, 0.064], [-0.68, 0.052], [-0.87, 0.04], [-0.97, 0.027], [-1.0, 0]];
  const prof = (t: number): number => {
    for (let i = 0; i < PROF.length - 1; i++) {
      const [t0, w0] = PROF[i];
      const [t1, w1] = PROF[i + 1];
      if (t <= t0 && t >= t1) {
        const f = (t0 - t) / (t0 - t1);
        return lerp(w0, w1, f * f * (3 - 2 * f) * 0.5 + f * 0.5);
      }
    }
    return 0;
  };
  const shape = (dx: number, dy: number, dz: number): V3 => {
    const hz = Math.hypot(dx, dz) || 1;
    const w = prof(dy) / 0.0745;
    const x = (dx / hz) * rx * w;
    const y = ry * dy;
    let z = (dz / hz) * rz * w;
    // The face is flatter than the back of the skull.
    if (z > 0) z *= 1 - 0.06 * smooth(0.3, 0.95, dz / hz);
    return [x, y, z];
  };
  const at = (u: number, v: number): V3 => {
    const [dx, dy, dz] = dirOf(u, v);
    const [x, y, z] = shape(dx, dy, dz);
    const ax = Math.abs(x);
    let d = 0;
    const sg = x >= 0 ? 1 : -1;
    // `kL` makes a feature a little stronger on one side, so the two halves of the face are never identical.
    const g = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, amp: number, kL = 1): number =>
      gauss(ax, y, z, cx, cy, cz, sx, sy, sz, amp * F * (sg > 0 ? 1 + (kL - 1) * AS : 1 - (kL - 1) * AS));
    const gs = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, amp: number): number => gauss(x, y, z, cx, cy, cz, sx, sy, sz, amp * F);
    const ym = y - 0.0012 * AS * (x / 0.02);
    // Forehead and brow ridge (one brow a touch higher).
    d += g(0, 0.075, 0.075, 0.07, 0.03, 0.04, 0.004);
    d += gauss(ax, y - 0.0013 * AS * sg, z, 0.032, 0.04, 0.08, 0.034, 0.01, 0.03, 0.0072 * F);
    // Eye sockets with a deeper upper hollow, a crease above the lid, and the bag beneath.
    d += g(0.0375, 0.02, 0.078, 0.0172, 0.0115, 0.03, -0.0125, 1.12);
    d += g(0.0375, 0.0345, 0.083, 0.021, 0.0048, 0.03, -0.0032, 1.1);
    d += g(0.0375, -0.006, 0.085, 0.02, 0.008, 0.03, -(0.0022 + 0.0022 * A), 1.15);
    // Nose: a straight-ish bridge with a very slight bend, the tip, wings and nostrils.
    d += gs(0.0008, 0.0, 0.09, 0.0065, 0.036, 0.03, 0.011);
    d += gs(0.0024, -0.032, 0.098, 0.0105, 0.0105, 0.022, 0.0165);
    d += g(0.0135, -0.036, 0.09, 0.0075, 0.0072, 0.02, 0.0062, 1.1);
    d += g(0.0065, -0.0425, 0.097, 0.0042, 0.0034, 0.018, -0.0042);
    // Cheekbones and, with age, a gaunt hollow below them.
    d += g(0.054, -0.012, 0.058, 0.02, 0.017, 0.04, 0.009, 0.92);
    d += g(0.046, -0.052, 0.062, 0.02, 0.022, 0.04, -(0.004 + 0.005 * A), 1.15);
    // Nasolabial folds, the line between the brows, and the marionette lines from the corners of the mouth.
    d += g(0.027, -0.05, 0.088, 0.0042, 0.02, 0.02, -0.0042 * (0.6 + A), 1.1);
    d += g(0.006, 0.043, 0.085, 0.0035, 0.01, 0.025, -0.0026 * A);
    d += M * g(0.024, -0.087, 0.086, 0.0042, 0.014, 0.025, -0.0028 * A, 0.9);
    // Philtrum, lips (a little skewed), mouth line, chin.
    d += M * g(0, -0.059, 0.096, 0.0045, 0.009, 0.02, -0.0022);
    d += M * gauss(Math.abs(x - 0.0014 * AS), ym, z, 0, -0.067, 0.092, 0.019, 0.0052, 0.025, 0.0066 * F);
    d += M * gauss(Math.abs(x - 0.0014 * AS), ym, z, 0, -0.0835, 0.091, 0.0195, 0.0072, 0.025, 0.0075 * F);
    d += M * gauss(Math.abs(x), ym, z, 0, MOUTH_Y, 0.093, 0.026, 0.0016, 0.025, -0.0056 * F);
    d += g(0, -0.1, 0.09, 0.02, 0.012, 0.03, M ? 0.0062 : 0.003);
    d += M * g(0, -0.094, 0.09, 0.016, 0.0045, 0.03, -0.0028 * F);
    // Ears.
    const e = gauss(ax, y, z, rx * 0.98, -0.006, -0.012, 0.009, 0.026, 0.017, 0.014 * F);
    d += e;
    d += gauss(ax, y, z, rx * 1.0, -0.004, -0.004, 0.004, 0.012, 0.008, -0.005 * F);
    const k = 1 + d / Math.max(1e-4, Math.hypot(x, y, z));
    return [x * k, y * k, z * k];
  };
  const color = (u: number, v: number, p: V3): RGB => {
    const [x, y, z] = p;
    const ax = Math.abs(x);
    const sk = cfg.skin;
    let c: RGB = sk;
    const front = smooth(0.0, 0.06, z);
    // Light forehead and a faint cool tint at the temples; warmer cheeks; shadowed sockets and bags.
    c = mix(c, [sk[0] * 0.9, sk[1] * 0.97, sk[2] * 1.05], gauss(ax, y, z, 0.07, 0.03, 0.04, 0.02, 0.03, 0.04, 0.8));
    c = mix(c, [sk[0] * 1.03, sk[1] * 0.92, sk[2] * 0.9], gauss(ax, y, z, 0.05, -0.035, 0.06, 0.025, 0.02, 0.04, 0.3) * front);
    c = shade(c, 1 - (0.2 + 0.55 * (cfg.sockets ?? 0)) * gauss(ax, y, z, 0.0375, 0.02, 0.08, 0.019, 0.012, 0.03, 1) * F);
    c = shade(c, 1 - (0.08 + 0.1 * A) * gauss(ax, y, z, 0.0375, -0.007, 0.085, 0.021, 0.0075, 0.03, 1) * F);
    c = shade(c, 1 - 0.18 * gauss(ax, y, z, 0.03, 0.045, 0.082, 0.03, 0.008, 0.03, 1) * F);
    // Lips and the dark seam between them.
    const lips = gauss(ax, y, z, 0, -0.075, 0.092, 0.021, 0.0105, 0.03, 1) * F;
    c = mix(c, [sk[0] * 0.82, sk[1] * 0.64, sk[2] * 0.62], clampTo(lips * 0.9) * M);
    c = shade(c, 1 - 0.55 * M * gauss(ax, y - 0.0012 * (x / 0.02), z, 0.002, MOUTH_Y, 0.093, 0.024, 0.0014, 0.03, 1) * F);
    c = shade(c, 1 - 0.55 * gauss(ax, y, z, 0.007, -0.0425, 0.097, 0.0045, 0.0036, 0.02, 1) * F);
    // Eyebrows, painted into the skin as soft hair rather than modelled: an arch that thins toward the temple, one a touch higher.
    if (cfg.brows !== false) {
      const t = (ax - 0.012) / 0.058;
      if (t > -0.1 && t < 1.1) {
        const yb = 0.04 + 0.0105 * Math.sin(Math.max(0, t) * 2.4) - 0.004 * t * t + 0.0013 * (x >= 0 ? 1 : -1);
        const th = 0.0058 * (1 - 0.55 * Math.max(0, t)) + 0.0016;
        const hair = Math.exp(-(((y - yb) / th) ** 2)) * smooth(-0.1, 0.1, t) * (1 - smooth(0.92, 1.1, t)) * (0.55 + 0.6 * noise3(ax * 600, y * 500, 3)) * F;
        c = mix(c, [0.3, 0.27, 0.24], clampTo(hair * 0.8));
      }
    }
    // Blotchy, uneven skin: patches of redness and sallowness, small spots, a cooler tone where the veins are near the surface.
    const bl = fbm(x * 28, y * 28, z * 28, 3);
    c = mix(c, [sk[0] * 1.05, sk[1] * 0.9, sk[2] * 0.88], clampTo((bl - 0.45) * 1.8) * 0.35);
    c = mix(c, [sk[0] * 0.92, sk[1] * 0.95, sk[2] * 0.97], clampTo((0.4 - bl) * 1.5) * 0.25);
    c = shade(c, 1 - 0.1 * clampTo((noise3(x * 330, y * 330, z * 330) - 0.9) * 10));
    c = shade(c, 0.97 + 0.06 * Math.sin(x * 140 + y * 90) * Math.sin(z * 110 - y * 60));
    void u;
    void v;
    return c;
  };
  // Fine detail the mesh is too coarse for: lines at the eyes and brow, lip creases, pores.
  const detail = (p: V3): number => {
    const [x, y, z] = p;
    const ax = Math.abs(x);
    let k = 1;
    // Crow's feet: three short lines fanning from the outer corner of each eye.
    const ox = ax - 0.066;
    const oy = y - 0.018;
    const r = Math.hypot(ox, oy);
    if (r > 0.005 && r < 0.024 && ox > -0.004) {
      const a = Math.atan2(oy, ox);
      for (const t of [-0.5, 0, 0.5]) k -= 0.2 * A * Math.exp(-(((Math.sin(a - t) * r) / 0.0013) ** 2)) * (1 - smooth(0.015, 0.024, r));
    }
    // Forehead lines and the crease above each lid.
    for (const fy of [0.07, 0.085, 0.099]) k -= 0.08 * A * Math.exp(-(((y - fy - 0.003 * Math.sin(x * 70)) / 0.0013) ** 2)) * (1 - smooth(0.035, 0.06, ax)) * smooth(0.0, 0.05, z);
    k -= 0.16 * Math.exp(-(((y - 0.037 - 0.002 * Math.cos(ax * 60)) / 0.0013) ** 2)) * smooth(0.025, 0.03, ax) * (1 - smooth(0.05, 0.056, ax)) * smooth(0.0, 0.05, z);
    // The line under the eye.
    k -= 0.1 * A * Math.exp(-(((y + 0.0065 + 0.004 * ((ax - 0.0375) / 0.02) ** 2) / 0.0012) ** 2)) * (1 - smooth(0.012, 0.02, Math.abs(ax - 0.0375)));
    // Vertical lines in the lips.
    const lip = Math.exp(-((((y + 0.0755) / 0.011) ** 2) + ((ax / 0.022) ** 2)));
    k -= 0.1 * lip * Math.max(0, Math.sin(x * 900) * Math.sin(x * 310 + 1));
    // Pores and mottling.
    k *= 0.95 + 0.1 * fbm(x * 500, y * 500, z * 500, 3);
    return k;
  };
  const skinTex = (() => {
    const W = 768;
    const H = 384;
    const t = new DynamicTexture(`${name}-skin`, { width: W, height: H }, scene, true);
    const c = t.getContext() as unknown as CanvasRenderingContext2D;
    const img = c.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      const v = (j + 0.5) / H;
      for (let i = 0; i < W; i++) {
        const u = (i + 0.5) / W;
        const o = (j * W + i) * 4;
        const dz = dirOf(u, v)[2];
        let col: RGB;
        if (dz < -0.8) col = shade(cfg.skin, 0.85);
        else {
          const p = at(u, v);
          col = shade(color(u, v, p), detail(p));
        }
        img.data[o] = Math.min(255, col[0] * 255);
        img.data[o + 1] = Math.min(255, col[1] * 255);
        img.data[o + 2] = Math.min(255, col[2] * 255);
        img.data[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    t.update();
    t.wrapU = Texture.WRAP_ADDRESSMODE;
    t.wrapV = Texture.CLAMP_ADDRESSMODE;
    t.anisotropicFilteringLevel = 4;
    return t;
  })();
  const grid = gridMesh(
    scene,
    name,
    {
      rings: 96,
      segs: 84,
      pos: at,
      outward: (p) => p,
      uv: (u, v) => [u, 1 - v],
      // The mouth is a real slit, a row of quads left out between the lips, so the jaw can open onto a dark inside.
      skip: (u, v) => {
        if (F < 0.5 || !M) return false;
        const p = at(u, v);
        return p[2] > 0.05 && Math.abs(p[0]) < 0.019 && Math.abs(p[1] - (MOUTH_Y - 0.0004)) < 0.0017;
      },
    },
    true,
  );
  // The face recedes toward the chin, so the inside of the mouth is placed relative to where the skin actually is.
  const mouthSurf = at(0.5, Math.acos(Math.max(-1, Math.min(1, MOUTH_Y / ry))) / Math.PI)[2];
  const dark = new StandardMaterial(`${name}-mouth`, scene);
  dark.diffuseColor = new Color3(0.05, 0.015, 0.015);
  dark.specularColor = Color3.Black();
  dark.emissiveColor = new Color3(0.012, 0.004, 0.004);
  const cavity = gridMesh(scene, `${name}-cavity`, {
    rings: 10,
    segs: 16,
    pos: (u, v) => {
      const [dx, dy, dz] = dirOf(u, v);
      return [dx * 0.019, dy * 0.0105, dz * 0.024];
    },
    outward: (p) => p,
  }).mesh;
  cavity.material = dark;
  cavity.position.set(0, MOUTH_Y - 0.0055, mouthSurf - 0.032);
  const teeth = new StandardMaterial(`${name}-teeth`, scene);
  teeth.diffuseColor = new Color3(0.72, 0.68, 0.58);
  teeth.specularColor = Color3.Black();
  teeth.emissiveColor = new Color3(0.05, 0.045, 0.04);
  const upper = gridMesh(scene, `${name}-teeth`, {
    rings: 4,
    segs: 16,
    pos: (u, v) => {
      const [dx, dy, dz] = dirOf(u, v);
      return [dx * 0.017, dy * 0.0035, dz * 0.006];
    },
    outward: (p) => p,
  }).mesh;
  upper.material = teeth;
  upper.position.set(0, MOUTH_Y - 0.0035, mouthSurf - 0.0075);
  // Morphs: the jaw (everything on the lower face below the mouth line follows it) and the corners of the mouth (a smile or a
  // drag downward). Both are a handful of vertices moved from the same base positions, recomputed only when a value changes.
  const base = grid.positions.slice();
  const nv = base.length / 3;
  const idx: number[] = [];
  const wts: number[] = [];
  const cIdx: number[] = [];
  const cW: number[] = [];
  for (let i = 0; i < nv; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    if (z < 0.01) continue;
    const w = smooth(MOUTH_Y - 0.0006, MOUTH_Y - 0.0045, y) * (1 - smooth(0.022, 0.058, Math.abs(x))) * smooth(0.0, 0.05, z);
    if (w > 0.002) {
      idx.push(i);
      wts.push(w);
    }
    const cw = Math.exp(-(((Math.abs(x) - 0.026) / 0.012) ** 2 + ((y - MOUTH_Y) / 0.014) ** 2)) * smooth(0.03, 0.07, z);
    if (cw > 0.01 && M) {
      cIdx.push(i);
      cW.push(cw);
    }
  }
  let openV = 0;
  let smileV = 0;
  let last = -1;
  let lastSmile = -9;
  const touched = new Set<number>([...idx, ...cIdx]);
  const apply = (): void => {
    const p = grid.positions;
    for (const i of touched) {
      p[i * 3] = base[i * 3];
      p[i * 3 + 1] = base[i * 3 + 1];
      p[i * 3 + 2] = base[i * 3 + 2];
    }
    for (let n = 0; n < idx.length; n++) {
      const i = idx[n] * 3;
      const w = wts[n];
      // Closed, the lower lip is drawn up a little so the slit becomes a thin dark line; open, it falls with the jaw.
      p[i + 1] += 0.0055 * w * (1 - Math.min(1, openV * 4)) - 0.03 * openV * w;
      p[i + 2] -= 0.008 * openV * w;
    }
    for (let n = 0; n < cIdx.length; n++) {
      const i = cIdx[n] * 3;
      // Positive: the corners lift and draw outward (a smile). Negative: they drag down (a grimace).
      p[i + 1] += 0.0075 * smileV * cW[n];
      p[i] += Math.sign(base[i]) * 0.003 * Math.abs(smileV) * cW[n];
    }
    grid.refresh();
  };
  const setMouth = (open: number): void => {
    if (Math.abs(open - last) < 0.02) return;
    last = open;
    openV = open;
    apply();
  };
  const setSmile = (v: number): void => {
    if (Math.abs(v - lastSmile) < 0.04) return;
    lastSmile = v;
    smileV = v;
    apply();
  };
  setMouth(0);
  if (!M) {
    cavity.dispose();
    upper.dispose();
  }
  return { grid, mesh: grid.mesh, setMouth, setSmile, shape, cfg, texture: skinTex, inside: M ? [cavity, upper] : [] };
}

const clampTo = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
void lerp;
