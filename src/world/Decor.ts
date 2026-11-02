import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Mesh as MeshClass } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Builder } from "./Builder";
import type { WorldContext, RoomId } from "./WorldContext";
import type { V3 } from "./geometry";
import { photograph, drawing, paperSheet, type PhotoKind, type DrawingKind } from "./PaperTextures";
import { Readable } from "./props/Readable";
import { Frame } from "./Builder";
import type { Inspectable } from "../player/InspectionSystem";
import type { Interactable } from "../player/InteractionSystem";

let textureSeed = 500;

/** Wall pictures, notes and other readable paper. Everything readable is deliberately mundane. */
export class Decor {
  constructor(
    private readonly ctx: WorldContext,
    private readonly b: Builder,
  ) {}

  /**
   * A framed photograph on a wall. `facing` is the wall normal into the room (a unit vector in XZ).
   * `pos` is the centre of the frame, on the wall surface.
   */
  photo(pos: V3, facing: [number, number], size: [number, number], kind: PhotoKind, room: RoomId, title: string, text: string, ev?: string): void {
    const tex = photograph(this.ctx.scene, `photo-${textureSeed}`, textureSeed++, kind, size[0] / size[1]);
    this.framed(pos, facing, size, tex, room, { verb: "photograph", title, text, id: `photo-${textureSeed}`, ev }, this.ctx.mats.dark);
  }

  /** A child's drawing pinned to a wall (no frame). */
  drawing(pos: V3, facing: [number, number], size: [number, number], kind: DrawingKind, room: RoomId, title: string, text: string, ev?: string): void {
    const tex = drawing(this.ctx.scene, `drawing-${textureSeed}`, textureSeed++, kind);
    this.framed(pos, facing, size, tex, room, { verb: "drawing", title, text, id: `drawing-${textureSeed}`, ev }, undefined);
  }

  private framed(
    pos: V3,
    facing: [number, number],
    size: [number, number],
    tex: import("@babylonjs/core/Materials/Textures/baseTexture").BaseTexture,
    room: RoomId,
    info: { verb: string; title: string; text: string; id: string; ev?: string },
    frameMat: Material | undefined,
  ): void {
    const yaw = Math.atan2(facing[0], facing[1]);
    const F = new Frame(this.b, pos, yaw, [room]);
    if (frameMat) F.box("pic-frame", [size[0] + 0.07, size[1] + 0.07, 0.035], [0, 0, 0.0175], frameMat);
    const pic = F.box("pic", [size[0], size[1], 0.012], [0, 0, frameMat ? 0.038 : 0.008], this.ctx.mats.textured(`${info.id}-mat`, tex), { pick: true, merge: false });
    new Readable(this.ctx, this.b, pic, { id: info.id, verb: info.verb, title: info.title, text: info.text, texture: tex, // Large enough to examine, but never taller than the view at inspection distance (so tall photographs are not cropped).
      size: ((k) => [size[0] * k, size[1] * k] as [number, number])(Math.min(2.2, 0.5 / size[1])),
      evidence: info.ev,
    });
  }

  /**
   * A sheet of paper lying flat on a surface. `pos` is the centre of the sheet's resting position (y = surface height).
   * Returns the mesh so callers can parent it to a drawer or door.
   */
  noteOnSurface(pos: V3, yaw: number, lines: string[], room: RoomId | undefined, title: string, o: { ruled?: boolean; paper?: string; verb?: string; text?: string; ev?: string } = {}): Mesh {
    const tex = paperSheet(this.ctx.scene, `note-${textureSeed}`, textureSeed++, lines, { title, ruled: o.ruled, paper: o.paper });
    const F = new Frame(this.b, [pos[0], pos[1] + 0.003, pos[2]], yaw, room ? [room] : undefined);
    const m = F.box("note", [0.21, 0.004, 0.15], [0, 0, 0], this.ctx.mats.textured(`note-mat-${textureSeed}`, tex), { pick: true, merge: false });
    new Readable(this.ctx, this.b, m, { id: `note-${textureSeed}`, verb: o.verb ?? "note", title, text: o.text ?? "A handwritten note.", texture: tex, size: [0.3, 0.3], evidence: o.ev });
    return m;
  }

