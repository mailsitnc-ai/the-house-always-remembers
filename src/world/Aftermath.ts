import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { buildPerson, DANIEL, EMILY, type ReflectionFigure } from "../horror/models/DanielModel";
import { fbm, material, shade, spline, sweep } from "../horror/models/Sculpt";
import { STAGE_ORIGIN } from "./Stage";

const O = STAGE_ORIGIN;
/** Where Daniel lies, in the chamber (the Matron's reconstruction of Emily's room). */
export const CORPSE_AT = { x: -0.95, z: -1.05 };
/** The bed and the mattress top. */
const BED = { x: 0.1, y: 0.58, footZ: 0.3 };

/**
 * The Denial ending's aftermath, built only when it is first needed: Daniel's body on the floor of the reconstructed room, the Matron's ritual
 * (dark threads from his chest to Emily's), and Emily's body, which sits up and stands. She is not Emily: she keeps the Matron's head, her smile, her stillness and her cameo and keys.
 */
export class Aftermath {
  private built = false;
  corpse!: ReflectionFigure;
  emily!: ReflectionFigure;
  /** Rotates Emily from lying on the bed (x = pi / 2) to standing (x = 0), pivoting at her feet. */
  pivot!: TransformNode;
  private readonly gore: Mesh[] = [];
  private threads: Mesh[] = [];
  private voids: Mesh[] = [];
  private light!: PointLight;
  private fill!: PointLight;
  private readonly meshes: Mesh[] = [];

  constructor(private readonly scene: Scene) {}

