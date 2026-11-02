/**
 * Paints believable aged family photographs onto a canvas. It is plain canvas code (no Babylon), so the same painter feeds
 * the wall frames, the inspection view, the journal thumbnails and the opening cinematic.
 *
 * The family is defined once (CAST) and every photograph draws the same four people with the same faces, hair and build,
 * so they read as the same family across prints. Compositions are chosen per photograph; the print is then aged: warm
 * cast, faded blacks, soft focus, film grain, vignette, a white deckle border, a crease, dust and scratches.
 */

export type PhotoKind = "family" | "family-five" | "siblings" | "house" | "landscape" | "school";

type Hair = "short" | "side" | "bob" | "pigtails" | "messy";
type Mood = "smile" | "grin" | "soft";

interface Person {
  id: "dad" | "mum" | "daniel" | "emily";
  skin: string;
  shade: string;
  hair: string;
  style: Hair;
  /** Height as a fraction of the tallest adult. */
  scale: number;
  top: string;
  bottom: string;
  dress?: boolean;
  tie?: string;
}

/** The family, fixed. Only age (scale) and clothes change between photographs. */
const CAST = {
  dad: { id: "dad", skin: "#d8a98b", shade: "#a87458", hair: "#4a3526", style: "side", scale: 1, top: "#3b5a73", bottom: "#3a3a3f" } as Person,
  mum: { id: "mum", skin: "#e3b8a1", shade: "#b98068", hair: "#6c4a33", style: "bob", scale: 0.92, top: "#4f6b4a", bottom: "#55463a" } as Person,
  daniel: { id: "daniel", skin: "#dcab8d", shade: "#aa765b", hair: "#2f241c", style: "messy", scale: 0.76, top: "#8a3a33", bottom: "#33384a" } as Person,
  emily: { id: "emily", skin: "#e7bba4", shade: "#b9826a", hair: "#80603d", style: "pigtails", scale: 0.55, top: "#d8c4a0", bottom: "#d8c4a0", dress: true } as Person,
};

