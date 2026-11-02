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

export const DISTURBANCES: { id: string; minTension: number; run: Disturbance }[] = [
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
    minTension: 0.25,
    run: (h) => {
      // Slow, even footsteps on the other floor.
      let n = 0;
      const timer = window.setInterval(() => {
        h.deps.audio.thud();
        if (++n >= 6) window.clearInterval(timer);
      }, 620);
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

/** Rooms with a lit lamp, for rules that depend on light. */
export function lit(h: HorrorDirector): RoomId[] {
  return litRooms(h);
}

void ROOMS;
