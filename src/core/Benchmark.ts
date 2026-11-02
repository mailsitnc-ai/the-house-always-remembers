import type { PlayerController } from "../player/PlayerController";

export interface Waypoint {
  x: number;
  z: number;
  /** Look direction (radians, 0 = north). Omit to face the direction of travel. */
  yaw?: number;
  /** Pause here while turning, in seconds. */
  dwell?: number;
}

/** A fixed route through every room, so runs are comparable between machines and builds. */
export const BENCH_PATH: Waypoint[] = [
  { x: 6.5, z: 1.0, yaw: 0, dwell: 1 }, { x: 6.5, z: 2.6 }, { x: 6.0, z: 4.0 }, { x: 5.6, z: 4.5 },
  { x: 3.5, z: 4.5, yaw: -1.57, dwell: 0.8 }, { x: 3.0, z: 2.5, yaw: 3.14, dwell: 0.8 }, { x: 3.0, z: 5.0 },
  { x: 2.3, z: 6.4 }, { x: 2.6, z: 8.3, yaw: 0, dwell: 1 }, { x: 4.5, z: 9.5 }, { x: 6.5, z: 9.5 }, { x: 9.0, z: 9.5 },
  { x: 10.5, z: 8.5, yaw: 0.8, dwell: 1 }, { x: 12.0, z: 7.5 }, { x: 9.0, z: 9.5 }, { x: 6.5, z: 9.5 },
  { x: 6.5, z: 8.2 }, { x: 6.0, z: 6.0 }, { x: 6.0, z: 3.0 }, { x: 6.5, z: 1.5 },
  { x: 9.5, z: 1.5, yaw: 1.57, dwell: 0.6 }, { x: 11.0, z: 3.0, yaw: 0.7, dwell: 1 }, { x: 12.0, z: 3.8 }, { x: 9.5, z: 1.5 },
  { x: 7.0, z: 1.5 }, { x: 7.3, z: 3.3 }, { x: 7.3, z: 7.6 }, { x: 6.0, z: 8.0 },
  { x: 6.0, z: 4.7 }, { x: 4.0, z: 4.7 }, { x: 2.5, z: 3.0, yaw: 0, dwell: 1 }, { x: 1.5, z: 1.2 }, { x: 4.0, z: 4.7 },
  { x: 6.0, z: 6.0 }, { x: 6.0, z: 8.0 }, { x: 4.0, z: 8.0 }, { x: 2.5, z: 8.6, yaw: 0.3, dwell: 1 }, { x: 4.0, z: 8.0 },
  { x: 6.8, z: 8.5 }, { x: 9.5, z: 8.5 }, { x: 10.3, z: 9.6, yaw: 0, dwell: 0.8 }, { x: 7.0, z: 8.5 },
  { x: 6.5, z: 9.0 }, { x: 6.5, z: 10.3, yaw: 3.14, dwell: 0.8 }, { x: 6.5, z: 9.0 },
  { x: 7.3, z: 7.6 }, { x: 7.3, z: 3.4 }, { x: 6.5, z: 2.0 },
];

const SPEED = 2.4;

/** Walks the camera along BENCH_PATH at a fixed speed. The player's own controls are bypassed. */
export class Benchmark {
  active = false;
  private i = 0;
  private t = 0;
  private dwell = 0;
  private yaw = 0;

  constructor(private readonly player: PlayerController) {}

  start(): void {
    this.active = true;
    this.i = 0;
    this.t = 0;
    this.dwell = 0;
    const p = BENCH_PATH[0];
    this.yaw = p.yaw ?? 0;
    this.player.setBase(0);
    this.player.position.set(p.x, 1.65, p.z);
    this.player.setLook(this.yaw, 0.05);
  }

  stop(): void {
    this.active = false;
  }

  /** Advances the walk; returns false once the route is finished. */
  update(dt: number): boolean {
    if (!this.active) return false;
    const a = BENCH_PATH[this.i];
    const b = BENCH_PATH[this.i + 1];
    if (!b) {
      this.active = false;
      return false;
    }
    if (this.dwell > 0) {
      this.dwell -= dt;
      this.apply(a.x, a.z, this.turn(this.yaw, a.yaw ?? this.yaw, dt * 2.5));
      return true;
    }
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    this.t += (SPEED * dt) / len;
    const f = Math.min(1, this.t);
    const heading = Math.atan2(dx, dz);
    const target = b.yaw !== undefined && f > 0.7 ? b.yaw : heading;
    this.yaw = this.turn(this.yaw, target, dt * 3);
    this.apply(a.x + dx * f, a.z + dz * f, this.yaw);
    if (this.t >= 1) {
      this.i++;
      this.t = 0;
      this.dwell = b.dwell ?? 0;
    }
    return true;
  }

  private apply(x: number, z: number, yaw: number): void {
    this.yaw = yaw;
    this.player.position.x = x;
    this.player.position.z = z;
    this.player.setLook(yaw, 0.05);
    this.player.update(0, false); // refreshes floor height (stairs) for the new position
  }

  private turn(from: number, to: number, k: number): number {
    let d = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return from + d * Math.min(1, k);
  }
}
