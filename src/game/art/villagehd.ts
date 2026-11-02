/**
 * Emberfall's buildings, objects and creatures, drawn at 2× detail (HD,
 * shown at scale 1): timber-framed houses with tiled roofs (standing or
 * burnt), ruins, the chapel, the well, market stalls, a broken cart, haystacks,
 * lamp posts, a signpost, graves, rubble, animated fire, the village doorway,
 * ash heaps, and the ember imp, cinder hound, Cinderjaw and the Cinder Golem.
 * Cozy palette (warm plaster, orange / blue / brown roof tiles, warm wood)
 * with soot and embers on top. Sizes are texture pixels = world px.
 */
import { Pixels } from './pixels';
import { C, blob, foliage, grain, ramp5, seeded, shade, softOutline, stroke } from './world';

/** Roof shingles, muted like the Cainos village: warm slate, blue-grey slate, weathered brown wood. */
export const ROOF5 = {
  slate: ['#c4bcb2', '#a69e94', '#8a827a', '#6c6560', '#4a4440'],
  teal: ['#b4c0c0', '#94a2a4', '#788688', '#5c686c', '#40484e'],
  brown: ['#d0aa80', '#b08a62', '#90704c', '#705438', '#4c3826'],
} as const;
export type RoofColour = keyof typeof ROOF5;
const PLASTER = ['#fbf4e2', '#f0e6cc', '#e2d4b4', '#ccbc98', '#a8987a'];
const WOOD5 = ['#e8c494', '#d0a674', '#b08452', '#8a6238', '#5e4024']; // warm, slightly muted
const STONE5 = ['#ece8e0', '#d2ccc2', '#b4aea4', '#948e84', '#6e685e']; // warm light stone
const CHAR = ['#6a5446', '#4a3a30', '#2e221e', '#1e1616'];
const EMBER = ['#fff6c0', '#ffd860', '#ffa838', '#f07030', '#c84a24'];
const GLASS = ['#d8f0ff', '#9ac8e8', '#5a88b0', '#3a5a7a'];
const OUT_WOOD = '#3a2a1e', OUT_STONE = '#3e3a34';

/* ---------------- building blocks ---------------- */
/**
 * Roof shingles (like the Cainos roofs): offset rows of slates of uneven width,
 * each with its own tone, a lit top edge and a dark gap under it; lighter on
 * the left of the roof, darker on the right, with a little moss.
 */
export function tiles(g: Pixels, x0: number, y0: number, w: number, h: number, R: readonly string[], inside: (x: number, y: number) => boolean, rnd: () => number) {
  const rows = Math.ceil(h / 7), cuts: number[][] = [];
  for (let r = 0; r < rows; r++) { const c = [x0 - (r % 2 ? 4 : 0)]; while (c[c.length - 1] < x0 + w) c.push(c[c.length - 1] + 7 + Math.floor(rnd() * 5)); cuts.push(c); }
  const tone: number[][] = cuts.map(c => c.map(() => rnd()));
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!inside(x, y)) continue;
    const r = Math.floor((y - y0) / 7), ry = (y - y0) % 7, c = cuts[r];
    let i = 0; while (c[i + 1] <= x) i++;
    const edgeL = x === c[i], edgeR = x === c[i + 1] - 1, t = tone[r][i];
    const side = (x - x0) / w, lit = side < 0.4 ? 1 : side > 0.7 ? -1 : 0;
    let k = 2 - lit + (t < 0.25 ? 1 : t > 0.8 ? -1 : 0);
    if (ry === 0) k -= 1; if (ry >= 5) k += 1;
    if (ry === 6 || edgeR) k = 4; else if (edgeL && ry < 5) k = Math.max(0, k - 1);
    g.set(x, y, R[Math.max(0, Math.min(4, k))]);
  }
  for (let i = 0; i < w * h / 160; i++) { const x = x0 + Math.floor(rnd() * w), y = y0 + Math.floor(rnd() * h); if (inside(x, y) && g.get(x, y) && g.get(x, y) !== R[4]) { g.set(x, y, '#8a9a4a'); if (rnd() < 0.5) g.set(x + 1, y, '#6e7e3a'); } } // moss
}

/** Stone bricks in offset rows with bevelled edges. */
export function bricks(g: Pixels, x0: number, y0: number, w: number, h: number, rnd: () => number, bw = 10, bh = 5, R = STONE5) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor((y - y0) / bh), by = (y - y0) % bh, bx = (x - x0 + (row % 2 ? bw / 2 : 0)) % bw;
    const tone = ((Math.floor((x - x0 + (row % 2 ? bw / 2 : 0)) / bw) * 7 + row * 3) % 4) === 0 ? 3 : 2;
    g.set(x, y, by === bh - 1 || bx === bw - 1 ? R[4] : by === 0 || bx === 0 ? R[1] : R[tone]);
  }
  grain(g, rnd, x0, y0, w, h, 0.05, 0.1);
}

/** A vertical (or horizontal) wooden beam with grain. */
export function beam(g: Pixels, x0: number, y0: number, w: number, h: number, rnd: () => number, vertical = true) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const t = vertical ? (x - x0) / Math.max(1, w - 1) : (y - y0) / Math.max(1, h - 1);
    g.set(x, y, t < 0.25 ? WOOD5[2] : t < 0.75 ? WOOD5[3] : WOOD5[4]);
  }
  for (let i = 0; i < (w * h) / 10; i++) { const x = x0 + Math.floor(rnd() * w), y = y0 + Math.floor(rnd() * h); g.set(x, y, WOOD5[rnd() < 0.5 ? 4 : 2]); }
}

/** Plaster with a faint mottling, lit from the left. */
export function plaster(g: Pixels, x0: number, y0: number, w: number, h: number, rnd: () => number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g.set(x, y, (x - x0) < 4 ? PLASTER[1] : (x - x0) > w - 4 ? PLASTER[3] : PLASTER[2]);
  for (let i = 0; i < w * h / 12; i++) { const x = x0 + Math.floor(rnd() * w), y = y0 + Math.floor(rnd() * h), c = g.get(x, y); if (c) g.set(x, y, rnd() < 0.5 ? PLASTER[1] : PLASTER[3]); }
}

