import type { Scene } from "@babylonjs/core/scene";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

/**
 * Builds a tangent-space normal map from the brightness of an existing procedural texture, so seams, grain, stripes
 * and tiles in the bump always line up with the colour. Runs once at load. `outSize` can be smaller than the source
 * to save memory (bump detail does not need the full resolution).
 */
export function normalMapFrom(scene: Scene, source: BaseTexture, name: string, strength: number, outSize = 256): DynamicTexture {
  const src = (source as unknown as { getContext(): CanvasRenderingContext2D }).getContext().canvas;
  const sw = src.width;
  // Downsample to outSize, then work in luminance.
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = outSize;
  const tctx = tmp.getContext("2d")!;
  tctx.drawImage(src, 0, 0, outSize, outSize);
  const img = tctx.getImageData(0, 0, outSize, outSize).data;
  const hgt = new Float32Array(outSize * outSize);
  for (let i = 0; i < hgt.length; i++) hgt[i] = (img[i * 4] * 0.3 + img[i * 4 + 1] * 0.59 + img[i * 4 + 2] * 0.11) / 255;

  const tex = new DynamicTexture(name, { width: outSize, height: outSize }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const out = ctx.createImageData(outSize, outSize);
  const at = (x: number, y: number) => hgt[((y + outSize) % outSize) * outSize + ((x + outSize) % outSize)];
  for (let y = 0; y < outSize; y++) {
    for (let x = 0; x < outSize; x++) {
      const dx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const dy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      let nx = -dx * strength;
      let ny = -dy * strength;
      const inv = 1 / Math.hypot(nx, ny, 1);
      nx *= inv;
      ny *= inv;
      const o = (y * outSize + x) * 4;
      out.data[o] = (nx * 0.5 + 0.5) * 255;
      out.data[o + 1] = (ny * 0.5 + 0.5) * 255;
      out.data[o + 2] = (inv * 0.5 + 0.5) * 255;
      out.data[o + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  tex.update(false);
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 2;
  void sw;
  return tex;
}
