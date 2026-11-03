import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { fbm, gridMesh, lerp, shade, type RGB } from "./Sculpt";

const TAU = Math.PI * 2;
const BAND = 0.024;

interface Part {
  y0: number;
  y1: number;
  /** Half-width at height y. */
  r(y: number): number;
  /** Depth relative to width (a person is flatter than a pillar). */
  depth?: number;
  /** Centre line. */
  cx?(y: number): number;
  /** Bands above this height, or in this range, are left out (the part that was never remembered). */
  missing?(y: number): boolean;
}

const hash = (a: number, b: number): number => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/**
 * The shared material: pale, cold, slightly translucent, with a bright edge. Not the black of the Hollow, not the amber of the
 * Witness. It is lit, so it has a form when a torch crosses it.
 */
export function fragmentMaterial(scene: Scene): StandardMaterial {
  const m = new StandardMaterial("m-fragment", scene);
  m.diffuseColor = new Color3(0.5, 0.56, 0.68);
  m.specularColor = new Color3(0.08, 0.08, 0.1);
  m.specularPower = 12;
  m.ambientColor = new Color3(1, 1, 1);
  m.emissiveColor = new Color3(0.2, 0.24, 0.32);
  m.backFaceCulling = false;
  m.twoSidedLighting = true;
  m.alpha = 0.95;
  m.emissiveFresnelParameters = new FresnelParameters({ leftColor: new Color3(0.55, 0.62, 0.78), rightColor: Color3.Black(), power: 1.8, bias: 0.1 });
  return m;
}

/**
 * One distorted memory, one metre tall: a person drawn from a few simple volumes (a child from behind, a hem and two legs, a
 * figure stretched too tall) and then cut into thin horizontal slices, each shifted sideways by its own amount, and some left
 * out. It is the same fault as a damaged film frame, but made in three dimensions, so it has a body that a torch can find and
 * that is never quite a person. Built once per variant; the game clones it.
 */
