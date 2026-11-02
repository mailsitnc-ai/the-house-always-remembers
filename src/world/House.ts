import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { WorldContext } from "./WorldContext";
import type { RoomRegistry } from "./RoomRegistry";
import { Builder } from "./Builder";
import { Furniture } from "./Furniture";
import { Decor } from "./Decor";
import { HouseShell, type PlacedOpening } from "./HouseShell";
import { LEVEL_Y } from "./Layout";
import { Door } from "./props/Door";
import { GroundFloor } from "./rooms/GroundFloor";
import { Upstairs } from "./rooms/Upstairs";
import { Details } from "./rooms/Details";
import type { RoomContext, Tickable } from "./rooms/RoomContext";
import type { Lamp } from "../atmosphere/LightingManager";
import { STUDY_CODE } from "../systems/PuzzleSystem";

interface DoorSpec {
  id: string;
  /** Wall-normal direction the open door swings toward. */
  opens: [number, number];
  locked: boolean;
  message: string;
  fixed?: boolean;
  keyItem?: { id: string; unlockMessage: string };
}

/** Door behaviour by opening key: `${level}${axis}${fixed}@${from}`. */
const DOOR_SPECS: Record<string, DoorSpec> = {
  "0x0@6": { id: "front", opens: [0, 1], locked: true, fixed: true, message: "The front door will not open. Something on the other side is holding it shut." },
  "0x11@6": { id: "back", opens: [0, -1], locked: true, fixed: true, message: "The back door is locked, and the key is not in it." },
  "0z5@4": { id: "living", opens: [-1, 0], locked: false, message: "" },
  "0z5@6.2": { id: "dining", opens: [-1, 0], locked: false, message: "" },
  "0z8@1": { id: "study", opens: [1, 0], locked: true, message: "Locked. There is a keypad beside the door." },
  "1z5@4.2": { id: "daniel", opens: [-1, 0], locked: false, message: "" },
  "1z5@7.5": { id: "emily", opens: [-1, 0], locked: false, message: "" },
  "1z8@8": { id: "bathroom", opens: [1, 0], locked: false, message: "" },
  "1x9.5@6": {
    id: "storage",
    opens: [0, 1],
    locked: true,
    message: "Locked. The key is tagged for the landing; maybe it is somewhere downstairs.",
    keyItem: { id: "brass-key", unlockMessage: "The brass key turns. The storage room door unlocks." },
  },
};

/** Assembles the whole house: shell, doors, room contents, and the Phase 1 keypad puzzle. */
export class House {
  readonly spawn = new Vector3(6.5, LEVEL_Y[0] + 1.65, 0.9);
  private readonly ticks: Tickable[] = [];
  readonly doors: Record<string, Door> = {};

  constructor(
    private readonly ctx: WorldContext,
    private readonly registry: RoomRegistry,
  ) {}

  /** Opens or closes every hinged door instantly (benchmark and tests). Returns the previous open states. */
  setAllDoors(open: boolean): Record<string, boolean> {
    const prev: Record<string, boolean> = {};
    for (const [id, d] of Object.entries(this.doors)) {
      prev[id] = d.isOpen;
      d.setOpen(open);
    }
    return prev;
  }

  update(dt: number): void {
    for (const t of this.ticks) t.update(dt);
  }

  build(): void {
    const { ctx } = this;
    const b = new Builder(ctx);
    const shell = new HouseShell(b, ctx);
    shell.build();
    this.buildDoors(b, shell.openings);

    const rc: RoomContext = {
      ctx,
      b,
      furn: new Furniture(ctx, b),
      decor: new Decor(ctx, b),
      doors: this.doors,
      lamps: new Map<string, Lamp>(),
      tick: (t) => this.ticks.push(t),
    };
    new GroundFloor(rc).build();
    new Upstairs(rc).build();
    new Details(rc).build();

    ctx.puzzles.registerCode("study-door", STUDY_CODE, () => {
      this.doors.study.unlock();
      ctx.audio.chime();
      ctx.events.emit("toast", { text: "Something inside the door releases." });
    });
    this.registry.finalize();
  }

  private buildDoors(b: Builder, openings: PlacedOpening[]): void {
    for (const o of openings) {
      if (o.kind !== "door") continue;
      const spec = DOOR_SPECS[o.key];
      if (!spec) throw new Error(`No door spec for opening ${o.key}`);
      const y = LEVEL_Y[o.level];
      const hinge = o.axis === "z" ? new Vector3(o.fixed, y, o.from) : new Vector3(o.from, y, o.fixed);
      const door = new Door(this.ctx, b, {
        id: spec.id,
        axis: o.axis,
        hinge,
        width: o.to - o.from,
        height: o.top,
        leafDir: 1,
        opensToward: spec.opens,
        rooms: o.rooms,
        locked: spec.locked,
        lockedMessage: spec.message,
        fixed: spec.fixed,
        onFixedInteract: spec.id === "front" ? () => this.ctx.story.onFrontDoor() : undefined,
        keyItem: spec.keyItem,
        label: spec.fixed ? "front door" : "door",
      });
      this.doors[spec.id] = door;
      this.ticks.push(door);
    }
  }
}
