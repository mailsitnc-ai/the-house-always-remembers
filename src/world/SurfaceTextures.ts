import type { Scene } from "@babylonjs/core/scene";
import type { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { make, speckle, stains, type Ctx, type Rand } from "./ProceduralTextures";

/** Neutral plaster/paint grain. Tinted per room through the material's diffuseColor. */
export function plaster(scene: Scene): DynamicTexture {
  return make(scene, "tex-plaster", 256, 101, (c, s, r) => {
    c.fillStyle = "#ece7dc";
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      c.strokeStyle = `rgba(120,110,95,${0.03 + r() * 0.04})`;
      c.lineWidth = 6 + r() * 14;
      c.beginPath();
      const y = r() * s;
      c.moveTo(0, y);
      c.lineTo(s, y + (r() - 0.5) * 30);
      c.stroke();
    }
    stains(c, s, r, 6);
    speckle(c, s, r, 2200, 0.05);
  });
}

export interface PlankStyle {
  hue: number;
  sat: number;
  light: number;
  planks: number;
}

/** Wood plank flooring. Variants differ in tone and plank width so rooms do not share one floor. */
export function planks(scene: Scene, name: string, seed: number, st: PlankStyle): DynamicTexture {
  return make(scene, name, 512, seed, (c, s, r) => {
    const h = s / st.planks;
    for (let i = 0; i < st.planks; i++) {
      c.fillStyle = `hsl(${st.hue + r() * 6}, ${st.sat}%, ${st.light + r() * 9}%)`;
      c.fillRect(0, i * h, s, h);
      for (let g = 0; g < 16; g++) {
        c.strokeStyle = `rgba(20,10,4,${0.05 + r() * 0.1})`;
        c.beginPath();
        const y = i * h + r() * h;
        c.moveTo(0, y);
        c.bezierCurveTo(s * 0.3, y + (r() - 0.5) * 5, s * 0.6, y + (r() - 0.5) * 5, s, y + (r() - 0.5) * 3);
        c.stroke();
      }
      c.fillStyle = "rgba(10,5,2,0.7)";
      c.fillRect(0, i * h, s, 2);
      c.fillRect(r() * s, i * h, 2, h);
    }
    stains(c, s, r, 6);
    // Worn path down the middle of each plank row.
    c.fillStyle = "rgba(255,230,190,0.04)";
    c.fillRect(0, s * 0.35, s, s * 0.3);
    speckle(c, s, r, 2200, 0.06);
  });
}

export function linoleum(scene: Scene): DynamicTexture {
  return make(scene, "tex-linoleum", 512, 111, (c, s, r) => {
    const n = 8;
    const cell = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dark = (x + y) % 2 === 0;
        c.fillStyle = dark ? `hsl(95, 12%, ${38 + r() * 4}%)` : `hsl(45, 22%, ${70 + r() * 4}%)`;
        c.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    c.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i <= n; i++) {
      c.fillRect(i * cell - 1, 0, 2, s);
      c.fillRect(0, i * cell - 1, s, 2);
    }
    stains(c, s, r, 8);
    speckle(c, s, r, 2500, 0.07);
  });
}

export function tiles(scene: Scene, name: string, seed: number, base: number, sat: number, light: number, count: number): DynamicTexture {
  return make(scene, name, 512, seed, (c, s, r) => {
    const cell = s / count;
    c.fillStyle = "#8d8a7c";
    c.fillRect(0, 0, s, s);
    for (let y = 0; y < count; y++) {
      for (let x = 0; x < count; x++) {
        c.fillStyle = `hsl(${base + r() * 4}, ${sat}%, ${light + r() * 5}%)`;
        c.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      }
    }
    stains(c, s, r, 6);
    speckle(c, s, r, 1500, 0.05);
  });
}

export function carpet(scene: Scene, name: string, seed: number, color: string): DynamicTexture {
  return make(scene, name, 256, seed, (c, s, r) => {
    c.fillStyle = color;
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      c.fillStyle = r() > 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.05)";
      c.fillRect(r() * s, r() * s, 1, 2);
    }
    stains(c, s, r, 4);
  });
}

export function laminate(scene: Scene): DynamicTexture {
  return make(scene, "tex-laminate", 256, 121, (c, s, r) => {
    c.fillStyle = "#b9ad92";
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 1600; i++) {
      c.fillStyle = r() > 0.5 ? "rgba(90,70,50,0.18)" : "rgba(255,245,220,0.2)";
      c.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
    }
    stains(c, s, r, 3);
  });
}

