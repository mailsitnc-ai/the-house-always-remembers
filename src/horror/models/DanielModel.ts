import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Figure } from "../CharacterBuilder";
import { buildHead, dirOf } from "./Head";
import { buildHand, fbm, gridMesh, lerp, material, mix, shade, smooth, spline, sweep, type RGB } from "./Sculpt";

export interface ReflectionFigure extends Figure {
  /** The neck (for the wrong proportions), the eyeballs (scaled to blink), and the arm joints the behaviours move. */
  neck: Mesh;
  eyes: Mesh[];
  armPivots: TransformNode[];
  elbows: TransformNode[];
  setMouth(open: number): void;
  setSmile(v: number): void;
}

const TAU = Math.PI * 2;

/** What differs between the people built from this one body: Daniel's reflection, the corpse in the Denial ending, and Emily's possessed body. */
export interface PersonSpec {
  id: string;
  scale: number;
  skin: RGB;
  top: RGB;
  legs: RGB;
  hair: RGB;
  head: { rx: number; ry: number; rz: number; age: number };
  /** Cold, wet-looking emissive cast (the reflection) or none. */
  cold: number;
  /** A long nightgown instead of jeans and shoes (Emily). */
  gown?: boolean;
  /** Hair long enough to fall past the shoulders (Emily). */
  longHair?: boolean;
  /** The Matron's cameo at the collar and her keys at the waist (Emily's body when the Matron wears it). */
  matronTokens?: boolean;
}

export const DANIEL: PersonSpec = { id: "refl", scale: 1, skin: [0.68, 0.6, 0.56], top: [0.4, 0.2, 0.22], legs: [0.15, 0.17, 0.24], hair: [0.11, 0.085, 0.07], head: { rx: 0.082, ry: 0.108, rz: 0.098, age: 0.22 }, cold: 1 };
export const EMILY: PersonSpec = { id: "emily", scale: 0.7, skin: [0.86, 0.78, 0.72], top: [0.88, 0.86, 0.82], legs: [0.88, 0.86, 0.82], hair: [0.2, 0.13, 0.09], head: { rx: 0.082, ry: 0.108, rz: 0.098, age: 0.02 }, cold: 0.2, gown: true, longHair: true, matronTokens: true };

/**
 * Daniel's reflection: Daniel as he is now, a man of about twenty-four in his own clothes. A sculpted face (brow, nose, lips, ears, the lines
 * of someone who has not slept well in eleven years), dark untidy hair, a neck, sloped shoulders, a maroon knitted top, dark jeans, hands and
 * shoes, all in human proportions about 1.78 m tall. It looks like him. What is wrong with it is how it behaves (see Finale.updateMirror),
 * and a cold, grey cast to the skin that Daniel himself does not have. It only ever appears in glass.
 */
export function buildReflection(scene: Scene): ReflectionFigure {
  return buildPerson(scene, DANIEL);
}

