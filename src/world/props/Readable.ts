import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import type { Interactable } from "../../player/InteractionSystem";
import type { WorldContext } from "../WorldContext";
import type { Builder } from "../Builder";

export interface ReadableConfig {
  id: string;
  /** Prompt noun, e.g. "note", "photograph", "drawing". */
  verb: string;
  title: string;
  text: string;
  texture: BaseTexture;
  /** Size of the inspected sheet in metres. */
  size: [number, number];
  /** Flag raised the first time it is examined. */
  flag?: string;
  /** Evidence id added to the journal when this is examined. */
  evidence?: string;
}

/** The canvas behind a procedural texture, used as the journal thumbnail. */
export function canvasOf(tex: BaseTexture): HTMLCanvasElement | null {
  const c = (tex as unknown as { getContext?: () => { canvas?: HTMLCanvasElement } }).getContext?.();
  return c?.canvas ?? null;
}

/** Anything that can be picked up visually and read: notes, photographs, drawings, the Phase 1 index card. */
export class Readable implements Interactable {
  private inspectMat: import("@babylonjs/core/Materials/standardMaterial").StandardMaterial | null = null;

  constructor(
    private readonly ctx: WorldContext,
    private readonly b: Builder,
    meshes: Mesh | Mesh[],
    private readonly cfg: ReadableConfig,
  ) {
    ctx.interaction.register(meshes, this, `read:${cfg.evidence ?? cfg.id}`);
  }

  prompt(): string | null {
    return `Examine ${this.cfg.verb}`;
  }

  interact(): void {
    this.ctx.audio.paper();
    this.ctx.state.set(this.cfg.flag ?? `read:${this.cfg.id}`);
    if (this.cfg.evidence) this.ctx.evidence.collect(this.cfg.evidence, canvasOf(this.cfg.texture));
    // Created once and reused, so repeated reading does not accumulate materials.
    const mat = (this.inspectMat ??= this.ctx.mats.unlit(`${this.cfg.id}-inspect-mat`, this.cfg.texture));
    this.ctx.inspection.open({
      id: this.cfg.id,
      title: this.cfg.title,
      text: this.cfg.text,
      build: () => {
        const m = this.b.box(`${this.cfg.id}-inspect`, [this.cfg.size[0], this.cfg.size[1], 0.006], [0, 0, 0], mat, { merge: false, rooms: [] });
        this.ctx.untrack(m);
        return m;
      },
    });
  }
}
