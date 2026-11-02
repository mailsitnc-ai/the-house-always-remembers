import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { roundedBoxData } from "./RoundedBox";
import type { Material } from "@babylonjs/core/Materials/material";
import type { RoomId } from "./Layout";
import type { WorldContext } from "./WorldContext";
import { projectWorldUVs, type V3 } from "./geometry";

export interface PartOptions {
  rooms?: RoomId[];
  /** Blocks the player. Furniture should use a single invisible collider() instead of per-part collision. */
  collide?: boolean;
  /** Blocks the interaction ray. */
  pick?: boolean;
  /** Casts the flashlight shadow. */
  cast?: boolean;
  /** Eligible for static merging (default true unless the part collides or is pickable). */
  merge?: boolean;
  /** Metres per texture repeat (world-projected UVs). */
  tile?: number;
  /** Rotation in radians (x, y, z). */
  rot?: V3;
  /** Edge radius in metres. Softens the box (upholstery, worn wood). */
  round?: number;
  /** 2 makes the rounding visibly curved. */
  steps?: number;
  /** Small decoration that can be culled with distance. Detected automatically for parts under 16 cm. */
  detail?: boolean;
}

/**
 * Creates primitives and registers them with the room registry. Most parts are static decoration and are merged later;
 * only interactive or colliding parts stay separate meshes.
 */
export class Builder {
  private counter = 0;

  constructor(private readonly ctx: WorldContext) {}

  private finish(m: Mesh, mat: Material, pos: V3, o: PartOptions, tileDefault = 1): Mesh {
    m.position.set(pos[0], pos[1], pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    m.material = mat;
    m.checkCollisions = o.collide ?? false;
    m.isPickable = o.pick ?? false;
    const merge = o.merge ?? !(o.collide || o.pick);
    const ext = m.getBoundingInfo().boundingBox.extendSize;
    const detail = o.detail ?? (Math.max(ext.x, ext.y, ext.z) * 2 < 0.16 && !(o.collide || o.pick));
    this.ctx.track(m, o.rooms, { caster: o.cast, merge, detail });
    void tileDefault;
    return m;
  }

  box(name: string, size: V3, pos: V3, mat: Material, o: PartOptions = {}): Mesh {
    let m: Mesh;
    if (o.round) {
      m = new Mesh(`${name}-${this.counter++}`, this.ctx.scene);
      roundedBoxData(size[0], size[1], size[2], o.round, o.steps ?? 1).applyToMesh(m);
    } else {
      m = MeshBuilder.CreateBox(`${name}-${this.counter++}`, { width: size[0], height: size[1], depth: size[2] }, this.ctx.scene);
    }
    if (o.tile) projectWorldUVs(m, pos, o.tile);
    return this.finish(m, mat, pos, o);
  }

  cyl(name: string, d: { h: number; top?: number; bottom: number; sides?: number }, pos: V3, mat: Material, o: PartOptions = {}): Mesh {
    const m = MeshBuilder.CreateCylinder(
      `${name}-${this.counter++}`,
      { height: d.h, diameterTop: d.top ?? d.bottom, diameterBottom: d.bottom, tessellation: d.sides ?? 12 },
      this.ctx.scene,
    );
    return this.finish(m, mat, pos, o);
  }

  sphere(name: string, diameter: number, pos: V3, mat: Material, o: PartOptions = {}): Mesh {
    const m = MeshBuilder.CreateSphere(`${name}-${this.counter++}`, { diameter, segments: 8 }, this.ctx.scene);
    return this.finish(m, mat, pos, o);
  }

  plane(name: string, size: [number, number], pos: V3, mat: Material, o: PartOptions = {}): Mesh {
    const m = MeshBuilder.CreatePlane(`${name}-${this.counter++}`, { width: size[0], height: size[1], sideOrientation: 2 }, this.ctx.scene);
    return this.finish(m, mat, pos, o);
  }

  frame(origin: V3, yaw = 0, rooms?: RoomId[]): Frame {
    return new Frame(this, origin, yaw, rooms);
  }

  /** Soft contact shadow on the floor under a piece of furniture. `y` is the floor height of its storey. */
  contactShadow(w: number, d: number, x: number, y: number, z: number, yaw: number, rooms?: RoomId[]): void {
    const m = MeshBuilder.CreatePlane(`ao-${this.counter++}`, { width: w + 0.5, height: d + 0.5 }, this.ctx.scene);
    m.position.set(x, y + 0.022, z);
    m.rotation.set(Math.PI / 2, yaw, 0);
    m.material = this.ctx.mats.aoBlob;
    m.isPickable = false;
    this.ctx.track(m, rooms, { merge: true, detail: false });
  }

  /** Invisible collision (and interaction-ray) box. Furniture uses one of these instead of colliding per part. */
  collider(name: string, size: V3, pos: V3, o: { rooms?: RoomId[]; rot?: V3 } = {}): Mesh {
    const m = MeshBuilder.CreateBox(`col-${name}-${this.counter++}`, { width: size[0], height: size[1], depth: size[2] }, this.ctx.scene);
    m.position.set(pos[0], pos[1], pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    m.isVisible = false;
    m.checkCollisions = true;
    m.isPickable = true;
    this.ctx.track(m, o.rooms, { merge: false });
    m.freezeWorldMatrix();
    return m;
  }
}

/**
 * A local coordinate frame for furniture: positions are given relative to `origin` and rotated by `yaw` about Y,
 * so one piece of furniture can be written once and placed facing any direction.
 */
export class Frame {
  constructor(
    private readonly b: Builder,
    readonly origin: V3,
    readonly yaw: number,
    private readonly rooms?: RoomId[],
  ) {}

  /** Local point to world point. */
  at(l: V3): V3 {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    return [this.origin[0] + l[0] * c + l[2] * s, this.origin[1] + l[1], this.origin[2] - l[0] * s + l[2] * c];
  }

  private opts(o: PartOptions): PartOptions {
    return { rooms: this.rooms, ...o, rot: [0, this.yaw, 0] };
  }

  box(name: string, size: V3, local: V3, mat: Material, o: PartOptions = {}): Mesh {
    return this.b.box(name, size, this.at(local), mat, this.opts(o));
  }

  cyl(name: string, d: { h: number; top?: number; bottom: number; sides?: number }, local: V3, mat: Material, o: PartOptions = {}): Mesh {
    return this.b.cyl(name, d, this.at(local), mat, this.opts(o));
  }

  sphere(name: string, diameter: number, local: V3, mat: Material, o: PartOptions = {}): Mesh {
    return this.b.sphere(name, diameter, this.at(local), mat, this.opts(o));
  }

  plane(name: string, size: [number, number], local: V3, mat: Material, o: PartOptions = {}): Mesh {
    return this.b.plane(name, size, this.at(local), mat, this.opts(o));
  }

  collider(name: string, size: V3, local: V3): Mesh {
    // Furniture standing on the floor gets a soft contact shadow.
    if (local[1] - size[1] / 2 < 0.25) {
      const p = this.at(local);
      this.b.contactShadow(size[0], size[2], p[0], this.origin[1], p[2], this.yaw, this.rooms);
    }
    return this.b.collider(name, size, this.at(local), { rooms: this.rooms, rot: [0, this.yaw, 0] });
  }

  /** World-space direction of a local axis, for placing interactive parts that need a world vector. */
  dir(l: [number, number]): [number, number] {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    return [l[0] * c + l[1] * s, -l[0] * s + l[1] * c];
  }
}
