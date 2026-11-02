import type { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import * as T from "./ProceduralTextures";
import * as S from "./SurfaceTextures";
import type { RoomId } from "./Layout";
import { normalMapFrom } from "./NormalMaps";
import { aoBlobMaterial, aoStripMaterial, moonPatchMaterial, glowMaterial, scuffMaterial, glassSheenTexture } from "./Decals";

/**
 * Shared material library. Textures are procedural and small (256-512 px); painted surfaces share one plaster grain
 * and differ by tint, so many rooms cost one texture. Specular is kept low for an aged, matte look.
 */
export class Materials {
  readonly walls = {} as Record<RoomId, StandardMaterial>;
  readonly floors = {} as Record<RoomId, StandardMaterial>;
  readonly ceilings = {} as Record<RoomId, StandardMaterial>;
  readonly exterior: StandardMaterial;

  readonly trim: StandardMaterial;
  readonly woodDark: StandardMaterial;
  readonly woodMid: StandardMaterial;
  readonly woodPale: StandardMaterial;
  readonly doorWood: StandardMaterial;
  readonly runner: StandardMaterial;
  readonly sofa: StandardMaterial;
  readonly armchair: StandardMaterial;
  readonly curtain: StandardMaterial;
  readonly bedDaniel: StandardMaterial;
  readonly bedEmily: StandardMaterial;
  readonly rugLiving: StandardMaterial;
  readonly rugDining: StandardMaterial;
  readonly rugEmily: StandardMaterial;
  readonly counter: StandardMaterial;
  readonly tileWall: StandardMaterial;

  readonly brass: StandardMaterial;
  readonly lampBase: StandardMaterial;
  readonly dark: StandardMaterial;
  readonly screen: StandardMaterial;
  readonly white: StandardMaterial;
  readonly ceramic: StandardMaterial;
  readonly appliance: StandardMaterial;
  readonly steel: StandardMaterial;
  readonly paper: StandardMaterial;
  readonly cloth: StandardMaterial;
  readonly cardboard: StandardMaterial;
  readonly dust: StandardMaterial;
  readonly mirror: StandardMaterial;
  readonly coatGreen: StandardMaterial;
  readonly coatBrown: StandardMaterial;
  readonly night: StandardMaterial;
  readonly aoBlob: StandardMaterial;
  readonly aoTop: StandardMaterial;
  readonly aoBottom: StandardMaterial;
  readonly moon: StandardMaterial;
  readonly glow: StandardMaterial;
  readonly scuff: StandardMaterial;
  readonly doorPanel: StandardMaterial;
  readonly leather: StandardMaterial;
  readonly chrome: StandardMaterial;
  readonly books: StandardMaterial[];
  readonly toys: StandardMaterial[];

  constructor(private readonly scene: Scene) {
    const plaster = S.plaster(scene);
    const paint = (name: string, hex: string) => this.tinted(name, plaster, hex);

    const hallPaper = this.mat("m-hall-paper", T.wallpaper(scene, "tex-hall", 1, { base: "#bfae88", stripe: "#3f5238", stripeAlpha: 0.6, motif: "#2d3a28" }), 0.04, 2.6, 256, 0.9);
    const livingPaper = this.mat("m-living-paper", T.wallpaper(scene, "tex-living", 2, { base: "#c9bd9c", stripe: "#8a7f5e", stripeAlpha: 0.22, motif: "#6b5a3c" }), 0.04, 2.2, 256, 0.8);
    const studyPaper = this.mat("m-study-paper", T.wallpaper(scene, "tex-study", 3, { base: "#46553f", stripe: "#2c3a28", stripeAlpha: 0.5, motif: "#7a6a3f" }), 0.04, 2.6, 256, 0.9);
    const diningPaper = this.mat("m-dining-paper", T.wallpaper(scene, "tex-dining", 4, { base: "#b49b6f", stripe: "#8c7448", stripeAlpha: 0.28, motif: "#5b4a2c" }), 0.04, 2.2, 256, 0.8);
    const landingPaper = this.mat("m-landing-paper", T.wallpaper(scene, "tex-landing", 8, { base: "#c8bc9e", stripe: "#4d5e45", stripeAlpha: 0.3, motif: "#4d5e45" }), 0.04, 2.2, 256, 0.8);
    const kids = this.mat("m-kids", S.kidsPaper(scene), 0.04, 2.2, 256, 0.8);
    this.tileWall = this.mat("m-bath-tile", S.tiles(scene, "tex-bath-wall", 161, 140, 14, 62, 8), 0.25, 3.8, 256, 1.0);

    const oakDark = this.mat("m-oak-dark", S.planks(scene, "tex-oak-dark", 11, { hue: 24, sat: 38, light: 24, planks: 8 }), 0.16, 3.6, 256, 1.0);
    const oakMid = this.mat("m-oak-mid", S.planks(scene, "tex-oak-mid", 12, { hue: 28, sat: 36, light: 32, planks: 6 }), 0.14, 3.4, 256, 1.0);
    const oakPale = this.mat("m-oak-pale", S.planks(scene, "tex-oak-pale", 13, { hue: 34, sat: 30, light: 42, planks: 10 }), 0.1, 3.0, 256, 0.9);
    const lino = this.mat("m-lino", S.linoleum(scene), 0.2, 3.0, 256, 0.9);
    const bathFloor = this.mat("m-bath-floor", S.tiles(scene, "tex-bath-floor", 171, 30, 10, 42, 12), 0.25, 3.8, 256, 1.0);
    const carpetBeige = this.mat("m-carpet-beige", S.carpet(scene, "tex-carpet-beige", 181, "#9a8c70"), 0, 1.8, 256, 0.9);
    const carpetSlate = this.mat("m-carpet-slate", S.carpet(scene, "tex-carpet-slate", 182, "#5d6a68"), 0, 1.8, 256, 0.9);
    const carpetWarm = this.mat("m-carpet-warm", S.carpet(scene, "tex-carpet-warm", 183, "#a38a78"), 0, 1.8, 256, 0.9);
    this.runner = this.mat("m-runner", S.stairRunner(scene), 0, 1.6, 256, 0.8);

    const ceil = (name: string, hex: string) => paint(name, hex);
    const ceilWhite = ceil("m-ceil-white", "#c9c1ad");
    const ceilYellow = ceil("m-ceil-yellow", "#bdb28a");

    const set = (id: RoomId, wall: StandardMaterial, floor: StandardMaterial, ceiling: StandardMaterial) => {
      this.walls[id] = wall;
      this.floors[id] = floor;
      this.ceilings[id] = ceiling;
    };
    set("foyer", hallPaper, oakDark, ceilWhite);
    set("hall", hallPaper, oakDark, ceilWhite);
    set("rear", paint("m-rear-paint", "#a9a37f"), oakMid, ceilWhite);
    set("living", livingPaper, oakMid, ceilWhite);
    set("dining", diningPaper, oakDark, ceilWhite);
    set("kitchen", paint("m-kitchen-paint", "#c9bb82"), lino, ceilYellow);
    set("study", studyPaper, oakDark, ceilWhite);
    set("uphall", landingPaper, carpetBeige, ceilWhite);
    set("storage", paint("m-storage-paint", "#8f8c7a"), oakPale, ceilWhite);
    set("daniel", paint("m-daniel-paint", "#74857d"), carpetSlate, ceilWhite);
    set("emily", kids, carpetWarm, ceilWhite);
    set("bathroom", this.tileWall, bathFloor, ceilWhite);
    this.exterior = this.flat("m-exterior", "#2a2822", 0);

    this.trim = this.tinted("m-trim", plaster, "#cfc6ae", 0.1);
    this.woodDark = this.mat("m-wood-dark", S.grain(scene, "tex-wood-dark", 201, "#3d281a"), 0.2, 2.4, 256, 0.9);
    this.woodMid = this.mat("m-wood-mid", S.grain(scene, "tex-wood-mid", 202, "#5a3d27"), 0.2, 2.4, 256, 0.9);
    this.woodPale = this.mat("m-wood-pale", S.grain(scene, "tex-wood-pale", 203, "#a88a5f", 40), 0.12, 2.0, 256, 0.8);
    this.doorWood = this.mat("m-door", S.grain(scene, "tex-door", 204, "#4e3523", 50), 0.18);

    this.sofa = this.mat("m-sofa", T.fabric(scene, "tex-sofa", 5, "#33422f"), 0.03, 2.4, 256, 0.9);
    this.armchair = this.mat("m-armchair", T.fabric(scene, "tex-armchair", 6, "#5b4330"), 0.03, 2.4, 256, 0.9);
    this.curtain = this.mat("m-curtain", S.curtainFabric(scene), 0, 3.0, 256, 1.0);
    this.bedDaniel = this.mat("m-bed-daniel", S.gingham(scene, "tex-bed-daniel", 211, "#56685f", "#2f3e45"), 0, 2.2, 256, 0.9);
    this.bedEmily = this.mat("m-bed-emily", S.gingham(scene, "tex-bed-emily", 212, "#c9b0a0", "#a9776a"), 0, 2.2, 256, 0.9);
    this.rugLiving = this.mat("m-rug-living", T.rugTexture(scene));
    this.rugDining = this.mat("m-rug-dining", T.fabric(scene, "tex-rug-dining", 221, "#4a3a2c"));
    this.rugEmily = this.mat("m-rug-emily", T.fabric(scene, "tex-rug-emily", 222, "#8f7a66"));
    this.counter = this.mat("m-counter", S.laminate(scene), 0.15, 1.6, 256, 0.7);

    this.brass = this.flat("m-brass", "#8a6d32", 0.5);
    this.lampBase = this.flat("m-lampbase", "#5a4a30", 0.3);
    this.dark = this.flat("m-dark", "#181410", 0.05);
    this.screen = this.flat("m-screen", "#262622", 0.4);
    this.white = this.flat("m-white", "#c8c3b4", 0.08);
    this.ceramic = this.flat("m-ceramic", "#d4cfc0", 0.5);
    this.appliance = this.flat("m-appliance", "#bcb8a8", 0.35);
    this.steel = this.flat("m-steel", "#8a8a84", 0.6);
    this.paper = this.flat("m-paper", "#d6ccb0", 0);
    this.cloth = this.flat("m-cloth", "#6f6a58", 0);
    this.cardboard = this.flat("m-cardboard", "#8f7a58", 0);
    this.dust = this.flat("m-dust", "#9c9788", 0);
    this.mirror = this.flat("m-mirror", "#5a6468", 0.85);
    this.coatGreen = this.flat("m-coat-green", "#3a4a35", 0);
    this.coatBrown = this.flat("m-coat-brown", "#5a4430", 0);
    this.night = new StandardMaterial("m-night", scene);
    this.night.disableLighting = true;
    this.night.emissiveColor = new Color3(0.035, 0.05, 0.075);
    this.books = ["#6b2f2a", "#2f4a3a", "#4a3c2a", "#2c3a52", "#7a6a3a", "#3a2a2a"].map((h, i) => this.flat(`m-book-${i}`, h, 0.05));
    this.aoBlob = aoBlobMaterial(scene);
    this.aoTop = aoStripMaterial(scene, "ao-top", true);
    this.aoBottom = aoStripMaterial(scene, "ao-bottom", false);
    this.moon = moonPatchMaterial(scene);
    this.glow = glowMaterial(scene);
    this.scuff = scuffMaterial(scene);
    this.night.emissiveTexture = glassSheenTexture(scene);
    this.night.emissiveColor = Color3.Black();
    this.doorPanel = this.mat("m-door-panel", S.doorPanels(scene), 0.18, 3.4, 256, 1.0);
    this.leather = this.flat("m-leather", "#4a3224", 0.3);
    this.chrome = this.flat("m-chrome", "#b8b8b0", 0.9);
    this.toys = ["#a8473d", "#d6a93a", "#3d7aa8", "#5a9a52", "#a86a9a"].map((h, i) => this.flat(`m-toy-${i}`, h, 0.15));
  }

  /** Textured material for one-off pictures (photographs, drawings). Lit normally. */
  textured(name: string, tex: BaseTexture, spec = 0.05): StandardMaterial {
    return this.mat(name, tex, spec);
  }

  /** Unlit textured material for held or inspected items so the text stays readable. */
  unlit(name: string, tex: BaseTexture): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    m.disableLighting = true;
    m.emissiveTexture = tex;
    return m;
  }

  /** Emissive shade material for a lamp (updated by Lamp.setOn). */
  lampShade(name: string): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = new Color3(0.55, 0.45, 0.3);
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(0.9, 0.62, 0.32);
    return m;
  }

  /** `bump` > 0 adds a normal map derived from the colour texture (strength, then map size and level). */
  private mat(name: string, tex: BaseTexture, spec = 0.04, bump = 0, bumpSize = 256, level = 0.9): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseTexture = tex;
    if (bump > 0) {
      m.bumpTexture = normalMapFrom(this.scene, tex, `${name}-n`, bump, bumpSize);
      m.bumpTexture.level = level;
    }
    m.specularColor = new Color3(spec, spec, spec * 0.9);
    m.specularPower = 24;
    m.ambientColor = new Color3(1, 1, 1);
    return m;
  }

  private plasterNormal: BaseTexture | null = null;

  private tinted(name: string, tex: BaseTexture, hex: string, spec = 0.03): StandardMaterial {
    const m = this.mat(name, tex, spec);
    // Painted surfaces share one plaster normal map, so they cost one texture however many tints there are.
    this.plasterNormal ??= normalMapFrom(this.scene, tex, "tex-plaster-n", 1.1, 256);
    m.bumpTexture = this.plasterNormal;
    m.bumpTexture.level = 0.35;
    m.diffuseColor = Color3.FromHexString(hex);
    return m;
  }

  private flat(name: string, hex: string, spec: number): StandardMaterial {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = new Color3(spec, spec, spec);
    m.ambientColor = new Color3(1, 1, 1);
    return m;
  }
}