/** A window: wooden frame, four panes with a glint (or broken and dark). */
export function windowAt(g: Pixels, x: number, y: number, w: number, h: number, broken: boolean, rnd: () => number) {
  g.rect(x - 1, y - 1, w + 2, h + 2, WOOD5[4]); g.rect(x, y, w, h, WOOD5[2]);
  const ix = x + 2, iy = y + 2, iw = w - 4, ih = h - 4;
  for (let yy = iy; yy < iy + ih; yy++) for (let xx = ix; xx < ix + iw; xx++) {
    if (broken) { g.set(xx, yy, rnd() < 0.15 ? CHAR[2] : CHAR[3]); continue; }
    const d = (xx - ix) + (yy - iy);
    g.set(xx, yy, d < 3 ? GLASS[1] : (d % 7 === 3) ? GLASS[1] : yy - iy < ih / 2 ? GLASS[2] : GLASS[3]);
  }
  if (broken) { for (const [px, py] of [[ix, iy], [ix + 1, iy], [ix, iy + 1], [ix + iw - 1, iy + ih - 1]]) g.set(px, py, GLASS[2]); }
  g.vline(x + Math.floor(w / 2), y, y + h - 1, WOOD5[3]); g.hline(x, x + w - 1, y + Math.floor(h / 2), WOOD5[3]);
}

/** Darken pixels around a point (soot), more near the centre. */
export function soot(g: Pixels, cx: number, cy: number, rx: number, ry: number, rnd: () => number, strength = 0.55) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const c = g.get(x, y); if (!c) continue;
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1 || rnd() > (1 - d) * 1.4) continue;
    g.set(x, y, shade(c, -strength * (1 - d * 0.6)));
  }
}

/** A charred hole: dark inside, glowing edge, burnt rafters across it. */
function burnHole(g: Pixels, hx: number, hy: number, rx: number, ry: number, rnd: () => number) {
  for (let y = Math.floor(hy - ry * 1.3); y <= hy + ry * 1.3; y++) for (let x = Math.floor(hx - rx * 1.3); x <= hx + rx * 1.3; x++) {
    const d = ((x - hx) / rx) ** 2 + ((y - hy) / ry) ** 2 + (rnd() - 0.5) * 0.18;
    if (d < 1) g.set(x, y, y < hy - ry * 0.3 ? CHAR[3] : (x + y) % 5 === 0 ? CHAR[2] : CHAR[3]);
    else if (d < 1.3 && g.get(x, y)) g.set(x, y, rnd() < 0.35 ? EMBER[3] : rnd() < 0.5 ? CHAR[1] : CHAR[2]);
  }
  for (let i = -2; i <= 2; i++) stroke(g, [[hx + i * rx * 0.4 - 2, hy - ry * 0.9], [hx + i * rx * 0.4 + 3, hy + ry * 0.9]], 2.5, [CHAR[0], CHAR[0], CHAR[1], CHAR[2]]);
  soot(g, hx, hy, rx * 1.9, ry * 1.8, rnd, 0.45);
}

/* ---------------- buildings ---------------- */
/**
 * A house seen from the front, 150×160 (about three hero-heights tall, so the
 * door fits a person), in the Cainos manner: a big slate roof seen from above
 * with a stone chimney, an upper storey of plaster and dark timber (or
 * planks), a stone ground floor with a rounded plank door and a planter, and
 * a dark band of shade under the eaves.
 * `burnt`: a hole in the roof, charred rafters, broken windows, soot, no door.
 */
