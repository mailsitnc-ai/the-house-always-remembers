import type { Scene } from "@babylonjs/core/scene";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AudioManager } from "./AudioManager";

/**
 * Head-mounted spotlight. It is the only dynamic shadow caster in the prototype:
 * one 512px shadow map, re-rendered each frame, is the main per-frame lighting cost.
 */
export class Flashlight {
  readonly light: SpotLight;
  private readonly shadows: ShadowGenerator;
  on = true;
  private readonly pivot: TransformNode;
  private readonly camera: FreeCamera;
  private readonly baseIntensity: number;
  private flickerLeft = 0;
  private deadLeft = 0;

  constructor(scene: Scene, camera: FreeCamera, private readonly audio: AudioManager) {
    this.camera = camera;
    // The beam follows the view with a short lag, like a torch held in a hand rather than bolted to the head.
    this.pivot = new TransformNode("flashlight-pivot", scene);
    this.pivot.rotationQuaternion = Quaternion.FromEulerAngles(camera.rotation.x, camera.rotation.y, 0);
    this.light = new SpotLight("flashlight", new Vector3(0.12, -0.1, 0.1), new Vector3(0, 0, 1), 1.45, 14, scene);
    this.baseIntensity = 3.6;
    this.light.parent = this.pivot;
    this.light.diffuse = new Color3(1, 0.93, 0.78);
    this.light.specular = new Color3(0.4, 0.38, 0.3);
    this.light.range = 15;
    this.light.intensity = this.baseIntensity;
    this.light.shadowMinZ = 0.2;
    this.light.shadowMaxZ = 14;

    this.shadows = new ShadowGenerator(1024, this.light);
    this.shadows.usePercentageCloserFiltering = true;
    this.shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    this.shadows.bias = 0.0006;
    this.shadows.normalBias = 0.02;
    this.shadows.setDarkness(0.08);
  }

  /** The beam stutters for a while (used when something is near). */
  flicker(seconds: number): void {
    this.flickerLeft = Math.max(this.flickerLeft, seconds);
  }

  /** The beam goes out and cannot be relit for a while. */
  kill(seconds: number): void {
    this.deadLeft = Math.max(this.deadLeft, seconds);
    this.light.setEnabled(false);
  }

  get dead(): boolean {
    return this.deadLeft > 0;
  }

  /** True if `point` is inside the lit cone and within reach of the beam. */
  lights(point: Vector3, maxDist = 12, cosMin = 0.93): boolean {
    if (!this.on || this.deadLeft > 0) return false;
    const to = point.subtract(this.camera.position);
    const dist = to.length();
    if (dist > maxDist || dist < 0.05) return false;
    const fwd = this.camera.getDirection(Vector3.Forward());
    return Vector3.Dot(fwd, to.scale(1 / dist)) > cosMin;
  }

  update(dt: number): void {
    if (this.deadLeft > 0) {
      this.deadLeft -= dt;
      if (this.deadLeft <= 0) this.light.setEnabled(this.on);
    } else if (this.flickerLeft > 0) {
      this.flickerLeft -= dt;
      this.light.intensity = this.baseIntensity * (Math.random() < 0.35 ? 0.1 : 0.4 + Math.random() * 0.8);
    } else {
      this.light.intensity = this.baseIntensity;
    }
    const target = Quaternion.FromEulerAngles(this.camera.rotation.x, this.camera.rotation.y, 0);
    this.pivot.position.copyFrom(this.camera.position);
    this.pivot.rotationQuaternion = Quaternion.Slerp(this.pivot.rotationQuaternion!, target, 1 - Math.exp(-16 * dt));
  }

  addCaster(mesh: AbstractMesh): void {
    this.shadows.addShadowCaster(mesh);
  }

  toggle(): void {
    if (this.deadLeft > 0) return;
    this.on = !this.on;
    this.light.setEnabled(this.on);
    this.audio.click();
  }
}
