import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Interactable } from "../../player/InteractionSystem";
import type { Builder } from "../Builder";
import type { RoomId, WorldContext } from "../WorldContext";
import type { V3 } from "../geometry";

/** Wall-mounted keypad. Interacting asks the UI to open the keypad overlay for this puzzle id. */
export class KeypadPanel implements Interactable {
  private readonly light: StandardMaterial;

  /** @param facing wall normal into the room; the plate is 0.03 thick and its centre must sit 0.015 off the wall face. */
  constructor(private readonly ctx: WorldContext, b: Builder, private readonly puzzleId: string, position: V3, facing: "+x" | "-x" | "+z" | "-z", rooms: RoomId[]) {
    const alongX = facing === "+z" || facing === "-z";
    const plate = b.box(`${puzzleId}-keypad`, alongX ? [0.14, 0.22, 0.03] : [0.03, 0.22, 0.14], position, ctx.mats.dark, { rooms, pick: true, merge: false });
    this.light = new StandardMaterial(`${puzzleId}-keypad-led`, ctx.scene);
    this.light.disableLighting = true;
    this.light.emissiveColor = new Color3(0.8, 0.1, 0.05);
    const nx = facing === "+x" ? 1 : facing === "-x" ? -1 : 0;
    const nz = facing === "+z" ? 1 : facing === "-z" ? -1 : 0;
    b.box(`${puzzleId}-keypad-led`, alongX ? [0.025, 0.025, 0.034] : [0.034, 0.025, 0.025], [position[0] + nx * 0.003, position[1] + 0.08, position[2] + nz * 0.003], this.light, { rooms, merge: false });
    ctx.interaction.register(plate, this, `keypad:${puzzleId}`);
    ctx.events.on("puzzle:solved", ({ id }) => {
      if (id === puzzleId) this.light.emissiveColor = new Color3(0.1, 0.8, 0.2);
    });
  }

  prompt(): string | null {
    return this.ctx.puzzles.isSolved(this.puzzleId) ? null : "Use keypad";
  }

  interact(): void {
    this.ctx.audio.click();
    this.ctx.events.emit("keypad:open", { id: this.puzzleId });
  }
}
