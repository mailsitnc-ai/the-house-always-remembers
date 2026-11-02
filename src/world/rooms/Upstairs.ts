import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { RoomContext } from "./RoomContext";
import { LightSwitch } from "../props/LightSwitch";
import { TapeDeck } from "../props/TapeDeck";
import { Pickup } from "../props/Pickup";
import { Readable } from "../props/Readable";
import { Suitcase } from "../props/Suitcase";
import { paperSheet } from "../PaperTextures";

const PI = Math.PI;
const Y = 3.0; // upstairs floor level

/** Upstairs rooms. Frames use y = 3.0 as their floor, so local heights read like ground-floor ones. */
export class Upstairs {
  constructor(private readonly r: RoomContext) {}

  build(): void {
    this.landing();
    this.storage();
    this.daniel();
    this.emily();
    this.bathroom();
  }

  // ---- landing ---------------------------------------------------------------------------------

  private landing(): void {
    const { b, furn, decor, ctx } = this.r;
    const m = ctx.mats;
    b.box("landing-runner", [1.0, 0.014, 5.2], [5.95, Y + 0.007, 6.2], m.runner, { rooms: ["uphall"], tile: 1 });
    furn.sconce("landing-sconce", [5.1, Y + 1.7, 6.3], [1, 0], "uphall", { on: true, intensity: 0.5, range: 4.5, flicker: 0.05, dimmable: true });
    decor.photo([5.1, Y + 1.6, 3.6], [1, 0], [0.3, 0.38], "family", "uphall", "Family photograph", "Four people on the step of this house, a few years earlier. Nobody has moved the print to a better light.");
    decor.photo([5.1, Y + 1.6, 6.5], [1, 0], [0.34, 0.26], "landscape", "uphall", "Framed photograph", "A landscape. A previous owner's, perhaps; nobody in the family appears in it.");
    const F = b.frame([5.35, Y, 9.0], PI / 2, ["uphall"]);
    furn.table(F, 0.4, 0.5, 0.7, m.woodMid);
    furn.vase(F.at([0, 0.7, 0]), "uphall");
  }

  // ---- storage ---------------------------------------------------------------------------------