export function drawHouse(roof: RoofColour, burnt: boolean, variant = 0): Pixels {
  const W = 150, rnd = seeded(500 + variant * 13 + (burnt ? 7 : 0) + roof.length), g = new Pixels(W, 160), R = ROOF5[roof];
  bricks(g, 100, 0, 16, 30, rnd, 8, 5); g.rect(97, 0, 22, 4, STONE5[3]); g.hline(97, 118, 0, STONE5[1]); // chimney
  const roofTop = 7, roofBot = 86;
  tiles(g, 0, roofTop, W, roofBot - roofTop, R, (x, y) => { const t = (y - roofTop) / (roofBot - roofTop - 1); return x >= Math.round(18 - 18 * t) && x <= Math.round(131 + 18 * t); }, rnd);
  for (let x = 18; x < 132; x++) { g.set(x, roofTop, R[4]); g.set(x, roofTop + 1, R[1]); g.set(x, roofTop + 2, R[2]); } // ridge cap
  for (let x = 1; x < W - 1; x++) { g.set(x, roofBot - 1, R[4]); g.set(x, roofBot, shade(R[4], -0.3)); g.set(x, roofBot + 1, shade(R[4], -0.15)); } // eave and its shade
  // upper storey: plaster with dark timber, or planks
  const up0 = roofBot + 2, up1 = 114;
  if (variant % 2 === 0) {
    plaster(g, 8, up0, 134, up1 - up0, rnd);
    for (const x of [8, 42, 72, 102, 137]) beam(g, x, up0, 5, up1 - up0, rnd);
    for (const [x0, x1] of [[13, 42], [107, 137]]) for (let t = 0; t <= 1; t += 0.02) {
      const x = Math.round(x0 + (x1 - x0) * t), y1 = Math.round(up0 + (up1 - up0 - 1) * t), y2 = Math.round(up1 - 1 - (up1 - up0 - 1) * t);
      for (const [yy] of [[y1], [y2]]) { g.set(x, yy, WOOD5[4]); g.set(x + 1, yy, WOOD5[3]); g.set(x + 2, yy, WOOD5[3]); }
    } // X braces
  } else {
    for (let y = up0; y < up1; y++) for (let x = 8; x < 142; x++) { const p = (x - 8) % 8; g.set(x, y, p === 7 ? WOOD5[4] : p === 0 ? WOOD5[1] : (x > 132 ? WOOD5[3] : WOOD5[2])); }
    grain(g, rnd, 8, up0, 134, up1 - up0, 0.06, 0.1);
  }
  beam(g, 5, up1, 140, 4, rnd, false);
  windowAt(g, 50, up0 + 4, 14, 14, burnt, rnd); windowAt(g, 80, up0 + 4, 14, 14, burnt, rnd);
  // ground floor: stone, a rounded plank door with an iron ring, a window with a planter
  bricks(g, 8, up1 + 4, 134, 34, rnd, 14, 6);
  const dx = 88, dTop = 122, dBot = 152, dW = 26;
  const inDoor = (x: number, y: number) => y >= dTop + 6 || ((x - dx - (dW - 1) / 2) / (dW / 2)) ** 2 + ((y - dTop - 6) / 6) ** 2 <= 1;
  for (let y = dTop - 2; y < dBot; y++) for (let x = dx - 2; x < dx + dW + 2; x++) if (!inDoor(x, y) && (x < dx || x >= dx + dW || y < dTop + 6) && ((x - dx - (dW - 1) / 2) / (dW / 2 + 2)) ** 2 + ((y - dTop - 6) / 8) ** 2 <= 1.05 || ((x === dx - 2 || x === dx - 1 || x === dx + dW || x === dx + dW + 1) && y >= dTop + 6)) g.set(x, y, x < dx ? STONE5[1] : STONE5[4]); // stone door frame
  for (let y = dTop; y < dBot; y++) for (let x = dx; x < dx + dW; x++) {
    if (!inDoor(x, y)) continue;
    if (burnt) { g.set(x, y, y < dTop + 8 ? CHAR[3] : rnd() < 0.08 ? CHAR[1] : CHAR[3]); continue; }
    const p = (x - dx) % 6; g.set(x, y, p === 5 ? WOOD5[4] : p === 0 ? WOOD5[1] : WOOD5[2]);
  }
  if (!burnt) { beam(g, dx, 130, dW, 2, rnd, false); beam(g, dx, 143, dW, 2, rnd, false); g.rect(dx + 18, 136, 4, 4, '#5a5a62'); g.set(dx + 18, 136, '#9a9aa4'); }
  else stroke(g, [[dx + 2, dBot - 1], [dx + 10, dBot - 10]], 3, [CHAR[0], CHAR[0], CHAR[1], CHAR[2]]); // a fallen plank
  windowAt(g, 28, 124, 16, 14, burnt, rnd);
  if (!burnt) { // planter with flowers under the window
    for (let y = 140; y < 147; y++) for (let x = 22; x < 50; x++) g.set(x, y, y === 140 ? WOOD5[1] : x === 49 ? WOOD5[4] : y === 146 ? WOOD5[3] : WOOD5[2]);
    for (let i = 0; i < 9; i++) { const fx = 23 + i * 3, col = ['#e8e0d0', '#f2d24a', '#e89a8a'][i % 3]; g.set(fx, 137, col); g.set(fx + 1, 138, col); g.set(fx, 138, '#93a33f'); g.set(fx + 1, 139, '#7e8f35'); g.set(fx, 139, '#93a33f'); }
  }
  bricks(g, 4, 152, W - 8, 4, rnd, 16, 4); g.rect(dx - 4, 151, dW + 8, 3, STONE5[2]); g.hline(dx - 4, dx + dW + 3, 151, STONE5[0]); // foundation + step
  if (burnt) {
    burnHole(g, 76 + variant * 12, 42, 26, 16, rnd);
    soot(g, 72, up0 + 10, 22, 12, rnd, 0.55); soot(g, dx + 13, 130, 16, 12, rnd, 0.55); soot(g, 36, 128, 12, 9, rnd, 0.5);
    for (let i = 0; i < 14; i++) { const x = 8 + Math.floor(rnd() * 134), y = 16 + Math.floor(rnd() * 60); if (g.get(x, y)) g.rect(x, y, 5, 3, R[4]); } // missing slates
  }
  return softOutline(g, OUT_WOOD);
}

/** A ruin, 150×110: a burnt-out floor, jagged wall stubs, leaning charred beams and rubble. */
export function drawRuin(variant = 0): Pixels {
  const rnd = seeded(600 + variant), g = new Pixels(150, 110), base = 100;
  for (let y = 62; y < base; y++) for (let x = 6; x < 144; x++) g.set(x, y, rnd() < 0.12 ? CHAR[0] : rnd() < 0.5 ? '#3a2e28' : '#463830'); // ash floor
  const wall = (x0: number, x1: number, top: (x: number) => number) => {
    for (let x = x0; x <= x1; x++) { const t = top(x); for (let y = t; y < base; y++) g.set(x, y, x === x0 ? PLASTER[1] : x === x1 ? PLASTER[4] : x - x0 < 4 ? PLASTER[2] : PLASTER[3]); g.set(x, t, PLASTER[0]); }
    bricks(g, x0, base - 26, x1 - x0 + 1, 26, rnd, 14, 6);
    beam(g, x0, 18, 6, base - 44, rnd); soot(g, (x0 + x1) / 2, 44, (x1 - x0) / 1.3, 36, rnd, 0.55);
  };
  wall(6, 50, x => 16 + Math.round(Math.abs(Math.sin(x * 0.6)) * 12) + (x > 38 ? 18 : 0));
  wall(104, 143, x => 46 + Math.round(Math.abs(Math.sin(x * 0.8)) * 10));
  stroke(g, [[64, 92], [74, 56], [80, 28]], 6, [CHAR[0], CHAR[0], CHAR[1], CHAR[2]]);
  stroke(g, [[96, 94], [78, 76], [60, 64]], 6, [CHAR[0], CHAR[0], CHAR[1], CHAR[2]]);
  for (let i = 0; i < 20; i++) blob(g, 74 + (rnd() - 0.5) * 50, 88 + (rnd() - 0.5) * 10, 4 + rnd() * 4, 3 + rnd() * 3, rnd() < 0.6 ? STONE5 : ROOF5.slate, rnd, 0.2);
  bricks(g, 3, base, 144, 8, rnd, 14, 4);
  if (variant) for (let i = 0; i < 12; i++) g.set(80 + Math.floor(rnd() * 18), 78 + Math.floor(rnd() * 8), EMBER[3]);
  return softOutline(g, OUT_STONE);
}

