import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { HorrorDirector } from "./HorrorDirector";
import { ROOMS, ROOM_BY_ID, floorHeight, type RoomId } from "../world/Layout";

export interface Encounter {
  id: string;
  /** Major encounters share a long cooldown so scares stay rare. */
  major: boolean;
  once: boolean;
  minChapter: number;
  maxChapter: number;
  minTension: number;
  /** Seconds after it ends before it may run again (for repeatable ones). */
  cooldown: number;
  priority: number;
  canStart(): boolean;
  start(): void;
  /** Return true when finished. */
  update(dt: number): boolean;
  end?(): void;
}

const yawTo = (fx: number, fz: number, tx: number, tz: number): number => Math.atan2(tx - fx, tz - fz);

/** Where the Matron first stands, by the room the player is in: far enough away to be small, near enough to be seen. */
const FAR_SPOTS: Partial<Record<RoomId, { x: number; z: number }>> = {
  foyer: { x: 6.5, z: 7.2 },
  hall: { x: 6.5, z: 9.8 },
  living: { x: 2.3, z: 9.0 },
  dining: { x: 6.5, z: 9.5 },
};

/**
 * The Matron's encounters, one per story beat. Chapter 5 is where she first appears. Each is slow, calm and
 * non-violent: she watches, speaks in half-truths, and in one sequence walks toward the player at a steady pace.
 * Light is the only thing she respects; nothing here can kill the player.
 */