  private storage(): void {
    const { b, decor, furn, ctx } = this.r;
    const m = ctx.mats;
    const R = "storage" as const;
    const lamp = furn.pendant("storage", [6.5, Y + 2.4, 10.2], R, { on: false, intensity: 0.8, range: 4.5, startup: true });
    new LightSwitch(ctx, b, [5.3, Y + 1.3, 9.6075], "+z", [lamp], [R]);
    // Shelving along the north wall, loaded with cardboard boxes.
    const F = b.frame([6.5, Y, 10.72], PI, [R]);
    for (const s of [-1, 1]) F.box("upright", [0.04, 1.9, 0.36], [s * 0.78, 0.95, 0], m.woodPale);
    for (const y of [0.3, 0.8, 1.3, 1.8]) F.box("board", [1.6, 0.03, 0.36], [0, y, 0], m.woodPale, { tile: 1 });
    const sizes: [number, number, number][] = [[0.4, 0.3, 0.3], [0.3, 0.22, 0.3], [0.45, 0.28, 0.32], [0.35, 0.34, 0.3]];
    let i = 0;
    for (const y of [0.315, 0.815, 1.315]) {
      let x = -0.72;
      for (const [w, h, d] of sizes.slice(i % 2, i % 2 + 3)) {
        F.box("carton", [w, h, d], [x + w / 2, y + h / 2, 0], m.cardboard, { cast: true });
        x += w + 0.04;
      }
      i++;
    }
    // Stops below the top shelf so the old torch up there can still be reached and targeted.
    F.collider("shelving", [1.6, 1.7, 0.36], [0, 0.85, 0]);
    const noteF = b.frame([6.5, Y + 0.2, 10.72], PI, [R]);
    void noteF;
    decor.noteOnSurface(F.at([-0.2, 0.83 + 0.30, 0.18]), PI, ["XMAS", "fragile", "", "- tree lights", "- the glass baubles"], R, "Box label", { text: "Handwriting on a carton. It is only decorations." });
    // Suitcase, paint tins and a sheeted chair.
    const caseF = b.frame([7.45, Y, 10.1], PI, [R]);
    const suitcase = new Suitcase(ctx, b, caseF, R);
    this.r.tick(suitcase);
    // What the family packed away, lying inside under the lid.
    const papers: [number, string, string[], string, string, string, string?][] = [
      [-0.17, "anna-letter", ["Rick -", "", "I'm writing this because I", "can't say it out loud in the", "same room as Daniel.", "He was there.", "He was in the house the", "whole time.", "- A."], "Letter", "Mum's letter to Dad", "Mum's handwriting, hurried. It was never sent.", "document"],
      [0.0, "funeral-card", ["Emily Rose", "", "Ever so loved.", "Ever so missed."], "Order of service", "Order of service", "A folded order of service. Inside the cover someone has written 'Sorry' and crossed it out, and written it again."],
      [0.17, "anna-unsent", ["Daniel -", "", "You were thirteen. I am not", "asking you to pay any more.", "I only needed you to stop", "being alone with it.", "The door of this house is", "open to you.   Mum"], "Letter", "Mum's letter to Daniel", "A letter addressed to you, in Mum's handwriting. It was never sent."],
      [-0.34, "house-statement", ["STATEMENT", "", "Standing order, monthly", "HOUSEKEEPING", "Upkeep of the property,", "as instructed.", "", "Account holder: ____"], "Statement", "Bank statement", "A statement addressed to Dad. The same monthly payment for years, and the account holder's name is blank."],
      [0.34, "parish-letter", ["Parish Office", "", "To the family of", "Emily Rose", "", "We write about the plot where", "she was laid to rest. It was", "found disturbed this spring.", "Please telephone us."], "Letter", "Letter from the parish", "A short, formal letter from the parish office. It was never answered."],
    ];
    for (const [dx, id, lines, verb, title, text] of papers) {
      const tex = paperSheet(ctx.scene, `sheet-${id}`, 800 + Math.round(dx * 100), lines, { ruled: false, paper: "#d8cdb0" });
      const sheet = caseF.box(`sheet-${id}`, [0.15, 0.004, 0.21], [dx, 0.224, 0.0], ctx.mats.textured(`sheet-mat-${id}`, tex), { pick: true, merge: false });
      new Readable(ctx, b, sheet, { id, verb: verb.toLowerCase(), title, text, texture: tex, size: [0.3, 0.3], evidence: id });
    }
    // The family torch: its batteries are what the answering machine needs.
    const torch = F.cyl("torch", { h: 0.22, bottom: 0.045, sides: 10 }, [0.3, 1.84, 0.02], m.steel, { pick: true, merge: false });
    torch.rotation.x = Math.PI / 2;
    new Pickup(ctx, torch, { id: "batteries", name: "batteries", message: "Two heavy batteries from the old family torch. They might still hold some charge." });
    for (let k = 0; k < 3; k++) b.cyl("paint-tin", { h: 0.2, bottom: 0.18, sides: 12 }, [5.45 + k * 0.22, Y + 0.1, 10.7], m.steel, { rooms: [R] });
    const S = b.frame([5.6, Y, 9.95], 0.3, [R]);
    S.box("sheet", [0.7, 0.55, 0.7], [0, 0.28, 0], m.dust, { cast: true });
    S.box("sheet-back", [0.7, 0.5, 0.12], [0, 0.7, -0.29], m.dust, { cast: true });
    S.collider("sheeted-chair", [0.7, 1.0, 0.7], [0, 0.5, 0]);
  }

  // ---- Daniel's room ---------------------------------------------------------------------------