/** The chapel ruin, 160×180: stone walls, an arched door, a round stained-glass window, a broken bell tower. */
export function drawChapel(): Pixels {
  const W = 160, H = 180, rnd = seeded(707), g = new Pixels(W, H), cx = 80;
  bricks(g, cx - 22, 0, 44, 66, rnd, 10, 6); // tower
  for (let x = cx - 22; x < cx + 22; x++) { const j = Math.round(Math.abs(Math.sin(x * 0.8)) * 6); for (let y = 0; y < j; y++) g.set(x, y, null); }
  for (let y = 14; y < 40; y++) for (let x = cx - 8; x < cx + 8; x++) if (y > 21 || ((x - cx + 0.5) / 8) ** 2 + ((y - 21) / 7) ** 2 < 1) g.set(x, y, CHAR[3]); // empty belfry
  const top = 50, bot = 162;
  for (let y = top; y < bot; y++) { const t = Math.max(0, (top + 34 - y) / 34); const x0 = Math.round(8 + t * 64), x1 = Math.round(W - 9 - t * 64); for (let x = x0; x <= x1; x++) g.set(x, y, '#000'); }
  const front = new Pixels(W, H); bricks(front, 0, 0, W, H, rnd, 16, 8);
  for (let y = top; y < bot; y++) for (let x = 0; x < W; x++) if (g.get(x, y) === '#000') { const c = front.get(x, y)!; const t = x / (W - 1); g.set(x, y, t > 0.85 ? shade(c, -0.15) : t < 0.1 ? shade(c, 0.1) : c); }
  for (let y = -13; y <= 13; y++) for (let x = -13; x <= 13; x++) { const d = x * x + y * y; if (d > 169) continue; const a = Math.atan2(y, x), seg = Math.floor((a + Math.PI) / (Math.PI / 3)); g.set(cx + x, 94 + y, d > 132 ? STONE5[4] : d < 16 ? '#f2d24a' : (Math.abs(x) < 1 || Math.abs(y) < 1) ? STONE5[3] : ['#c86a5a', '#5a7c92', '#e2c24a', '#7e9a46', '#c86a5a', '#5a7c92'][seg % 6]); }
  for (let y = 118; y < bot; y++) for (let x = cx - 17; x < cx + 17; x++) if (y > 134 || ((x - cx + 0.5) / 17) ** 2 + ((y - 134) / 16) ** 2 < 1) g.set(x, y, y > bot - 5 ? CHAR[2] : CHAR[3]);
  for (let y = 120; y < bot; y++) { g.set(cx - 18, y, STONE5[1]); g.set(cx + 17, y, STONE5[4]); }
  bricks(g, 3, bot, W - 6, 12, rnd, 18, 6); // steps
  const ivy = new Pixels(W, H);
  for (let i = 0; i < 9; i++) foliage(ivy, 18 + rnd() * 124, 90 + rnd() * 66, 4 + rnd() * 4, 3 + rnd() * 4, ['#c4d070', '#a4b252', '#80903c', '#606e2e'], rnd, 0.6);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = ivy.get(x, y); if (c && g.get(x, y)) g.set(x, y, c); } // ivy only on the walls
  soot(g, cx, 134, 28, 22, rnd, 0.35);
  return softOutline(g, OUT_STONE);
}

/* ---------------- village objects ---------------- */
/** The village well, 48×60: stone ring with dark water, two posts, a small tiled roof, a bucket on a rope. */
export function drawWell(): Pixels {
  const rnd = seeded(808), g = new Pixels(48, 60);
  tiles(g, 4, 2, 40, 14, ROOF5.brown, (x, y) => x >= 4 + (14 - (y - 2)) * 0.6 && x <= 43 - (14 - (y - 2)) * 0.6, rnd);
  beam(g, 9, 15, 4, 28, rnd); beam(g, 35, 15, 4, 28, rnd); beam(g, 9, 20, 30, 3, rnd, false);
  g.vline(24, 23, 32, '#a89a84'); g.vline(25, 23, 32, '#8a7a6a');
  for (let y = 32; y < 40; y++) for (let x = 20; x < 30; x++) g.set(x, y, y === 32 ? WOOD5[0] : x === 20 ? WOOD5[1] : x === 29 ? WOOD5[4] : y === 35 ? '#6a6a72' : WOOD5[2]);
  blob(g, 24, 46, 21, 8, STONE5, rnd, 0.04);
  for (let y = 41; y < 49; y++) for (let x = 6; x < 43; x++) if (((x - 24) / 15) ** 2 + ((y - 45) / 3.6) ** 2 < 1) g.set(x, y, y < 44 ? '#1e3450' : '#2a4a6a');
  g.hline(16, 22, 45, '#5a88b0'); // a glint on the water
  bricks(g, 4, 48, 40, 9, rnd, 8, 4);
  return softOutline(g, OUT_STONE);
}

/** A market stall, 76×64: a plank counter with produce under a striped awning (torn on one variant). */
export function drawStall(variant = 0): Pixels {
  const rnd = seeded(950 + variant), g = new Pixels(76, 64), stripe = variant ? ['#7e98a8', '#5e7888'] : ['#c87a5e', '#a65e46'], CLOTH = ['#f8f0e0', '#e4d8c2'];
  for (let y = 4; y < 20; y++) for (let x = 4 + (19 - y) * 0.5; x < 72 - (19 - y) * 0.5; x++) {
    const xi = Math.round(x); if (variant === 0 && xi > 54 && y > 10 + (xi - 54) * 0.4) continue; // torn corner
    const s = Math.floor(xi / 8) % 2, dark = y > 15;
    g.set(xi, y, s ? (dark ? stripe[1] : stripe[0]) : (dark ? CLOTH[1] : CLOTH[0]));
  }
  for (let x = 4; x < 72; x += 8) { g.set(x + 3, 20, g.get(x + 3, 19) ? stripe[1] : null); } // scalloped edge
  for (const x of [8, 64]) beam(g, x, 19, 5, 38, rnd);
  for (let y = 40; y < 58; y++) for (let x = 6; x < 70; x++) { const p = (x - 6) % 9; g.set(x, y, y < 43 ? WOOD5[y === 40 ? 0 : 1] : p === 8 ? WOOD5[4] : WOOD5[2]); }
  const fruit = (cx: number, cy: number, R: readonly string[]) => blob(g, cx, cy, 2.4, 2.2, R, rnd, 0);
  for (let i = 0; i < 6; i++) fruit(14 + i * 4 + (i % 2), 37 - (i % 2) * 2, ['#ffd0c0', '#f08070', '#e0503e', '#b83a2e', '#8a2a22']);
  for (let i = 0; i < 4; i++) fruit(40 + i * 5, 37 - (i % 2) * 2, ramp5(C.leaf[0]));
  g.rect(56, 28, 6, 12, '#c8a070'); g.rect(57, 27, 4, 2, '#e0c090'); g.vline(56, 28, 39, '#e0c090');
  return softOutline(g, OUT_WOOD);
}

