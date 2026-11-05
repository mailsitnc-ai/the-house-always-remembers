import type { Scene } from "@babylonjs/core/scene";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { buildWitness, type WitnessFigure } from "./CharacterBuilder";
import { Entity, angleDiff, capLights } from "./Entity";

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

  // ---- guiding (it speaks only by what it does) ----
  /** Where the evidence it stands for is. */
  private ev: { x: number; z: number } | null = null;
  /** idle: facing the evidence · turn: turning to the player · show: holding the photograph up to the player · back: turning back, then pointing the photograph at the evidence. */
  private stage: "idle" | "turn" | "show" | "back" = "idle";
  private stageT = 0;
  private lift = 0;
  private liftGoal = 0;
  private develop = 0;
  private flash = 0;
  private recognise = 0;
  /** True once the player has looked where it points for long enough: the director then lets it go (it has done what it came to do). */
  satisfied = false;

  constructor(scene: Scene) {
    const fig = buildWitness(scene, false);
    const ghost = buildWitness(scene, true);
    super({ root: fig.root, meshes: [...fig.meshes] });
    this.fig = fig;
    this.ghost = ghost;
    capLights(ghost.meshes);
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
    this.ev = { x: towardX, z: towardZ };
    this.stage = "idle";
    this.stageT = 0;
    this.lift = 0;
    this.liftGoal = 0.12;
    this.develop = 0;
    this.flash = 0;
    this.recognise = 0;
    this.satisfied = false;
    this.gaze = 0;
    this.bowing = false;
    this.bow = 0;
    this.show(3);
    this.ghost.root.setEnabled(true);
  }

  /** The evidence was taken: it lowers the photograph and its head, and fades. */
  acknowledge(): void {
    // The clue is found: the photograph flashes once (the shutter) and it lowers its head and goes.
    this.flash = 1;
    this.bowing = true;
    this.hide(3.5);
  }

  override vanish(): void {
    super.vanish();
    this.ghost.root.setEnabled(false);
  }

  /**
   * Called by the director when the player first properly notices it. It turns from the evidence to the player (the face stays hidden), holds the photograph up, and then
   * turns back and points the photograph at the evidence. It never moves toward the player.
   */
  noticed(): void {
    if (this.stage !== "idle" || this.bowing) return;
    this.stage = "turn";
    this.stageT = 0;
    this.flash = 0.6;
  }

  /**
   * Each frame while it is visible: handles the guide choreography and reports (through `satisfied`) when the player has looked where it points.
   * `cam`/`fwd` are the player's eye and view direction.
   */
  guide(cam: Vector3, fwd: Vector3, dt: number): void {
    if (!this.visible || this.bowing || !this.ev) return;
    const pos = this.root.position;
    const yawEv = Math.atan2(this.ev.x - pos.x, this.ev.z - pos.z);
    const yawPl = Math.atan2(cam.x - pos.x, cam.z - pos.z);
    this.stageT += dt;
    const turnTo = (goal: number, rate: number): void => {
      this.root.rotation.y += angleDiff(this.root.rotation.y, goal) * Math.min(1, dt * rate);
    };
    switch (this.stage) {
      case "idle":
        turnTo(yawEv, 2);
        this.liftGoal = 0.12;
        break;
      case "turn":
        turnTo(yawPl, 3.2);
        this.liftGoal = 0.9;
        if (this.stageT > 0.9) {
          this.stage = "show";
          this.stageT = 0;
        }
        break;
      case "show":
        turnTo(yawPl, 3);
        this.liftGoal = 0.95;
        if (this.stageT > 1.4) {
          this.stage = "back";
          this.stageT = 0;
        }
        break;
      case "back": {
        // Turns away slowly and holds the photograph out toward the evidence: the thing to look at.
        turnTo(yawEv, 1.1);
        this.liftGoal = 0.55;
        // Has the player looked where it points? The view within about 20 degrees of the evidence, from within 7 m.
        const dx = this.ev.x - cam.x;
        const dz = this.ev.z - cam.z;
        const d = Math.hypot(dx, dz) || 1;
        if (d < 7 && (dx * fwd.x + dz * fwd.z) / d > 0.94) this.recognise += dt;
        else this.recognise = Math.max(0, this.recognise - dt * 0.5);
        if (this.recognise > 1.6 && !this.satisfied) {
          // The photograph flashes once, as the shutter would, and it lets itself go.
          this.flash = 1;
          this.satisfied = true;
        }
        break;
      }
    }
    this.lift += (this.liftGoal - this.lift) * Math.min(1, dt * 2.2);
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
    this.fig.photoArm.rotation.x = this.bowing ? this.bow * 0.9 : -lift - this.lift + Math.sin(this.clock * 0.5) * 0.015 + 0.025 * c * Math.sin(this.clock * 9.3) * Math.sin(this.clock * 1.1);
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
    // The photograph develops as it appears (a print coming up in the tray), brightens when the player looks at it, and flashes at the shutter.
    this.develop = Math.min(1, this.develop + dt * 0.35);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    const mat = this.fig.photoMat;
    if (mat) {
      const k = 0.25 + 0.75 * this.develop + 0.35 * (this.stage === "show" ? 1 : 0) + 1.4 * this.flash;
      mat.emissiveColor.set(0.32 * k, 0.3 * k, 0.27 * k);
    }
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
