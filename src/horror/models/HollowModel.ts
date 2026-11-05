import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Material } from "@babylonjs/core/Materials/material";
import type { Figure } from "../CharacterBuilder";
import { buildHead } from "./Head";
import { buildHand, fbm, gridMesh, lerp, shade, smooth, spline, sweep, type RGB, type V3 } from "./Sculpt";

const TAU = Math.PI * 2;

/**
 * The Hollow: denial, drawn as a man-shaped absence. A tall, stooped figure of charred, ash-grey cloth and skin, too long in
 * the arm. The chest has been taken out: you can look into the rib of the coat and see only the inside of its back. The face
 * has been smoothed over, with only the faint ridge of a brow and a nose under it, as if remembered by someone who never
 * looked. One hand is whole; the other comes apart into strands. Below the knee it is not legs but soot, trailing to the floor.
 * Lit from the front it is almost black, with a cold rim that outlines how much is missing.
 */
export function buildHollow(scene: Scene): Figure {
  const root = new TransformNode("hollow", scene);
  const body = new TransformNode("hollow-body", scene);
  body.parent = root;
  const head = new TransformNode("hollow-head", scene);
  head.parent = body;
  head.position.set(0, 1.8, 0.2);
  head.rotation.x = 0.4;

  const ash = new StandardMaterial("m-hollow", scene);
  ash.diffuseColor = new Color3(0.2, 0.2, 0.21);
  ash.specularColor = new Color3(0.12, 0.12, 0.13);
  ash.specularPower = 6;
  ash.ambientColor = new Color3(1, 1, 1);
  ash.emissiveColor = new Color3(0.04, 0.046, 0.06);
  ash.backFaceCulling = false;
  ash.twoSidedLighting = true;
  ash.emissiveFresnelParameters = new FresnelParameters({ leftColor: new Color3(0.62, 0.7, 0.86), rightColor: Color3.Black(), power: 1.7, bias: 0.1 });
  
  const meshes: Mesh[] = [];
  const add = <T extends Mesh>(mesh: T, mat: StandardMaterial, parent: TransformNode, x = 0, y = 0, z = 0): T => {
    mesh.material = mat;
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.isPickable = false;
    meshes.push(mesh);
    return mesh;
  };
  const BASE: RGB = [0.6, 0.6, 0.63];
  const char = (u: number, v: number, a: number): RGB => shade(BASE, 0.45 + 0.9 * fbm(u * 14 + a, v * 9, a, 3));

  // ---- torso: a hanging coat-shape leaning forward, with the chest cut out ----
  const lean = (y: number): number => 0.2 * smooth(0.9, 1.7, y);
  const rx = (y: number): number => lerp(0.13, 0.215, smooth(0.9, 1.45, y)) * (1 - 0.6 * smooth(1.46, 1.78, y));
  const rz = (y: number): number => lerp(0.09, 0.125, smooth(0.9, 1.4, y)) * (1 - 0.45 * smooth(1.46, 1.78, y));
  // The chest and the back are cut open, and the hem torn into tatters, with a mask rather than missing quads, so the edges are smooth.
  const cut = (u: number, v: number, level: number): boolean => {
    const kk = [1, 1.45, 2.1][level];
    const th = u * TAU;
    const front = -Math.cos(th);
    const y = lerp(0.82, 1.78, v);
    const e = 0.1 * (fbm(u * 25, v * 25, 7, 2) - 0.4) + 0.025 * (fbm(u * 120, v * 120, 3, 2) - 0.5);
    const hole = (k: number): boolean => ((y - 1.28) / (0.3 * k + e)) ** 2 + (Math.sin(th) / (0.62 * k)) ** 2 < 1;
    if (front > 0.28 + e && hole(kk)) return true;
    if (front < -0.35 - e && hole(0.78 * kk)) return true;
    // Later, more of it is simply missing: a gap in the flank, then the other flank, then the shoulder.
    const sn = Math.sin(th);
    if (level >= 1 && ((y - 1.02) / (0.17 * kk + e)) ** 2 + ((sn - 0.82) / 0.32) ** 2 < 1) return true;
    if (level >= 2 && ((y - 1.12) / (0.2 + e)) ** 2 + ((sn + 0.8) / 0.34) ** 2 < 1) return true;
    if (level >= 2 && ((y - 1.62) / (0.08 + e)) ** 2 + ((sn - 0.2) / 0.3) ** 2 < 1 && front < 0.5) return true;
    return y < 0.82 + 0.16 * kk * fbm(u * 22, 3, 4, 2) * Math.abs(Math.sin(u * 40)) && v < 0.2 + 0.05 * level;
  };
  // One mask per level of incompleteness, made the first time it is needed (the later ones may never be).
  const masks: (DynamicTexture | null)[] = [null, null, null];
  const maskFor = (level: number): DynamicTexture => {
    const have = masks[level];
    if (have) return have;
    const W = 512;
    const H = 256;
    const t = new DynamicTexture(`tex-hollow-mask-${level}`, { width: W, height: H }, scene, true);
    const c = t.getContext() as unknown as CanvasRenderingContext2D;
    const img = c.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const o = (j * W + i) * 4;
        const v = 1 - (j + 0.5) / H;
        const m = cut((i + 0.5) / W, v, level) ? 0 : 255;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = m;
        img.data[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    t.update();
    t.getAlphaFromRGB = true;
    t.wrapU = Texture.WRAP_ADDRESSMODE;
    t.wrapV = Texture.CLAMP_ADDRESSMODE;
    masks[level] = t;
    return t;
  };
  const holeMask = maskFor(0);
  const shell = ash.clone("m-hollow-shell");
  shell.opacityTexture = holeMask;
  shell.transparencyMode = Material.MATERIAL_ALPHATEST;
  shell.alphaCutOff = 0.5;
  const torso = gridMesh(scene, "hollow-torso", {
    rings: 60,
    segs: 80,
    pos: (u, v) => {
      const th = u * TAU;
      const dx = Math.sin(th);
      const dz = -Math.cos(th);
      const y = lerp(0.82, 1.78, v);
      const ragged = 0.012 * (fbm(u * 18, v * 6, 4, 3) - 0.4) + (v < 0.06 ? 0.03 * (fbm(u * 30, 0, 1, 2) - 0.5) : 0);
      const hunch = 0.06 * smooth(1.35, 1.75, y) * Math.max(0, -dz);
      return [dx * (rx(y) + ragged), y, dz * (rz(y) + ragged) + lean(y) - hunch];
    },
    uv: (u, v) => [u, v],
    color: (u, v) => char(u, v, 1),
    outward: (p) => [p[0], 0, p[2] - lean(p[1])],
  }).mesh;
  add(torso, shell, body);
  // Shoulders and a bowed neck join the torso to the head.
  const neck = sweep(scene, "hollow-neck", { path: spline([[0, 1.66, 0.19], [0, 1.74, 0.21], [0, 1.82, 0.24]], 6), rx: (t) => lerp(0.075, 0.048, t), ry: (t) => lerp(0.07, 0.048, t), segs: 14, round: 0.02, color: (a, t) => char(a / TAU, t, 9) }).mesh;
  add(neck, ash, body);

  // ---- head: the same sculpted skull as the Matron, aged past recognition: sunken, no mouth, no eyes in the dark sockets ----
  const hd = buildHead(scene, "hollow-head", { rx: 0.068, ry: 0.128, rz: 0.088, feature: 0.9, skin: [0.5, 0.5, 0.53], age: 1, mouth: false, sockets: 1, asym: 1.6, brows: false });
  const skinM = ash.clone("m-hollow-skin");
  skinM.diffuseTexture = hd.texture;
  skinM.backFaceCulling = true;
  add(hd.mesh, skinM, head);
  head.scaling.setAll(1.4);

  // ---- arms: too long, the left whole and the right coming apart ----
  const armMesh: Mesh[] = [];
  let handMesh: Mesh | null = null;
  const strandMeshes: Mesh[] = [];
  const arm = (s: 1 | -1): void => {
    const sh: V3 = [0.15 * s, 1.56, 0.16];
    const path = spline([sh, [0.25 * s, 1.45, 0.2], [0.29 * s, 1.12, 0.3], [0.3 * s, 0.72, 0.36], [0.3 * s, 0.38, 0.34]], 18);
    const a = sweep(scene, "hollow-arm", {
      path,
      rx: (t) => lerp(0.07, 0.036, t),
      ry: (t) => lerp(0.066, 0.034, t),
      relief: (an, t) => 0.015 * Math.sin(an * 2 + t * 15) + 0.08 * (fbm(an * 2, t * 9, 6, 2) - 0.4),
      segs: 10,
      round: 0.004,
      up: [0, 1, 0],
      color: (an, t) => char(an / TAU, t, 5),
    }).mesh;
    add(a, ash, body);
    armMesh[s === 1 ? 0 : 1] = a;
    if (s === 1) {
      const hand = buildHand(scene, "hollow-hand", { skin: ash, side: 1, scale: 1.45, tone: [0.5, 0.5, 0.52], curl: [[0.1, 0.12, 0.1], [0.08, 0.1, 0.1], [0.1, 0.14, 0.1], [0.14, 0.16, 0.12]] });
      add(hand, ash, body, 0.3, 0.37, 0.34);
      hand.rotation.set(Math.PI / 2 + 0.1, 0, 0);
      handMesh = hand;
    } else {
      // A hand that has not been finished: strands where the fingers should be.
      for (let i = 0; i < 7; i++) {
        const o = (i - 3) * 0.012;
        const len = 0.22 + 0.12 * ((i * 37) % 5) / 5;
        strandMeshes.push(add(
          sweep(scene, "hollow-strand", {
            path: spline([[0.3 * s + o, 0.4, 0.34], [0.3 * s + o * 2, 0.4 - len * 0.5, 0.35 + 0.02 * i], [0.3 * s + o * 3.2, 0.4 - len, 0.36 - 0.015 * i]], 6),
            rx: (t) => lerp(0.011, 0.0015, t),
            segs: 6,
            round: 0.05,
            up: [1, 0, 0],
            color: () => [0.2, 0.2, 0.22],
          }).mesh,
          ash,
          body,
        ));
      }
    }
  };
  arm(1);
  arm(-1);

  // ---- below the hips: not legs but soot, trailing to the floor ----
  const sootNode = new TransformNode("hollow-soot-root", scene);
  sootNode.parent = body;
  sootNode.position.set(0, 0.9, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + (i % 3) * 0.4;
    const rr = 0.04 + 0.09 * ((i * 53) % 7) / 7;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr * 0.7;
    const top = 0.9 - 0.05 * (i % 3);
    const bottom = 0.0 + 0.1 * ((i * 17) % 6) / 6;
    add(
      sweep(scene, "hollow-soot", {
        path: spline([[x * 0.7, top - 0.9, z * 0.7 + 0.03], [x, lerp(top, bottom, 0.5) - 0.9, z + 0.04 * Math.sin(i)], [x * 1.4, bottom - 0.9, z * 1.3]], 8),
        rx: (t) => lerp(0.04, 0.004, t),
        ry: (t) => lerp(0.03, 0.003, t),
        segs: 7,
        round: 0.05,
        color: (an, t) => shade([0.3, 0.3, 0.32], 0.5 + 0.7 * (1 - t) * (0.5 + 0.5 * Math.sin(an * 3 + i))),
      }).mesh,
      ash,
      sootNode,
    );
  }
  root.setEnabled(false);
  const rig = {
    set(c: number): void {
      const level = c < 0.5 ? 0 : c < 1.5 ? 1 : 2;
      shell.opacityTexture = maskFor(level);
      const s = smooth(0, 3, c);
      // The proportions come apart: taller, the head stretched and turned, one arm gone by the end, the soot reaching further.
      body.scaling.y = 1 + 0.16 * s;
      head.scaling.set(1.4 * (1 - 0.22 * s), 1.4 * (1 + 0.3 * s), 1.4 * (1 - 0.1 * s));
      head.rotation.z = 0.18 * s;
      if (handMesh) handMesh.setEnabled(c < 1.2);
      if (armMesh[1]) armMesh[1].setEnabled(c < 2.3);
      for (const m of strandMeshes) m.setEnabled(c < 2.3);
      const f = 1 + 0.55 * s;
      sootNode.scaling.y = f;
    },
    tick(): void {},
  };
  return { root, head, body, meshes, height: 1.95, rig };
}
