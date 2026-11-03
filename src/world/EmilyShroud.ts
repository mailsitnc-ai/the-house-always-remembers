import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { buildHand, fbm, gridMesh, lerp, material, mix, noise3, shade, smooth, spline, sweep, type RGB } from "../horror/models/Sculpt";
import { fabric } from "./ProceduralTextures";

/** Where the bed is, in stage-room coordinates. */
const BX = 0.1;
const MAT_TOP = 0.54;

interface Lump {
  z: number;
  rx: number;
  rz: number;
  hc: number;
  hr: number;
  x?: number;
}

/**
 * A child's body laid out on her back, under a linen sheet that has not been moved in eleven years. The body is described as
 * a set of overlapping volumes (head, neck, shoulders, chest, belly, hips, thighs, shins, feet, and the two arms along her
 * sides) with a child's proportions, and the cloth is a height field draped over them: it tents over the shoulders and the
 * knees, sags between, falls over the edge of the mattress, is creased, and is yellowed and a little dirty at the edges. A
 * thin veil of the same cloth lies over her face, so the brow, the nose and the chin can be made out. One small hand lies on
 * top of the sheet with a faded ribbon on the wrist. Nothing of her is shown but the shape and the hand: no face, no injury.
 * There is no movement: she does not breathe.
 */
