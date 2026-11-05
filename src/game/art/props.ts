/**
 * Room props in the bright top-down style of world.ts, drawn at 2× detail
 * (HD: each texture is twice the size of the old one and shown at scale 1,
 * so pixels are half as big on screen): round leafy trees and pines, blue-grey
 * rocks with flat bright tops, stumps and logs with bark and rings, mossy
 * pillars and a stone wall, crates, barrels, fences, pits, flowering bushes,
 * flowers and mushrooms. Every variant has a fixed seed, so it looks the same
 * every time. Sizes in comments are in texture pixels (= world px).
 */
import { Pixels } from './pixels';
import { C, blob, foliage, grain, ramp5, seeded, shade, shadowHD, softOutline, stroke } from './world';

const STONE5 = ['#e4e9ec', ...C.stone];
const WOOD5 = ['#e0aa70', ...C.wood];
const CUT = ['#f8e0b0', '#f0d098', '#e0b878', '#c89a5a', '#a87c44']; // fresh-cut wood (stump tops, log ends)
const IRON = ['#b8bcc4', '#8a8e98', '#5a5e68'];
const OUT_LEAF = '#1e3a1e', OUT_STONE = '#3a424c', OUT_WOOD = '#3e2614';

/** A vertical run of bark: light left edge, dark right edge, grooves. */
function bark(g: Pixels, x0: number, y0: number, w: number, h: number, rnd: () => number, R = WOOD5) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const t = (x - x0) / Math.max(1, w - 1);
    g.set(x, y, t < 0.18 ? R[1] : t < 0.55 ? R[2] : t < 0.85 ? R[3] : R[4]);
  }
  for (let i = 0; i < w * h / 14; i++) { const x = x0 + 1 + Math.floor(rnd() * (w - 2)), y = y0 + Math.floor(rnd() * h); g.vline(x, y, Math.min(y0 + h - 1, y + 2 + Math.floor(rnd() * 4)), R[4]); }
}

