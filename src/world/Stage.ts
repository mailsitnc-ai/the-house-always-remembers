import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MirrorTexture } from "@babylonjs/core/Materials/Textures/mirrorTexture";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Plane } from "@babylonjs/core/Maths/math.plane";
import { buildReflection, type ReflectionFigure } from "../horror/CharacterBuilder";

/**
 * A small "reconstructed room", built far outside the house. The Matron can reconstruct rooms from memory, and the
 * story uses that for two scenes: Daniel's mirror (a bathroom as he remembers it) and the room where Emily is kept.
 *
 * Nothing is built until it is first needed, and it is switched off again afterwards, so it costs nothing in normal play.
 * The mirror is a real planar reflection, but it renders only this small room and only while the scene is on screen.
 */
export const STAGE_ORIGIN = new Vector3(60, 0, 60);
const W = 3.4;
const D = 3.8;
const H = 2.5;

export type StageConfig = "mirror" | "chamber" | "bedroom";

export class Stage {
  private built = false;
  private readonly shell: Mesh[] = [];
  private readonly mirrorSet: Mesh[] = [];
  private readonly chamberSet: Mesh[] = [];
  private readonly bedroomSet: Mesh[] = [];
  private mirror: MirrorTexture | null = null;
  private readonly mats: [StandardMaterial, number][] = [];
  private lamp: PointLight | null = null;
  /** The mirror, for tests. */
  get mirrorTexture(): MirrorTexture | null {
    return this.mirror;
  }
  private lampBase = 0.6;
  figure: ReflectionFigure | null = null;
  /** The spot the player stands on in each configuration. */
  readonly spawn = new Vector3(STAGE_ORIGIN.x, 1.65, STAGE_ORIGIN.z - 1.25);
  /** Where the hand lies in the chamber, for the camera to find. */
  readonly handAt = new Vector3(STAGE_ORIGIN.x - 0.28, 0.62, STAGE_ORIGIN.z + 0.55);
  readonly bedAt = new Vector3(STAGE_ORIGIN.x + 0.1, 0.5, STAGE_ORIGIN.z + 0.9);

  constructor(private readonly scene: Scene) {}

  private mat(name: string, hex: string, emissive = 0, spec = 0.04): StandardMaterial {
    const m = new StandardMaterial(`stage-${name}`, this.scene);
    this.mats.push([m, emissive]);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = new Color3(spec, spec, spec);
    m.emissiveColor = new Color3(emissive, emissive, emissive * 0.95);
    return m;
  }

  private put(list: Mesh[], mesh: Mesh, m: StandardMaterial, x: number, y: number, z: number): Mesh {
    mesh.material = m;
    mesh.position.set(STAGE_ORIGIN.x + x, y, STAGE_ORIGIN.z + z);
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    mesh.setEnabled(false);
    list.push(mesh);
    return mesh;
  }

