import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { fabric } from "../world/ProceduralTextures";
import { normalMapFrom } from "../world/NormalMaps";

/** A figure's root plus the joints the behaviours move. All meshes are children of `root`. */
export interface Figure {
  root: TransformNode;
  head: TransformNode;
  /** Used for a gentle sway while moving. */
  body: TransformNode;
  meshes: Mesh[];
  height: number;
  /** Matron only: the mouth slit and the shoulder pivots of each arm (for speech and gestures). */
  mouth?: Mesh;
  arms?: TransformNode[];
}

function mouthMat(scene: Scene): StandardMaterial {
  const m = new StandardMaterial("m-matron-mouth", scene);
  m.diffuseColor = new Color3(0.1, 0.04, 0.04);
  m.specularColor = Color3.Black();
  return m;
}

function lathe(scene: Scene, name: string, profile: [number, number][], tess = 24): Mesh {
  const shape = profile.map(([r, y]) => new Vector3(r, y, 0));
  return MeshBuilder.CreateLathe(name, { shape, tessellation: tess, sideOrientation: Mesh.DOUBLESIDE }, scene);
}

function tube(scene: Scene, name: string, path: Vector3[], r0: number, r1: number): Mesh {
  return MeshBuilder.CreateTube(
    name,
    { path, radiusFunction: (_i: number, d: number) => r0 + (r1 - r0) * (d / Math.max(1, path.length * 0.3)), tessellation: 10, cap: Mesh.CAP_ALL },
    scene,
  );
}

function ellipsoid(scene: Scene, name: string, sx: number, sy: number, sz: number): Mesh {
  const m = MeshBuilder.CreateSphere(name, { diameter: 1, segments: 14 }, scene);
  m.scaling.set(sx, sy, sz);
  return m;
}

function mat(scene: Scene, name: string, hex: string, spec = 0.05): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(spec, spec, spec);
  m.ambientColor = new Color3(1, 1, 1);
  return m;
}

/**
 * The Matron: very tall, in a long dark-green dress with a high lace collar, hands clasped at her waist, hair pinned
 * in a bun. Recognisably a woman and recognisably human in proportion, but too tall and too still. Her face is smooth
 * and pale with two deep eye sockets and no mouth. Limbs are tubes and the dress is a lathe, so the silhouette is soft.
 */