function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = CanvasRenderingContext2D;

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient): void {
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

function limb(c: Ctx, pts: [number, number][], w: number, color: string): void {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}

interface Pose {
  /** Where the hands go, relative to the shoulder line, as fractions of body height (+x is the person's right in the picture). */
  armL?: [number, number];
  armR?: [number, number];
  mood: Mood;
  /** Head tilt in radians. */
  tilt?: number;
  look?: number;
}

/** Draws one person standing with their feet at (x, feet). `h` is full height in pixels. */
function person(c: Ctx, p: Person, x: number, feet: number, h: number, pose: Pose, light = 1): void {
  const headH = h * (p.scale < 0.7 ? 0.2 : 0.15);
  const headW = headH * 0.78;
  const legH = h * 0.46;
  const torsoH = h * 0.32;
  const hipY = feet - legH;
  const shoulderY = hipY - torsoH;
  const shoulderW = h * (p.id === "dad" ? 0.2 : p.scale < 0.7 ? 0.14 : 0.17);
  const neckY = shoulderY - h * 0.02;
  const headY = neckY - headH * 0.55;

  // Ground shadow.
  const sh = c.createRadialGradient(x + h * 0.08, feet, 1, x + h * 0.08, feet, h * 0.28);
  sh.addColorStop(0, "rgba(20,14,8,0.38)");
  sh.addColorStop(1, "rgba(20,14,8,0)");
  c.fillStyle = sh;
  c.fillRect(x - h * 0.3, feet - h * 0.04, h * 0.7, h * 0.1);

  // Legs or skirt.
  if (p.dress) {
    c.fillStyle = p.bottom;
    c.beginPath();
    c.moveTo(x - shoulderW * 0.8, shoulderY + torsoH * 0.5);
    c.lineTo(x + shoulderW * 0.8, shoulderY + torsoH * 0.5);
    c.lineTo(x + shoulderW * 1.3, hipY + legH * 0.38);
    c.lineTo(x - shoulderW * 1.3, hipY + legH * 0.38);
    c.closePath();
    c.fill();
    limb(c, [[x - shoulderW * 0.35, hipY + legH * 0.38], [x - shoulderW * 0.35, feet - 4]], h * 0.05, "#d9b49c");
    limb(c, [[x + shoulderW * 0.35, hipY + legH * 0.38], [x + shoulderW * 0.35, feet - 4]], h * 0.05, "#d9b49c");
  } else {
    limb(c, [[x - shoulderW * 0.4, hipY], [x - shoulderW * 0.45, feet - 6]], h * 0.085, p.bottom);
    limb(c, [[x + shoulderW * 0.4, hipY], [x + shoulderW * 0.45, feet - 6]], h * 0.085, p.bottom);
  }
  // Shoes.
  c.fillStyle = "#26201c";
  c.beginPath();
  c.ellipse(x - shoulderW * 0.5, feet - 3, h * 0.055, h * 0.022, 0, 0, Math.PI * 2);
  c.ellipse(x + shoulderW * 0.5, feet - 3, h * 0.055, h * 0.022, 0, 0, Math.PI * 2);
  c.fill();

  // Torso with simple shading.
  const tg = c.createLinearGradient(x - shoulderW, 0, x + shoulderW, 0);
  tg.addColorStop(0, shade(p.top, 1.12 * light));
  tg.addColorStop(1, shade(p.top, 0.72));
  c.fillStyle = tg;
  c.beginPath();
  c.moveTo(x - shoulderW, shoulderY);
  c.quadraticCurveTo(x, shoulderY - h * 0.03, x + shoulderW, shoulderY);
  c.lineTo(x + shoulderW * 0.85, shoulderY + torsoH);
  c.lineTo(x - shoulderW * 0.85, shoulderY + torsoH);
  c.closePath();
  c.fill();
  // Folds in the cloth.
  c.strokeStyle = "rgba(0,0,0,0.16)";
  c.lineWidth = Math.max(1, h * 0.012);
  for (let i = 1; i < 4; i++) {
    c.beginPath();
    c.moveTo(x - shoulderW * 0.7 + i * shoulderW * 0.35, shoulderY + torsoH * 0.12);
    c.quadraticCurveTo(x - shoulderW * 0.6 + i * shoulderW * 0.3, shoulderY + torsoH * 0.55, x - shoulderW * 0.55 + i * shoulderW * 0.32, shoulderY + torsoH * 0.95);
    c.stroke();
  }
  if (p.tie) {
    c.fillStyle = p.tie;
    c.beginPath();
    c.moveTo(x - 2, shoulderY + 2);
    c.lineTo(x + 5, shoulderY + 4);
    c.lineTo(x + 7, shoulderY + torsoH * 0.7);
    c.lineTo(x + 1, shoulderY + torsoH * 0.75);
    c.closePath();
    c.fill();
  }

  // Arms: from each shoulder to the hand position.
  const armW = h * 0.05;
  const hand = (side: -1 | 1, target?: [number, number]) => {
    const sx = x + side * shoulderW * 0.95;
    const sy = shoulderY + h * 0.02;
    const ex = target ? x + target[0] * h : sx + side * h * 0.025;
    const ey = target ? shoulderY + target[1] * h : hipY + h * 0.02;
    const mx = (sx + ex) / 2 + side * h * 0.03;
    const my = (sy + ey) / 2;
    limb(c, [[sx, sy], [mx, my], [ex, ey]], armW, shade(p.top, 0.88));
    ellipse(c, ex, ey, armW * 0.62, armW * 0.7, p.skin);
  };
  hand(-1, pose.armL);
  hand(1, pose.armR);

  // Neck, head, ears.
  c.fillStyle = p.shade;
  c.fillRect(x - headW * 0.2, neckY - headH * 0.1, headW * 0.4, headH * 0.35);
  c.save();
  c.translate(x, headY);
  c.rotate(pose.tilt ?? 0);
  ellipse(c, -headW * 0.5, headH * 0.05, headW * 0.09, headH * 0.14, p.shade);
  ellipse(c, headW * 0.5, headH * 0.05, headW * 0.09, headH * 0.14, p.shade);
  const hg = c.createRadialGradient(-headW * 0.2, -headH * 0.15, 1, 0, 0, headH * 0.65);
  hg.addColorStop(0, shade(p.skin, 1.1 * light));
  hg.addColorStop(1, p.shade);
  ellipse(c, 0, 0, headW * 0.5, headH * 0.55, hg);
  hairBack(c, p, headW, headH);
  face(c, p, headW, headH, pose);
  hairFront(c, p, headW, headH);
  c.restore();
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `rgb(${r},${g},${b})`;
}

function hairBack(c: Ctx, p: Person, w: number, h: number): void {
  c.fillStyle = p.hair;
  if (p.style === "bob") {
    c.beginPath();
    c.ellipse(0, -h * 0.02, w * 0.62, h * 0.62, 0, Math.PI, 0, false);
    c.lineTo(w * 0.6, h * 0.42);
    c.quadraticCurveTo(0, h * 0.55, -w * 0.6, h * 0.42);
    c.closePath();
    c.fill();
  } else if (p.style === "pigtails") {
    ellipse(c, -w * 0.72, h * 0.18, w * 0.17, h * 0.28, p.hair);
    ellipse(c, w * 0.72, h * 0.18, w * 0.17, h * 0.28, p.hair);
    c.fillStyle = "#b03a34";
    c.fillRect(-w * 0.62, -h * 0.04, w * 0.14, h * 0.1);
    c.fillRect(w * 0.48, -h * 0.04, w * 0.14, h * 0.1);
  }
}

function hairFront(c: Ctx, p: Person, w: number, h: number): void {
  c.fillStyle = p.hair;
  c.beginPath();
  if (p.style === "short" || p.style === "side") {
    c.ellipse(0, -h * 0.12, w * 0.54, h * 0.42, 0, Math.PI, 0);
    c.lineTo(w * 0.5, -h * 0.12);
    c.quadraticCurveTo(w * 0.1, -h * 0.34, -w * 0.5, -h * 0.1);
    c.closePath();
  } else if (p.style === "messy") {
    c.ellipse(0, -h * 0.14, w * 0.56, h * 0.44, 0, Math.PI, 0);
    c.lineTo(w * 0.52, -h * 0.1);
    for (let i = 0; i < 6; i++) c.lineTo(w * (0.5 - i * 0.2), -h * (0.14 + (i % 2) * 0.1));
    c.closePath();
  } else if (p.style === "bob") {
    c.ellipse(0, -h * 0.1, w * 0.56, h * 0.44, 0, Math.PI, 0);
    c.lineTo(w * 0.5, -h * 0.06);
    c.quadraticCurveTo(0, -h * 0.26, -w * 0.5, -h * 0.06);
    c.closePath();
  } else {
    c.ellipse(0, -h * 0.1, w * 0.54, h * 0.42, 0, Math.PI, 0);
    c.lineTo(w * 0.5, -h * 0.04);
    c.quadraticCurveTo(0, -h * 0.22, -w * 0.5, -h * 0.04);
    c.closePath();
  }
  c.fill();
}

function face(c: Ctx, p: Person, w: number, h: number, pose: Pose): void {
  const look = (pose.look ?? 0) * w * 0.04;
  // Brows.
  c.strokeStyle = shade(p.hair, 0.9);
  c.lineWidth = Math.max(1, h * 0.03);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(-w * 0.3, -h * 0.07);
  c.lineTo(-w * 0.1, -h * 0.09);
  c.moveTo(w * 0.1, -h * 0.09);
  c.lineTo(w * 0.3, -h * 0.07);
  c.stroke();
  // Eyes: white, iris, highlight.
  for (const s of [-1, 1]) {
    ellipse(c, s * w * 0.2, -h * 0.01, w * 0.11, h * 0.055, "rgba(245,238,228,0.95)");
    ellipse(c, s * w * 0.2 + look, -h * 0.01, w * 0.055, h * 0.05, "#2c241e");
    ellipse(c, s * w * 0.2 + look - w * 0.02, -h * 0.025, w * 0.02, h * 0.02, "rgba(255,255,255,0.8)");
  }
  // Nose shadow and cheeks.
  c.fillStyle = "rgba(120,70,50,0.28)";
  c.beginPath();
  c.moveTo(0, -h * 0.03);
  c.lineTo(w * 0.07, h * 0.12);
  c.lineTo(-w * 0.04, h * 0.13);
  c.closePath();
  c.fill();
  ellipse(c, -w * 0.3, h * 0.12, w * 0.12, h * 0.07, "rgba(200,100,90,0.22)");
  ellipse(c, w * 0.3, h * 0.12, w * 0.12, h * 0.07, "rgba(200,100,90,0.22)");
  // Mouth.
  c.strokeStyle = "#8a4538";
  c.lineWidth = Math.max(1, h * 0.028);
  c.beginPath();
  if (pose.mood === "grin") {
    c.fillStyle = "#f4ece0";
    c.moveTo(-w * 0.22, h * 0.24);
    c.quadraticCurveTo(0, h * 0.42, w * 0.22, h * 0.24);
    c.quadraticCurveTo(0, h * 0.27, -w * 0.22, h * 0.24);
    c.fill();
    c.stroke();
  } else if (pose.mood === "smile") {
    c.moveTo(-w * 0.2, h * 0.25);
    c.quadraticCurveTo(0, h * 0.36, w * 0.2, h * 0.25);
    c.stroke();
  } else {
    c.moveTo(-w * 0.14, h * 0.27);
    c.quadraticCurveTo(0, h * 0.31, w * 0.14, h * 0.27);
    c.stroke();
  }
}

// ---- backgrounds --------------------------------------------------------------------------------

function frontOfHouse(c: Ctx, w: number, h: number, r: () => number): void {
  // Pebbledash wall, a green door with a brass knocker, a window, a stone step and a low hedge.
  const wall = c.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, "#b9ab90");
  wall.addColorStop(1, "#8f8168");
  c.fillStyle = wall;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    c.fillStyle = r() > 0.5 ? "rgba(70,60,45,0.22)" : "rgba(235,225,200,0.2)";
    c.fillRect(r() * w, r() * h * 0.82, 2, 2);
  }
  // Window to the left.
  c.fillStyle = "#e4dccb";
  c.fillRect(w * 0.04, h * 0.14, w * 0.22, h * 0.3);
  c.fillStyle = "#2a3238";
  c.fillRect(w * 0.06, h * 0.16, w * 0.18, h * 0.26);
  c.fillStyle = "rgba(180,200,215,0.25)";
  c.fillRect(w * 0.06, h * 0.16, w * 0.07, h * 0.26);
  c.fillStyle = "#e4dccb";
  c.fillRect(w * 0.145, h * 0.16, 3, h * 0.26);
  c.fillRect(w * 0.06, h * 0.285, w * 0.18, 3);
  // Door to the right, with a surround.
  c.fillStyle = "#d8d0bd";
  c.fillRect(w * 0.55, h * 0.06, w * 0.34, h * 0.7);
  const door = c.createLinearGradient(w * 0.57, 0, w * 0.87, 0);
  door.addColorStop(0, "#2f4a35");
  door.addColorStop(1, "#243a2a");
  c.fillStyle = door;
  c.fillRect(w * 0.575, h * 0.09, w * 0.29, h * 0.67);
  c.strokeStyle = "rgba(0,0,0,0.35)";
  c.lineWidth = 3;
  for (const [x, y, ww, hh] of [[0.6, 0.12, 0.1, 0.2], [0.74, 0.12, 0.1, 0.2], [0.6, 0.38, 0.1, 0.3], [0.74, 0.38, 0.1, 0.3]]) c.strokeRect(w * x, h * y, w * ww, h * hh);
  ellipse(c, w * 0.72, h * 0.36, 5, 6, "#b08d3c");
  // Step and path.
  const step = c.createLinearGradient(0, h * 0.74, 0, h);
  step.addColorStop(0, "#b4ada0");
  step.addColorStop(1, "#7d776b");
  c.fillStyle = step;
  c.fillRect(0, h * 0.76, w, h * 0.24);
  c.fillStyle = "rgba(0,0,0,0.18)";
  c.fillRect(0, h * 0.76, w, 4);
  // Hedge at the left edge.
  c.fillStyle = "#3d5238";
  c.beginPath();
  c.ellipse(w * 0.04, h * 0.7, w * 0.16, h * 0.14, 0, 0, Math.PI * 2);
  c.fill();
}