/** Rings on a cut end (an ellipse of fresh wood). */
function rings(g: Pixels, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = Math.sqrt(((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2); if (d > 1) continue;
    const ring = Math.floor(d * 4.5);
    g.set(x, y, d > 0.86 ? CUT[3] : ring % 2 ? CUT[2] : (x - cx + y - cy) < 0 ? CUT[0] : CUT[1]);
  }
  g.set(Math.round(cx), Math.round(cy), CUT[4]);
}

/** A round leafy tree, 72×92: a barked trunk with roots and a canopy of small leaf clusters. */
export function drawLeafyTree(variant: number): Pixels {
  const rnd = seeded(301 + variant * 17), g = new Pixels(72, 92), ramp = C.leaf[variant % 3];
  bark(g, 30, 54, 12, 32, rnd);
  for (const side of [-1, 1]) stroke(g, [[side < 0 ? 31 : 40, 82], [side < 0 ? 26 : 45, 86], [side < 0 ? 21 : 50, 88]], 4, WOOD5); // roots
  const light = { x: 34, y: 28, rx: 32, ry: 26 }; // lobes lit as one canopy, so the outline is lumpy but the light is round
  const lobes: [number, number, number, number][] = [[19, 34, 15, 13], [53, 33, 15, 13], [36, 17, 19, 14], [24, 20, 12, 10], [48, 19, 12, 10], [36, 40, 22, 13]];
  lobes.forEach(([x, y, rx, ry]) => foliage(g, x + (rnd() - 0.5) * 3, y + (rnd() - 0.5) * 3, rx, ry, ramp, rnd, 1, light));
  const R = ramp5(ramp);
  if (variant === 1) for (let i = 0; i < 9; i++) { const x = 10 + Math.floor(rnd() * 52), y = 12 + Math.floor(rnd() * 34); if (g.get(x, y) && g.get(x, y) !== R[4]) { g.rect(x, y, 2, 2, '#e0503e'); g.set(x, y, '#f8a090'); } } // apples
  if (variant === 2) for (let i = 0; i < 12; i++) { const x = 10 + Math.floor(rnd() * 52), y = 10 + Math.floor(rnd() * 36); if (g.get(x, y) === R[1] || g.get(x, y) === R[0]) { g.set(x, y, '#f4f0e8'); g.set(x + 1, y, '#f4f0e8'); g.set(x, y + 1, '#f2d24a'); } } // blossom
  return softOutline(g, OUT_LEAF);
}

/** A bright pine, 52×84: three tiers of needles with jagged hanging edges. */
export function drawPine(variant: number): Pixels {
  const rnd = seeded(331 + variant), g = new Pixels(52, 84), R = ramp5(C.leaf[[2, 0, 2][variant % 3]]);
  bark(g, 22, 64, 8, 18, rnd);
  const tier = (top: number, half: number, hgt: number) => {
    for (let r = 0; r < hgt; r++) {
      const w = half * (r + 1) / hgt, y = top + r;
      for (let x = Math.round(25.5 - w); x <= Math.round(25.5 + w); x++) {
        const edge = r > hgt - 5 && ((x * 7 + r) % 5 < 2) && Math.abs(x - 25.5) > 2; // jagged needle tips at the bottom
        if (edge && r > hgt - 3) continue;
        const l = -(x - 25.5) / half * 0.7 - (r / hgt) * 0.5 + 0.25 + (rnd() - 0.5) * 0.25;
        g.set(x, y, r >= hgt - 2 ? R[4] : l > 0.6 ? R[0] : l > 0.25 ? R[1] : l > -0.15 ? R[2] : l > -0.5 ? R[3] : R[4]);
      }
    }
    for (let i = 0; i < half * hgt / 9; i++) { // needle strokes
      const r = Math.floor(rnd() * (hgt - 3)), w = half * (r + 1) / hgt, x = Math.round(25.5 + (rnd() * 2 - 1) * w * 0.85), y = top + r;
      const lit = x < 25.5; g.set(x, y, lit ? R[0] : R[4]); g.set(x + (lit ? -1 : 1), y + 1, lit ? R[1] : R[4]);
    }
  };
  tier(40, 24, 26); tier(22, 20, 22); tier(4, 14, 20);
  g.set(25, 3, R[1]); g.set(26, 3, R[2]); g.set(25, 2, R[1]);
  return softOutline(g, OUT_LEAF);
}

/** A rock, ~40×32: blue-grey, a flat bright top face, a crack, moss on some. */
export function drawRock(variant: number): Pixels {
  const rnd = seeded(11 + variant), g = new Pixels(40, 32);
  blob(g, 20, 18, 16 - (variant % 2) * 2, 12, STONE5, rnd, 0.08);
  if (variant % 2 === 0) blob(g, 9, 22, 7, 6, STONE5, rnd, 0.08);
  for (let y = 7; y < 13; y++) for (let x = 9; x < 30; x++) if (g.get(x, y) && ((x - 19) / 9) ** 2 + ((y - 10) / 3.4) ** 2 < 1) g.set(x, y, y < 9 ? STONE5[0] : STONE5[1]); // top face
  for (let t = 0; t < 10; t++) { g.set(24 + Math.round(Math.sin(t) * 1.5), 14 + t, STONE5[4]); g.set(25 + Math.round(Math.sin(t) * 1.5), 14 + t, STONE5[2]); }
  grain(g, rnd, 2, 4, 36, 28, 0.12, 0.12);
  if (variant > 1) foliage(g, 17, 9, 7, 3, C.leaf[0], rnd, 0.6);
  return softOutline(g, OUT_STONE);
}

/** A big mossy boulder, ~60×48. */
export function drawBoulder(variant: number): Pixels {
  const rnd = seeded(41 + variant), g = new Pixels(60, 48);
  blob(g, 30, 27, 26, 20, STONE5, rnd, 0.06);
  for (let y = 9; y < 20; y++) for (let x = 12; x < 46; x++) if (g.get(x, y) && ((x - 29) / 15) ** 2 + ((y - 14) / 5) ** 2 < 1) g.set(x, y, y < 12 ? STONE5[0] : STONE5[1]);
  for (let y = 24; y < 42; y++) { const x = 38 + Math.round(Math.sin(y * 0.5) * 2); g.set(x, y, STONE5[4]); g.set(x + 1, y, STONE5[2]); }
  grain(g, rnd, 4, 6, 52, 40, 0.1, 0.12);
  foliage(g, 20 + variant * 8, 13, 13, 6, C.leaf[0], rnd, 0.8); // moss cap
  for (let i = 0; i < 10; i++) { const x = 10 + variant * 8 + Math.floor(rnd() * 20), y = 18 + Math.floor(rnd() * 5); if (g.get(x, y)) g.set(x, y, C.leaf[0][2]); } // moss dripping down
  return softOutline(g, OUT_STONE);
}

/** A tree stump with rings, 40×34. */
export function drawStump(): Pixels {
  const rnd = seeded(77), g = new Pixels(40, 34);
  bark(g, 6, 12, 28, 18, rnd);
  for (const [pts] of [[[[7, 27], [3, 30], [1, 31]]], [[[33, 27], [37, 30], [39, 31]]], [[[18, 29], [17, 32]]]] as [number, number][][][]) stroke(g, pts, 4, WOOD5);
  rings(g, 20, 12, 14, 6.5);
  for (let x = 7; x < 34; x++) if (rnd() < 0.5) g.set(x, 18 + Math.floor(rnd() * 2), C.leaf[0][rnd() < 0.5 ? 1 : 2]); // a little moss
  return softOutline(g, OUT_WOOD);
}

/** A fallen log with a mossy back, 76×30. */
export function drawLog(): Pixels {
  const rnd = seeded(88), g = new Pixels(76, 30);
  for (let y = 6; y < 24; y++) for (let x = 8; x < 67; x++) { const t = (y - 6) / 17; g.set(x, y, t < 0.12 ? WOOD5[0] : t < 0.35 ? WOOD5[1] : t < 0.7 ? WOOD5[2] : t < 0.9 ? WOOD5[3] : WOOD5[4]); }
  for (let i = 0; i < 40; i++) { const x = 9 + Math.floor(rnd() * 56), y = 10 + Math.floor(rnd() * 12); g.hline(x, Math.min(66, x + 3 + Math.floor(rnd() * 6)), y, WOOD5[4]); } // grooves
  foliage(g, 34, 7, 20, 4, C.leaf[0], rnd, 0.7);
  rings(g, 67, 15, 5, 9);
  stroke(g, [[8, 21], [4, 24], [2, 25]], 3, WOOD5); stroke(g, [[10, 8], [6, 5]], 3, WOOD5); // broken branch stubs
  return softOutline(g, OUT_WOOD);
}

/** A broken stone pillar with moss, 32×58. */
export function drawPillar(variant: number): Pixels {
  const rnd = seeded(91 + variant * 3), g = new Pixels(32, 58), top = variant ? 14 : 6;
  for (let y = top; y < 50; y++) for (let x = 6; x < 26; x++) {
    const t = (x - 6) / 19, block = Math.floor((y - top) / 10), by = (y - top) % 10;
    let c = t < 0.15 ? STONE5[1] : t < 0.6 ? STONE5[2] : t < 0.85 ? STONE5[3] : STONE5[4];
    if (by === 0) c = STONE5[4]; else if (by === 1) c = shade(c, 0.15);
    if (block % 2 && x === 16 && by > 1) c = STONE5[4];
    g.set(x, y, c);
  }
  for (let x = 6; x < 26; x++) { const j = Math.round(Math.abs(Math.sin(x * 1.7 + variant)) * 4); for (let y = top - 2; y < top + j; y++) g.set(x, y, null); for (let y = top + j; y < top + j + 2; y++) if (g.get(x, y)) g.set(x, y, STONE5[0]); } // broken top
  for (let y = 50; y < 56; y++) for (let x = 2; x < 30; x++) g.set(x, y, y === 50 ? STONE5[1] : x > 26 ? STONE5[4] : STONE5[3]); // plinth
  grain(g, rnd, 6, top, 20, 44, 0.08, 0.12);
  foliage(g, 11, top + 8, 5, 3, C.leaf[0], rnd, 0.6); foliage(g, 20, 34, 4, 3, C.leaf[0], rnd, 0.6); foliage(g, 9, 47, 6, 3, C.leaf[0], rnd, 0.6);
  if (variant) { blob(g, 29, 53, 3, 2, STONE5, rnd); blob(g, 2, 54, 2, 2, STONE5, rnd); } // fallen chunks
  return softOutline(g, OUT_STONE);
}

/** A short run of mossy stone wall from old ruins, 72×38. */
export function drawWall(): Pixels {
  const rnd = seeded(211), g = new Pixels(72, 38);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
    const x = 2 + i * 13 + (row % 2 ? 6 : 0), y = 8 + row * 8, w = 12;
    if (x + w > 70) continue;
    const tone = 2 + (Math.floor(rnd() * 3) === 0 ? 1 : 0);
    for (let yy = y; yy < y + 8; yy++) for (let xx = x; xx < x + w; xx++) {
      const edge = yy === y + 7 || xx === x + w - 1;
      g.set(xx, yy, edge ? STONE5[4] : yy === y || xx === x ? STONE5[1] : yy === y + 1 ? STONE5[2] : STONE5[tone]);
    }
  }
  for (let x = 0; x < 72; x++) for (let y = 32; y < 36; y++) g.set(x, y, y === 32 ? STONE5[3] : STONE5[4]);
  grain(g, rnd, 0, 8, 72, 26, 0.08, 0.12);
  foliage(g, 20, 7, 14, 3, C.leaf[0], rnd, 0.7); foliage(g, 52, 7, 10, 3, C.leaf[1], rnd, 0.7);
  for (let x = 4; x < 68; x += 3) if (rnd() < 0.5) { g.set(x, 6, C.leaf[0][0]); g.set(x, 5, C.leaf[0][1]); } // grass blades
  return softOutline(g, OUT_STONE);
}