export function buildMatron(scene: Scene): Figure {
  const root = new TransformNode("matron", scene);
  const body = new TransformNode("matron-body", scene);
  body.parent = root;
  const head = new TransformNode("matron-head", scene);
  head.parent = body;
  head.position.set(0, 2.12, 0.01);

  const dressTex = fabric(scene, "tex-matron-dress", 77, "#26372a");
  const dress = new StandardMaterial("m-matron-dress", scene);
  dress.diffuseTexture = dressTex;
  dress.bumpTexture = normalMapFrom(scene, dressTex, "tex-matron-dress-n", 2.4, 256);
  dress.bumpTexture.level = 0.9;
  dress.specularColor = new Color3(0.04, 0.04, 0.04);
  dress.ambientColor = new Color3(1, 1, 1);
  dress.emissiveColor = new Color3(0.03, 0.045, 0.035);
  const skin = mat(scene, "m-matron-skin", "#cbbfae", 0.12);
  skin.emissiveColor = new Color3(0.07, 0.065, 0.06);
  const hair = mat(scene, "m-matron-hair", "#34302a", 0.1);
  const lace = mat(scene, "m-matron-lace", "#cfc6ae", 0.02);
  lace.emissiveColor = new Color3(0.06, 0.058, 0.05);
  const leather = mat(scene, "m-matron-belt", "#4a3426", 0.2);
  const socket = mat(scene, "m-matron-socket", "#0c0a09", 0);

  const meshes: Mesh[] = [];
  const add = (m: Mesh, material: StandardMaterial, parent: TransformNode, x = 0, y = 0, z = 0): Mesh => {
    m.material = material;
    m.parent = parent;
    m.position.set(x, y, z);
    m.isPickable = false;
    meshes.push(m);
    return m;
  };

  // Dress: hem, a full skirt narrowing to the waist, a fitted bodice, shoulders, and a high neck.
  const d = lathe(scene, "matron-dress", [
    [0.0, 0.0], [0.6, 0.0], [0.585, 0.09], [0.52, 0.5], [0.4, 0.95], [0.26, 1.22], [0.175, 1.36], [0.19, 1.52], [0.225, 1.68], [0.245, 1.8], [0.2, 1.9], [0.1, 1.98], [0.075, 2.06],
  ]);
  d.scaling.z = 0.74;
  add(d, dress, body);
  add(MeshBuilder.CreateTorus("matron-belt", { diameter: 0.4, thickness: 0.025, tessellation: 20 }, scene), leather, body, 0, 1.38, 0).scaling.z = 0.74;
  // Collar and cuffs.
  add(MeshBuilder.CreateTorus("matron-collar", { diameter: 0.19, thickness: 0.035, tessellation: 18 }, scene), lace, body, 0, 2.0, 0);

  // Arms: shoulder, elbow, wrists crossed at the waist.
  // Each arm hangs from a shoulder pivot so it can lift a little when she speaks.
  const arms: TransformNode[] = [];
  for (const s of [-1, 1]) {
    const pivot = new TransformNode("matron-shoulder", scene);
    pivot.parent = body;
    pivot.position.set(0.25 * s, 1.8, 0);
    arms.push(pivot);
    const sh = (x: number, y: number, z: number): Vector3 => new Vector3(x - 0.25 * s, y - 1.8, z);
    const path = [sh(0.25 * s, 1.8, 0), sh(0.33 * s, 1.52, 0.05), sh(0.22 * s, 1.3, 0.2), sh(0.06 * s, 1.24, 0.3)];
    add(tube(scene, "matron-arm", path, 0.052, 0.034), dress, pivot);
    const p1 = sh(0.075 * s, 1.245, 0.29);
    add(MeshBuilder.CreateTorus("matron-cuff", { diameter: 0.075, thickness: 0.016, tessellation: 12 }, scene), lace, pivot, p1.x, p1.y, p1.z).rotation.x = 1.2;
    const p2 = sh(0.015 * s, 1.215, 0.34);
    add(ellipsoid(scene, "matron-hand", 0.065, 0.05, 0.11), skin, pivot, p2.x, p2.y, p2.z);
  }

  // Head: long oval, smooth, pale. The eye sockets are two dark recesses; there is no mouth.
  const h = ellipsoid(scene, "matron-skull", 0.17, 0.25, 0.2);
  add(h, skin, head, 0, 0.0, 0.0);
  add(ellipsoid(scene, "matron-chin", 0.1, 0.1, 0.12), skin, head, 0, -0.1, 0.03);
  add(ellipsoid(scene, "matron-nose", 0.03, 0.06, 0.04), skin, head, 0, -0.02, 0.1);
  for (const s of [-1, 1]) add(ellipsoid(scene, "matron-socket", 0.045, 0.035, 0.03), socket, head, 0.04 * s, 0.03, 0.088);
  // A thin, dark mouth that opens a little with her voice and is otherwise a closed line.
  const mouth = add(ellipsoid(scene, "matron-mouth", 0.05, 0.006, 0.02), mouthMat(scene), head, 0, -0.078, 0.082);
  // Neck.
  add(MeshBuilder.CreateCylinder("matron-neck", { height: 0.12, diameter: 0.075, tessellation: 12 }, scene), skin, body, 0, 2.03, 0);
  // Hair: a close cap, drawn back, and a tight bun.
  add(ellipsoid(scene, "matron-hair", 0.185, 0.26, 0.215), hair, head, 0, 0.025, -0.025);
  add(ellipsoid(scene, "matron-bun", 0.1, 0.09, 0.1), hair, head, 0, 0.09, -0.13);

  root.setEnabled(false);
  return { root, head, body, meshes, height: 2.35, mouth, arms };
}

