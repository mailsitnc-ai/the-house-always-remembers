import type { EventBus } from "../core/EventBus";

export interface ItemDef {
  id: string;
  name: string;
}

/** Small carried-items list. Items are only identifiers for now; the HUD shows their names. */
export class InventorySystem {
  private readonly items = new Map<string, ItemDef>();

  constructor(private readonly events: EventBus) {}

  add(item: ItemDef): void {
    this.items.set(item.id, item);
    this.events.emit("inventory:changed", { items: this.list() });
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  remove(id: string): void {
    if (this.items.delete(id)) this.events.emit("inventory:changed", { items: this.list() });
  }

  /** Replaces the carried items with a saved list. */
  restore(items: ItemDef[]): void {
    this.items.clear();
    for (const i of items) this.items.set(i.id, i);
    this.events.emit("inventory:changed", { items: this.list() });
  }

  list(): ItemDef[] {
    return [...this.items.values()];
  }
}