export function buildPerson(scene: Scene, o: PersonSpec): ReflectionFigure {
  const root = new TransformNode(`${o.id}-root`, scene);
  const body = new TransformNode(`${o.id}-body`, scene);
  body.parent = root;
  const meshes: Mesh[] = [];
  const own = <T extends Mesh>(m: T, mat: Mesh["material"], parent: TransformNode, x = 0, y = 0, z = 0): T => {
    m.material = mat;
    m.parent = parent;
    m.position.set(x, y, z);
    m.isPickable = false;
    meshes.push(m);
    return m;
  };
  const SKIN: RGB = o.skin;
  const skinM = material(scene, `m-refl-skin-${o.id}`, { diffuse: [1, 1, 1], spec: 0.05, power: 10, emissive: [0.05 * o.cold, 0.055 * o.cold, 0.06 * o.cold] });
  const topM = material(scene, `m-refl-top-${o.id}`, { diffuse: [1, 1, 1], spec: 0.03, power: 6, emissive: [0.06, 0.04, 0.045] });
  const jeansM = material(scene, `m-refl-jeans-${o.id}`, { diffuse: [1, 1, 1], spec: 0.03, power: 6, emissive: [0.03, 0.035, 0.05] });
  const hairM = material(scene, `m-refl-hair-${o.id}`, { diffuse: [1, 1, 1], spec: 0.08, power: 20, emissive: [0.02, 0.02, 0.022] });
  const eyeM = material(scene, `m-refl-eye-${o.id}`, { diffuse: [1, 1, 1], spec: 0.5, power: 60, emissive: [0.1, 0.11, 0.12] });
  const shoeM = material(scene, `m-refl-shoe-${o.id}`, { diffuse: "#17161a", spec: 0.15, power: 20 });

  // ---- torso: hips to the base of the neck, a maroon knit with a rolled collar ----
  const MAROON: RGB = o.top;
  const torso = sweep(scene, "refl-torso", {
    path: spline([[0, 0.9, 0], [0, 1.04, 0.004], [0, 1.2, 0.0], [0, 1.38, -0.006], [0, 1.5, -0.01], [0, 1.57, -0.005]], 14),
    rx: (t) => lerp(0.15, 0.18, smooth(0, 0.5, t)) + 0.035 * smooth(0.5, 0.8, t) - 0.145 * smooth(0.86, 1, t),
    ry: (t) => lerp(0.1, 0.118, smooth(0, 0.5, t)) - 0.045 * smooth(0.85, 1, t),
    segs: 20,
    round: 0.03,
    color: (a, t, p) => {
      const rib = 0.94 + 0.06 * Math.sin(p[1] * 220);
      const knit = 0.9 + 0.2 * fbm(a * 3, t * 14, 2, 3);
      return shade(MAROON, rib * knit * (0.8 + 0.2 * Math.cos(a)));
    },
  }).mesh;
  own(torso, topM, body);

  // ---- legs: dark jeans, shoes ----
  for (const s of o.gown ? [] : [-1, 1]) {
    const leg = sweep(scene, "refl-leg", {
      path: spline([[0.09 * s, 0.92, 0], [0.095 * s, 0.68, 0.01], [0.092 * s, 0.48, 0.012], [0.088 * s, 0.26, 0.0], [0.086 * s, 0.07, 0.0]], 12),
      rx: (t) => lerp(0.086, 0.052, smooth(0, 0.5, t)) - 0.01 * smooth(0.5, 1, t),
      ry: (t) => lerp(0.088, 0.058, smooth(0, 0.5, t)) - 0.01 * smooth(0.5, 1, t),
      segs: 14,
      round: 0.02,
      color: (a, t) => shade(o.legs, (0.9 + 0.2 * fbm(a * 2, t * 10, 1, 3)) * (0.85 + 0.15 * Math.cos(a))),
    }).mesh;
    own(leg, jeansM, body);
    const shoe = MeshBuilder.CreateSphere("refl-shoe", { diameter: 1, segments: 12 }, scene);
    shoe.scaling.set(0.058, 0.042, 0.135);
    own(shoe, shoeM, body, 0.088 * s, 0.04, 0.05);
  }

  if (o.gown) {
    // A long nightgown from the hips to the ankles, and bare feet.
    const gown = sweep(scene, `${o.id}-gown`, {
      path: spline([[0, 0.95, 0], [0, 0.7, 0.01], [0, 0.4, 0.015], [0, 0.1, 0.0]], 12),
      rx: (t) => lerp(0.16, 0.25, smooth(0, 1, t)),
      ry: (t) => lerp(0.12, 0.2, smooth(0, 1, t)),
      segs: 24,
      round: 0.01,
      color: (a, t) => shade(MAROON, (0.93 + 0.1 * fbm(a * 3, t * 7, 2, 3)) * (0.96 + 0.04 * Math.cos(a * 3 + t * 4))),
    }).mesh;
    own(gown, topM, body);
    for (const s of [-1, 1]) {
      const foot = MeshBuilder.CreateSphere("emily-foot", { diameter: 1, segments: 10 }, scene);
      foot.scaling.set(0.05, 0.035, 0.115);
      own(foot, skinM, body, 0.07 * s, 0.025, 0.07);
    }
  }

  // ---- neck and head ----
  const neckPivot = new TransformNode("refl-neck-pivot", scene);
  neckPivot.parent = body;
  neckPivot.position.set(0, 1.55, 0);
  const neck = sweep(scene, "refl-neck", {
    path: spline([[0, -0.03, -0.004], [0, 0.01, 0.0], [0, 0.05, 0.006]], 6),
    rx: (t) => lerp(0.054, 0.044, t),
    ry: (t) => lerp(0.05, 0.042, t),
    segs: 14,
    round: 0.01,
    // Darker where it leaves the collar and under the jaw, so it reads as a neck and not a pale block.
    color: (a, t) => shade(SKIN, 0.55 + 0.3 * t - 0.18 * Math.max(0, -Math.sin(a))),
  }).mesh;
  // The neck has its own, darker and less luminous skin: lit like the face it read as a pale column.
  const neckM = material(scene, `m-refl-neck-${o.id}`, { diffuse: [0.5, 0.5, 0.5], spec: 0.02, power: 8, emissive: [0.008 * o.cold, 0.009 * o.cold, 0.011 * o.cold] });
  own(neck, neckM, neckPivot);
  const collar = MeshBuilder.CreateTorus("refl-collar", { diameter: 0.125, thickness: 0.045, tessellation: 24 }, scene);
  collar.scaling.set(1, 1, 0.82);
  own(collar, topM, neckPivot, 0, -0.025, -0.004);
  const headNode = new TransformNode("refl-head", scene);
  headNode.parent = neckPivot;
  headNode.position.set(0, 0.055, 0);
  const head = buildHead(scene, `${o.id}-face`, { rx: o.head.rx, ry: o.head.ry, rz: o.head.rz, feature: 1, skin: SKIN, age: o.head.age, asym: 0.18 });
  const faceM = material(scene, `m-refl-face-${o.id}`, { diffuse: [1, 1, 1], spec: 0.05, power: 10, emissive: [0.05 * o.cold + 0.02, 0.055 * o.cold + 0.02, 0.06 * o.cold + 0.02] });
  faceM.diffuseTexture = head.texture;
  own(head.mesh, faceM, headNode, 0, 0.082, 0);
  for (const part of head.inside) {
    part.parent = headNode;
    part.position.y += 0.082;
    part.isPickable = false;
    part.setEnabled(false);
    meshes.push(part);
  }
  // Eyes: a pale eyeball with a dark iris, set in the sockets the face is carved with.
  const eyes: Mesh[] = [];
  for (const s of [-1, 1]) {
    const ball = gridMesh(scene, "refl-eye", {
      rings: 18,
      segs: 24,
      pos: (u, v) => {
        const [dx, dy, dz] = dirOf(u, v);
        return [dx * 0.0118, dy * 0.0118, dz * 0.0118];
      },
      color: (_u, _v, p) => {
        const n = Math.hypot(p[0], p[1], p[2]) || 1;
        const f = p[2] / n;
        const r = Math.hypot(p[0], p[1]) / n;
        if (f > 0.9 && r < 0.2) return [0.02, 0.02, 0.025];
        if (f > 0.7 && r < 0.62) return mix([0.18, 0.15, 0.13], [0.3, 0.24, 0.18], (r - 0.2) / 0.4);
        return [0.78, 0.78, 0.76];
      },
      outward: (p) => p,
    }).mesh;
    own(ball, eyeM, headNode, 0.0345 * s, 0.1, 0.07);
    eyes.push(ball);
  }
  // Hair: dark, a little too long, uncombed, fitted over the skull and pushed up into a fringe.
  const hair = gridMesh(scene, "refl-hair", {
    rings: 16,
    segs: 40,
    pos: (u, v) => {
      const front = Math.exp(-(((u - 0.5) / 0.2) ** 2));
      const phMax = lerp(1.8, 1.04, front);
      const ph = v * phMax;
      const th = u * TAU;
      const dx = Math.sin(ph) * Math.sin(th);
      const dy = Math.cos(ph);
      const dz = -Math.sin(ph) * Math.cos(th);
      const [x, y, z] = head.shape(dx, dy, dz);
      const k = 1.075 + 0.07 * fbm(u * 14, v * 7, 7, 3) + 0.05 * front * smooth(0.4, 1, v) + 0.06 * smooth(0.15, 0.6, v) * (1 - front * 0.5);
      return [x * k, y * k + 0.082 + 0.012 * v, z * k];
    },
    color: (u, v) => shade(o.hair, 0.7 + 0.5 * fbm(u * 60, v * 24, 3, 3)),
    outward: (p) => [p[0], p[1] - 0.082, p[2]],
  }).mesh;
  own(hair, hairM, headNode);
  if (o.longHair) {
    // Long hair: locks fall from the crown past the shoulders, mostly behind her.
    for (let i = 0; i < 11; i++) {
      const a = (i / 10 - 0.5) * 2;
      const x = a * 0.085;
      const lock = sweep(scene, `${o.id}-lock`, {
        path: spline([[x * 0.9, 0.17, -0.02], [x * 1.1, 0.1, -0.1], [x * 1.25, -0.08, -0.115 - 0.01 * Math.abs(a)], [x * 1.2, -0.3, -0.1], [x * 1.1, -0.5 + 0.04 * Math.sin(i), -0.085]], 12),
        rx: () => 0.017,
        ry: () => 0.011,
        segs: 6,
        round: 0.04,
        up: [0, 0, 1],
        color: (_a, t) => shade(o.hair, 0.7 + 0.45 * fbm(i * 3.7, t * 7, 1, 3)),
      }).mesh;
      own(lock, hairM, headNode);
    }
  }

  // ---- arms: shoulder, upper arm, elbow, forearm in the sleeve, a bare hand ----
  const armPivots: TransformNode[] = [];
  const elbows: TransformNode[] = [];
  for (const s of [-1, 1]) {
    const shoulder = new TransformNode("refl-shoulder", scene);
    shoulder.parent = body;
    shoulder.position.set(0.225 * s, 1.46, 0);
    armPivots.push(shoulder);
    own(
      sweep(scene, "refl-upper-arm", {
        path: spline([[0, 0.0, 0], [0.01 * s, -0.15, 0.004], [0.012 * s, -0.3, 0.008]], 8),
        rx: (t) => lerp(0.056, 0.044, t),
        ry: (t) => lerp(0.055, 0.045, t),
        segs: 14,
        round: 0.18,
        color: (a, t) => shade(MAROON, (0.9 + 0.2 * fbm(a * 3, t * 8, 4, 3)) * (0.85 + 0.15 * Math.cos(a))),
      }).mesh,
      topM,
      shoulder,
    );
    const elbow = new TransformNode("refl-elbow", scene);
    elbow.parent = shoulder;
    elbow.position.set(0.012 * s, -0.3, 0.008);
    elbow.rotation.x = -0.12;
    elbows.push(elbow);
    own(
      sweep(scene, "refl-forearm", {
        path: spline([[0, 0, 0], [0.004 * s, -0.14, 0.008], [0.006 * s, -0.27, 0.014]], 8),
        rx: (t) => lerp(0.044, 0.033, t),
        ry: (t) => lerp(0.044, 0.032, t),
        segs: 14,
        round: 0.05,
        color: (a, t) => (t > 0.93 ? shade(mix(MAROON, [0.3, 0.15, 0.17], 0.5), 0.9) : shade(MAROON, (0.9 + 0.2 * fbm(a * 3, t * 8, 9, 3)) * (0.85 + 0.15 * Math.cos(a)))),
      }).mesh,
      topM,
      elbow,
    );
    const hand = buildHand(scene, "refl-hand", { skin: skinM, side: s === 1 ? 1 : -1, scale: 1.02, tone: SKIN, splay: 0.05, curl: [[0.1, 0.18, 0.12], [0.12, 0.2, 0.12], [0.14, 0.22, 0.14], [0.16, 0.24, 0.14]] });
    hand.parent = elbow;
    hand.position.set(0.006 * s, -0.27, 0.014);
    hand.rotation.set(Math.PI / 2, 0, 0);
    hand.isPickable = false;
    meshes.push(hand);
  }
  if (o.matronTokens) {
    // The Matron's own things, on a child's nightgown: her ivory cameo at the throat and her ring of keys at the waist.
    const ivory = material(scene, `m-${o.id}-cameo`, { diffuse: "#e8dcc2", spec: 0.2, power: 30, emissive: [0.12, 0.1, 0.08] });
    const brass = material(scene, `m-${o.id}-keys`, { diffuse: "#b08a3a", spec: 0.4, power: 40, emissive: [0.08, 0.06, 0.02] });
    const cameo = MeshBuilder.CreateSphere("cameo", { diameter: 1, segments: 12 }, scene);
    cameo.scaling.set(0.032, 0.042, 0.012);
    own(cameo, ivory, body, 0, 1.47, 0.1);
    const ring = MeshBuilder.CreateTorus("key-ring", { diameter: 0.07, thickness: 0.008, tessellation: 18 }, scene);
    own(ring, brass, body, 0.14, 0.98, 0.08);
    for (const k of [0, 1, 2]) {
      const key = MeshBuilder.CreateCylinder("key", { height: 0.09, diameter: 0.012, tessellation: 6 }, scene);
      key.rotation.z = 0.2 * (k - 1);
      own(key, brass, body, 0.14 + 0.012 * (k - 1), 0.9, 0.08);
    }
  }
  root.scaling.setAll(o.scale);
  root.setEnabled(false);
  return {
    root,
    head: headNode,
    body,
    meshes,
    height: 1.78 * o.scale,
    neck,
    eyes,
    armPivots,
    elbows,
    setMouth: (v: number) => {
      head.setMouth(v);
      // The cavity and teeth behind the lips are visible only when the mouth is open; closed, they showed through as a dark patch.
      for (const part of head.inside) part.setEnabled(v > 0.22);
    },
    setSmile: head.setSmile,
  };
}
