import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Interactable } from "../../player/InteractionSystem";
import type { WorldContext } from "../WorldContext";

export interface PickupConfig {
  id: string;
  name: string;
  message: string;
  /** Flag raised when the item is taken. */
  flag?: string;
}

/** A small object the player can take. Removes itself from the world and adds the item to the inventory. */
export class Pickup implements Interactable {
  constructor(
    private readonly ctx: WorldContext,
    private readonly mesh: Mesh,
    private readonly cfg: PickupConfig,
  ) {
    ctx.interaction.register(mesh, this, `pickup:${cfg.id}`);
    // After a save is loaded, anything that was already taken is gone from the world.
    ctx.events.on("state:restored", () => {
      if (ctx.state.get(this.cfg.flag ?? `took:${this.cfg.id}`) && !mesh.isDisposed()) {
        ctx.untrack(mesh);
        mesh.dispose();
      }
    });
  }

  prompt(): string | null {
    return `Take ${this.cfg.name}`;
  }

  interact(): void {
    this.ctx.audio.paper();
    this.ctx.inventory.add({ id: this.cfg.id, name: this.cfg.name });
    this.ctx.state.set(this.cfg.flag ?? `took:${this.cfg.id}`);
    this.ctx.events.emit("toast", { text: this.cfg.message });
    this.ctx.untrack(this.mesh);
    this.mesh.dispose();
  }
}