/** The Hollow: a stooped, long-armed silhouette with no face, drawn as smoke around a dark core. */
export function buildHollow(scene: Scene): Figure {
  const root = new TransformNode("hollow", scene);
  const body = new TransformNode("hollow-body", scene);
  body.parent = root;
  const head = new TransformNode("hollow-head", scene);
  head.parent = body;
  head.position.set(0, 1.78, 0.14);

  const smoke = new StandardMaterial("m-hollow", scene);
  smoke.diffuseColor = new Color3(0.01, 0.01, 0.012);
  smoke.specularColor = Color3.Black();
  smoke.emissiveColor = new Color3(0.012, 0.014, 0.02);
  smoke.alpha = 0.88;
  smoke.emissiveFresnelParameters = new FresnelParameters({ leftColor: new Color3(0.38, 0.42, 0.5), rightColor: Color3.Black(), power: 2.2, bias: 0.05 });
  smoke.backFaceCulling = false;

  const meshes: Mesh[] = [];
  const add = (m: Mesh, parent: TransformNode, x = 0, y = 0, z = 0): Mesh => {
    m.material = smoke;
    m.parent = parent;
    m.position.set(x, y, z);
    m.isPickable = false;
    meshes.push(m);
    return m;
  };
  // Torso leaning forward, thinning toward the legs, which dissolve into the floor.
  const t = lathe(scene, "hollow-torso", [[0.0, 0.0], [0.1, 0.0], [0.16, 0.5], [0.15, 0.95], [0.22, 1.35], [0.24, 1.55], [0.12, 1.68], [0.06, 1.74]], 14);
  t.scaling.z = 0.55;
  t.rotation.x = 0.28;
  add(t, body);
  add(ellipsoid(scene, "hollow-head", 0.2, 0.26, 0.2), head);
  for (const s of [-1, 1]) {
    const path = [new Vector3(0.24 * s, 1.6, 0.1), new Vector3(0.3 * s, 1.1, 0.25), new Vector3(0.28 * s, 0.6, 0.3), new Vector3(0.3 * s, 0.22, 0.28)];
    add(tube(scene, "hollow-arm", path, 0.05, 0.025), body);
    for (let i = 0; i < 3; i++) add(tube(scene, "hollow-finger", [new Vector3(0.3 * s, 0.22, 0.28), new Vector3((0.3 + (i - 1) * 0.03) * s, 0.04, 0.3 + i * 0.01)], 0.012, 0.004), body);
  }
  root.setEnabled(false);
  return { root, head, body, meshes, height: 1.95 };
}

