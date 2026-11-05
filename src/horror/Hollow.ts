import type { Scene } from "@babylonjs/core/scene";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { buildHollow, type Figure } from "./CharacterBuilder";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 as V3 } from "@babylonjs/core/Maths/math.vector";
import { Entity } from "./Entity";

export type HollowMode = "idle" | "stalk" | "recoil";

/**
 * A manifestation of denial. It does not move smoothly: it holds still, then jumps a short way, as if frames of its
 * movement were missing. A flashlight beam on it makes it recoil and dissolve. It never touches the player directly;
 * if it reaches you it drains your light for a moment and falls apart.
 */
export class Hollow extends Entity {
  mode: HollowMode = "idle";
  private readonly fig: Figure;
  private tick = 0;
  private headSnap = 0;
  private headHold = 0;
  private hitTime = 0;
  /** Seconds of flashlight it has endured; it breaks up when this reaches the limit. */
  exposure = 0;
  /** Progressive horror level, 0 (a hollow-chested figure) to 3 (barely a figure at all). */
  corruption = 0;

  private readonly light: PointLight;

  constructor(scene: Scene) {
    const fig = buildHollow(scene);
    super(fig);
    this.fig = fig;
    // A faint cold light that lights only it, from the viewer's side, so its incomplete shape separates from the dark behind it (it is a thing the eye has to find, not a black hole).
    this.light = new PointLight("hollow-rim", V3.Zero(), scene);
    this.light.diffuse = new Color3(0.62, 0.7, 0.9);
    this.light.specular = Color3.Black();
    this.light.range = 4.5;
    this.light.intensity = 0.7;
    this.light.includedOnlyMeshes = [...this.meshList];
    this.light.setEnabled(false);
    this.maxVisibility = 0.95;
    this.fadeRate = 2.2;
  }

  setCorruption(c: number): void {
    this.corruption = c;
    this.fig.rig?.set(c);
    // The more of it is gone, the less of it there is to see.
    this.maxVisibility = 0.95 - 0.2 * Math.min(1, c / 3);
  }

  override async prewarm(): Promise<void> {
    this.light.setEnabled(true);
    // Its body is always very slightly out of proportion (the glitch), which is a different shader (non-uniform scaling) from the exact figure the warm-up drew.
    const sy = this.fig.body.scaling.y;
    this.fig.body.scaling.y = sy * 1.03;
    for (const m of this.meshList) m.computeWorldMatrix(true);
    try {
      await super.prewarm();
    } finally {
      this.fig.body.scaling.y = sy;
      this.light.setEnabled(this.root.isEnabled() && this.alpha > 0.02);
    }
  }

  override warm(on: boolean): void {
    super.warm(on);
    // The rim light is switched on for the warm-up so the materials are compiled with it.
    if (on) this.light.setEnabled(true);
    else this.light.setEnabled(this.root.isEnabled() && this.alpha > 0.02);
  }

  protected override heightHint(): number {
    return 1.9;
  }

  appear(x: number, z: number, level: 0 | 1, facing: Vector3, fadeSeconds = 0.5): void {
    this.place(x, z, level);
    this.root.rotation.y = Math.atan2(facing.x - x, facing.z - z);
    this.exposure = 0;
    this.mode = "idle";
    this.show(fadeSeconds);
  }

  /** Steps a short distance toward (x, z) in a sudden jump. */
  jumpToward(x: number, z: number, dist: number): void {
    const dx = x - this.root.position.x;
    const dz = z - this.root.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const k = Math.min(dist, d) / d;
    this.root.position.x += dx * k;
    this.root.position.z += dz * k;
    this.root.rotation.y = Math.atan2(dx, dz);
  }

  /** Keeps the rim light on the side of the viewer (called each frame by the director). */
  setViewer(p: V3): void {
    const on = this.root.isEnabled() && this.alpha > 0.02;
    if (this.light.isEnabled() !== on) this.light.setEnabled(on);
    if (!on) return;
    const dx = p.x - this.root.position.x;
    const dz = p.z - this.root.position.z;
    const d = Math.hypot(dx, dz) || 1;
    this.light.position.set(this.root.position.x + (dx / d) * 1.1, this.root.position.y + 1.5, this.root.position.z + (dz / d) * 1.1);
    this.light.intensity = 0.7 * this.alpha;
  }

  /** Turns the head sharply toward a point (a snap, never a smooth turn) and holds it there until the next glitch tick. */
  snapHeadToward(x: number, z: number): void {
    this.headSnap = Math.atan2(x - this.root.position.x, z - this.root.position.z) - this.root.rotation.y;
    this.headHold = 0.5;
  }

  override update(dt: number): void {
    super.update(dt);
    if (!this.root.isEnabled()) return;
    this.tick += dt;
    // Frame-skipping glitch: pose changes in sudden steps at about 9 fps.
    if (this.tick > 0.11) {
      this.tick = 0;
      this.fig.body.rotation.z = (Math.random() - 0.5) * 0.1;
      this.fig.body.scaling.y = 1 + (Math.random() - 0.5) * 0.06;
      this.fig.head.rotation.y = this.headHold > 0 ? this.headSnap : (Math.random() - 0.5) * 0.6;
    }
    this.hitTime = Math.max(0, this.hitTime - dt);
    this.headHold = Math.max(0, this.headHold - dt);
  }

  /** Reports the flashlight on it. Returns true once it has broken up. */
  lit(dt: number): boolean {
    this.exposure += dt;
    this.mode = "recoil";
    this.fig.body.rotation.z = (Math.random() - 0.5) * 0.4;
    return this.exposure > 1.4;
  }
}