/** Planks: horizontal boards with grain, in a box. */
function planks(g: Pixels, x0: number, y0: number, w: number, h: number, board: number, rnd: () => number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const by = (y - y0) % board;
    g.set(x, y, by === board - 1 ? WOOD5[4] : by === 0 ? WOOD5[1] : WOOD5[2]);
  }
  for (let i = 0; i < w * h / 18; i++) { const x = x0 + Math.floor(rnd() * (w - 4)), y = y0 + 1 + Math.floor(rnd() * (h - 2)); if ((y - y0) % board !== board - 1) g.hline(x, x + 2 + Math.floor(rnd() * 4), y, WOOD5[3]); }
}

/** A wooden crate, 32×32. */
export function drawCrate(): Pixels {
  const rnd = seeded(117), g = new Pixels(32, 32);
  planks(g, 2, 2, 28, 7, 7, rnd); for (let x = 2; x < 30; x++) g.set(x, 2, WOOD5[0]); // lid, seen from above
  planks(g, 2, 9, 28, 21, 7, rnd);
  for (const x of [2, 3, 28, 29]) g.vline(x, 9, 29, x < 4 ? WOOD5[1] : WOOD5[4]); // frame
  g.hline(2, 29, 9, WOOD5[4]); g.hline(2, 29, 29, WOOD5[4]);
  for (let i = 0; i < 18; i++) { g.set(5 + i, 11 + Math.round(i * 0.95), WOOD5[1]); g.set(6 + i, 11 + Math.round(i * 0.95), WOOD5[3]); } // brace
  for (const [x, y] of [[4, 11], [27, 11], [4, 27], [27, 27]]) { g.set(x, y, IRON[0]); g.set(x + 1, y + 1, IRON[2]); }
  return softOutline(g, OUT_WOOD);
}