/** A broken cart, 68×44: tipped, one wheel off, hay spilling out. */
export function drawCart(): Pixels {
  const rnd = seeded(909), g = new Pixels(68, 44), HAY = ['#fff4c0', '#f8e090', '#e8c058', '#c89a3a', '#9a7428'];
  foliage(g, 40, 12, 18, 8, HAY.slice(1), rnd, 1.2);
  for (let y = 14; y < 30; y++) for (let x = 16; x < 60; x++) { const b = (y - 14) % 5; g.set(x, y, y === 14 ? WOOD5[0] : b === 4 ? WOOD5[4] : x > 55 ? WOOD5[3] : WOOD5[2]); }
  for (let x = 24; x < 58; x += 10) beam(g, x, 15, 2, 15, rnd);
  stroke(g, [[18, 26], [8, 26], [0, 25]], 3, WOOD5); // shaft
  const wheel = (cx: number, cy: number, r: number) => {
    for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; for (let d = r - 2; d <= r; d++) g.set(Math.round(cx + Math.cos(t) * d), Math.round(cy + Math.sin(t) * d), d === r ? WOOD5[4] : t > Math.PI ? WOOD5[2] : WOOD5[3]); }
    for (let s = 0; s < 4; s++) { const t = s / 4 * Math.PI; for (let d = -r + 2; d < r - 2; d++) g.set(Math.round(cx + Math.cos(t) * d), Math.round(cy + Math.sin(t) * d), WOOD5[3]); }
    g.rect(cx - 1, cy - 1, 3, 3, '#5a5a62');
  };
  wheel(46, 33, 9); wheel(12, 36, 8);
  for (let i = 0; i < 14; i++) { const x = 20 + Math.floor(rnd() * 40), y = 36 + Math.floor(rnd() * 6); g.set(x, y, HAY[2]); g.set(x + 1, y, HAY[3]); }
  return softOutline(g, OUT_WOOD);
}

/** A haystack, 48×34 (variant 1 is smouldering). */
export function drawHay(variant = 0): Pixels {
  const rnd = seeded(950 + variant), g = new Pixels(48, 34), HAY = ['#f8e090', '#e8c058', '#c89a3a', '#9a7428'];
  foliage(g, 24, 19, 21, 13, HAY, rnd, 1.4);
  for (let i = 0; i < 26; i++) { const x = 6 + Math.floor(rnd() * 36), y = 8 + Math.floor(rnd() * 20); if (g.get(x, y)) { g.set(x, y, '#fff0b0'); g.set(x + 1, y + 1, HAY[2]); } }
  if (variant) { soot(g, 30, 12, 12, 8, rnd, 0.6); for (const [x, y] of [[28, 8], [32, 10], [30, 12]]) g.set(x, y, EMBER[2]); }
  return softOutline(g, '#5a4018');
}

/** A lamp post with a lit lantern, 20×66. */
export function drawLamp(lit = true): Pixels {
  const g = new Pixels(20, 66), IR = ['#7a7a84', '#5a5a64', '#3a3a44', '#2a2a32'];
  for (let y = 16; y < 62; y++) { g.set(8, y, IR[0]); g.set(9, y, IR[1]); g.set(10, y, IR[2]); }
  g.rect(5, 60, 10, 4, IR[2]); g.hline(5, 14, 60, IR[0]);
  g.rect(3, 2, 14, 3, IR[1]); g.hline(3, 16, 2, IR[0]); g.set(9, 0, IR[1]); g.set(10, 1, IR[1]);
  g.rect(4, 5, 12, 12, IR[2]);
  for (let y = 6; y < 16; y++) for (let x = 5; x < 15; x++) g.set(x, y, !lit ? '#4a5a6a' : (x === 9 || x === 10 || y === 11) ? IR[2] : y < 9 || x < 7 ? EMBER[0] : EMBER[1]);
  g.rect(5, 16, 10, 2, IR[1]);
  return softOutline(g, '#1a1a22');
}

/** A signpost, 36×44. */
export function drawSign(): Pixels {
  const rnd = seeded(1999), g = new Pixels(36, 44);
  beam(g, 16, 6, 5, 36, rnd);
  for (const [y, x0, x1, dir] of [[8, 3, 32, 1], [22, 6, 28, -1]] as [number, number, number, number][]) {
    for (let yy = y; yy < y + 9; yy++) for (let x = x0; x <= x1; x++) g.set(x, yy, yy === y ? WOOD5[0] : yy === y + 8 ? WOOD5[4] : WOOD5[1]);
    const tip = dir > 0 ? x1 + 1 : x0 - 1; for (let i = 0; i < 4; i++) g.vline(tip + i * dir, y + 1 + i, y + 7 - i, WOOD5[2]); // arrow tip
    for (let i = 0; i < 6; i++) g.rect(x0 + 4 + i * 4, y + 3, 2, 3, WOOD5[4]); // carved letters
  }
  return softOutline(g, OUT_WOOD);
}

/** A gravestone, 24×30. */
export function drawGrave(variant = 0): Pixels {
  const rnd = seeded(1666 + variant), g = new Pixels(24, 30);
  for (let y = 2; y < 25; y++) { const half = y < 8 ? Math.round(Math.sqrt(Math.max(0, 36 - (8 - y) ** 2))) + 2 : 8; for (let x = 12 - half; x < 12 + half; x++) { const t = (x - (12 - half)) / (2 * half); g.set(x, y, t < 0.15 ? STONE5[1] : t > 0.85 ? STONE5[4] : y < 5 ? STONE5[1] : STONE5[2]); } }
  g.rect(11, 8, 2, 11, STONE5[4]); g.rect(7, 11, 10, 2, STONE5[4]); g.set(11, 8, STONE5[3]); // carved cross
  grain(g, rnd, 4, 2, 16, 23, 0.08, 0.1);
  foliage(g, 12, 26, 10, 3, C.leaf[0], rnd, 0.8);
  if (variant) for (const [x, y] of [[4, 24], [18, 25], [6, 26]]) { g.set(x, y, C.flowers[2]); g.set(x + 1, y, '#f2d24a'); }
  return softOutline(g, OUT_STONE);
}

