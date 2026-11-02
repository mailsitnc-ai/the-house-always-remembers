import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { PlayerController } from "./PlayerController";
import type { Input } from "../core/Input";
import type { EventBus } from "../core/EventBus";

export interface Inspectable {
  id: string;
  title: string;
  text: string;
  /** Builds a fresh mesh to examine (a clone/variant of the world object, lit by its own emissive texture). */
  build(): Mesh;
}

/**
 * Brings an object up in front of the camera, drawn in its own rendering group so it never clips into walls.
 * Mouse movement turns the object; E puts it away.
 */
export class InspectionSystem {
  private mesh: Mesh | null = null;
  private currentId: string | null = null;

  constructor(
    scene: Scene,
    private readonly player: PlayerController,
    private readonly input: Input,
    private readonly events: EventBus,
  ) {
    scene.setRenderingAutoClearDepthStencil(1, true, true, false);
  }

  get active(): boolean {
    return this.mesh !== null;
  }

  open(item: Inspectable): void {
    // Never leave an earlier object attached to the camera if something is opened while another is showing.
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    const mesh = item.build();
    mesh.parent = this.player.camera;
    mesh.position.set(0, -0.02, 0.5);
    mesh.rotation.set(-0.15, 0, 0);
    mesh.renderingGroupId = 1;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    this.mesh = mesh;
    this.currentId = item.id;
    this.events.emit("inspect:open", { id: item.id, title: item.title, text: item.text });
  }

  close(): void {
    if (!this.mesh || !this.currentId) return;
    this.mesh.dispose();
    this.mesh = null;
    this.events.emit("inspect:close", { id: this.currentId });
    this.currentId = null;
  }

  update(): void {
    if (!this.mesh) return;
    const { dx, dy } = this.input.consumeMouse();
    this.mesh.rotation.y -= dx * 0.008;
    this.mesh.rotation.x = Math.max(-1.2, Math.min(1.2, this.mesh.rotation.x + dy * 0.008));
    if (this.input.wasPressed("KeyE")) this.close();
  }
}