export function buildFragment(scene: Scene, variant: number, level = 0): Mesh {
  // How broken the memory is: 0 early (clean, slightly displaced slices), 1 middle (misaligned, some missing), 2 late (the person is hard to
  // reconstruct), 3 the finale (a deeply distorted fragment). The figure underneath is the same person each time.
  const BASEO = [0.014, 0.04, 0.075, 0.115][level];
  const BIGP = [0.1, 0.17, 0.26, 0.36][level];
  const BIGA = [0.12, 0.17, 0.23, 0.3][level];
  const MISS = [0.07, 0.16, 0.33, 0.5][level];
  const SHEAR = [0, 0.03, 0.12, 0.28][level];
  const TWIST = [0, 0.05, 0.16, 0.34][level];
  const parts: Part[] = [];
  // A profile table (height, half-width) read with smoothing: the shapes are drawn as people first, then broken.
  const tab = (rows: [number, number][]) => (y: number): number => {
    for (let i = 0; i < rows.length - 1; i++) {
      if (y <= rows[i + 1][0]) return lerp(rows[i][1], rows[i + 1][1], (y - rows[i][0]) / (rows[i + 1][0] - rows[i][0]));
    }
    return rows[rows.length - 1][1];
  };
  const head = (cy: number, r: number, depth = 1.1): Part => ({ y0: cy - r * 1.25, y1: cy + r * 1.25, r: (y) => r * Math.sqrt(Math.max(0.04, 1 - ((y - cy) / (r * 1.25)) ** 2)), depth });
  const limb = (x0: number, x1: number, y0: number, y1: number, r: number): Part => ({ y0, y1, r: (y) => r * (1 - 0.25 * ((y - y0) / (y1 - y0))), depth: 0.9, cx: (y) => lerp(x0, x1, (y - y0) / (y1 - y0)) });
  if (variant === 0) {
    // A child seen from behind: head, a thin neck, narrow shoulders, a dress that flares to the hem, arms at her sides, two legs.
    parts.push(head(0.87, 0.064));
    parts.push({ y0: 0.77, y1: 0.81, r: () => 0.022 });
    parts.push({ y0: 0.2, y1: 0.77, r: tab([[0.2, 0.15], [0.38, 0.095], [0.5, 0.062], [0.62, 0.068], [0.72, 0.082], [0.77, 0.05]]), depth: 0.62 });
    for (const s of [-1, 1]) parts.push(limb(s * 0.092, s * 0.108, 0.45, 0.73, 0.021));
    parts.push({ y0: 0, y1: 0.2, r: () => 0.026, depth: 0.9, cx: () => -0.04 }, { y0: 0, y1: 0.2, r: () => 0.026, depth: 0.9, cx: () => 0.04 });
  } else if (variant === 1) {
    // A hem and two legs: the rest of her was never remembered. A hand, floating where it was.
    parts.push({ y0: 0.1, y1: 0.5, r: tab([[0.1, 0.15], [0.3, 0.11], [0.5, 0.085]]), depth: 0.64, missing: (y) => y > 0.36 && hash(Math.floor(y / BAND), 11) > 0.4 });
    parts.push({ y0: 0, y1: 0.1, r: () => 0.026, depth: 0.9, cx: () => -0.05 }, { y0: 0, y1: 0.1, r: () => 0.026, depth: 0.9, cx: () => 0.05 });
    parts.push({ y0: 0.58, y1: 0.67, r: () => 0.034, depth: 0.45, cx: () => 0.14 });
    for (const [dx, h] of [[-0.018, 0.075], [-0.006, 0.085], [0.006, 0.08], [0.018, 0.065]] as [number, number][]) parts.push({ y0: 0.67, y1: 0.67 + h, r: () => 0.008, cx: () => 0.14 + dx });
  } else {
    // An adult drawn too tall and too thin, arms raised as if asking to be lifted.
    parts.push(head(0.935, 0.045, 1.2));
    parts.push({ y0: 0.84, y1: 0.89, r: () => 0.019 });
    parts.push({ y0: 0.44, y1: 0.85, r: tab([[0.44, 0.065], [0.52, 0.052], [0.64, 0.056], [0.78, 0.07], [0.85, 0.045]]), depth: 0.6 });
    for (const s of [-1, 1]) {
      parts.push(limb(s * 0.075, s * 0.17, 0.78, 0.985, 0.02));
      parts.push({ y0: 0.02, y1: 0.45, r: tab([[0.02, 0.022], [0.15, 0.027], [0.25, 0.024], [0.45, 0.04]]), depth: 0.9, cx: () => s * 0.03 });
    }
  }
  const bands: Mesh[] = [];
  parts.forEach((p, pi) => {
    for (let y = p.y0; y < p.y1 - 0.004; y += BAND) {
      const b = Math.floor(y / BAND);
      const y1 = Math.min(p.y1, y + BAND);
      // Each slice's own sideways shift; the same for every part, so the person is cut, not scattered.
      const ox = (hash(b, variant * 7 + 1) - 0.5) * BASEO + (hash(b, variant * 7 + 5) > 1 - BIGP ? (hash(b, variant * 7 + 6) - 0.5) * BIGA : 0);
      const oz = (hash(b, variant * 7 + 2) - 0.5) * 0.02;
      if (hash(b, variant * 7 + 3) > 1 - MISS || p.missing?.(y)) continue;
      const tw = (hash(b, variant * 7 + 8) - 0.5) * TWIST;
      const g = gridMesh(scene, `fragment-${variant}-${pi}-${b}`, {
        rings: 2,
        segs: 16,
        pos: (u, v) => {
          const yy = lerp(y, y1, v);
          const th = u * TAU;
          const r = p.r(yy);
          const px = Math.sin(th) * r;
          const pz = -Math.cos(th) * r * (p.depth ?? 0.8);
          return [px * Math.cos(tw) + pz * Math.sin(tw) + (p.cx ? p.cx(yy) : 0) + ox + SHEAR * (yy - 0.45), yy, pz * Math.cos(tw) - px * Math.sin(tw) + oz];
        },
        color: (u, v) => shade([0.85, 0.92, 1] as RGB, 0.4 + 0.9 * fbm(u * 6 + b, v * 3 + pi, variant, 2) * (0.6 + 0.4 * Math.cos(u * TAU))),
        outward: (q) => [q[0] - ox - (p.cx ? p.cx(q[1]) : 0), 0, q[2] - oz],
      }).mesh;
      bands.push(g);
    }
  });
  const merged = Mesh.MergeMeshes(bands, true, true)!;
  merged.name = `fragment-proto-${variant}-${level}`;
  merged.isPickable = false;
  merged.setEnabled(false);
  return merged;
}