  private daniel(): void {
    const { b, furn, decor, ctx, doors } = this.r;
    void doors;
    const m = ctx.mats;
    const R = "daniel" as const;
    furn.bed(b.frame([1.1, Y, 5.4], PI / 2, [R]), m.bedDaniel, 1.0);
    const ns = b.frame([0.38, Y, 4.5], PI / 2, [R]);
    furn.cabinet(ns, 0.4, 0.36, 0.5, m.woodMid, { doors: 1 });
    furn.tableLamp("daniel-lamp", ns.at([0, 0.5, 0]), R, { on: false, interactive: true, intensity: 1.2, range: 6 });
    furn.rug("daniel-rug", 1.8, 1.2, [2.8, 3.0], m.rugEmily, R, 0, 1);

    // Desk under the south window.
    const desk = b.frame([2.5, Y, 0.45], 0, [R]);
    furn.desk(desk, m.woodPale);
    furn.deskChair(b.frame([2.5, Y, 1.25], PI, [R]), m.armchair);
    furn.bookStack(desk.at([-0.5, 0.76, 0.0]), 5, 0.2, 91, R);
    b.cyl("pen-cup", { h: 0.1, bottom: 0.07, sides: 10 }, desk.at([0.1, 0.81, -0.2]), m.dark, { rooms: [R] });
    decor.noteOnSurface(desk.at([0.45, 0.762, 0.05]), PI * 0.9, ["Maths", "exercises 4 - 9", "due Friday", "", "- D."], R, "Homework note", { ruled: true, text: "A page of homework, half finished. The handwriting is a boy's, quick and impatient.", ev: "daniel-homework" });
    // Childhood objects: a model aeroplane hung from the ceiling, comics, a toy robot, a tin of marbles.
    const plane = b.frame([3.3, Y + 2.3, 2.2], 0.4, [R]);
    plane.box("plane-body", [0.06, 0.06, 0.34], [0, 0, 0], m.white);
    plane.box("plane-wing", [0.46, 0.015, 0.1], [0, 0, 0.02], m.white);
    plane.box("plane-tail", [0.16, 0.012, 0.06], [0, 0, -0.15], m.white);
    plane.box("plane-fin", [0.012, 0.09, 0.06], [0, 0.04, -0.15], m.toys[0]);
    b.cyl("plane-thread", { h: 0.5, bottom: 0.004, sides: 4 }, [3.3, Y + 2.55, 2.2], m.dark, { rooms: [R] });
    const robot = b.frame([3.15, Y + 0.76, 0.3], PI + 0.3, [R]);
    robot.box("robot-body", [0.1, 0.12, 0.08], [0, 0.08, 0], m.steel);
    robot.box("robot-head", [0.07, 0.06, 0.06], [0, 0.17, 0], m.steel);
    robot.box("robot-eye", [0.05, 0.015, 0.01], [0, 0.18, 0.035], m.toys[1]);
    b.cyl("marble-tin", { h: 0.06, bottom: 0.12, sides: 12 }, [3.45, Y + 0.79, 0.35], m.steel, { rooms: [R] });
    // Wardrobe with working doors.
    const wf = b.frame([4.65, Y, 1.6], -PI / 2, [R]);
    furn.wardrobeBody(wf, 1.2, 0.55, 2.0, m.woodMid);
    for (const side of [-1, 1] as const) {
      this.r.tick(furn.frontDoor(wf, { id: `daniel-wardrobe-${side}`, x: side * 0.3, side, z: 0.275, width: 0.6, height: 1.92, y0: 0.04, mat: m.woodMid, rooms: [R], label: "wardrobe" }));
    }
    // Bookshelf and pinboard.
    furn.bookshelf(b.frame([0.25, Y, 1.0], PI / 2, [R]), 1.0, 1.5, 71);
    b.box("pinboard", [0.02, 0.6, 0.9], [4.89, Y + 1.6, 3.1], m.woodPale, { rooms: [R] });
    decor.photo([4.88, Y + 1.6, 3.35], [-1, 0], [0.22, 0.17], "school", R, "School photograph", "A class photograph, rows of small faces. Daniel is in the front row, grinning, his tie crooked. On the back, in a parent's handwriting, a name and a year.", "school-photo");
    decor.noteOnWall([4.88, Y + 1.65, 2.8], [-1, 0], ["KEEP", "OUT", "", "(this means you)"], R, "Pinned sign", "A hand-lettered sign, the sort a boy of thirteen makes for his door and then pins somewhere more private.", [0.16, 0.2]);
    // Light and switch.
    const light = furn.pendant("daniel", [2.5, Y + 2.35, 3.0], R, { on: false, intensity: 1.0, range: 6.5 });
    new LightSwitch(ctx, b, [4.8925, Y + 1.3, 5.55], "-x", [light], [R]);
  }

  // ---- Emily's room ----------------------------------------------------------------------------

