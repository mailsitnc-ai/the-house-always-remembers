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
  /** The Matron's corruption level, 0 (composed) to 3 (the true form). See Corruption.ts. */
  corruption = 0;
  private stepT = 0;
  /** Ceiling height she must fit under in the house (the ground-floor and upstairs ceilings are 2.8 m). Null: no limit (the studio). */
  ceiling: number | null = 2.7;
  private appliedCeiling: number | null | undefined = undefined;
  private onArrive: (() => void) | null = null;
  /** Smoothed loudness of her voice, 0..1, that drives the mouth and gestures. */
  private talk = 0;
  private talkIn = 0;

  constructor(scene: Scene) {
    const fig = buildMatron(scene);
    super(fig);
    this.fig = fig;
    this.fadeRate = 0.9;
  }

  protected override heightHint(): number {
    return 2.3;
  }

  setCorruption(c: number): void {
    this.corruption = c;
    this.fig.rig?.set(c);
  }

  /** True while the timed transformation into the true form is under way (it has begun and not finished). */
  get transforming(): boolean {
    return this.fig.rig?.playing ?? false;
  }

  /** Begins the timed transformation from the start (development captures; in the game it begins by itself). */
  beginTransformation(): void {
    this.fig.rig?.begin?.();
  }

  /** True once the transformation has run its full length (or was skipped because it had already been seen). */
  get transformFinished(): boolean {
    const r = this.fig.rig;
    return !r || (r.time ?? -1) >= (r.duration ?? 0);
  }

  /** Seconds the transformation has run (-1 before it begins). */
  get transformTime(): number {
    return this.fig.rig?.time ?? -1;
  }

  /** Skips the transformation: she is already in her true form (a game that has already seen it). */
  skipTransformation(): void {
    const r = this.fig.rig;
    if (r?.seek && r.duration !== undefined) r.seek(r.duration);
  }

  /** Holds the transformation at t seconds (development captures). */
  seekTransformation(t: number): void {
    this.fig.rig?.seek?.(t);
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
  private animateSpeech(dt: number, player?: Vector3): void {
    this.talk += (this.talkIn - this.talk) * Math.min(1, dt * 14);
    const { arms } = this.fig;
    // Where Daniel is, relative to where her head points: her eyes use it to hold his gaze.
    const gaze = player ? angleDiff(this.root.rotation.y + this.fig.head.rotation.y, Math.atan2(player.x - this.root.position.x, player.z - this.root.position.z)) : 0;
    // The transformation waits until she has faded in, so the composed pose is actually seen.
    this.fig.rig?.tick(dt, Math.min(1, this.talk * 1.1), gaze, this.alpha > 0.97);
    if (!this.fig.rig) this.fig.setMouth?.(Math.min(1, this.talk * 1.1));
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
    // The chamber is built far from the house (x = 60) and has a 2.5 m ceiling; the house has 2.8 m. She stoops under either.
    const want = this.root.position.x > 30 ? 2.42 : this.ceiling;
    if (want !== this.appliedCeiling) {
      this.appliedCeiling = want;
      this.fig.rig?.limit?.(want);
    }
    if (this.state === "hidden" || !this.root.isEnabled()) return;
    this.clock += dt;
    this.animateSpeech(dt, player);
    if (player) this.followWith(player, dt);
    if (this.state === "walking") this.stepAlongPath(dt, player);
    else {
      this.fig.body.rotation.z = 0;
      this.fig.body.rotation.x = 0;
    }
    this.fig.rig?.post?.();
  }

  /** The head follows the player slowly; the body only turns once the head can turn no further. */
  private followWith(p: Vector3, dt: number): void {
    const want = Math.atan2(p.x - this.root.position.x, p.z - this.root.position.z);
    const rel = angleDiff(this.root.rotation.y, want);
    const headNow = this.fig.head.rotation.y;
    // Completely still: for a few seconds of the transformation the head does not follow Daniel at all.
    if ((this.fig.rig?.stillness ?? 0) > 0.6) return;
    const lim = 1.1;
    const goal = Math.max(-lim, Math.min(lim, rel));
    const step = this.corruption > 1.3 ? 0.3 : 0;
    if (step > 0) {
      // Unsettlingly precise: the head does not glide, it arrives, in small exact jumps.
      this.stepT += dt;
      if (this.stepT >= step) {
        const turn = this.headRate * this.stepT * (1 + 0.5 * (this.corruption - 1.3));
        this.fig.head.rotation.y += Math.max(-turn, Math.min(turn, goal - headNow));
        this.stepT = 0;
      }
    } else this.fig.head.rotation.y += Math.max(-this.headRate * dt, Math.min(this.headRate * dt, goal - headNow));
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