function sky(c: Ctx, w: number, h: number, top: string, bottom: string): void {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

/** Softens whatever is painted so far: the background goes slightly out of focus, as in a real portrait. */
function blurBackground(c: Ctx, w: number, h: number, px: number): void {
  const t = document.createElement("canvas");
  t.width = w;
  t.height = h;
  const tc = t.getContext("2d")!;
  tc.filter = `blur(${px}px)`;
  tc.drawImage(c.canvas, 0, 0);
  c.clearRect(0, 0, w, h);
  c.drawImage(t, 0, 0);
  // Soft daylight from the upper left across the whole scene.
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(255,240,205,0.22)");
  g.addColorStop(1, "rgba(20,15,10,0.18)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
}

// ---- compositions -------------------------------------------------------------------------------

function composeFamily(c: Ctx, w: number, h: number, r: () => number, five: boolean): void {
  frontOfHouse(c, w, h, r);
  blurBackground(c, w, h, 4);
  const feet = h * 0.93;
  const adult = h * 0.78;
  if (five) {
    // The fifth figure: taller than anyone, in a long dark dress, standing in the shadow of the doorway behind the
    // family. The head is turned a little away and the face is lost in shadow. It is present, but it is not one of them.
    const fx = w * 0.52;
    const fh = adult * 1.2;
    c.save();
    c.filter = "blur(1.6px)";
    c.fillStyle = "rgba(10,8,6,0.94)";
    c.beginPath();
    c.moveTo(fx - fh * 0.11, feet - fh * 0.04);
    c.quadraticCurveTo(fx - fh * 0.2, feet - fh * 0.5, fx - fh * 0.1, feet - fh * 0.78);
    c.lineTo(fx + fh * 0.1, feet - fh * 0.78);
    c.quadraticCurveTo(fx + fh * 0.22, feet - fh * 0.5, fx + fh * 0.11, feet - fh * 0.04);
    c.closePath();
    c.fill();
    c.beginPath();
    c.ellipse(fx + fh * 0.012, feet - fh * 0.86, fh * 0.055, fh * 0.075, 0.12, 0, Math.PI * 2);
    c.fill();
    c.fillRect(fx - fh * 0.03, feet - fh * 0.8, fh * 0.06, fh * 0.06);
    c.restore();
  }
  // Back row: Dad and Mum. Front row: Daniel and Emily.
  person(c, CAST.dad, w * 0.3, feet - h * 0.03, adult, { armL: [-0.02, 0.45], armR: [0.14, 0.2], mood: "smile", tilt: 0.02 });
  person(c, CAST.mum, w * 0.72, feet - h * 0.03, adult * CAST.mum.scale, { armL: [-0.1, 0.2], armR: [0.02, 0.5], mood: "smile", tilt: -0.04 });
  person(c, { ...CAST.daniel, top: "#8a3a33" }, w * 0.42, feet + h * 0.02, adult * CAST.daniel.scale, { armL: [-0.02, 0.5], armR: [0.02, 0.5], mood: "grin", tilt: 0.05, look: 0.4 });
  person(c, CAST.emily, w * 0.6, feet + h * 0.03, adult * CAST.emily.scale, { armL: [-0.05, 0.5], armR: [0.02, 0.5], mood: "grin", tilt: -0.05 });
}

function composeSiblings(c: Ctx, w: number, h: number, r: () => number): void {
  frontOfHouse(c, w, h, r);
  blurBackground(c, w, h, 4);
  const feet = h * 0.95;
  const big = h * 0.9;
  person(c, { ...CAST.daniel, top: "#3f5a52", scale: 0.85 }, w * 0.38, feet, big * 0.85, { armL: [-0.02, 0.5], armR: [0.16, 0.46], mood: "soft", tilt: 0.03, look: 0.5 });
  person(c, { ...CAST.emily, top: "#c9b896", bottom: "#c9b896" }, w * 0.66, feet, big * 0.62, { armL: [-0.16, 0.2], armR: [0.02, 0.5], mood: "grin", tilt: -0.06 });
}

function composeSchool(c: Ctx, w: number, h: number, r: () => number): void {
  const wall = c.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, "#9fb0b8");
  wall.addColorStop(1, "#7b8c93");
  c.fillStyle = wall;
  c.fillRect(0, 0, w, h);
  const kids: Person[] = [];
  const skins = ["#e0b79c", "#cf9f82", "#ecc6ad", "#b98466", "#d8a98b"];
  const hairs = ["#2b2018", "#5a4129", "#8a6a43", "#1e1a17", "#6c4a33"];
  const styles: Hair[] = ["short", "bob", "messy", "pigtails", "side"];
  for (let i = 0; i < 17; i++) {
    const s = skins[Math.floor(r() * skins.length)];
    kids.push({ id: "daniel", skin: s, shade: shade(s, 0.78), hair: hairs[Math.floor(r() * hairs.length)], style: styles[Math.floor(r() * styles.length)], scale: 0.7, top: "#31404f", bottom: "#222a35", tie: i % 3 ? "#7a2f2c" : undefined });
  }
  // Three rows, back to front. Daniel is in the front row, grinning, with his tie crooked.
  let k = 0;
  for (const [row, count] of [[0, 6], [1, 6], [2, 5]] as const) {
    const y = h * (0.62 + row * 0.15);
    const hh = h * (0.5 + row * 0.12);
    for (let i = 0; i < count; i++) {
      const x = w * ((i + 0.5 + (row === 1 ? 0.15 : 0)) / (count + (row === 1 ? 0.3 : 0)));
      if (row === 2 && i === 1) {
        person(c, { ...CAST.daniel, scale: 0.7, top: "#31404f", bottom: "#222a35", tie: "#7a2f2c" }, x, y, hh, { armL: [-0.02, 0.5], armR: [0.02, 0.5], mood: "grin", tilt: 0.06, look: 0.3 }, 1.1);
      } else {
        person(c, kids[k++ % kids.length], x, y, hh, { mood: r() > 0.4 ? "smile" : "soft", tilt: (r() - 0.5) * 0.1, look: (r() - 0.5) });
      }
    }
  }
}

function composeHouse(c: Ctx, w: number, h: number, r: () => number): void {
  sky(c, w, h, "#b8c4c8", "#e3dcc8");
  // Road of brick, a hip roof, windows with warm light upstairs, a porch, a path, a fence.
  c.fillStyle = "#6f4c3d";
  c.fillRect(w * 0.14, h * 0.36, w * 0.72, h * 0.42);
  for (let y = h * 0.36; y < h * 0.78; y += 6) {
    c.fillStyle = "rgba(0,0,0,0.12)";
    c.fillRect(w * 0.14, y, w * 0.72, 1);
  }
  c.fillStyle = "#3d3a3a";
  c.beginPath();
  c.moveTo(w * 0.08, h * 0.38);
  c.lineTo(w * 0.5, h * 0.12);
  c.lineTo(w * 0.92, h * 0.38);
  c.closePath();
  c.fill();
  for (const [x, y, lit] of [[0.22, 0.44, false], [0.62, 0.44, true], [0.22, 0.62, false], [0.7, 0.62, false]] as const) {
    c.fillStyle = "#e4dccb";
    c.fillRect(w * x - 4, h * y - 4, w * 0.16 + 8, h * 0.12 + 8);
    c.fillStyle = lit ? "#e8c46a" : "#2a3238";
    c.fillRect(w * x, h * y, w * 0.16, h * 0.12);
  }
  c.fillStyle = "#e4dccb";
  c.fillRect(w * 0.44, h * 0.58, w * 0.12, h * 0.2);
  c.fillStyle = "#2f4a35";
  c.fillRect(w * 0.455, h * 0.6, w * 0.09, h * 0.18);
  const path = c.createLinearGradient(0, h * 0.78, 0, h);
  path.addColorStop(0, "#a89f8c");
  path.addColorStop(1, "#6d6757");
  c.fillStyle = path;
  c.beginPath();
  c.moveTo(w * 0.44, h * 0.78);
  c.lineTo(w * 0.56, h * 0.78);
  c.lineTo(w * 0.7, h);
  c.lineTo(w * 0.3, h);
  c.closePath();
  c.fill();
  c.fillStyle = "#4e6a45";
  c.fillRect(0, h * 0.78, w * 0.4, h * 0.22);
  c.fillRect(w * 0.6, h * 0.78, w * 0.4, h * 0.22);
  for (let i = 0; i < 800; i++) {
    c.fillStyle = r() > 0.5 ? "rgba(30,50,25,0.4)" : "rgba(130,160,100,0.3)";
    c.fillRect(r() * w, h * 0.78 + r() * h * 0.22, 2, 3);
  }
}

function composeLandscape(c: Ctx, w: number, h: number, r: () => number): void {
  sky(c, w, h, "#9fb2bd", "#e6dfca");
  c.fillStyle = "#7d8f7a";
  c.beginPath();
  c.moveTo(0, h * 0.62);
  for (let x = 0; x <= w; x += 12) c.lineTo(x, h * 0.55 + Math.sin(x * 0.02) * h * 0.06 + Math.sin(x * 0.07) * h * 0.02);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.fill();
  c.fillStyle = "#5c7452";
  c.beginPath();
  c.moveTo(0, h * 0.8);
  for (let x = 0; x <= w; x += 10) c.lineTo(x, h * 0.74 + Math.sin(x * 0.03 + 1) * h * 0.04);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.fill();
  // A single tree.
  c.fillStyle = "#3e2f22";
  c.fillRect(w * 0.7, h * 0.52, 7, h * 0.26);
  for (let i = 0; i < 40; i++) ellipse(c, w * 0.7 + (r() - 0.5) * 70, h * 0.46 + (r() - 0.5) * 50, 14 + r() * 10, 12 + r() * 8, r() > 0.5 ? "#3f5a38" : "#516c45");
}

// ---- ageing -------------------------------------------------------------------------------------

/** Makes a flat painted picture look like a printed photograph that has lived in a drawer for years. */
function age(c: Ctx, w: number, h: number, r: () => number): void {
  // Soft focus: blend a blurred copy over the sharp one.
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const t = tmp.getContext("2d")!;
  t.filter = "blur(1.8px)";
  t.drawImage(c.canvas, 0, 0);
  c.globalAlpha = 0.65;
  c.drawImage(tmp, 0, 0);
  c.globalAlpha = 1;
  // Old colour prints lose saturation first.
  c.globalCompositeOperation = "saturation";
  c.fillStyle = "rgba(128,128,128,0.42)";
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "source-over";
  // Colour: warm cast, lifted blacks, reduced contrast, a magenta-yellow fade like an old colour print.
  c.globalCompositeOperation = "multiply";
  c.fillStyle = "rgba(236,214,172,0.55)";
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "screen";
  c.fillStyle = "rgba(70,50,36,0.26)";
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = "source-over";
  c.fillStyle = "rgba(150,110,70,0.1)";
  c.fillRect(0, 0, w, h);
  // Light falling off to the corners.
  const v = c.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.78);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(35,22,10,0.5)");
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
  // Film grain.
  const img = c.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 30;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n * 0.9;
  }
  c.putImageData(img, 0, 0);
  // Dust and scratches.
  for (let i = 0; i < 40; i++) {
    c.fillStyle = r() > 0.5 ? "rgba(240,230,205,0.5)" : "rgba(30,20,10,0.35)";
    c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 3; i++) {
    c.strokeStyle = "rgba(235,225,200,0.3)";
    c.lineWidth = 1;
    c.beginPath();
    const x = r() * w;
    c.moveTo(x, 0);
    c.lineTo(x + (r() - 0.5) * 14, h);
    c.stroke();
  }
  // A crease across the print.
  c.strokeStyle = "rgba(240,232,210,0.38)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(w * 0.05, h * 0.62 + r() * 18);
  c.lineTo(w * 0.95, h * 0.58 + r() * 18);
  c.stroke();
  c.strokeStyle = "rgba(30,20,10,0.22)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(w * 0.05, h * 0.62 + 2);
  c.lineTo(w * 0.95, h * 0.58 + 2);
  c.stroke();
}