export function buildEncounters(h: HorrorDirector): Encounter[] {
  const { matron, hollow, unremembered, deps } = h;
  const { audio, lighting, flashlight, player, house, events } = deps;

  // ---- Chapter 5: the woman at the end of the hall --------------------------------------------
  let hallStage = 0;
  let hallSeen = 0;
  let hallT = 0;
  const hall: Encounter = {
    id: "matron-hall",
    major: true,
    once: true,
    minChapter: 5,
    maxChapter: 5,
    minTension: 0,
    cooldown: 0,
    priority: 10,
    canStart: () => h.sinceChapter(5) > 9 && !!FAR_SPOTS[h.room()!] && h.level() === 0,
    start: () => {
      const s = FAR_SPOTS[h.room()!]!;
      matron.headRate = 0.5;
      matron.appear(s.x, s.z, 0, yawTo(s.x, s.z, h.pos.x, h.pos.z), 2.5);
      lighting.dip(1.3);
      // First sight of her: the view turns slowly toward the far end of the hall, and can be taken back at once.
      h.later(1.6, () => h.focus(new Vector3(s.x, 1.9, s.z), 4.5));
      // She is not the figure seen upstairs. Daniel can tell the difference.
      h.later(4, () =>
        events.emit("thought", {
          text: h.deps.state.get("seen:witness")
            ? "That isn't what I saw by the recorder. That one wasn't looking at me. This one is."
            : "A tall woman at the end of the hall. She is looking straight at me.",
        }),
      );
      hallStage = 0;
      hallSeen = 0;
      hallT = 0;
    },
    update: (dt) => {
      hallT += dt;
      if (hallStage === 0) {
        hallSeen = matron.seenBy(h.pos, h.forward, 0.86) ? hallSeen + dt : Math.max(0, hallSeen - dt * 0.4);
        if (hallSeen > 2.2 || hallT > 22) {
          hallStage = 1;
          h.scare({ sting: "swell", duck: 0.8 });
          h.later(1.3, () => h.say("matron-hall"));
        }
      } else if (hallStage === 1) {
        if (hallT > 4 && !h.speaking) {
          hallStage = 2;
          // She walks directly away from you, into the dark, at the same slow pace, and is gone.
          const d = ROOM_BY_ID[matron.room ?? "rear"];
          const dx = matron.position.x - h.pos.x;
          const dz = matron.position.z - h.pos.z;
          const len = Math.hypot(dx, dz) || 1;
          const tx = Math.max(d.x0 + 0.5, Math.min(d.x1 - 0.5, matron.position.x + (dx / len) * 4));
          const tz = Math.max(d.z0 + 0.5, Math.min(d.z1 - 0.5, matron.position.z + (dz / len) * 4));
          matron.walk([{ x: tx, z: tz }], 0.75, () => matron.leave(3));
        }
      } else if (hallStage === 2 && !matron.visible) return true;
      if (hallT > 60) return true;
      return false;
    },
    end: () => {
      h.skipCine();
      matron.vanish();
    },
  };

  // ---- Chapter 5: the dining room ------------------------------------------------------------
  let livStage = 0;
  let livT = 0;
  let truthSaid = false;
  let livVoiceEnd = 0;
  const living: Encounter = {
    id: "matron-living",
    major: true,
    once: true,
    minChapter: 5,
    maxChapter: 5,
    minTension: 0,
    cooldown: 0,
    priority: 8,
    canStart: () => h.done.has("matron-hall") && h.clock - (h.lastEnd.get("matron-hall") ?? 0) > 25 && h.room() === "dining",
    start: () => {
      matron.headRate = 0;
      matron.appear(2.5, 10.2, 0, 0, 3);
      livStage = 0;
      livT = 0;
      truthSaid = false;
      livVoiceEnd = 0;
      audio.setEmitter("radio-living", true);
    },
    update: (dt) => {
      livT += dt;
      const dist = matron.distanceTo(h.pos);
      if (livStage === 0 && (dist < 5.5 || livT > 9)) {
        livStage = 1;
        matron.headRate = 0.45;
        livT = 0;
      } else if (livStage === 1 && livT > 3) {
        livStage = 2;
        livT = 0;
        h.scare({ sting: "swell", dip: 1.5 });
        h.say("matron-living");
      } else if (livStage === 2) {
        if (!truthSaid && dist < 2.2) {
          truthSaid = true;
          h.say("matron-truth", true);
        }
        if (!h.speaking) {
          livVoiceEnd += dt;
          if (livVoiceEnd > 1.5) {
            livStage = 3;
            audio.setEmitter("radio-living", false);
            matron.leave(3);
          }
        }
      } else if (livStage === 3 && !matron.visible) return true;
      return livT > 90;
    },
    end: () => {
      audio.setEmitter("radio-living", false);
      matron.vanish();
    },
  };

  // ---- Chapter 5 to 6: the long walk ---------------------------------------------------------
  let pStage = 0;
  let pT = 0;
  let repath = 0;
  let pulse = 0;
  let saved: [typeof lighting.allLamps[number], boolean][] = [];
  const restoreLamps = () => {
    for (const [l, on] of saved) if (!l.on && on) l.setOn(true);
    saved = [];
  };
  const resolve = (_kind: "lamp" | "timeout") => {
    pStage = 2;
    pT = 0;
    matron.stop();
    h.say("matron-lamp", true);
    matron.leave(3);
    h.later(5, restoreLamps);
  };
  const pursuit: Encounter = {
    id: "matron-pursuit",
    major: true,
    // Once in the story, but repeatable during the final hunt.
    get once() {
      return !h.hunt;
    },
    minChapter: 5,
    maxChapter: 8,
    minTension: 0,
    cooldown: 0,
    priority: 100,
    canStart: () => h.pursuitAt >= 0 && h.clock >= h.pursuitAt && !h.speaking,
    start: () => {
      pStage = 0;
      pT = 0;
      repath = 0;
      pulse = 0;
      audio.duck(1.2);
      h.later(1.0, () => audio.stinger("drop"));
      // The house goes dark except the dining room: the one place she will not follow.
      saved = lighting.allLamps.map((l) => [l, l.on] as [typeof l, boolean]);
      for (const l of lighting.allLamps) if (l.light.name !== "dining-light") l.setOn(false);
      const diningLamp = lighting.allLamps.find((l) => l.light.name === "dining-light");
      diningLamp?.setOn(true);
      // Spawn at least three rooms away.
      const lvl = h.level();
      let spawn = h.nav.center(ROOMS[0].id);
      let best = -1;
      for (const r of ROOMS) {
        const hops = h.nav.hops({ x: h.pos.x, z: h.pos.z }, lvl, h.nav.center(r.id), r.level);
        if (hops >= 3 && hops > best && r.level === lvl) {
          best = hops;
          spawn = h.nav.center(r.id);
        }
      }
      if (best < 0) for (const r of ROOMS) {
        const hops = h.nav.hops({ x: h.pos.x, z: h.pos.z }, lvl, h.nav.center(r.id), r.level);
        if (hops > best) {
          best = hops;
          spawn = h.nav.center(r.id);
        }
      }
      const spawnLevel = ROOMS.find((r) => h.nav.center(r.id) === spawn)?.level ?? lvl;
      matron.headRate = 0.7;
      matron.appear(spawn.x, spawn.z, spawnLevel as 0 | 1, yawTo(spawn.x, spawn.z, h.pos.x, h.pos.z), 1.6);
      h.later(1.5, () => h.say("matron-gift"));
      h.later(7, () => events.emit("thought", { text: "She doesn't come into the light." }));
    },
    update: (dt) => {
      pT += dt;
      // The final hunt ends the moment the player reaches Emily's room.
      if (h.hunt && h.level() === 1 && h.room() === "emily") {
        h.endHunt();
        matron.vanish();
        restoreLamps();
        events.emit("finale:arrived", {});
        return true;
      }
      if (pStage === 2) return pT > 5.5 && !matron.visible;
      const here = h.room();
      // Safe: standing in a lit room.
      if (pT > 3 && h.roomLit(here)) {
        resolve("lamp");
        return false;
      }
      const dist = Math.hypot(matron.position.x - h.pos.x, matron.position.z - h.pos.z);
      const sameStorey = Math.abs(matron.position.y - (player.floorBase)) < 1.6;
      // Re-plan her route every so often and walk it at a steady, unhurried pace.
      repath -= dt;
      if (repath <= 0) {
        repath = 0.7;
        const lvlM = (matron.position.y > 1.5 ? 1 : 0) as 0 | 1;
        const route = h.nav.route({ x: matron.position.x, z: matron.position.z }, lvlM, { x: h.pos.x, z: h.pos.z }, h.level());
        matron.walk(route, Math.min(1.35, 1.05 + pT * 0.006));
      }
      // She opens any door she passes.
      for (const d of Object.values(house.doors)) {
        const p = d.hingePosition;
        if (!d.isOpen && Math.hypot(p.x - matron.position.x, p.z - matron.position.z) < 2.0 && Math.abs(p.y - matron.position.y) < 1.8) {
          d.setOpen(true);
          audio.creak();
        }
      }
      // A slow heartbeat that quickens as she nears.
      pulse -= dt;
      if (dist < 10 && pulse <= 0) {
        pulse = 0.35 + dist / 14;
        audio.pulse();
      }
      if (sameStorey && dist < 1.35) {
        pStage = 3;
        events.emit("veil", { opacity: 1, ms: 700, color: "#e8e4dc" });
        h.later(0.9, () => {
          // She takes you to the lit room, and the light comes back on.
          matron.vanish();
          restoreLamps();
          player.setBase(0);
          player.position.set(2.6, 1.65, 6.9);
          player.setLook(0, 0);
          flashlight.kill(3.5);
          lighting.allLamps.find((l) => l.light.name === "dining-light")?.setOn(true);
          h.say("matron-caught", true);
          events.emit("veil", { opacity: 0, ms: 2200 });
        });
        h.later(3, () => (pStage = 2));
        pStage = 2;
        pT = 5;
        return false;
      }
      if (pT > 55) resolve("timeout");
      return false;
    },
    end: () => {
      restoreLamps();
      matron.vanish();
      // In the hunt she comes again after a pause, until the player is upstairs.
      if (h.hunt) h.pursuitAt = h.clock + 14;
    },
  };

  // ---- Chapters 6 and 7: a glimpse behind you -----------------------------------------------
  let dwT = 0;
  let dwSeen = 0;
  const doorway: Encounter = {
    id: "matron-doorway",
    major: true,
    once: false,
    minChapter: 6,
    maxChapter: 8,
    minTension: 0.45,
    cooldown: 160,
    priority: 3,
    canStart: () => !h.roomLit(h.room()) && h.room() !== null && !h.speaking,
    start: () => {
      const p = h.awayPoint(4);
      matron.headRate = 0.9;
      matron.appear(p.x, p.z, h.level(), yawTo(p.x, p.z, h.pos.x, h.pos.z), 1.0);
      dwT = 0;
      dwSeen = 0;
      audio.duck(0.6);
    },
    update: (dt) => {
      dwT += dt;
      dwSeen = matron.seenBy(h.pos, h.forward, 0.8) ? dwSeen + dt : 0;
      if (dwSeen > 1.4) {
        audio.stinger("sting");
        matron.vanish();
        return true;
      }
      if (dwT > 14) {
        matron.leave(2);
        return !matron.visible;
      }
      return false;
    },
    end: () => matron.vanish(),
  };

  // ---- Chapter 7: she asks you to leave it alone --------------------------------------------
  let nightT = 0;
  const night: Encounter = {
    id: "matron-night",
    major: false,
    once: true,
    minChapter: 7,
    maxChapter: 7,
    minTension: 0,
    cooldown: 0,
    priority: 5,
    canStart: () => h.sinceChapter(7) > 22 && h.room() !== null && !h.speaking,
    start: () => {
      nightT = 0;
      audio.setEmitter("radio-living", true);
      h.scare({ sting: "swell", dip: 1.4 });
      h.later(1.4, () => h.say("matron-night"));
    },
    update: (dt) => {
      nightT += dt;
      return nightT > 3 && !h.speaking;
    },
    end: () => audio.setEmitter("radio-living", false),
  };

  // ---- Chapter 8: beside the front door ------------------------------------------------------
  let doorT = 0;
  let doorSpoke = false;
  const door: Encounter = {
    id: "matron-door",
    major: true,
    once: false,
    minChapter: 8,
    maxChapter: 8,
    minTension: 0,
    cooldown: 40,
    priority: 20,
    canStart: () => (h.room() === "foyer" || h.room() === "hall") && h.level() === 0,
    start: () => {
      matron.headRate = 0.5;
      matron.appear(5.7, 1.0, 0, Math.PI / 2, 3);
      doorT = 0;
      doorSpoke = false;
    },
    update: (dt) => {
      doorT += dt;
      const dist = matron.distanceTo(h.pos);
      if (!doorSpoke && dist < 3 && !h.speaking) {
        doorSpoke = true;
        h.say("matron-door");
      }
      const away = h.room() !== "foyer" && h.room() !== "hall";
      if (away || deps.state.get("story:phase3-end")) {
        matron.leave(2.5);
        return !matron.visible;
      }
      return doorT > 240;
    },
    end: () => matron.vanish(),
  };

  // ---- The Hollow ---------------------------------------------------------------------------
  let hoT = 0;
  let hoJump = 0;
  const stalk: Encounter = {
    id: "hollow-stalk",
    major: true,
    once: false,
    minChapter: 4,
    maxChapter: 8,
    minTension: 0.5,
    cooldown: 150,
    priority: 4,
    canStart: () => {
      const r = h.room();
      return !!r && !h.roomLit(r) && ["living", "dining", "kitchen", "study", "daniel"].includes(r) && h.farPoint().dist >= 4;
    },
    start: () => {
      const p = h.farPoint();
      hollow.appear(p.x, p.z, h.level(), new Vector3(h.pos.x, 0, h.pos.z), 0.6);
      hoT = 0;
      hoJump = 0;
      audio.stinger("swell");
    },
    update: (dt) => {
      hoT += dt;
      const head = hollow.position.add(new Vector3(0, 1.3, 0));
      if (flashlight.lights(head, 10, 0.92)) {
        flashlight.flicker(0.25);
        if (hollow.lit(dt)) {
          audio.paper();
          hollow.hide(0.4);
          return true;
        }
      } else hollow.mode = "stalk";
      hoJump += dt;
      if (hoJump > 0.9) {
        hoJump = 0;
        hollow.jumpToward(h.pos.x, h.pos.z, 0.85);
      }
      if (hollow.distanceTo(h.pos) < 1.5) {
        // It reaches you: your light is taken for a moment, and it falls apart. Nothing worse.
        flashlight.kill(2.6);
        audio.stinger("sting");
        audio.duck(0.5);
        hollow.hide(0.3);
        return true;
      }
      if (hoT > 30) {
        hollow.hide(2);
        return true;
      }
      return false;
    },
    end: () => hollow.vanish(),
  };

  // ---- The Unremembered ---------------------------------------------------------------------
  let umT = 0;
  const memory: Encounter = {
    id: "emily-memory",
    major: false,
    once: false,
    minChapter: 3,
    maxChapter: 8,
    minTension: 0,
    cooldown: 130,
    priority: 2,
    // Not on top of the first Witness sighting: the fragments wait until that has been seen, and has gone.
    canStart: () => (h.room() === "emily" || h.room() === "uphall") && !h.speaking && (h.chapter >= 4 || h.deps.state.get("said:witness-gone")),
    start: () => {
      umT = 0;
      if (h.room() === "emily") {
        unremembered.spawn(0, 2.2, 9.6, 1);
        unremembered.spawn(1, 1.0, 6.9, 1);
        unremembered.spawn(2, 3.7, 6.9, 1, 1.3);
      } else {
        unremembered.spawn(0, 5.7, 8.4, 1);
        unremembered.spawn(1, 6.2, 3.7, 1);
      }
      h.say("whisper-promise");
    },
    update: (dt) => {
      umT += dt;
      const r = h.room();
      if (r !== "emily" && r !== "uphall") return true;
      return umT > 45 || unremembered.count === 0;
    },
    end: () => unremembered.clear(),
  };

  void ROOM_BY_ID;
  void floorHeight;
  return [hall, living, pursuit, doorway, night, door, stalk, memory];
}