  private emily(): void {
    const { b, furn, decor, ctx } = this.r;
    const m = ctx.mats;
    const R = "emily" as const;
    furn.rug("emily-rug", 2.2, 1.6, [2.5, 8.6], m.rugEmily, R, 0, 1);
    const bedF = b.frame([4.2, Y, 10.0], PI, [R]);
    furn.bed(bedF, m.bedEmily, 0.9, 1.7);
    decor.teddy(bedF, [0.15, 0.6, -0.15], R, "teddy");
    // Dresser with drawers, a night light and a photograph.
    const dF = b.frame([1.3, Y, 6.35], 0, [R]);
    furn.dresserBody(dF, 1.1, 0.45, 0.85, m.woodPale);
    for (const [i, y] of [[0, 0.72], [1, 0.5]] as const) {
      const d = furn.frontDrawer(dF, {
        id: `emily-drawer-${i}`,
        x: 0,
        y,
        z: 0.232,
        width: 1.0,
        height: 0.2,
        mat: m.woodPale,
        rooms: [R],
        fill: i === 0
          ? (slide) => {
              const n = decor.noteOnSurface(dF.at([0, y - 0.1 + 0.03 + 0.022, 0.0]), 0.2, ["Reading chart", "", "* * * * *", "* * * *", "", "five books this month!"], R, "Reading chart", { ruled: true, text: "A reading chart, covered in star stickers. A teacher has written 'Well done, Emily!' at the bottom.", ev: "reading-chart" });
              n.setParent(slide);
            }
          : undefined,
      });
      this.r.tick(d);
    }
    // Mum's note, left on the dresser years ago.
    {
      const tex = paperSheet(ctx.scene, "sheet-emily-room-note", 850, ["Rick -", "", "Lavender and camphor", "in Emily's room again.", "I have not bought either.", "The room is cold when the", "house is warm.   A."], { ruled: false, paper: "#e2d8bd" });
      const sheet = dF.box("sheet-emily-room-note", [0.15, 0.004, 0.21], [0.25, 0.856, 0.0], ctx.mats.textured("sheet-mat-emily-room-note", tex), { pick: true, merge: false });
      new Readable(ctx, b, sheet, { id: "emily-room-note", verb: "note", title: "Mum's note", text: "Mum's handwriting, years old. She did not want to know who was looking after the room.", texture: tex, size: [0.3, 0.3], evidence: "emily-room-note" });
    }
    furn.tableLamp("emily-nightlight", dF.at([-0.3, 0.85, 0]), R, { on: true, interactive: true, intensity: 0.55, range: 4.5 });
    decor.photo([1.3, Y + 1.6, 6.1], [0, 1], [0.3, 0.38], "siblings", R, "Framed photograph", "Two children on a front step. One of them is holding the other's hand, a little too tightly.", "siblings-photo");
    for (const [x, kind, title, text, ev] of [
      [2.9, "house", "Drawing: our house", "A crayon drawing of a house with four stick figures and a yellow dog standing in front of it. The sun has a face.", "drawing-house"],
      [3.55, "horse", "Drawing: a horse", "A brown horse with a very long neck. Underneath, in careful capitals: MY HORSE.", "drawing-horse"],
      [4.2, "rainbow", "Drawing: rainbow", "A rainbow in five colours. The purple crayon ran out halfway through.", "drawing-rainbow"],
    ] as const) {
      decor.drawing([x, Y + 1.55, 6.1], [0, 1], [0.3, 0.3], kind, R, title, text, ev);
    }
    // Small desk and stool under the west window, with pencils and a drawing pad.
    const k = b.frame([0.4, Y, 8.4], PI / 2, [R]);
    furn.table(k, 0.9, 0.5, 0.55, m.woodPale);
    furn.stool(b.frame([0.95, Y, 8.4], -PI / 2, [R]));
    new TapeDeck(ctx, b.frame(k.at([0.3, 0.554, 0.0]), PI / 2, [R]), "emily", "toy", R);
    for (let i = 0; i < 4; i++) b.box("crayon", [0.012, 0.012, 0.09], k.at([-0.2 + i * 0.025, 0.556, 0.1]), m.toys[i], { rooms: [R], rot: [0, 0.2 * i, 0] });
    decor.noteOnSurface(k.at([0.1, 0.554, -0.02]), 0.6, ["dear Santa", "", "I would like a", "bicycle", "and a kitten", "from Emily (8)"], R, "Letter", { ruled: true, paper: "#e6dcc3", text: "A letter to Santa in a child's careful pencil. It was never posted.", ev: "santa-letter" });
    // Toy chest, blocks and a doll.
    const tc = b.frame([0.45, Y, 10.3], PI / 2, [R]);
    tc.box("toybox", [0.5, 0.4, 0.9], [0, 0.2, 0], m.woodPale, { cast: true, tile: 1 });
    tc.box("toybox-lid", [0.52, 0.04, 0.92], [0, 0.42, 0], m.woodMid, { tile: 1 });
    tc.collider("toybox", [0.5, 0.45, 0.9], [0, 0.22, 0]);
    for (let i = 0; i < 4; i++) tc.box("block", [0.08, 0.08, 0.08], [(i % 2) * 0.1 - 0.05, 0.48 + Math.floor(i / 2) * 0.08, (i % 3) * 0.05], m.toys[i], { rot: undefined });
    const doll = b.frame([1.75, Y + 0.0, 9.6], 0.5, [R]);
    doll.box("doll-dress", [0.14, 0.18, 0.1], [0, 0.1, 0], m.toys[4]);
    doll.sphere("doll-head", 0.1, [0, 0.25, 0], m.armchair);
    for (let i = 0; i < 3; i++) b.box("block", [0.09, 0.09, 0.09], [2.4 + i * 0.12, Y + 0.05, 8.9 + (i % 2) * 0.08], m.toys[i + 1], { rooms: [R], rot: [0, i, 0] });
    // Low bookshelf of picture books under the north window.
    furn.bookshelf(b.frame([2.0, Y, 10.75], PI, [R]), 1.0, 0.9, 81);
    // Ceiling light and its switch.
    const light = furn.pendant("emily", [2.5, Y + 2.35, 8.6], R, { on: false, intensity: 1.0, range: 6.5 });
    new LightSwitch(ctx, b, [4.8925, Y + 1.3, 6.9], "-x", [light], [R]);
    void Vector3;
  }

