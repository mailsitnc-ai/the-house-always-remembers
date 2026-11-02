import type { Material } from "@babylonjs/core/Materials/material";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Frame } from "./Builder";
import type { Builder } from "./Builder";
import type { WorldContext, RoomId } from "./WorldContext";
import type { V3 } from "./geometry";
import { mulberry32 } from "./ProceduralTextures";
import { Door } from "./props/Door";
import { Drawer, type DrawerConfig } from "./props/Drawer";
import { TableLamp } from "./props/TableLamp";

/** Procedural furniture. Each function builds visual parts (merged later) and one invisible collider. */
export class Furniture {
  constructor(
    readonly ctx: WorldContext,
    readonly b: Builder,
  ) {}

  private get m() {
    return this.ctx.mats;
  }

  // ---- seating ---------------------------------------------------------------------------------

  sofa(F: Frame, w: number, mat: Material): void {
    const d = 0.9;
    F.box("sofa-base", [w, 0.28, d], [0, 0.24, 0], mat, { cast: true, tile: 1, round: 0.04, steps: 1 });
    for (const s of [-1, 1]) {
      F.box("sofa-seat", [w / 2 - 0.12, 0.14, d - 0.22], [s * (w / 4 - 0.02), 0.45, 0.1], mat, { cast: true, tile: 1, round: 0.05, steps: 2 });
      F.box("sofa-backcushion", [w / 2 - 0.16, 0.38, 0.16], [s * (w / 4 - 0.02), 0.68, -d / 2 + 0.3], mat, { cast: true, tile: 1, round: 0.06, steps: 2 });
      F.box("sofa-arm", [0.2, 0.36, d], [s * (w / 2 - 0.1), 0.5, 0], mat, { cast: true, tile: 1, round: 0.05, steps: 2 });
      F.box("sofa-leg", [0.06, 0.1, 0.06], [s * (w / 2 - 0.12), 0.05, d / 2 - 0.1], this.m.dark);
      F.box("sofa-leg", [0.06, 0.1, 0.06], [s * (w / 2 - 0.12), 0.05, -d / 2 + 0.1], this.m.dark);
    }
    F.box("sofa-back", [w, 0.5, 0.2], [0, 0.6, -d / 2 + 0.1], mat, { cast: true, tile: 1, round: 0.05, steps: 1 });
    F.collider("sofa", [w, 0.9, d], [0, 0.45, 0]);
  }

  armchair(F: Frame, mat: Material): void {
    F.box("chair-base", [0.85, 0.28, 0.85], [0, 0.24, 0], mat, { cast: true, tile: 1, round: 0.04, steps: 1 });
    F.box("chair-seat", [0.6, 0.14, 0.6], [0, 0.45, 0.06], mat, { tile: 1, round: 0.05, steps: 2 });
    F.box("chair-back", [0.85, 0.6, 0.2], [0, 0.65, -0.33], mat, { cast: true, tile: 1, round: 0.05, steps: 2 });
    for (const s of [-1, 1]) F.box("chair-arm", [0.16, 0.34, 0.85], [s * 0.34, 0.5, 0], mat, { tile: 1, round: 0.045, steps: 2 });
    F.collider("armchair", [0.85, 0.95, 0.85], [0, 0.47, 0]);
  }

