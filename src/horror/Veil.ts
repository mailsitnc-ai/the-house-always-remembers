import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Interactable, InteractionSystem } from "../player/InteractionSystem";
import type { Flashlight } from "../atmosphere/Flashlight";
import type { AudioManager } from "../atmosphere/AudioManager";
import type { EventBus } from "../core/EventBus";

/**
 * A Hollow's veil: a cloud of denial lying over a piece of evidence, so it cannot be examined. The player's light drives
 * it off. It never blocks anything permanently: the flashlight is always enough.
 */
export class Veil implements Interactable {
  private readonly root: TransformNode;
  private readonly puffs: Mesh[] = [];
  private exposure = 0;
  private clock = Math.random() * 5;
  private fading = false;
  private alpha = 0;
  cleared = false;

  constructor(
    scene: Scene,
    readonly position: Vector3,
    radius: number,
    interaction: InteractionSystem,
    private readonly flashlight: Flashlight,
    private readonly audio: AudioManager,
    private readonly events: EventBus,
    private readonly onClear: () => void,
  ) {
    this.root = new TransformNode("veil", scene);
    this.root.position.copyFrom(position);
    const m = new StandardMaterial("m-veil", scene);
    m.diffuseColor = new Color3(0.01, 0.01, 0.012);
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(0.01, 0.012, 0.018);
    m.alpha = 0.85;
    m.backFaceCulling = false;
    m.emissiveFresnelParameters = new FresnelParameters({ leftColor: new Color3(0.3, 0.34, 0.42), rightColor: Color3.Black(), power: 2, bias: 0.05 });
    for (let i = 0; i < 5; i++) {
      const p = MeshBuilder.CreateSphere(`veil-${i}`, { diameter: radius * (1.2 + (i % 3) * 0.3), segments: 10 }, scene);
      p.material = m;
      p.parent = this.root;
      p.position.set((Math.random() - 0.5) * radius * 0.8, (Math.random() - 0.3) * radius * 0.5, (Math.random() - 0.5) * radius * 0.8);
      p.scaling.y = 0.6;
      p.isPickable = i === 0;
      p.visibility = 0;
      this.puffs.push(p);
    }
    interaction.register(this.puffs[0], this, "veil");
  }

  prompt(): string | null {
    return this.cleared ? null : "Something dark lies over it";
  }

  interact(): void {
    this.audio.click();
    this.events.emit("toast", { text: "It does not move. It shrinks away from the light, though. Try the flashlight.", ms: 4500 });
  }

  update(dt: number): void {
    if (this.cleared) return;
    this.clock += dt;
    if (!this.fading) this.alpha = Math.min(1, this.alpha + dt * 0.8);
    else this.alpha = Math.max(0, this.alpha - dt * 1.4);
    this.puffs.forEach((p, i) => {
      p.visibility = this.alpha * (0.75 + 0.2 * Math.sin(this.clock * 2 + i));
      p.rotation.y += dt * 0.3 * (i % 2 ? 1 : -1);
    });
    if (!this.fading) {
      if (this.flashlight.lights(this.position, 5, 0.9)) {
        this.exposure += dt;
        if (this.exposure > 1.5) this.clear();
      } else this.exposure = Math.max(0, this.exposure - dt * 0.5);
    } else if (this.alpha <= 0) this.dispose();
  }

  private clear(): void {
    this.fading = true;
    this.cleared = true;
    this.audio.paper();
    this.audio.stinger("sting");
    for (const p of this.puffs) p.isPickable = false;
    this.onClear();
  }

  private dispose(): void {
    this.root.dispose(false, true);
  }

  /** Removes it without ceremony (for example when the evidence was found some other way). */
  discard(): void {
    this.cleared = true;
    this.root.dispose(false, true);
  }
}
