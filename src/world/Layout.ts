/**
 * Floor plan, in metres. X runs east, Z runs north (the front door is on the south wall, z = 0), Y is up.
 * Footprint 14 x 11. Two storeys; the upstairs floor surface is at y = 3.0.
 *
 *  GROUND (z up the page)                          UPSTAIRS
 *  z11 +----------+--------+--------------+       +----------+--------+--------------+
 *      |          |  rear  |              |       |          |storage | (bathroom    |
 *      |  dining  | passage|   kitchen    |       |  Emily   +--------+  x8-11.5     |
 *  z8  |          +--------+              |       |          | uphall |  z7-11)      |
 *      |          |  hall  |              |   z6  +----------+  +hole |              |
 *  z5.5+----------+  +stair+--------------+       |          |        |              |
 *      |  living  |        |    study     |       |  Daniel  |        |              |
 *  z2.8|          +--------+              |   z3  |          +--------+              |
 *      |          | foyer  |              |       |          |        |              |
 *  z0  +----------+--------+--------------+       +----------+--------+--------------+
 *      x0         x5       x8            x14
 */

export type RoomId =
  | "foyer" | "hall" | "rear" | "living" | "dining" | "kitchen" | "study"
  | "uphall" | "storage" | "daniel" | "emily" | "bathroom";

export interface RoomDef {
  id: RoomId;
  name: string;
  level: 0 | 1;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Scene fog density while the player is in this room. */
  fog: number;
}

export const LEVEL_Y = [0, 3.0] as const;
export const WALL_H = 2.8;
export const T = 0.2;

