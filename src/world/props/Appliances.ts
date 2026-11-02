import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Interactable } from "../../player/InteractionSystem";
import type { Lamp } from "../../atmosphere/LightingManager";
import type { Frame } from "../Builder";
import type { RoomId, WorldContext } from "../WorldContext";

/** Table radio: switching it on plays positional static from its location. */
export class Radio implements Interactable {
  private on = false;

  constructor(private readonly ctx: WorldContext, F: Frame, room: RoomId) {
    const body = F.box("radio-body", [0.42, 0.24, 0.16], [0, 0.12, 0], ctx.mats.woodMid, { pick: true, merge: false, cast: true });
    F.box("radio-grille", [0.2, 0.16, 0.01], [-0.08, 0.12, 0.085], ctx.mats.screen);
    F.cyl("radio-dial", { h: 0.02, bottom: 0.07 }, [0.1, 0.12, 0.085], ctx.mats.brass).rotation.x = Math.PI / 2;
    const p = F.at([0, 0.12, 0]);
    ctx.audio.addEmitter(`radio-${room}`, new Vector3(p[0], p[1], p[2]), "static", false);
    this.id = `radio-${room}`;
    ctx.interaction.register(body, this);
  }

  private readonly id: string;

  prompt(): string | null {
    return this.on ? "Switch radio off" : "Switch radio on";
  }

  interact(): void {
    this.on = !this.on;
    this.ctx.audio.setEmitter(this.id, this.on);
    this.ctx.audio.click();
    if (this.on) this.ctx.events.emit("toast", { text: "Static. Underneath it, something that is almost a voice." });
  }
}

/** Television on a stand. When on it hisses and throws a cold, flickering glow on the room. */
export class Television implements Interactable {
  private on = false;
  private readonly screen: StandardMaterial;

  constructor(private readonly ctx: WorldContext, F: Frame, room: RoomId, private readonly glow: Lamp) {
    this.screen = new StandardMaterial("tv-screen", ctx.scene);
    this.screen.diffuseColor = new Color3(0.02, 0.02, 0.02);
    this.screen.specularColor = new Color3(0.3, 0.3, 0.3);
    this.screen.emissiveColor = Color3.Black();
    F.box("tv-body", [0.95, 0.58, 0.06], [0, 0.34, 0], ctx.mats.dark, { pick: true, merge: false, cast: true });
    const scr = F.box("tv-screen", [0.86, 0.5, 0.01], [0, 0.34, 0.034], this.screen, { pick: true, merge: false });
    F.box("tv-neck", [0.2, 0.1, 0.08], [0, 0.05, -0.02], ctx.mats.dark);
    const p = F.at([0, 0.34, 0.1]);
    ctx.audio.addEmitter(`tv-${room}`, new Vector3(p[0], p[1], p[2]), "tv", false);
    this.id = `tv-${room}`;
    ctx.interaction.register([scr], this);
  }

  private readonly id: string;

  prompt(): string | null {
    return this.on ? "Switch television off" : "Switch television on";
  }

  interact(): void {
    this.on = !this.on;
    this.screen.emissiveColor = this.on ? new Color3(0.28, 0.36, 0.45) : Color3.Black();
    this.glow.setOn(this.on);
    this.ctx.audio.setEmitter(this.id, this.on);
    this.ctx.audio.click();
  }
}

/** Refrigerator hum: constant low drone from the kitchen. */
export function addFridgeHum(ctx: WorldContext, pos: Vector3, room: RoomId): void {
  ctx.audio.addEmitter(`fridge-${room}`, pos, "hum", true);
}