/** A heap of rubble from a fallen house: stones, charred planks, broken tiles. 56×30. */
export function drawRubble(variant = 0): Pixels {
  const rnd = seeded(1010 + variant), g = new Pixels(56, 30);
  for (let i = 0; i < 18; i++) { const x = 8 + rnd() * 40, y = 16 + (rnd() - 0.5) * 10 + Math.abs(x - 28) * 0.15; blob(g, x, y, 3 + rnd() * 4, 2.5 + rnd() * 2.5, rnd() < 0.7 ? STONE5 : [...CHAR, '#120c0a'], rnd, 0.2); }
  stroke(g, [[8, 10], [36, 16]], 3, [CHAR[0], CHAR[0], CHAR[1], CHAR[2]]); stroke(g, [[46, 6], [30, 18]], 3, WOOD5);
  for (let i = 0; i < 9; i++) { const x = 6 + Math.floor(rnd() * 44), y = 12 + Math.floor(rnd() * 12); if (g.get(x, y)) g.rect(x, y, 3, 2, ROOF5.slate[2 + (i % 2)]); }
  return softOutline(g, OUT_STONE);
}

/** A flame, three frames, 28×36: a white-yellow core, orange body, red licking tips. */
export function drawFire(frame: number): Pixels {
  const rnd = seeded(1100 + frame * 31), g = new Pixels(28, 36);
  for (let y = 0; y < 36; y++) for (let x = 0; x < 28; x++) {
    const t = y / 35, half = 2 + t * 10.5 + Math.sin(y * 0.45 + frame * 2.1) * 2;
    const d = Math.abs(x - 13.5 - Math.sin(y * 0.25 + frame) * (1 - t) * 3.5);
    if (d > half || rnd() < 0.04 * (1 - t)) continue;
    const k = d / half;
    g.set(x, y, k < 0.25 && t > 0.45 ? EMBER[0] : k < 0.45 && t > 0.3 ? EMBER[1] : k < 0.7 ? EMBER[2] : k < 0.9 ? EMBER[3] : EMBER[4]);
  }
  for (let i = 0; i < 3; i++) { const x = 6 + Math.floor(rnd() * 16), y = Math.floor(rnd() * 8); g.set(x, y, EMBER[2]); } // sparks breaking off
  return g;
}

/** A village doorway: a stone arch with open gate leaves, 40×50 (twice the old door's detail). */
export function drawArch(): Pixels {
  const rnd = seeded(1201), g = new Pixels(40, 50), ST = new Pixels(40, 50);
  bricks(ST, 0, 0, 40, 50, rnd, 8, 5);
  for (let y = 0; y < 50; y++) for (let x = 0; x < 40; x++) {
    const inArch = y >= 14 ? x >= 8 && x <= 31 : (x - 19.5) ** 2 + (y - 14) ** 2 <= 144;
    const inFrame = y >= 10 ? x >= 1 && x <= 38 : (x - 19.5) ** 2 + (y - 14) ** 2 <= 361;
    if (inArch) g.set(x, y, y > 38 ? '#3a2a20' : y > 30 ? '#2a1e18' : CHAR[3]);
    else if (inFrame) g.set(x, y, ST.get(x, y));
  }
  for (const x of [8, 9, 30, 31]) for (let y = 16; y < 50; y++) g.set(x, y, (y % 6 === 0) ? WOOD5[4] : x % 2 ? WOOD5[3] : WOOD5[2]); // open gate leaves
  g.rect(17, 0, 6, 4, STONE5[1]); g.hline(17, 22, 0, STONE5[0]); // keystone
  return softOutline(g, OUT_STONE);
}

/** A little heap of ash with glowing embers, 28×14. */
export function drawAsh(variant = 0): Pixels {
  const rnd = seeded(1500 + variant), g = new Pixels(28, 14);
  blob(g, 14, 8, 12, 5, ['#b8b0b0', '#9a9090', '#7a7072', '#5a5254', '#3e3638'], rnd, 0.4);
  for (let i = 0; i < 5 + variant * 2; i++) { const x = 5 + Math.floor(rnd() * 18), y = 4 + Math.floor(rnd() * 6); if (g.get(x, y)) { g.set(x, y, EMBER[i % 2 ? 2 : 3]); if (i % 3 === 0) g.set(x + 1, y, EMBER[1]); } }
  return g;
}

/** A birch (Cainos-style): a white trunk with dark marks and a round olive-gold crown of leaf clusters, 64×100. */
export function drawBirch(variant = 0): Pixels {
  const rnd = seeded(1700 + variant), g = new Pixels(64, 100), BARK = ['#ffffff', '#ece8e0', '#d4cec4', '#aaa49a', '#5a524a'];
  for (let y = 46; y < 96; y++) for (let x = 29; x < 36; x++) g.set(x, y, x === 29 ? BARK[1] : x > 33 ? BARK[3] : BARK[1 + (x > 31 ? 1 : 0)]);
  for (let i = 0; i < 12; i++) { const y = 48 + Math.floor(rnd() * 46), x = 29 + Math.floor(rnd() * 5); g.hline(x, x + 1 + Math.floor(rnd() * 2), y, BARK[4]); }
  stroke(g, [[32, 60], [24, 50], [18, 44]], 3, BARK.slice(1)); stroke(g, [[33, 54], [42, 46]], 3, BARK.slice(1));
  const ramp = variant === 1 ? ['#f2dc7a', '#dcbc52', '#b8983c', '#8a7030'] : ['#d8e07a', '#b8c45a', '#92a040', '#6e7c30'];
  const light = { x: 30, y: 30, rx: 28, ry: 26 };
  [[18, 34, 14, 12], [44, 32, 15, 13], [31, 18, 17, 13], [30, 42, 18, 10]].forEach(([x, y, rx, ry]) => foliage(g, x, y, rx, ry, ramp, rnd, 1.1, light));
  return softOutline(g, '#3a3a1e');
}