  /** A sheet attached to a vertical surface (fridge door, pinboard). */
  noteOnWall(pos: V3, facing: [number, number], lines: string[], room: RoomId, title: string, text: string, size: [number, number] = [0.15, 0.2], ev?: string): Mesh {
    const tex = paperSheet(this.ctx.scene, `wnote-${textureSeed}`, textureSeed++, lines, { title, ruled: true });
    const yaw = Math.atan2(facing[0], facing[1]);
    const F = new Frame(this.b, pos, yaw, [room]);
    const m = F.box("wall-note", [size[0], size[1], 0.006], [0, 0, 0.003], this.ctx.mats.textured(`wnote-mat-${textureSeed}`, tex), { pick: true, merge: false });
    new Readable(this.ctx, this.b, m, { id: `wnote-${textureSeed}`, verb: "note", title, text, texture: tex, size: [0.3, 0.4], evidence: ev });
    return m;
  }

  /** A readable item that also appears as an unlit sheet when inspected, placed as a generic interactable. */
  inspectable(meshes: Mesh | Mesh[], item: Inspectable, prompt: string, ev?: string): void {
    const ctx = this.ctx;
    const it: Interactable = {
      prompt: () => prompt,
      interact: () => {
        ctx.audio.paper();
        ctx.inspection.open(item);
        if (ev) ctx.evidence.collect(ev);
      },
    };
    ctx.interaction.register(meshes, it, ev ? `read:${ev}` : undefined);
  }

  /** A soft toy built from spheres, merged into one mesh so it can be inspected up close. */
  teddy(F: Frame, local: V3, room: RoomId, ev?: string): Mesh {
    const mat = this.ctx.mats.armchair;
    let inspectMat: StandardMaterial | null = null;
    const build = (scale: number, center: boolean): Mesh => {
      const parts: Mesh[] = [];
      const s = (d: number, x: number, y: number, z: number) => {
        const m = MeshBuilder.CreateSphere("teddy-part", { diameter: d * scale, segments: 8 }, this.ctx.scene);
        m.position.set(x * scale, y * scale, z * scale);
        m.material = mat;
        parts.push(m);
      };
      s(0.2, 0, 0.1, 0);
      s(0.14, 0, 0.26, 0.02);
      s(0.06, -0.06, 0.32, 0.02);
      s(0.06, 0.06, 0.32, 0.02);
      s(0.07, -0.12, 0.14, 0.05);
      s(0.07, 0.12, 0.14, 0.05);
      s(0.07, -0.06, 0.02, 0.06);
      s(0.07, 0.06, 0.02, 0.06);
      const merged = MeshClass.MergeMeshes(parts, true, true)!;
      if (center) merged.position.y -= 0.1 * scale;
      return merged;
    };
    const mesh = build(1, false);
    const p = F.at(local);
    mesh.position.set(p[0], p[1], p[2]);
    mesh.rotation.y = F.yaw;
    mesh.isPickable = true;
    this.ctx.track(mesh, [room], { merge: false });
    this.inspectable(
      mesh,
      {
        id: "teddy",
        title: "Teddy bear",
        text: "A well-loved bear. One ear has been sewn back on with thread that does not quite match.",
        build: () => {
          const m = build(2.2, true);
          m.checkCollisions = false;
          if (!inspectMat) {
            inspectMat = new StandardMaterial("teddy-inspect", this.ctx.scene);
            inspectMat.disableLighting = true;
            inspectMat.emissiveColor = new Color3(0.42, 0.3, 0.2);
          }
          m.material = inspectMat;
          return m;
        },
      },
      "Examine teddy bear",
      ev,
    );
    return mesh;
  }
}
