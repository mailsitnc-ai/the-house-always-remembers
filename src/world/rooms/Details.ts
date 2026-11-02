import type { RoomContext } from "./RoomContext";
import type { RoomId } from "../Layout";
import type { V3 } from "../geometry";

const PI = Math.PI;

/**
 * Small, non-colliding details that make rooms look used: sockets, radiators, shoes, cushions, kitchen and desk clutter.
 * Parts under 16 cm are merged as "detail" and hidden at a distance, so they cost little.
 */
export class Details {
  constructor(private readonly r: RoomContext) {}

  build(): void {
    this.sockets();
    this.radiators();
    this.hall();
    this.living();
    this.dining();
    this.kitchen();
    this.study();
    this.bedrooms();
    this.bathroom();
  }

  /** Wall socket. `facing` is the wall normal into the room. */
  private socket(room: RoomId, pos: V3, facing: "+x" | "-x" | "+z" | "-z"): void {
    const { b, ctx } = this.r;
    const alongX = facing === "+z" || facing === "-z";
    b.box("socket", alongX ? [0.085, 0.085, 0.014] : [0.014, 0.085, 0.085], pos, ctx.mats.trim, { rooms: [room] });
    b.box("socket-slot", alongX ? [0.03, 0.012, 0.016] : [0.016, 0.012, 0.03], pos, ctx.mats.dark, { rooms: [room] });
  }

  private sockets(): void {
    this.socket("hall", [5.107, 0.32, 6.1], "+x");
    this.socket("living", [3.4, 0.32, 5.407], "-z");
    this.socket("living", [4.893, 0.32, 1.2], "-x");
    this.socket("dining", [4.2, 0.32, 10.893], "-z");
    this.socket("kitchen", [9.0, 1.12, 10.893], "-z");
    this.socket("kitchen", [12.0, 1.12, 10.893], "-z");
    this.socket("study", [10.4, 0.32, 4.893], "-z");
    this.socket("daniel", [2.2, 3.32, 5.893], "-z");
    this.socket("emily", [3.0, 3.32, 6.107], "+z");
    this.socket("uphall", [5.107, 3.32, 4.0], "+x");
  }

  /** Cast-iron style panel radiator: a back plate and a row of fins, painted off-white. */
  private radiator(room: RoomId, pos: V3, yaw: number, length: number, level = 0): void {
    const { b, ctx } = this.r;
    const F = b.frame([pos[0], level * 3, pos[2]], yaw, [room]);
    const m = ctx.mats.white;
    F.box("rad-back", [length, 0.5, 0.025], [0, 0.4, -0.04], m);
    const n = Math.floor(length / 0.085);
    for (let i = 0; i < n; i++) F.box("rad-fin", [0.06, 0.5, 0.07], [-length / 2 + 0.05 + i * 0.085, 0.4, 0], m, { round: 0.02 });
    F.box("rad-pipe", [0.025, 0.12, 0.025], [length / 2 - 0.05, 0.1, -0.04], ctx.mats.steel);
    F.box("rad-pipe", [0.025, 0.12, 0.025], [-length / 2 + 0.05, 0.1, -0.04], ctx.mats.steel);
  }

  private radiators(): void {
    this.radiator("dining", [0.2, 0, 8.5], PI / 2, 1.1);
    this.radiator("study", [13.8, 0, 2.6], -PI / 2, 1.0);
    this.radiator("daniel", [0.2, 0, 2.8], PI / 2, 1.0, 1);
    this.radiator("kitchen", [13.8, 0, 8.0], -PI / 2, 0.9);
    this.radiator("living", [2.5, 0, 0.18], 0, 1.4);
  }

  private hall(): void {
    const { b, ctx } = this.r;
    const m = ctx.mats;
    // Shoes by the front door, and a pair of slippers at the foot of the stairs.
    for (const [x, z, a] of [[6.0, 0.55, 0.3], [6.17, 0.62, -0.2]] as const) b.box("shoe", [0.1, 0.075, 0.27], [x, 0.04, z], m.leather, { rooms: ["foyer"], round: 0.03, rot: [0, a, 0] });
    for (const [x, z] of [[6.3, 3.0], [6.45, 3.05]] as const) b.box("slipper", [0.1, 0.05, 0.24], [x, 0.03, z], m.coatBrown, { rooms: ["hall"], round: 0.02, rot: [0, 0.3, 0] });
    b.box("key-bowl", [0.14, 0.04, 0.14], [7.4, 0.82, 0.3], m.brass, { rooms: ["foyer"], round: 0.015 });
    b.box("keys", [0.05, 0.01, 0.02], [7.42, 0.845, 0.31], m.steel, { rooms: ["foyer"] });
  }

  private living(): void {
    const { b, ctx } = this.r;
    const m = ctx.mats;
    const R: RoomId[] = ["living"];
    // Cushions, a throw over the armchair, the remote, a folded newspaper.
    b.box("cushion", [0.42, 0.14, 0.4], [1.75, 0.58, 1.25], m.armchair, { rooms: R, round: 0.06, steps: 2, rot: [0.3, 0.2, 0.1] });
    b.box("cushion", [0.4, 0.14, 0.38], [3.0, 0.58, 1.3], m.curtain, { rooms: R, round: 0.06, steps: 2, rot: [0.25, -0.3, -0.1] });
    b.box("throw", [0.5, 0.05, 0.7], [4.18, 0.62, 3.45], m.curtain, { rooms: R, round: 0.02, rot: [0, 0, 0.25] });
    b.box("remote", [0.045, 0.02, 0.17], [2.65, 0.43, 2.38], m.dark, { rooms: R, round: 0.008, rot: [0, 0.5, 0] });
    b.box("newspaper", [0.34, 0.012, 0.26], [2.05, 0.426, 2.55], m.paper, { rooms: R, rot: [0, 0.2, 0] });
    b.box("coaster", [0.09, 0.006, 0.09], [2.75, 0.424, 2.5], m.woodPale, { rooms: R });
  }

