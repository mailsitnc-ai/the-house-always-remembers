import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

/** A figure's root plus the joints the behaviours move. All meshes are children of `root`. */
export interface Figure {
  root: TransformNode;
  head: TransformNode;
  /** Used for a gentle sway while moving. */
  body: TransformNode;
  meshes: Mesh[];
  height: number;
  /** Matron only: the shoulder pivots of each arm (for gestures) and the jaw morph (0 closed .. 1 open) for speech. */
  arms?: TransformNode[];
  setMouth?: (open: number) => void;
  /** The progressive-horror rig: `set` applies a corruption level (0 composed .. 3 true form), `tick` runs the per-frame behaviour. */
  rig?: {
    set(c: number): void;
    tick(dt: number, talk: number, gaze?: number, ready?: boolean): void;
    post?(): void;
    limit?(maxHeight: number | null): void;
    /** The timed transformation into the true form (about 18 s). `begin` plays it; `seek` freezes it at a time (development captures). */
    begin?(): void;
    seek?(t: number): void;
    readonly duration?: number;
    readonly time?: number;
    readonly playing?: boolean;
    readonly stillness?: number;
  };
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

export { buildMatron } from "./models/MatronModel";

export { buildHollow } from "./models/HollowModel";
export { buildWitness, type WitnessFigure } from "./models/WitnessModel";

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
