import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";

/**
 * A box with softened edges. Each face is a small grid whose points are pushed onto a rounded surface, which gives
 * smooth normals at the edges (soft upholstery, worn table edges) for about 100 triangles instead of 12.
 * `steps` is the number of grid steps across each rounded edge: 1 is a bevel, 2 is visibly round.
 */
export function roundedBoxData(w: number, h: number, d: number, radius: number, steps = 1): VertexData {
  const half = [w / 2, h / 2, d / 2];
  const r = Math.max(0.0005, Math.min(radius, Math.min(w, h, d) / 2 - 0.0005));
  const axisPoints = half.map((hs) => {
    const pts: number[] = [];
    for (let k = 0; k <= steps; k++) pts.push(-hs + (r * k) / steps);
    for (let k = 0; k <= steps; k++) pts.push(hs - r + (r * k) / steps);
    return pts;
  });

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  // Each face: which axis is the normal, its sign, and the two grid axes.
  const faces: [number, number, number, number][] = [
    [0, 1, 2, 1], [0, -1, 1, 2], // +x, -x
    [1, 1, 0, 2], [1, -1, 2, 0], // +y, -y
    [2, 1, 1, 0], [2, -1, 0, 1], // +z, -z
  ];
  for (const [na, sign, ua, va] of faces) {
    const base = positions.length / 3;
    const us = axisPoints[ua];
    const vs = axisPoints[va];
    for (let j = 0; j < vs.length; j++) {
      for (let i = 0; i < us.length; i++) {
        const p = [0, 0, 0];
        p[na] = sign * half[na];
        p[ua] = us[i];
        p[va] = vs[j];
        // Push the point onto the rounded surface.
        const inner = p.map((c, k) => Math.max(-half[k] + r, Math.min(half[k] - r, c)));
        const dir = p.map((c, k) => c - inner[k]);
        const len = Math.hypot(dir[0], dir[1], dir[2]);
        let n = [0, 0, 0];
        n[na] = sign;
        let pos = p;
        if (len > 1e-6) {
          n = dir.map((c) => c / len);
          pos = inner.map((c, k) => c + n[k] * r);
        }
        positions.push(pos[0], pos[1], pos[2]);
        normals.push(n[0], n[1], n[2]);
        uvs.push(i / (us.length - 1), j / (vs.length - 1));
      }
    }
    const row = us.length;
    // Winding chosen so triangles face along the face normal in Babylon's left-handed system.
    const flip = (na === 1 ? 1 : -1) * sign * (na === 0 ? -1 : 1) > 0;
    for (let j = 0; j < vs.length - 1; j++) {
      for (let i = 0; i < us.length - 1; i++) {
        const a = base + j * row + i;
        const b = a + 1;
        const c = a + row;
        const e = c + 1;
        if (flip) indices.push(a, b, c, b, e, c);
        else indices.push(a, c, b, b, c, e);
      }
    }
  }
  const vd = new VertexData();
  vd.positions = positions;
  vd.normals = normals;
  vd.uvs = uvs;
  vd.indices = indices;
  return vd;
}
