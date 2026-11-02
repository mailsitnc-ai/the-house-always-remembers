import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Interactable } from "../../player/InteractionSystem";
import type { Builder, Frame } from "../Builder";
import type { RoomId, WorldContext } from "../WorldContext";

/** An old suitcase. The lid opens once and stays open, revealing what the family packed away (added by the caller). */
export class Suitcase implements Interactable {
  private readonly hinge: TransformNode;
  private angle = 0;
  private target = 0;
  private opened = false;

  /** `F` is the suitcase's frame: origin at floor level, centre of the case; the case is 0.62 wide, 0.4 deep, 0.22 tall. */
  constructor(private readonly ctx: WorldContext, b: Builder, F: Frame, room: RoomId) {
    const m = ctx.mats;
    F.box("suitcase-base", [0.62, 0.22, 0.4], [0, 0.11, 0], m.coatBrown, { cast: true });
    F.box("suitcase-edge", [0.64, 0.02, 0.42], [0, 0.015, 0], m.brass);
    F.collider("suitcase", [0.62, 0.22, 0.4], [0, 0.11, 0]);
    this.hinge = new TransformNode("suitcase-hinge", ctx.scene);
    const p = F.at([0, 0.22, -0.2]);
    this.hinge.position.set(p[0], p[1], p[2]);
    this.hinge.rotation.y = F.yaw;
    const lid = F.box("suitcase-lid", [0.62, 0.04, 0.4], [0, 0.24, 0], m.coatBrown, { pick: true, merge: false, cast: true, rooms: [room] });
    lid.setParent(this.hinge);
    const clasp = F.box("suitcase-clasp", [0.05, 0.04, 0.02], [0, 0.22, 0.2], m.brass, { merge: false, rooms: [room] });
    clasp.setParent(this.hinge);
    ctx.interaction.register(lid, this, "suitcase");
    void b;
  }

  get isOpen(): boolean {
    return this.opened;
  }

  prompt(): string | null {
    return this.opened ? null : "Open suitcase";
  }

  interact(): void {
    if (this.opened) return;
    this.opened = true;
    this.target = 1.9;
    this.ctx.audio.drawer();
  }

  update(dt: number): void {
    if (this.angle === this.target) return;
    this.angle = Math.min(this.target, this.angle + dt * 2.2);
    this.hinge.rotation.x = -this.angle;
  }
}
