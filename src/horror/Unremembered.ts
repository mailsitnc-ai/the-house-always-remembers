import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { fragmentTexture } from "./CharacterBuilder";
import { floorHeight } from "../world/Layout";

interface Fragment {
  mesh: Mesh;
  home: { x: number; z: number };
  clock: number;
  phase: number;
  gaze: number;
}

/**
 * Pieces of memories that were never finished. Each is a pale cut-out of a small figure, torn into strips, that repeats a
 * short stutter in place: a step back, a turn, a step back again. They are not Emily and they do not come closer. They
 * only repeat, and they go if you look straight at them for long enough.
 */
export class Unremembered {
  private readonly fragments: Fragment[] = [];
  private readonly mats: StandardMaterial[] = [];

  constructor(private readonly scene: Scene) {
    for (let v = 0; v < 3; v++) {
      const m = new StandardMaterial(`m-fragment-${v}`, scene);
      const t = fragmentTexture(scene, v, 40 + v);
      m.diffuseTexture = t;
      m.useAlphaFromDiffuseTexture = true;
      m.emissiveTexture = t;
      m.disableLighting = true;
      m.backFaceCulling = false;
      m.diffuseColor = Color3.Black();
      this.mats.push(m);
    }
  }

  get count(): number {
    return this.fragments.length;
  }

  spawn(variant: number, x: number, z: number, level: 0 | 1, height = 1.05): void {
    const mesh = MeshBuilder.CreatePlane(`fragment-${this.fragments.length}`, { width: height * 0.5, height }, this.scene);
    mesh.material = this.mats[variant % this.mats.length];
    mesh.isPickable = false;
    mesh.position.set(x, floorHeight(x, z, level * 3) + height / 2, z);
    mesh.visibility = 0;
    this.fragments.push({ mesh, home: { x, z }, clock: Math.random() * 3, phase: Math.random() * 6, gaze: 0 });
  }

  clear(): void {
    for (const f of this.fragments) f.mesh.dispose();
    this.fragments.length = 0;
  }

  /** Distance from `p` to the nearest fragment, or Infinity. */
  nearest(p: Vector3): number {
    let best = Infinity;
    for (const f of this.fragments) best = Math.min(best, Math.hypot(f.home.x - p.x, f.home.z - p.z));
    return best;
  }

  update(dt: number, camPos: Vector3, camForward: Vector3): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.clock += dt;
      // A loop of about two seconds: stand, a jerky step to one side, snap back.
      const t = f.clock % 2.2;
      const step = t > 1.4 ? Math.min(1, (t - 1.4) / 0.08) * (t < 1.9 ? 1 : 0) : 0;
      f.mesh.position.x = f.home.x + step * 0.28;
      f.mesh.position.z = f.home.z;
      // Face the player around the vertical axis only, in small jumps so it never feels smooth.
      const yaw = Math.atan2(camPos.x - f.mesh.position.x, camPos.z - f.mesh.position.z) + Math.PI;
      f.mesh.rotation.y = Math.round(yaw * 3) / 3;
      const flicker = Math.sin(f.clock * 23 + f.phase) > 0.8 ? 0.2 : 1;
      f.mesh.visibility = Math.min(f.mesh.visibility + dt * 0.8, 0.9 * flicker);
      // Looking straight at one for a while makes it go.
      // Judge the view cone mostly in the horizontal plane: a small figure sits well below eye level.
      const to = f.mesh.position.subtract(camPos);
      const ty = to.y * 0.3;
      const d = Math.hypot(to.x, ty, to.z);
      const seen = d > 0.1 && (to.x * camForward.x + ty * camForward.y + to.z * camForward.z) / d > 0.9;
      const near = Math.hypot(to.x, to.z);
      f.gaze = seen ? f.gaze + dt : Math.max(0, f.gaze - dt);
      if (f.gaze > 1.6 || near < 1.1) {
        f.mesh.dispose();
        this.fragments.splice(i, 1);
      }
    }
  }

  warm(on: boolean): void {
    if (on) {
      // Compile the fragment materials by drawing one briefly.
      this.spawn(0, 0, 0, 0);
      this.spawn(1, 0, 0, 0);
      this.spawn(2, 0, 0, 0);
      for (const f of this.fragments) {
        f.mesh.visibility = 1;
        f.mesh.alwaysSelectAsActiveMesh = true;
      }
    } else this.clear();
  }
}
