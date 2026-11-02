import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { RoomContext } from "./RoomContext";
import { LightSwitch } from "../props/LightSwitch";
import { Pickup } from "../props/Pickup";
import { Readable } from "../props/Readable";
import { Radio, Television, addFridgeHum } from "../props/Appliances";
import { KeypadPanel } from "../props/KeypadPanel";
import { TapeDeck } from "../props/TapeDeck";
import { Examinable } from "../props/Examinable";
import { indexCard } from "../ProceduralTextures";
import { photograph } from "../PaperTextures";
import { STUDY_CODE } from "../../systems/PuzzleSystem";

const PI = Math.PI;

/** Ground-floor rooms. Every coordinate is in metres; walls are centred on the grid lines and 0.2 m thick. */
export class GroundFloor {
  constructor(private readonly r: RoomContext) {}

  build(): void {
    this.foyer();
    this.hall();
    this.rear();
    this.living();
    this.dining();
    this.kitchen();
    this.study();
  }

  // ---- foyer -----------------------------------------------------------------------------------

  private foyer(): void {
    const { b, furn, decor, ctx } = this.r;
    const m = ctx.mats;
    furn.rug("foyer-mat", 1.1, 0.65, [6.5, 0.85], m.rugDining, "foyer");
    // Coats on a hook board by the front door.
    b.box("hook-board", [0.9, 0.1, 0.03], [5.55, 1.75, 0.115], m.woodDark, { rooms: ["foyer"] });
    for (const x of [5.3, 5.55, 5.8]) b.box("hook", [0.03, 0.03, 0.06], [x, 1.75, 0.15], m.brass, { rooms: ["foyer"] });
    b.box("coat", [0.34, 0.95, 0.14], [5.3, 1.22, 0.2], m.coatGreen, { rooms: ["foyer"] });
    b.box("coat", [0.3, 0.8, 0.12], [5.8, 1.3, 0.19], m.coatBrown, { rooms: ["foyer"] });
    // Console and mirror.
    furn.table(b.frame([7.5, 0, 0.3], 0, ["foyer"]), 0.55, 0.34, 0.8, m.woodDark);
    b.box("mirror-frame", [0.58, 0.78, 0.03], [7.5, 1.55, 0.115], m.woodDark, { rooms: ["foyer"] });
    b.box("mirror", [0.5, 0.7, 0.01], [7.5, 1.55, 0.135], m.mirror, { rooms: ["foyer"] });
    furn.bookStack([7.5, 0.8, 0.3], 3, 0.2, 11, "foyer");
    // Umbrella stand.
    b.cyl("umbrella-stand", { h: 0.55, bottom: 0.22, sides: 12 }, [5.3, 0.28, 2.5], m.dark, { rooms: ["foyer"], collide: true });
    b.cyl("umbrella", { h: 0.7, bottom: 0.04 }, [5.3, 0.7, 2.5], m.woodDark, { rooms: ["foyer"] });
    // Light and the study keypad.
    furn.pendant("foyer", [6.5, 2.45, 1.4], "foyer", { on: true, intensity: 1.0, range: 5, flicker: 0.03, dimmable: true });
    new KeypadPanel(ctx, b, "study-door", [7.885, 1.3, 2.4], "-x", ["foyer"]);
    decor.photo([7.9, 1.55, 0.5], [-1, 0], [0.2, 0.26], "landscape", "foyer", "Framed photograph", "A faded landscape, no one in it. The sky has gone the colour of weak tea.");
  }

  // ---- hall ------------------------------------------------------------------------------------