/** A soft olive bush, 40×28 (variants: plain, white flowers, yellow). */
export function drawOliveBush(variant = 0): Pixels {
  const rnd = seeded(1750 + variant), g = new Pixels(40, 28), ramp = variant === 2 ? ['#ecd878', '#d0b850', '#a8903a', '#80682c'] : ['#c4d070', '#a4b252', '#80903c', '#606e2e'];
  const light = { x: 18, y: 12, rx: 18, ry: 12 };
  foliage(g, 12, 16, 10, 9, ramp, rnd, 1.2, light); foliage(g, 27, 15, 11, 10, ramp, rnd, 1.2, light); foliage(g, 19, 10, 9, 7, ramp, rnd, 1.2, light);
  if (variant === 1) for (let i = 0; i < 8; i++) { const x = 6 + Math.floor(rnd() * 28), y = 5 + Math.floor(rnd() * 14); if (g.get(x, y)) { g.set(x, y, '#ffffff'); g.set(x + 1, y + 1, '#e8e0d0'); } }
  return softOutline(g, '#3a3a1e');
}

/** A grass tuft that sits at the foot of things so they grow out of the ground, 16×10. */
export function drawTuft(variant = 0): Pixels {
  const g = new Pixels(16, 10), L = '#b4c25a', M = '#93a33f', D = '#6e7c30', rnd = seeded(1800 + variant);
  for (let i = 0; i < 7; i++) { const x = 2 + i * 2 + Math.floor(rnd() * 2), h = 3 + Math.floor(rnd() * 5); for (let k = 0; k < h; k++) g.set(x + (k > h / 2 ? (i % 2 ? 1 : -1) : 0), 9 - k, k === h - 1 ? L : k < 2 ? D : M); }
  return g;
}

/** A clay flower pot, 16×18. */
export function drawPot(variant = 0): Pixels {
  const rnd = seeded(1850 + variant), g = new Pixels(16, 18), CL = ['#e8a880', '#d08a62', '#b06e4a', '#8a5236', '#603826'];
  for (let y = 9; y < 17; y++) { const half = 6 - Math.floor((y - 9) / 3); for (let x = 8 - half; x < 8 + half; x++) g.set(x, y, y === 9 ? CL[0] : x < 8 - half + 2 ? CL[1] : x > 8 + half - 3 ? CL[3] : CL[2]); }
  foliage(g, 8, 6, 6, 4.5, variant ? ['#ecd878', '#c8b050', '#98883a', '#706024'] : ['#c4d070', '#a4b252', '#80903c', '#606e2e'], rnd, 1);
  for (let i = 0; i < 3; i++) g.set(4 + Math.floor(rnd() * 8), 3 + Math.floor(rnd() * 4), variant ? '#ffffff' : '#e89a8a');
  return softOutline(g, '#3a2a1e');
}

/* ---------------- Emberfall's creatures ---------------- */
/** Ember imp, 32×32: a round little fire spirit with horns, bat wings, flame hair and a grin. */
export function drawImp(): Pixels {
  const rnd = seeded(1200), g = new Pixels(32, 32), BODY = ['#ffe0a0', '#ffc070', '#f88a40', '#d85a2a', '#9a3420'], WING = ['#8a5a7a', '#6a4a62', '#4a2a3a'];
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) for (let j = 0; j <= i * 0.6; j++) g.set(16 + s * (8 + i), 18 - Math.round(i * 0.5) + j, j === 0 ? WING[0] : (i + j) % 3 === 0 ? WING[2] : WING[1]);
  blob(g, 16, 19, 9, 9, BODY, rnd, 0.04);
  for (let i = 0; i < 14; i++) { const x = 10 + Math.floor(rnd() * 12), y = 6 + Math.floor(rnd() * 6), h = 2 + Math.floor(rnd() * 4); for (let k = 0; k < h; k++) g.set(x, y + k, k === 0 ? EMBER[0] : EMBER[1 + (k % 2)]); } // flame hair
  for (const s of [-1, 1]) stroke(g, [[16 + s * 6, 12], [16 + s * 8, 8], [16 + s * 7, 5]], 2.2, ['#6a4a52', '#5a3a42', '#3a2028', '#2a1418']); // horns
  for (const x of [11, 19]) { g.rect(x, 17, 3, 3, '#fff6c0'); g.set(x + 1, 18, '#3a2028'); g.set(x + 2, 18, '#3a2028'); }
  g.hline(13, 19, 23, '#7a2a1a'); g.set(14, 24, '#ffffff'); g.set(18, 24, '#ffffff'); g.hline(14, 18, 24, '#5a1a12');
  return softOutline(g, '#4a1a12');
}

/** Cinder hound (side view, facing right), 40×28; `big` = Cinderjaw, 80×56, with a burning mane. */
export function drawHound(big: boolean): Pixels {
  const k = big ? 2 : 1, s = (v: number) => v * k, rnd = seeded(big ? 1301 : 1300), g = new Pixels(40 * k, 28 * k);
  const fur = big ? ['#9a7a7a', '#7a5a5a', '#5a3e40', '#422c30', '#2a1c20'] : ['#8a8090', '#6a6068', '#4a424a', '#34303a', '#22202a'];
  for (const [x, far] of [[8, 1], [12, 0], [26, 1], [30, 0]] as [number, number][]) stroke(g, [[s(x), s(16)], [s(x) - k, s(24)], [s(x), s(26)]], 2.5 * k, far ? [fur[3], fur[3], fur[4], fur[4]] : fur.slice(1));
  blob(g, s(18), s(15), s(13), s(6), fur, rnd, 0.06); // body
  blob(g, s(32), s(10), s(6), s(5.5), fur, rnd, 0.05); // head
  for (let y = s(10); y < s(14); y++) for (let x = s(35); x < s(39); x++) g.set(x, y, y < s(11) ? fur[1] : fur[2]); // snout
  g.rect(s(38), s(11), k, k, '#1a1216');
  stroke(g, [[s(30), s(5)], [s(29), s(1)]], 2 * k, fur); stroke(g, [[s(33), s(5)], [s(33), s(1)]], 2 * k, fur); // ears
  stroke(g, [[s(6), s(13)], [s(3), s(9)], [s(1), s(5)]], 2 * k, fur); // tail
  g.rect(s(33), s(8), k + 1, k + 1, '#ffd040'); g.set(s(33), s(8), '#fff6c0');
  for (let i = 0; i < 18 * k; i++) { // ember cracks glowing through the fur
    const x = s(8) + Math.floor(rnd() * s(20)), y = s(11) + Math.floor(rnd() * s(8));
    if (g.get(x, y)) { g.set(x, y, EMBER[3]); if (rnd() < 0.5) g.set(x + 1, y, EMBER[2]); }
  }
  if (big) for (let i = 0; i < 40; i++) { // a burning mane
    const x = s(20) + Math.floor(rnd() * s(14)), y = s(3) + Math.floor(rnd() * s(4)), h = 2 + Math.floor(rnd() * 6);
    for (let j = 0; j < h; j++) g.set(x, y + j, j === 0 ? EMBER[0] : EMBER[1 + (j % 3)]);
  }
  return softOutline(g, '#1a1216');
}

