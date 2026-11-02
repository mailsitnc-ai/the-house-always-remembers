import type { Scene } from "@babylonjs/core/scene";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { buildMatron, type Figure } from "./CharacterBuilder";
import { Entity, angleDiff } from "./Entity";

export type MatronState = "hidden" | "still" | "walking";

/**
 * The Matron. She is never fast and never loud. She stands perfectly still, turns her head slowly to follow you, and
 * when she moves she walks at one steady pace with no hurry and no bob. Stillness is the point: nothing on her moves
 * unless she has decided it should.
 */
export class Matron extends Entity {
  state: MatronState = "hidden";
  private readonly fig: Figure;
  private path: { x: number; z: number }[] = [];
  private speed = 1.0;
  private clock = 0;
  /** Head turn rate toward the player, radians per second. */
  headRate = 0.55;
  private onArrive: (() => void) | null = null;
  /** Smoothed loudness of her voice, 0..1, that drives the mouth and gestures. */
  private talk = 0;
  private talkIn = 0;
  /** The mouth is a thin ellipsoid; speech scales it relative to this resting height. */
  private readonly mouthBase: number;

  constructor(scene: Scene) {
    const fig = buildMatron(scene);
    super(fig);
    this.fig = fig;
    this.mouthBase = fig.mouth?.scaling.y ?? 1;
    this.fadeRate = 0.9;
  }

  protected override heightHint(): number {
    return 2.3;
  }

  /** Appears standing at (x, z), facing a direction. */
  appear(x: number, z: number, level: 0 | 1, yaw: number, fadeSeconds = 2.2): void {
    this.place(x, z, level, yaw);
    this.fig.head.rotation.set(0, 0, 0);
    this.state = "still";
    this.path = [];
    this.show(fadeSeconds);
  }

  /** Walks along a path at a constant pace, then calls `done`. */
  walk(points: { x: number; z: number }[], speed: number, done?: () => void): void {
    this.path = [...points];
    this.speed = speed;
    this.state = "walking";
    this.onArrive = done ?? null;
  }

  stop(): void {
    this.path = [];
    this.state = "still";
  }

  /** Fades out where she stands. */
  leave(fadeSeconds = 2.5): void {
    this.state = "hidden";
    this.path = [];
    this.hide(fadeSeconds);
  }

  /** Feed the current loudness of her speech (0 when silent). */
  speak(level: number): void {
    this.talkIn = Math.min(1, level * 4);
  }

  /** Mouth opening, a small head tilt and a slight lift of the hands while she speaks; still otherwise. */
  private animateSpeech(dt: number): void {
    this.talk += (this.talkIn - this.talk) * Math.min(1, dt * 14);
    const { mouth, arms } = this.fig;
    if (mouth) mouth.scaling.y = this.mouthBase * (1 + this.talk * 4.5);
    if (arms) {
      const lift = this.talk * 0.1 + (this.talkIn > 0.05 ? Math.sin(this.clock * 2.1) * 0.025 : 0);
      arms[0].rotation.x = -lift;
      arms[1].rotation.x = -lift * 0.6;
    }
    if (this.talkIn > 0.05) this.fig.head.rotation.z += (Math.sin(this.clock * 0.7) * 0.05 - this.fig.head.rotation.z) * Math.min(1, dt * 2);
    else this.fig.head.rotation.z *= 1 - Math.min(1, dt * 1.5);
  }

  override update(dt: number, player?: Vector3): void {
    super.update(dt);
    if (this.state === "hidden" || !this.root.isEnabled()) return;
    this.clock += dt;
    this.animateSpeech(dt);
    if (player) this.followWith(player, dt);
    if (this.state === "walking") this.stepAlongPath(dt, player);
    else {
      this.fig.body.rotation.z = 0;
      this.fig.body.rotation.x = 0;
    }
  }

  /** The head follows the player slowly; the body only turns once the head can turn no further. */
  private followWith(p: Vector3, dt: number): void {
    const want = Math.atan2(p.x - this.root.position.x, p.z - this.root.position.z);
    const rel = angleDiff(this.root.rotation.y, want);
    const headNow = this.fig.head.rotation.y;
    const lim = 1.1;
    const goal = Math.max(-lim, Math.min(lim, rel));
    this.fig.head.rotation.y += Math.max(-this.headRate * dt, Math.min(this.headRate * dt, goal - headNow));
    if (Math.abs(rel) > lim && this.state === "still") this.root.rotation.y += Math.sign(rel) * Math.min(Math.abs(rel) - lim, 0.3 * dt);
    this.fig.head.rotation.x = 0.04;
  }

  private stepAlongPath(dt: number, player?: Vector3): void {
    const next = this.path[0];
    if (!next) {
      this.state = "still";
      const cb = this.onArrive;
      this.onArrive = null;
      cb?.();
      return;
    }
    const dx = next.x - this.root.position.x;
    const dz = next.z - this.root.position.z;
    const dist = Math.hypot(dx, dz);
    const step = this.speed * dt;
    if (dist <= step) {
      this.root.position.x = next.x;
      this.root.position.z = next.z;
      this.path.shift();
    } else {
      this.root.position.x += (dx / dist) * step;
      this.root.position.z += (dz / dist) * step;
      // Body faces the direction of travel, slowly and smoothly.
      const want = Math.atan2(dx, dz);
      this.root.rotation.y += Math.max(-1.2 * dt, Math.min(1.2 * dt, angleDiff(this.root.rotation.y, want)));
    }
    // A very slight, even sway of the hem and no vertical bob: she glides.
    this.fig.body.rotation.z = Math.sin(this.clock * 1.4) * 0.012;
    this.fig.body.rotation.x = 0.02;
    void player;
  }

  /** Current floor height is tracked by the director; this keeps her on the stairs when she climbs. */
  snapToFloor(h: number): void {
    this.root.position.y = h;
  }
}