export function curtainFabric(scene: Scene): DynamicTexture {
  return make(scene, "tex-curtain", 256, 131, (c, s, r) => {
    c.fillStyle = "#b3a583";
    c.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 16) {
      const g = c.createLinearGradient(x, 0, x + 16, 0);
      g.addColorStop(0, "rgba(0,0,0,0.22)");
      g.addColorStop(0.5, "rgba(255,255,255,0.1)");
      g.addColorStop(1, "rgba(0,0,0,0.22)");
      c.fillStyle = g;
      c.fillRect(x, 0, 16, s);
    }
    c.fillStyle = "rgba(60,80,50,0.35)";
    for (let i = 0; i < 40; i++) {
      c.beginPath();
      c.arc(r() * s, r() * s, 3 + r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    speckle(c, s, r, 900, 0.05);
  });
}

export function gingham(scene: Scene, name: string, seed: number, a: string, b: string): DynamicTexture {
  return make(scene, name, 256, seed, (c, s, r) => {
    c.fillStyle = a;
    c.fillRect(0, 0, s, s);
    const step = 32;
    c.fillStyle = b;
    c.globalAlpha = 0.5;
    for (let x = 0; x < s; x += step * 2) c.fillRect(x, 0, step, s);
    for (let y = 0; y < s; y += step * 2) c.fillRect(0, y, s, step);
    c.globalAlpha = 1;
    speckle(c, s, r, 1200, 0.07);
  });
}

export function stairRunner(scene: Scene): DynamicTexture {
  return make(scene, "tex-runner", 256, 141, (c, s, r) => {
    c.fillStyle = "#5a2e26";
    c.fillRect(0, 0, s, s);
    c.fillStyle = "#8b7b52";
    c.fillRect(0, 0, 14, s);
    c.fillRect(s - 14, 0, 14, s);
    c.fillStyle = "#2f3d2b";
    c.fillRect(24, 0, 8, s);
    c.fillRect(s - 32, 0, 8, s);
    for (let i = 0; i < 6000; i++) {
      c.fillStyle = r() > 0.5 ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)";
      c.fillRect(r() * s, r() * s, 1, 2);
    }
    stains(c, s, r, 3);
  });
}

/** Pale child's wallpaper: small stars and dots on a soft yellow-cream. */
export function kidsPaper(scene: Scene): DynamicTexture {
  return make(scene, "tex-kids-paper", 512, 151, (c, s, r) => {
    c.fillStyle = "#d9cd9d";
    c.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 64) {
      for (let x = 0; x < s; x += 64) {
        const ox = x + (y % 128 ? 32 : 0);
        c.fillStyle = "rgba(150,120,80,0.45)";
        star(c, ox + 20, y + 20, 8);
        c.fillStyle = "rgba(100,130,110,0.4)";
        c.beginPath();
        c.arc(ox + 4, y + 46, 3, 0, Math.PI * 2);
        c.fill();
      }
    }
    stains(c, s, r, 6);
    speckle(c, s, r, 3000, 0.05);
  });
}

function star(c: Ctx, cx: number, cy: number, rad: number): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? rad * 0.42 : rad;
    c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

/** Streaked wood grain for furniture; each variant has its own base colour. */
export function grain(scene: Scene, name: string, seed: number, base: string, streaks = 70): DynamicTexture {
  return make(scene, name, 256, seed, (c, s, r: Rand) => {
    c.fillStyle = base;
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < streaks; i++) {
      c.strokeStyle = `rgba(15,8,3,${0.07 + r() * 0.14})`;
      c.beginPath();
      const x = r() * s;
      c.moveTo(x, 0);
      c.bezierCurveTo(x + (r() - 0.5) * 14, s * 0.33, x + (r() - 0.5) * 14, s * 0.66, x + (r() - 0.5) * 10, s);
      c.stroke();
    }
    stains(c, s, r, 3);
    speckle(c, s, r, 800, 0.06);
  });
}

/** A six-panel interior door, 256 x 256 mapped over the leaf. Panel edges carry light and shadow so the bump reads as raised moulding. */
export function doorPanels(scene: Scene): DynamicTexture {
  return make(scene, "tex-door-panels", 256, 205, (c, s, r) => {
    c.fillStyle = "#4e3523";
    c.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      c.strokeStyle = `rgba(15,8,3,${0.07 + r() * 0.12})`;
      c.beginPath();
      const x = r() * s;
      c.moveTo(x, 0);
      c.lineTo(x + (r() - 0.5) * 8, s);
      c.stroke();
    }
    // 2 columns x 3 rows of recessed panels; the middle row is the tallest.
    const cols = [[26, 118], [138, 230]];
    const rows = [[24, 78], [92, 164], [178, 232]];
    for (const [x0, x1] of cols) {
      for (const [y0, y1] of rows) {
        c.fillStyle = "rgba(0,0,0,0.28)";
        c.fillRect(x0, y0, x1 - x0, y1 - y0);
        c.strokeStyle = "rgba(255,225,180,0.55)";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x0, y1);
        c.lineTo(x0, y0);
        c.lineTo(x1, y0);
        c.stroke();
        c.strokeStyle = "rgba(0,0,0,0.65)";
        c.beginPath();
        c.moveTo(x1, y0);
        c.lineTo(x1, y1);
        c.lineTo(x0, y1);
        c.stroke();
      }
    }
    stains(c, s, r, 4);
    speckle(c, s, r, 900, 0.07);
  });
}