  private hall(): void {
    const { b, furn, decor, ctx } = this.r;
    const m = ctx.mats;
    b.box("hall-runner", [1.0, 0.014, 4.9], [6.0, 0.007, 5.4], m.runner, { rooms: ["hall"], tile: 1 });
    furn.sconce("hall-sconce", [5.1, 1.7, 5.6], [1, 0], "hall", { on: true, intensity: 0.85, range: 5.5, flicker: 0.06, dimmable: true });
    decor.photo([5.1, 1.65, 3.4], [1, 0], [0.34, 0.26], "landscape", "hall", "Framed photograph", "A faded landscape. The frame is slightly crooked and nobody has straightened it.");
    decor.photo([5.1, 1.65, 7.6], [1, 0], [0.26, 0.32], "house", "hall", "Framed photograph", "The house in better days. Someone is standing at the front door, too small to make out.");
    // Plant in a pot.
    b.cyl("pot", { h: 0.3, top: 0.3, bottom: 0.22, sides: 12 }, [5.35, 0.15, 3.3], m.woodPale, { rooms: ["hall"], collide: true });
    for (let i = 0; i < 4; i++) b.box("leaf", [0.12, 0.45, 0.04], [5.35 + (i - 1.5) * 0.06, 0.55, 3.3], m.coatGreen, { rooms: ["hall"], rot: [0.2 * (i - 1.5), i, 0.2] });
  }

  // ---- rear passage ----------------------------------------------------------------------------

  private rear(): void {
    const { b, furn, ctx } = this.r;
    const m = ctx.mats;
    const lamp = furn.pendant("rear", [6.5, 2.5, 9.5], "rear", { on: false, intensity: 0.9, range: 5 });
    this.r.lamps.set("rear", lamp);
    // The switch is on the hall side of the opening, so it can be found from the dark.
    new LightSwitch(ctx, b, [5.25, 1.3, 7.8925], "-z", [lamp], ["hall"]);
    furn.cabinet(b.frame([5.3, 0, 10.5], PI / 2, ["rear"]), 0.8, 0.4, 1.9, m.woodPale, { doors: 2 });
    // Shoes and boots on a low rack.
    const rack = b.frame([5.3, 0, 8.5], PI / 2, ["rear"]);
    rack.box("rack-shelf", [0.8, 0.03, 0.32], [0, 0.12, 0], m.woodPale);
    rack.box("rack-shelf", [0.8, 0.03, 0.32], [0, 0.3, 0], m.woodPale);
    for (const x of [-0.25, 0, 0.25]) rack.box("boot", [0.12, 0.28, 0.28], [x, 0.17, 0], m.coatBrown);
    rack.collider("rack", [0.8, 0.4, 0.32], [0, 0.2, 0]);
    // Hooks and a coat by the back door.
    b.box("hook-board", [0.9, 0.1, 0.03], [5.6, 1.75, 10.885], m.woodDark, { rooms: ["rear"] });
    b.box("coat", [0.34, 0.95, 0.14], [5.5, 1.22, 10.8], m.coatBrown, { rooms: ["rear"] });
    // A small table with old post.
    const tableF = b.frame([7.7, 0, 8.55], -PI / 2, ["rear"]);
    furn.table(tableF, 0.5, 0.35, 0.75, m.woodMid);
    new TapeDeck(ctx, b.frame(tableF.at([-0.1, 0.75, 0]), -PI / 2, ["rear"]), "machine", "machine", "rear");
    const phoneF = b.frame(tableF.at([0.14, 0.75, 0]), -PI / 2, ["rear"]);
    phoneF.box("phone-base", [0.18, 0.06, 0.2], [0, 0.03, 0], m.coatGreen, { cast: true });
    phoneF.box("phone-handset", [0.05, 0.035, 0.2], [0, 0.077, 0], m.dark);
  }

  // ---- living room -----------------------------------------------------------------------------

