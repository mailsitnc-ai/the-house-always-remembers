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
/**
 * An entity's materials use at most two lights (the flashlight, and the nearest lamp or its own key light). Every different number of lights a material is lit by is a different
 * compiled shader, and which lamps reach a figure depends on the room it is in, so with no cap the first appearance in each new lighting combination compiled a new shader mid-scare.
 * Two is what the eye can use on a figure this dark, and it makes the variants few enough to prepare in advance.
 */
export function capLights(meshes: readonly Mesh[]): void {
  for (const m of meshes) {
    const mat = m.material as { maxSimultaneousLights?: number } | null;
    if (mat && "maxSimultaneousLights" in mat) mat.maxSimultaneousLights = 2;
  }
}

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
    capLights(this.meshes);
  }

  /** The meshes that make up the figure (for a reflection's render list and for lights that light only it). */
  get meshList(): readonly Mesh[] {
    return this.meshes;
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

  private prewarming = false;

  /**
   * Compiles the shaders this entity's materials need *for the lights as they are now* and in the faded (alpha-blended) state it appears in, while it is not visible.
   * The loading-screen warm-up cannot cover every combination of lamps that are on in a room, and a variant first needed at the moment of a scare costs a frame. Compiling is
   * asynchronous and cached by the engine, so doing it a moment after the player enters a room is nearly free and the scare itself then compiles nothing.
   */
  async prewarm(): Promise<void> {
    if (this.prewarming || this.target > 0 || this.fade > 0.01) return;
    this.prewarming = true;
    const saved = this.meshes.map((m) => m.visibility);
    try {
      for (const m of this.meshes) m.visibility = 0.5;
      await Promise.all(this.meshes.map((m) => (m.material ? m.material.forceCompilationAsync(m).catch(() => undefined) : undefined)));
    } finally {
      this.meshes.forEach((m, i) => (m.visibility = this.target > 0 || this.fade > 0.01 ? m.visibility : saved[i]));
      this.prewarming = false;
    }
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
