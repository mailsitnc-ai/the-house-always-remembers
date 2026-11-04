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
    { z: 1.5, rx: 0.086, rz: 0.108, hc: 0.065 + PILLOW, hr: 0.128 }, // head
    { z: 1.47, rx: 0.014, rz: 0.03, hc: 0.14 + PILLOW, hr: 0.024 }, // nose
    { z: 1.52, rx: 0.047, rz: 0.012, hc: 0.128 + PILLOW, hr: 0.012 }, // brow
    { z: 1.41, rx: 0.029, rz: 0.03, hc: 0.105 + PILLOW, hr: 0.02 }, // chin
    { z: 1.35, rx: 0.03, rz: 0.05, hc: 0.02 + PILLOW * 0.4, hr: 0.04 }, // neck: the cloth dips between head and shoulders
    { z: 1.25, rx: 0.14, rz: 0.075, hc: 0.03, hr: 0.125 }, // shoulders, narrow and a little raised
    { z: 1.1, rx: 0.105, rz: 0.13, hc: 0.028, hr: 0.128 }, // ribs
    { z: 0.95, rx: 0.082, rz: 0.11, hc: 0.02, hr: 0.085 }, // waist
    { z: 0.81, rx: 0.1, rz: 0.1, hc: 0.02, hr: 0.1 }, // hips
    { z: 0.64, rx: 0.088, rz: 0.15, hc: 0.014, hr: 0.082 }, // thighs
    { z: 0.52, rx: 0.07, rz: 0.06, hc: 0.012, hr: 0.116 }, // knees, a little bent so they tent the cloth
    { z: 0.42, rx: 0.06, rz: 0.1, hc: 0.008, hr: 0.064 }, // shins
    { z: 0.31, rx: 0.04, rz: 0.055, hc: 0.0, hr: 0.14, x: BX - 0.05 }, // left foot, toes up under the sheet
    { z: 0.31, rx: 0.04, rz: 0.055, hc: 0.0, hr: 0.14, x: BX + 0.05 }, // right foot
    { z: 1.02, rx: 0.032, rz: 0.2, hc: 0.006, hr: 0.074, x: BX - 0.135 }, // left arm, at her side
    { z: 1.02, rx: 0.032, rz: 0.2, hc: 0.006, hr: 0.074, x: BX + 0.135 }, // right arm
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
      h = smax(h, v, 0.035);
    }
    return h;
  };
  // Cloth is stiffer than the body under it: average the body height over a small neighbourhood.
  const tent = (x: number, z: number): number => {
    const r = 0.012;
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
  // ---- her hair: fanned out on the pillow, with a few locks lying across the sheet, so the head, the hand and the ribbon are one girl ----
  const hairM = material(scene, "m-shroud-hair", { diffuse: [1, 1, 1], spec: 0.06, power: 16, emissive: [0.045, 0.03, 0.022] });
  const PTOP = MAT_TOP + PILLOW + 0.01;
  for (let i = 0; i < 15; i++) {
    const a = (i / 14 - 0.5) * 2;
    const w = 0.5 + 0.5 * noise3(i * 3.1, 0.7, 2);
    const path = spline(
      [
        [BX + a * 0.045, PTOP + 0.125 * (1 - Math.abs(a) * 0.35), 1.56],
        [BX + a * 0.085, PTOP + 0.04 * (1 - Math.abs(a)), 1.63 + 0.02 * w],
        [BX + a * 0.125 + 0.012 * Math.sin(i), PTOP + 0.004, 1.69 + 0.03 * w],
        [BX + a * 0.16 + 0.018 * Math.sin(i * 1.7), PTOP + 0.001, 1.75 + 0.04 * w],
      ],
      9,
    );
    const strand = sweep(scene, "emily-hair", {
      path,
      // Flat, soft ribbons that thin toward the ends and lie on the pillow, not spikes standing off it.
      rx: (t) => 0.016 * (1 - 0.55 * t),
      ry: () => 0.0032,
      segs: 6,
      round: 0.04,
      up: [0, 1, 0],
      color: (_a, t) => shade([0.3, 0.2, 0.14], 0.8 + 0.35 * fbm(i * 2.3, t * 5, 1, 3)),
    }).mesh;
    strand.material = hairM;
    meshes.push(strand);
  }
  // Two locks over the shoulder, lying on the cloth.
  for (const [k, side] of [[0, -1], [1, 1]] as const) {
    const x0 = BX + side * 0.085;
    const path = spline(
      [
        [x0, MAT_TOP + 0.2, 1.52],
        [x0 + side * 0.03, cloth(x0 + side * 0.03, 1.36) + 0.008, 1.36],
        [x0 + side * 0.045 + 0.01 * k, cloth(x0 + side * 0.045, 1.2) + 0.006, 1.2],
        [x0 + side * 0.05, cloth(x0 + side * 0.05, 1.05) + 0.005, 1.04 - 0.03 * k],
      ],
      10,
    );
    const lock = sweep(scene, "emily-lock", { path, rx: () => 0.013, ry: () => 0.006, segs: 8, round: 0.05, up: [0, 1, 0], color: (_a, t) => shade([0.3, 0.2, 0.14], 0.8 + 0.4 * fbm(k * 3, t * 8, 4, 3)) }).mesh;
    lock.material = hairM;
    meshes.push(lock);
  }
  for (const m of meshes) m.isPickable = false;
  return { meshes, handAt: new Vector3(hx, hy + 0.02, hz) };
}
