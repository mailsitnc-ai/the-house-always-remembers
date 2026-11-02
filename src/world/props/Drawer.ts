import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Material } from "@babylonjs/core/Materials/material";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Interactable } from "../../player/InteractionSystem";
import type { RoomId, WorldContext } from "../WorldContext";
import type { Builder } from "../Builder";
import type { V3 } from "../geometry";

export interface DrawerConfig {
  id: string;
  /** Centre of the front panel when closed (world). */
  pos: V3;
  /** Unit direction the drawer slides out along (in the XZ plane). */
  dir: [number, number];
  width: number;
  height: number;
  travel: number;
  material: Material;
  rooms: RoomId[];
  /** Adds contents as children of `slide`, in the drawer's local frame (the tray's floor is at y = -height / 2 + 0.03). */
  fill?: (slide: TransformNode, b: Builder, dir: [number, number]) => void;
  onOpen?: () => void;
  locked?: { itemId: string; message: string };
}

/** A drawer that slides out along `dir`, carrying its contents. Contents are only visible once it is open. */
export class Drawer implements Interactable {
  readonly slide: TransformNode;
  private readonly base: V3;
  private progress = 0;
  private target = 0;
  private unlocked: boolean;

  constructor(
    private readonly ctx: WorldContext,
    b: Builder,
    private readonly cfg: DrawerConfig,
  ) {
    this.base = cfg.pos;
    this.unlocked = !cfg.locked;
    this.slide = new TransformNode(`${cfg.id}-slide`, ctx.scene);
    this.slide.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    const alongZ = Math.abs(cfg.dir[1]) > 0.5;
    const front = (w: number, h: number, d: number): V3 => (alongZ ? [w, h, d] : [d, h, w]);
    const back = (d: number): V3 => (alongZ ? [0, 0, d * cfg.dir[1]] : [d * cfg.dir[0], 0, 0]);
    const parts: Mesh[] = [];
    const panel = b.box(`${cfg.id}-front`, front(cfg.width, cfg.height, 0.04), [0, 0, 0], cfg.material, { rooms: cfg.rooms, pick: true, merge: false, tile: 1 });
    parts.push(panel);
    parts.push(b.box(`${cfg.id}-tray`, front(cfg.width - 0.06, 0.04, 0.4), [0, 0, 0], ctx.mats.dark, { rooms: cfg.rooms, merge: false }));
    parts.push(b.box(`${cfg.id}-handle`, front(0.14, 0.022, 0.03), [0, 0, 0], ctx.mats.brass, { rooms: cfg.rooms, merge: false }));
    const placing: [Mesh, V3][] = [
      [parts[0], [0, 0, 0]],
      [parts[1], [back(-0.22)[0], -cfg.height / 2 + 0.03, back(-0.22)[2]]],
      [parts[2], [back(0.03)[0], 0, back(0.03)[2]]],
    ];
    for (const [m, p] of placing) {
      m.parent = this.slide;
      m.position.set(p[0], p[1], p[2]);
    }
    cfg.fill?.(this.slide, b, cfg.dir);
    ctx.interaction.register(panel, this, `drawer:${cfg.id}`);
  }

  get isOpen(): boolean {
    return this.target > 0;
  }

  prompt(): string | null {
    if (!this.unlocked) return "Drawer (locked)";
    return this.isOpen ? "Close drawer" : "Open drawer";
  }

  interact(): void {
    const lock = this.cfg.locked;
    if (!this.unlocked && lock) {
      if (this.ctx.inventory.has(lock.itemId)) {
        this.unlocked = true;
        this.ctx.audio.click();
        this.ctx.events.emit("toast", { text: lock.message });
      } else {
        this.ctx.audio.thud();
        this.ctx.events.emit("toast", { text: "It's locked." });
      }
      return;
    }
    this.target = this.target > 0 ? 0 : 1;
    this.ctx.audio.drawer();
    if (this.target > 0) this.cfg.onOpen?.();
  }

  update(dt: number): void {
    if (this.progress === this.target) return;
    const step = dt * 1.6;
    this.progress = this.progress < this.target ? Math.min(this.target, this.progress + step) : Math.max(this.target, this.progress - step);
    const d = this.progress * this.cfg.travel;
    this.slide.position.set(this.base[0] + this.cfg.dir[0] * d, this.base[1], this.base[2] + this.cfg.dir[1] * d);
  }
}
