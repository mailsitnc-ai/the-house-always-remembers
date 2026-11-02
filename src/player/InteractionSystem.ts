import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import "@babylonjs/core/Culling/ray";
import type { PlayerController } from "./PlayerController";
import type { Input } from "../core/Input";
import type { EventBus } from "../core/EventBus";

export interface Interactable {
  /** Text shown after "[E]". Return null to make the object temporarily non-interactive. */
  prompt(): string | null;
  interact(): void;
}

const REACH = 2.3;

/** Looks along the view ray each frame and routes the E key to whichever interactable is targeted. */
export class InteractionSystem {
  private readonly targets = new Map<number, Interactable>();
  private current: Interactable | null = null;
  private lastHint: string | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly player: PlayerController,
    private readonly input: Input,
    private readonly events: EventBus,
  ) {}

  /** Optional names for targets ("evidence:id", "door:id"...). Used by developer tools to find things in the world. */
  private readonly tags = new Map<number, string>();
  private readonly tagged = new Map<string, AbstractMesh[]>();

  register(meshes: AbstractMesh | AbstractMesh[], target: Interactable, tag?: string): void {
    for (const m of Array.isArray(meshes) ? meshes : [meshes]) {
      this.targets.set(m.uniqueId, target);
      if (tag) {
        this.tags.set(m.uniqueId, tag);
        const list = this.tagged.get(tag) ?? [];
        list.push(m);
        this.tagged.set(tag, list);
      }
    }
  }

  /** Live meshes registered under a tag. */
  meshesFor(tag: string): AbstractMesh[] {
    return (this.tagged.get(tag) ?? []).filter((m) => !m.isDisposed());
  }

  /** What the player's view is currently targeting: its tag and prompt, as the player would see them. */
  peek(): { tag: string | undefined; prompt: string | null } | null {
    if (!this.current) return null;
    const m = this.currentMesh;
    return { tag: m ? this.tags.get(m.uniqueId) : undefined, prompt: this.current.prompt() };
  }

  private currentMesh: AbstractMesh | null = null;

  /** The same pick the player's view does, from any point and direction (so tools can check an object can really be reached). */
  pickFrom(ray: import("@babylonjs/core/Culling/ray").Ray): { mesh: AbstractMesh; tag: string | undefined } | null {
    const hit = this.scene.pickWithRay(ray, (m) => this.pickable(m));
    return hit?.hit && hit.pickedMesh ? { mesh: hit.pickedMesh, tag: this.tags.get(hit.pickedMesh.uniqueId) } : null;
  }

  private pickable(m: AbstractMesh): boolean {
    // Invisible furniture colliders must never block something the player is looking at; walls still do.
    return m.isPickable && m.isEnabled() && (this.targets.has(m.uniqueId) || !m.name.startsWith("col-") || m.name.startsWith("col-wall"));
  }

  update(active: boolean): void {
    let next: Interactable | null = null;
    if (active) {
      const ray = this.player.camera.getForwardRay(REACH);
      const hit = this.scene.pickWithRay(ray, (m) => this.pickable(m));
      this.currentMesh = hit?.hit && hit.pickedMesh ? hit.pickedMesh : null;
      if (hit?.hit && hit.pickedMesh) next = this.targets.get(hit.pickedMesh.uniqueId) ?? null;
    }
    this.current = next;
    const text = next?.prompt() ?? null;
    const hint = text ? `[E] ${text}` : null;
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      this.events.emit("hint", { text: hint });
    }
    if (active && this.current && text && this.input.wasPressed("KeyE")) this.current.interact();
  }
}
