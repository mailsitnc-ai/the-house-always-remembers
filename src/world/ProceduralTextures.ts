import type { Scene } from "@babylonjs/core/scene";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

export type Rand = () => number;
export type Ctx = CanvasRenderingContext2D;

/** Deterministic PRNG so textures look the same every run. */
export function mulberry32(seed: number): Rand {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function make(scene: Scene, name: string, size: number, seed: number, draw: (c: Ctx, s: number, r: Rand) => void): DynamicTexture {
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, true);
  draw(tex.getContext() as unknown as Ctx, size, mulberry32(seed));
  tex.update();
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 4;
  return tex;
}

export function speckle(c: Ctx, s: number, r: Rand, count: number, alpha: number): void {
  for (let i = 0; i < count; i++) {
    c.fillStyle = r() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,240,210,${alpha * 0.7})`;
    c.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
  }
}

export function stains(c: Ctx, s: number, r: Rand, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = r() * s;
    const y = r() * s;
    const rad = 40 + r() * 90;
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, "rgba(60,40,20,0.10)");
    g.addColorStop(1, "rgba(60,40,20,0)");
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

export interface PaperStyle {
  base: string;
  stripe: string;
  stripeAlpha: number;
  motif: string;
}

export function wallpaper(scene: Scene, name: string, seed: number, st: PaperStyle): DynamicTexture {
  return make(scene, name, 512, seed, (c, s, r) => {
    c.fillStyle = st.base;
    c.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 64) {
      c.globalAlpha = st.stripeAlpha;
      c.fillStyle = st.stripe;
      c.fillRect(x + 10, 0, 22, s);
      c.globalAlpha = 0.5;
      c.fillRect(x + 6, 0, 2, s);
      c.fillRect(x + 34, 0, 2, s);
      c.globalAlpha = 0.45;
      c.fillStyle = st.motif;
      for (let y = 16; y < s; y += 64) {
        c.beginPath();
        c.moveTo(x + 53, y - 9);
        c.lineTo(x + 61, y);
        c.lineTo(x + 53, y + 9);
        c.lineTo(x + 45, y);
        c.closePath();
        c.fill();
      }
    }
    c.globalAlpha = 1;
    stains(c, s, r, 7);
    speckle(c, s, r, 3500, 0.05);
  });
}

export function woodFloor(scene: Scene): DynamicTexture {
  return make(scene, "tex-floor", 512, 11, (c, s, r) => {
    const planks = 8;
    const h = s / planks;
    for (let i = 0; i < planks; i++) {
      const light = 28 + r() * 10;
      c.fillStyle = `hsl(${24 + r() * 6}, 38%, ${light}%)`;
      c.fillRect(0, i * h, s, h);
      for (let g = 0; g < 14; g++) {
        c.strokeStyle = `rgba(20,10,4,${0.06 + r() * 0.1})`;
        c.lineWidth = 1;
        c.beginPath();
        const y = i * h + r() * h;
        c.moveTo(0, y);
        c.bezierCurveTo(s * 0.3, y + (r() - 0.5) * 5, s * 0.6, y + (r() - 0.5) * 5, s, y + (r() - 0.5) * 3);
        c.stroke();
      }
      c.fillStyle = "rgba(10,5,2,0.75)";
      c.fillRect(0, i * h, s, 2);
      const joint = r() * s;
      c.fillRect(joint, i * h, 2, h);
    }
    stains(c, s, r, 5);
    speckle(c, s, r, 2000, 0.06);
  });
}

export function ceilingPlaster(scene: Scene): DynamicTexture {
  return make(scene, "tex-ceiling", 256, 21, (c, s, r) => {
    c.fillStyle = "#a89c82";
    c.fillRect(0, 0, s, s);
    stains(c, s, r, 6);
    speckle(c, s, r, 1500, 0.05);
  });
}

export function fabric(scene: Scene, name: string, seed: number, color: string): DynamicTexture {
  return make(scene, name, 256, seed, (c, s, r) => {
    c.fillStyle = color;
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 3) {
      c.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.06})`;
      c.fillRect(i, 0, 1, s);
      c.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`;
      c.fillRect(0, i, s, 1);
    }
    speckle(c, s, r, 1200, 0.07);
  });
}

export function furnitureWood(scene: Scene): DynamicTexture {
  return make(scene, "tex-furniture", 256, 31, (c, s, r) => {
    c.fillStyle = "#4a3120";
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      c.strokeStyle = `rgba(15,8,3,${0.08 + r() * 0.14})`;
      c.beginPath();
      const x = r() * s;
      c.moveTo(x, 0);
      c.bezierCurveTo(x + (r() - 0.5) * 14, s * 0.33, x + (r() - 0.5) * 14, s * 0.66, x + (r() - 0.5) * 10, s);
      c.stroke();
    }
    speckle(c, s, r, 800, 0.06);
  });
}

export function rugTexture(scene: Scene): DynamicTexture {
  return make(scene, "tex-rug", 256, 41, (c, s, r) => {
    c.fillStyle = "#4e2f26";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "#8b7a52";
    c.lineWidth = 6;
    c.strokeRect(14, 14, s - 28, s - 28);
    c.strokeStyle = "#2f3d2b";
    c.lineWidth = 10;
    c.strokeRect(34, 34, s - 68, s - 68);
    speckle(c, s, r, 2500, 0.1);
  });
}

export function framePicture(scene: Scene, seed: number): DynamicTexture {
  return make(scene, `tex-picture-${seed}`, 128, seed, (c, s, r) => {
    const g = c.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "#8c7a58");
    g.addColorStop(1, "#4b3d2a");
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
    c.fillStyle = "rgba(30,22,12,0.7)";
    c.beginPath();
    c.ellipse(s / 2, s * 0.45, s * 0.2, s * 0.28, 0, 0, Math.PI * 2);
    c.fill();
    c.fillRect(s * 0.28, s * 0.7, s * 0.44, s * 0.3);
    speckle(c, s, r, 400, 0.12);
  });
}

export function indexCard(scene: Scene, code: string): DynamicTexture {
  return make(scene, "tex-card", 512, 51, (c, s, r) => {
    c.fillStyle = "#d9cfae";
    c.fillRect(0, 0, s, s);
    c.strokeStyle = "rgba(90,120,150,0.35)";
    c.lineWidth = 2;
    for (let y = 120; y < s; y += 56) {
      c.beginPath();
      c.moveTo(20, y);
      c.lineTo(s - 20, y);
      c.stroke();
    }
    c.strokeStyle = "rgba(160,60,50,0.5)";
    c.beginPath();
    c.moveTo(20, 86);
    c.lineTo(s - 20, 86);
    c.stroke();
    stains(c, s, r, 3);
    c.fillStyle = "#2a2118";
    c.font = "italic 42px Georgia, serif";
    c.fillText("Study door", 40, 68);
    c.font = "italic 120px Georgia, serif";
    c.fillText(code.split("").join("  "), 70, 290);
    c.font = "italic 34px Georgia, serif";
    c.fillText("Keep this somewhere safe.", 40, 420);
    speckle(c, s, r, 1500, 0.06);
  });
}
