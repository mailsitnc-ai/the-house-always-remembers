import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { buildFragment, fragmentMaterial } from "./models/FragmentModel";
import { floorHeight } from "../world/Layout";

interface Fragment {
  mesh: Mesh;
  home: { x: number; z: number };
  clock: number;
  phase: number;
  gaze: number;
  /** Height in metres (the model is one metre tall and is scaled). */
  h: number;
}

/**
 * Pieces of memories that were never finished. Each is a pale figure cut into thin slices that have slipped sideways, with some
 * slices missing, and it repeats a short stutter in place: a step aside, a snap back. They are not Emily and they do not come
 * closer. They only repeat, and they go if you look straight at them for long enough.
 */
export class Unremembered {
  private readonly fragments: Fragment[] = [];
  /** Prototypes by level (0 early .. 3 finale) and variant, made the first time a level is needed. */
  private readonly protos: (Mesh[] | null)[] = [null, null, null, null];
  private readonly mat: ReturnType<typeof fragmentMaterial>;
  private count_ = 0;
  /** Progressive horror level, 0 (clean slices) to 3 (a fragment that can hardly be reconstructed). */
  corruption = 0;
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
    this.mat = fragmentMaterial(scene);
    this.protoFor(0);
  }

  private get level(): number {
    return Math.max(0, Math.min(3, Math.round(this.corruption)));
  }

  private protoFor(level: number): Mesh[] {
    let list = this.protos[level];
    if (!list) {
      list = [0, 1, 2].map((v) => {
        const p = buildFragment(this.scene, v, level);
        p.material = this.mat;
        return p;
      });
      this.protos[level] = list;
    }
    return list;
  }

  setCorruption(c: number): void {
    this.corruption = c;
  }

  get count(): number {
    return this.fragments.length;
  }

  spawn(variant: number, x: number, z: number, level: 0 | 1, height = 1.05): void {
    const list = this.protoFor(this.level);
    const mesh = list[variant % list.length].clone(`fragment-${this.count_++}`);
    mesh.setEnabled(true);
    mesh.isPickable = false;
    mesh.scaling.set(height, height * (1 + 0.1 * this.level), height);
    mesh.position.set(x, floorHeight(x, z, level * 3), z);
    mesh.visibility = 0;
    this.fragments.push({ mesh, home: { x, z }, clock: Math.random() * 3, phase: Math.random() * 6, gaze: 0, h: height });
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
      const flicker = Math.sin(f.clock * 23 + f.phase) > 0.8 ? 0.25 : 1;
      f.mesh.visibility = Math.min(f.mesh.visibility + dt * 0.8, 0.92 * flicker);
      // Looking straight at one for a while makes it go. The view cone is judged mostly in the horizontal plane.
      const to = f.mesh.position.subtract(camPos);
      const ty = (to.y + f.h * 0.5) * 0.3;
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