  // ---- bathroom --------------------------------------------------------------------------------

  private bathroom(): void {
    const { b, furn, ctx } = this.r;
    const m = ctx.mats;
    const R = "bathroom" as const;
    const tub = b.frame([11.0, Y, 9.8], 0, [R]);
    tub.box("tub-shell", [0.75, 0.55, 1.7], [0, 0.275, 0], m.ceramic, { cast: true });
    tub.box("tub-inner", [0.6, 0.02, 1.55], [0, 0.56, 0], m.dark);
    tub.box("tub-tap", [0.1, 0.1, 0.06], [0, 0.62, -0.82], m.steel);
    tub.collider("tub", [0.75, 0.55, 1.7], [0, 0.275, 0]);
    const wc = b.frame([9.5, Y, 10.55], PI, [R]);
    wc.cyl("wc-bowl", { h: 0.4, top: 0.36, bottom: 0.26, sides: 12 }, [0, 0.2, 0.05], m.ceramic, { cast: true });
    wc.box("wc-tank", [0.38, 0.4, 0.17], [0, 0.62, -0.22], m.ceramic);
    wc.box("wc-lid", [0.34, 0.03, 0.4], [0, 0.42, 0.05], m.woodPale);
    wc.collider("wc", [0.4, 0.8, 0.6], [0, 0.4, 0]);
    const sink = b.frame([8.5, Y, 10.0], PI / 2, [R]);
    sink.cyl("sink-pedestal", { h: 0.7, top: 0.14, bottom: 0.2, sides: 10 }, [0, 0.35, -0.05], m.ceramic);
    sink.box("sink-basin", [0.5, 0.12, 0.4], [0, 0.8, 0], m.ceramic, { cast: true });
    sink.box("sink-tap", [0.03, 0.1, 0.03], [0, 0.92, -0.12], m.steel);
    sink.collider("sink", [0.5, 0.9, 0.4], [0, 0.45, 0]);
    // Mirror cabinet on the west wall with a door that opens.
    const mc = b.frame([8.1, Y, 10.0], PI / 2, [R]);
    mc.box("mirror-cabinet", [0.6, 0.72, 0.12], [0, 1.6, 0.06], m.woodPale);
    mc.box("mirror-cabinet-inside", [0.5, 0.62, 0.01], [0, 1.6, 0.125], m.dark);
    mc.box("pill-bottle", [0.04, 0.08, 0.04], [0.1, 1.52, 0.1], m.toys[1]);
    mc.box("toothbrush-cup", [0.05, 0.08, 0.05], [-0.12, 1.52, 0.1], m.ceramic);
    this.r.tick(furn.frontDoor(mc, { id: "mirror-cabinet", x: 0, side: 1, z: 0.13, width: 0.5, height: 0.64, y0: 1.28, mat: m.mirror, rooms: [R], label: "mirror cabinet" }));
    // Towels and mat.
    b.box("towel-rail", [0.03, 0.03, 0.6], [11.35, Y + 1.1, 8.2], m.steel, { rooms: [R] });
    b.box("towel", [0.04, 0.5, 0.4], [11.33, Y + 0.85, 8.2], m.cloth, { rooms: [R] });
    furn.rug("bath-mat", 0.7, 0.5, [10.0, 9.8], m.rugEmily, R, 0, 1);
    const light = furn.pendant("bathroom", [9.8, Y + 2.4, 9.0], R, { on: false, intensity: 0.9, range: 5, startup: true });
    new LightSwitch(ctx, b, [8.1075, Y + 1.3, 7.5], "+x", [light], [R]);
  }
}