  private living(): void {
    const { b, furn, decor, ctx } = this.r;
    const m = ctx.mats;
    const R = "living" as const;
    furn.rug("living-rug", 2.8, 2.0, [2.4, 2.3], m.rugLiving, R);
    furn.sofa(b.frame([2.4, 0, 1.15], 0, [R]), 2.1, m.sofa);
    furn.table(b.frame([2.4, 0, 2.5], 0, [R]), 1.1, 0.6, 0.42, m.woodMid);
    furn.bookStack([2.1, 0.42, 2.5], 3, 0.3, 31, R);
    furn.mug([2.75, 0.465, 2.45], R);
    furn.armchair(b.frame([4.2, 0, 3.5], -PI / 2, [R]), m.armchair);
    furn.armchair(b.frame([1.2, 0, 3.6], PI / 2, [R]), m.armchair);

    // Television.
    const standF = b.frame([4.0, 0, 5.25], PI, [R]);
    furn.cabinet(standF, 1.1, 0.4, 0.5, m.woodDark, { doors: 2 });
    const glow = ctx.lighting.createLamp("tv-glow", new Vector3(4.0, 1.0, 4.5), { color: new Color3(0.5, 0.65, 1), range: 4.5, intensity: 0.55, flicker: 0.35, on: false });
    ctx.registerLamp(glow, R);
    new Television(ctx, b.frame([4.0, 0.5, 5.25], PI, [R]), R, glow);

    // Cabinet on the west wall with the Phase 1 drawer and switchable lamp.
    const cabF = b.frame([0.33, 0, 4.7], PI / 2, [R]);
    furn.cabinet(cabF, 1.3, 0.46, 0.9, m.woodMid, { doors: 2 });
    const tex = indexCard(ctx.scene, STUDY_CODE);
    const drawer = furn.frontDrawer(cabF, {
      id: "living-drawer",
      x: 0,
      y: 0.7,
      z: 0.232,
      width: 1.1,
      height: 0.2,
      mat: m.woodMid,
      rooms: [R],
      fill: (slide) => {
        const card = cabF.box("drawer-card", [0.2, 0.004, 0.13], [0.1, 0.653, 0.005], ctx.mats.textured("card-mat", tex), { pick: true, merge: false });
        card.setParent(slide);
        new Readable(ctx, b, card, {
          id: "index-card",
          verb: "card",
          title: "Index card",
          text: "A small index card, the handwriting careful and slanted. The paper has gone soft at the corners.",
          texture: tex,
          size: [0.3, 0.2],
          flag: "cardRead",
        });
      },
      onOpen: () => ctx.state.set("drawerOpened"),
    });
    this.r.tick(drawer);
    const lampF = cabF.at([0, 0.9, -0.02]);
    const table = furn.tableLamp("living-lamp", lampF, R, { on: false, interactive: true, intensity: 1.5, range: 7.5 });
    void table;
    decor.photo([0.1, 1.55, 3.75], [1, 0], [0.3, 0.38], "family-five", R, "Family photograph", "Five figures on the front step in summer light. On the backing paper, in pencil: 'The step, summer. All of us.' A photo-lab stamp: No. 0412.", "living-photo");
    decor.photo([0.1, 1.55, 5.15], [1, 0], [0.26, 0.34], "siblings", R, "Framed photograph", "Two children on a front step, the smaller one holding the other's sleeve.");

    new TapeDeck(ctx, b.frame(cabF.at([0.42, 0.9, -0.02]), PI / 2, [R]), "living", "deck", R);
    // Radio, clock, bookshelf.
    furn.table(b.frame([4.7, 0, 3.1], -PI / 2, [R]), 0.45, 0.4, 0.6, m.woodMid);
    new Radio(ctx, b.frame([4.7, 0.6, 3.1], -PI / 2, [R]), R);
    const clockF = b.frame([4.9, 1.95, 3.1], -PI / 2, [R]);
    clockF.cyl("clock", { h: 0.04, bottom: 0.42, sides: 24 }, [0, 0, 0.02], m.brass).rotation.x = PI / 2;
    clockF.box("clock-hand", [0.012, 0.15, 0.015], [0, 0.05, 0.05], m.dark);
    clockF.box("clock-hand", [0.11, 0.012, 0.015], [0.04, 0, 0.05], m.dark);
    ctx.audio.addEmitter("clock", new Vector3(4.7, 1.95, 3.1), "tick", true);
    furn.bookshelf(b.frame([0.8, 0, 5.25], PI, [R]), 1.2, 1.9, 41);

    // Ceiling light and its switch by the foyer opening.
    const ceil = furn.pendant("living", [2.4, 2.4, 2.7], R, { on: false, intensity: 1.0, range: 6.5 });
    new LightSwitch(ctx, b, [4.8925, 1.3, 2.45], "-x", [ceil], [R]);
  }

  // ---- dining room -----------------------------------------------------------------------------