  private dining(): void {
    const { b, ctx } = this.r;
    const m = ctx.mats;
    const R: RoomId[] = ["dining"];
    b.box("table-runner", [1.5, 0.006, 0.28], [2.6, 0.763, 8.3], m.curtain, { rooms: R });
    for (const [x, z] of [[2.3, 8.15], [2.9, 8.45]] as const) b.cyl("shaker", { h: 0.09, top: 0.03, bottom: 0.04, sides: 8 }, [x, 0.81, z], m.ceramic, { rooms: R });
    for (const [x, z] of [[2.0, 7.85], [3.2, 7.85], [2.0, 8.75], [3.2, 8.75]] as const) b.box("napkin", [0.13, 0.012, 0.13], [x - 0.3, 0.768, z + 0.02], m.paper, { rooms: R, rot: [0, 0.2, 0] });
  }

  private kitchen(): void {
    const { b, ctx } = this.r;
    const m = ctx.mats;
    const R: RoomId[] = ["kitchen"];
    b.box("toaster", [0.26, 0.17, 0.16], [9.7, 1.005, 10.6], m.steel, { rooms: R, round: 0.03 });
    b.box("chopping-board", [0.4, 0.022, 0.26], [12.1, 0.93, 10.55], m.woodPale, { rooms: R, round: 0.006 });
    b.box("dish-rack", [0.4, 0.14, 0.28], [10.1, 0.99, 10.6], m.steel, { rooms: R });
    for (let i = 0; i < 4; i++) b.box("rack-plate", [0.01, 0.2, 0.2], [9.95 + i * 0.08, 1.04, 10.6], m.ceramic, { rooms: R, round: 0.003 });
    b.box("tea-towel", [0.28, 0.4, 0.012], [9.2, 0.55, 10.265], m.curtain, { rooms: R });
    for (let i = 0; i < 3; i++) {
      b.cyl("herb-pot", { h: 0.1, top: 0.1, bottom: 0.08, sides: 10 }, [10.5 + i * 0.3, 1.05, 10.85], m.woodPale, { rooms: R });
      b.sphere("herb", 0.16, [10.5 + i * 0.3, 1.16, 10.85], m.coatGreen, { rooms: R });
    }
  }

  private study(): void {
    const { b, ctx } = this.r;
    const m = ctx.mats;
    const R: RoomId[] = ["study"];
    b.cyl("bin", { h: 0.3, top: 0.28, bottom: 0.22, sides: 12 }, [10.0, 0.15, 4.5], m.steel, { rooms: R });
    b.box("coat-on-chair", [0.44, 0.5, 0.06], [11.0, 0.78, 3.43], m.coatBrown, { rooms: R, round: 0.025 });
    b.box("stapler", [0.14, 0.04, 0.04], [10.6, 0.78, 4.4], m.dark, { rooms: R, round: 0.01 });
    b.box("diploma", [0.3, 0.22, 0.02], [11.0, 1.7, 4.9], m.trim, { rooms: R });
    b.box("diploma-frame", [0.34, 0.26, 0.016], [11.0, 1.7, 4.895], m.woodDark, { rooms: R });
  }

  private bedrooms(): void {
    const { b, ctx } = this.r;
    const m = ctx.mats;
    const Y = 3;
    const D: RoomId[] = ["daniel"];
    const E: RoomId[] = ["emily"];
    for (const [x, z] of [[3.2, 1.9], [3.38, 1.82]] as const) b.box("trainer", [0.11, 0.09, 0.28], [x, Y + 0.05, z], m.coatBrown, { rooms: D, round: 0.035, rot: [0, 0.5, 0] });
    b.box("clothes", [0.4, 0.14, 0.34], [2.5, Y + 0.55, 1.28], m.bedDaniel, { rooms: D, round: 0.05, steps: 2, rot: [0, 0.4, 0] });
    b.sphere("football", 0.22, [3.7, Y + 0.12, 0.4], m.paper, { rooms: D });
    for (const [x, z] of [[1.5, 7.2], [1.68, 7.14]] as const) b.box("slipper", [0.09, 0.07, 0.2], [x, Y + 0.04, z], m.toys[4], { rooms: E, round: 0.03, rot: [0, 0.2, 0] });
    for (let i = 0; i < 4; i++) b.sphere("soft-toy", 0.16, [1.7 + i * 0.22, Y + 0.84, 10.74], m.toys[i % m.toys.length], { rooms: E });
    b.box("cardigan", [0.32, 0.12, 0.28], [0.95, Y + 0.5, 8.42], m.toys[4], { rooms: E, round: 0.04, steps: 2 });
  }

  private bathroom(): void {
    const { b, ctx } = this.r;
    const m = ctx.mats;
    const R: RoomId[] = ["bathroom"];
    b.box("soap", [0.08, 0.03, 0.05], [8.42, 3.95, 9.96], m.ceramic, { rooms: R, round: 0.012 });
    b.cyl("toilet-roll", { h: 0.1, bottom: 0.11, sides: 12 }, [9.1, 3.65, 10.82], m.paper, { rooms: R });
    b.box("bath-towel", [0.34, 0.5, 0.05], [8.15, 4.2, 8.6], m.cloth, { rooms: R });
  }
}
