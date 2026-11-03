import type { Scene } from "@babylonjs/core/scene";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { buildWitness, type WitnessFigure } from "./CharacterBuilder";
import { Entity, angleDiff } from "./Entity";

/**
 * The Witness: a figure from the memory of the photographs. It looks like a long-exposure print: amber, grainy, hatted,
 * holding a small picture, with a cooler double-exposure afterimage that lags behind it. It never approaches and never
 * touches anything.
 *
 * How it moves is unlike the others. The Matron is still and deliberate; the Hollow jumps. The Witness drifts, almost too
 * slowly to see, toward the evidence it guards, and every few seconds the "exposure" slips: the afterimage jumps aside and
 * snaps back. It is shy: look at it and its head drops; look away and it lifts its face toward you.
 */
export class Witness extends Entity {
  private readonly fig: WitnessFigure;
  private readonly ghost: WitnessFigure;
  private bow = 0;
  private bowing = false;
  private clock = Math.random() * 10;
  private slip = 0;
  private nextSlip = 3;
  private goal: { x: number; z: number } | null = null;
  /** Seconds the player has been looking at it. */
  gaze = 0;
  /** Progressive horror level, 0 (a quiet figure with a photograph) to 3 (its form comes apart). It never becomes aggressive. */
  corruption = 0;
  /** Where the camera is; set by the director each frame so the head can react. */
  private seen = false;

  constructor(scene: Scene) {
    const fig = buildWitness(scene, false);
    const ghost = buildWitness(scene, true);
    super({ root: fig.root, meshes: [...fig.meshes] });
    this.fig = fig;
    this.ghost = ghost;
    this.maxVisibility = 0.85;
    this.fadeRate = 0.5;
  }

  protected override heightHint(): number {
    return 1.8;
  }

  setCorruption(c: number): void {
    this.corruption = c;
    this.apply();
  }

  appear(x: number, z: number, level: 0 | 1, towardX: number, towardZ: number): void {
    this.place(x, z, level);
    this.root.rotation.y = Math.atan2(towardX - x, towardZ - z);
    this.goal = { x: x + (towardX - x) * 0.12, z: z + (towardZ - z) * 0.12 };
    this.gaze = 0;
    this.bowing = false;
    this.bow = 0;
    this.show(3);
    this.ghost.root.setEnabled(true);
  }

  /** The evidence was taken: it lowers the photograph and its head, and fades. */
  acknowledge(): void {
    this.bowing = true;
    this.hide(3.5);
  }

  override vanish(): void {
    super.vanish();
    this.ghost.root.setEnabled(false);
  }

  /** Report whether the player is looking at it (the director calls this each frame). */
  setSeen(seen: boolean): void {
    this.seen = seen;
  }

  override update(dt: number): void {
    super.update(dt);
    if (!this.root.isEnabled()) return;
    this.clock += dt;
    // Film crawl: the stipple mask drifts, so the figure never looks the same twice.
    for (const f of [this.fig, this.ghost]) {
      f.grain.uOffset += dt * 0.04;
      f.grain.vOffset -= dt * 0.12;
    }
    // Drift toward the evidence, too slowly to catch.
    if (this.goal && !this.bowing) {
      const dx = this.goal.x - this.root.position.x;
      const dz = this.goal.z - this.root.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        this.root.position.x += (dx / d) * Math.min(d, 0.035 * dt);
        this.root.position.z += (dz / d) * Math.min(d, 0.035 * dt);
      }
    }
    // Shy: head drops when watched, lifts toward the player when not.
    const goalPitch = this.bowing ? 0.95 : this.seen ? 0.55 : 0.12;
    this.fig.head.rotation.x += (goalPitch - this.fig.head.rotation.x) * Math.min(1, dt * 1.4);
    if (this.bowing) this.bow = Math.min(1, this.bow + dt * 0.4);
    // Later it lifts the photograph, little by little, to where its face should be, and the hand begins to shake.
    const c = this.corruption;
    const lift = Math.min(1, Math.max(0, (c - 0.8) / 2.2)) * 1.0;
    this.fig.photoArm.rotation.x = this.bowing ? this.bow * 0.9 : -lift + Math.sin(this.clock * 0.5) * 0.015 + 0.025 * c * Math.sin(this.clock * 9.3) * Math.sin(this.clock * 1.1);
    // Its head twitches, and its body is never quite the same shape twice.
    this.fig.head.rotation.z = c * 0.05 * Math.sin(this.clock * 0.9) * Math.sin(this.clock * 7.3);
    // The exposure slips every few seconds: the afterimage jumps aside and settles back.
    this.nextSlip -= dt;
    if (this.nextSlip <= 0) {
      this.slip = 1;
      this.nextSlip = (3.5 + Math.random() * 3.5) / (1 + 1.1 * this.corruption);
      if (this.corruption > 0.5) this.root.position.x += (Math.random() - 0.5) * 0.05 * this.corruption;
    }
    this.slip = Math.max(0, this.slip - dt * 1.3);
    const off = 0.1 + 0.05 * c + this.slip * (0.34 + 0.22 * c);
    this.fig.body.scaling.set(1 + 0.03 * c * this.slip, 1 + 0.02 * c * this.slip, 1);
    this.ghost.body.scaling.set(1 + 0.05 * c * this.slip, 1 + 0.07 * c, 1);
    this.ghost.root.position.set(this.root.position.x + Math.cos(this.root.rotation.y) * off, this.root.position.y, this.root.position.z - Math.sin(this.root.rotation.y) * off);
    this.ghost.root.rotation.y = this.root.rotation.y + 0.05 + this.slip * 0.1;
    this.ghost.head.rotation.x = this.fig.head.rotation.x + 0.06;
    this.ghost.photoArm.rotation.x = this.fig.photoArm.rotation.x;
    void angleDiff;
  }

  protected override apply(): void {
    for (const m of this.fig.meshes) m.visibility = this.fade;
    for (const m of this.ghost.meshes) m.visibility = this.fade * Math.min(0.75, 0.38 + 0.13 * this.corruption);
  }

  override warm(on: boolean): void {
    super.warm(on);
    this.ghost.root.setEnabled(on ? true : this.target > 0);
    for (const m of this.ghost.meshes) {
      m.visibility = on ? 1 : this.fade * 0.38;
      m.alwaysSelectAsActiveMesh = on;
    }
  }

  seenBy(camPos: Vector3, camForward: Vector3, cosMin = 0.55): boolean {
    return super.seenBy(camPos, camForward, cosMin);
  }
}
