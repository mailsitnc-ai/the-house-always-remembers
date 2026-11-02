import type { Scene } from "@babylonjs/core/scene";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Engine } from "@babylonjs/core/Engines/engine";

function alphaTex(scene: Scene, name: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): DynamicTexture {
  const t = new DynamicTexture(name, { width: w, height: h }, scene, true);
  t.hasAlpha = true;
  const c = t.getContext() as unknown as CanvasRenderingContext2D;
  c.clearRect(0, 0, w, h);
  draw(c, w, h);
  t.update();
  t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE;
  return t;
}

function decalMaterial(scene: Scene, name: string, tex: DynamicTexture, additive = false): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseTexture = tex;
  m.useAlphaFromDiffuseTexture = true;
  m.disableLighting = true;
  m.emissiveTexture = additive ? tex : null;
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.backFaceCulling = false;
  m.disableDepthWrite = true;
  m.zOffset = -2;
  if (additive) {
    m.alphaMode = Engine.ALPHA_ADD;
    m.emissiveColor = Color3.White();
    m.diffuseColor = Color3.White();
  }
  return m;
}

/** Soft dark contact shadow under furniture (a cheap stand-in for ambient occlusion). */
export function aoBlobMaterial(scene: Scene): StandardMaterial {
  const t = alphaTex(scene, "tex-ao-blob", 128, 128, (c) => {
    c.fillStyle = "#000";
    c.shadowColor = "#000";
    c.shadowBlur = 40;
    c.fillRect(40, 40, 48, 48);
  });
  const m = decalMaterial(scene, "m-ao-blob", t);
  m.alpha = 0.55;
  return m;
}

/** Vertical gradient for the darkening where walls meet the ceiling (top) or floor (bottom). */
export function aoStripMaterial(scene: Scene, name: string, top: boolean): StandardMaterial {
  const t = alphaTex(scene, `tex-${name}`, 8, 64, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)");
    g.addColorStop(1, top ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.5)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  return decalMaterial(scene, name, t);
}

/** Cool moonlight falling through a window, with the shadow of the glazing bars. */
export function moonPatchMaterial(scene: Scene): StandardMaterial {
  const t = alphaTex(scene, "tex-moon", 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, "rgba(120,150,200,0.55)");
    g.addColorStop(1, "rgba(120,150,200,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = "rgba(0,0,0,0.85)";
    c.fillRect(w / 2 - 3, 0, 6, h);
    c.fillRect(0, h / 2 - 3, w, 6);
  });
  const m = decalMaterial(scene, "m-moon", t, true);
  m.alpha = 0.55;
  return m;
}

/** Radial halo drawn around a lit bulb. Additive, so it reads as bloom without a post-process. */
export function glowMaterial(scene: Scene): StandardMaterial {
  const t = alphaTex(scene, "tex-glow", 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(255,214,150,0.85)");
    g.addColorStop(0.25, "rgba(255,170,90,0.32)");
    g.addColorStop(1, "rgba(255,140,60,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const m = decalMaterial(scene, "m-glow", t, true);
  m.alpha = 0.9;
  return m;
}

/** Worn patches on floors and wall bases. */
export function scuffMaterial(scene: Scene): StandardMaterial {
  const t = alphaTex(scene, "tex-scuff", 128, 128, (c, w, h) => {
    for (let i = 0; i < 26; i++) {
      c.strokeStyle = `rgba(30,18,8,${0.05 + Math.random() * 0.1})`;
      c.lineWidth = 2 + Math.random() * 4;
      c.beginPath();
      const x = Math.random() * w;
      const y = Math.random() * h;
      c.moveTo(x, y);
      c.lineTo(x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50);
      c.stroke();
    }
    c.globalCompositeOperation = "destination-in";
    const g = c.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const m = decalMaterial(scene, "m-scuff", t);
  m.alpha = 0.8;
  return m;
}

/** A diagonal sheen across window glass, so the panes read as glass rather than flat black. */
export function glassSheenTexture(scene: Scene): DynamicTexture {
  return alphaTex(scene, "tex-glass-sheen", 128, 128, (c, w, h) => {
    c.fillStyle = "rgb(9,13,20)";
    c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.3, "rgba(120,140,170,0)");
    g.addColorStop(0.42, "rgba(120,140,170,0.5)");
    g.addColorStop(0.5, "rgba(120,140,170,0)");
    g.addColorStop(0.6, "rgba(120,140,170,0.25)");
    g.addColorStop(0.68, "rgba(120,140,170,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}
