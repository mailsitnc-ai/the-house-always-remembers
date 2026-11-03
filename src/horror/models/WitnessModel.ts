import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { paintPhoto } from "../../world/PhotoPainter";
import type { Figure } from "../CharacterBuilder";
import { buildHand, fbm, gridMesh, lerp, material, noise3, shade, smooth, spline, sweep, type RGB } from "./Sculpt";

const TAU = Math.PI * 2;

/** A tileable film-grain mask: a stipple of opaque and clear specks, so the figure dissolves like a badly exposed print. */
function grainMask(scene: Scene): DynamicTexture {
  const t = new DynamicTexture("tex-witness-grain", { width: 128, height: 128 }, scene, true);
  t.hasAlpha = true;
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  const img = c.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const blot = 0.5 + 0.35 * Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2) * Math.sin(y * 0.13 + 1);
      const a = Math.min(1, Math.max(0, blot * 0.7 + Math.random() * 0.55 - 0.05));
      const o = (y * 128 + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = a > 0.36 ? 255 * Math.min(1, a + 0.15) : 50;
    }
  }
  c.putImageData(img, 0, 0);
  t.update();
  t.wrapU = t.wrapV = Texture.WRAP_ADDRESSMODE;
  t.uScale = 3;
  t.vScale = 5;
  return t;
}

export interface WitnessFigure extends Figure {
  /** The grain mask, whose offset is animated to make the figure crawl like film. */
  grain: DynamicTexture;
  /** The raised arm, the hand and the small photograph it holds; it pivots at the shoulder. */
  photoArm: TransformNode;
}

/**
 * The Witness: a long-exposure figure in a long overcoat and a brimmed hat, face lost in the shadow of the brim, one hand
 * holding a small photograph to its chest. Amber-sepia like an old print, with a stipple dissolve and a cooler double-exposure
 * `ghost` that trails it. The coat is cut and creased, the hat is constructed (crown, pinched dent, band, curved brim), and
 * the photograph is a real painted one: the family on the step, four of them, as the album has it.
 */
