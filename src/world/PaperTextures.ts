import type { Scene } from "@babylonjs/core/scene";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { make, speckle, stains, type Rand } from "./ProceduralTextures";
import { paintPhoto } from "./PhotoPainter";

export interface SheetOptions {
  paper?: string;
  ink?: string;
  font?: string;
  lineHeight?: number;
  ruled?: boolean;
  title?: string;
}

/** A sheet of paper with handwritten-style lines of text. Used for notes, lists and the Phase 1 index card. */
export function paperSheet(scene: Scene, name: string, seed: number, lines: string[], o: SheetOptions = {}): DynamicTexture {
  return make(scene, name, 512, seed, (c, s, r) => {
    c.fillStyle = o.paper ?? "#dcd3b6";
    c.fillRect(0, 0, s, s);
    if (o.ruled) {
      c.strokeStyle = "rgba(90,120,150,0.3)";
      c.lineWidth = 2;
      for (let y = 100; y < s; y += 44) {
        c.beginPath();
        c.moveTo(16, y);
        c.lineTo(s - 16, y);
        c.stroke();
      }
    }
    stains(c, s, r, 4);
    c.fillStyle = o.ink ?? "#2a2118";
    let y = 60;
    if (o.title) {
      c.font = `italic 40px Georgia, serif`;
      c.fillText(o.title, 32, y);
      y += 62;
    }
    c.font = o.font ?? "italic 30px Georgia, serif";
    for (const line of lines) {
      c.fillText(line, 32 + (r() - 0.5) * 3, y + (r() - 0.5) * 2);
      y += o.lineHeight ?? 44;
    }
    speckle(c, s, r, 1400, 0.05);
  });
}

export type PhotoKind = import("./PhotoPainter").PhotoKind;

/**
 * A believable aged photograph (see PhotoPainter). `aspect` is width / height of the frame it will hang in, so faces are
 * never stretched. The same four family members are painted in every print.
 */
export function photograph(scene: Scene, name: string, seed: number, kind: PhotoKind, aspect = 1): DynamicTexture {
  const base = 384;
  const w = aspect >= 1 ? base : Math.round(base * aspect);
  const h = aspect >= 1 ? Math.round(base / aspect) : base;
  const t = new DynamicTexture(name, { width: w, height: h }, scene, true);
  paintPhoto((t.getContext() as unknown as CanvasRenderingContext2D).canvas, kind, seed);
  t.update();
  t.anisotropicFilteringLevel = 4;
  return t;
}

export type DrawingKind = "house" | "horse" | "rainbow" | "garden";

const CRAYONS = ["#c0453a", "#d89b2b", "#3f7fb0", "#4f8f4a", "#7a4a8f", "#8a5a30"];

/** A child's crayon drawing: wobbly thick strokes in a few colours. */
export function drawing(scene: Scene, name: string, seed: number, kind: DrawingKind): DynamicTexture {
  return make(scene, name, 256, seed, (c, s, r: Rand) => {
    c.fillStyle = "#e3dcc6";
    c.fillRect(0, 0, s, s);
    c.lineCap = "round";
    c.lineJoin = "round";
    const stroke = (col: string, pts: [number, number][], w = 5) => {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      pts.forEach(([x, y], i) => {
        const px = x + (r() - 0.5) * 3;
        const py = y + (r() - 0.5) * 3;
        if (i) c.lineTo(px, py);
        else c.moveTo(px, py);
      });
      c.stroke();
    };
    const dot = (col: string, x: number, y: number, rad: number) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, rad, 0, Math.PI * 2);
      c.fill();
    };
    const stick = (col: string, x: number, y: number, h: number) => {
      stroke(col, [[x, y], [x, y + h]], 4);
      stroke(col, [[x - h * 0.3, y + h * 0.3], [x + h * 0.3, y + h * 0.3]], 4);
      stroke(col, [[x, y + h], [x - h * 0.25, y + h * 1.5]], 4);
      stroke(col, [[x, y + h], [x + h * 0.25, y + h * 1.5]], 4);
      dot(col, x, y - 10, 10);
    };
    if (kind === "house") {
      dot("#e8c34a", 215, 40, 20);
      stroke(CRAYONS[5], [[70, 150], [70, 215], [160, 215], [160, 150], [70, 150]]);
      stroke(CRAYONS[0], [[60, 152], [115, 100], [170, 152]]);
      stroke(CRAYONS[2], [[100, 215], [100, 180], [125, 180], [125, 215]], 4);
      stick(CRAYONS[3], 190, 170, 28);
      stick(CRAYONS[4], 28, 170, 30);
      stroke(CRAYONS[3], [[0, 222], [256, 222]], 6);
    } else if (kind === "horse") {
      stroke(CRAYONS[5], [[60, 120], [60, 190]], 6);
      stroke(CRAYONS[5], [[60, 120], [150, 110], [170, 80], [190, 90], [175, 120], [170, 190]], 6);
      stroke(CRAYONS[5], [[110, 118], [110, 190]], 6);
      dot("#222", 180, 88, 3);
      stroke(CRAYONS[3], [[0, 200], [256, 200]], 6);
    } else if (kind === "rainbow") {
      for (let i = 0; i < 5; i++) {
        c.strokeStyle = CRAYONS[i];
        c.lineWidth = 9;
        c.beginPath();
        c.arc(128, 190, 100 - i * 13, Math.PI, 2 * Math.PI);
        c.stroke();
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 38;
        stroke(CRAYONS[3], [[x, 220], [x, 150 + r() * 20]], 4);
        dot(CRAYONS[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 4], x, 140 + r() * 20, 14);
      }
    }
    speckle(c, s, r, 500, 0.06);
  });
}
