import type { Builder } from "../Builder";
import type { Furniture } from "../Furniture";
import type { Decor } from "../Decor";
import type { WorldContext } from "../WorldContext";
import type { Lamp } from "../../atmosphere/LightingManager";
import type { Door } from "../props/Door";

export interface Tickable {
  update(dt: number): void;
}

/** What room builders share: builders, furniture and decor libraries, doors, named lamps, and a list of animated objects. */
export interface RoomContext {
  ctx: WorldContext;
  b: Builder;
  furn: Furniture;
  decor: Decor;
  doors: Record<string, Door>;
  /** Named lamps that other rooms' switches refer to. */
  lamps: Map<string, Lamp>;
  tick(t: Tickable): void;
}