/** A barrel, 28×36: bulging staves, two iron hoops, a lid. */
export function drawBarrel(): Pixels {
  const rnd = seeded(128), g = new Pixels(28, 36);
  for (let y = 6; y < 33; y++) {
    const bulge = Math.round(Math.sin((y - 6) / 26 * Math.PI) * 2.5), x0 = 3 - bulge + 1, x1 = 24 + bulge;
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0), stave = (x - x0) % 5 === 4;
      g.set(x, y, stave ? WOOD5[3] : t < 0.15 ? WOOD5[2] : t < 0.4 ? WOOD5[0] : t < 0.7 ? WOOD5[1] : t < 0.88 ? WOOD5[2] : WOOD5[3]);
    }
  }
  for (const y of [11, 26]) for (let x = 0; x < 28; x++) if (g.get(x, y)) { g.set(x, y, IRON[1]); g.set(x, y - 1, IRON[0]); g.set(x, y + 1, IRON[2]); }
  for (let y = 2; y < 9; y++) for (let x = 4; x < 25; x++) { const d = ((x + 0.5 - 14.5) / 10.5) ** 2 + ((y + 0.5 - 5.5) / 3.5) ** 2; if (d < 1) g.set(x, y, d > 0.7 ? WOOD5[3] : (x + y) % 6 === 0 ? CUT[3] : CUT[1]); }
  grain(g, rnd, 2, 6, 24, 26, 0.06, 0.1);
  return softOutline(g, OUT_WOOD);
}

