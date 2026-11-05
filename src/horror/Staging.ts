import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";
import { floorHeight, inStairs, roomAt, type RoomId } from "../world/Layout";
import type { HorrorDirector } from "./HorrorDirector";

/**
 * Where an entity may be put so that a scare is framed properly and never wrong: on the floor of a real room, clear of walls and furniture (nothing of her inside a
 * collider), with a clear line of sight to the player when she is meant to be seen, and never so close that she is inside the camera. Every authored scare places
 * its figure through here, and `validate()` (development) checks the rules over every room of the house.
 */
export const MIN_VISIBLE = 1.7;

export class Staging {
  private colliders: AbstractMesh[] | null = null;
  private readonly ray = new Ray(Vector3.Zero(), Vector3.Forward(), 1);

  constructor(
    private readonly scene: Scene,
    private readonly h: HorrorDirector,
  ) {}

  private get solids(): AbstractMesh[] {
    if (!this.colliders) this.colliders = this.scene.meshes.filter((m) => m.checkCollisions && !m.isDisposed());
    return this.colliders;
  }

  /** Builds the collider list now (it is cached), so the first placement test does not pay for it. */
  prime(): void {
    void this.solids;
  }

  /** Is anything solid between two points (the closed door leaves count; open ones do not)? */
  blocked(from: Vector3, to: Vector3): boolean {
    const dir = to.subtract(from);
    const len = dir.length();
    if (len < 0.01) return false;
    this.ray.origin.copyFrom(from);
    this.ray.direction.copyFrom(dir.scale(1 / len));
    this.ray.length = len - 0.05;
    for (const m of this.solids) {
      if (!m.checkCollisions || !m.isEnabled()) continue;
      const hit = this.ray.intersectsMesh(m);
      if (hit.hit) return true;
    }
    return false;
  }

  /** Room floor, not the stairs, and no solid within 0.35 m all round at knee and chest height. */
  fits(x: number, z: number, level: 0 | 1): boolean {
    if (!roomAt(x, z, level) || inStairs(x, z)) return false;
    const y0 = floorHeight(x, z, level * 3);
    const o = new Vector3();
    for (const dy of [0.5, 1.3]) {
      for (let a = 0; a < 8; a++) {
        o.set(x, y0 + dy, z);
        const t = o.add(new Vector3(Math.cos((a * Math.PI) / 4) * 0.4, 0, Math.sin((a * Math.PI) / 4) * 0.4));
        if (this.blocked(o, t)) return false;
      }
    }
    return true;
  }

  /** A spot a figure can stand and be seen from the player's eye: fits, clear line of sight, at least `min` metres away. */
  visible(x: number, z: number, level: 0 | 1, min = MIN_VISIBLE): boolean {
    const p = this.h.pos;
    if (Math.hypot(x - p.x, z - p.z) < min) return false;
    if (!this.fits(x, z, level)) return false;
    const head = new Vector3(x, floorHeight(x, z, level * 3) + 1.7, z);
    return !this.blocked(p, head);
  }

  /** The farthest visible spot between `far` and `near` metres along a horizontal direction from the player (yaw radians, as the camera's). Null if none. */
  along(yaw: number, far: number, near: number, level: 0 | 1 = this.h.level(), min = MIN_VISIBLE): { x: number; z: number; dist: number } | null {
    const p = this.h.pos;
    const sx = Math.sin(yaw);
    const sz = Math.cos(yaw);
    for (let d = far; d >= Math.max(near, min); d -= 0.3) {
      const x = p.x + sx * d;
      const z = p.z + sz * d;
      if (this.visible(x, z, level, min)) return { x, z, dist: d };
    }
    return null;
  }

  /** Room-aware version of `along` for a spot behind the player (the position she steps into when he turns). */
  roomOf(x: number, z: number, level: 0 | 1): RoomId | null {
    return roomAt(x, z, level);
  }

  /**
   * Development: for every standing point of every room (grid 0.5 m) checks the rules a staged figure relies on, and reports how many of the points `fits` accepts.
   * A point accepted must be a floor of a real room clear of solids; this is the same test every scare uses, so a scare can never place her inside furniture or a wall.
   */
  validate(): { points: number; accepted: number; rejected: number; byRoom: Record<string, [number, number]> } {
    const byRoom: Record<string, [number, number]> = {};
    let points = 0;
    let accepted = 0;
    for (const level of [0, 1] as const) {
      for (let x = 0.4; x < 14; x += 0.5) {
        for (let z = 0.4; z < 11; z += 0.5) {
          const room = roomAt(x, z, level);
          if (!room) continue;
          points++;
          const ok = this.fits(x, z, level);
          const r = (byRoom[room] ??= [0, 0]);
          r[0]++;
          if (ok) {
            r[1]++;
            accepted++;
          }
        }
      }
    }
    return { points, accepted, rejected: points - accepted, byRoom };
  }
}