export function buildShroud(scene: Scene): { meshes: Mesh[]; handAt: Vector3 } {
  const meshes: Mesh[] = [];
  const PILLOW = 0.075;
  // Child proportions: a large head, narrow shoulders, a short neck, short limbs. About 1.25 m from crown to heel.
  const lumps: Lump[] = [
    { z: 1.5, rx: 0.074, rz: 0.098, hc: 0.06 + PILLOW, hr: 0.1 }, // head
    { z: 1.48, rx: 0.013, rz: 0.028, hc: 0.125 + PILLOW, hr: 0.019 }, // nose
    { z: 1.52, rx: 0.044, rz: 0.011, hc: 0.118 + PILLOW, hr: 0.011 }, // brow
    { z: 1.42, rx: 0.027, rz: 0.028, hc: 0.1 + PILLOW, hr: 0.018 }, // chin
    { z: 1.36, rx: 0.03, rz: 0.05, hc: 0.035 + PILLOW * 0.55, hr: 0.048 }, // neck
    { z: 1.27, rx: 0.13, rz: 0.075, hc: 0.02, hr: 0.088 }, // shoulders
    { z: 1.12, rx: 0.1, rz: 0.13, hc: 0.018, hr: 0.098 }, // chest
    { z: 0.95, rx: 0.088, rz: 0.115, hc: 0.012, hr: 0.082 }, // belly
    { z: 0.82, rx: 0.098, rz: 0.1, hc: 0.012, hr: 0.085 }, // hips
    { z: 0.64, rx: 0.09, rz: 0.165, hc: 0.01, hr: 0.078 }, // thighs
    { z: 0.46, rx: 0.078, rz: 0.15, hc: 0.008, hr: 0.066 }, // shins
    { z: 0.34, rx: 0.075, rz: 0.075, hc: 0.0, hr: 0.09 }, // feet
    { z: 1.06, rx: 0.032, rz: 0.19, hc: 0.0, hr: 0.066, x: BX - 0.125 }, // left arm, at her side
    { z: 1.06, rx: 0.032, rz: 0.19, hc: 0.0, hr: 0.066, x: BX + 0.125 }, // right arm
  ];
  const smax = (a: number, b: number, k: number): number => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.max(a, b) + h * h * k * 0.25;
  };
  const body = (x: number, z: number): number => {
    let h = 0;
    for (const l of lumps) {
      const dx = (x - (l.x ?? BX)) / l.rx;
      const dz = (z - l.z) / l.rz;
      const t = dx * dx + dz * dz;
      const v = t < 1 ? l.hc + l.hr * Math.sqrt(1 - t) : 0;
      h = smax(h, v, 0.05);
    }
    return h;
  };
  // Cloth is stiffer than the body under it: average the body height over a small neighbourhood.
  const tent = (x: number, z: number): number => {
    const r = 0.02;
    return (body(x, z) * 2 + body(x + r, z) + body(x - r, z) + body(x, z + r) + body(x, z - r)) / 6;
  };
  const X0 = BX - 0.58;
  const XW = 1.16;
  const Z0 = -0.05;
  const ZL = 1.72;
  const SEGS = 120;
  const RINGS = 200;
  const heights = new Float32Array((SEGS + 1) * (RINGS + 1));
  const HW = 0.44;
  const cloth = (x: number, z: number): number => {
    let y = MAT_TOP + 0.006 + tent(x, z);
    const dEdge = Math.abs(x - BX) - HW;
    const dFoot = 0.04 - z;
    const drop = Math.max(0, dEdge, dFoot);
    if (drop > 0) y -= Math.min(0.3, drop * 4.2) + 0.012 * Math.sin(z * 31 + x * 9) * Math.min(1, drop * 12);
    const b = tent(x, z);
    // Creases: shallow folds across the sides where the cloth is slack, a few diagonal tension lines at the knees and shoulders.
    y += 0.0045 * (fbm(x * 20, z * 20, 1, 3) - 0.4);
    y += 0.0035 * Math.sin(z * 58 + 5 * fbm(x * 6, z * 6, 3, 2)) * (1 - smooth(0.0, 0.07, b)) * smooth(0.05, 0.25, Math.abs(x - BX));
    y += 0.003 * Math.sin((x - BX) * 90 + z * 24) * smooth(0.02, 0.08, b) * (1 - smooth(0.08, 0.14, b));
    return y;
  };
  for (let j = 0; j <= RINGS; j++) {
    for (let i = 0; i <= SEGS; i++) heights[j * (SEGS + 1) + i] = cloth(X0 + (i / SEGS) * XW, Z0 + (j / RINGS) * ZL);
  }
  const at = (i: number, j: number): number => heights[Math.max(0, Math.min(RINGS, j)) * (SEGS + 1) + Math.max(0, Math.min(SEGS, i))];
  const IVORY: RGB = [0.82, 0.78, 0.68];
  const sheet = gridMesh(scene, "emily-sheet", {
    rings: RINGS,
    segs: SEGS,
    open: true,
    pos: (u, v) => {
      const i = Math.round(u * SEGS);
      const j = Math.round(v * RINGS);
      return [X0 + u * XW, heights[j * (SEGS + 1) + i], Z0 + v * ZL];
    },
    color: (u, v, p) => {
      const i = Math.round(u * SEGS);
      const j = Math.round(v * RINGS);
      // Occlusion from the height field: valleys darker, ridges lighter.
      const avg = (at(i - 3, j) + at(i + 3, j) + at(i, j - 3) + at(i, j + 3)) / 4;
      const bb = tent(p[0], p[2]);
      // Contact: the cloth is darker in the crease where it leaves the body and meets the mattress.
      const ao = Math.max(0.5, Math.min(1.12, 1 + (at(i, j) - avg) * 9)) * (1 - 0.24 * smooth(0.0, 0.012, bb) * (1 - smooth(0.012, 0.05, bb)));
      let c = shade(IVORY, ao);
      // Age: yellowed toward the hem and where it hangs, a little dust, one old stain.
      const edge = smooth(0.38, 0.52, Math.abs(p[0] - BX)) + smooth(0.06, -0.02, p[2]);
      c = mix(c, [0.7, 0.6, 0.4], Math.min(0.6, 0.25 * fbm(p[0] * 6, p[2] * 6, 2, 3) + 0.4 * edge));
      c = mix(c, [0.58, 0.5, 0.36], 0.35 * Math.exp(-(((p[0] - BX + 0.12) / 0.07) ** 2 + ((p[2] - 0.7) / 0.1) ** 2)));
      return shade(c, 0.94 + 0.1 * noise3(p[0] * 120, p[2] * 120, 4));
    },
    outward: () => [0, 1, 0],
    uv: (u, v) => [u * 5, v * 7],
  }).mesh;
  const linenTex = fabric(scene, "tex-shroud", 31, "#f0ece0");
  const linen = new StandardMaterial("m-shroud", scene);
  linen.diffuseTexture = linenTex;
  linen.specularColor = new Color3(0.04, 0.04, 0.04);
  linen.specularPower = 8;
  linen.ambientColor = new Color3(1, 1, 1);
  linen.emissiveColor = new Color3(0.035, 0.032, 0.026);
  linen.backFaceCulling = false;
  sheet.material = linen;
  meshes.push(sheet);

  // ---- the hand on the sheet, and the faded ribbon at her wrist ----
  const skin = material(scene, "m-shroud-skin", { diffuse: [1, 1, 1], spec: 0.1, power: 12, emissive: [0.045, 0.044, 0.042] });
  const hx = BX - 0.078;
  const hz = 1.0;
  const hy = cloth(hx, hz) + 0.003;
  const hand = buildHand(scene, "emily-hand", { skin, side: -1, scale: 0.78, tone: [0.86, 0.76, 0.69], splay: 0.1, curl: [[0.05, 0.08, 0.05], [0.07, 0.1, 0.06], [0.09, 0.12, 0.07], [0.11, 0.14, 0.08]], thumb: [0.1, 0.1, 0.05] });
  hand.position.set(hx, hy + 0.017, hz - 0.012);
  hand.rotation.set(0.03, Math.PI - 0.25, 0);
  meshes.push(hand);
  // The wrist and forearm come out from under a fold of the sheet.
  const arm = sweep(scene, "emily-wrist", {
    path: spline([[hx + 0.012, hy + 0.003, hz + 0.1], [hx + 0.008, hy + 0.015, hz + 0.05], [hx, hy + 0.018, hz + 0.005]], 8),
    rx: (t) => lerp(0.02, 0.0165, t),
    ry: (t) => lerp(0.017, 0.013, t),
    segs: 12,
    round: 0.02,
    up: [0, 1, 0],
    color: () => [0.86, 0.76, 0.69],
  }).mesh;
  arm.material = skin;
  meshes.push(arm);
  // The ribbon: a faded rose band at the wrist, tied in a small bow with two loops and two short tails.
  const ribbon = material(scene, "m-shroud-ribbon", { diffuse: "#b98c93", spec: 0.05, emissive: [0.05, 0.035, 0.036] });
  const band = MeshBuilder.CreateTorus("emily-ribbon", { diameter: 0.037, thickness: 0.009, tessellation: 24 }, scene);
  band.rotation.x = Math.PI / 2 - 0.08;
  band.position.set(hx + 0.004, hy + 0.016, hz + 0.024);
  band.scaling.set(1, 1, 0.9);
  band.material = ribbon;
  meshes.push(band);
  const bow: Mesh[] = [];
  for (const s of [-1, 1]) {
    // Two soft, flat loops, a knot, and two short tails lying on the sheet.
    const loop = MeshBuilder.CreateSphere("loop", { diameter: 1, segments: 10 }, scene);
    loop.scaling.set(0.03, 0.007, 0.016);
    loop.rotation.y = s * 0.45;
    loop.position.set(hx + s * 0.017, hy + 0.034, hz + 0.028);
    const tail = MeshBuilder.CreateTube("tail", { path: spline([[hx + s * 0.004, hy + 0.03, hz + 0.03], [hx + s * 0.012, hy + 0.014, hz + 0.052], [hx + s * 0.022, hy + 0.007, hz + 0.08]], 6), radius: 0.0042, tessellation: 6 }, scene);
    bow.push(loop, tail);
  }
  const knot = MeshBuilder.CreateSphere("knot", { diameter: 0.012, segments: 8 }, scene);
  knot.position.set(hx, hy + 0.032, hz + 0.029);
  bow.push(knot);
  const bowMesh = Mesh.MergeMeshes(bow, true, true)!;
  bowMesh.material = ribbon;
  meshes.push(bowMesh);
  for (const m of meshes) m.isPickable = false;
  return { meshes, handAt: new Vector3(hx, hy + 0.02, hz) };
}
