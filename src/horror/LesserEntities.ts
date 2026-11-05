import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Encounter } from "./Encounters";
import { WITNESS_SPOTS, type HorrorDirector } from "./HorrorDirector";
import { ROOM_BY_ID, type RoomId } from "../world/Layout";

/**
 * What the three lesser entities do, as authored behaviours. They are distinct from the Matron and from each other:
 *  - the Hollow is denial. It stands where the proof is, in the way of the view, makes a broken-signal noise, steps toward him in jumps, and dissolves when it is approached or lit;
 *  - the Unremembered are places the memory has failed. They come in rooms where a memory is doubtful, the air thickens and the picture swims a little, and they go when looked at;
 *  - the Witness (in `HorrorDirector.updateWitness`) is the silent guide and gets only a shutter flash when it is noticed.
 * None of them blocks a path or takes any control (a figure can be walked through), none hurts, and every one ends by itself.
 */
export function buildLesserEntities(h: HorrorDirector): Encounter[] {
  const { hollow, unremembered, deps } = h;
  const { audio, lighting, flashlight } = deps;
  const st = h.staging;
  const yaw = (): number => deps.player.camera.rotation.y;

  // Rooms where a memory is still in doubt: the ones that hold evidence he has not yet found.
  const uncertain = (room: RoomId | null): { at: [number, number]; level: 0 | 1 } | null => {
    if (!room) return null;
    const s = WITNESS_SPOTS.find((w) => w.room === room && !deps.story.evidence.has(w.evidence));
    return s ? { at: s.at, level: s.level } : null;
  };

  // ---- The Hollow: denial, in front of the evidence --------------------------------------------------------------------------------
  // Its movement signature: it never walks. It holds, then is somewhere else: a hop toward him, a sidestep that goes nowhere, a freeze with the head snapped toward the evidence and then toward him.
  // The cadence is irregular, and it never does the same thing twice running. Compare the Matron (still and slow) and the Witness (drifting).
  let d = { t: 0, hops: 0, next: 0, last: "", at: [0, 0] as [number, number] };
  const denial: Encounter = {
    id: "hollow-denial",
    major: true,
    once: false,
    minChapter: 4,
    maxChapter: 8,
    minTension: 0.2,
    cooldown: 200,
    priority: 5,
    canStart: () => {
      const u = uncertain(h.room());
      if (!u || h.hunt || h.speaking || h.witness.visible || u.level !== h.level()) return false;
      const dist = Math.hypot(u.at[0] - h.pos.x, u.at[1] - h.pos.z);
      return dist > 3.2 && dist < 10 && st.visible(u.at[0], u.at[1], u.level, 3);
    },
    start: () => {
      const u = uncertain(h.room())!;
      d = { t: 0, hops: 0, next: 1.1 + Math.random() * 0.8, last: "", at: u.at };
      hollow.appear(u.at[0], u.at[1], u.level, new Vector3(h.pos.x, 0, h.pos.z), 0.5);
      audio.hollowStaticAt(u.at[0], u.at[1]);
    },
    update: (dt) => {
      d.t += dt;
      const head = hollow.position.add(new Vector3(0, 1.3, 0));
      const dist = hollow.distanceTo(h.pos);
      // Light on it, or walking up to it: it breaks up. It was only ever in the way of his eyes, never of his feet.
      if (flashlight.lights(head, 10, 0.92)) {
        flashlight.flicker(0.2);
        if (hollow.lit(dt)) {
          audio.paper();
          hollow.hide(0.4);
          return true;
        }
      } else hollow.mode = "stalk";
      if (dist < 2.2) {
        audio.hollowStaticAt(hollow.position.x, hollow.position.z);
        hollow.hide(0.3);
        return true;
      }
      d.next -= dt;
      if (d.next <= 0) {
        d.next = 0.7 + Math.random() * 1.6;
        const options = ["hop", "side", "freeze"].filter((k) => k !== d.last && (k !== "hop" || d.hops < 3));
        const act = options[Math.floor(Math.random() * options.length)];
        d.last = act;
        const hx = hollow.position.x;
        const hz = hollow.position.z;
        if (act === "hop") {
          d.hops++;
          hollow.jumpToward(h.pos.x, h.pos.z, 0.6 + Math.random() * 0.35);
        } else if (act === "side") {
          const dx = h.pos.x - hx;
          const dz = h.pos.z - hz;
          const dl = Math.hypot(dx, dz) || 1;
          const s = Math.random() < 0.5 ? 1 : -1;
          const nx = hx - (dz / dl) * 0.5 * s;
          const nz = hz + (dx / dl) * 0.5 * s;
          // Only where it still stands on a clear floor and does not get nearer than before.
          if (st.fits(nx, nz, h.level()) && Math.hypot(nx - h.pos.x, nz - h.pos.z) >= dist - 0.05) hollow.jumpToward(nx, nz, 0.5);
        } else {
          // Freeze: the head snaps to where the proof is, holds, and then to him.
          hollow.snapHeadToward(d.at[0] + (d.at[0] - hx) * 0.5, d.at[1] + (d.at[1] - hz) * 0.5);
          h.later(0.6, () => hollow.snapHeadToward(h.pos.x, h.pos.z));
        }
        audio.hollowStaticAt(hollow.position.x, hollow.position.z);
      }
      if (d.t > 16) {
        hollow.hide(1.2);
        return true;
      }
      return false;
    },
    end: () => hollow.vanish(),
  };

  // ---- The Hollow: a glimpse far down a passage, gone when seen -----------------------------------------------------------------------
  let g = { t: 0, seen: 0 };
  const glimpse: Encounter = {
    id: "hollow-glimpse",
    major: false,
    once: false,
    minChapter: 5,
    maxChapter: 8,
    minTension: 0.25,
    cooldown: 110,
    priority: 2,
    canStart: () => !!h.room() && !h.hunt && !h.speaking && !!st.along(yaw(), 10, 6.5),
    start: () => {
      g = { t: 0, seen: 0 };
      const s = st.along(yaw(), 10, 6.5);
      if (!s) return;
      hollow.appear(s.x, s.z, h.level(), new Vector3(h.pos.x, 0, h.pos.z), 0.35);
    },
    update: (dt) => {
      g.t += dt;
      if (!hollow.visible && g.t > 1) return true;
      if (hollow.seenBy(h.pos, h.forward, 0.93)) g.seen += dt;
      // He looks straight at it for a moment, and it is not there.
      if (g.seen > 1.7) {
        audio.hollowStatic();
        hollow.vanish();
        return true;
      }
      return g.t > 9;
    },
    end: () => hollow.vanish(),
  };

  // ---- The Hollow: the ghoul. Seen far off in the dark, still; then, between one look and the next, it is on him in three jumps, and it is gone. -----------------------------------------
  // The jump scare of the Hollow. It cannot touch him (it stops 1.6 m short and breaks up), and a beam of light on it still ends it at once. Under reduced intensity it only creeps nearer.
  let gh = { t: 0, stage: 0, jumps: 0 };
  const ghoul: Encounter = {
    id: "hollow-ghoul",
    major: true,
    once: false,
    minChapter: 5,
    maxChapter: 8,
    minTension: 0.35,
    cooldown: 330,
    priority: 6,
    canStart: () => {
      const r = h.room();
      return !!r && !h.roomLit(r) && !h.hunt && !h.speaking && h.roomSeconds() > 4 && !!st.along(yaw(), 8, 5);
    },
    start: () => {
      gh = { t: 0, stage: 0, jumps: 0 };
      const s = st.along(yaw(), 8, 5);
      if (!s) return;
      hollow.appear(s.x, s.z, h.level(), new Vector3(h.pos.x, 0, h.pos.z), 0.6);
      audio.hollowStaticAt(s.x, s.z);
    },
    update: (dt) => {
      gh.t += dt;
      if (!hollow.visible && gh.t > 1) return true;
      const head = hollow.position.add(new Vector3(0, 1.3, 0));
      if (flashlight.lights(head, 10, 0.92)) {
        flashlight.flicker(0.2);
        if (hollow.lit(dt)) {
          audio.paper();
          hollow.hide(0.3);
          return true;
        }
      }
      if (gh.stage === 0) {
        // It stands and watches, its head turning in jerks, while the light on him is short.
        if (Math.floor(gh.t * 2) % 3 === 0) hollow.snapHeadToward(h.pos.x, h.pos.z);
        if (gh.t > 3.2 && hollow.seenBy(h.pos, h.forward, 0.6)) {
          gh.stage = 1;
          gh.t = 0;
          h.dim(0.35);
          h.flick(0.4);
        } else if (gh.t > 14) {
          hollow.hide(1.5);
          return true;
        }
        return false;
      }
      if (gh.stage === 1) {
        // In the dark: three jumps, each shorter than the last, each with a burst of static.
        if (gh.t > 0.38 && gh.jumps < 3) {
          gh.t = 0;
          gh.jumps++;
          const dist = hollow.distanceTo(h.pos);
          const stop = h.reduced ? 3.2 : 1.6;
          const step = Math.max(0, Math.min(dist - stop, gh.jumps === 3 ? dist : dist * 0.45));
          if (step > 0.1) hollow.jumpToward(h.pos.x, h.pos.z, step);
          audio.hollowStaticAt(hollow.position.x, hollow.position.z);
          if (gh.jumps === 3) {
            h.scare({ sting: "sting" });
            h.jumpscares.punch(0.12);
            hollow.snapHeadToward(h.pos.x, h.pos.z);
          }
        }
        if (gh.jumps >= 3 && gh.t > 0.5) {
          gh.stage = 2;
          gh.t = 0;
          audio.hollowStaticAt(hollow.position.x, hollow.position.z);
          hollow.hide(0.12);
        }
        return false;
      }
      return gh.t > 0.6;
    },
    end: () => hollow.vanish(),
  };

  // ---- The Unremembered: a failing memory in the room, thick air, a swimming view -----------------------------------------------------
  let u = { t: 0, fov: 0, room: null as RoomId | null, again: false };
  const FOV_BASE = (): number => deps.player.camera.fov;
  let baseFov = 0;
  const wrong: Encounter = {
    id: "unremembered-wrong",
    major: false,
    once: false,
    minChapter: 4,
    maxChapter: 8,
    minTension: 0.2,
    cooldown: 140,
    priority: 3,
    canStart: () => {
      const r = h.room();
      return !!r && r !== "emily" && r !== "uphall" && !!uncertain(r) && !h.hunt && !h.speaking && h.roomSeconds() > 6 && unremembered.count === 0;
    },
    start: () => {
      u = { t: 0, fov: 0, room: h.room(), again: false };
      baseFov = FOV_BASE();
      // Three fragments at places in this room that can be seen from where he stands: they cannot be walked into and are gone when looked at.
      let placed = 0;
      for (const a of [0.8, -0.8, 1.3, -1.3, 0.45, -0.45, 1.9, -1.9]) {
        if (placed >= 3) break;
        const s = st.along(yaw() + a, 7, 2.5);
        if (s) {
          unremembered.spawn(placed, s.x, s.z, h.level(), 1.05 + placed * 0.12);
          placed++;
        }
      }
      audio.unstable();
      if (u.room) lighting.setFogTarget(ROOM_BY_ID[u.room].fog * 1.9);
    },
    update: (dt) => {
      u.t += dt;
      // The picture swims: the field of view breathes by a few percent. Not under reduced intensity; never the controls.
      if (!h.reduced) deps.player.camera.fov = baseFov * (1 + 0.035 * Math.sin(u.t * 1.7) * Math.min(1, u.t / 2));
      if (u.t > 3.5 && !u.again) {
        u.again = true;
        audio.unstable();
      }
      // The swim lasts at least a few seconds even if he stares them all away; it ends when they are gone, or he leaves the room.
      return (unremembered.count === 0 && u.t > 6) || u.t > 28 || h.room() !== u.room;
    },
    end: () => {
      unremembered.clear();
      deps.player.camera.fov = baseFov || deps.player.camera.fov;
      if (u.room && h.room() === u.room) lighting.setFogTarget(ROOM_BY_ID[u.room].fog);
    },
  };

  return [denial, glimpse, ghoul, wrong];
}