/** A tileable film-grain mask: a stipple of opaque and clear specks, so the figure dissolves like a badly exposed print. */
function grainMask(scene: Scene): DynamicTexture {
  const t = new DynamicTexture("tex-witness-grain", { width: 128, height: 128 }, scene, true);
  t.hasAlpha = true;
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  const img = c.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      // Low-frequency blotches plus fine grain.
      const blot = 0.5 + 0.35 * Math.sin(x * 0.11 + Math.sin(y * 0.07) * 2) * Math.sin(y * 0.13 + 1);
      const grain = Math.random();
      const a = Math.min(1, Math.max(0, blot * 0.7 + grain * 0.55 - 0.1));
      const o = (y * 128 + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = a > 0.42 ? 255 * Math.min(1, a + 0.1) : 40;
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
  /** The raised arm and the small photograph it holds. */
  photoArm: TransformNode;
}

/**
 * The Witness: a long-exposure figure. It stands in a long coat and a brimmed hat with its face hidden, one arm raised to
 * hold a small photograph against its chest. Its colour is amber-sepia, like an old print, not white; it is built from a
 * stipple dissolve and lit from within. `ghost` makes the cooler, fainter double-exposure afterimage that trails behind it.
 */
export function buildWitness(scene: Scene, ghost = false): WitnessFigure {
  const root = new TransformNode(ghost ? "witness-ghost" : "witness", scene);
  const body = new TransformNode("witness-body", scene);
  body.parent = root;
  const head = new TransformNode("witness-head", scene);
  head.parent = body;
  head.position.set(0, 1.74, 0.02);
  head.rotation.x = 0.42;

  const grain = grainMask(scene);
  const m = new StandardMaterial(ghost ? "m-witness-ghost" : "m-witness", scene);
  m.diffuseColor = ghost ? new Color3(0.2, 0.3, 0.38) : new Color3(0.42, 0.3, 0.17);
  m.specularColor = Color3.Black();
  m.emissiveColor = ghost ? new Color3(0.08, 0.14, 0.2) : new Color3(0.3, 0.19, 0.08);
  m.opacityTexture = grain;
  m.backFaceCulling = false;
  m.emissiveFresnelParameters = new FresnelParameters({
    leftColor: ghost ? new Color3(0.2, 0.4, 0.55) : new Color3(0.85, 0.55, 0.22),
    rightColor: Color3.Black(),
    power: 1.7,
    bias: 0.06,
  });

  const meshes: Mesh[] = [];
  const add = (mesh: Mesh, parent: TransformNode, x = 0, y = 0, z = 0): Mesh => {
    mesh.material = m;
    mesh.parent = parent;
    mesh.position.set(x, y, z);
    mesh.isPickable = false;
    meshes.push(mesh);
    return mesh;
  };
  // Long coat to mid-calf, narrow shoulders, trousers below.
  const coat = lathe(scene, "witness-coat", [[0.0, 0.5], [0.25, 0.5], [0.24, 0.9], [0.2, 1.25], [0.19, 1.45], [0.22, 1.58], [0.2, 1.66], [0.08, 1.72]], 18);
  coat.scaling.z = 0.62;
  add(coat, body);
  for (const s of [-1, 1]) add(MeshBuilder.CreateCylinder("witness-leg", { height: 0.5, diameterTop: 0.1, diameterBottom: 0.075, tessellation: 8 }, scene), body, 0.075 * s, 0.25, 0);
  // Head bowed under a hat: crown and a wide brim, so the face is never seen.
  add(MeshBuilder.CreateCylinder("witness-crown", { height: 0.17, diameterTop: 0.2, diameterBottom: 0.24, tessellation: 14 }, scene), head, 0, 0.12, 0);
  add(MeshBuilder.CreateCylinder("witness-brim", { height: 0.014, diameter: 0.5, tessellation: 20 }, scene), head, 0, 0.04, 0);
  add(ellipsoid(scene, "witness-skull", 0.15, 0.2, 0.17), head, 0, -0.04, 0);
  // Arms: one hanging, one raised with a small photograph held to the chest.
  add(tube(scene, "witness-arm", [new Vector3(-0.21, 1.58, 0), new Vector3(-0.25, 1.2, 0.0), new Vector3(-0.24, 0.84, 0.03)], 0.046, 0.034), body);
  const photoArm = new TransformNode("witness-photo-arm", scene);
  photoArm.parent = body;
  add(tube(scene, "witness-arm", [new Vector3(0.21, 1.58, 0), new Vector3(0.3, 1.32, 0.12), new Vector3(0.12, 1.36, 0.26)], 0.046, 0.034), photoArm);
  add(MeshBuilder.CreateBox("witness-photo", { width: 0.17, height: 0.13, depth: 0.012 }, scene), photoArm, 0.1, 1.36, 0.28).rotation.x = -0.25;
  root.setEnabled(false);
  return { root, head, body, meshes, height: 1.95, grain, photoArm };
}

/** A distorted memory fragment: a pale cut-out figure drawn on a plane, sliced and offset like a damaged film frame. */
export function fragmentTexture(scene: Scene, variant: number, seed: number): DynamicTexture {
  const w = 128;
  const h = 256;
  const t = new DynamicTexture(`tex-fragment-${variant}-${seed}`, { width: w, height: h }, scene, true);
  t.hasAlpha = true;
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  c.clearRect(0, 0, w, h);
  const draw = (dx: number) => {
    c.fillStyle = "rgba(205,212,226,0.9)";
    if (variant === 0) {
      // A small figure seen from behind: round head, narrow shoulders, a dress that widens to the hem.
      c.beginPath();
      c.arc(w / 2 + dx, 64, 20, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(w / 2 - 22 + dx, 92);
      c.lineTo(w / 2 + 22 + dx, 92);
      c.lineTo(w / 2 + 44 + dx, 214);
      c.lineTo(w / 2 - 44 + dx, 214);
      c.closePath();
      c.fill();
      c.fillRect(w / 2 - 14 + dx, 214, 9, 36);
      c.fillRect(w / 2 + 5 + dx, 214, 9, 36);
    } else if (variant === 1) {
      // Only the lower half: a hem and two legs, as if the rest was never remembered.
      c.beginPath();
      c.moveTo(w / 2 - 30 + dx, 120);
      c.lineTo(w / 2 + 30 + dx, 120);
      c.lineTo(w / 2 + 40 + dx, 190);
      c.lineTo(w / 2 - 40 + dx, 190);
      c.closePath();
      c.fill();
      c.fillRect(w / 2 - 14 + dx, 190, 9, 60);
      c.fillRect(w / 2 + 5 + dx, 190, 9, 60);
    } else {
      // A figure with arms raised, stretched too tall.
      c.beginPath();
      c.arc(w / 2 + dx, 40, 16, 0, Math.PI * 2);
      c.fill();
      c.fillRect(w / 2 - 12 + dx, 56, 24, 130);
      c.fillRect(w / 2 - 36 + dx, 40, 8, 70);
      c.fillRect(w / 2 + 28 + dx, 40, 8, 70);
      c.fillRect(w / 2 - 12 + dx, 186, 9, 66);
      c.fillRect(w / 2 + 3 + dx, 186, 9, 66);
    }
  };
  draw(0);
  // Slice into strips and shift them sideways, then erase some, like a torn frame.
  const strips = 14;
  const sh = h / strips;
  const img = c.getImageData(0, 0, w, h);
  c.clearRect(0, 0, w, h);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < strips; i++) {
    const off = Math.round((rnd() - 0.5) * 18);
    c.putImageData(img, off, 0, 0, i * sh, w, sh);
  }
  for (let i = 0; i < 30; i++) c.clearRect(rnd() * w, rnd() * h, 12 + rnd() * 30, 1 + rnd() * 3);
  t.update();
  t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE;
  return t;
}

export interface ReflectionFigure extends Figure {
  jaw: Mesh;
  eyes: Mesh[];
  armPivots: TransformNode[];
  /** Everything that moves apart from the body, for the "wrong" proportions. */
  neck: Mesh;
}

/**
 * Daniel's reflection. It is Daniel: his maroon top, his dark messy hair, his build. What is wrong is how it is made: it
 * is a little too tall, the neck and arms are too long, the face is slack and grey, the eyes are small and lit from
 * within, and the mouth opens too far. It is not smoke, grain, strips or a dress; it only ever appears in glass.
 */
export function buildReflection(scene: Scene): ReflectionFigure {
  const root = new TransformNode("reflection", scene);
  const body = new TransformNode("reflection-body", scene);
  body.parent = root;
  const head = new TransformNode("reflection-head", scene);
  head.parent = body;
  head.position.set(0, 1.64, 0);

  const cold = (hex: string, e = 0): StandardMaterial => {
    const m = mat(scene, `m-refl-${hex}`, hex, 0.04);
    m.emissiveColor = new Color3(e, e * 1.05, e * 1.1);
    return m;
  };
  const skin = cold("#a9b0b2", 0.2);
  const top = cold("#6a3c3e", 0.12);
  const trousers = cold("#2c313f", 0.08);
  const hair = cold("#1f1a17");
  const eye = new StandardMaterial("m-refl-eye", scene);
  eye.emissiveColor = new Color3(0.85, 0.92, 0.95);
  eye.diffuseColor = Color3.Black();
  const mouthM = mat(scene, "m-refl-mouth", "#0a0808", 0);

  const meshes: Mesh[] = [];
  const add = (m: Mesh, material: StandardMaterial, parent: TransformNode, x = 0, y = 0, z = 0): Mesh => {
    m.material = material;
    m.parent = parent;
    m.position.set(x, y, z);
    m.isPickable = false;
    meshes.push(m);
    return m;
  };
  add(lathe(scene, "refl-torso", [[0.0, 0.85], [0.2, 0.9], [0.22, 1.2], [0.2, 1.45], [0.23, 1.55], [0.12, 1.62], [0.06, 1.68]], 16), top, body).scaling.z = 0.6;
  for (const s of [-1, 1]) {
    add(MeshBuilder.CreateCylinder("refl-leg", { height: 0.9, diameterTop: 0.15, diameterBottom: 0.1, tessellation: 10 }, scene), trousers, body, 0.09 * s, 0.45, 0);
  }
  const neck = add(MeshBuilder.CreateCylinder("refl-neck", { height: 0.3, diameter: 0.09, tessellation: 10 }, scene), skin, body, 0, 1.7, 0);
  add(ellipsoid(scene, "refl-skull", 0.17, 0.24, 0.2), skin, head, 0, 0.08, 0);
  add(ellipsoid(scene, "refl-hair", 0.19, 0.2, 0.22), hair, head, 0, 0.17, -0.02);
  add(ellipsoid(scene, "refl-hair-fringe", 0.18, 0.08, 0.1), hair, head, 0, 0.2, 0.08);
  const eyes = [-1, 1].map((s) => add(ellipsoid(scene, "refl-eye", 0.028, 0.02, 0.012), eye, head, 0.045 * s, 0.1, 0.095));
  const jaw = add(ellipsoid(scene, "refl-mouth", 0.07, 0.012, 0.02), mouthM, head, 0, -0.04, 0.095);

  // Arms hang from shoulder pivots and are too long: they reach the knees.
  const armPivots: TransformNode[] = [];
  for (const s of [-1, 1]) {
    const pivot = new TransformNode("refl-shoulder", scene);
    pivot.parent = body;
    pivot.position.set(0.25 * s, 1.52, 0);
    armPivots.push(pivot);
    add(tube(scene, "refl-arm", [new Vector3(0, 0, 0), new Vector3(0.03 * s, -0.5, 0.02), new Vector3(0.02 * s, -0.95, 0.06)], 0.05, 0.035), top, pivot);
    add(ellipsoid(scene, "refl-hand", 0.07, 0.15, 0.04), skin, pivot, 0.02 * s, -1.02, 0.07);
  }
  root.setEnabled(false);
  return { root, head, body, meshes, height: 1.85, jaw, eyes, armPivots, neck };
}
