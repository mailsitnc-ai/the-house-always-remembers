import type { Scene } from "@babylonjs/core/scene";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import type { Light } from "@babylonjs/core/Lights/light";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { HorrorDirector } from "../../horror/HorrorDirector";
import type { Stage } from "../../world/Stage";
import type { PlayerController } from "../../player/PlayerController";
import type { LightingManager } from "../../atmosphere/LightingManager";
import type { Flashlight } from "../../atmosphere/Flashlight";
import { STAGE_ORIGIN } from "../../world/Stage";

export interface ShowcaseContext {
  scene: Scene;
  engine: AbstractEngine;
  horror: HorrorDirector;
  stage: Stage;
  player: PlayerController;
  lighting: LightingManager;
  flashlight: Flashlight;
}

/** Where the isolated studio stands, far from the house and from the stage room. */
const S = new Vector3(200, 0, 200);

interface Shot {
  /** File name, without the folder. */
  file: string;
  /** Which subject to put on screen. */
  subject: "matron" | "witness" | "hollow" | "unremembered" | "emily";
  /** Camera position and the point it looks at, relative to the studio (or to the stage room for Emily). */
  cam: [number, number, number];
  look: [number, number, number];
  fov?: number;
  /** Strong light behind the subject and a pale backdrop, for reading the outline. */
  backlit?: boolean;
  /** Stage lamp intensity (Emily only). */
  lamp?: number;
  /** Subject yaw, radians (0 faces the camera at +z). */
  yaw?: number;
  /** Progressive-horror level to show, 0 composed .. 3 true form. */
  c?: number;
  /** A pure silhouette: no torch, no fill, a bright backdrop. */
  silhouette?: boolean;
  /** Lit from the side by a lamp (a close-up in a lived-in room) instead of mostly by the torch. */
  side?: boolean;
  /** Hold the transformation at this many seconds (a still pose). */
  t?: number;
  /** Play the transformation for real from the start for this many seconds (so the hair has its true lag), then capture. */
  play?: number;
  /** Leave the transformation to run by itself (the real-time run). */
  live?: boolean;
}

