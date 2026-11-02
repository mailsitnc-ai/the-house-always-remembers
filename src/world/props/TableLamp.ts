import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Interactable } from "../../player/InteractionSystem";
import type { Lamp } from "../../atmosphere/LightingManager";
import type { RoomId, WorldContext } from "../WorldContext";

export interface TableLampOptions {
  name: string;
  /** Position of the lamp base on the surface. */
  position: Vector3;
  rooms: RoomId[];
  on: boolean;
  interactive: boolean;
  flicker?: number;
  eventDimmable?: boolean;
  intensity?: number;
  range?: number;
}

/** A shaded lamp with a real point light. Optionally switchable by the player. */
export class TableLamp implements Interactable {
  readonly lamp: Lamp;

  constructor(private readonly ctx: WorldContext, o: TableLampOptions) {
    const base = MeshBuilder.CreateCylinder(`${o.name}-base`, { height: 0.32, diameterTop: 0.05, diameterBottom: 0.16, tessellation: 12 }, ctx.scene);
    base.material = ctx.mats.lampBase;
    base.position.set(o.position.x, o.position.y + 0.16, o.position.z);

    const shadeMat = ctx.mats.lampShade(`${o.name}-shade-mat`);
    const shade = MeshBuilder.CreateCylinder(`${o.name}-shade`, { height: 0.26, diameterTop: 0.2, diameterBottom: 0.34, tessellation: 14 }, ctx.scene);
    shade.material = shadeMat;
    shade.position.set(o.position.x, o.position.y + 0.45, o.position.z);

    this.lamp = ctx.lighting.createLamp(`${o.name}-light`, new Vector3(o.position.x, o.position.y + 0.5, o.position.z), {
      on: o.on,
      flicker: o.flicker,
      eventDimmable: o.eventDimmable,
      intensity: o.intensity,
      range: o.range,
    });
    this.lamp.shade = shadeMat;
    this.lamp.setOn(o.on);

    for (const m of [base, shade]) {
      m.checkCollisions = false;
      m.isPickable = o.interactive;
      ctx.track(m, o.rooms, { merge: false });
      if (o.interactive) ctx.interaction.register(m, this);
    }
    ctx.flashlight.addCaster(base);
  }

  prompt(): string | null {
    return this.lamp.on ? "Turn off lamp" : "Turn on lamp";
  }

  interact(): void {
    this.lamp.setOn(!this.lamp.on);
    this.ctx.audio.click();
  }
}
