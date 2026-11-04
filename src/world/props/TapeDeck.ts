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
      // A 1970s family cassette deck, top-loading so the cassette and its two reels are seen from standing height. 46 x 30 cm, light enough to read against dark wood.
      const mat = (name: string, hex: string, emissive = 0.05): StandardMaterial => {
        const c = Color3.FromHexString(hex);
        const x = new StandardMaterial(`${deckId}-${name}`, ctx.scene);
        x.diffuseColor = c;
        x.specularColor = new Color3(0.12, 0.12, 0.12);
        x.emissiveColor = c.scale(emissive);
        return x;
      };
      const beige = mat("beige", "#b3aa90", 0.08);
      const walnut = mat("walnut", "#5d3b22", 0.04);
      const fascia = mat("fascia", "#25211c", 0.02);
      const cream = mat("cream", "#e6dfc8", 0.12);
      const redKey = mat("red", "#b0352c", 0.12);
      const bay = mat("bay", "#0d0b09", 0);
      const cassette = mat("cassette", "#3a3631", 0.04);
      const knob = mat("knob", "#8b8a84", 0.06);
      body = F.box("deck-body", [0.46, 0.12, 0.3], [0, 0.06, 0], beige, { pick: true, merge: false, cast: true });
      for (const sx of [-1, 1]) F.box("deck-cap", [0.025, 0.122, 0.302], [sx * 0.2425, 0.061, 0], walnut);
      F.box("deck-fascia", [0.4, 0.05, 0.006], [0, 0.06, 0.153], fascia);
      for (let i = 0; i < 5; i++) F.box("deck-key", [0.05, 0.02, 0.03], [-0.16 + i * 0.058, 0.028, 0.168], i === 4 ? redKey : cream);
      for (const x of [0.07, 0.15]) {
        F.box("deck-meter", [0.065, 0.032, 0.004], [x, 0.078, 0.157], cream);
        F.box("deck-needle", [0.002, 0.024, 0.002], [x + 0.008, 0.078, 0.16], fascia);
      }
      // The cassette bay on top: a dark recess, a cassette with a label, two pale reels.
      F.box("deck-bay", [0.21, 0.004, 0.14], [-0.07, 0.121, -0.02], bay);
      F.box("deck-cassette", [0.17, 0.012, 0.11], [-0.07, 0.128, -0.02], cassette);
      F.box("deck-label", [0.12, 0.0015, 0.045], [-0.07, 0.1345, -0.05], cream);
      for (const x of [-0.115, -0.025]) F.cyl("deck-reel", { h: 0.004, bottom: 0.038, sides: 18 }, [x, 0.136, 0.012], cream);
      for (const i of [0, 1, 2]) F.box("deck-grille", [0.006, 0.004, 0.2], [0.075 + i * 0.016, 0.1215, 0], fascia);
      for (const z of [-0.05, 0.05]) F.cyl("deck-knob", { h: 0.02, bottom: 0.03, sides: 14 }, [0.18, 0.13, z], knob);
      const led = mat("led", "#ff9a2a", 1);
      led.disableLighting = true;
      F.box("deck-led", [0.012, 0.004, 0.012], [0.19, 0.1215, 0.12], led);
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
