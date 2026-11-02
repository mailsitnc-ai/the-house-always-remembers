import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Interactable } from "../../player/InteractionSystem";
import type { Frame } from "../Builder";
import type { RoomId, WorldContext } from "../WorldContext";

export type DeckKind = "deck" | "machine" | "toy";

/**
 * A device that plays recordings. Interacting opens the tape panel. The answering machine needs batteries first,
 * which the player has to find (the shopping list in the kitchen mentions them).
 */
export class TapeDeck implements Interactable {
  private readonly led: StandardMaterial | null = null;

  constructor(
    private readonly ctx: WorldContext,
    F: Frame,
    private readonly deckId: string,
    private readonly kind: DeckKind,
    room: RoomId,
  ) {
    const m = ctx.mats;
    let body;
    if (kind === "deck") {
      body = F.box("deck-body", [0.36, 0.1, 0.22], [0, 0.05, 0], m.dark, { pick: true, merge: false, cast: true });
      F.box("deck-window", [0.1, 0.04, 0.01], [-0.08, 0.06, 0.112], m.steel);
      F.box("deck-window", [0.1, 0.04, 0.01], [0.08, 0.06, 0.112], m.steel);
      for (let i = 0; i < 4; i++) F.box("deck-button", [0.04, 0.015, 0.02], [-0.12 + i * 0.07, 0.015, 0.11], m.steel);
    } else if (kind === "machine") {
      body = F.box("machine-body", [0.26, 0.07, 0.2], [0, 0.035, 0], m.appliance, { pick: true, merge: false, cast: true });
      F.box("machine-tape", [0.12, 0.012, 0.08], [0.04, 0.074, 0], m.dark);
      this.led = new StandardMaterial(`${deckId}-led`, ctx.scene);
      this.led.disableLighting = true;
      this.led.emissiveColor = new Color3(0.08, 0.01, 0.01);
      F.box("machine-led", [0.025, 0.012, 0.025], [-0.09, 0.074, 0.05], this.led, { merge: false });
    } else {
      body = F.box("toy-body", [0.2, 0.07, 0.14], [0, 0.035, 0], m.toys[1], { pick: true, merge: false, cast: true });
      F.cyl("toy-mic", { h: 0.01, bottom: 0.05, sides: 10 }, [0, 0.075, 0.02], m.dark);
      F.box("toy-button", [0.04, 0.015, 0.03], [0.06, 0.078, -0.03], m.toys[0]);
    }
    void room;
    ctx.interaction.register(body, this, `deck:${deckId}`);
  }

  prompt(): string | null {
    return this.kind === "machine" ? "Use answering machine" : this.kind === "toy" ? "Use toy recorder" : "Use tape deck";
  }

  interact(): void {
    if (this.kind === "machine" && !this.ctx.state.get("machine:powered")) {
      if (this.ctx.inventory.has("batteries")) {
        this.ctx.inventory.remove("batteries");
        this.ctx.state.set("machine:powered");
        this.ctx.audio.click();
        if (this.led) this.led.emissiveColor = new Color3(0.9, 0.08, 0.05);
        this.ctx.events.emit("toast", { text: "You fit the batteries. A small red light comes on.", ms: 4000 });
      } else {
        this.ctx.audio.thud();
        this.ctx.events.emit("toast", { text: "The battery compartment is empty. There is a message light, but no power.", ms: 4500 });
      }
      return;
    }
    this.ctx.audio.click();
    this.ctx.events.emit("recorder:open", { deckId: this.deckId });
  }
}
