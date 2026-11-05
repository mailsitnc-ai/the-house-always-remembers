import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MirrorTexture } from "@babylonjs/core/Materials/Textures/mirrorTexture";
import { Plane } from "@babylonjs/core/Maths/math.plane";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

/** Where the bathroom's mirror is (the cabinet door on the west wall, upstairs): the centre of the glass and the way it faces. */
export const MIRROR_AT = { x: 8.262, y: 4.6, z: 10.0 };

/**
 * A real reflection for the bathroom mirror, used only while the Matron's reflection scare runs. The pane sits a centimetre in front of the cabinet door and is switched on
 * for a few seconds; outside the scare it is disabled and its texture does not render, so it costs nothing. It reflects only the bathroom's own meshes and whatever
 * figures it is given, at half resolution.
 */
export class BathroomMirror {
  private pane: Mesh | null = null;
  private tex: MirrorTexture | null = null;

  constructor(private readonly scene: Scene) {}

  private build(): void {
    const tex = new MirrorTexture("bathroom-mirror", 256, this.scene, true);
    tex.mirrorPlane = Plane.FromPositionAndNormal(new Vector3(MIRROR_AT.x, MIRROR_AT.y, MIRROR_AT.z), new Vector3(-1, 0, 0));
    tex.refreshRate = 0;
    tex.level = 0.8;
    // Old, slightly clouded glass: a soft blur and a cold, faint sheen, so the figure in it is part of the glass and not a lit cut-out placed on top.
    tex.blurKernel = 6;
    const mat = new StandardMaterial("bathroom-mirror-mat", this.scene);
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.emissiveColor = new Color3(0.09, 0.11, 0.13);
    mat.reflectionTexture = tex;
    mat.backFaceCulling = false;
    const pane = MeshBuilder.CreatePlane("bathroom-mirror-pane", { width: 0.5, height: 0.64 }, this.scene);
    pane.position.set(MIRROR_AT.x, MIRROR_AT.y, MIRROR_AT.z);
    pane.rotation.y = -Math.PI / 2;
    pane.material = mat;
    pane.isPickable = false;
    pane.setEnabled(false);
    this.pane = pane;
    this.tex = tex;
  }

  /** Switches the reflection on. `figures` are drawn in it along with the bathroom itself. */
  show(figures: readonly AbstractMesh[]): void {
    if (!this.pane) this.build();
    const room = this.scene.meshes.filter((m) => {
      if (!m.isEnabled() || m === this.pane || m.isDisposed()) return false;
      const c = m.getBoundingInfo().boundingBox.centerWorld;
      return c.x > 7.8 && c.x < 11.6 && c.z > 6.8 && c.z < 11.1 && c.y > 2.8 && c.y < 6;
    });
    this.tex!.renderList = [...room, ...figures];
    this.tex!.refreshRate = 1;
    this.pane!.setEnabled(true);
  }

  /** Shader and render-target preparation behind the loading screen: the pane is drawn once, then switched off. */
  warm(on: boolean, figures: readonly AbstractMesh[]): void {
    if (on) this.show(figures);
    else this.hide();
  }

  hide(): void {
    if (!this.pane) return;
    this.pane.setEnabled(false);
    this.tex!.refreshRate = 0;
    this.tex!.renderList = [];
  }

  get shown(): boolean {
    return !!this.pane?.isEnabled();
  }
}
