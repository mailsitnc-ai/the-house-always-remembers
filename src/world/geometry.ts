import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { Material } from "@babylonjs/core/Materials/material";

export type V3 = [number, number, number];

export interface BoxOptions {
  /** Blocks the player (default true). */
  collide?: boolean;
  /** Can be targeted by the interaction ray and blocks it (default true). */
  pickable?: boolean;
  /** Texture tiling in world metres per repeat; omit to leave UVs at 0..1. */
  tileMeters?: number;
  receiveShadows?: boolean;
  /** Static meshes get a frozen world matrix, which saves per-frame work. */
  frozen?: boolean;
}

/**
 * Box-projects UVs from world position so a texture repeats every `tile` metres on every face,
 * with wallpaper stripes always vertical, and so neighbouring wall segments line up.
 */
export function projectWorldUVs(m: Mesh, origin: V3, tile: number): void {
  const p = m.getVerticesData(VertexBuffer.PositionKind);
  const n = m.getVerticesData(VertexBuffer.NormalKind);
  if (!p || !n) return;
  const uvs = new Float32Array((p.length / 3) * 2);
  for (let i = 0; i < p.length / 3; i++) {
    const x = p[i * 3] + origin[0];
    const y = p[i * 3 + 1] + origin[1];
    const z = p[i * 3 + 2] + origin[2];
    const nx = Math.abs(n[i * 3]);
    const ny = Math.abs(n[i * 3 + 1]);
    const [u, v] = ny > 0.5 ? [x, z] : nx > 0.5 ? [z, y] : [x, y];
    uvs[i * 2] = u / tile;
    uvs[i * 2 + 1] = v / tile;
  }
  m.setVerticesData(VertexBuffer.UVKind, uvs);
}

/** Axis-aligned box centred on pos. UVs can be scaled so wallpaper and planks keep a constant real-world size. */
export function box(scene: Scene, name: string, size: V3, pos: V3, mat: Material, o: BoxOptions = {}): Mesh {
  const m = MeshBuilder.CreateBox(name, { width: size[0], height: size[1], depth: size[2] }, scene);
  m.position.set(pos[0], pos[1], pos[2]);
  m.material = mat;
  m.checkCollisions = o.collide ?? true;
  m.isPickable = o.pickable ?? true;
  m.receiveShadows = o.receiveShadows ?? false;
  if (o.tileMeters) projectWorldUVs(m, pos, o.tileMeters);
  if (o.frozen) m.freezeWorldMatrix();
  return m;
}

/** Maps the two large faces of a door leaf to 0..1 so a panel texture fills the leaf; the thin edges get a sliver. */
export function panelUVs(m: Mesh, size: V3): void {
  const p = m.getVerticesData(VertexBuffer.PositionKind);
  const n = m.getVerticesData(VertexBuffer.NormalKind);
  if (!p || !n) return;
  const uvs = new Float32Array((p.length / 3) * 2);
  const wide = size[0] > size[2] ? 0 : 2; // the leaf's long horizontal axis
  for (let i = 0; i < p.length / 3; i++) {
    const along = (p[i * 3 + wide] + size[wide] / 2) / size[wide];
    const up = (p[i * 3 + 1] + size[1] / 2) / size[1];
    const face = Math.abs(n[i * 3 + (wide === 0 ? 2 : 0)]) > 0.5;
    uvs[i * 2] = face ? along : 0.02;
    uvs[i * 2 + 1] = face ? up : 0.02;
  }
  m.setVerticesData(VertexBuffer.UVKind, uvs);
}