  private dining(): void {
    const { b, furn, decor, ctx } = this.r;
    const m = ctx.mats;
    const R = "dining" as const;
    furn.rug("dining-rug", 3.1, 2.1, [2.6, 8.3], m.rugDining, R);
    furn.table(b.frame([2.6, 0, 8.3], 0, [R]), 1.9, 1.0, 0.76, m.woodMid);
    // Chairs: most tucked in, one pulled out as if someone has just left.
    furn.diningChair(b.frame([2.0, 0, 7.5], 0, [R]), false);
    furn.diningChair(b.frame([3.2, 0, 7.5], 0, [R]), false);
    furn.diningChair(b.frame([2.0, 0, 9.1], PI, [R]), false);
    const pulled = furn.diningChair(b.frame([3.35, 0, 9.35], PI + 0.45, [R]), true);
    if (pulled) new Examinable(ctx, pulled, "Examine chair", "dining-chair", "One chair pushed back at an angle, the way a child leaves it when she has been called away from dinner. Dust over everything but the seat.");
    furn.diningChair(b.frame([1.45, 0, 8.3], PI / 2, [R]), false);
    furn.diningChair(b.frame([3.75, 0, 8.3], -PI / 2, [R]), false);
    // A table laid for dinner.
    for (const [x, z] of [[2.0, 7.85], [3.2, 7.85], [2.0, 8.75], [3.2, 8.75]] as const) {
      furn.plate([x, 0.766, z], R);
      b.box("cutlery", [0.02, 0.006, 0.17], [x - 0.18, 0.763, z], m.steel, { rooms: [R] });
      b.box("cutlery", [0.02, 0.006, 0.17], [x + 0.18, 0.763, z], m.steel, { rooms: [R] });
      b.cyl("glass", { h: 0.1, top: 0.07, bottom: 0.06, sides: 10 }, [x + 0.12, 0.81, z - 0.18], m.mirror, { rooms: [R] });
    }
    b.cyl("candle", { h: 0.18, bottom: 0.035, sides: 8 }, [2.4, 0.85, 8.3], m.paper, { rooms: [R] });
    b.cyl("candle", { h: 0.18, bottom: 0.035, sides: 8 }, [2.8, 0.85, 8.3], m.paper, { rooms: [R] });
    b.cyl("bowl", { h: 0.1, top: 0.3, bottom: 0.16, sides: 14 }, [2.6, 0.81, 8.3], m.ceramic, { rooms: [R] });
    furn.pendant("dining", [2.6, 2.0, 8.3], R, { on: true, intensity: 1.5, range: 6.5, flicker: 0.025, dimmable: true });

    // Sideboard with a photograph, flowers and a box of matches.
    const sb = b.frame([4.25, 0, 10.7], PI, [R]);
    furn.cabinet(sb, 1.2, 0.45, 0.9, m.woodDark, { doors: 2 });
    furn.vase(sb.at([0.35, 0.9, 0]), R);
    const matches = b.box("matchbox", [0.06, 0.02, 0.04], sb.at([-0.2, 0.915, 0.05]), m.cardboard, { rooms: [R], pick: true, merge: false, rot: [0, 0.4, 0] });
    new Pickup(ctx, matches, { id: "matchbox", name: "box of matches", message: "A box of matches. Most are still there." });
    decor.photo([4.25, 1.45, 10.9], [0, -1], [0.34, 0.26], "family", R, "Family photograph", "Everyone is looking at the camera except one child, who is looking at someone just out of frame.");
    // China cabinet, wall pictures.
    furn.cabinet(b.frame([4.2, 0, 5.75], 0, [R]), 1.2, 0.4, 1.9, m.woodDark, { doors: 2 });
    decor.photo([0.1, 1.6, 6.5], [1, 0], [0.34, 0.26], "landscape", R, "Framed photograph", "A landscape with a low hill. The sky has foxed to brown at the corners.");
  }

  // ---- kitchen ---------------------------------------------------------------------------------

