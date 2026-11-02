import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Interactable } from "../../player/InteractionSystem";
import type { WorldContext } from "../WorldContext";

/** An object with a story meaning but nothing to read: examining it adds evidence and shows what Daniel notices. */
export class Examinable implements Interactable {
  constructor(
    private readonly ctx: WorldContext,
    meshes: Mesh | Mesh[],
    private readonly prompt_: string,
    private readonly evidenceId: string,
    private readonly text: string,
  ) {
    ctx.interaction.register(meshes, this, `read:${evidenceId}`);
  }

  prompt(): string | null {
    return this.prompt_;
  }

  interact(): void {
    this.ctx.audio.click();
    this.ctx.events.emit("toast", { text: this.text, ms: 7000 });
    this.ctx.evidence.collect(this.evidenceId);
  }
}
