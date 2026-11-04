import type { EventBus } from "../core/EventBus";
import { ROOMS, STAIRS, WALLS, type RoomId } from "../world/Layout";

/**
 * The house plan: the real room rectangles, walls, doors, cased openings and stairs from `Layout.ts`, drawn as a rough floor plan Daniel could sketch of his
 * family's home. Two floors, switched with the tabs (or 1 and 2). It is opened with M or from the pause menu, pauses the game while open, and closes with M or Esc.
 *
 * It shows only what Daniel knows: the plan of the house he grew up in, which rooms he has been in this visit (the others are dimmer), where he stands and faces,
 * and where the current objective is, but only when the objective's own text names the place. Nothing here knows about the story's secrets.
 */
const SHORT: Partial<Record<RoomId, string>> = { uphall: "Landing", daniel: "Daniel's room", emily: "Emily's room", rear: "Rear passage", hall: "Hall" };
const W = 14;
const H = 11;
const PAD = 0.7;

export interface MapDeps {
  player(): { x: number; z: number; level: 0 | 1; yaw: number };
  discovered(room: RoomId): boolean;
  objective(): { room: RoomId | null };
  onClose(): void;
}

export class MapUi {
  private floor: 0 | 1 = 0;
  private open = false;
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;

  constructor(events: EventBus, private readonly d: MapDeps) {
    this.root = document.getElementById("map")!;
    this.canvas = document.getElementById("map-canvas") as HTMLCanvasElement;
    events.on("phase:changed", ({ to }) => {
      this.open = to === "map";
      this.root.classList.toggle("show", this.open);
      if (this.open) this.show();
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-floor]").forEach((b) => b.addEventListener("click", () => this.setFloor(b.dataset.floor === "1" ? 1 : 0)));
    document.getElementById("map-close")?.addEventListener("click", () => this.d.onClose());
    window.addEventListener("keydown", (e) => {
      if (!this.open) return;
      if (e.key === "Escape" || e.key.toLowerCase() === "m") {
        e.preventDefault();
        this.d.onClose();
      } else if (e.key === "1") this.setFloor(0);
      else if (e.key === "2") this.setFloor(1);
      else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab") {
        e.preventDefault();
        this.setFloor(this.floor === 0 ? 1 : 0);
      }
    });
    window.addEventListener("resize", () => this.open && this.draw());
  }

  /** On opening, the floor the player is on. */
  private show(): void {
    this.floor = this.d.player().level;
    this.draw();
  }

  private setFloor(f: 0 | 1): void {
    this.floor = f;
    this.draw();
  }

  /** The floor currently shown (for tests). */
  get shownFloor(): number {
    return this.floor;
  }

