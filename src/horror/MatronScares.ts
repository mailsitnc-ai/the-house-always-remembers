import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { angleDiff } from "./Entity";
import type { Encounter } from "./Encounters";
import type { HorrorDirector } from "./HorrorDirector";
import { MIRROR_AT } from "./BathroomMirror";
import { floorHeight, type RoomId } from "../world/Layout";

/**
 * The Matron's authored scares. She is calm, patient and in control: each of these is staged by her, with a set-up the player can read, a payoff that lands, and a
 * disappearance that is abrupt, and each is different from the others. Every position goes through `Staging` (on a real floor, clear of furniture, in line of sight, never in
 * the camera). None can hurt the player or touch a puzzle; light and Daniel's own attention decide when she goes. Reduced scare intensity removes the visual jolt and
 * lowers the sound (the audio manager scales every sudden sound), and the scares are paced by `HorrorDirector`'s chapter table, never all at once.
 */
export function buildMatronScares(h: HorrorDirector): Encounter[] {
  const { matron, deps } = h;
  const { audio, house } = deps;
  const st = h.staging;
  const yaw = (): number => deps.player.camera.rotation.y;
  const fwd = (): { x: number; z: number } => ({ x: Math.sin(yaw()), z: Math.cos(yaw()) });
  const toward = (fx: number, fz: number): number => Math.atan2(h.pos.x - fx, h.pos.z - fz);
  const lookDot = (x: number, z: number): number => {
    const f = fwd();
    const dx = x - h.pos.x;
    const dz = z - h.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    return (dx * f.x + dz * f.z) / d;
  };
  const base = { major: true, once: false } as const;

  // A cool key light that lights only her, from the player's side, so she reads in a dark passage as well as in a lit room (it never lights the house).
  let key: PointLight | null = null;
  const lit = (x: number, z: number, level: 0 | 1): void => {
    if (!key) {
      key = new PointLight("matron-key", Vector3.Zero(), deps.scene);
      key.diffuse = new Color3(0.78, 0.84, 1);
      key.range = 5;
      key.includedOnlyMeshes = [...matron.meshList];
    }
    const dx = h.pos.x - x;
    const dz = h.pos.z - z;
    const d = Math.hypot(dx, dz) || 1;
    key.position.set(x + (dx / d) * 1.3, floorHeight(x, z, level * 3) + 1.9, z + (dz / d) * 1.3);
    key.intensity = 0.9;
    key.setEnabled(true);
  };
  const unlit = (): void => key?.setEnabled(false);
  // Prepared behind the loading screen (with the Matron's own warm-up): her key light and the mirror's light exist and are drawn once, so the first scare compiles nothing.
  h.warmers.push((on) => {
    if (on) {
      lit(0, 0, 0);
      lightFor(0, 4, 0);
    } else {
      unlit();
      mirrorLight?.setEnabled(false);
    }
  });
  const showAt = (x: number, z: number, level: 0 | 1, yawTo: number, fade: number): void => {
    matron.appear(x, z, level, yawTo, fade);
    lit(x, z, level);
  };
  const placeAt = (x: number, z: number, level: 0 | 1, yawTo: number): void => {
    matron.place(x, z, level, yawTo);
    lit(x, z, level);
  };

  // ---- A. The Turn: footsteps behind you; when you turn she is right there, facing you ----------------------------------------------------------------------
  let a = { t: 0, stage: 0, yaw0: 0, steps: 0 };
  const turn: Encounter = {
    ...base,
    id: "matron-turn",
    minChapter: 6,
    maxChapter: 8,
    minTension: 0.15,
    cooldown: 190,
    priority: 7,
    canStart: () => !!h.room() && !h.hunt && h.roomSeconds() > 5 && !h.speaking,
    start: () => {
      a = { t: 0, stage: 0, yaw0: yaw(), steps: 0 };
    },
    update: (dt) => {
      a.t += dt;
      const f = fwd();
      if (a.stage === 0) {
        // Slow steps behind, each a little nearer.
        const due = Math.min(3, Math.floor(a.t / 0.85));
        while (a.steps < due) {
          const d = 4.2 - a.steps * 1.0;
          audio.stepAt(h.pos.x - f.x * d, h.pos.z - f.z * d);
          a.steps++;
        }
        if (a.t > 3.1) {
          a.stage = 1;
          a.t = 0;
          audio.breathAt(h.pos.x - f.x * 1.1, h.pos.z - f.z * 1.1);
        }
        return false;
      }
      if (a.stage === 1) {
        const turned = Math.abs(angleDiff(a.yaw0, yaw())) > 1.25;
        if (!turned) {
          // He never turns: only the dread, and it is over.
          if (a.t > 7) {
            audio.stinger("swell");
            return true;
          }
          return false;
        }
        const spot = st.along(yaw(), 2.7, 1.7);
        if (!spot) return true;
        matron.headRate = 2;
        showAt(spot.x, spot.z, h.level(), toward(spot.x, spot.z), 0.1);
        audio.duck(0.25);
        a.stage = 2;
        a.t = 0;
        return false;
      }
      if (a.stage === 2) {
        // Long enough to see who it is.
        if (a.t > 1.5) {
          a.stage = 3;
          a.t = 0;
          h.scare({ sting: "sting" });
          h.jumpscares.punch(0.1);
          matron.leave(0.08);
        }
        return false;
      }
      return a.t > 0.9;
    },
    end: () => {
      matron.vanish();
      unlit();
    },
  };

  // ---- B. The Door Gap: a figure through a door left ajar; approach it and she is much nearer ----------------------------------------------------------------------
  // Doors she can wait behind: from inside a room (the passage beyond the door) or from a passage (the landing toward the bathroom door; the storage door is key-locked and never used).
  const GAP_DOORS = ["living", "dining", "daniel", "bathroom"];
  let b = { t: 0, stage: 0, door: "", cx: 0, cz: 0, dx: 0, dz: 0, sx: 0, sz: 0, lx: 0, lz: 0, seen: 0 };
  const doorCentre = (id: string): Vector3 | null => {
    const d = house.doors[id];
    return d ? d.leaf.getBoundingInfo().boundingBox.centerWorld.clone() : null;
  };
  const pickGapDoor = (): { id: string; c: Vector3; sx: number; sz: number; dx: number; dz: number; lx: number; lz: number } | null => {
    for (const id of GAP_DOORS) {
      const d = house.doors[id];
      if (!d || d.isOpen || d.locked || d.isFixed) continue;
      const c = doorCentre(id);
      if (!c) continue;
      const lvl: 0 | 1 = c.y > 2 ? 1 : 0;
      if (lvl !== h.level()) continue;
      const dist = Math.hypot(c.x - h.pos.x, c.z - h.pos.z);
      if (dist < 2.5 || dist > 9) continue;
      if (lookDot(c.x, c.z) < 0.5) continue;
      const near = new Vector3(c.x + ((h.pos.x - c.x) / dist) * 0.45, c.y, c.z + ((h.pos.z - c.z) / dist) * 0.45);
      if (st.blocked(h.pos, near)) continue;
      // She stands behind the door, straight through it along the wall's normal, on the far side from the player, at the latch side where the gap opens (the player faces it
      // from inside a room, she is in the passage).
      const alongX = d.wallAxis === "z";
      const lat = d.doorwayPoint(0.86);
      const sgn = alongX ? Math.sign(c.x - h.pos.x) || 1 : Math.sign(c.z - h.pos.z) || 1;
      const head = alongX ? Math.abs(c.x - h.pos.x) / dist : Math.abs(c.z - h.pos.z) / dist;
      if (head < 0.7) continue;
      let sx = 0;
      let sz = 0;
      let found = false;
      for (const off of [1.4, 1.1, 0.8]) {
        sx = alongX ? lat.x + sgn * off : lat.x;
        sz = alongX ? lat.z : lat.z + sgn * off;
        if (st.fits(sx, sz, lvl)) {
          found = true;
          break;
        }
      }
      if (!found) continue;
      return { id, c, sx, sz, dx: alongX ? sgn : 0, dz: alongX ? 0 : sgn, lx: lat.x, lz: lat.z };
    }
    return null;
  };
  const gap: Encounter = {
    ...base,
    id: "matron-doorgap",
    minChapter: 6,
    maxChapter: 8,
    minTension: 0.2,
    cooldown: 210,
    priority: 6,
    canStart: () => !!h.room() && !h.hunt && !h.speaking && !!pickGapDoor(),
    start: () => {
      const p = pickGapDoor();
      if (!p) return;
      b = { t: 0, stage: 0, door: p.id, cx: p.c.x, cz: p.c.z, dx: p.dx, dz: p.dz, sx: p.sx, sz: p.sz, lx: p.lx, lz: p.lz, seen: 0 };
      house.doors[p.id].swingTo(0.6);
      matron.headRate = 0.5;
      showAt(p.sx, p.sz, h.level(), toward(p.sx, p.sz), 2.2);
    },
    update: (dt) => {
      b.t += dt;
      const door = house.doors[b.door];
      if (!door) return true;
      const dist = Math.hypot(b.cx - h.pos.x, b.cz - h.pos.z);
      if (b.stage === 0) {
        // Timing: the payoff waits until he has actually seen her through the gap (a clear line to her head, looking at it) for over a second, and then until he is near;
        // if he comes right up to the door without having seen her, or touches it, it happens anyway.
        const head = new Vector3(b.sx, floorHeight(b.sx, b.sz, h.level() * 3) + 1.7, b.sz);
        if (matron.alpha > 0.5 && lookDot(b.sx, b.sz) > 0.8 && !st.blocked(h.pos, head)) b.seen += dt;
        const ready = (b.seen > 1.2 && dist < 2.6) || dist < 1.7 || !door.isAjar;
        if (ready) {
          b.stage = 1;
          b.t = 0;
          // The payoff: the door is thrown wide and she is in the doorway, right there.
          door.swingTo(1);
          audio.slam(0.8);
          // In the doorway, just through it, as near as is clear and not inside the camera.
          let nx = b.sx;
          let nz = b.sz;
          for (const off of [0.2, 0.6, 1.0]) {
            const x = b.lx + b.dx * off;
            const z = b.lz + b.dz * off;
            if (Math.hypot(x - h.pos.x, z - h.pos.z) >= 1.6 && st.fits(x, z, h.level())) {
              nx = x;
              nz = z;
              break;
            }
          }
          matron.headRate = 2;
          showAt(nx, nz, h.level(), toward(nx, nz), 0.08);
          h.deps.audio.duck(0.2);
          return false;
        }
        if (b.t > 30 || dist > 14) {
          // He walked away: she is gone and the door is shut again.
          door.swingTo(0);
          return true;
        }
        return false;
      }
      if (b.stage === 1 && b.t > 1.3) {
        b.stage = 2;
        b.t = 0;
        h.scare({ sting: "sting" });
        h.jumpscares.punch(0.1);
        matron.leave(0.08);
        return false;
      }
      return b.stage === 2 && b.t > 0.8;
    },
    end: () => {
      matron.vanish();
      unlit();
    },
  };

  // ---- C. The Reflection: she is in the bathroom mirror behind you; when you turn the room is empty ----------------------------------------------------------------------
  let c = { t: 0, stage: 0, yaw0: 0, ux: 0, uz: 0, sx: 0, sz: 0 };
  let mirrorLight: PointLight | null = null;
  const lightFor = (x: number, y: number, z: number): void => {
    if (!mirrorLight) {
      mirrorLight = new PointLight("matron-mirror-light", new Vector3(x, y, z), deps.scene);
      mirrorLight.diffuse = new Color3(0.7, 0.78, 0.92);
      mirrorLight.range = 4;
      mirrorLight.includedOnlyMeshes = [...matron.meshList];
    }
    mirrorLight.position.set(x, y, z);
    // Dim and cold: she is lit as if by the little light there is in the room, not by a lamp of her own.
    mirrorLight.intensity = 1.0;
    mirrorLight.setEnabled(true);
  };
  const mirrorEnd = (): void => {
    h.mirror.hide();
    mirrorLight?.setEnabled(false);
    matron.vanish();
  };
  // A place behind the player, on the floor, clear of the bathroom's fittings, whose reflection lands inside the glass as seen from the player's eye (so she is really in the mirror).
  // The bathroom is small and its fittings fill the east side, so this only exists when he stands at the basin in front of the glass; the scare waits for exactly that.
  const mirrorSpot = (): { x: number; z: number } | null => {
    const eye = h.pos;
    const d0 = Math.hypot(eye.x - MIRROR_AT.x, eye.z - MIRROR_AT.z) || 1;
    const ux = (eye.x - MIRROR_AT.x) / d0;
    const uz = (eye.z - MIRROR_AT.z) / d0;
    const f = fwd();
    for (let dd = 1.2; dd <= 3.2; dd += 0.1) {
      for (const lat of [0, 0.1, -0.1, 0.2, -0.2, 0.3, -0.3, 0.45, -0.45, 0.6, -0.6]) {
        const x = eye.x + ux * dd - uz * lat;
        const z = eye.z + uz * dd + ux * lat;
        if ((x - eye.x) * f.x + (z - eye.z) * f.z > 0.1 || !st.fits(x, z, 1)) continue;
        const t = (MIRROR_AT.x - eye.x) / (2 * MIRROR_AT.x - x - eye.x);
        if (Math.abs(eye.z + t * (z - eye.z) - MIRROR_AT.z) > 0.2) continue;
        return { x, z };
      }
    }
    return null;
  };
  const reflection: Encounter = {
    ...base,
    id: "matron-mirror",
    minChapter: 6,
    maxChapter: 8,
    minTension: 0.1,
    cooldown: 400,
    priority: 8,
    canStart: () => {
      if (h.room() !== "bathroom" || h.hunt || h.speaking) return false;
      const d = Math.hypot(MIRROR_AT.x - h.pos.x, MIRROR_AT.z - h.pos.z);
      return d > 1.2 && d < 3.4 && lookDot(MIRROR_AT.x, MIRROR_AT.z) > 0.85 && !!mirrorSpot();
    },
    start: () => {
      const d = Math.hypot(h.pos.x - MIRROR_AT.x, h.pos.z - MIRROR_AT.z) || 1;
      c = { t: 0, stage: 0, yaw0: yaw(), ux: (h.pos.x - MIRROR_AT.x) / d, uz: (h.pos.z - MIRROR_AT.z) / d, sx: 0, sz: 0 };
      h.dim(0.5);
      h.mirror.show(matron.meshList);
    },
    update: (dt) => {
      c.t += dt;
      if (c.stage === 0) {
        if (c.t > 1.3) {
          // Behind him, along the line from the glass through him, where only the reflection shows.
          const spot = mirrorSpot();
          if (!spot) {
            mirrorEnd();
            return true;
          }
          c.sx = spot.x;
          c.sz = spot.z;
          matron.headRate = 0;
          matron.appear(spot.x, spot.z, 1, Math.atan2(MIRROR_AT.x - spot.x, MIRROR_AT.z - spot.z), 0.35);
          lightFor(spot.x - c.ux * 0.8, floorHeight(spot.x, spot.z, 3) + 1.9, spot.z - c.uz * 0.8);
          audio.breathAt(spot.x, spot.z);
          c.stage = 1;
          c.t = 0;
        }
        return false;
      }
      if (c.stage === 1) {
        const turned = Math.abs(angleDiff(c.yaw0, yaw())) > 0.9;
        if (turned) {
          // The room behind him is empty. The reflection no longer matches.
          matron.vanish();
          mirrorLight?.setEnabled(false);
          h.scare({ sting: "drop" });
          h.jumpscares.punch(0.07);
          c.stage = 2;
          c.t = 0;
          return false;
        }
        if (c.t > 4.2) {
          // He keeps looking at the glass: she is suddenly at his shoulder, in the reflection.
          const x = h.pos.x + (c.sx - h.pos.x) * 0.62;
          const z = h.pos.z + (c.sz - h.pos.z) * 0.62;
          if (Math.hypot(x - h.pos.x, z - h.pos.z) > 0.9 && st.fits(x, z, 1)) matron.place(x, z, 1, Math.atan2(MIRROR_AT.x - x, MIRROR_AT.z - z));
          lightFor(x - c.ux * 0.6, 4.9, z - c.uz * 0.6);
          h.scare({ sting: "sting" });
          h.jumpscares.punch(0.1);
          c.stage = 3;
          c.t = 0;
        }
        return false;
      }
      if (c.stage === 3) {
        if (c.t > 1.2) {
          matron.vanish();
          mirrorLight?.setEnabled(false);
          c.stage = 2;
          c.t = 0;
        }
        return false;
      }
      // Stage 2: the empty room, in the glass, for a moment.
      if (c.t > 1.8) {
        mirrorEnd();
        return true;
      }
      return false;
    },
    end: mirrorEnd,
  };

  // ---- D. The Follower: each time the lights come back she is closer ----------------------------------------------------------------------
  let d = { t: 0, stage: 0, hops: 0, lastX: 0, lastZ: 0, lastYaw: 0, wait: 0 };
  const dist = (): number => matron.distanceTo(h.pos);
  const follower: Encounter = {
    ...base,
    id: "matron-follower",
    minChapter: 6,
    maxChapter: 8,
    minTension: 0.25,
    cooldown: 260,
    priority: 5,
    canStart: () => {
      const r = h.room();
      if (!r || h.hunt || h.speaking || !["hall", "uphall", "rear", "foyer"].includes(r)) return false;
      return !!st.along(yaw(), 9.5, 4.5);
    },
    start: () => {
      const spot = st.along(yaw(), 9.5, 4.5);
      d = { t: 0, stage: 0, hops: 0, lastX: h.pos.x, lastZ: h.pos.z, lastYaw: yaw(), wait: 0 };
      if (!spot) return;
      matron.headRate = 0.7;
      showAt(spot.x, spot.z, h.level(), toward(spot.x, spot.z), 1.2);
    },
    update: (dt) => {
      d.t += dt;
      if (!matron.visible && d.stage < 3) return true;
      d.wait += dt;
      const moved = Math.hypot(h.pos.x - d.lastX, h.pos.z - d.lastZ) > 1.6 || Math.abs(angleDiff(d.lastYaw, yaw())) > 0.6;
      if (d.stage < 3 && moved && d.wait > 1.5) {
        d.wait = 0;
        d.lastX = h.pos.x;
        d.lastZ = h.pos.z;
        d.lastYaw = yaw();
        // The lights stutter; in the dark she moves.
        h.dim(0.55);
        h.flick(0.5);
        audio.lampBuzz();
        h.later(0.2, () => {
          if (!matron.visible) return;
          const cur = dist();
          const nd = Math.max(2.4, cur * 0.66);
          const k = nd / (cur || 1);
          const x = h.pos.x + (matron.position.x - h.pos.x) * k;
          const z = h.pos.z + (matron.position.z - h.pos.z) * k;
          if (st.visible(x, z, h.level(), 1.9)) {
            placeAt(x, z, h.level(), toward(x, z));
            audio.stepAt(x, z);
          }
        });
        d.hops++;
        if (d.hops >= 4 || dist() < 3) d.stage = 3;
        return false;
      }
      if (d.stage === 3 && d.wait > 1.2) {
        // One more flicker, and the last time the light returns she is gone.
        d.stage = 4;
        h.dim(0.5);
        h.flick(0.5);
        h.later(0.25, () => {
          matron.vanish();
          h.scare({ sting: "sting" });
          h.jumpscares.punch(0.08);
        });
        d.wait = 0;
        return false;
      }
      if (d.stage === 4) return d.wait > 0.9;
      return d.t > 34;
    },
    end: () => {
      matron.vanish();
      unlit();
    },
  };

  // ---- E. The Safe Room: the room is lit and familiar; its sound changes; she is revealed in the dark just outside it ----------------------------------------------------------------------
  const SAFE: Partial<Record<RoomId, { x: number; z: number }>> = {
    living: { x: 2.25, z: 6.1 },
    foyer: { x: 6.5, z: 3.9 },
  };
  let e = { t: 0, stage: 0, room: "" as RoomId | "" };
  const safe: Encounter = {
    ...base,
    id: "matron-safe",
    minChapter: 7,
    maxChapter: 8,
    minTension: 0.1,
    cooldown: 300,
    priority: 9,
    canStart: () => {
      const r = h.room();
      if (!r || !SAFE[r] || h.hunt || h.speaking || !h.roomLit(r) || h.roomSeconds() < 9) return false;
      const s = SAFE[r]!;
      return st.visible(s.x, s.z, 0, 3);
    },
    start: () => {
      e = { t: 0, stage: 0, room: h.room()! };
      // The sound the room makes changes first: the clock stops, and everything goes quiet.
      audio.setEmitter("clock", false);
      audio.duck(2.4);
    },
    update: (dt) => {
      e.t += dt;
      const s = SAFE[e.room as RoomId]!;
      if (h.room() !== e.room) return true;
      if (e.stage === 0) {
        // The lamp stutters once, and she is there. She waits until he is facing the spot.
        if (e.t > 2.2 && lookDot(s.x, s.z) > 0.55) {
          h.dim(0.35);
          h.later(0.3, () => {
            if (!st.visible(s.x, s.z, 0, 2.5)) return;
            matron.headRate = 0.4;
            showAt(s.x, s.z, 0, toward(s.x, s.z), 0.3);
            h.scare({ sting: "swell" });
          });
          e.stage = 1;
          e.t = 0;
        } else if (e.t > 9) {
          audio.setEmitter("clock", true);
          return true;
        }
        return false;
      }
      if (e.stage === 1) {
        if (e.t > 3.2 || (matron.visible && matron.seenBy(h.pos, h.forward, 0.96) && e.t > 1.4)) {
          e.stage = 2;
          e.t = 0;
          // She does not cross the light. She steps back into the dark and is gone.
          const bx = s.x + (s.x - h.pos.x) * 0.5;
          const bz = s.z + (s.z - h.pos.z) * 0.5;
          matron.walk([{ x: bx, z: bz }], 0.9, () => matron.leave(0.6));
        }
        return false;
      }
      return e.t > 2.4 && !matron.visible;
    },
    end: () => {
      matron.vanish();
      unlit();
      audio.setEmitter("clock", true);
    },
  };

  // ---- Stalking: she watches from the far end and is gone when you look away; when you look back she is nearer ----------------------------------------------------------------------
  let w = { t: 0, away: 0, hops: 0 };
  let goneAt = 0;
  const watch: Encounter = {
    ...base,
    id: "matron-watch",
    minChapter: 6,
    maxChapter: 8,
    minTension: 0.12,
    cooldown: 150,
    priority: 3,
    canStart: () => !!h.room() && !h.hunt && !h.speaking && !!st.along(yaw(), 10, 4.5),
    start: () => {
      w = { t: 0, away: 0, hops: 0 };
      goneAt = h.clock;
      const spot = st.along(yaw(), 10, 4.5);
      if (!spot) return;
      matron.headRate = 0.6;
      showAt(spot.x, spot.z, h.level(), toward(spot.x, spot.z), 1.0);
    },
    update: (dt) => {
      w.t += dt;
      if (matron.visible) {
        const looking = lookDot(matron.position.x, matron.position.z) > 0.55;
        w.away = looking ? 0 : w.away + dt;
        if (w.away > 0.7) {
          // He looked away: she is gone. If he looks back soon she may have come nearer.
          matron.vanish();
          w.away = 0;
          w.t = Math.min(w.t, 20);
          w.hops += 1;
          goneAt = h.clock;
        }
      } else {
        const gone = goneAt;
        if (w.hops <= 2 && h.clock - gone < 7 && lookDot(matron.position.x, matron.position.z) > 0.7) {
          const cur = matron.distanceTo(h.pos);
          const nd = Math.max(3, cur * 0.62);
          const k = nd / (cur || 1);
          const x = h.pos.x + (matron.position.x - h.pos.x) * k;
          const z = h.pos.z + (matron.position.z - h.pos.z) * k;
          if (st.visible(x, z, h.level(), 2.5)) {
            showAt(x, z, h.level(), toward(x, z), 0.15);
            audio.stepAt(x, z);
            return false;
          }
        }
        if (h.clock - gone > 7) return true;
      }
      return w.t > 40;
    },
    end: () => {
      matron.vanish();
      unlit();
    },
  };

  // ---- F. The Last Look: in the final hunt, on the landing, she is standing in the way ahead, calm; she watches, steps nearer once in the dark, and is gone ----------------------------------------------------------------------
  let f = { t: 0, stage: 0, pulsed: false };
  const last: Encounter = {
    id: "matron-lastlook",
    major: true,
    once: true,
    minChapter: 8,
    maxChapter: 8,
    minTension: 0,
    cooldown: 0,
    priority: 120,
    canStart: () => h.hunt && h.level() === 1 && h.room() === "uphall" && !h.speaking && !!st.along(yaw(), 7.5, 3.5),
    start: () => {
      f = { t: 0, stage: 0, pulsed: false };
      const spot = st.along(yaw(), 7.5, 3.5);
      h.dim(1.5);
      audio.duck(1.2);
      if (!spot) return;
      matron.headRate = 0.35;
      showAt(spot.x, spot.z, 1, toward(spot.x, spot.z), 0.8);
    },
    update: (dt) => {
      f.t += dt;
      if (!matron.visible && f.stage < 2) return true;
      if (f.stage === 0) {
        if (f.t > 0.8 && !f.pulsed) {
          f.pulsed = true;
          audio.pulse();
        }
        if (f.t > 2.8 || (f.t > 1.4 && matron.seenBy(h.pos, h.forward, 0.9))) {
          f.stage = 1;
          f.t = 0;
          // The light stutters; she is a few steps nearer, and then gone. She never blocks the way for more than a moment and never touches him here.
          h.dim(0.5);
          h.flick(0.5);
          h.later(0.3, () => {
            const cur = matron.distanceTo(h.pos);
            const k = Math.max(2.6, cur * 0.6) / (cur || 1);
            const x = h.pos.x + (matron.position.x - h.pos.x) * k;
            const z = h.pos.z + (matron.position.z - h.pos.z) * k;
            if (st.visible(x, z, 1, 2.4)) placeAt(x, z, 1, toward(x, z));
            h.scare({ sting: "swell" });
          });
        }
        return false;
      }
      if (f.stage === 1 && f.t > 1.9) {
        matron.leave(0.3);
        f.stage = 2;
        f.t = 0;
        return false;
      }
      return f.stage === 2 && f.t > 1.2;
    },
    end: () => {
      matron.vanish();
      unlit();
    },
  };

  return [turn, gap, reflection, follower, safe, watch, last];
}
