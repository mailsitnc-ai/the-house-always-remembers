import type { Interactable } from "../../player/InteractionSystem";
import type { Lamp } from "../../atmosphere/LightingManager";
import type { RoomId, WorldContext } from "../WorldContext";
import type { Builder } from "../Builder";
import type { V3 } from "../geometry";

/** Wall switch plate that toggles one or more lamps. `facing` is the wall's normal, pointing into the room. */
export class LightSwitch implements Interactable {
  constructor(
    private readonly ctx: WorldContext,
    b: Builder,
    pos: V3,
    facing: "+x" | "-x" | "+z" | "-z",
    private readonly lamps: Lamp[],
    rooms: RoomId[],
  ) {
    const alongX = facing === "+z" || facing === "-z";
    const plate = b.box("switch-plate", alongX ? [0.08, 0.12, 0.015] : [0.015, 0.12, 0.08], pos, ctx.mats.trim, { rooms, pick: true, merge: false });
    b.box("switch-toggle", alongX ? [0.02, 0.04, 0.02] : [0.02, 0.04, 0.02], [pos[0], pos[1], pos[2]], ctx.mats.brass, { rooms });
    ctx.interaction.register(plate, this);
  }

  prompt(): string | null {
    return this.lamps.some((l) => l.on) ? "Switch light off" : "Switch light on";
  }

  interact(): void {
    const turnOn = !this.lamps.some((l) => l.on);
    for (const l of this.lamps) l.setOn(turnOn);
    this.ctx.audio.click();
  }
}
