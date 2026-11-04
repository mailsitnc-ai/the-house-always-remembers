import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Material } from "@babylonjs/core/Materials/material";
import type { Interactable } from "../../player/InteractionSystem";
import type { RoomId, WorldContext } from "../WorldContext";
import type { Builder } from "../Builder";
import { panelUVs } from "../geometry";

export interface DoorConfig {
  id: string;
  /** "z": the wall runs along Z (leaf spans Z). "x": the wall runs along X. */
  axis: "x" | "z";
  /** Hinge position on the floor (use the correct storey height for Y). */
  hinge: Vector3;
  width: number;
  height: number;
  /** +1: the leaf extends toward increasing axis coordinate from the hinge, -1: toward decreasing. */
  leafDir: 1 | -1;
  /** Direction the open door swings toward, as a unit vector in the XZ plane. */
  opensToward: [number, number];
  rooms: RoomId[];
  locked: boolean;
  lockedMessage: string;
  /** If set, carrying this inventory item unlocks the door when the player uses it. */
  keyItem?: { id: string; unlockMessage: string };
  /** Decorative door that never opens (for example the front door). */
  fixed?: boolean;
  /** Reuse for cabinet and appliance doors: material, thickness, whether the player collides with it, and the prompt noun. */
  material?: Material;
  thickness?: number;
  collide?: boolean;
  knobs?: boolean;
  label?: string;
  maxAngle?: number;
  onToggle?: (open: boolean) => void;
  /** For fixed doors: return true if the story handled the interaction. */
  onFixedInteract?: () => boolean;
}

const OPEN_ANGLE = Math.PI * 0.5;
const SPEED = 2.4; // radians per second

/** A hinged door that swings about a pivot. The leaf only blocks the player while it is mostly closed. */
export class Door implements Interactable {
  readonly leaf: Mesh;
  private readonly pivot: TransformNode;
  private angle = 0;
  private target = 0;
  private readonly sign: 1 | -1;
  locked: boolean;

  constructor(
    private readonly ctx: WorldContext,
    b: Builder,
    private readonly cfg: DoorConfig,
  ) {
    this.locked = cfg.locked;
    this.pivot = new TransformNode(`${cfg.id}-pivot`, ctx.scene);
    this.pivot.position.copyFrom(cfg.hinge);

    // The leaf vector, rotated by +90 degrees about Y, is (lz, -lx). Pick the rotation sign that sweeps it toward the open side.
    const lx = cfg.axis === "x" ? cfg.leafDir : 0;
    const lz = cfg.axis === "z" ? cfg.leafDir : 0;
    this.sign = lz === cfg.opensToward[0] && -lx === cfg.opensToward[1] ? 1 : -1;

    const w = cfg.width - 0.02;
    const th = cfg.thickness ?? 0.05;
    const collide = cfg.collide ?? true;
    const size: [number, number, number] = cfg.axis === "z" ? [th, cfg.height, w] : [w, cfg.height, th];
    const off: [number, number, number] = cfg.axis === "z" ? [0, cfg.height / 2, (cfg.leafDir * cfg.width) / 2] : [(cfg.leafDir * cfg.width) / 2, cfg.height / 2, 0];
    const panelled = !cfg.material;
    this.leaf = b.box(`${cfg.id}-leaf`, size, [0, 0, 0], cfg.material ?? ctx.mats.doorPanel, { rooms: cfg.rooms, collide, pick: true, cast: true, merge: false, tile: panelled ? undefined : 1 });
    if (panelled) panelUVs(this.leaf, size);
    this.leaf.parent = this.pivot;
    this.leaf.position.set(off[0], off[1], off[2]);

    // Lever handles with a round rose plate, one on each face.
    if (cfg.knobs !== false) {
      const hx = cfg.leafDir * (cfg.width - 0.1);
      for (const s of [-1, 1]) {
        const face = (th / 2 + 0.006) * s;
        const rose = b.cyl(`${cfg.id}-rose`, { h: 0.012, bottom: 0.055, sides: 14 }, [0, 0, 0], ctx.mats.brass, { rooms: cfg.rooms, merge: false });
        const lever = b.box(`${cfg.id}-lever`, cfg.axis === "z" ? [0.03, 0.018, 0.115] : [0.115, 0.018, 0.03], [0, 0, 0], ctx.mats.brass, { rooms: cfg.rooms, merge: false, round: 0.006 });
        for (const m of [rose, lever]) {
          m.parent = this.pivot;
          m.isPickable = false;
        }
        if (cfg.axis === "z") {
          rose.rotation.z = Math.PI / 2;
          rose.position.set(face, 1.0, hx);
          lever.position.set(face + 0.018 * s, 1.0, hx - cfg.leafDir * 0.045);
        } else {
          rose.rotation.x = Math.PI / 2;
          rose.position.set(hx, 1.0, face);
          lever.position.set(hx - cfg.leafDir * 0.045, 1.0, face + 0.018 * s);
        }
      }
    }
    ctx.interaction.register(this.leaf, this, `door:${cfg.id}`);
  }

  get isOpen(): boolean {
    return this.target !== 0;
  }

  get rooms(): RoomId[] {
    return this.cfg.rooms;
  }

  get isFixed(): boolean {
    return !!this.cfg.fixed;
  }

  get hingePosition(): Vector3 {
    return this.cfg.hinge;
  }

  unlock(): void {
    this.locked = false;
  }

  /** Snaps the door open or closed without sound, ignoring locks. Used by the benchmark walk and tests. */
  setOpen(open: boolean): void {
    this.target = open ? this.sign * (this.cfg.maxAngle ?? OPEN_ANGLE) : 0;
    this.angle = this.target;
    this.pivot.rotation.y = this.angle;
    if (this.cfg.collide ?? true) this.leaf.checkCollisions = Math.abs(this.angle) < 0.35;
  }

  /** Opens the door whatever its lock (the finale: the front door finally opens). */
  forceOpen(): void {
    this.locked = false;
    this.target = this.sign * (this.cfg.maxAngle ?? OPEN_ANGLE);
    this.ctx.audio.creak();
  }

  prompt(): string | null {
    if (this.cfg.fixed) return "Front door";
    const noun = this.cfg.label ?? "door";
    if (this.locked) return `${noun[0].toUpperCase()}${noun.slice(1)} (locked)`;
    return this.isOpen ? `Close ${noun}` : `Open ${noun}`;
  }

  interact(): void {
    if (this.locked && this.cfg.keyItem && this.ctx.inventory.has(this.cfg.keyItem.id)) {
      this.locked = false;
      this.ctx.audio.click();
      this.ctx.events.emit("toast", { text: this.cfg.keyItem.unlockMessage });
      return;
    }
    if (this.cfg.fixed && this.cfg.onFixedInteract?.()) return;
    if (this.locked || this.cfg.fixed) {
      this.ctx.audio.thud();
      this.ctx.events.emit("toast", { text: this.cfg.lockedMessage });
      return;
    }
    this.target = this.isOpen ? 0 : this.sign * (this.cfg.maxAngle ?? OPEN_ANGLE);
    if (this.cfg.collide === false) this.ctx.audio.click();
    else this.ctx.audio.creak();
    this.cfg.onToggle?.(this.isOpen);
  }

  update(dt: number): void {
    if (this.angle === this.target) return;
    const step = SPEED * dt;
    this.angle = this.angle < this.target ? Math.min(this.target, this.angle + step) : Math.max(this.target, this.angle - step);
    this.pivot.rotation.y = this.angle;
    if (this.cfg.collide ?? true) this.leaf.checkCollisions = Math.abs(this.angle) < 0.35;
  }
}