const SHOTS: Shot[] = [
  { file: "v-hair-10.png", subject: "matron", cam: [1.2, 2.0, 3.0], look: [0, 1.75, 0], fov: 0.85, c: 3, play: 10.4, yaw: 0.5 },
  { file: "v-hair-11.png", subject: "matron", cam: [1.2, 2.0, 3.0], look: [0, 1.75, 0], fov: 0.85, c: 3, play: 11.3, yaw: 0.5 },
  { file: "v-hair-12.png", subject: "matron", cam: [1.2, 2.0, 3.0], look: [0, 1.75, 0], fov: 0.85, c: 3, play: 12.0, yaw: 0.5 },
  { file: "v-hair-13.png", subject: "matron", cam: [1.2, 2.0, 3.0], look: [0, 1.75, 0], fov: 0.85, c: 3, play: 13.2, yaw: 0.5 },
  { file: "v-hair-15.png", subject: "matron", cam: [1.2, 2.0, 3.0], look: [0, 1.75, 0], fov: 0.85, c: 3, play: 14.8, yaw: 0.5 },
  { file: "tf-final-front.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3 },
  { file: "tf-final-side.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, yaw: 1.5708 },
  { file: "tf-final-silhouette.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, silhouette: true, backlit: true },
  { file: "tf-final-back.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, yaw: 3.0 },
  { file: "tf-face-closeup.png", subject: "matron", cam: [0.05, 2.17, 0.95], look: [0, 2.15, 0], fov: 0.62, c: 3, side: true },
  { file: "tf-head-rest.png", subject: "matron", cam: [0.05, 2.17, 0.95], look: [0, 2.15, 0], fov: 0.62, c: 3, side: true, t: 0 },
  { file: "tf-head-max.png", subject: "matron", cam: [0.05, 2.17, 0.95], look: [0, 2.15, 0], fov: 0.62, c: 3, side: true },
  { file: "tf-hair-lag.png", subject: "matron", cam: [1.2, 2.0, 3.0], look: [0, 1.75, 0], fov: 0.85, c: 3, play: 11.4, yaw: 0.5 },
  { file: "tf-hair-settled.png", subject: "matron", cam: [1.2, 2.0, 3.0], look: [0, 1.75, 0], fov: 0.85, c: 3, yaw: 0.5 },
  { file: "tf-seq-a.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 0.5, yaw: 0.2 },
  { file: "tf-seq-b.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 4.5, yaw: 0.2 },
  { file: "tf-seq-c.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 8.5, yaw: 0.2 },
  { file: "tf-seq-d.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 10.5, yaw: 0.2 },
  { file: "tf-seq-e.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 12.4, yaw: 0.2 },
  { file: "tf-seq-f.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 14.5, yaw: 0.2 },
  { file: "tf-seq-g.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 16.5, yaw: 0.2 },
  { file: "tf-seq-h.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 18.5, yaw: 0.2 },
  { file: "tf-seq-i.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, play: 20.8, yaw: 0.2 },
  { file: "matron-state1-full.png", subject: "matron", cam: [0, 1.35, 4.6], look: [0, 1.2, 0], fov: 0.95, c: 0, yaw: 0.25 },
  { file: "matron-state2-full.png", subject: "matron", cam: [0, 1.35, 4.6], look: [0, 1.2, 0], fov: 0.95, c: 1, yaw: 0.25 },
  { file: "matron-state3-full.png", subject: "matron", cam: [0, 1.35, 4.6], look: [0, 1.2, 0], fov: 0.95, c: 2, yaw: 0.25 },
  { file: "matron-state4-full.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, yaw: 0.25 },
  { file: "matron-state1-face.png", subject: "matron", cam: [0.05, 2.17, 0.95], look: [0, 2.15, 0], fov: 0.62, c: 0, side: true },
  { file: "matron-state2-face.png", subject: "matron", cam: [0.05, 2.17, 0.95], look: [0, 2.15, 0], fov: 0.62, c: 1, side: true },
  { file: "matron-state3-face.png", subject: "matron", cam: [0.05, 2.17, 0.95], look: [0, 2.15, 0], fov: 0.62, c: 2, side: true },
  { file: "matron-state4-face.png", subject: "matron", cam: [0.05, 2.17, 0.95], look: [0, 2.15, 0], fov: 0.62, c: 3, side: true },
  { file: "matron-final-front.png", subject: "matron", cam: [0, 1.95, 5.0], look: [0, 1.75, 0], fov: 0.95, c: 3 },
  { file: "matron-final-side.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, yaw: 1.5708 },
  { file: "matron-final-threequarter.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, yaw: 0.8 },
  { file: "matron-final-silhouette.png", subject: "matron", cam: [0, 1.6, 6.4], look: [0, 1.55, 0], fov: 1.0, c: 3, silhouette: true, backlit: true },
  { file: "matron-composed-silhouette.png", subject: "matron", cam: [0, 1.35, 4.6], look: [0, 1.2, 0], fov: 0.95, c: 0, silhouette: true, backlit: true },
  { file: "witness-with-photograph.png", subject: "witness", cam: [0.1, 1.5, 1.7], look: [0.02, 1.4, 0.1], fov: 0.8, c: 0 },
  { file: "witness-full-for-identity.png", subject: "witness", cam: [0, 1.2, 4.0], look: [0, 0.98, 0], fov: 0.95, c: 0 },
  { file: "unremembered-sliced.png", subject: "unremembered", cam: [0.6, 0.85, 3.4], look: [0.6, 0.55, 0], fov: 0.95, c: 1 },
];

/**
 * Developer-only entity showcase. It places the game's own, already built entities (and the finale's own chamber) in an
 * isolated studio, lights them like the game does (a torch from the camera and a warm fill) and renders each requested view
 * to a PNG, saved by the dev server into docs/entity-reference/. It runs only in the dev server with `?showcase`, uses its
 * own save namespace and never starts the story, so nothing here touches a real save. Nothing is drawn or changed in the
 * models: no new geometry, textures or poses.
 */
export class Showcase {
  private readonly cam: FreeCamera;
  private readonly studio: Mesh[] = [];
  private readonly lights: Light[] = [];
  private readonly torch: SpotLight;
  private readonly fill: PointLight;
  private readonly rim: PointLight;
  private readonly backdrop: StandardMaterial;

  constructor(private readonly c: ShowcaseContext) {
    const { scene } = c;
    this.cam = new FreeCamera("showcase-cam", new Vector3(S.x, 1.4, S.z + 4), scene);
    this.cam.minZ = 0.05;
    this.cam.maxZ = 60;
    // The same torch the player carries.
    this.torch = new SpotLight("showcase-torch", Vector3.Zero(), new Vector3(0, 0, 1), 1.45, 14, scene);
    this.torch.parent = this.cam;
    this.torch.diffuse = new Color3(1, 0.93, 0.78);
    this.torch.specular = new Color3(0.4, 0.38, 0.3);
    this.torch.range = 15;
    this.torch.intensity = 3.6;
    this.fill = new PointLight("showcase-fill", new Vector3(S.x - 1.8, 2.3, S.z + 2.4), scene);
    this.fill.diffuse = new Color3(1, 0.8, 0.55);
    this.fill.range = 9;
    this.fill.intensity = 1.1;
    this.rim = new PointLight("showcase-rim", new Vector3(S.x + 1.2, 2.4, S.z - 1.8), scene);
    this.rim.diffuse = new Color3(0.7, 0.8, 1);
    this.rim.range = 8;
    this.rim.intensity = 1.2;
    this.lights.push(this.torch, this.fill, this.rim);

    this.backdrop = new StandardMaterial("showcase-backdrop", scene);
    this.backdrop.diffuseColor = new Color3(0.3, 0.28, 0.25);
    this.backdrop.specularColor = Color3.Black();
    const floor = MeshBuilder.CreateGround("showcase-floor", { width: 14, height: 14 }, scene);
    floor.position.set(S.x, 0, S.z);
    const wall = MeshBuilder.CreatePlane("showcase-wall", { width: 14, height: 6 }, scene);
    wall.position.set(S.x, 3, S.z - 3.2);
    wall.rotation.y = Math.PI;
    for (const m of [floor, wall]) {
      m.material = this.backdrop;
      m.isPickable = false;
      this.studio.push(m);
    }
    this.hideAll();
  }

  get shots(): string[] {
    return SHOTS.map((s) => s.file);
  }

  private hideAll(): void {
    const { horror, stage } = this.c;
    horror.matron.vanish();
    horror.hollow.vanish();
    horror.witness.vanish();
    horror.unremembered.clear();
    stage.hide();
    for (const m of this.studio) m.setEnabled(false);
  }

  /** Puts the subject of a shot on screen and arranges the lights. */
  private setup(shot: Shot): void {
    const { scene, horror, stage } = this.c;
    this.hideAll();
    horror.matron.ceiling = null;
    horror.setCorruptionNow(shot.c ?? 0, true);
    // Only this showcase's lights (and the stage's own lamp for Emily) are on, so house lamps cannot change how a model looks.
    for (const l of scene.lights) l.setEnabled(this.lights.includes(l));
    scene.fogDensity = shot.subject === "emily" ? 0.05 : 0.012;
    scene.fogColor.set(0.02, 0.02, 0.026);
    scene.ambientColor.set(0.06, 0.055, 0.05);
    const yaw = shot.yaw ?? 0;
    if (shot.subject === "emily") {
      stage.show("chamber", shot.lamp ?? 1);
      for (const l of scene.lights) if (l.name === "stage-lamp") l.setEnabled(true);
      this.fill.setEnabled(false);
      this.rim.setEnabled(false);
      // The bedside lamp does most of the work in the chamber; a lower torch lets its raking light show the folds.
      this.torch.setEnabled(true);
      this.torch.intensity = 1.6;
      this.cam.position.set(STAGE_ORIGIN.x + shot.cam[0], shot.cam[1], STAGE_ORIGIN.z + shot.cam[2]);
      this.cam.setTarget(new Vector3(STAGE_ORIGIN.x + shot.look[0], shot.look[1], STAGE_ORIGIN.z + shot.look[2]));
      this.cam.fov = shot.fov ?? 1.15;
      return;
    }
    for (const m of this.studio) m.setEnabled(true);
    if (shot.backlit) {
      this.backdrop.diffuseColor.set(0.85, 0.82, 0.74);
      this.backdrop.emissiveColor.set(0.4, 0.36, 0.3);
    } else {
      this.backdrop.diffuseColor.set(0.3, 0.28, 0.25);
      this.backdrop.emissiveColor.set(0, 0, 0);
    }
    this.torch.setEnabled(!shot.silhouette);
    this.torch.intensity = shot.backlit ? 1.4 : shot.side ? 2.0 : 3.6;
    if (shot.side) {
      this.fill.position.set(S.x - 1.2, shot.cam[1] + 0.35, S.z + 1.6);
      this.fill.intensity = 0.85;
      this.fill.diffuse.set(1, 1, 1);
    } else this.fill.position.set(S.x - 1.8, 2.3, S.z + 2.4);
    if (!shot.side) this.fill.intensity = shot.silhouette ? 0 : shot.backlit ? 0.35 : 1.1;
    this.rim.intensity = shot.backlit ? 0.2 : 1.2;
    this.cam.position.set(S.x + shot.cam[0], shot.cam[1], S.z + shot.cam[2]);
    this.cam.setTarget(new Vector3(S.x + shot.look[0], shot.look[1], S.z + shot.look[2]));
    this.cam.fov = shot.fov ?? 0.95;
    switch (shot.subject) {
      case "matron":
        horror.matron.appear(S.x, S.z, 0, yaw, 0.05);
        horror.matron.headRate = 0;
        horror.matron.update(2);
        if ((shot.c ?? 0) >= 3 && !shot.live) {
          // The true form is reached through a timed sequence: a captured pose is either held at a time, or played for real up to it.
          if (shot.play !== undefined) {
            horror.matron.beginTransformation();
            for (let i = 0; i < Math.round(shot.play * 30); i++) horror.matron.update(1 / 30, this.cam.position);
          } else {
            horror.matron.seekTransformation(shot.t ?? 99);
            for (let i = 0; i < 90; i++) horror.matron.update(1 / 30, this.cam.position);
          }
        }
        if (shot.side) {
          // The head rises as the neck lengthens: keep the face in frame at every level.
          const head = (horror.matron as unknown as { fig: { head: { computeWorldMatrix(f: boolean): void; getAbsolutePosition(): Vector3 } } }).fig.head;
          void head;
          const skull = scene.getTransformNodeByName("matron-skull")!;
          skull.computeWorldMatrix(true);
          const hy = skull.getAbsolutePosition().y;
          const p = skull.getAbsolutePosition();
          this.cam.position.set(p.x + 0.05, hy + 0.04, p.z + 0.95);
          this.cam.setTarget(new Vector3(p.x, hy + 0.02, p.z));
        }
        break;
      case "witness":
        horror.witness.appear(S.x, S.z, 0, S.x + Math.sin(yaw), S.z + Math.cos(yaw));
        horror.witness.update(8);
        break;
      case "hollow":
        horror.hollow.appear(S.x, S.z, 0, new Vector3(S.x + Math.sin(yaw), 0, S.z + Math.cos(yaw)), 0.05);
        horror.hollow.update(1);
        break;
      case "unremembered":
        horror.unremembered.spawn(0, S.x + 0.1, S.z, 0, 1.05);
        horror.unremembered.spawn(1, S.x + 0.6, S.z, 0, 1.05);
        horror.unremembered.spawn(2, S.x + 1.1, S.z, 0, 1.05);
        break;
    }
  }

  /**
   * An entity as the player meets it: the real player camera and torch, the real house and its lamps, the encounter's own spot
   * and facing. None of the studio is used.
   */
  async shootEnv(file: string, env: "matron-hall" | "matron-near" | "witness-room" | "hollow-living" | "unremembered-room" | "emily-chamber" | "emily-chamber-2" | "chamber-matron", c = 0): Promise<{ file: string; ok: boolean; bytes: number; note: string }> {
    const { scene, engine, horror, player, stage, lighting } = this.c;
    this.hideAll();
    for (const l of scene.lights) l.setEnabled(!this.lights.includes(l));
    scene.fogDensity = 0.03;
    scene.fogColor.set(0.02, 0.019, 0.017);
    horror.matron.ceiling = 2.7;
    horror.setCorruptionNow(c, true);
    // The true form as it stands once the transformation is over (the hair has a few seconds to settle below).
    if (c >= 3) {
      horror.matron.seekTransformation(99);
    }
    const lamps = lighting.allLamps.map((l) => [l, l.on] as const);
    const fwd = new Vector3(0, 1, 0);
    let tick: () => void = () => undefined;
    switch (env) {
      case "matron-hall":
      case "matron-near": {
        player.setBase(0);
        player.position.set(5.8, 1.65, env === "matron-near" ? 4.6 : 1.1);
        player.setLook(0, c >= 3 ? -0.3 : 0.03);
        horror.matron.headRate = 0;
        horror.matron.appear(5.8, 7.2, 0, Math.PI, 0.05);
        tick = () => horror.matron.update(0.5, player.position);
        break;
      }
      case "witness-room": {
        player.setBase(3);
        player.position.set(4.45, 4.65, 8.3);
        player.setLook(-0.93, 0.04);
        horror.witness.appear(1.9, 10.2, 1, 0.4, 8.1);
        tick = () => horror.witness.update(0.5);
        break;
      }
      case "hollow-living": {
        // The Hollow only comes in a dark room: every lamp off, the torch on.
        for (const [l] of lamps) l.setOn(false);
        player.setBase(0);
        player.position.set(2.5, 1.65, 0.9);
        player.setLook(0, 0.02);
        horror.hollow.appear(2.5, 5.0, 0, new Vector3(2.5, 0, 0.9), 0.05);
        tick = () => horror.hollow.update(0.5);
        break;
      }
      case "unremembered-room": {
        player.setBase(3);
        player.position.set(4.55, 4.65, 8.0);
        player.setLook(-0.97, 0.0);
        horror.unremembered.spawn(0, 2.2, 9.6, 1);
        horror.unremembered.spawn(1, 1.0, 6.9, 1);
        horror.unremembered.spawn(2, 3.7, 6.9, 1, 1.3);
        tick = () => {
          for (const f of (horror.unremembered as unknown as { fragments: { clock: number; phase: number }[] }).fragments) {
            f.clock = 0.4;
            f.phase = 0;
          }
          horror.unremembered.update(0.5, player.position, fwd);
        };
        break;
      }
      case "chamber-matron": {
        // The confrontation: the chamber lit, Daniel turned to the doorway, the Matron standing in it.
        stage.show("chamber", 0.8);
        scene.fogDensity = 0.05;
        scene.fogColor.set(0.02, 0.02, 0.026);
        for (const l of scene.lights) if (l.name === "stage-lamp") l.setEnabled(true);
        player.setBase(0);
        // Daniel has stepped back from the bed (the real finale has him at about 1.5 m from the doorway; here 2.4 m so the whole figure is in view).
        player.position.set(STAGE_ORIGIN.x - 0.1, 1.6, STAGE_ORIGIN.z + 0.75);
        player.setLook(Math.PI - 0.04, -0.12);
        horror.matron.headRate = 0;
        horror.matron.appear(STAGE_ORIGIN.x, STAGE_ORIGIN.z - 1.65, 0, 0, 0.05);
        tick = () => horror.matron.update(0.5, player.position);
        break;
      }
      case "emily-chamber":
      case "emily-chamber-2": {
        // As the finale stages it: the chamber on, dim fog, the torch on, the first glide position, the lamp at the reveal.
        stage.show("chamber", env === "emily-chamber" ? 0.4 : 1);
        scene.fogDensity = 0.05;
        scene.fogColor.set(0.02, 0.02, 0.026);
        for (const l of scene.lights) if (l.name === "stage-lamp") l.setEnabled(true);
        player.setBase(0);
        if (env === "emily-chamber") {
          player.position.set(STAGE_ORIGIN.x - 0.1, 1.6, STAGE_ORIGIN.z - 0.2);
          player.setLook(0.08, 0.28);
        } else {
          player.position.set(STAGE_ORIGIN.x - 0.75, 1.55, STAGE_ORIGIN.z - 0.45);
          player.setLook(0.5, 0.52);
        }
        break;
      }
    }
    scene.activeCamera = player.camera;
    // The game's own loop drives the chamber lamp (it can leave it at zero): hold it at the shot's level.
    const relight = (): void => {
      if (env === "chamber-matron") stage.setLamp(1);
    };
    for (let i = 0; i < 8; i++) {
      relight();
      scene.render();
      tick();
      await new Promise((r) => window.setTimeout(r, 60));
    }
    for (let i = 0; i < 60 && !engine.areAllEffectsReady(); i++) {
      relight();
      scene.render();
      await new Promise((r) => window.setTimeout(r, 100));
    }
    relight();
    scene.render();
    const canvas = engine.getRenderingCanvas()!;
    const prev: [number, number] = [canvas.width, canvas.height];
    engine.setSize(1600, 1200);
    relight();
    scene.render();
    const data = canvas.toDataURL("image/png");
    engine.setSize(prev[0], prev[1]);
    const res = await fetch(`/__showcase/save?dir=matron-transformation&name=${encodeURIComponent(file)}`, { method: "POST", body: data });
    for (const [l, on] of lamps) l.setOn(on);
    this.hideAll();
    return { file, ok: res.ok, bytes: data.length, note: await res.text() };
  }

  /** Lets the subject finish fading in, then renders one image at 1600 x 1200 and saves it through the dev server. */
  async shoot(file: string): Promise<{ file: string; ok: boolean; bytes: number; note: string }> {
    const shot = SHOTS.find((s) => s.file === file);
    if (!shot) return { file, ok: false, bytes: 0, note: "unknown shot" };
    const { scene, engine, horror } = this.c;
    this.setup(shot);
    scene.activeCamera = this.cam;
    const look = new Vector3(0, 1, 1);
    for (let i = 0; i < 6; i++) {
      if (shot.subject === "unremembered") {
        // Hold the stutter on its resting pose and keep the figures from reacting to the camera.
        for (const f of (horror.unremembered as unknown as { fragments: { clock: number; phase: number }[] }).fragments) {
          f.clock = 0.4;
          f.phase = 0;
        }
        horror.unremembered.update(0.5, this.cam.position, look);
      } else if (shot.subject === "witness") horror.witness.update(0.5);
      else if (shot.subject === "matron") horror.matron.update(0.0005);
      else if (shot.subject === "hollow") horror.hollow.update(0.5);
      scene.render();
      await Promise.resolve();
    }
    // Shaders compile asynchronously: wait until every effect is ready, or a model that has not compiled yet is simply not drawn.
    for (let i = 0; i < 60 && !engine.areAllEffectsReady(); i++) {
      scene.render();
      await new Promise((r) => window.setTimeout(r, 100));
    }
    scene.render();
    // Render one frame at full size and read the canvas straight away (the drawing buffer is valid until the task ends).
    const canvas = engine.getRenderingCanvas()!;
    const prev: [number, number] = [canvas.width, canvas.height];
    engine.setSize(1600, 1200);
    scene.render();
    const data = canvas.toDataURL("image/png");
    engine.setSize(prev[0], prev[1]);
    const res = await fetch(`/__showcase/save?dir=matron-transformation&name=${encodeURIComponent(file)}`, { method: "POST", body: data });
    const text = await res.text();
    return { file, ok: res.ok, bytes: data.length, note: text };
  }


  /**
   * The transformation in real time. The Matron runs her own `update` at the real frame rate (clamped at 50 ms, as the game's loop does) and
   * nothing is posed: this samples the animation as it plays. "studio" is a clean view; "chamber" is the real confrontation room as the finale
   * stages it, seen through the real player camera and the real flashlight. Frames are labelled with the animation's own clock.
   */
  flashDiag: Record<string, unknown>[] = [];

  async live(prefix: string, mode: "studio" | "chamber", maxSeconds = 30, every = 1, realtime = true): Promise<unknown> {
    const { scene, engine, horror, player, stage, flashlight } = this.c;
    const O = STAGE_ORIGIN;
    this.hideAll();
    horror.setCorruptionNow(0, true);
    horror.matron.headRate = 0.55;
    let watch: Vector3;
    if (mode === "studio") {
      this.setup({ file: "live", subject: "matron", cam: [0, 1.7, 5.6], look: [0, 1.5, 0], fov: 0.95, c: 3, yaw: 0, live: true });
      // `setup` steps the Matron once (a 2 s update), which would start the sequence: put her back to the start.
      horror.setCorruptionNow(0, true);
      horror.setCorruptionNow(3, true);
      horror.matron.ceiling = null;
      watch = this.cam.position;
      scene.activeCamera = this.cam;
      horror.matron.appear(S.x, S.z, 0, 0, 2.6);
    } else {
      for (const l of scene.lights) l.setEnabled(!this.lights.includes(l));
      scene.fogDensity = 0.05;
      scene.fogColor.set(0.02, 0.02, 0.026);
      horror.matron.ceiling = 2.7;
      horror.setCorruptionNow(3, true);
      stage.show("chamber", 0.22);
      stage.setLamp(1);
      for (const l of scene.lights) if (l.name === "stage-lamp") l.setEnabled(true);
      // Exactly where the finale puts Daniel when the Matron appears: turned to the doorway, she in it 1.25 m away.
      player.setBase(0);
      player.position.set(O.x - 0.75, 1.55, O.z - 0.45);
      player.setLook(Math.atan2(0.75, -1.25), -0.2);
      flashlight.on = true;
      flashlight.light.setEnabled(true);
      horror.matron.appear(O.x, O.z - 1.7, 0, 0, 2.6);
      horror.matron.root.computeWorldMatrix(true);
      for (const m of horror.matron.root.getChildMeshes()) m.computeWorldMatrix(true);
      const L = flashlight.light;
      const beam = (tag: string): Record<string, unknown> => {
        L.getAbsolutePosition();
        const dir = L.transformedDirection ? L.transformedDirection.clone().normalize() : L.direction.clone();
        const mm = horror.matron.root.getChildMeshes().find((m) => m.isEnabled() && m.getTotalVertices() > 1000);
        const toM = horror.matron.root.getAbsolutePosition().add(new Vector3(0, 1.5, 0)).subtract(L.getAbsolutePosition());
        const fw = player.camera.getForwardRay(1).direction;
        return {
          tag,
          lightPos: L.getAbsolutePosition().asArray().map((v) => +v.toFixed(2)),
          beamDir: dir.asArray().map((v) => +v.toFixed(2)),
          cameraFwd: fw.asArray().map((v) => +v.toFixed(2)),
          angleToMatronDeg: +((Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(dir, toM.normalize())))) * 180) / Math.PI).toFixed(1),
          distToMatron: +toM.length().toFixed(2),
          intensity: L.intensity,
          range: L.range,
          coneDeg: +((L.angle * 180) / Math.PI).toFixed(0),
          enabled: L.isEnabled(),
          canAffectMatronMesh: mm ? L.canAffectMesh(mm) : null,
          lightsOnMatronMesh: mm ? mm.lightSources.map((x) => x.name) : null,
          shadowGen: !!L.getShadowGenerator(),
          shadowCasters: L.getShadowGenerator() ? (L.getShadowGenerator() as unknown as { getShadowMap(): { renderList: unknown[] } }).getShadowMap().renderList.length : 0,
        };
      };
      this.flashDiag = [beam("after placing the player, before the flashlight has updated")];
      for (let i = 0; i < 4; i++) flashlight.update(0.5);
      this.flashDiag.push(beam("after flashlight.update (the real implementation)"));
      watch = player.position;
      scene.activeCamera = player.camera;
    }
    const node = (n: string) => scene.getTransformNodeByName(n)!;
    const anchor = node("matron-head-anchor");
    const neck = node("matron-neck-pivot");
    const body = node("matron-body");
    const skull = node("matron-skull");
    const locks = scene.meshes.filter((m) => m.name.startsWith("matron-lock-"));
    const rings = 15;
    const shots: { sec: number; data: string }[] = [];
    const rows: number[][] = [];
    const prev: number[] = [];
    const maxV: Record<string, [number, number]> = {};
    let curlMax = 0;
    let penMax = 0;
    let bodyPenMax = 0;
    let tipMax = 0;
    const curlSec: Record<number, number> = {};
    const hairStats = (): [number, number, number] => {
      let curl = 0;
      let pen = 0;
      let bpen = 0;
      const inv = skull.getWorldMatrix().clone().invert();
      const binv = body.getWorldMatrix().clone().invert();
      for (const m of locks) {
        if (!m.isEnabled()) continue;
        const pos = m.getVerticesData("position")!;
        const W = m.getWorldMatrix();
        const c: Vector3[] = [];
        for (let j = 0; j < rings; j++) {
          const k = (j * 5 + 2) * 3;
          c.push(Vector3.TransformCoordinates(new Vector3(pos[k], pos[k + 1], pos[k + 2]), W));
        }
        for (let j = 0; j + 2 < rings; j++) {
          const a = c[j + 1].subtract(c[j]).normalize();
          const b = c[j + 2].subtract(c[j + 1]).normalize();
          curl = Math.max(curl, Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(a, b)))));
        }
        for (let k = 0; k < pos.length; k += 3) {
          const w = Vector3.TransformCoordinates(new Vector3(pos[k], pos[k + 1], pos[k + 2]), W);
          const l = Vector3.TransformCoordinates(w, inv);
          if ((l.x / 0.09) ** 2 + (l.y / 0.115) ** 2 + (l.z / 0.1) ** 2 < 0.8) pen++;
          const b = Vector3.TransformCoordinates(w, binv);
          if (b.y > 1.0 && b.y < 1.95 && (b.x / 0.24) ** 2 + (b.z / 0.15) ** 2 < 0.85) bpen++;
        }
      }
      return [curl, pen, bpen];
    };
    // Two drivers. "realtime": the Matron's own `update` runs inside the engine's render loop at the real frame rate (dt clamped at 50 ms, as the
    // game's loop does) and a frame is grabbed when the animation's own clock passes each second. "stepped": the same `update` in fixed 1/30 s
    // steps without waiting for the renderer (for a browser too slow to run in real time).
    const STEP = 1 / 30;
    let nextSec = 0;
    const canvas0 = engine.getRenderingCanvas()!;
    const prevSize: [number, number] = [canvas0.width, canvas0.height];
    const names = ["headPitch", "headYaw", "headRoll", "neckLength", "neckLean", "neckBend", "bodyStretch", "torsoYaw"];
    let maxFrame = 0;
    let slow = 0;
    let frames = 0;
    let wallAtStart = -1;
    let wallAtEnd = 0;
    /** Measures one step of the animation; returns true when a sample frame is due. */
    const measure = (T: number, dt: number): boolean => {
      const [curl, pen, bpen] = hairStats();
      curlMax = Math.max(curlMax, curl);
      penMax = Math.max(penMax, pen);
      bodyPenMax = Math.max(bodyPenMax, bpen);
      const cur = [anchor.rotation.x, anchor.rotation.y, anchor.rotation.z, anchor.position.y, neck.rotation.x, neck.rotation.z, body.scaling.y, horror.matron.root.rotation.y];
      if (prev.length) {
        cur.forEach((v, i) => {
          const vel = Math.abs(v - prev[i]) / dt;
          if (!maxV[names[i]] || vel > maxV[names[i]][0]) maxV[names[i]] = [vel, T];
        });
      }
      prev.length = 0;
      prev.push(...cur);
      const sec = Math.floor(T);
      curlSec[sec] = Math.max(curlSec[sec] ?? 0, curl);
      // (the very first frame is taken a moment after the sequence starts, so the figure is on screen)
      if (T < nextSec + (nextSec === 0 ? 0.1 : 0)) return false;
      rows.push([Math.round(T * 10) / 10, ...cur.slice(0, 7).map((v) => Math.round(v * 1000) / 1000), Math.round(curl * 100) / 100, pen]);
      return true;
    };
    for (let i = 0; i < 60 && !engine.areAllEffectsReady(); i++) {
      scene.render();
      await new Promise((r) => window.setTimeout(r, 100));
    }
    const t0 = performance.now();
    let steps = 0;
    if (realtime) {
      // The embedded browser throttles requestAnimationFrame to about 2 Hz when its pane is not in the foreground, so the loop is driven by a timer:
      // each iteration measures the real elapsed time, runs the Matron's own update with it (clamped at 50 ms, as the game does), advances the
      // real flashlight, and renders the scene.
      let last = performance.now();
      for (;;) {
        await new Promise((r) => window.setTimeout(r, 4));
        const now = performance.now();
        const raw = (now - last) / 1000;
        last = now;
        const dt = Math.min(raw, 0.05);
        flashlight.update(dt);
        horror.matron.update(dt, watch);
        scene.render();
        const T = horror.matron.transformTime;
        if (T < 0) continue;
        if (wallAtStart < 0) wallAtStart = now;
        wallAtEnd = now;
        frames++;
        maxFrame = Math.max(maxFrame, raw);
        if (raw > 0.04) slow++;
        if (measure(T, Math.max(dt, 1e-3))) {
          shots.push({ sec: nextSec, data: engine.getRenderingCanvas()!.toDataURL("image/png") });
          nextSec += every;
        }
        if (T >= maxSeconds || (now - t0) / 1000 > 60) break;
      }
    } else {
      for (; steps < maxSeconds * 30 * 4; steps++) {
        horror.matron.update(STEP, watch);
        const T = horror.matron.transformTime;
        if (T < 0) continue;
        if (measure(T, STEP)) {
          engine.setSize(1280, 960);
          scene.render();
          shots.push({ sec: nextSec, data: engine.getRenderingCanvas()!.toDataURL("image/png") });
          engine.setSize(prevSize[0], prevSize[1]);
          nextSec += every;
        }
        if (T >= maxSeconds) break;
        if (steps % 30 === 0) await new Promise((r) => window.setTimeout(r, 0));
      }
    }
    const wallFps = engine.getFps();
    void tipMax;
    // One large frame of the finished form, in the same state (the real flashlight on, in the chamber mode).
    engine.setSize(1600, 1200);
    scene.render();
    shots.push({ sec: -1, data: engine.getRenderingCanvas()!.toDataURL("image/png") });
    engine.setSize(prevSize[0], prevSize[1]);
    const saved: string[] = [];
    for (const sh of shots) {
      const name = sh.sec < 0 ? `${prefix}-final-large.png` : `${prefix}-${String(Math.round(sh.sec)).padStart(2, "0")}s.png`;
      const res = await fetch(`/__showcase/save?dir=matron-transformation-verification&name=${encodeURIComponent(name)}`, { method: "POST", body: sh.data });
      saved.push(`${name}:${res.ok}`);
    }
    this.hideAll();
    return {
      mode,
      driver: realtime ? "real time (the engine's render loop)" : "fixed 1/30 s steps",
      animationWallSeconds: realtime ? Math.round(((wallAtEnd - wallAtStart) / 1000) * 100) / 100 : null,
      framesRendered: realtime ? frames : steps,
      avgFps: realtime ? Math.round(frames / ((wallAtEnd - wallAtStart) / 1000)) : null,
      framesOver40ms: slow,
      longestFrameMs: Math.round(maxFrame * 1000),
      engineFpsAtEnd: Math.round(wallFps * 10) / 10,
      canvas: [prevSize[0], prevSize[1]],
      hairMaxSegmentBendDeg: Math.round((curlMax * 180) / Math.PI),
      hairVerticesInsideSkullMax: penMax,
      hairVerticesInsideTorsoMax: bodyPenMax,
      hairBendBySecondDeg: Object.fromEntries(Object.entries(curlSec).map(([k, v]) => [k, Math.round((v * 180) / Math.PI)])),
      maxVelocity: Object.fromEntries(Object.entries(maxV).map(([k, v]) => [k, `${v[0].toFixed(2)}/s at ${v[1].toFixed(1)}s`])),
      columns: ["T", "pitch", "yaw", "roll", "neckLen(m)", "neckLeanX", "neckBendZ", "bodyY", "hairBendRad", "hairInSkull"],
      rows,
      saved,
      flashDiag: this.flashDiag,
    };
  }

  async shootAll(): Promise<{ file: string; ok: boolean; bytes: number; note: string }[]> {
    const out = [];
    for (const f of this.shots) out.push(await this.shoot(f));
    return out;
  }
}
