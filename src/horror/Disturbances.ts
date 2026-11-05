import type { HorrorDirector } from "./HorrorDirector";
import { ROOM_BY_ID, ROOMS, type RoomId } from "../world/Layout";

/**
 * Small, deniable wrongnesses: a lamp that stutters, a tread overhead, a door standing open that was shut, the air going
 * cold. None of them show anything. They build the feeling that the house is paying attention.
 */
export type Disturbance = (h: HorrorDirector) => void;

function litRooms(h: HorrorDirector): RoomId[] {
  const rooms = new Set<RoomId>();
  for (const l of h.deps.lighting.allLamps) if (l.on && l.room && !l.culled) rooms.add(l.room);
  return [...rooms];
}

export interface DisturbanceDef {
  id: string;
  minTension: number;
  minChapter?: number;
  /** Extra conditions (where the player is, what has just happened). */
  when?: (h: HorrorDirector) => boolean;
  run: Disturbance;
}

export const DISTURBANCES: DisturbanceDef[] = [
  {
    id: "lamp-stutter",
    minTension: 0.2,
    run: (h) => {
      const here = h.room();
      const candidates = h.deps.lighting.allLamps.filter((l) => l.on && l.room && (l.room === here || h.sameLevelNear(l.room)));
      const lamp = candidates[Math.floor(Math.random() * candidates.length)];
      if (!lamp) return;
      let n = 0;
      const timer = window.setInterval(() => {
        lamp.disturb = n % 2 ? 1 : 0.08;
        if (++n > 7) {
          lamp.disturb = 1;
          window.clearInterval(timer);
        }
      }, 90);
    },
  },
  {
    id: "overhead-steps",
    minTension: 0.15,
    run: (h) => {
      // Slow, even footsteps on the other floor, placed along the landing so they cross the ceiling (or the hall below) from one side to the other.
      const upstairs = h.level() === 0;
      for (let i = 0; i < 6; i++) {
        const z = 4.0 + i * 0.75;
        h.later(i * 0.7, () => (upstairs ? h.deps.audio.stepAt(6.0, z) : h.deps.audio.stepAt(5.9, z)));
      }
    },
  },
  {
    id: "door-behind",
    minTension: 0.1,
    minChapter: 3,
    // The door of the room he has just left swings shut behind him (never one he is standing in, never a locked or fixed one).
    when: (h) => {
      const r = h.prevRoom;
      return !!r && h.clock - h.leftAt < 12 && !!closableDoor(h, r);
    },
    run: (h) => {
      const door = closableDoor(h, h.prevRoom!);
      if (!door) return;
      door.swingTo(0);
      h.deps.audio.slam(0.45);
    },
  },
  {
    id: "lights-behind",
    minTension: 0.1,
    minChapter: 3,
    // The lamp in the room he has just left goes out, and comes back after a while. Only lamps: no switch or puzzle state is touched.
    when: (h) => !!h.prevRoom && h.clock - h.leftAt < 12 && h.deps.lighting.allLamps.some((l) => l.on && l.room === h.prevRoom),
    run: (h) => {
      const room = h.prevRoom!;
      const lamps = h.deps.lighting.allLamps.filter((l) => l.on && l.room === room);
      lamps.forEach((l) => (l.disturb = 0.03));
      h.deps.audio.lampBuzz();
      h.later(9, () => lamps.forEach((l) => (l.disturb = 1)));
    },
  },
  {
    id: "chair-drag",
    minTension: 0.1,
    minChapter: 3,
    when: (h) => !!nearRoomCentre(h),
    run: (h) => {
      const at = nearRoomCentre(h);
      if (at) h.deps.audio.scrapeAt(at.x, at.z);
    },
  },
  {
    id: "emily-box",
    minTension: 0.15,
    minChapter: 4,
    when: (h) => h.room() !== "emily",
    run: (h) => {
      // From Emily's room: a few notes of a music box, thin and out of tune, then nothing.
      h.deps.audio.musicBoxAt(2.5, 8.5);
    },
  },
  {
    id: "door-ajar",
    minTension: 0.3,
    run: (h) => {
      const here = h.room();
      const door = Object.values(h.deps.house.doors).find((d) => !d.isOpen && !d.locked && !d.isFixed && d.rooms.some((r) => r !== here && h.sameLevelNear(r)));
      if (!door) return;
      door.setOpen(true);
      h.deps.audio.creak();
    },
  },
  {
    id: "cold",
    minTension: 0.35,
    run: (h) => {
      // The air thickens for a few seconds.
      const room = h.room();
      if (!room) return;
      const base = ROOM_BY_ID[room].fog;
      h.deps.lighting.setFogTarget(base * 2.2);
      window.setTimeout(() => h.deps.lighting.setFogTarget(base), 7000);
      h.deps.audio.stinger("swell");
    },
  },
  {
    id: "radio-blip",
    minTension: 0.3,
    run: (h) => {
      const id = "radio-living";
      h.deps.audio.setEmitter(id, true);
      window.setTimeout(() => h.deps.audio.setEmitter(id, false), 3200);
    },
  },
  {
    id: "settle",
    minTension: 0.15,
    run: (h) => {
      h.deps.audio.distantThump();
    },
  },
];

/** An open, unlocked, ordinary door of `room` that the player is not standing near, so it can swing shut behind them without trapping or startling them against it. */
function closableDoor(h: HorrorDirector, room: RoomId) {
  return Object.values(h.deps.house.doors).find((d) => {
    if (!d.isOpen || d.locked || d.isFixed || !d.rooms.includes(room)) return false;
    const c = d.leaf.getBoundingInfo().boundingBox.centerWorld;
    return Math.hypot(c.x - h.pos.x, c.z - h.pos.z) > 2.2;
  });
}

/** The middle of a room on the player's floor, other than the one they are in and not the next one over only (a few metres off, so it is heard, not seen). */
function nearRoomCentre(h: HorrorDirector): { x: number; z: number } | null {
  const here = h.room();
  const lvl = h.level();
  let best: { x: number; z: number; d: number } | null = null;
  for (const r of ROOMS) {
    if (r.id === here || r.level !== lvl) continue;
    const x = (r.x0 + r.x1) / 2;
    const z = (r.z0 + r.z1) / 2;
    const d = Math.hypot(x - h.pos.x, z - h.pos.z);
    if (d < 3 || d > 12) continue;
    if (!best || d < best.d) best = { x, z, d };
  }
  return best;
}

/** Rooms with a lit lamp, for rules that depend on light. */
export function lit(h: HorrorDirector): RoomId[] {
  return litRooms(h);
}

void ROOMS;
