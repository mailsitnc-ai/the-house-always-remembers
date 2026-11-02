import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { floorHeight, roomAt, type RoomId } from "../world/Layout";
import type { Figure } from "./CharacterBuilder";

/** Shortest signed angle from `a` to `b`. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Shared behaviour for everything supernatural: place it in the house, fade it in and out, turn it toward something at a
 * limited rate. Subclasses add their own movement and rules.
 */
export abstract class Entity {
  readonly root: TransformNode;
  protected readonly meshes: Mesh[];
  protected fade = 0;
  protected target = 0;
  protected fadeRate = 1.5;
  /** Maximum visibility once faded in. */
  protected maxVisibility = 1;
  level: 0 | 1 = 0;

  constructor(figure: Pick<Figure, "root" | "meshes">) {
    this.root = figure.root;
    this.meshes = figure.meshes;
  }

  get visible(): boolean {
    return this.target > 0;
  }

  get alpha(): number {
    return this.fade;
  }

  get position(): Vector3 {
    return this.root.position;
  }

  get room(): RoomId | null {
    return roomAt(this.root.position.x, this.root.position.z, this.level);
  }

  /** Puts the entity at (x, z) on a storey, standing on the floor (or stairs). */
  place(x: number, z: number, level: 0 | 1, yaw?: number): void {
    this.level = level;
    this.root.position.set(x, floorHeight(x, z, level * 3), z);
    if (yaw !== undefined) this.root.rotation.y = yaw;
  }

  show(fadeSeconds = 0.8): void {
    this.target = 1;
    this.fadeRate = 1 / Math.max(0.05, fadeSeconds);
    this.root.setEnabled(true);
  }

  hide(fadeSeconds = 0.8): void {
    this.target = 0;
    this.fadeRate = 1 / Math.max(0.05, fadeSeconds);
  }

  /** Removes it immediately. */
  vanish(): void {
    this.target = 0;
    this.fade = 0;
    this.apply();
    this.root.setEnabled(false);
  }

  /** Turns the root toward a point at `rate` radians per second. */
  turnToward(x: number, z: number, rate: number, dt: number): void {
    const want = Math.atan2(x - this.root.position.x, z - this.root.position.z);
    const d = angleDiff(this.root.rotation.y, want);
    this.root.rotation.y += Math.max(-rate * dt, Math.min(rate * dt, d));
  }

  distanceTo(p: Vector3): number {
    return Math.hypot(p.x - this.root.position.x, p.z - this.root.position.z);
  }

  /** True if the camera is looking toward this entity (within `cosMin` of the view axis) with a clear line of sight. */
  seenBy(camPos: Vector3, camForward: Vector3, cosMin = 0.55): boolean {
    const to = this.root.position.add(new Vector3(0, this.heightHint() * 0.6, 0)).subtract(camPos);
    const d = to.length();
    if (d < 0.01) return true;
    return Vector3.Dot(camForward, to.scale(1 / d)) > cosMin;
  }

  protected heightHint(): number {
    return 1.8;
  }

  update(dt: number): void {
    if (this.fade !== this.target * this.maxVisibility) {
      const goal = this.target * this.maxVisibility;
      this.fade += Math.sign(goal - this.fade) * Math.min(Math.abs(goal - this.fade), this.fadeRate * dt);
      this.apply();
      if (this.fade <= 0.001 && this.target === 0) this.root.setEnabled(false);
    }
  }

  protected apply(): void {
    for (const m of this.meshes) m.visibility = this.fade;
  }

  /** Called during shader warm-up so the entity's materials are compiled before the game starts. */
  warm(on: boolean): void {
    if (on) {
      this.root.setEnabled(true);
      for (const m of this.meshes) {
        m.visibility = 1;
        m.alwaysSelectAsActiveMesh = true;
      }
    } else {
      for (const m of this.meshes) m.alwaysSelectAsActiveMesh = false;
      this.apply();
      if (this.target === 0) this.root.setEnabled(false);
    }
  }
}
