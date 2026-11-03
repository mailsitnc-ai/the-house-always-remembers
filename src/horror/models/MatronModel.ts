import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Material } from "@babylonjs/core/Materials/material";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { fabric, mulberry32 } from "../../world/ProceduralTextures";
import { normalMapFrom } from "../../world/NormalMaps";
import type { Figure } from "../CharacterBuilder";
import { buildHead, dirOf } from "./Head";
import { buildHand, fbm, gridMesh, hex, lerp, material, mix, noise3, shade, smooth, spline, sweep, type RGB, type V3 } from "./Sculpt";

const TAU = Math.PI * 2;

/** An eyeball texture: cream sclera with faint vessels, a pale iris with a dark rim, and a small pupil. Equirectangular. */
function eyeTexture(scene: Scene): DynamicTexture {
  const W = 256;
  const H = 128;
  const t = new DynamicTexture("tex-matron-eye", { width: W, height: H }, scene, true);
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  const r = mulberry32(5);
  c.fillStyle = "#d3c9b4";
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    c.strokeStyle = `rgba(150,70,60,${0.05 + r() * 0.1})`;
    c.lineWidth = 0.6;
    const x = r() < 0.5 ? r() * W * 0.3 : W * 0.7 + r() * W * 0.3;
    c.beginPath();
    c.moveTo(x, H / 2 + (r() - 0.5) * 50);
    c.lineTo(x + (x < W / 2 ? 1 : -1) * (14 + r() * 24), H / 2 + (r() - 0.5) * 60);
    c.stroke();
  }
  // Shade the sclera toward the corners and the lids, so the eye is a ball and not a white disc.
  const sh = c.createLinearGradient(0, 0, W, 0);
  sh.addColorStop(0, "rgba(60,40,30,0.55)");
  sh.addColorStop(0.36, "rgba(60,40,30,0)");
  sh.addColorStop(0.64, "rgba(60,40,30,0)");
  sh.addColorStop(1, "rgba(60,40,30,0.55)");
  c.fillStyle = sh;
  c.fillRect(0, 0, W, H);
  const sv = c.createLinearGradient(0, 0, 0, H);
  sv.addColorStop(0, "rgba(70,45,35,0.45)");
  sv.addColorStop(0.3, "rgba(70,45,35,0)");
  sv.addColorStop(0.75, "rgba(70,45,35,0)");
  sv.addColorStop(1, "rgba(70,45,35,0.25)");
  c.fillStyle = sv;
  c.fillRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H / 2;
  const rxI = W * 0.07;
  const ryI = H * 0.14;
  c.save();
  c.translate(cx, cy);
  c.scale(rxI, ryI);
  const g = c.createRadialGradient(0, 0, 0.1, 0, 0, 1);
  g.addColorStop(0, "#4a4f43");
  g.addColorStop(0.5, "#6f7565");
  g.addColorStop(0.85, "#8c8f7c");
  g.addColorStop(1, "#262a25");
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, 1, 0, TAU);
  c.fill();
  for (let i = 0; i < 110; i++) {
    const a = r() * TAU;
    c.strokeStyle = `rgba(${r() < 0.5 ? "30,36,30" : "190,196,170"},${0.1 + r() * 0.18})`;
    c.lineWidth = 0.025;
    c.beginPath();
    c.moveTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3);
    c.lineTo(Math.cos(a) * 0.96, Math.sin(a) * 0.96);
    c.stroke();
  }
  c.fillStyle = "#040504";
  c.beginPath();
  c.arc(0, 0, 0.34, 0, TAU);
  c.fill();
  // A small bright catch-light so the eye is wet.
  c.fillStyle = "rgba(255,255,255,0.7)";
  c.beginPath();
  c.arc(-0.28, -0.3, 0.1, 0, TAU);
  c.fill();
  c.restore();
  t.update();
  t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE;
  return t;
}

/**
 * The Matron. Tall, composed and too still: a woman of about sixty in a long, dark-green wool dress with a high lace collar,
 * a cameo at the throat, hands clasped at the waist, hair drawn back into a braided bun, a ring of house keys at her belt.
 * She is a little too tall, her neck is a little too long and her arms hang a little too far, her skin is waxy and
 * evenly pale, and her eyes are too clear and never blink. None of this is exaggerated; it is what you notice a moment late.
 */