  diningChair(F: Frame, collide = true): Mesh | null {
    const wood = this.m.woodMid;
    F.box("dchair-seat", [0.42, 0.05, 0.42], [0, 0.46, 0], wood, { cast: true, tile: 1, round: 0.012, steps: 1 });
    F.box("dchair-back", [0.42, 0.45, 0.04], [0, 0.74, -0.19], wood, { tile: 1, round: 0.012, steps: 1 });
    for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) F.box("dchair-leg", [0.04, 0.46, 0.04], [x, 0.23, z], wood);
    return collide ? F.collider("dchair", [0.44, 0.95, 0.44], [0, 0.47, 0]) : null;
  }

  deskChair(F: Frame, mat: Material): void {
    F.box("dc-seat", [0.46, 0.06, 0.46], [0, 0.46, 0], mat, { cast: true, tile: 1, round: 0.02, steps: 1 });
    F.box("dc-back", [0.44, 0.5, 0.05], [0, 0.76, -0.2], mat, { tile: 1, round: 0.02, steps: 1 });
    F.cyl("dc-post", { h: 0.4, bottom: 0.05 }, [0, 0.23, 0], this.m.dark);
    F.box("dc-foot", [0.5, 0.03, 0.06], [0, 0.03, 0], this.m.dark);
    F.box("dc-foot", [0.06, 0.03, 0.5], [0, 0.03, 0], this.m.dark);
    F.collider("deskchair", [0.5, 0.95, 0.5], [0, 0.47, 0]);
  }

  stool(F: Frame): void {
    F.cyl("stool-seat", { h: 0.04, bottom: 0.34 }, [0, 0.62, 0], this.m.woodMid);
    for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]] as const) F.box("stool-leg", [0.03, 0.62, 0.03], [x, 0.31, z], this.m.woodMid);
    F.collider("stool", [0.36, 0.65, 0.36], [0, 0.32, 0]);
  }

  // ---- tables and storage ----------------------------------------------------------------------

  table(F: Frame, w: number, d: number, h: number, mat: Material, collide = true): void {
    F.box("table-top", [w, 0.05, d], [0, h - 0.025, 0], mat, { cast: true, tile: 1, round: 0.01, steps: 1 });
    F.box("table-apron", [w - 0.2, 0.08, d - 0.2], [0, h - 0.09, 0], mat);
    for (const x of [-1, 1]) for (const z of [-1, 1]) F.box("table-leg", [0.07, h - 0.05, 0.07], [x * (w / 2 - 0.08), (h - 0.05) / 2, z * (d / 2 - 0.08)], mat, { tile: 1 });
    if (collide) F.collider("table", [w, h, d], [0, h / 2, 0]);
  }

  /** Low unit with a top overhang and framed doors. Doors are decorative unless the caller adds Door instances. */
  cabinet(F: Frame, w: number, d: number, h: number, mat: Material, opts: { doors?: number; legs?: boolean } = {}): void {
    const base = opts.legs ? 0.12 : 0;
    F.box("cab-body", [w, h - base - 0.03, d], [0, base + (h - base - 0.03) / 2, 0], mat, { cast: true, tile: 1, round: 0.006, steps: 1 });
    F.box("cab-top", [w + 0.04, 0.03, d + 0.03], [0, h - 0.015, 0.005], this.m.woodDark, { tile: 1, round: 0.008, steps: 1 });
    if (opts.legs) for (const x of [-1, 1]) for (const z of [-1, 1]) F.box("cab-leg", [0.05, base, 0.05], [x * (w / 2 - 0.06), base / 2, z * (d / 2 - 0.06)], this.m.woodDark);
    const n = opts.doors ?? 2;
    for (let i = 0; i < n; i++) {
      const dw = w / n;
      F.box("cab-panel", [dw - 0.06, h - base - 0.14, 0.012], [-w / 2 + dw * (i + 0.5), base + (h - base) / 2 - 0.01, d / 2 + 0.004], this.m.woodDark, { tile: 1 });
      F.box("cab-knob", [0.025, 0.025, 0.025], [-w / 2 + dw * (i + 0.5) + (i % 2 ? -0.08 : 0.08), base + (h - base) / 2, d / 2 + 0.02], this.m.brass);
    }
    F.collider("cabinet", [w, h, d], [0, h / 2, 0]);
  }

  desk(F: Frame, mat: Material): void {
    F.box("desk-top", [1.4, 0.04, 0.7], [0, 0.74, 0], mat, { cast: true, tile: 1, round: 0.01, steps: 1 });
    for (const s of [-1, 1]) F.box("desk-side", [0.04, 0.72, 0.64], [s * 0.64, 0.36, 0], mat, { tile: 1 });
    F.box("desk-back", [1.24, 0.4, 0.02], [0, 0.5, -0.3], mat, { tile: 1 });
    F.collider("desk", [1.4, 0.76, 0.7], [0, 0.38, 0]);
  }

  bookshelf(F: Frame, w: number, h: number, seed: number, depth = 0.3): void {
    const r = mulberry32(seed);
    const wood = this.m.woodMid;
    for (const s of [-1, 1]) F.box("shelf-side", [0.03, h, depth], [s * (w / 2 - 0.015), h / 2, 0], wood, { cast: true, tile: 1 });
    F.box("shelf-back", [w, h, 0.015], [0, h / 2, -depth / 2 + 0.008], this.m.dark);
    F.box("shelf-top", [w + 0.03, 0.03, depth + 0.02], [0, h + 0.015, 0.005], wood, { tile: 1 });
    const rows = Math.max(2, Math.floor(h / 0.36));
    const gap = (h - 0.06) / rows;
    for (let i = 0; i <= rows; i++) F.box("shelf-board", [w - 0.04, 0.025, depth], [0, 0.03 + i * gap, 0], wood, { tile: 1 });
    for (let i = 0; i < rows; i++) {
      const y0 = 0.045 + i * gap;
      let x = -w / 2 + 0.05;
      while (x < w / 2 - 0.1) {
        if (r() < 0.07) {
          x += 0.1 + r() * 0.15;
          continue;
        }
        const t = 0.025 + r() * 0.04;
        const bh = Math.min(gap - 0.05, 0.17 + r() * 0.12);
        F.box("book", [t, bh, depth * 0.7], [x + t / 2, y0 + bh / 2, 0.02], this.m.books[Math.floor(r() * this.m.books.length)]);
        x += t + 0.003;
      }
    }
    F.collider("bookshelf", [w, h, depth], [0, h / 2, 0]);
  }

  // ---- beds and bedroom ------------------------------------------------------------------------

  bed(F: Frame, spread: Material, width: number, length = 1.95): void {
    const wood = this.m.woodMid;
    F.box("bed-frame", [width, 0.2, length], [0, 0.2, 0], wood, { cast: true, tile: 1, round: 0.012, steps: 1 });
    F.box("bed-mattress", [width - 0.06, 0.2, length - 0.1], [0, 0.4, 0.02], this.m.white, { round: 0.045, steps: 2 });
    F.box("bed-spread", [width, 0.07, length - 0.55], [0, 0.52, 0.27], spread, { cast: true, tile: 0.8, round: 0.03, steps: 2 });
    F.box("bed-fold", [width, 0.09, 0.3], [0, 0.545, -length / 2 + 0.7], spread, { tile: 0.8, round: 0.03, steps: 2 });
    F.box("bed-pillow", [width * 0.55, 0.11, 0.32], [0, 0.56, -length / 2 + 0.3], this.m.white, { round: 0.05, steps: 2 });
    F.box("bed-headboard", [width + 0.06, 0.75, 0.05], [0, 0.55, -length / 2 - 0.02], wood, { cast: true, tile: 1, round: 0.02, steps: 1 });
    F.box("bed-footboard", [width + 0.06, 0.4, 0.04], [0, 0.4, length / 2 + 0.02], wood, { tile: 1, round: 0.015, steps: 1 });
    // Stops at mattress height so objects lying on the bed (a teddy bear) can still be targeted.
    F.collider("bed", [width + 0.06, 0.6, length + 0.06], [0, 0.3, 0]);
  }

  wardrobeBody(F: Frame, w: number, d: number, h: number, mat: Material): void {
    F.box("wardrobe-body", [w, h, d - 0.03], [0, h / 2, -0.015], mat, { cast: true, tile: 1, round: 0.006, steps: 1 });
    F.box("wardrobe-top", [w + 0.04, 0.04, d + 0.02], [0, h + 0.02, 0], mat, { tile: 1, round: 0.01, steps: 1 });
    F.collider("wardrobe", [w, h, d], [0, h / 2, 0]);
  }

  dresserBody(F: Frame, w: number, d: number, h: number, mat: Material): void {
    F.box("dresser-body", [w, h - 0.03, d - 0.03], [0, (h - 0.03) / 2, -0.015], mat, { cast: true, tile: 1, round: 0.006, steps: 1 });
    F.box("dresser-top", [w + 0.04, 0.03, d + 0.02], [0, h - 0.015, 0], this.m.woodDark, { tile: 1, round: 0.01, steps: 1 });
    F.collider("dresser", [w, h, d], [0, h / 2, 0]);
  }

  // ---- doors and drawers placed in a frame -----------------------------------------------------

  /** A hinged cabinet-style door on the front (+z) face of a frame. `side` = which edge the hinge is on (+1 right, -1 left). */
  frontDoor(F: Frame, o: { id: string; z: number; x: number; side: 1 | -1; width: number; height: number; y0?: number; mat: Material; rooms: RoomId[]; label?: string; maxAngle?: number; onToggle?: (open: boolean) => void }): Door {
    const [nx, nz] = F.dir([0, 1]).map(Math.round) as [number, number];
    const [rx, rz] = F.dir([1, 0]).map(Math.round) as [number, number];
    const axis: "x" | "z" = rx !== 0 ? "x" : "z";
    const hingeWorld = F.at([o.x + (o.side * o.width) / 2, o.y0 ?? 0, o.z]);
    // The leaf extends from the hinge toward the door's centre: opposite to `side` along the local x axis.
    const leafLocal = -o.side;
    const leafDir = (axis === "x" ? rx * leafLocal : rz * leafLocal) as 1 | -1;
    return new Door(this.ctx, this.b, {
      id: o.id,
      axis,
      hinge: new Vector3(hingeWorld[0], hingeWorld[1], hingeWorld[2]),
      width: o.width,
      height: o.height,
      leafDir,
      opensToward: [nx, nz],
      rooms: o.rooms,
      locked: false,
      lockedMessage: "",
      material: o.mat,
      thickness: 0.025,
      collide: false,
      knobs: false,
      label: o.label ?? "cabinet",
      maxAngle: o.maxAngle ?? Math.PI * 0.62,
      onToggle: o.onToggle,
    });
  }

  /** A drawer sliding out of the front (+z) face of a frame. */
  frontDrawer(F: Frame, o: { id: string; x: number; y: number; z: number; width: number; height: number; travel?: number; mat: Material; rooms: RoomId[]; fill?: DrawerConfig["fill"]; onOpen?: () => void; locked?: DrawerConfig["locked"] }): Drawer {
    const [nx, nz] = F.dir([0, 1]).map(Math.round) as [number, number];
    return new Drawer(this.ctx, this.b, {
      id: o.id,
      pos: F.at([o.x, o.y, o.z]),
      dir: [nx, nz],
      width: o.width,
      height: o.height,
      travel: o.travel ?? 0.36,
      material: o.mat,
      rooms: o.rooms,
      fill: o.fill,
      onOpen: o.onOpen,
      locked: o.locked,
    });
  }

  // ---- lights ----------------------------------------------------------------------------------

  tableLamp(name: string, pos: V3, room: RoomId, opts: { on: boolean; interactive: boolean; intensity?: number; range?: number; flicker?: number }): TableLamp {
    const lamp = new TableLamp(this.ctx, { name, position: new Vector3(pos[0], pos[1], pos[2]), rooms: [room], on: opts.on, interactive: opts.interactive, intensity: opts.intensity, range: opts.range, flicker: opts.flicker });
    this.ctx.registerLamp(lamp.lamp, room);
    return lamp;
  }

  /** Hanging pendant light. Returns the lamp. */
  pendant(name: string, pos: V3, room: RoomId, o: { on: boolean; intensity: number; range: number; flicker?: number; dimmable?: boolean; colour?: [number, number, number]; startup?: boolean; glow?: number }): ReturnType<WorldContext["lighting"]["createLamp"]> {
    const shade = this.m.lampShade(`${name}-shade`);
    const ceiling = pos[1] > 3 ? 5.8 : 2.8;
    const cord = ceiling - pos[1];
    this.b.cyl(`${name}-cord`, { h: cord, bottom: 0.012 }, [pos[0], pos[1] + cord / 2, pos[2]], this.m.dark, { rooms: [room] });
    const bulb = this.b.cyl(`${name}-shade`, { h: 0.2, top: 0.12, bottom: 0.4, sides: 14 }, [pos[0], pos[1], pos[2]], shade, { rooms: [room], merge: false });
    void bulb;
    const lamp = this.ctx.lighting.createLamp(`${name}-light`, new Vector3(pos[0], pos[1] - 0.15, pos[2]), {
      on: o.on,
      intensity: o.intensity,
      range: o.range,
      flicker: o.flicker,
      eventDimmable: o.dimmable,
      startup: o.startup,
      glow: o.glow ?? 1.1,
      color: o.colour ? new Color3(o.colour[0], o.colour[1], o.colour[2]) : undefined,
    });
    lamp.shade = shade;
    lamp.setOn(o.on);
    this.ctx.registerLamp(lamp, room);
    return lamp;
  }

  /** Wall sconce. `facing` is the wall normal into the room. */
  sconce(name: string, pos: V3, facing: [number, number], room: RoomId, o: { on: boolean; intensity: number; range: number; flicker?: number; dimmable?: boolean }): ReturnType<WorldContext["lighting"]["createLamp"]> {
    const shade = this.m.lampShade(`${name}-shade`);
    const rot = Math.atan2(facing[0], facing[1]);
    const F = this.b.frame([pos[0], pos[1], pos[2]], rot, [room]);
    F.box("sconce-plate", [0.1, 0.16, 0.02], [0, 0, 0.01], this.m.brass);
    F.cyl("sconce-shade", { h: 0.2, top: 0.07, bottom: 0.14, sides: 10 }, [0, 0.08, 0.1], shade, { merge: false });
    const lp = F.at([0, 0.1, 0.16]);
    const lamp = this.ctx.lighting.createLamp(`${name}-light`, new Vector3(lp[0], lp[1], lp[2]), { on: o.on, intensity: o.intensity, range: o.range, flicker: o.flicker, eventDimmable: o.dimmable, glow: 0.55 });
    lamp.shade = shade;
    lamp.setOn(o.on);
    this.ctx.registerLamp(lamp, room);
    return lamp;
  }

  // ---- small objects ---------------------------------------------------------------------------

  mug(pos: V3, room?: RoomId): void {
    this.b.cyl("mug", { h: 0.09, bottom: 0.08, sides: 10 }, pos, this.m.ceramic, { rooms: room ? [room] : undefined });
  }

  plate(pos: V3, room?: RoomId, d = 0.24): void {
    this.b.cyl("plate", { h: 0.012, bottom: d, sides: 16 }, pos, this.m.ceramic, { rooms: room ? [room] : undefined });
  }

  bookStack(pos: V3, n: number, yaw: number, seed: number, room?: RoomId): void {
    const r = mulberry32(seed);
    let y = pos[1];
    for (let i = 0; i < n; i++) {
      const h = 0.025 + r() * 0.03;
      this.b.box("stack-book", [0.2 + r() * 0.06, h, 0.15 + r() * 0.04], [pos[0], y + h / 2, pos[2]], this.m.books[Math.floor(r() * this.m.books.length)], { rot: [0, yaw + (r() - 0.5) * 0.5, 0], rooms: room ? [room] : undefined });
      y += h;
    }
  }

  vase(pos: V3, room?: RoomId): void {
    this.b.cyl("vase", { h: 0.24, top: 0.07, bottom: 0.13, sides: 12 }, [pos[0], pos[1] + 0.12, pos[2]], this.m.ceramic, { rooms: room ? [room] : undefined });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      this.b.sphere("flower", 0.06, [pos[0] + Math.cos(a) * 0.04, pos[1] + 0.34 + (i % 2) * 0.04, pos[2] + Math.sin(a) * 0.04], this.m.toys[i % this.m.toys.length], { rooms: room ? [room] : undefined });
    }
  }

  rug(name: string, w: number, d: number, pos: [number, number], mat: Material, room: RoomId, yaw = 0, level = 0): void {
    this.b.box(name, [w, 0.015, d], [pos[0], (level ? 3 : 0) + 0.008, pos[1]], mat, { rooms: [room], rot: [0, yaw, 0], tile: 1 });
  }
}

export type MeshLike = Mesh;