  private build(): void {
    if (this.built) return;
    this.built = true;
    const scene = this.scene;
    // ---- Daniel ----
    this.corpse = buildPerson(scene, { ...DANIEL, id: "corpse", cold: 2.2, skin: [0.72, 0.6, 0.54], top: [0.5, 0.26, 0.28], legs: [0.24, 0.27, 0.38] });
    const c = this.corpse;
    c.root.position.set(O.x + CORPSE_AT.x, 0.12, O.z + CORPSE_AT.z);
    // On his back, head toward the door, one arm thrown out and the other across the wound.
    c.root.rotation.set(-Math.PI / 2, Math.PI + 0.3, 0);
    c.armPivots[0].rotation.set(-0.1, 0, 1.25);
    c.armPivots[1].rotation.set(-1.0, 0, -0.25);
    c.elbows[1].rotation.x = -1.5;
    c.head.rotation.set(-0.25, 0, 0.35);
    c.setMouth(0.35);
    c.setSmile(-0.6);
    c.neck.scaling.y = 1;
    this.addGore();
    // ---- Emily ----
    this.pivot = new TransformNode("emily-pivot", scene);
    this.pivot.position.set(O.x + BED.x, BED.y, O.z + BED.footZ);
    this.pivot.rotation.x = Math.PI / 2;
    this.emily = buildPerson(scene, EMILY);
    this.emily.root.parent = this.pivot;
    this.emily.root.rotation.y = Math.PI;
    this.emily.armPivots.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * 0.1));
    // Black voids for eyes, hidden until the Matron is in the body.
    const black = material(scene, "m-aftermath-void", { diffuse: "#000000", spec: 0, emissive: [0, 0, 0] });
    for (const s of [-1, 1]) {
      const v = MeshBuilder.CreateSphere("void-eye", { diameter: 0.03, segments: 10 }, scene);
      v.material = black;
      v.parent = this.emily.head;
      v.position.set(0.0345 * s, 0.1, 0.075);
      v.scaling.set(1.2, 1.5, 0.7);
      v.isPickable = false;
      this.voids.push(v);
      this.meshes.push(v);
    }
    // ---- the ritual: dark threads from his chest to hers ----
    const thread = material(scene, "m-aftermath-thread", { diffuse: "#1a0606", spec: 0.3, power: 30, emissive: [0.22, 0.02, 0.02] });
    const from = { x: O.x + CORPSE_AT.x - 0.05, y: 0.3, z: O.z + CORPSE_AT.z + 1.15 };
    const to = { x: O.x + BED.x, y: BED.y + 0.2, z: O.z + BED.footZ + 0.75 };
    for (let i = 0; i < 9; i++) {
      const k = (i - 4) / 4;
      const mid = { x: (from.x + to.x) / 2 + k * 0.25, y: 1.2 + 0.3 * Math.sin(i * 1.7), z: (from.z + to.z) / 2 + 0.15 * Math.cos(i) };
      const path = spline([[from.x + k * 0.05, from.y, from.z], [from.x + (mid.x - from.x) * 0.4, from.y + 0.7, from.z + (mid.z - from.z) * 0.3], [mid.x, mid.y, mid.z], [to.x + (mid.x - to.x) * 0.4, to.y + 0.6, to.z], [to.x + k * 0.05, to.y, to.z]], 18);
      const m = sweep(scene, "ritual-thread", { path, rx: () => 0.012 - 0.004 * Math.abs(k), ry: () => 0.012 - 0.004 * Math.abs(k), segs: 6, round: 0.02, up: [0, 1, 0], color: (_a, t) => shade([0.25, 0.03, 0.03], 0.7 + 0.5 * fbm(i, t * 6, 0, 2)) }).mesh;
      m.material = thread;
      m.visibility = 0;
      m.isPickable = false;
      this.threads.push(m);
      this.meshes.push(m);
    }
    // One warm light that lights only these figures and the blood.
    this.light = new PointLight("aftermath-light", new Vector3(O.x - 0.4, 1.5, O.z - 0.1), scene);
    this.light.diffuse = new Color3(1, 0.72, 0.5);
    this.light.range = 6;
    this.light.intensity = 0;
    // A second, lower light from the door side lights Daniel's body on the floor: his silhouette, his sweater and his hands.
    this.fill = new PointLight("aftermath-fill", new Vector3(O.x - 0.2, 0.9, O.z - 1.7), scene);
    this.fill.diffuse = new Color3(0.95, 0.78, 0.62);
    this.fill.range = 4;
    this.fill.intensity = 0;
    const all = [...this.corpse.meshes, ...this.gore, ...this.emily.meshes, ...this.meshes];
    this.light.includedOnlyMeshes = all;
    this.fill.includedOnlyMeshes = [...this.corpse.meshes, ...this.gore];
    for (const m of all) m.alwaysSelectAsActiveMesh = true;
    this.setShown(false);
  }

  /** Blood and wounds: a pool, spatter, a great wound in the chest, slashes across the torso, a torn forearm. */
  private addGore(): void {
    const scene = this.scene;
    const c = this.corpse;
    const wet = material(scene, "m-gore-wet", { diffuse: "#4a0707", spec: 0.7, power: 60, emissive: [0.12, 0.01, 0.01] });
    const dark = material(scene, "m-gore-dark", { diffuse: "#1b0303", spec: 0.5, power: 50, emissive: [0.04, 0, 0] });
    const flesh = material(scene, "m-gore-flesh", { diffuse: "#7a2a2a", spec: 0.4, power: 30, emissive: [0.1, 0.02, 0.02] });
    const add = (m: Mesh, mat: Mesh["material"], parent: TransformNode | null, x: number, y: number, z: number): Mesh => {
      m.material = mat;
      if (parent) m.parent = parent;
      m.position.set(x, y, z);
      m.isPickable = false;
      this.gore.push(m);
      return m;
    };
    // The pool, wider than he is, and spatter thrown across the floor and up the wall.
    const pool = MeshBuilder.CreateDisc("blood-pool", { radius: 0.85, tessellation: 28 }, scene);
    pool.rotation.x = Math.PI / 2;
    pool.scaling.set(1, 1.25, 1);
    add(pool, wet, null, O.x + CORPSE_AT.x - 0.05, 0.007, O.z + CORPSE_AT.z + 0.8);
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399;
      const r = 0.7 + 0.9 * Math.abs(Math.sin(i * 1.3));
      const d = MeshBuilder.CreateDisc("spatter", { radius: 0.02 + 0.05 * Math.abs(Math.sin(i * 2.1)), tessellation: 10 }, scene);
      d.rotation.x = Math.PI / 2;
      add(d, i % 3 ? wet : dark, null, O.x + CORPSE_AT.x + Math.cos(a) * r, 0.008, O.z + CORPSE_AT.z + 0.8 + Math.sin(a) * r * 0.9);
    }
    // Smears where he dragged himself, toward the door.
    for (let i = 0; i < 5; i++) {
      const s = MeshBuilder.CreateDisc("smear", { radius: 0.12, tessellation: 12 }, scene);
      s.rotation.x = Math.PI / 2;
      s.scaling.set(0.7, 2.2, 1);
      add(s, dark, null, O.x + CORPSE_AT.x + 0.15 * i - 0.1, 0.009, O.z + CORPSE_AT.z - 0.1 - 0.18 * i);
    }
    // On him: the sweater is soaked dark across the chest and belly; a great open wound; slashes; the forearm opened to the bone.
    const body = c.body;
    const soak = MeshBuilder.CreateSphere("soak", { diameter: 1, segments: 14 }, scene);
    soak.scaling.set(0.34, 0.5, 0.05);
    add(soak, wet, body, 0, 1.2, 0.108);
    const ring = MeshBuilder.CreateSphere("wound-ring", { diameter: 1, segments: 14 }, scene);
    ring.scaling.set(0.15, 0.19, 0.03);
    add(ring, flesh, body, 0.04, 1.28, 0.112);
    const cavity = MeshBuilder.CreateSphere("wound", { diameter: 1, segments: 14 }, scene);
    cavity.scaling.set(0.095, 0.13, 0.04);
    add(cavity, dark, body, 0.04, 1.28, 0.118);
    for (let i = 0; i < 4; i++) {
      const slash = MeshBuilder.CreateBox("slash", { width: 0.012, height: 0.34, depth: 0.012 }, scene);
      slash.rotation.z = 0.5;
      add(slash, dark, body, -0.1 + i * 0.05, 1.12, 0.119);
      const lip = MeshBuilder.CreateBox("slash-lip", { width: 0.024, height: 0.34, depth: 0.006 }, scene);
      lip.rotation.z = 0.5;
      add(lip, flesh, body, -0.1 + i * 0.05, 1.12, 0.116);
    }
    const tear = MeshBuilder.CreateSphere("belly-tear", { diameter: 1, segments: 12 }, scene);
    tear.scaling.set(0.12, 0.06, 0.03);
    add(tear, dark, body, -0.03, 0.98, 0.115);
    const forearm = c.elbows[1];
    const gash = MeshBuilder.CreateSphere("forearm-gash", { diameter: 1, segments: 10 }, scene);
    gash.scaling.set(0.045, 0.16, 0.03);
    add(gash, dark, forearm, 0.0, -0.14, 0.03);
    const bone = MeshBuilder.CreateBox("bone", { width: 0.012, height: 0.12, depth: 0.012 }, scene);
    bone.material = material(scene, "m-gore-bone", { diffuse: "#d8cfb4", spec: 0.2, emissive: [0.12, 0.11, 0.09] });
    bone.parent = forearm;
    bone.position.set(0.0, -0.14, 0.04);
    bone.isPickable = false;
    this.gore.push(bone);
    // Blood from the mouth and down the chin; a handprint on the floor.
    const mouth = MeshBuilder.CreateSphere("mouth-blood", { diameter: 1, segments: 10 }, scene);
    mouth.scaling.set(0.045, 0.07, 0.018);
    add(mouth, wet, c.head, 0.0, 0.0, 0.098);
    // Hands: dark to the wrist.
    const glove = MeshBuilder.CreateSphere("hand-blood", { diameter: 1, segments: 10 }, scene);
    glove.scaling.set(0.06, 0.12, 0.05);
    add(glove, dark, c.elbows[0], 0.006, -0.3, 0.014);
  }

  private setShown(on: boolean): void {
    this.corpse.root.setEnabled(on);
    this.emily.root.setEnabled(on);
    this.pivot.setEnabled(on);
    for (const g of this.gore) g.setEnabled(on);
    for (const v of this.voids) v.setEnabled(false);
    for (const t of this.threads) t.setEnabled(on);
  }

  /** Shows the aftermath. Emily lies on the bed; Daniel lies on the floor. */
  show(intensity = 1.4): void {
    this.build();
    this.setShown(true);
    this.light.intensity = intensity;
    this.fill.intensity = intensity * 0.9;
    this.setThreads(0);
    this.pivot.rotation.x = Math.PI / 2;
    this.pivot.position.set(O.x + BED.x, BED.y, O.z + BED.footZ);
    this.emily.head.rotation.set(0, 0, 0);
    this.emily.eyes.forEach((e) => e.setEnabled(true));
    this.voids.forEach((v) => v.setEnabled(false));
    this.emily.setSmile(0);
    this.emily.setMouth(0);
  }

  hide(): void {
    if (!this.built) return;
    this.setShown(false);
    this.light.intensity = 0;
    this.fill.intensity = 0;
  }

  setLight(f: number): void {
    if (this.built) this.light.intensity = f;
  }

  /** How much of the ritual is visible, 0..1, and a slow pulse through it. */
  setThreads(k: number, t = 0): void {
    this.threads.forEach((m, i) => {
      m.visibility = Math.max(0, Math.min(1, k)) * (0.75 + 0.25 * Math.sin(t * 3 + i));
      m.scaling.y = 1 + 0.05 * Math.sin(t * 2 + i * 0.7) * k;
    });
  }

  /** Puts Emily's body, standing, in the house at (x, z) with her back to the camera and the light that shows her. Everything else of the aftermath is hidden. */
  placeEmilyAt(x: number, z: number): void {
    this.build();
    this.corpse.root.setEnabled(false);
    for (const g of this.gore) g.setEnabled(false);
    for (const t of this.threads) t.setEnabled(false);
    this.emily.root.setEnabled(true);
    this.pivot.setEnabled(true);
    this.pivot.rotation.x = 0;
    this.pivot.position.set(x, 0, z);
    this.light.range = 8;
    this.light.intensity = 1.4;
    this.light.position.set(x, 1.9, z + 1.4);
  }

  /** One step of her walk: she glides, upright, and sways like the Matron, not like a child. */
  walkEmily(x: number, z: number, t: number): void {
    this.pivot.position.set(x, 0, z);
    this.emily.root.rotation.z = Math.sin(t * 1.3) * 0.025;
    this.emily.head.rotation.z = 0.55 + Math.sin(t * 0.7) * 0.05;
    this.light.position.set(x, 1.9, z + 1.4);
  }

  /** The Matron is in the body: black eyes, a smile held too long, the head on one side. */
  possess(): void {
    this.emily.eyes.forEach((e) => e.setEnabled(false));
    this.voids.forEach((v) => v.setEnabled(true));
  }
}