/** A short wooden fence, 68×30 (three posts and two rails). */
export function drawFence(): Pixels {
  const rnd = seeded(137), g = new Pixels(68, 30);
  for (const y of [8, 18]) for (let x = 4; x < 64; x++) for (let yy = y; yy < y + 4; yy++) g.set(x, yy, yy === y ? WOOD5[0] : yy === y + 3 ? WOOD5[3] : WOOD5[1]);
  for (const x of [4, 30, 56]) { bark(g, x, 3, 8, 25, rnd); g.hline(x, x + 7, 2, CUT[1]); g.hline(x + 1, x + 6, 1, CUT[0]); }
  return softOutline(g, OUT_WOOD);
}

/** A pit with an earthy rim, 64×40: you can't walk over it, but shots fly across. */
export function drawPit(variant: number): Pixels {
  const rnd = seeded(91 + variant), g = new Pixels(64, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 64; x++) {
    const nx = (x + 0.5 - 32) / 29, ny = (y + 0.5 - 20) / 17.5, d = nx * nx + ny * ny;
    if (d > 1 + (rnd() - 0.5) * 0.08) continue;
    let c: string;
    if (d > 0.74) c = ny > 0.2 ? (d > 0.9 ? C.dirt[0] : C.dirt[1]) : ny > -0.2 ? C.dirt[2] : C.dirt[3]; // lit near lip, shaded far lip
    else { const depth = (1 - d) + (ny < 0 ? 0.3 : 0); c = depth > 0.8 ? '#140c08' : depth > 0.55 ? '#1e140e' : depth > 0.38 ? '#2a1a12' : '#3a2618'; }
    g.set(x, y, c);
  }
  for (let i = 0; i < 14; i++) { const a = rnd() * Math.PI * 2, x = Math.round(32 + Math.cos(a) * 27), y = Math.round(20 + Math.sin(a) * 16); blob(g, x, y, 1.6, 1.2, STONE5, rnd); }
  for (let i = 0; i < 10; i++) { const x = 8 + Math.floor(rnd() * 48), y = 3 + Math.floor(rnd() * 4); g.set(x, y, C.grass[0]); g.set(x + 1, y - 1, C.grass[1]); }
  return softOutline(g, '#2a1a12');
}

/** A dead tree, 52×70 (for bog rooms). */
export function drawDeadTree(): Pixels {
  const rnd = seeded(158), g = new Pixels(52, 70), BK = ['#b89a7e', '#9a7a5e', '#7a5e48', '#5a4232', '#3e2c22'];
  bark(g, 21, 28, 10, 36, rnd, BK);
  stroke(g, [[22, 62], [16, 65], [12, 67]], 5, BK); stroke(g, [[30, 62], [36, 65], [41, 66]], 5, BK);
  stroke(g, [[23, 30], [19, 22], [16, 15], [12, 8], [10, 3]], 6, BK);
  stroke(g, [[29, 29], [33, 21], [38, 17], [42, 12], [45, 7]], 6, BK);
  stroke(g, [[26, 28], [26, 18], [27, 10], [25, 4]], 5, BK);
  stroke(g, [[17, 18], [11, 17], [5, 16]], 3, BK); stroke(g, [[35, 19], [38, 23], [42, 25]], 3, BK);
  for (let y = 36; y < 46; y++) for (let x = 24; x < 28; x++) if (((x - 26) / 2) ** 2 + ((y - 41) / 4) ** 2 < 1) g.set(x, y, '#1e140e'); // a hollow
  for (const [x, y] of [[10, 3], [45, 7], [25, 4], [5, 16]]) { g.set(x, y, C.leaf[1][1]); g.set(x + 1, y, C.leaf[1][2]); } // last leaves
  return softOutline(g, OUT_WOOD);
}