  private draw(): void {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(200, Math.round(box.width * dpr));
    const ch = Math.round((cw * (H + PAD * 2)) / (W + PAD * 2));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    const c = this.canvas.getContext("2d");
    if (!c) return;
    const s = cw / (W + PAD * 2);
    const X = (x: number): number => (x + PAD) * s;
    const Y = (z: number): number => (H - z + PAD) * s;
    const px = Math.max(1, s / 40);
    c.clearRect(0, 0, cw, ch);
    c.fillStyle = "#16120d";
    c.fillRect(0, 0, cw, ch);
    const me = this.d.player();
    const here = me.level === this.floor;
    const obj = this.d.objective().room;

    // Rooms.
    const rooms = ROOMS.filter((r) => r.level === this.floor);
    for (const r of rooms) {
      const seen = this.d.discovered(r.id);
      c.fillStyle = seen ? "#3b3227" : "#231d16";
      c.fillRect(X(r.x0), Y(r.z1), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
    }
    // Walls with their openings.
    c.lineCap = "butt";
    for (const w of WALLS.filter((w) => w.level === this.floor)) {
      const at = (t: number): [number, number] => (w.axis === "x" ? [X(t), Y(w.fixed)] : [X(w.fixed), Y(t)]);
      const gaps = w.openings.filter((o) => o.kind !== "window").sort((a, b) => a.from - b.from);
      let t = w.from;
      c.strokeStyle = "#c9ba95";
      c.lineWidth = px * 5;
      const seg = (a: number, b: number, col: string, lw: number): void => {
        const [x0, y0] = at(a);
        const [x1, y1] = at(b);
        c.strokeStyle = col;
        c.lineWidth = lw;
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
      };
      for (const g of gaps) {
        seg(t, g.from, "#c9ba95", px * 5);
        t = g.to;
      }
      seg(t, w.to, "#c9ba95", px * 5);
      // Doors: a thin brown leaf across the gap; cased openings: two small posts.
      for (const g of gaps) {
        if (g.kind === "door") seg(g.from, g.to, "#8a6a3a", px * 2.5);
        else {
          seg(g.from, g.from + 0.08, "#c9ba95", px * 8);
          seg(g.to - 0.08, g.to, "#c9ba95", px * 8);
        }
      }
      // Windows: a pale double line on exterior walls.
      for (const o of w.openings.filter((o) => o.kind === "window")) seg(o.from, o.to, "#7f8f98", px * 2);
    }
    // Stairs.
    const sx0 = X(STAIRS.x0);
    const sx1 = X(STAIRS.x1);
    const sy0 = Y(STAIRS.z1);
    const sy1 = Y(STAIRS.z0);
    c.strokeStyle = "#a89a78";
    c.lineWidth = px * 2;
    if (this.floor === 0) {
      c.fillStyle = "#2c241b";
      c.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
      for (let z = STAIRS.z0 + 0.25; z < STAIRS.z1; z += 0.25) {
        c.beginPath();
        c.moveTo(sx0, Y(z));
        c.lineTo(sx1, Y(z));
        c.stroke();
      }
    } else {
      c.fillStyle = "#0e0b08";
      c.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
      c.beginPath();
      c.moveTo(sx0, sy0);
      c.lineTo(sx1, sy1);
      c.moveTo(sx1, sy0);
      c.lineTo(sx0, sy1);
      c.stroke();
    }
    c.strokeRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    c.fillStyle = "#d9cfae";
    c.font = `${Math.round(s * 0.28)}px Georgia, serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(this.floor === 0 ? "STAIRS ▲" : "▼ DOWN", (sx0 + sx1) / 2, (sy0 + sy1) / 2);

    // Names.
    c.font = `${Math.round(s * 0.34)}px Georgia, serif`;
    for (const r of rooms) {
      const seen = this.d.discovered(r.id);
      c.fillStyle = seen ? "#eadfbe" : "#7d7360";
      let cx = (r.x0 + r.x1) / 2;
      // Big rooms carry their name near the top so the marker (and the objective ring) in the middle never sit on it.
      let cz = r.z1 - r.z0 >= 3.5 ? r.z1 - 0.75 : (r.z0 + r.z1) / 2;
      // The hall and the landing share their middle with the stairs: their names sit in the free strip beside them.
      if (r.id === "hall" || r.id === "uphall") {
        cx = (r.x0 + STAIRS.x0) / 2;
        cz = 5.5;
      }
      c.fillText(SHORT[r.id] ?? r.name, X(cx), Y(cz));
    }

    // Objective: a ring in the room the objective's own text names.
    if (obj) {
      const r = rooms.find((q) => q.id === obj);
      if (r) {
        const cx = X((r.x0 + r.x1) / 2);
        const cy = Y((r.z0 + r.z1) / 2) + s * 0.55;
        c.strokeStyle = "#e0b64a";
        c.lineWidth = px * 3;
        c.beginPath();
        c.arc(cx, cy, s * 0.26, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = "#e0b64a";
        c.fillText("!", cx, cy + 1);
      }
    }

    // The player: a pointer facing the way he looks, only when he is inside the house on this floor.
    const inside = me.x > 0 && me.x < W && me.z > 0 && me.z < H;
    this.root.classList.toggle("elsewhere", !inside);
    if (here && inside) {
      const fx = Math.sin(me.yaw);
      const fy = -Math.cos(me.yaw);
      const x = X(me.x);
      const y = Y(me.z);
      const r = s * 0.22;
      c.fillStyle = "rgba(241,230,200,0.22)";
      c.beginPath();
      c.arc(x, y, r * 1.9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#f6edd0";
      c.beginPath();
      c.moveTo(x + fx * r * 1.5, y + fy * r * 1.5);
      c.lineTo(x - fy * r - fx * r * 0.9, y + fx * r - fy * r * 0.9);
      c.lineTo(x + fy * r - fx * r * 0.9, y - fx * r - fy * r * 0.9);
      c.closePath();
      c.fill();
    }
    // Tabs.
    this.root.querySelectorAll<HTMLButtonElement>("[data-floor]").forEach((b) => {
      const f = b.dataset.floor === "1" ? 1 : 0;
      b.classList.toggle("on", f === this.floor);
      b.classList.toggle("you", f === me.level && inside);
      const objFloor = obj ? ROOMS.find((q) => q.id === obj)?.level : undefined;
      b.classList.toggle("goal", objFloor === f);
    });
  }
}