/** A cream print border with soft yellowing at the edges, drawn around the picture. */
function border(c: Ctx, w: number, h: number): void {
  const b = Math.round(Math.min(w, h) * 0.045);
  c.fillStyle = "#e6dcc3";
  c.fillRect(0, 0, w, b);
  c.fillRect(0, h - b * 1.7, w, b * 1.7);
  c.fillRect(0, 0, b, h);
  c.fillRect(w - b, 0, b, h);
  c.strokeStyle = "rgba(150,120,70,0.35)";
  c.lineWidth = 3;
  c.strokeRect(1.5, 1.5, w - 3, h - 3);
  // Wear on the corners.
  for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]] as const) {
    const g = c.createRadialGradient(x, y, 0, x, y, b * 2.4);
    g.addColorStop(0, "rgba(90,70,40,0.55)");
    g.addColorStop(1, "rgba(90,70,40,0)");
    c.fillStyle = g;
    c.fillRect(Math.min(x, w - b * 2.4), Math.min(y, h - b * 2.4), b * 2.4, b * 2.4);
  }
}

/** Paints the photograph for `kind` on a canvas of the given size. */
export function paintPhoto(canvas: HTMLCanvasElement, kind: PhotoKind, seed: number): void {
  const W = canvas.width;
  const H = canvas.height;
  const SS = 2;
  const big = document.createElement("canvas");
  big.width = W * SS;
  big.height = H * SS;
  const c = big.getContext("2d")!;
  const r = rng(seed * 7919 + kind.length);
  switch (kind) {
    case "family":
      composeFamily(c, big.width, big.height, r, false);
      break;
    case "family-five":
      composeFamily(c, big.width, big.height, r, true);
      break;
    case "siblings":
      composeSiblings(c, big.width, big.height, r);
      break;
    case "school":
      composeSchool(c, big.width, big.height, r);
      break;
    case "house":
      composeHouse(c, big.width, big.height, r);
      break;
    default:
      composeLandscape(c, big.width, big.height, r);
  }
  const out = canvas.getContext("2d")!;
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = "high";
  out.drawImage(big, 0, 0, W, H);
  age(out, W, H, rng(seed + 11));
  border(out, W, H);
}