  private kitchen(): void {
    const { b, furn, decor, ctx } = this.r;
    const m = ctx.mats;
    const R = "kitchen" as const;
    const z = 10.58;
    // Base cabinets along the north wall: x = 8.6 + 0.6 * i. Index 1 is the cooker.
    for (let i = 0; i < 8; i++) {
      const x = 8.6 + 0.6 * i;
      const F = b.frame([x, 0, z], PI, [R]);
      if (i === 1) {
        F.box("cooker", [0.6, 0.9, 0.6], [0, 0.45, 0], m.appliance, { cast: true });
        for (const [dx, dz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]] as const) F.cyl("burner", { h: 0.01, bottom: 0.16, sides: 12 }, [dx, 0.905, dz], m.dark);
        F.box("oven-window", [0.44, 0.3, 0.01], [0, 0.42, 0.305], m.dark);
        F.box("oven-handle", [0.46, 0.02, 0.03], [0, 0.68, 0.33], m.steel);
        F.collider("cooker", [0.6, 0.9, 0.6], [0, 0.45, 0]);
        continue;
      }
      if (i === 2) {
        furn.cabinet(F, 0.6, 0.58, 0.88, m.woodMid, { doors: 0 });
        const key = furn.frontDrawer(F, {
          id: "kitchen-drawer",
          x: 0,
          y: 0.76,
          z: 0.292,
          width: 0.54,
          height: 0.16,
          mat: m.woodMid,
          rooms: [R],
          fill: (slide) => {
            const k = F.box("brass-key", [0.03, 0.01, 0.09], [0.05, 0.735, 0.0], m.brass, { pick: true, merge: false });
            k.setParent(slide);
            new Pickup(ctx, k, { id: "brass-key", name: "brass key", message: "A small brass key, warm from the drawer. It is tagged 'Landing'." });
          },
        });
        this.r.tick(key);
        continue;
      }
      furn.cabinet(F, 0.6, 0.58, 0.88, m.woodMid, { doors: 1 });
    }
    // Worktops, splashback, sink.
    b.box("counter", [0.6, 0.04, 0.64], [8.6, 0.9, z], m.counter, { rooms: [R], tile: 1 });
    b.box("counter", [3.6, 0.04, 0.64], [11.0, 0.9, z], m.counter, { rooms: [R], tile: 1 });
    b.box("splash", [1.9, 0.5, 0.02], [9.15, 1.17, 10.89], m.tileWall, { rooms: [R], tile: 1 });
    b.box("splash", [0.9, 0.1, 0.02], [11.1, 0.97, 10.89], m.tileWall, { rooms: [R], tile: 1 });
    b.box("splash", [0.9, 0.5, 0.02], [12.7, 1.17, 10.89], m.tileWall, { rooms: [R], tile: 1 });
    b.box("sink-basin", [0.72, 0.012, 0.46], [10.7, 0.922, z], m.steel, { rooms: [R] });
    b.cyl("tap", { h: 0.25, bottom: 0.03 }, [10.7, 1.05, 10.82], m.steel, { rooms: [R] });
    b.box("tap-spout", [0.02, 0.02, 0.14], [10.7, 1.17, 10.74], m.steel, { rooms: [R] });
    b.cyl("pan", { h: 0.08, bottom: 0.22, sides: 14 }, [9.2, 0.95, 10.6], m.dark, { rooms: [R] });
    b.cyl("kettle", { h: 0.2, top: 0.12, bottom: 0.17, sides: 12 }, [12.4, 1.02, 10.6], m.steel, { rooms: [R] });
    b.box("bread-bin", [0.34, 0.2, 0.24], [12.85, 1.02, 10.62], m.woodPale, { rooms: [R] });
    furn.plate([10.4, 0.93, 10.55], R, 0.26);
    furn.plate([10.4, 0.945, 10.55], R, 0.26);
    furn.mug([11.5, 0.965, 10.7], R);
    // Wall units.
    for (const x of [8.6, 9.2, 9.8, 12.6, 13.1]) {
      const F = b.frame([x, 0, 10.74], PI, [R]);
      F.box("upper", [0.6, 0.7, 0.34], [0, 1.85, 0], m.woodMid, { cast: true, tile: 1 });
      F.box("upper-panel", [0.54, 0.62, 0.012], [0, 1.85, 0.176], m.woodDark, { tile: 1 });
      F.box("upper-knob", [0.025, 0.025, 0.025], [0.2, 1.6, 0.19], m.brass);
    }
    // Refrigerator.
    const fr = b.frame([13.45, 0, 10.5], PI, [R]);
    fr.box("fridge-body", [0.7, 1.78, 0.62], [0, 0.89, -0.04], m.appliance, { cast: true });
    fr.box("fridge-inner", [0.6, 1.62, 0.01], [0, 0.89, 0.272], m.dark);
    for (const y of [0.45, 0.85, 1.25]) fr.box("fridge-shelf", [0.58, 0.015, 0.4], [0, y, 0.12], m.white);
    fr.collider("fridge", [0.7, 1.78, 0.62], [0, 0.89, -0.04]);
    const door = furn.frontDoor(fr, { id: "fridge", x: 0, side: 1, z: 0.31, width: 0.7, height: 1.74, y0: 0.02, mat: m.appliance, rooms: [R], label: "fridge", maxAngle: 1.9 });
    this.r.tick(door);
    const list = decor.noteOnWall([13.45, 1.45, 10.12], [0, -1], ["milk", "bread, eggs", "apples", "batteries (torch!)", "light bulbs"], R, "Shopping list", "A shopping list in neat handwriting. Batteries for the torch are underlined twice.", [0.15, 0.2], "shopping-list");
    list.setParent(door.leaf);
    addFridgeHum(ctx, new Vector3(13.45, 1.2, 10.5), R);
    // Table and chairs: the dining connection.
    furn.table(b.frame([11.0, 0, 7.9], 0, [R]), 1.2, 0.8, 0.74, m.woodPale);
    furn.diningChair(b.frame([11.0, 0, 8.55], PI, [R]), false);
    furn.diningChair(b.frame([11.0, 0, 7.25], 0, [R]), false);
    furn.diningChair(b.frame([10.15, 0, 7.9], PI / 2, [R]), false);
    b.cyl("fruit-bowl", { h: 0.08, top: 0.28, bottom: 0.16, sides: 14 }, [11.0, 0.78, 7.9], m.ceramic, { rooms: [R] });
    for (let i = 0; i < 4; i++) b.sphere("apple", 0.08, [10.93 + (i % 2) * 0.1, 0.85, 7.85 + (i > 1 ? 0.1 : 0)], m.toys[0], { rooms: [R] });
    furn.mug([11.4, 0.785, 8.1], R);
    decor.noteOnSurface([11.95, 0.922, 10.56], PI + 0.25, ["Back by 9", "Dinner in the oven", "(35 mins)", "Don't let Em eat", "it cold. Look after", "her.   Love Mum x"], R, "Note from Mum", { text: "Mum's handwriting. Underneath, in Dad's: 'Chips on the way home?'", ev: "kitchen-note" });
    // Calendar.
    decor.noteOnWall([10.5, 1.55, 5.1], [0, 1], ["October", "", "Fri  Leaving do 6pm", "Back late.", "Daniel in charge!!"], R, "Wall calendar", "A wall calendar stopped on October. One Friday is circled: 'Leaving do 6pm. Back late. Daniel in charge!!'", [0.3, 0.4], "calendar");
    // Light and switch.
    const light = furn.pendant("kitchen", [10.8, 2.5, 8.0], R, { on: false, intensity: 1.1, range: 7, startup: true });
    new LightSwitch(ctx, b, [8.1075, 1.3, 10.4], "+x", [light], [R]);
  }

  // ---- study -----------------------------------------------------------------------------------

  private study(): void {
    const { b, furn, decor, ctx } = this.r;
    const m = ctx.mats;
    const R = "study" as const;
    furn.rug("study-rug", 3.0, 2.0, [10.9, 2.7], m.rugLiving, R);
    const deskF = b.frame([11.0, 0, 4.5], PI, [R]);
    furn.desk(deskF, m.woodDark);
    furn.deskChair(b.frame([11.0, 0, 3.65], 0, [R]), m.armchair);
    const lamp = furn.tableLamp("desk-lamp", deskF.at([-0.5, 0.76, -0.15]), R, { on: true, interactive: true, flicker: 0.03, intensity: 1.3, range: 6.5 });
    void lamp;
    b.box("blotter", [0.5, 0.008, 0.34], deskF.at([0.1, 0.764, 0.0]), m.coatGreen, { rooms: [R] });
    furn.bookStack(deskF.at([0.55, 0.76, -0.2]), 4, 0.2, 51, R);
    new TapeDeck(ctx, b.frame(deskF.at([0.46, 0.76, 0.17]), PI, [R]), "study", "deck", R);
    b.cyl("pen-cup", { h: 0.1, bottom: 0.07, sides: 10 }, deskF.at([-0.1, 0.81, -0.22]), m.dark, { rooms: [R] });
    decor.noteOnSurface(deskF.at([0.1, 0.768, 0.02]), PI + 0.2, ["Property tax", "second notice", "", "Please remit by the 30th."], R, "Letter", { text: "A tax notice, creased where it was folded to fit an envelope. Entirely ordinary." });
    const deskDrawer = furn.frontDrawer(deskF, {
      id: "desk-drawer",
      x: 0.3,
      y: 0.6,
      z: 0.352,
      width: 0.5,
      height: 0.14,
      mat: m.woodDark,
      rooms: [R],
      fill: (slide) => {
        const y = 0.6 - 0.07 + 0.03 + 0.022;
        const n = decor.noteOnSurface(deskF.at([0.19, y, 0.12]), PI, ["Bank statement", "", "Nothing unusual.", "Balance carried forward."], R, "Statement", { text: "A bank statement. The numbers are small and unremarkable." });
        n.setParent(slide);
        const bill = decor.noteOnSurface(deskF.at([0.41, y, 0.12]), PI + 0.1, ["Itemised bill - October", "", "Sun  15:02  Nana   11m 08s", "Wed  16:40  Nana    6m 20s", "Fri  20:51  999     0m 42s", "", "Total due: 12.40"], R, "Telephone bill", { text: "An itemised telephone bill. Most lines are Nana, on Sundays. Under the Friday there is one evening call.", ev: "phone-bill" });
        bill.setParent(slide);
      },
    });
    this.r.tick(deskDrawer);
    furn.bookshelf(b.frame([9.1, 0, 4.72], PI, [R]), 1.2, 2.0, 61);
    furn.bookshelf(b.frame([13.0, 0, 4.72], PI, [R]), 1.2, 2.0, 62);
    furn.cabinet(b.frame([8.35, 0, 3.0], PI / 2, [R]), 0.5, 0.4, 1.3, m.woodMid, { doors: 2 });
    furn.armchair(b.frame([13.0, 0, 1.4], -PI / 2, [R]), m.armchair);
    furn.table(b.frame([13.55, 0, 0.6], 0, [R]), 0.5, 0.5, 0.55, m.woodMid);
    b.cyl("globe-stand", { h: 0.14, bottom: 0.14, sides: 10 }, [13.55, 0.62, 0.6], m.brass, { rooms: [R] });
    b.sphere("globe", 0.3, [13.55, 0.82, 0.6], m.woodPale, { rooms: [R] });
    decor.photo([8.1, 1.7, 3.0], [1, 0], [0.3, 0.38], "house", R, "Framed photograph", "The house, photographed from the gate. A light is on upstairs.");
    // The family album on the filing cabinet: the original print.
    const albumTex = photograph(ctx.scene, "album-print", 701, "family", 4 / 3);
    const album = b.box("album", [0.3, 0.05, 0.24], [8.35, 1.325, 3.0], m.coatBrown, { rooms: [R], pick: true, merge: false, rot: [0, 0.2, 0] });
    b.box("album-spine", [0.02, 0.052, 0.24], [8.22, 1.325, 3.0], m.coatGreen, { rooms: [R], rot: [0, 0.2, 0] });
    new Readable(ctx, b, album, { id: "album-print", verb: "family album", title: "The family album", text: "The page falls open at one print. Lab stamp: No. 0412.", texture: albumTex, size: [0.52, 0.39], evidence: "album-print" });
    // The study light is always on; no switch needed.
  }
}