export const ROOMS: RoomDef[] = [
  { id: "foyer", name: "Foyer", level: 0, x0: 5, x1: 8, z0: 0, z1: 2.8, fog: 0.028 },
  { id: "hall", name: "Hallway", level: 0, x0: 5, x1: 8, z0: 2.8, z1: 8, fog: 0.032 },
  { id: "rear", name: "Rear passage", level: 0, x0: 5, x1: 8, z0: 8, z1: 11, fog: 0.04 },
  { id: "living", name: "Living room", level: 0, x0: 0, x1: 5, z0: 0, z1: 5.5, fog: 0.03 },
  { id: "dining", name: "Dining room", level: 0, x0: 0, x1: 5, z0: 5.5, z1: 11, fog: 0.026 },
  { id: "kitchen", name: "Kitchen", level: 0, x0: 8, x1: 14, z0: 5, z1: 11, fog: 0.036 },
  { id: "study", name: "Study", level: 0, x0: 8, x1: 14, z0: 0, z1: 5, fog: 0.03 },
  { id: "uphall", name: "Upstairs landing", level: 1, x0: 5, x1: 8, z0: 3, z1: 9.5, fog: 0.04 },
  { id: "storage", name: "Storage room", level: 1, x0: 5, x1: 8, z0: 9.5, z1: 11, fog: 0.05 },
  { id: "daniel", name: "Daniel's bedroom", level: 1, x0: 0, x1: 5, z0: 0, z1: 6, fog: 0.032 },
  { id: "emily", name: "Emily's bedroom", level: 1, x0: 0, x1: 5, z0: 6, z1: 11, fog: 0.024 },
  { id: "bathroom", name: "Bathroom", level: 1, x0: 8, x1: 11.5, z0: 7, z1: 11, fog: 0.038 },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, RoomDef>;

/** Rooms that are directly connected (opening, door or stairs). Used for culling and lamp management. */
export const LINKS: [RoomId, RoomId][] = [
  ["foyer", "living"], ["foyer", "study"], ["foyer", "hall"],
  ["hall", "living"], ["hall", "dining"], ["hall", "rear"],
  ["rear", "dining"], ["rear", "kitchen"], ["living", "dining"],
  ["hall", "uphall"],
  ["uphall", "daniel"], ["uphall", "emily"], ["uphall", "bathroom"], ["uphall", "storage"],
];

/** The staircase runs north from z0 (bottom, ground level) to z1 (top, upstairs level) along the hall's east wall. */
export const STAIRS = { x0: 6.6, x1: 8.0, z0: 3.2, z1: 7.8, rise: LEVEL_Y[1] };

export function roomAt(x: number, z: number, level: 0 | 1): RoomId | null {
  for (const r of ROOMS) if (r.level === level && x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) return r.id;
  return null;
}

export function inStairs(x: number, z: number): boolean {
  return x >= STAIRS.x0 && x <= STAIRS.x1 && z >= STAIRS.z0 && z <= STAIRS.z1;
}

/** Floor height under the player. On the stairs it follows the ramp; elsewhere it is the level the player is on. */
export function floorHeight(x: number, z: number, lastBase: number): number {
  if (inStairs(x, z)) {
    const t = Math.min(1, Math.max(0, (z - STAIRS.z0) / (STAIRS.z1 - STAIRS.z0)));
    return t * STAIRS.rise;
  }
  return lastBase < STAIRS.rise / 2 ? LEVEL_Y[0] : LEVEL_Y[1];
}

export interface Opening {
  from: number;
  to: number;
  /** Height of the bottom edge (0 for doors and cased openings, sill height for windows). */
  bottom: number;
  /** Height of the top edge. */
  top: number;
  kind: "cased" | "door" | "window";
}

export interface WallLine {
  /** "z": wall runs along Z at fixed x. "x": wall runs along X at fixed z. */
  axis: "x" | "z";
  fixed: number;
  from: number;
  to: number;
  level: 0 | 1;
  openings: Opening[];
}

const cased = (from: number, to: number): Opening => ({ from, to, bottom: 0, top: 2.2, kind: "cased" });
const door = (from: number, to: number): Opening => ({ from, to, bottom: 0, top: 2.1, kind: "door" });
const win = (from: number, to: number, bottom = 0.9, top = 2.1): Opening => ({ from, to, bottom, top, kind: "window" });

export const WALLS: WallLine[] = [
  // ---- ground floor, exterior ----
  { axis: "x", fixed: 0, from: 0, to: 14, level: 0, openings: [win(1.2, 3.8), door(6.0, 7.0), win(10, 12.4)] },
  { axis: "x", fixed: 11, from: 0, to: 14, level: 0, openings: [win(1.4, 3.6), door(6.0, 7.0), win(10, 12.2, 1.0)] },
  { axis: "z", fixed: 0, from: 0, to: 11, level: 0, openings: [win(1.6, 3.8), win(7.4, 9.6)] },
  { axis: "z", fixed: 14, from: 0, to: 11, level: 0, openings: [win(1.6, 3.6), win(7, 9, 1.0)] },
  // ---- ground floor, interior ----
  { axis: "z", fixed: 5, from: 0, to: 11, level: 0, openings: [cased(0.6, 2.2), door(4.0, 5.0), door(6.2, 7.2), cased(9.0, 10.0)] },
  { axis: "z", fixed: 8, from: 0, to: 11, level: 0, openings: [door(1.0, 2.0), cased(9.0, 10.0)] },
  { axis: "x", fixed: 2.8, from: 5, to: 8, level: 0, openings: [cased(5.5, 7.5)] },
  { axis: "x", fixed: 5.5, from: 0, to: 5, level: 0, openings: [cased(1.5, 3.0)] },
  { axis: "x", fixed: 8, from: 5, to: 8, level: 0, openings: [cased(5.5, 7.5)] },
  { axis: "x", fixed: 5, from: 8, to: 14, level: 0, openings: [] },
  // ---- upstairs, exterior ----
  { axis: "z", fixed: 0, from: 0, to: 11, level: 1, openings: [win(1.8, 3.8), win(7.4, 9.4)] },
  { axis: "x", fixed: 0, from: 0, to: 5, level: 1, openings: [win(1.4, 3.6)] },
  { axis: "x", fixed: 11, from: 0, to: 11.5, level: 1, openings: [win(1.4, 3.6), win(6.0, 7.0, 1.0), win(9.2, 10.4, 1.4, 2.0)] },
  { axis: "x", fixed: 3, from: 5, to: 8, level: 1, openings: [win(6.0, 7.0, 1.0, 2.1)] },
  // ---- upstairs, interior ----
  { axis: "z", fixed: 5, from: 0, to: 11, level: 1, openings: [door(4.2, 5.2), door(7.5, 8.5)] },
  { axis: "x", fixed: 6, from: 0, to: 5, level: 1, openings: [] },
  { axis: "z", fixed: 8, from: 3, to: 11, level: 1, openings: [door(8.0, 9.0)] },
  { axis: "x", fixed: 9.5, from: 5, to: 8, level: 1, openings: [door(6.0, 7.0)] },
  { axis: "x", fixed: 7, from: 8, to: 11.5, level: 1, openings: [] },
  { axis: "z", fixed: 11.5, from: 7, to: 11, level: 1, openings: [] },
];