/** The Cinder Golem, 80×80: village stone and charred beams around a furnace heart. */
export function drawGolem(): Pixels {
  const rnd = seeded(1400), g = new Pixels(80, 80), BODY = [...STONE5.slice(0, 4), CHAR[1]];
  for (const x of [26, 52]) blob(g, x, 72, 8, 6, STONE5, rnd, 0.1); // feet
  blob(g, 13, 42, 11, 16, STONE5, rnd, 0.12); blob(g, 67, 42, 11, 16, STONE5, rnd, 0.12); // arms
  blob(g, 12, 58, 8, 6, STONE5, rnd, 0.1); blob(g, 68, 58, 8, 6, STONE5, rnd, 0.1); // fists
  blob(g, 40, 42, 26, 28, BODY, rnd, 0.08); // body
  blob(g, 40, 14, 13, 11, STONE5, rnd, 0.06); // head
  for (const x of [33, 45]) { g.rect(x, 12, 4, 3, EMBER[0]); g.rect(x, 15, 4, 1, EMBER[3]); } // eyes
  for (let y = 34; y < 54; y++) for (let x = 28; x < 52; x++) { // furnace heart
    const d = ((x - 39.5) / 12) ** 2 + ((y - 43.5) / 10) ** 2; if (d > 1) continue;
    g.set(x, y, d > 0.8 ? CHAR[3] : d > 0.55 ? EMBER[3] : d > 0.25 ? EMBER[2] : EMBER[0]);
  }
  for (let x = 30; x < 50; x += 4) g.vline(x, 34, 53, CHAR[2]); // grate bars
  stroke(g, [[6, 26], [34, 20], [56, 28]], 4, [CHAR[0], CHAR[0], CHAR[1], CHAR[2]]); // a charred beam across the shoulders
  for (let i = 0; i < 12; i++) { const x = 18 + Math.floor(rnd() * 44), y = 24 + Math.floor(rnd() * 40); if (g.get(x, y) && !EMBER.includes(g.get(x, y)!)) g.rect(x, y, 3, 2, ROOF5.slate[2 + (i % 2)]); } // roof slates stuck in it
  for (let i = 0; i < 16; i++) { const x = 16 + Math.floor(rnd() * 48), y = 22 + Math.floor(rnd() * 46); if (g.get(x, y) && !EMBER.includes(g.get(x, y)!)) g.set(x, y, EMBER[3]); } // cracks glowing
  grain(g, rnd, 0, 0, 80, 80, 0.05, 0.1);
  return softOutline(g, '#22181a');
}

/** Every village texture (HD, shown at scale 1). */
export function villageCanvases(): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {};
  (['slate', 'teal', 'brown'] as const).forEach((r, i) => { out[`vh_house_${r}`] = drawHouse(r, false, i).toCanvas(); out[`vh_burnt_${r}`] = drawHouse(r, true, i).toCanvas(); });
  for (let v = 0; v < 2; v++) out[`vh_ruin${v}`] = drawRuin(v).toCanvas();
  out.vh_chapel = drawChapel().toCanvas();
  out.vh_well = drawWell().toCanvas();
  for (let v = 0; v < 2; v++) out[`vh_stall${v}`] = drawStall(v).toCanvas();
  out.vh_cart = drawCart().toCanvas();
  for (let v = 0; v < 2; v++) out[`vh_hay${v}`] = drawHay(v).toCanvas();
  out.vh_lamp = drawLamp(true).toCanvas();
  out.vh_sign = drawSign().toCanvas();
  for (let v = 0; v < 2; v++) out[`vh_grave${v}`] = drawGrave(v).toCanvas();
  for (let v = 0; v < 2; v++) out[`vh_rubble${v}`] = drawRubble(v).toCanvas();
  for (let f = 0; f < 3; f++) out[`vh_fire${f}`] = drawFire(f).toCanvas();
  out.door_arch = drawArch().toCanvas();
  for (let v = 0; v < 2; v++) out[`vh_ash${v}`] = drawAsh(v).toCanvas();
  for (let v = 0; v < 2; v++) out[`vh_birch${v}`] = drawBirch(v).toCanvas();
  for (let v = 0; v < 3; v++) out[`vh_bush${v}`] = drawOliveBush(v).toCanvas();
  for (let v = 0; v < 3; v++) out[`vh_tuft${v}`] = drawTuft(v).toCanvas();
  for (let v = 0; v < 2; v++) out[`vh_pot${v}`] = drawPot(v).toCanvas();
  out.imp = drawImp().toCanvas(); out.hound = drawHound(false).toCanvas(); out.cinderjaw = drawHound(true).toCanvas(); out.golem = drawGolem().toCanvas();
  // a soft smoke puff for particles (16×16)
  const smoke = document.createElement('canvas'); smoke.width = 16; smoke.height = 16;
  const sx = smoke.getContext('2d')!;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = (x - 7.5) ** 2 + (y - 7.5) ** 2; if (d < 56) { sx.fillStyle = d < 20 ? '#e0d8d8' : d < 40 ? '#c8c0c4' : '#b0a8ac'; sx.fillRect(x, y, 1, 1); } }
  out.smoke = smoke;
  return out;
}
