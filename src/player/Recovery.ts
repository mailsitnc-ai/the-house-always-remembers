import type { Scene } from "@babylonjs/core/scene";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { PlayerController } from "./PlayerController";
import { roomAt } from "../world/Layout";

type Collider = { position: Vector3; _collideWithWorld(v: Vector3): void };

/**
 * Safety net for a player who is wedged against furniture or a doorway. A collision audit of every floor found no trap, so this should never be needed;
 * it exists so that if one is ever found the player is never stuck for good.
 *
 * Detection looks at what happened, not at the clock: movement keys held for `HOLD` seconds while the player moved less than `MIN` metres.
 * Recovery (the U key) only ever moves Daniel a short distance (1.6 m at most) to the nearest open spot in the same room and on the same floor, in line of sight
 * of where he stands (so never through a wall, a door leaf or furniture). It changes nothing else: no flag, objective or interaction.
 */
const HOLD = 3;
const MIN = 0.12;

export class StuckGuard {
  private held = 0;
  private sampleT = 0;
  private lx = 0;
  private lz = 0;
  private told = false;

  /** Returns true once, when the player has been pushing against something for HOLD seconds without getting anywhere. */
  update(dt: number, wantsMove: boolean, x: number, z: number): boolean {
    this.sampleT += dt;
    if (!wantsMove) {
      this.held = 0;
      this.told = false;
      this.sampleT = 0;
      this.lx = x;
      this.lz = z;
      return false;
    }
    if (this.sampleT >= 1) {
      this.held = Math.hypot(x - this.lx, z - this.lz) < MIN ? this.held + this.sampleT : 0;
      this.sampleT = 0;
      this.lx = x;
      this.lz = z;
    }
    if (this.held >= HOLD && !this.told) {
      this.told = true;
      return true;
    }
    return false;
  }
}

/** Moves the player to the nearest open spot (see above). Returns true if he was moved. */
export function stepFree(scene: Scene, player: PlayerController, awayFrom: { x: number; z: number } | null): boolean {
  const cam = player.camera as unknown as Collider;
  const p = player.position;
  const level: 0 | 1 = player.floorBase > 1.5 ? 1 : 0;
  const room = roomAt(p.x, p.z, level);
  if (!room) return false;
  const x0 = p.x;
  const y0 = p.y;
  const z0 = p.z;
  const open = (x: number, z: number): boolean => {
    for (let a = 0; a < 8; a++) {
      cam.position.set(x, y0, z);
      cam._collideWithWorld(new Vector3(Math.cos((a * Math.PI) / 4) * 0.06, 0, Math.sin((a * Math.PI) / 4) * 0.06));
      if (Math.hypot(cam.position.x - x, cam.position.z - z) < 0.05) return false;
    }
    return true;
  };
  const clear = (x: number, z: number): boolean => {
    const dir = new Vector3(x - x0, 0, z - z0);
    const d = dir.length();
    const hit = scene.pickWithRay(new Ray(new Vector3(x0, y0 - 0.5, z0), dir.normalize(), d), (m) => m.checkCollisions && m.isEnabled() && m.isVisible);
    return !hit?.hit;
  };
  let best: { x: number; z: number } | null = null;
  outer: for (const r of [0.4, 0.6, 0.8, 1.0, 1.3, 1.6]) {
    for (let a = 0; a < 16; a++) {
      const x = x0 + Math.cos((a * Math.PI) / 8) * r;
      const z = z0 + Math.sin((a * Math.PI) / 8) * r;
      if (roomAt(x, z, level) !== room) continue;
      if (awayFrom && Math.hypot(x - awayFrom.x, z - awayFrom.z) < 2.5) continue;
      if (open(x, z) && clear(x, z)) {
        best = { x, z };
        break outer;
      }
    }
  }
  cam.position.set(best ? best.x : x0, y0, best ? best.z : z0);
  return best !== null;
}
