import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Lamp } from "../atmosphere/LightingManager";
import type { Flashlight } from "../atmosphere/Flashlight";
import { LINKS, ROOMS, ROOM_BY_ID, roomAt, type RoomId } from "./Layout";

interface Pending {
  mesh: Mesh;
  rooms: RoomId[];
  cast: boolean;
  detail: boolean;
}

export interface TrackOptions {
  caster?: boolean;
  /** Static decoration: eligible for merging with other meshes of the same material and rooms. */
  merge?: boolean;
  /** Small decoration: merged separately and hidden beyond a distance. */
  detail?: boolean;
}

/**
 * Knows which meshes and lamps belong to which rooms. It merges static decoration into a handful of meshes per room,
 * confines each lamp's light to its own room, and enables only the rooms near the player.
 */
export class RoomRegistry {
  private readonly meshes = new Map<RoomId, AbstractMesh[]>();
  private readonly roomsOf = new Map<AbstractMesh, RoomId[]>();
  private readonly pending: Pending[] = [];
  private readonly lamps: { lamp: Lamp; room: RoomId }[] = [];
  private active = new Set<RoomId>();
  private current: RoomId | null = null;
  private readonly neighbours = new Map<RoomId, Set<RoomId>>();
  stats = { mergedFrom: 0, mergedTo: 0, tracked: 0 };
  onRoomChange: ((room: RoomId, fog: number) => void) | null = null;

  constructor(
    _scene: Scene,
    private readonly flashlight: Flashlight,
  ) {
    for (const r of ROOMS) {
      this.meshes.set(r.id, []);
      this.neighbours.set(r.id, new Set());
    }
    for (const [a, b] of LINKS) {
      this.neighbours.get(a)!.add(b);
      this.neighbours.get(b)!.add(a);
    }
  }

  /** Registers a mesh with rooms (auto-detected from its position if omitted). */
  track(mesh: AbstractMesh, rooms?: RoomId[], opts: TrackOptions = {}): void {
    const rs = rooms ?? this.autoRooms(mesh);
    this.stats.tracked++;
    if (opts.merge && mesh instanceof Mesh && !mesh.parent) {
      this.pending.push({ mesh, rooms: rs, cast: !!opts.caster, detail: !!opts.detail });
      return;
    }
    this.attach(mesh, rs);
    if (opts.caster) this.flashlight.addCaster(mesh);
  }

  /** Forgets a mesh (for example one that was picked up and disposed). */
  untrack(mesh: AbstractMesh): void {
    const rooms = this.roomsOf.get(mesh);
    if (!rooms) return;
    for (const r of rooms) {
      const arr = this.meshes.get(r)!;
      const i = arr.indexOf(mesh);
      if (i >= 0) arr.splice(i, 1);
    }
    this.roomsOf.delete(mesh);
  }

  registerLamp(lamp: Lamp, room: RoomId): void {
    lamp.room = room;
    this.lamps.push({ lamp, room });
  }

  private autoRooms(mesh: AbstractMesh): RoomId[] {
    const p = mesh.parent ? mesh.getAbsolutePosition() : mesh.position;
    const r = roomAt(p.x, p.z, p.y >= 2.9 ? 1 : 0);
    return r ? [r] : [];
  }

  private attach(mesh: AbstractMesh, rooms: RoomId[]): void {
    this.roomsOf.set(mesh, rooms);
    for (const r of rooms) this.meshes.get(r)!.push(mesh);
  }

  /** Merges static decoration, then restricts each lamp's light to its room. Call once after the house is built. */
  finalize(): void {
    const groups = new Map<string, Pending[]>();
    for (const p of this.pending) {
      const key = `${p.rooms.join("+")}|${p.mesh.material?.uniqueId ?? 0}|${p.cast ? 1 : 0}|${p.detail ? 1 : 0}`;
      const g = groups.get(key);
      if (g) g.push(p);
      else groups.set(key, [p]);
    }
    for (const [, g] of groups) {
      this.stats.mergedFrom += g.length;
      this.stats.mergedTo++;
      const { rooms, cast, detail } = g[0];
      const meshes = g.map((p) => p.mesh);
      const merged = meshes.length > 1 ? Mesh.MergeMeshes(meshes, true, true) : meshes[0];
      if (!merged) continue;
      merged.name = `static-${rooms.join("+")}-${merged.material?.name ?? "mat"}`;
      merged.checkCollisions = false;
      merged.isPickable = false;
      merged.receiveShadows = true;
      merged.freezeWorldMatrix();
      // Small clutter is not drawn from far away; large furniture and architecture always is.
      if (detail) merged.addLODLevel(10, null);
      this.attach(merged, rooms);
      if (cast) this.flashlight.addCaster(merged);
    }
    this.pending.length = 0;
    for (const { lamp, room } of this.lamps) lamp.light.includedOnlyMeshes = this.meshes.get(room)!;
  }

  /** Enables the room the player is in plus rooms within two links; everything else is switched off. */
  update(room: RoomId | null): void {
    if (room === this.current || !room) return;
    this.current = room;
    const next = new Set<RoomId>([room]);
    let frontier: RoomId[] = [room];
    for (let depth = 0; depth < 2; depth++) {
      const n: RoomId[] = [];
      for (const r of frontier) for (const nb of this.neighbours.get(r)!) if (!next.has(nb)) (next.add(nb), n.push(nb));
      frontier = n;
    }
    for (const [mesh, rooms] of this.roomsOf) mesh.setEnabled(rooms.some((r) => next.has(r)));
    for (const { lamp, room: r } of this.lamps) lamp.setCulled(!next.has(r));
    this.active = next;
    this.onRoomChange?.(room, ROOM_BY_ID[room].fog);
  }

  /**
   * Switches every room on and forces every mesh to be drawn each frame, so shaders for all of them compile now
   * (behind the loading screen) instead of as a stutter the first time the player walks into a room.
   * Call endWarmUp() afterwards to go back to normal culling.
   */
  beginWarmUp(): void {
    for (const mesh of this.roomsOf.keys()) {
      mesh.setEnabled(true);
      mesh.alwaysSelectAsActiveMesh = true;
    }
    for (const { lamp } of this.lamps) lamp.setCulled(false);
  }

  endWarmUp(): void {
    for (const mesh of this.roomsOf.keys()) mesh.alwaysSelectAsActiveMesh = false;
    const room = this.current;
    this.current = null;
    if (room) this.update(room);
  }

  get activeRooms(): ReadonlySet<RoomId> {
    return this.active;
  }

  get currentRoom(): RoomId | null {
    return this.current;
  }

  /** Counts for the performance overlay. */
  counts(): { rooms: number; meshes: number } {
    let n = 0;
    for (const m of this.roomsOf.keys()) if (m.isEnabled(false)) n++;
    return { rooms: this.active.size, meshes: n };
  }
}
