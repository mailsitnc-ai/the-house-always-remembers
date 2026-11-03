import type { Scene } from "@babylonjs/core/scene";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { buildHollow, type Figure } from "./CharacterBuilder";
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
  private hitTime = 0;
  /** Seconds of flashlight it has endured; it breaks up when this reaches the limit. */
  exposure = 0;
  /** Progressive horror level, 0 (a hollow-chested figure) to 3 (barely a figure at all). */
  corruption = 0;

  constructor(scene: Scene) {
    const fig = buildHollow(scene);
    super(fig);
    this.fig = fig;
    this.maxVisibility = 0.95;
    this.fadeRate = 2.2;
  }

  setCorruption(c: number): void {
    this.corruption = c;
    this.fig.rig?.set(c);
    // The more of it is gone, the less of it there is to see.
    this.maxVisibility = 0.95 - 0.2 * Math.min(1, c / 3);
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

  override update(dt: number): void {
    super.update(dt);
    if (!this.root.isEnabled()) return;
    this.tick += dt;
    // Frame-skipping glitch: pose changes in sudden steps at about 9 fps.
    if (this.tick > 0.11) {
      this.tick = 0;
      this.fig.body.rotation.z = (Math.random() - 0.5) * 0.1;
      this.fig.body.scaling.y = 1 + (Math.random() - 0.5) * 0.06;
      this.fig.head.rotation.y = (Math.random() - 0.5) * 0.6;
    }
    this.hitTime = Math.max(0, this.hitTime - dt);
  }

  /** Reports the flashlight on it. Returns true once it has broken up. */
  lit(dt: number): boolean {
    this.exposure += dt;
    this.mode = "recoil";
    this.fig.body.rotation.z = (Math.random() - 0.5) * 0.4;
    return this.exposure > 1.4;
  }
}