/* ---------------- decoration (no collision) ---------------- */
/** A round bush, sometimes with flowers or berries, 40×28. */
export function drawBush(variant: number): Pixels {
  const rnd = seeded(131 + variant), g = new Pixels(40, 28), ramp = C.leaf[variant % 3];
  const light = { x: 18, y: 13, rx: 18, ry: 12 };
  foliage(g, 12, 16, 10, 9, ramp, rnd, 1.2, light); foliage(g, 27, 15, 11, 10, ramp, rnd, 1.2, light); foliage(g, 19, 10, 9, 7, ramp, rnd, 1.2, light);
  const dots = variant === 0 ? ['#f08aa8', '#f8c0d0'] : variant === 1 ? ['#e0503e', '#f8a090'] : ['#f4f0e8', '#ffffff'];
  for (let i = 0; i < 9; i++) { const x = 6 + Math.floor(rnd() * 28), y = 6 + Math.floor(rnd() * 14); if (g.get(x, y)) { g.rect(x, y, 2, 2, dots[0]); g.set(x, y, dots[1]); } }
  return softOutline(g, OUT_LEAF);
}

/** A small patch of flowers, 28×16. */
export function drawFlowers(variant: number): Pixels {
  const rnd = seeded(171 + variant), g = new Pixels(28, 16), col = C.flowers[[1, 2, 3][variant % 3]], colL = shade(col, 0.35), colD = shade(col, -0.25);
  for (let i = 0; i < 7; i++) {
    const x = 4 + Math.floor(rnd() * 20), y = 4 + Math.floor(rnd() * 6);
    g.vline(x, y + 2, Math.min(15, y + 5), C.leaf[0][2]); g.set(x + 1, y + 4, C.leaf[0][1]); g.set(x - 1, y + 5, C.leaf[0][1]); // stem + leaf
    g.set(x - 1, y - 1, colL); g.set(x, y - 2, colL); g.set(x + 1, y - 1, col); g.set(x - 2, y, col); g.set(x + 2, y, colD); g.set(x - 1, y + 1, col); g.set(x + 1, y + 1, colD); g.set(x, y + 1, colD);
    g.set(x, y, '#f2d24a'); g.set(x, y - 1, col);
  }
  return g;
}

/** A cluster of little brown/tan mushrooms, 24×18 (never red: red caps are the spore-cap enemy). */
export function drawShrooms(): Pixels {
  const g = new Pixels(24, 18), rnd = seeded(193), CAP = ['#e8cfa0', '#c9a46e', '#a8804e', '#84603a', '#5e4228'];
  const shroom = (x: number, y: number, r: number) => {
    g.rect(x - 1, y, 3, r + 2, '#f0e0c0'); g.vline(x + 1, y, y + r + 1, '#cdb894'); // stem
    blob(g, x, y, r + 1, r * 0.7, CAP, rnd, 0);
    for (let i = 0; i < r; i++) { const sx = x - r + Math.floor(rnd() * r * 2), sy = y - Math.floor(rnd() * r * 0.6); if (g.get(sx, sy)) g.set(sx, sy, '#f4e6c8'); }
  };
  shroom(7, 9, 5); shroom(16, 7, 3.5); shroom(18, 13, 2.5);
  return softOutline(g, '#3a2818');
}

/** Every prop texture: key → canvas at 2× detail (shown at scale 1). */
export function propCanvases(): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {};
  for (let v = 0; v < 4; v++) out[`prop_rock${v}`] = drawRock(v).toCanvas();
  for (let v = 0; v < 2; v++) out[`prop_boulder${v}`] = drawBoulder(v).toCanvas();
  out.prop_stump = drawStump().toCanvas();
  out.prop_log = drawLog().toCanvas();
  for (let v = 0; v < 2; v++) out[`prop_pillar${v}`] = drawPillar(v).toCanvas();
  out.prop_wall = drawWall().toCanvas();
  out.prop_crate = drawCrate().toCanvas();
  out.prop_barrel = drawBarrel().toCanvas();
  out.prop_fence = drawFence().toCanvas();
  for (let v = 0; v < 2; v++) out[`prop_pit${v}`] = drawPit(v).toCanvas();
  for (let v = 0; v < 3; v++) out[`prop_pine${v}`] = drawPine(v).toCanvas();
  for (let v = 0; v < 3; v++) out[`prop_tree${v}`] = drawLeafyTree(v).toCanvas();
  out.prop_deadtree = drawDeadTree().toCanvas();
  for (let v = 0; v < 3; v++) out[`prop_bush${v}`] = drawBush(v).toCanvas();
  for (let v = 0; v < 3; v++) out[`prop_flowers${v}`] = drawFlowers(v).toCanvas();
  out.prop_shrooms = drawShrooms().toCanvas();
  out.prop_shadow = shadowHD(16, 8);
  return out;
}

export { shade };