export function buildMatron(scene: Scene): Figure {
  const root = new TransformNode("matron", scene);
  const body = new TransformNode("matron-body", scene);
  body.parent = root;
  // The neck is a joint chain, and the order matters: the neck pivot (it leans and stretches), then the yaw node (the head turns to look at
  // Daniel, driven by Matron.ts), then the head anchor (the rig rolls, pitches and turns the head on its own), then the skull. The anchor sits at
  // the base of the skull, where the neck ends, so the head rolls about the neck and is never swung off it.
  const neckPivot = new TransformNode("matron-neck-pivot", scene);
  neckPivot.parent = body;
  neckPivot.position.set(0, 1.9, 0);
  const yawNode = new TransformNode("matron-head", scene);
  yawNode.parent = neckPivot;
  const headAnchor = new TransformNode("matron-head-anchor", scene);
  headAnchor.parent = yawNode;
  const headNode = new TransformNode("matron-skull", scene);
  headNode.parent = headAnchor;
  // The skull's centre sits 8.5 cm above the anchor (the skull base); the neck ends exactly at the anchor, tucked inside the skull.
  headNode.position.set(0, 0.085, 0.01);
  headNode.scaling.setAll(1.1);
  const meshes: Mesh[] = [];
  const own = <T extends Mesh>(m: T, mat: StandardMaterial, parent: TransformNode, x = 0, y = 0, z = 0): T => {
    m.material = mat;
    m.parent = parent;
    m.position.set(x, y, z);
    m.isPickable = false;
    meshes.push(m);
    return m;
  };

  // ---- materials ----
  const dressTex = fabric(scene, "tex-matron-dress", 77, "#e6e6e6");
  const dress = new StandardMaterial("m-matron-dress", scene);
  dress.diffuseTexture = dressTex;
  dressTex.uScale = 5;
  dressTex.vScale = 3;
  const dn = normalMapFrom(scene, dressTex, "tex-matron-dress-n", 2.2, 256);
  dn.uScale = 5;
  dn.vScale = 3;
  dress.bumpTexture = dn;
  dress.bumpTexture.level = 0.8;
  dress.specularColor = new Color3(0.05, 0.05, 0.045);
  dress.specularPower = 12;
  dress.ambientColor = new Color3(1, 1, 1);
  dress.emissiveColor = new Color3(0.02, 0.03, 0.024);
  const skin = material(scene, "m-matron-skin", { diffuse: [1, 1, 1], spec: 0.1, power: 14, emissive: [0.035, 0.032, 0.03] });
  const lidM = material(scene, "m-matron-lid", { diffuse: [1, 1, 1], spec: 0.03, power: 6, emissive: [0.02, 0.018, 0.016] });
  const lace = material(scene, "m-matron-lace", { diffuse: [1, 1, 1], spec: 0.02, emissive: [0.05, 0.047, 0.04], backFace: true });
  const brass = material(scene, "m-matron-brass", { diffuse: "#8a6a2a", spec: 0.7, power: 24 });
  const leather = material(scene, "m-matron-leather", { diffuse: "#2a1d15", spec: 0.25, power: 20 });
  const hairM = new StandardMaterial("m-matron-hair", scene);
  hairM.specularColor = new Color3(0.14, 0.13, 0.12);
  hairM.specularPower = 22;
  hairM.ambientColor = new Color3(1, 1, 1);
  const eyeM = new StandardMaterial("m-matron-eye", scene);
  eyeM.diffuseTexture = eyeTexture(scene);
  eyeM.specularColor = new Color3(0.9, 0.9, 0.9);
  eyeM.specularPower = 80;
  eyeM.emissiveColor = new Color3(0.2, 0.2, 0.2);

  const GREEN: RGB = [0.21, 0.33, 0.25];

  // ---- skirt: a full bell with box pleats, a bustle at the back and a heavy hem ----
  const skirt = gridMesh(scene, "matron-skirt", {
    rings: 56,
    segs: 112,
    pos: (u, v) => {
      const th = u * TAU;
      const dx = Math.sin(th);
      const dz = -Math.cos(th);
      const y = lerp(0.012, 1.34, v) + (v < 0.04 ? 0.018 * (noise3(u * 40, 0, 1) - 0.5) : 0);
      let r = lerp(0.185, 0.66, Math.pow(1 - v, 1.5)) + 0.03 * smooth(0.0, 0.12, 1 - v) * (1 - v);
      const pleat = 0.016 * Math.pow(1 - v, 0.9) * Math.sin(th * 21 + 2.4 * noise3(u * 5, v * 2, 3));
      const drape = 0.028 * Math.pow(1 - v, 0.7) * Math.sin(th * 7 + 1.7 + 1.5 * noise3(u * 3, 2, v));
      r += pleat + drape;
      let x = dx * r;
      let z = dz * r * 0.8;
      // Bustle: extra fullness at the back, below the waist.
      if (dz < 0) z += dz * 0.12 * smooth(0.15, 0.7, v) * (1 - smooth(0.75, 1, v)) * -dz;
      // The skirt lifts slightly in front where she stands on her toes.
      if (dz > 0.3) x *= 1;
      return [x, y, z];
    },
    color: (u, v) => {
      const th = u * TAU;
      const f = Math.sin(th * 21 + 2.4 * noise3(u * 5, v * 2, 3));
      let ao = 0.78 + 0.22 * (f * 0.5 + 0.5);
      ao *= 0.8 + 0.2 * smooth(0, 0.35, v);
      let c = shade(GREEN, ao);
      // A band of black velvet at the hem, and a little dust on it.
      c = mix(c, [0.045, 0.05, 0.045], smooth(0.075, 0.045, v));
      c = shade(c, 0.9 + 0.2 * fbm(u * 18, v * 20, 4, 3));
      return c;
    },
    uv: (u, v) => [u, v],
    outward: (p) => [p[0], 0, p[2]],
  }).mesh;
  own(skirt, dress, body);

  // ---- bodice: fitted, seamed and buttoned, narrow-shouldered ----
  const bodice = gridMesh(scene, "matron-bodice", {
    rings: 40,
    segs: 64,
    pos: (u, v) => {
      const th = u * TAU;
      const dx = Math.sin(th);
      const dz = -Math.cos(th);
      const y = lerp(1.31, 1.965, v);
      const T = [0, 0.2, 0.45, 0.68, 0.8, 0.9, 1];
      const RX = [0.145, 0.162, 0.185, 0.2, 0.19, 0.135, 0.056];
      const RZ = [0.105, 0.115, 0.118, 0.108, 0.098, 0.08, 0.058];
      const at = (tab: number[]): number => {
        for (let i = 0; i < T.length - 1; i++) if (v <= T[i + 1]) return lerp(tab[i], tab[i + 1], smooth(T[i], T[i + 1], v));
        return tab[tab.length - 1];
      };
      const rx = at(RX);
      let rz = at(RZ);
      if (dz > 0) rz += 0.03 * Math.exp(-(((v - 0.4) / 0.12) ** 2)) * dz;
      // Lean back at the shoulders: she stands very upright.
      return [dx * rx, y, dz * rz + 0.0 * v];
    },
    color: (u, v) => {
      const th = u * TAU;
      let c = shade(GREEN, 0.95);
      // Princess seams and the centre-front line.
      for (const a of [0.62, 2.5, 3.78, 5.66]) c = shade(c, 1 - 0.28 * Math.exp(-(((th - a) / 0.03) ** 2)));
      c = shade(c, 1 - 0.28 * Math.exp(-(((th - Math.PI) / 0.02) ** 2)) * 0);
      c = shade(c, 0.85 + 0.15 * smooth(0, 0.5, v));
      return c;
    },
    uv: (u, v) => [u * 2, v * 2],
    outward: (p) => [p[0], 0, p[2]],
  }).mesh;
  own(bodice, dress, body);
  // Buttons down the front.
  {
    const btn: Mesh[] = [];
    for (let i = 0; i < 10; i++) {
      const v = 0.05 + i * 0.075;
      const T = [0, 0.2, 0.45, 0.68, 0.8, 0.9, 1];
      const RZ = [0.105, 0.115, 0.118, 0.108, 0.098, 0.08, 0.058];
      let rz = RZ[RZ.length - 1];
      for (let k = 0; k < T.length - 1; k++) if (v <= T[k + 1]) {
        rz = lerp(RZ[k], RZ[k + 1], smooth(T[k], T[k + 1], v));
        break;
      }
      rz += 0.03 * Math.exp(-(((v - 0.4) / 0.12) ** 2));
      const b = MeshBuilder.CreateSphere("b", { diameter: 0.0125, segments: 6 }, scene);
      b.scaling.z = 0.6;
      b.position.set(0, lerp(1.31, 1.965, v), rz + 0.002);
      btn.push(b);
    }
    const m = Mesh.MergeMeshes(btn, true, true)!;
    own(m, brass, body);
  }
  // Belt and buckle.
  {
    const belt = MeshBuilder.CreateTorus("matron-belt", { diameter: 0.36, thickness: 0.032, tessellation: 40 }, scene);
    belt.scaling.z = 0.77;
    own(belt, leather, body, 0, 1.345, 0.0);
    const buckle = MeshBuilder.CreateBox("matron-buckle", { width: 0.045, height: 0.04, depth: 0.012 }, scene);
    own(buckle, brass, body, 0, 1.345, 0.139);
  }
  // Stand collar and a lace frill, and a cameo at the throat.
  const collar = gridMesh(scene, "matron-collar", {
    rings: 6,
    segs: 64,
    pos: (u, v) => {
      const th = u * TAU;
      const r = 0.062 + 0.01 * v;
      return [Math.sin(th) * r * 1.05, 1.93 + 0.055 * v, -Math.cos(th) * r * 0.95];
    },
    color: (_u, v) => shade([0.1, 0.17, 0.13], 0.8 + 0.2 * v),
    outward: (p) => [p[0], 0, p[2]],
  }).mesh;
  own(collar, dress, body);
  const frill = gridMesh(scene, "matron-frill", {
    rings: 6,
    segs: 96,
    pos: (u, v) => {
      const th = u * TAU;
      const r = 0.066 + 0.036 * v;
      const y = 1.965 - 0.03 * v + 0.005 * Math.sin(th * 30) * v;
      return [Math.sin(th) * r * 1.08, y, -Math.cos(th) * r];
    },
    color: (u, v) => shade([0.78, 0.73, 0.6], 0.75 + 0.25 * Math.sin(u * TAU * 30) * 0.5 + 0.12 * v),
    outward: () => [0, 1, 0],
  }).mesh;
  own(frill, lace, body);
  {
    const cameo = MeshBuilder.CreateSphere("matron-cameo", { diameter: 1, segments: 16 }, scene);
    cameo.scaling.set(0.045, 0.058, 0.014);
    own(cameo, brass, body, 0, 1.865, 0.108);
    const face = MeshBuilder.CreateSphere("matron-cameo-face", { diameter: 1, segments: 12 }, scene);
    face.scaling.set(0.03, 0.043, 0.008);
    own(face, lace, body, 0, 1.865, 0.115);
  }

  // ---- neck, a little too long (built from its own base, so it can be stretched and leaned from there) ----
  let neckMesh: Mesh | null = null;
  {
    const neck = sweep(scene, "matron-neck", {
      path: spline([[0, 0, 0.0], [0, 0.06, 0.003], [0, 0.105, 0.009], [0, 0.145, 0.016]], 8),
      rx: (t) => lerp(0.06, 0.036, smooth(0, 0.8, t)),
      ry: (t) => lerp(0.058, 0.039, smooth(0, 0.8, t)),
      segs: 14,
      round: 0.002,
      color: (a, t) => shade([0.78, 0.69, 0.62], (0.82 + 0.18 * t) * (0.92 + 0.16 * fbm(a * 2, t * 6, 4, 3)) * (1 - 0.18 * Math.exp(-(((a % TAU) - Math.PI) ** 2) / 0.3))),
    }).mesh;
    own(neck, lidM, neckPivot);
    neckMesh = neck;
  }

  // ---- head ----
  const head = buildHead(scene, "matron-face", { rx: 0.079, ry: 0.122, rz: 0.095, feature: 1, skin: [0.79, 0.7, 0.63], age: 0.7 });
  const faceM = material(scene, "m-matron-face", { diffuse: [1, 1, 1], spec: 0.04, power: 8, emissive: [0.022, 0.02, 0.018] });
  faceM.diffuseTexture = head.texture;
  own(head.mesh, faceM, headNode);
  for (const part of head.inside) {
    part.parent = headNode;
    part.isPickable = false;
    meshes.push(part);
  }
  const eyeNodes: Mesh[] = [];
  // Eyes: wide-set and a little large, pale, and unblinking. Heavy upper lids, with the shadow of age beneath.
  for (const s of [-1, 1]) {
    const eye = gridMesh(scene, "matron-eye", {
      rings: 24,
      segs: 32,
      pos: (u, v) => {
        const [dx, dy, dz] = dirOf(u, v);
        return [dx * 0.0113, dy * 0.0113, dz * 0.0113];
      },
      outward: (p) => p,
    }).mesh;
    const eyeNode = own(eye, eyeM, headNode, 0.0375 * s, 0.02, 0.0655);
    // The eyes are not quite parallel: a very slight outward turn, a little more on one side.
    eyeNode.rotation.y = s * (s > 0 ? 0.045 : 0.02);
    eyeNodes.push(eyeNode);
    for (const upper of [true, false]) {
      const lid = gridMesh(scene, upper ? "matron-lid-up" : "matron-lid-down", {
        rings: 8,
        segs: 14,
        pos: (u, v) => {
          const th = Math.PI + (u - 0.5) * 1.9;
          const ph = upper ? lerp(0.0, Math.PI / 2 - (s > 0 ? 0.27 : 0.23), v) : lerp(Math.PI / 2 + 0.3, Math.PI, 1 - v);
          const R = 0.0127;
          return [Math.sin(ph) * Math.sin(th) * R, Math.cos(ph) * R, -Math.sin(ph) * Math.cos(th) * R];
        },
        color: (_u, v) => (upper && v > 0.95 ? [0.22, 0.17, 0.15] : !upper && v < 0.05 ? [0.5, 0.38, 0.33] : shade([0.78, 0.69, 0.62], upper ? 0.85 + 0.1 * v : 0.92)),
        outward: (p) => p,
      }).mesh;
      own(lid, lidM, headNode, 0.0375 * s, 0.02, 0.0655);
    }
  }

  // ---- hair: drawn tightly back from a centre parting, into a braided bun ----
  // The hairline is part of the texture (an alpha-tested mask with a ragged edge), so it is never a stepped mesh edge.
  const hairTex = (() => {
    const W = 512;
    const H = 256;
    const t = new DynamicTexture("tex-matron-hair", { width: W, height: H }, scene, true);
    const c = t.getContext() as unknown as CanvasRenderingContext2D;
    const img = c.createImageData(W, H);
    const mask = new DynamicTexture("tex-matron-hair-mask", { width: W, height: H }, scene, true);
    const mc = mask.getContext() as unknown as CanvasRenderingContext2D;
    const mimg = mc.createImageData(W, H);
    const r = mulberry32(11);
    const strand: number[] = [];
    for (let i = 0; i < W; i++) strand.push(r() < 0.22 ? 0.3 + r() * 0.2 : 0.09 + r() * 0.1);
    // Neighbouring strands belong to the same lock: smooth the row so the hair reads as locks, not stripes.
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < W; i++) strand[i] = (strand[i - 1 < 0 ? W - 1 : i - 1] + strand[i] * 2 + strand[(i + 1) % W]) / 4;
    for (let j = 0; j < H; j++) {
      const v = (j + 0.5) / H;
      for (let i = 0; i < W; i++) {
        const u = (i + 0.5) / W;
        const [dx, dy, dz] = dirOf(u, v);
        const [x, y] = head.shape(dx, dy, dz);
        const ax = Math.abs(x);
        const line = lerp(0.079, 0.01, smooth(0.0, 0.095, ax));
        const nape = lerp(line, -0.085, smooth(0.28, -0.08, dz));
        const edge = 0.0035 * (noise3(u * 260, v * 30, 2) - 0.5) + 0.002 * Math.sin(i * 1.7);
        const a = smooth(-0.0015, 0.0015, y - nape + edge) * (1 - smooth(0.93, 0.99, v) * 0);
        const sv = strand[i] * (0.8 + 0.4 * noise3(u * 40, v * 6, 5)) * (0.75 + 0.35 * Math.sin(v * 10 + u * 3));
        const part = dz > 0 && dy > 0.35 ? 1 - 0.7 * Math.exp(-((ax / 0.0016) ** 2)) : 1;
        const o = (j * W + i) * 4;
        const l = Math.min(1, sv * part);
        img.data[o] = l * 255 * 1.0;
        img.data[o + 1] = l * 255 * 0.97;
        img.data[o + 2] = l * 255 * 0.93;
        img.data[o + 3] = 255;
        const m = a > 0.5 ? 255 : 0;
        mimg.data[o] = mimg.data[o + 1] = mimg.data[o + 2] = m;
        mimg.data[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    t.update();
    t.wrapU = Texture.WRAP_ADDRESSMODE;
    t.wrapV = Texture.CLAMP_ADDRESSMODE;
    mc.putImageData(mimg, 0, 0);
    mask.update();
    mask.getAlphaFromRGB = true;
    mask.wrapU = Texture.WRAP_ADDRESSMODE;
    mask.wrapV = Texture.CLAMP_ADDRESSMODE;
    return { color: t, mask };
  })();
  hairM.diffuseTexture = hairTex.color;
  hairM.opacityTexture = hairTex.mask;
  hairM.transparencyMode = Material.MATERIAL_ALPHATEST;
  hairM.alphaCutOff = 0.5;
  hairM.backFaceCulling = false;
  const hairShell = gridMesh(scene, "matron-hair", {
    rings: 64,
    segs: 90,
    pos: (u, v) => {
      const [dx, dy, dz] = dirOf(u, v);
      const [x, y, z] = head.shape(dx, dy, dz);
      const n = 0.0045 * (fbm(dx * 9, dy * 9, dz * 9, 2) - 0.4);
      const k = 1.055 + n / 0.1;
      return [x * k, y * k, z * k];
    },
    uv: (u, v) => [u, 1 - v],
    outward: (p) => p,
  }).mesh;
  own(hairShell, hairM, headNode);
  {
    const bun = MeshBuilder.CreateTorusKnot("matron-bun", { radius: 0.045, tube: 0.016, radialSegments: 96, tubularSegments: 14, p: 2, q: 5 }, scene);
    bun.scaling.set(1, 0.9, 0.7);
    own(bun, hairM, headNode, 0, 0.0, -0.105);
    bun.rotation.x = Math.PI / 2 - 0.35;
  }

  // ---- arms: shoulder pivots so they can lift a little when she speaks ----
  const arms: TransformNode[] = [];
  const handRigs: { mesh: Mesh; rot: Vector3; pos: Vector3 }[] = [];
  for (const s of [-1, 1] as const) {
    const pivot = new TransformNode("matron-shoulder", scene);
    pivot.parent = body;
    pivot.position.set(0.19 * s, 1.81, 0.0);
    arms.push(pivot);
    const wrist: V3 = [-0.135 * s, -0.46, 0.26];
    const path = spline(
      [
        [-0.01 * s, 0.05, 0.0],
        [0.025 * s, -0.1, -0.005],
        [0.055 * s, -0.285, 0.02],
        [0.045 * s, -0.4, 0.15],
        wrist,
      ],
      18,
    );
    const sleeve = sweep(scene, "matron-sleeve", {
      path,
      rx: (t) => lerp(0.05, 0.03, smooth(0.15, 1, t)) + 0.012 * Math.exp(-(((t - 0.1) / 0.12) ** 2)),
      ry: (t) => lerp(0.05, 0.029, smooth(0.15, 1, t)) + 0.012 * Math.exp(-(((t - 0.1) / 0.12) ** 2)),
      relief: (a, t) => 0.05 * Math.sin(a * 3 + t * 22) * Math.exp(-(((t - 0.5) / 0.2) ** 2)) + 0.03 * Math.sin(t * 40 + a),
      segs: 16,
      round: 0.04,
      up: [0, 1, 0],
      color: (a, t) => shade(GREEN, 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(a * 3 + t * 22))),
    }).mesh;
    own(sleeve, dress, pivot);
    // A lace cuff.
    const cuff = sweep(scene, "matron-cuff", {
      path: spline([[wrist[0] - 0.012 * s, wrist[1] + 0.035, wrist[2] - 0.045], [wrist[0], wrist[1], wrist[2]]], 4),
      rx: (t) => 0.032 + 0.012 * t,
      ry: (t) => 0.031 + 0.012 * t,
      relief: (a) => 0.18 * Math.sin(a * 14),
      segs: 28,
      round: 0.02,
      up: [0, 1, 0],
      color: (a) => shade([0.78, 0.72, 0.6], 0.8 + 0.2 * Math.sin(a * 14)),
    }).mesh;
    own(cuff, lace, pivot);
    // Hands, clasped: the left lies palm-up beneath, the right lies over it.
    const hand = buildHand(scene, "matron-hand", {
      skin,
      side: s === 1 ? 1 : -1,
      scale: 1.04,
      tone: [0.8, 0.73, 0.66],
      curl: s === 1 ? [[0.15, 0.2, 0.1], [0.15, 0.2, 0.1], [0.18, 0.22, 0.1], [0.2, 0.25, 0.1]] : [[0.5, 0.55, 0.35], [0.55, 0.6, 0.35], [0.55, 0.6, 0.35], [0.5, 0.55, 0.3]],
      thumb: [0.4, 0.3, 0.2],
    });
    meshes.push(hand);
    hand.parent = pivot;
    hand.position.set(wrist[0], wrist[1] - 0.005 * s, wrist[2] + 0.01);
    if (s === 1) {
      hand.rotation.set(0.0, -0.55, Math.PI);
      hand.position.y -= 0.012;
    } else {
      hand.rotation.set(0.0, 0.5, 0);
      hand.position.y += 0.012;
    }
    handRigs.push({ mesh: hand, rot: hand.rotation.clone(), pos: hand.position.clone() });
  }

  // ---- the keys at her belt: a short strap, a ring and four keys hanging against the skirt ----
  {
    const parts: Mesh[] = [];
    const strap = MeshBuilder.CreateTube("strap", { path: spline([[0.17, 1.345, 0.07], [0.215, 1.22, 0.085], [0.238, 1.1, 0.09]], 8), radius: 0.009, tessellation: 6 }, scene);
    parts.push(strap);
    const ring = MeshBuilder.CreateTorus("ring", { diameter: 0.065, thickness: 0.009, tessellation: 22 }, scene);
    ring.rotation.x = 0.2;
    ring.position.set(0.24, 1.07, 0.095);
    parts.push(ring);
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * 0.22;
      const cx = 0.24 + Math.sin(a) * 0.03;
      const shaft = MeshBuilder.CreateCylinder("shaft", { height: 0.12, diameter: 0.009, tessellation: 8 }, scene);
      shaft.position.set(cx, 0.985 - Math.abs(a) * 0.02, 0.1);
      shaft.rotation.z = a;
      const bow = MeshBuilder.CreateTorus("bow", { diameter: 0.03, thickness: 0.008, tessellation: 12 }, scene);
      bow.position.set(cx - Math.sin(a) * 0.045, 1.045 - Math.abs(a) * 0.01, 0.1);
      const tooth = MeshBuilder.CreateBox("tooth", { width: 0.02, height: 0.01, depth: 0.007 }, scene);
      tooth.position.set(cx + Math.sin(a) * 0.05 + 0.01, 0.935 - Math.abs(a) * 0.03, 0.1);
      parts.push(shaft, bow, tooth);
    }
    const keys = Mesh.MergeMeshes(parts, true, true)!;
    own(keys, brass, body);
  }

  // ---- progressive horror: the same model, morphed. Hair that has come loose, and a rig that applies a corruption level ----
  // The loose hair is a set of broad locks, each a tapered ribbon, rooted at the hairline and simulated as a chain of segments in world space:
  // every segment follows the one above it and gravity with its own lag, so the hair trails the head's movements and settles afterwards.
  const LOCKS = 11;
  const SEG = 7;
  const RINGS = SEG * 2;
  const MAX_BEND = 0.36;
  /** The torso, as the hair sees it (body space, metres): wide enough to lie on the shoulders, with the depth of the bodice. */
  const TORSO_RX = 0.26;
  const TORSO_RZ = 0.17;
  const lockTex = (() => {
    const W = 64;
    const H = 256;
    const t = new DynamicTexture("tex-matron-lock", { width: W, height: H }, scene, true);
    const c = t.getContext() as unknown as CanvasRenderingContext2D;
    const img = c.createImageData(W, H);
    const mask = new DynamicTexture("tex-matron-lock-mask", { width: W, height: H }, scene, true);
    const mc = mask.getContext() as unknown as CanvasRenderingContext2D;
    const mimg = mc.createImageData(W, H);
    const r = mulberry32(23);
    // Each column is a run of hair with its own tone and its own length, so the lock ends in a ragged point rather than a straight edge.
    const tone: number[] = [];
    const lenCol: number[] = [];
    for (let i = 0; i < W; i++) {
      tone.push(r() < 0.18 ? 0.34 + r() * 0.2 : 0.07 + r() * 0.1);
      lenCol.push(0.78 + r() * 0.22);
    }
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < W; i++) tone[i] = (tone[(i + W - 1) % W] + tone[i] * 2 + tone[(i + 1) % W]) / 4;
    for (let j = 0; j < H; j++) {
      const v = j / (H - 1);
      for (let i = 0; i < W; i++) {
        const l = Math.min(1, tone[i] * (0.8 + 0.4 * noise3(i * 0.5, v * 9, 3)) * (0.7 + 0.5 * (1 - v * 0.5)));
        const o = (j * W + i) * 4;
        img.data[o] = l * 255;
        img.data[o + 1] = l * 247;
        img.data[o + 2] = l * 237;
        img.data[o + 3] = 255;
        const m = v < lenCol[i] && Math.abs(i / (W - 1) - 0.5) * 2 < 1 - 0.0 * v ? 255 : 0;
        mimg.data[o] = mimg.data[o + 1] = mimg.data[o + 2] = m;
        mimg.data[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    t.update();
    mc.putImageData(mimg, 0, 0);
    mask.update();
    mask.getAlphaFromRGB = true;
    t.wrapU = mask.wrapU = Texture.CLAMP_ADDRESSMODE;
    t.wrapV = mask.wrapV = Texture.CLAMP_ADDRESSMODE;
    return { color: t, mask };
  })();
  const lockM = new StandardMaterial("m-matron-locks", scene);
  lockM.diffuseTexture = lockTex.color;
  lockM.opacityTexture = lockTex.mask;
  lockM.transparencyMode = Material.MATERIAL_ALPHATEST;
  lockM.alphaCutOff = 0.5;
  lockM.backFaceCulling = false;
  lockM.twoSidedLighting = true;
  lockM.specularColor = new Color3(0.12, 0.11, 0.1);
  lockM.specularPower = 18;
  lockM.ambientColor = new Color3(1, 1, 1);
  interface Lock {
    grid: ReturnType<typeof gridMesh>;
    /** Root on the skull, as a direction and a point on the (unscaled) head. */
    base: V3;
    root: Vector3;
    out: Vector3;
    side: Vector3;
    w: Vector3[];
    p: Vector3[];
    max: number;
    half: number;
    phase: number;
  }
  const locks: Lock[] = [];
  const tmp = new Vector3();
  const tmp2 = new Vector3();
  const tmpW = new Vector3();
  const tmpB = new Vector3();
  const up = new Vector3(0, 1, 0);
  for (let i = 0; i < LOCKS; i++) {
    // Spread around the back and sides of the head, the longest and widest at the back.
    const a = (i / (LOCKS - 1) - 0.5) * 3.0;
    const dy = 0.1 + 0.42 * noise3(i, 3, 4);
    const k = Math.sqrt(1 - dy * dy);
    const dx = Math.sin(a) * k;
    const dz = -Math.cos(a) * k * 0.9 - 0.12;
    const lock: Lock = {
      grid: null as never,
      base: head.shape(dx, dy, dz),
      root: new Vector3(),
      out: new Vector3(dx, 0.1, dz).normalize(),
      side: new Vector3(Math.cos(a), 0, Math.sin(a)).normalize(),
      w: Array.from({ length: SEG }, () => new Vector3(0, -1, 0)),
      p: Array.from({ length: SEG + 1 }, () => new Vector3()),
      max: (1.0 + 0.3 * noise3(i, 7, 8)) * (1 - 0.18 * Math.abs(a) / 1.5),
      half: 0.052 + 0.03 * noise3(i, 9, 1),
      phase: i * 0.35,
    };
    lock.grid = gridMesh(
      scene,
      `matron-lock-${i}`,
      {
        rings: RINGS,
        segs: 4,
        open: true,
        pos: (u, v) => [(u * 2 - 1) * 0.05, -v, 0],
        uv: (u, v) => [u, v],
        outward: () => [0, 0, 1],
      },
      true,
    );
    const m = lock.grid.mesh;
    m.material = lockM;
    m.parent = headAnchor;
    m.isPickable = false;
    m.alwaysSelectAsActiveMesh = true;
    m.setEnabled(false);
    meshes.push(m);
    locks.push(lock);
  }
  const WHITE = new Color3(1, 1, 1);
  const eyeWhiteEmissive = eyeM.emissiveColor.clone();
  const dressEmissive = dress.emissiveColor.clone();
  const NECK = 0.145;
  /** Length of the whole transformation, in seconds. */
  const DUR = 21;
  let corr = 0;
  let maxH: number | null = null;
  let clock = 0;
  let slipT = 2;
  let slipV = 0;
  let smileCur = 0;
  let baseOpen = 0;
  let s2 = 0;
  let s3 = 0;
  let bx0 = 0;
  let bz0 = 0;
  let neckF = 1;
  let neckLean = 0;
  let neckBend = 0;
  let headRoll = 0;
  let headYaw = 0;
  let headPitch = 0;
  let eyeScale = 1;
  let act = 1;
  let stillT = 7;
  let stillFor = 0;
  let hairLen = 0;
  /** The skull as the hair sees it (anchor space): centre and radii, so the locks lie over the head instead of through it. */
  const skullC = new Vector3();
  const skullR = new Vector3(0.1, 0.12, 0.11);
  let locksOn = false;
  let gazeLast = 0;
  // The transformation: T runs from 0 to DUR once it has begun (negative: not begun). Frozen: held at T for development captures.
  let T = -1;
  let frozen = false;
  let awayDir = 1;
  const f = { body: 0, neck: 0, roll: 0, away: 0, eyes: 0, grin: 0, hair: 0, still: 0, calm: 0, buoy: 0, wave: 0 };
  const faceTex = head.texture;
  const timeline = (): void => {
    if (corr < 2.5) {
      T = -1;
      frozen = false;
      for (const k of Object.keys(f) as (keyof typeof f)[]) f[k] = 0;
      return;
    }
    if (T < 0) {
      for (const k of Object.keys(f) as (keyof typeof f)[]) f[k] = 0;
      return;
    }
    if (T >= DUR) {
      f.body = f.neck = f.roll = f.eyes = f.grin = f.hair = f.calm = 1;
      f.away = f.still = f.buoy = f.wave = 0;
      return;
    }
    // The beats, in seconds. 0-2: composed, as she was. 2-7: perfectly still. 7-12.5: the head tilts, slowly. 8.5-15.5: the hair answers, late
    // and wrongly (it lifts, a wave runs down it, then it falls). 13-18: the head turns back to Daniel, the torso does not. 14-21: the body,
    // the neck, the eyes and the mouth give up the human shape.
    f.calm = smooth(0.2, 2.2, T);
    f.still = smooth(2.2, 3.6, T) * (1 - smooth(12.6, 13.6, T));
    f.roll = smooth(7, 12.6, T);
    f.away = smooth(7.5, 12.6, T) * (1 - smooth(13.2, 18, T));
    f.hair = smooth(8.8, 15.5, T);
    f.wave = smooth(9.2, 10.6, T) * (1 - smooth(14.5, 18.5, T));
    f.buoy = smooth(10, 12.5, T) * (1 - smooth(14.2, 18.5, T));
    f.neck = smooth(13.5, 19.5, T);
    f.body = smooth(15, 20.5, T);
    f.eyes = smooth(17.5, 19.5, T);
    f.grin = smooth(19, 21, T);
  };
  const layout = (): void => {
    const calm = 1 - 0.85 * f.calm;
    body.scaling.set(1 - 0.03 * s3 - 0.26 * f.body, 1 + 0.04 * s3 + 0.3 * f.body, 1 - 0.02 * s3 - 0.2 * f.body);
    bx0 = 0.03 * s3 * calm + 0.1 * f.body;
    bz0 = 0.02 * s3 * calm + 0.05 * f.body;
    neckF = 1 + 0.3 * s3 * calm + 0.9 * f.roll + 1.2 * f.neck;
    neckLean = 0.1 * s3 * calm + 0.4 * f.neck;
    neckBend = 0.38 * f.roll;
    headRoll = 0.12 * s3 * calm + 1.05 * f.roll;
    headYaw = 0.1 * s3 * calm + 0.5 * f.body;
    headPitch = -0.55 * neckLean;
    eyeScale = 1 + 0.22 * s3 + 0.5 * f.eyes;
    // In a low room (the chamber, 2.5 m) she must not go through the ceiling: she folds forward from the neck and is squeezed to fit.
    if (maxH !== null) {
      const top = (1.9 + (NECK * neckF + 0.21) * Math.cos(neckLean)) * body.scaling.y;
      if (top > maxH) {
        const over = Math.min(1, (top - maxH) / 1.2);
        neckLean = Math.min(1.25, neckLean + 0.55 * over);
        headPitch = -0.55 * neckLean;
        body.scaling.y *= Math.max(0.72, maxH / top);
      }
    }
    if (neckMesh) {
      const thin = 1 / Math.sqrt(1 + 0.55 * (neckF - 1));
      neckMesh.scaling.set(thin, neckF, thin);
    }
    headAnchor.position.y = NECK * neckF;
    const hs = 1 + 0.38 * f.body / 1.1;
    const sx = 1.1 * (1 - 0.08 * s3 - 0.15 * f.body);
    const sy = 1.1 * (1 + 0.08 * s3 + 0.38 * f.body);
    const sz = 1.1 * (1 - 0.04 * f.body);
    headNode.scaling.set(sx, sy, sz);
    // The skull's base stays on the neck however the skull is stretched.
    headNode.position.y = 0.085 * (sy / 1.1);
    skullC.copyFrom(headNode.position);
    skullR.set(0.09 * sx, 0.115 * sy, 0.1 * sz);
    void hs;
    if (arms) {
      arms[0].scaling.y = 1 + 0.2 * s3 + 1.15 * f.body;
      arms[1].scaling.y = 1 + 0.28 * s3 + 1.3 * f.body;
      arms[0].rotation.z = -0.1 * s3 - 0.16 * f.body;
      arms[1].rotation.z = 0.08 * s3 + 0.12 * f.body;
    }
    // The hands let go of each other and hang: long, with the fingers pointing down.
    for (const h of handRigs) {
      h.mesh.rotation.set(lerp(h.rot.x, Math.PI / 2 + 0.1, f.body), lerp(h.rot.y, 0, f.body), lerp(h.rot.z, 0, f.body));
      h.mesh.scaling.set(1 + 0.2 * f.body, 1, 1 + 0.2 * f.body);
    }
    // The skin goes grey and cold, the eyes become voids, the dress darkens.
    const tint = new Color3(1 - 0.22 * (0.4 * s3 + 0.6 * f.body), 1 - 0.1 * (0.4 * s3 + 0.6 * f.body), 1);
    faceM.diffuseColor = tint.scale(1 - 0.14 * f.body);
    lidM.diffuseColor = tint.scale(1 - 0.14 * f.body);
    eyeM.diffuseColor = WHITE.scale(1 - 0.96 * f.eyes);
    eyeM.emissiveColor = eyeWhiteEmissive.scale(1 - 0.97 * f.eyes);
    dress.diffuseColor = WHITE.scale(1 - 0.5 * f.body);
    dress.emissiveColor = dressEmissive.scale(1 - 0.8 * f.body);
    hairLen = Math.min(1, 0.28 * s3 + 0.72 * f.hair);
    const on = hairLen > 0.03;
    if (on !== locksOn) {
      locksOn = on;
      for (const l of locks) l.grid.mesh.setEnabled(on);
      // Newly grown hair hangs from where it is, not from where it was last left.
      if (on) for (const l of locks) for (const w of l.w) w.set(0, -1, 0);
    }
    for (const l of locks) l.root.set(l.base[0] * sx * 0.97, headNode.position.y + l.base[1] * sy * 0.97, headNode.position.z + l.base[2] * sz * 0.97);
    baseOpen = 0.08 * s3 + 0.22 * f.grin;
    neckPivot.rotation.x = neckLean;
    neckPivot.rotation.z = neckBend;
    headAnchor.rotation.x = headPitch;
    headAnchor.rotation.z = headRoll;
    headAnchor.rotation.y = awayDir * 0.85 * f.away;
  };
  /** Moves every lock's segments toward where they want to be, then rebuilds the ribbons. */
  const simulateHair = (dt: number): void => {
    const M = headAnchor.getWorldMatrix();
    const inv = M.clone().invert();
    const bodyM = body.getWorldMatrix();
    const bodyInv = bodyM.clone().invert();
    const down = -(1 - 0.7 * f.buoy);
    for (const l of locks) {
      const len = (l.max * hairLen) / SEG;
      Vector3.TransformNormalToRef(l.out, M, tmp).normalize();
      // The first segment leaves the scalp outward and down.
      tmp2.set(tmp.x * 0.5, down * 0.85 + tmp.y * 0.2, tmp.z * 0.5).normalize();
      Vector3.TransformNormalToRef(l.side, M, tmp).normalize();
      const sideW = tmp.clone();
      l.w[0].addInPlace(tmp2.subtract(l.w[0]).scaleInPlace(Math.min(1, dt * 7))).normalize();
      for (let i = 1; i < SEG; i++) {
        // The wave travels slowly down the lock (a small phase step per segment), so it bends the hair in long curves, not in kinks.
        const phase = clock * 1.0 - i * 0.4 + l.phase;
        const want = l.w[i - 1].scale(0.72).addInPlace(new Vector3(0, down * 0.45, 0)).addInPlace(sideW.scale(0.3 * f.wave * Math.sin(phase))).addInPlace(up.scale(0.08 * f.wave * Math.cos(phase * 0.7)));
        want.normalize();
        l.w[i].addInPlace(want.subtractInPlace(l.w[i]).scaleInPlace(Math.min(1, dt * (6.5 - 0.55 * i)))).normalize();
        // No segment may bend more than a fixed angle from the one above it: this is what keeps a floating lock a curve and not a hook.
        const bend = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(l.w[i], l.w[i - 1]))));
        if (bend > MAX_BEND) l.w[i].scaleInPlace(MAX_BEND / bend).addInPlace(l.w[i - 1].scale(1 - MAX_BEND / bend)).normalize();
      }
      l.p[0].copyFrom(l.root);
      for (let i = 0; i < SEG; i++) {
        Vector3.TransformNormalToRef(l.w[i].scale(len), inv, tmp);
        l.p[i + 1].copyFrom(l.p[i]).addInPlace(tmp);
        // Hair lies over the skull, never through it: a point inside the (slightly grown) skull is pushed out along the line from its centre.
        const q = l.p[i + 1];
        const dx = (q.x - skullC.x) / (skullR.x * 1.2);
        const dy = (q.y - skullC.y) / (skullR.y * 1.2);
        const dz = (q.z - skullC.z) / (skullR.z * 1.2);
        const m = Math.hypot(dx, dy, dz);
        if (m < 1 && m > 1e-4) q.set(skullC.x + (dx / m) * skullR.x * 1.2, skullC.y + (dy / m) * skullR.y * 1.2, skullC.z + (dz / m) * skullR.z * 1.2);
        // ...and over the shoulders and chest, not through them: in the body's own space the torso is an ellipse from the waist to the collar.
        Vector3.TransformCoordinatesToRef(q, M, tmpW);
        Vector3.TransformCoordinatesToRef(tmpW, bodyInv, tmpB);
        if (tmpB.y > 1.0 && tmpB.y < 1.95) {
          // The top of the torso slopes away over the shoulders, so short hair rests on them instead of sticking out flat.
          const slope = tmpB.y > 1.78 ? Math.sqrt(Math.max(0, 1 - ((tmpB.y - 1.78) / 0.2) ** 2)) : 1;
          const bx = tmpB.x / (TORSO_RX * slope + 1e-4);
          const bz = tmpB.z / (TORSO_RZ * slope + 1e-4);
          const bm = Math.hypot(bx, bz);
          if (bm < 1 && bm > 1e-4) {
            tmpB.x = (bx / bm) * TORSO_RX * slope;
            tmpB.z = (bz / bm) * TORSO_RZ * slope;
            Vector3.TransformCoordinatesToRef(tmpB, bodyM, tmpW);
            Vector3.TransformCoordinatesToRef(tmpW, inv, q);
          }
        }
      }
      // The ribbon: a Catmull-Rom curve through the chain, a bowed cross-section, a taper.
      const pos = l.grid.positions;
      const centre = (j: number, out: Vector3): void => {
        const s = (j / RINGS) * SEG;
        const k = Math.min(SEG - 1, Math.floor(s));
        const t = s - k;
        const p0 = l.p[Math.max(0, k - 1)];
        const p1 = l.p[k];
        const p2 = l.p[k + 1];
        const p3 = l.p[Math.min(SEG, k + 2)];
        for (const c of ["x", "y", "z"] as const) {
          out[c] = 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t * t * t);
        }
      };
      const a = new Vector3();
      const b = new Vector3();
      const tan = new Vector3();
      const sd = new Vector3();
      const nrm = new Vector3();
      for (let j = 0; j <= RINGS; j++) {
        centre(j, a);
        centre(Math.min(RINGS, j + 1), b);
        if (j === RINGS) {
          centre(j - 1, tan);
          tan.copyFrom(a).subtractInPlace(tan);
        } else tan.copyFrom(b).subtractInPlace(a);
        tan.normalize();
        sd.copyFrom(l.side).subtractInPlace(tan.scale(Vector3.Dot(l.side, tan)));
        if (sd.lengthSquared() < 0.05) sd.set(0, 0, 1).subtractInPlace(tan.scale(tan.z));
        sd.normalize();
        Vector3.CrossToRef(tan, sd, nrm);
        if (Vector3.Dot(nrm, l.out) < 0) nrm.scaleInPlace(-1);
        const v = j / RINGS;
        const w = l.half * (1 - 0.86 * Math.pow(v, 1.15)) * (0.55 + 0.45 * Math.min(1, v * 7)) * (1 + 0.2 * Math.sin(v * 3.8)) * Math.min(1, hairLen * 3);
        for (let i = 0; i <= 4; i++) {
          const u = (i / 4) * 2 - 1;
          const bow = 0.4 * w * (1 - u * u);
          const o = (j * 5 + i) * 3;
          pos[o] = a.x + sd.x * u * w + nrm.x * bow;
          pos[o + 1] = a.y + sd.y * u * w + nrm.y * bow;
          pos[o + 2] = a.z + sd.z * u * w + nrm.z * bow;
        }
      }
      l.grid.refresh();
    }
  };
  /**
   * The progressive-horror rig. Level 0 is the composed woman (nothing moves). 1 is the unsettling woman: her gaze locks on and
   * does not break, her smile is held, and she goes perfectly still for too long. 2 is the unmasked woman: the proportions are
   * wrong, the face slips. 3 is the true form, THE TALL MOTHER, which she reaches through a timed transformation (see `timeline`): the
   * head tilts onto her shoulder, the hair answers late, the head turns back to Daniel while the torso does not, and the body, the neck,
   * the eyes and the mouth give up the human shape. It is the same dress, cameo, ruff, keys and hair.
   */
  const rig = {
    duration: DUR,
    set(c: number): void {
      corr = c;
      s2 = smooth(0, 1, c);
      s3 = smooth(1, 2, c);
      timeline();
      layout();
    },
    limit(h: number | null): void {
      maxH = h;
      layout();
    },
    /** Starts the transformation from the beginning (the head turns away from Daniel to the side he is on, so it can come back). */
    begin(): void {
      if (corr < 2.5) return;
      T = 0;
      frozen = false;
      awayDir = gazeLast >= 0 ? -1 : 1;
      for (const l of locks) for (const w of l.w) w.set(0, -1, 0);
      timeline();
      layout();
    },
    /** Holds the transformation at t seconds (clamped to its length). Used by captures and to skip it for a game that has already seen it. */
    seek(t: number): void {
      if (corr < 2.5) return;
      T = Math.max(0, Math.min(DUR, t));
      frozen = true;
      timeline();
      layout();
    },
    /** How long the transformation has run, in seconds, or -1 before it begins. */
    get time(): number {
      return T;
    },
    get playing(): boolean {
      return T >= 0 && T < DUR;
    },
    /** 0..1: how completely still she is; the head does not follow Daniel while this is high. */
    get stillness(): number {
      return f.still;
    },
    tick(dt: number, talk: number, gaze = 0, ready = true): void {
      clock += dt;
      if (Math.abs(gaze) > 0.02 && T < 0) gazeLast = gaze;
      // The transformation begins by itself the first time she is seen at the last level (unless it was skipped).
      if (corr >= 2.5 && T < 0 && !frozen && ready) {
        T = 0;
        awayDir = gazeLast >= 0 ? -1 : 1;
      }
      if (T >= 0 && T < DUR && !frozen) {
        T += dt;
        timeline();
        layout();
      }
      // She goes perfectly still, for too long, every so often (from the unsettling state on).
      if (s2 > 0.15) {
        stillT -= dt;
        if (stillT <= 0) {
          stillFor = (1.4 + Math.random() * 1.8) * (0.6 + 0.6 * s2);
          stillT = 6 + Math.random() * 7;
        }
      }
      stillFor = Math.max(0, stillFor - dt);
      act += ((stillFor > 0 ? 0 : 1) - act) * Math.min(1, dt * (stillFor > 0 ? 2.6 : 1.2));
      const idle = act * (1 - f.still);
      // Her gaze locks on to Daniel and does not break, even when her head turns away; the eyes also drift, and in the true form
      // one of them squints on its own while the other stays wide.
      const lock = 0.9 * s2;
      const aim = Math.max(-0.6, Math.min(0.6, gaze - headAnchor.rotation.y));
      const A = (0.04 * s2 + 0.06 * s3 + 0.1 * f.body) * idle;
      eyeNodes.forEach((e, k) => {
        const side = k === 0 ? -1 : 1;
        const base = side * (side > 0 ? 0.045 : 0.02);
        e.rotation.y = base * (1 - lock) + aim * lock + A * Math.sin(clock * 0.7 + k * 1.9) * Math.sin(clock * 0.31 + k * 2.3);
        e.rotation.x = A * 0.6 * Math.sin(clock * 0.5 + k * 3.1);
        const pulse = Math.max(0, Math.sin(clock * 0.6 + k * 2.4) - 0.3);
        e.scaling.set(eyeScale, eyeScale * (1 - 0.65 * f.eyes * pulse), eyeScale);
      });
      // An expression held too long, then, in the true form, one that swings between a grin and a grimace with no ordinary logic.
      const swing = 1.7 * f.grin * Math.sin(clock * 0.45) * Math.sin(clock * 0.17 + 1);
      const want = 0.9 * s2 * (1 - s3) * (1 - f.still) - 0.6 * s3 * (1 - f.body) * (1 - f.still) + swing;
      smileCur += (want - smileCur) * Math.min(1, dt * (Math.abs(want) > Math.abs(smileCur) ? 1.2 : 0.35));
      head.setSmile(smileCur);
      const open = Math.max(talk, baseOpen + 0.32 * f.grin * (0.5 + 0.5 * Math.sin(clock * 0.9 + 2)));
      head.setMouth(Math.min(1, open));
      // The head breathes on its own rhythm, different from the body's; it is the only thing that moves while she is otherwise still.
      headAnchor.rotation.z = headRoll + 0.03 * s3 * Math.sin(clock * 1.3) * idle + 0.12 * f.body * Math.sin(clock * 0.31) * idle;
      headAnchor.rotation.y = awayDir * 0.85 * f.away + headYaw * Math.sin(clock * 0.23) * Math.sin(clock * 0.11 + 1) * idle;
      headAnchor.rotation.x = headPitch + 0.05 * f.body * Math.sin(clock * 0.7) * idle;
      neckPivot.rotation.x = neckLean + 0.04 * f.body * Math.sin(clock * 0.8) * idle;
      if (locksOn) simulateHair(Math.min(dt, 0.05));
      // The face slips against the skull from time to time, as if the mask were struggling to hold.
      if (s3 > 0.05 && f.still < 0.5) {
        slipT -= dt;
        if (slipT <= 0) {
          slipV = 1;
          slipT = 1.2 + Math.random() * 3.2;
          faceTex.uOffset = (Math.random() - 0.5) * 0.014 * (s3 + f.body);
          faceTex.vOffset = (Math.random() - 0.5) * 0.008 * (s3 + f.body);
        }
        slipV = Math.max(0, slipV - dt * 5);
        if (slipV === 0) {
          faceTex.uOffset *= 1 - Math.min(1, dt * 8);
          faceTex.vOffset *= 1 - Math.min(1, dt * 8);
        }
      } else {
        faceTex.uOffset *= 1 - Math.min(1, dt * 8);
        faceTex.vOffset *= 1 - Math.min(1, dt * 8);
      }
    },
    /** Called after the body's own animation each frame: adds the lean and the slow sway (which the walk and the idle would otherwise overwrite). */
    post(): void {
      body.rotation.x += bx0;
      body.rotation.z += bz0 + 0.05 * f.body * Math.sin(clock * 0.5) * act * (1 - f.still);
    },
  };
  root.setEnabled(false);
  return { root, head: yawNode, body, meshes, height: 2.36, arms, setMouth: head.setMouth, rig };
}

void hex;
