import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Constants } from "@babylonjs/core/Engines/constants";
import type { EventBus } from "../core/EventBus";
import type { InteractionSystem } from "../player/InteractionSystem";
import type { PlayerController } from "../player/PlayerController";
import type { RoomRegistry } from "./RoomRegistry";
import { roomAt, type RoomId } from "./Layout";

/**
 * Where the current objective points, as an interaction tag (the object itself) or a fixed spot. Only the opening steps
 * are guided; later chapters are left to the player.
 */
const TARGETS: Record<string, { tag?: string; at?: [number, number, number]; level?: 0 | 1 }[]> = {
  photo: [{ tag: "read:living-photo" }],
  note: [{ tag: "read:kitchen-note" }],
  // Ground floor: the foot of the stairs. Upstairs: Emily's door.
  upstairs: [{ at: [7.3, 1.5, 3.4], level: 0 }, { tag: "door:emily", level: 1 }],
  watcher: [{ tag: "deck:emily" }],
  recorder: [{ tag: "deck:emily" }],
  album: [{ tag: "read:album-print" }],
};

/**
 * A very small, soft glimmer on whatever the current objective is about: a faint warm point of light that breathes slowly,
 * like dust catching a window. It appears only in the room that holds the thing, never through walls, fades out as the
 * player comes close (they have found it), and is not drawn for objectives that are not guided. It is not a marker or a
 * waypoint, and it is the only guidance in the world besides the objective line.
 */
export class Guide {
  private readonly sprite: Mesh;
  private readonly mat: StandardMaterial;
  private step = "";
  private clock = 0;
  private level = 0;

  constructor(
    scene: Scene,
    events: EventBus,
    private readonly interaction: InteractionSystem,
    private readonly player: PlayerController,
    private readonly registry: RoomRegistry,
  ) {
    const tex = new DynamicTexture("guide-glimmer", 128, scene, true);
    const g = tex.getContext() as CanvasRenderingContext2D;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,226,170,0.95)");
    grad.addColorStop(0.25, "rgba(255,214,140,0.35)");
    grad.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    tex.update();
    tex.hasAlpha = true;
    this.mat = new StandardMaterial("guide-glimmer-mat", scene);
    this.mat.diffuseTexture = tex;
    this.mat.opacityTexture = tex;
    this.mat.emissiveColor = new Color3(1, 0.86, 0.6);
    this.mat.disableLighting = true;
    this.mat.alphaMode = Constants.ALPHA_ADD;
    this.mat.backFaceCulling = false;
    this.sprite = MeshBuilder.CreatePlane("guide-glimmer", { size: 0.5 }, scene);
    this.sprite.material = this.mat;
    this.sprite.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.sprite.isPickable = false;
    this.sprite.setEnabled(false);
    events.on("objective:current", ({ id }) => {
      this.step = id;
      this.sprite.setEnabled(false);
    });
    events.on("state:restored", () => this.sprite.setEnabled(false));
  }

  /** Finds the spot for the current step on the player's storey, or null. */
  private spot(): { pos: Vector3; room: RoomId | null } | null {
    const list = TARGETS[this.step];
    if (!list) return null;
    for (const t of list) {
      if (t.level !== undefined && t.level !== this.level) continue;
      if (t.at) return { pos: new Vector3(...t.at).add(new Vector3(0, this.level * 3, 0)), room: roomAt(t.at[0], t.at[2], this.level as 0 | 1) };
      const m = t.tag ? this.interaction.meshesFor(t.tag)[0] : undefined;
      if (!m) continue;
      m.computeWorldMatrix(true);
      const pos = m.getBoundingInfo().boundingBox.centerWorld.clone();
      if (Math.abs(pos.y - this.level * 3) > 3) continue;
      return { pos, room: roomAt(pos.x, pos.z, this.level as 0 | 1) };
    }
    return null;
  }

  update(dt: number): void {
    this.clock += dt;
    this.level = this.player.floorBase > 1.5 ? 1 : 0;
    const s = this.spot();
    const here = this.registry.currentRoom;
    if (!s || !s.room || s.room !== here) {
      this.sprite.setEnabled(false);
      return;
    }
    const p = this.player.position;
    const toPlayer = new Vector3(p.x - s.pos.x, 0, p.z - s.pos.z);
    const dist = toPlayer.length();
    // Close enough to act: the glimmer has done its job and fades away.
    const near = Math.max(0, Math.min(1, (dist - 1.1) / 1.2));
    if (near <= 0.01) {
      this.sprite.setEnabled(false);
      return;
    }
    // Sit just in front of the object (toward the player) so it is not buried in a wall.
    if (dist > 0.01) toPlayer.scaleInPlace(0.16 / dist);
    this.sprite.position.copyFrom(s.pos).addInPlace(toPlayer);
    const breathe = 0.5 + 0.5 * Math.sin(this.clock * 1.3);
    this.sprite.scaling.setAll(0.7 + 0.5 * breathe);
    this.mat.alpha = near * (0.22 + 0.2 * breathe);
    this.sprite.setEnabled(true);
  }
}