export function buildWitness(scene: Scene, ghost = false): WitnessFigure {
  const root = new TransformNode(ghost ? "witness-ghost" : "witness", scene);
  const body = new TransformNode("witness-body", scene);
  body.parent = root;
  body.rotation.x = 0.05;
  const head = new TransformNode("witness-head", scene);
  head.parent = body;
  head.position.set(0, 1.72, 0.03);
  head.rotation.x = 0.42;

  const grain = grainMask(scene);
  const m = new StandardMaterial(ghost ? "m-witness-ghost" : "m-witness", scene);
  m.diffuseColor = ghost ? new Color3(0.55, 0.7, 0.8) : new Color3(0.92, 0.72, 0.45);
  m.specularColor = new Color3(0.05, 0.045, 0.03);
  m.specularPower = 10;
  m.ambientColor = new Color3(1, 1, 1);
  m.emissiveColor = ghost ? new Color3(0.07, 0.13, 0.19) : new Color3(0.2, 0.12, 0.05);
  m.opacityTexture = grain;
  m.backFaceCulling = false;
  m.emissiveFresnelParameters = new FresnelParameters({
    leftColor: ghost ? new Color3(0.2, 0.4, 0.55) : new Color3(0.8, 0.5, 0.2),
    rightColor: Color3.Black(),
    power: 1.8,
    bias: 0.05,
  });

  const meshes: Mesh[] = [];
  const add = <T extends Mesh>(mesh: T, mat: StandardMaterial, parent: TransformNode, x = 0, y = 0, z = 0): T => {
    mesh.material = mat;
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.isPickable = false;
    meshes.push(mesh);
    return mesh;
  };
  const COAT: RGB = [0.6, 0.5, 0.38];
  const DARK: RGB = [0.22, 0.17, 0.12];

  // ---- the overcoat: cut to mid-calf, narrow at the shoulder, creased, with a collar turned up and a centre-front seam ----
  const prof = (y: number, tab: [number, number][]): number => {
    for (let i = 0; i < tab.length - 1; i++) {
      if (y <= tab[i + 1][0]) return lerp(tab[i][1], tab[i + 1][1], smooth(tab[i][0], tab[i + 1][0], y));
    }
    return tab[tab.length - 1][1];
  };
  const RX: [number, number][] = [[0.42, 0.265], [0.75, 0.225], [1.05, 0.185], [1.3, 0.2], [1.5, 0.205], [1.6, 0.14], [1.66, 0.075]];
  const RZ: [number, number][] = [[0.42, 0.18], [0.75, 0.15], [1.05, 0.12], [1.3, 0.135], [1.5, 0.125], [1.6, 0.09], [1.66, 0.07]];
  const coat = gridMesh(scene, "witness-coat", {
    rings: 60,
    segs: 72,
    pos: (u, v) => {
      const th = u * TAU;
      const dx = Math.sin(th);
      const dz = -Math.cos(th);
      const y = lerp(0.42, 1.66, v);
      const fold = 0.012 * (1 - v) * Math.sin(th * 9 + 3 * noise3(u * 4, v * 3, 1)) + 0.006 * Math.sin(th * 17 + v * 4);
      const open = dz > 0.85 && v < 0.62 ? -0.012 * smooth(0.85, 0.99, dz) : 0;
      return [dx * (prof(y, RX) + fold), y, dz * (prof(y, RZ) + fold * 0.7) + open];
    },
    color: (u, v) => {
      const th = u * TAU;
      let c = shade(COAT, 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(th * 9 + 3 * noise3(u * 4, v * 3, 1))));
      c = shade(c, 1 - 0.5 * Math.exp(-(((th - Math.PI) / 0.018) ** 2)) * smooth(0.65, 0.5, v));
      // Pocket flaps and a belt line.
      c = shade(c, 1 - 0.25 * Math.exp(-(((v - 0.4) / 0.012) ** 2)) * smooth(0.6, 1.1, Math.abs(Math.sin(th))));
      c = shade(c, 0.85 + 0.3 * fbm(u * 30, v * 15, 2, 3));
      return c;
    },
    outward: (p) => [p[0], 0, p[2]],
  }).mesh;
  add(coat, m, body);
  // Buttons.
  {
    const parts: Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const y = 1.4 - i * 0.2;
      const b = MeshBuilder.CreateSphere("b", { diameter: 0.022, segments: 6 }, scene);
      b.scaling.z = 0.5;
      b.position.set(0.012, y, prof(y, RZ) + 0.003);
      parts.push(b);
    }
    add(Mesh.MergeMeshes(parts, true, true)!, m, body);
  }
  // Collar, turned up around the neck so no face or neck is ever seen.
  const collar = gridMesh(scene, "witness-collar", {
    rings: 8,
    segs: 40,
    pos: (u, v) => {
      const th = u * TAU;
      const r = lerp(0.1, 0.135, v);
      return [Math.sin(th) * r * 1.1, lerp(1.58, 1.76, v) + 0.02 * Math.sin(th * 2) * v, -Math.cos(th) * r * 0.95 + 0.012];
    },
    color: (_u, v) => shade(DARK, 0.9 + 0.3 * v),
    outward: (p) => [p[0], 0, p[2]],
  }).mesh;
  add(collar, m, body);

  // ---- legs and shoes ----
  for (const s of [-1, 1]) {
    const leg = sweep(scene, "witness-leg", { path: spline([[0.07 * s, 0.5, 0], [0.075 * s, 0.25, 0.005], [0.08 * s, 0.07, 0.01]], 6), rx: (t) => lerp(0.056, 0.036, t), ry: (t) => lerp(0.054, 0.034, t), segs: 12, round: 0.04, color: () => DARK }).mesh;
    add(leg, m, body);
    const shoe = gridMesh(scene, "witness-shoe", {
      rings: 14,
      segs: 20,
      pos: (u, v) => {
        const th = u * TAU;
        const ph = v * Math.PI;
        const sx = Math.sin(ph) * Math.cos(th);
        const sz = Math.sin(ph) * Math.sin(th);
        const sy = Math.cos(ph);
        // A rounded shoe: long, low, and flat on the floor, with the toe cap forward.
        return [sx * 0.044, 0.03 + Math.max(sy, -0.2) * 0.03, 0.05 + sz * 0.1];
      },
      color: () => [0.15, 0.11, 0.08],
      outward: (p) => [p[0], p[1] - 0.03, p[2] - 0.05],
    }).mesh;
    add(shoe, m, body, 0.08 * s, 0, 0.0);
  }

  // ---- the hat: pinched crown, band, and a wide brim that droops at the front ----
  const crown = gridMesh(scene, "witness-crown", {
    rings: 24,
    segs: 40,
    pos: (u, v) => {
      const th = u * TAU;
      const dx = Math.sin(th);
      const dz = -Math.cos(th);
      const r = lerp(0.112, 0.092, smooth(0, 0.8, v)) * (1 - smooth(0.8, 1.0, v) ** 1.5);
      let y = 0.135 * smooth(0, 0.85, v) + 0.01 * smooth(0.8, 1, v);
      const x = dx * r * 1.05;
      const z = dz * r * 1.12;
      // The dent: pinched at the front, with a lengthwise crease along the top.
      y -= 0.02 * Math.exp(-((x / 0.035) ** 2)) * smooth(0.7, 1, v);
      y -= 0.012 * Math.exp(-(((z - 0.045) / 0.03) ** 2)) * Math.exp(-((x / 0.07) ** 2)) * smooth(0.75, 1, v);
      return [x * (1 + 0.04 * Math.exp(-((z / 0.05) ** 2)) * 0), y, z];
    },
    color: (_u, v) => shade([0.62, 0.52, 0.4], 0.7 + 0.3 * v),
    outward: (p) => [p[0], p[1] - 0.05, p[2]],
  }).mesh;
  add(crown, m, head, 0, 0.065, 0.01);
  const band = gridMesh(scene, "witness-band", {
    rings: 2,
    segs: 40,
    pos: (u, v) => {
      const th = u * TAU;
      return [Math.sin(th) * 0.113 * 1.05, 0.0 + 0.03 * v, -Math.cos(th) * 0.113 * 1.12];
    },
    color: () => [0.16, 0.12, 0.09],
    outward: (p) => [p[0], 0, p[2]],
  }).mesh;
  add(band, m, head, 0, 0.065, 0.01);
  const brim = gridMesh(scene, "witness-brim", {
    rings: 14,
    segs: 56,
    pos: (u, v) => {
      const th = u * TAU;
      const dx = Math.sin(th);
      const dz = -Math.cos(th);
      const r = lerp(0.108, 0.27, v);
      // Drooping in front and at the sides, curling up a little behind.
      const y = -0.045 * v * v * (0.7 + 0.5 * dz) + 0.018 * v * Math.max(0, -dz) + 0.004 * Math.sin(th * 5) * v;
      return [dx * r * 1.0, y, dz * r * 1.1];
    },
    color: (_u, v) => shade([0.6, 0.5, 0.38], 0.65 + 0.35 * (1 - v)),
    outward: () => [0, 1, 0],
  }).mesh;
  add(brim, m, head, 0, 0.065, 0.01);
  // The face: only a darkness under the brim.
  const dark = new StandardMaterial(ghost ? "m-witness-dark-g" : "m-witness-dark", scene);
  dark.diffuseColor = new Color3(0.07, 0.05, 0.035);
  dark.specularColor = Color3.Black();
  dark.emissiveColor = new Color3(0.012, 0.008, 0.004);
  const skull = gridMesh(scene, "witness-skull", {
    rings: 18,
    segs: 24,
    pos: (u, v) => {
      const th = u * TAU;
      const ph = v * Math.PI;
      return [Math.sin(ph) * Math.sin(th) * 0.075, Math.cos(ph) * 0.105, -Math.sin(ph) * Math.cos(th) * 0.09];
    },
    outward: (p) => p,
  }).mesh;
  add(skull, dark, head, 0, 0.0, 0.0);

  // ---- arms ----
  const sleeve = (name: string, path: ReturnType<typeof spline>, parent: TransformNode, r0 = 0.05, r1 = 0.036): void => {
    add(
      sweep(scene, name, {
        path,
        rx: (t) => lerp(r0, r1, t) + 0.006 * Math.sin(t * 20),
        ry: (t) => lerp(r0, r1, t) * 0.95,
        relief: (a, t) => 0.025 * Math.sin(a * 2 + t * 11) + 0.03 * (fbm(a * 1.5, t * 7, 2, 2) - 0.4),
        segs: 18,
        round: 0.03,
        up: [0, 1, 0],
        color: (a, t) => shade(COAT, 0.78 + 0.22 * fbm(a * 1.5, t * 7, 2, 2)),
      }).mesh,
      m,
      parent,
    );
  };
  // Shoulder caps, so each sleeve grows out of the coat instead of being stuck on it.
  const cap = (parent: TransformNode): void => {
    const g = gridMesh(scene, "witness-shoulder", {
      rings: 14,
      segs: 20,
      pos: (u, v) => {
        const [dx, dy, dz] = [Math.sin(v * Math.PI) * Math.sin(u * TAU), Math.cos(v * Math.PI), -Math.sin(v * Math.PI) * Math.cos(u * TAU)];
        return [dx * 0.065, dy * 0.07, dz * 0.06];
      },
      color: () => shade(COAT, 0.9),
      outward: (p) => p,
    }).mesh;
    add(g, m, parent, 0, 0, 0);
  };
  // The hanging arm, with its hand.
  const lp = new TransformNode("witness-left-shoulder", scene);
  lp.parent = body;
  lp.position.set(-0.17, 1.55, 0);
  cap(lp);
  sleeve("witness-arm", spline([[0.0, 0.03, 0], [-0.02, -0.15, 0.0], [-0.035, -0.3, 0.02], [-0.03, -0.6, 0.05]], 22), lp);
  const lh = buildHand(scene, "witness-hand-l", { skin: m, side: 1, scale: 1.0, tone: [0.78, 0.6, 0.4], curl: [[0.22, 0.3, 0.2], [0.25, 0.32, 0.22], [0.28, 0.35, 0.22], [0.3, 0.38, 0.25]] });
  add(lh, m, lp, -0.03, -0.62, 0.05);
  lh.rotation.set(Math.PI / 2 - 0.1, 0, 0);
  // The raised arm, from the shoulder, holding the photograph at the chest.
  const photoArm = new TransformNode("witness-photo-arm", scene);
  photoArm.parent = body;
  photoArm.position.set(0.17, 1.55, 0);
  cap(photoArm);
  sleeve("witness-arm", spline([[0.0, 0.03, 0], [0.03, -0.14, 0.0], [0.075, -0.3, 0.04], [0.02, -0.3, 0.17], [-0.04, -0.27, 0.235]], 26), photoArm);
  const rh = buildHand(scene, "witness-hand-r", { skin: m, side: -1, scale: 1.0, tone: [0.78, 0.6, 0.4], curl: [[0.5, 0.7, 0.5], [0.55, 0.7, 0.5], [0.55, 0.7, 0.5], [0.5, 0.65, 0.5]], thumb: [0.2, 0.2, 0.1] });
  add(rh, m, photoArm, -0.04, -0.27, 0.244);
  rh.rotation.set(-Math.PI / 2 + 0.15, 0.0, 0.0);
  rh.scaling.setAll(0.72);
  if (!ghost) {
    // A real photograph: the four of them on the step, the family as the album has it. Painted once, small.
    const photoTex = new DynamicTexture("tex-witness-photo", { width: 256, height: 192 }, scene, true);
    paintPhoto(photoTex.getContext().canvas as HTMLCanvasElement, "family", 7);
    photoTex.update();
    const paper = material(scene, "m-witness-photo-paper", { diffuse: "#d9d2bd", spec: 0.02, emissive: [0.12, 0.11, 0.09] });
    const pic = new StandardMaterial("m-witness-photo", scene);
    pic.diffuseTexture = photoTex;
    pic.emissiveColor = new Color3(0.32, 0.3, 0.27);
    pic.specularColor = new Color3(0.1, 0.1, 0.1);
    const card = MeshBuilder.CreateBox("witness-photo", { width: 0.125, height: 0.095, depth: 0.004 }, scene);
    add(card, paper, photoArm, -0.04, -0.125, 0.262);
    card.rotation.x = -0.22;
    const face = MeshBuilder.CreatePlane("witness-photo-face", { width: 0.112, height: 0.082 }, scene);
    face.rotation.y = Math.PI;
    add(face, pic, card, 0, 0, 0.0025);
    face.rotation.y = Math.PI;
  }
  root.setEnabled(false);
  return { root, head, body, meshes, height: 1.95, grain, photoArm };
}