  private box(list: Mesh[], name: string, w: number, h: number, d: number, m: StandardMaterial, x: number, y: number, z: number): Mesh {
    return this.put(list, MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene), m, x, y, z);
  }

  private ball(list: Mesh[], name: string, sx: number, sy: number, sz: number, m: StandardMaterial, x: number, y: number, z: number): Mesh {
    const s = this.put(list, MeshBuilder.CreateSphere(name, { diameter: 1, segments: 12 }, this.scene), m, x, y, z);
    s.scaling.set(sx, sy, sz);
    return s;
  }

  private build(): void {
    if (this.built) return;
    this.built = true;
    const wall = this.mat("wall", "#6f6a5c", 0.05);
    const floorM = this.mat("floor", "#3a2f26", 0.02);
    const dark = this.mat("dark", "#18140f");
    const tile = this.mat("tile", "#9aa3a0", 0.07, 0.2);
    const white = this.mat("white", "#a9a499", 0.05);
    const sheet = this.mat("sheet", "#8f8b80", 0.03);
    const skin = this.mat("skin", "#a39c90", 0.05);
    const faded = this.mat("faded", "#a87c86", 0.04);
    const wood = this.mat("wood", "#4a382a", 0.03);
    const brass = this.mat("brass", "#8a7442", 0.05, 0.3);
    const lav = this.mat("lavender", "#6b5f86", 0.05);
    const linen = this.mat("linen", "#8c887b", 0.04);
    const fur = this.mat("teddy", "#a58a62", 0.05);
    const s = this.shell;
    this.box(s, "floor", W, 0.05, D, floorM, 0, -0.025, 0);
    this.box(s, "ceiling", W, 0.05, D, wall, 0, H + 0.025, 0);
    this.box(s, "wall-n", W, H, 0.1, wall, 0, H / 2, D / 2);
    this.box(s, "wall-s", W, H, 0.1, wall, 0, H / 2, -D / 2);
    this.box(s, "wall-e", 0.1, H, D, wall, W / 2, H / 2, 0);
    this.box(s, "wall-w", 0.1, H, D, wall, -W / 2, H / 2, 0);

    // ---- the bathroom as Daniel remembers it: tiles, a sink, and a large mirror ----
    const m = this.mirrorSet;
    this.box(m, "tiles", W - 0.1, 1.2, 0.02, tile, 0, 0.6, D / 2 - 0.06);
    this.box(m, "sink", 0.7, 0.12, 0.45, white, 0, 0.88, D / 2 - 0.3);
    this.box(m, "sink-stand", 0.12, 0.82, 0.12, white, 0, 0.41, D / 2 - 0.3);
    this.box(m, "frame", 1.1, 1.4, 0.04, wood, 0, 1.55, D / 2 - 0.07);
    const glass = this.box(m, "glass", 1.0, 1.3, 0.01, dark, 0, 1.55, D / 2 - 0.1);
    this.mirror = new MirrorTexture("stage-mirror", 512, this.scene, true);
    // Babylon wants the plane normal pointing away from the viewer, toward the wall the mirror is on.
    this.mirror.mirrorPlane = Plane.FromPositionAndNormal(new Vector3(STAGE_ORIGIN.x, 1.55, STAGE_ORIGIN.z + D / 2 - 0.1), new Vector3(0, 0, 1));
    this.mirror.refreshRate = 0;
    this.mirror.level = 0.9;
    const gm = new StandardMaterial("stage-glass-mat", this.scene);
    gm.diffuseColor = Color3.Black();
    gm.specularColor = Color3.Black();
    gm.reflectionTexture = this.mirror;
    gm.backFaceCulling = false;
    glass.material = gm;
    this.box(m, "towel-rail", 0.5, 0.02, 0.05, brass, 1.0, 1.1, D / 2 - 0.08);
    this.box(m, "towel", 0.4, 0.5, 0.03, linen, 1.0, 0.85, D / 2 - 0.1);

    // ---- the room where Emily is kept: a child's bed, tended, under a sheet ----
    const c = this.chamberSet;
    const bx = 0.1;
    const bz = 0.9;
    this.box(c, "bed-frame", 0.95, 0.3, 1.8, wood, bx, 0.25, bz);
    this.box(c, "mattress", 0.88, 0.14, 1.72, linen, bx, 0.47, bz);
    this.box(c, "pillow", 0.5, 0.1, 0.3, white, bx, 0.58, bz + 0.68);
    // The sheet over a small shape: head, shoulders, body, legs. Nothing of her is shown but a hand.
    this.ball(c, "sheet-head", 0.22, 0.2, 0.26, sheet, bx, 0.66, bz + 0.55);
    this.ball(c, "sheet-shoulders", 0.36, 0.17, 0.2, sheet, bx, 0.6, bz + 0.34);
    this.ball(c, "sheet-body", 0.3, 0.14, 0.62, sheet, bx, 0.57, bz - 0.05);
    this.ball(c, "sheet-legs", 0.24, 0.1, 0.5, sheet, bx, 0.54, bz - 0.5);
    // The hand, lying on top of the sheet at the edge, a faded ribbon at the wrist.
    const hx = this.handAt.x - STAGE_ORIGIN.x;
    const hz = this.handAt.z - STAGE_ORIGIN.z;
    this.ball(c, "hand-palm", 0.06, 0.02, 0.08, skin, hx, 0.655, hz);
    for (let i = 0; i < 4; i++) this.ball(c, "hand-finger", 0.012, 0.012, 0.055, skin, hx - 0.022 + i * 0.015, 0.655, hz - 0.075 - (i === 1 || i === 2 ? 0.01 : 0));
    this.ball(c, "hand-thumb", 0.012, 0.012, 0.04, skin, hx + 0.045, 0.655, hz - 0.03);
    const rib = this.put(c, MeshBuilder.CreateTorus("ribbon", { diameter: 0.05, thickness: 0.008, tessellation: 14 }, this.scene), faded, hx, 0.655, hz + 0.075);
    rib.rotation.x = Math.PI / 2;
    // A teddy at the pillow, a hairbrush, a brass dish, folded linen, and dried lavender: someone has been looking after her.
    this.ball(c, "teddy-body", 0.14, 0.16, 0.12, fur, bx + 0.32, 0.64, bz + 0.7);
    this.ball(c, "teddy-head", 0.1, 0.1, 0.09, fur, bx + 0.32, 0.77, bz + 0.7);
    this.box(c, "nightstand", 0.4, 0.5, 0.35, wood, -0.85, 0.25, 1.55);
    this.box(c, "brush", 0.05, 0.02, 0.16, wood, -0.85, 0.52, 1.5);
    this.ball(c, "dish", 0.14, 0.03, 0.14, brass, -0.7, 0.52, 1.6);
    this.box(c, "linen-stack", 0.3, 0.12, 0.22, linen, -0.85, 0.6, 1.7);
    for (let i = 0; i < 5; i++) this.put(c, MeshBuilder.CreateCylinder("lavender", { height: 0.3, diameter: 0.012, tessellation: 5 }, this.scene), lav, bx - 0.3 + i * 0.012, 0.75, bz + 0.15).rotation.z = 0.3 - i * 0.12;
    this.box(c, "chair", 0.4, 0.45, 0.4, wood, 1.1, 0.22, 0.3);
    this.box(c, "door-frame", 0.9, 2.0, 0.06, dark, 0, 1.0, -D / 2 + 0.06);

    // ---- the same room as Daniel remembers it (the first ending): made bed, nothing in it ----
    const r = this.bedroomSet;
    this.box(r, "r-bed", 0.95, 0.3, 1.8, wood, bx, 0.25, bz);
    this.box(r, "r-mattress", 0.88, 0.14, 1.72, linen, bx, 0.47, bz);
    this.box(r, "r-pillow", 0.5, 0.1, 0.3, white, bx, 0.58, bz + 0.68);
    this.ball(r, "r-teddy-body", 0.14, 0.16, 0.12, fur, bx + 0.32, 0.64, bz + 0.7);
    this.ball(r, "r-teddy-head", 0.1, 0.1, 0.09, fur, bx + 0.32, 0.77, bz + 0.7);
    this.box(r, "r-nightstand", 0.4, 0.5, 0.35, wood, -0.85, 0.25, 1.55);

    this.lamp = new PointLight("stage-lamp", new Vector3(STAGE_ORIGIN.x - 0.85, 0.95, STAGE_ORIGIN.z + 1.55), this.scene);
    this.lamp.diffuse = new Color3(1, 0.78, 0.5);
    this.lamp.range = 4.5;
    this.lamp.intensity = 0;
    this.lamp.includedOnlyMeshes = [...s, ...m, ...c, ...r];

    this.figure = buildReflection(this.scene);
    this.figure.root.position.set(STAGE_ORIGIN.x, 0, STAGE_ORIGIN.z - 1.0);
    this.lamp.includedOnlyMeshes = [...this.lamp.includedOnlyMeshes, ...this.figure.meshes];
    this.mirror.renderList = [...s, ...m, ...this.figure.meshes];
    for (const x of this.mirror.renderList) x.alwaysSelectAsActiveMesh = true;
  }

  /** Switches the stage on in one configuration. */
  show(config: StageConfig, lampIntensity = 0.6): void {
    this.build();
    for (const x of this.shell) x.setEnabled(true);
    for (const x of this.mirrorSet) x.setEnabled(config === "mirror");
    for (const x of this.chamberSet) x.setEnabled(config === "chamber");
    for (const x of this.bedroomSet) x.setEnabled(config === "bedroom");
    this.lampBase = lampIntensity;
    // The bathroom is brighter (the reflection must be readable); Emily's room stays dim.
    const k = config === "mirror" ? 4 : 1;
    for (const [mat, base] of this.mats) mat.emissiveColor.set(base * k, base * k, base * k * 0.95);
    if (this.lamp) {
      // The bathroom is lit from above and behind the viewer (cold), so the reflection can be seen; the other rooms by a bedside lamp (warm).
      const mirror = config === "mirror";
      this.lamp.position.set(STAGE_ORIGIN.x + (mirror ? 0 : -0.85), mirror ? 2.0 : 0.95, STAGE_ORIGIN.z + (mirror ? 0.95 : 1.55));
      this.lamp.diffuse = mirror ? new Color3(0.78, 0.88, 1) : new Color3(1, 0.78, 0.5);
      this.lamp.range = mirror ? 6 : 4.5;
      this.lamp.intensity = lampIntensity;
    }
    if (this.mirror) this.mirror.refreshRate = config === "mirror" ? 1 : 0;
    this.figure?.root.setEnabled(config === "mirror");
  }

  setLamp(f: number): void {
    if (this.lamp) this.lamp.intensity = this.lampBase * f;
  }

  hide(): void {
    if (!this.built) return;
    for (const x of [...this.shell, ...this.mirrorSet, ...this.chamberSet, ...this.bedroomSet]) x.setEnabled(false);
    if (this.lamp) this.lamp.intensity = 0;
    if (this.mirror) this.mirror.refreshRate = 0;
    this.figure?.root.setEnabled(false);
  }

  get node(): TransformNode | null {
    return this.figure?.root ?? null;
  }
}
