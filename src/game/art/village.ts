/**
 * Emberfall's ground: grass, cobbled streets, dirt yards and scorch marks, and
 * the village edge (house fronts behind a stone wall) above the doors. The
 * buildings, objects and creatures themselves are in villagehd.ts.
 *
 * Painted at full screen resolution (HD); patch positions are world px.
 */
import { Pixels } from './pixels';
import { paintBushWall, seeded, softOutline, valueNoise } from './world';
import { ROOF5, beam, bricks, plaster, soot, tiles, windowAt } from './villagehd';

const EMBER = ['#ffb648', '#f07030'] as const;

/** The village edge behind the doors: trees, a row of house fronts (some burnt) and a low stone wall. */
export function paintVillageEdge(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const rnd = seeded(seed);
  ctx.fillStyle = '#6e7c30'; ctx.fillRect(0, 0, w, h);
  paintBushWall(ctx, 0, 0, w, Math.round(h * 0.45), seed, 'down', 2, OLIVE_HEDGE); // trees behind the village
  const roofs = Object.values(ROOF5);
  for (let x = -20 + Math.floor(rnd() * 16); x < w; x += 50 + Math.floor(rnd() * 18)) {
    const R = roofs[Math.floor(rnd() * 3)], rw = 58 + Math.floor(rnd() * 14), wallH = 20, base = h - 16, roofH = 28 + Math.floor(rnd() * 10);
    const top = base - wallH - roofH, g = new Pixels(rw, roofH + wallH), burnt = rnd() < 0.45;
    if (rnd() < 0.55) bricks(g, Math.floor(rw * 0.6), 0, 7, 14, rnd, 7, 4); // chimney
    plaster(g, 4, roofH, rw - 8, wallH, rnd); beam(g, 4, roofH, 3, wallH, rnd); beam(g, rw - 7, roofH, 3, wallH, rnd);
    windowAt(g, 12, roofH + 4, 10, 9, burnt, rnd); windowAt(g, rw - 22, roofH + 4, 10, 9, burnt, rnd);
    tiles(g, 0, 0, rw, roofH + 1, R, (px, py) => Math.abs(px - (rw - 1) / 2) <= (py + 1) / (roofH + 1) * (rw / 2) + 0.5, rnd);
    if (burnt) soot(g, rw * (0.3 + rnd() * 0.4), roofH * 0.6, 14, 12, rnd, 0.7);
    softOutline(g, '#3e2614');
    const img = ctx.getImageData(x, top, g.w, g.h), d = img.data;
    for (let py = 0; py < g.h; py++) for (let px = 0; px < g.w; px++) { const c = g.get(px, py); if (!c || x + px < 0 || x + px >= w) continue; const i = (py * g.w + px) * 4, n = parseInt(c.slice(1), 16); d[i] = n >> 16; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255; d[i + 3] = 255; }
    ctx.putImageData(img, x, top);
  }
  // low stone wall along the bottom of the band (the doors cut through it)
  const wall = new Pixels(w, 18); bricks(wall, 0, 0, w, 18, rnd, 14, 6);
  for (let x = 0; x < w; x += 1) if (rnd() < 0.3) { wall.set(x, 0, '#a4b252'); if (rnd() < 0.5) wall.set(x, 1, '#80903c'); } // grass along the top
  for (let y = 0; y < 18; y++) for (let x = 0; x < w; x++) { ctx.fillStyle = wall.get(x, y)!; ctx.fillRect(x, h - 18 + y, 1, 1); }
  ctx.fillStyle = 'rgba(40, 44, 20, 0.3)'; ctx.fillRect(0, h, w, 6);
}

/** A patch of ground for the village floor, in world px. */
export interface GroundPatch { kind: 'cobble' | 'dirt' | 'scorch'; shape: 'rect' | 'ellipse'; x: number; y: number; w: number; h: number; }

/** Village palette (muted olive, like the Cainos village). */
export const MEADOW = ['#b4c25a', '#a3b24a', '#97a742', '#8a9a3c', '#6e7c30'] as const; // highlight, light, base, shade, dark
const SAND = ['#e8d4a2', '#dcc48e', '#cfb47c', '#b89c66', '#9a8250'] as const;
const OLIVE_HEDGE = [['#c4d070', '#a4b252', '#80903c', '#606e2e'], ['#d0d478', '#b0b858', '#8c9640', '#6a7430'], ['#b0c46a', '#90a84e', '#6e8a3c', '#506a2c']];

/** Flat olive grass with only gentle large patches, sparse tufts, and a few small white and yellow flowers. */
export function paintMeadow(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const n = valueNoise(seed, 90), n2 = valueNoise(seed + 3, 30), rnd = seeded(seed + 7);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const rgb = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const T = MEADOW.map(rgb);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = n(x, y) * 0.8 + n2(x, y) * 0.2, dither = ((x + y) & 1) * 0.02;
    const t = v + dither > 0.7 ? 1 : v + dither < 0.3 ? 3 : 2;
    const i = (y * w + x) * 4; d[i] = T[t][0]; d[i + 1] = T[t][1]; d[i + 2] = T[t][2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const px = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  for (let i = 0; i < w * h / 900; i++) { // tufts: three or four blades
    const x = rnd() * w, y = rnd() * h;
    px(x - 2, y, MEADOW[0]); px(x - 1, y - 1, MEADOW[0]); px(x, y - 2, MEADOW[0]); px(x + 1, y - 1, MEADOW[0]); px(x + 2, y, MEADOW[1]);
    px(x - 1, y + 1, MEADOW[4]); px(x + 1, y + 1, MEADOW[4]); px(x, y + 1, MEADOW[3]);
  }
  for (let i = 0; i < w * h / 2600; i++) { // tiny flowers
    const x = rnd() * w, y = rnd() * h, col = rnd() < 0.7 ? '#f4f0e0' : '#f2d878';
    px(x - 1, y, col); px(x + 1, y, col); px(x, y - 1, col); px(x, y + 1, col); px(x, y, '#e8c048'); px(x + 1, y + 2, MEADOW[4]);
  }
}

/**
 * The village floor at full resolution (w, h, wallTop, wallSide in world px):
 * olive meadow, sandy paths and yards with a soft lighter grass rim and tufts
 * spilling over the edge, worn cobbles, faint scorch, and the village edge along
 * the top. No border on the other sides: the village just carries on off screen.
 */
export function paintVillageFloor(ctx: CanvasRenderingContext2D, w: number, h: number, wallTop: number, wallSide: number, seed: number, patches: GroundPatch[]) {
  paintMeadow(ctx, w, h, seed);
  const rnd = seeded(seed + 31), edge = valueNoise(seed + 5, 10), fine = valueNoise(seed + 6, 3);
  // signed distance-ish: how far inside a patch a point is (negative = outside), with a wobbly edge
  const depth = (p: GroundPatch, x: number, y: number) => {
    const wob = (edge(x, y) - 0.5) * 10 + (fine(x, y) - 0.5) * 3;
    if (p.shape === 'rect') return Math.min(p.w / 2 - Math.abs(x - p.x), p.h / 2 - Math.abs(y - p.y)) + wob;
    const k = Math.sqrt(((x - p.x) / (p.w / 2)) ** 2 + ((y - p.y) / (p.h / 2)) ** 2);
    return (1 - k) * Math.min(p.w, p.h) / 2 + wob;
  };
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const put = (x: number, y: number, c: string) => { const i = (y * w + x) * 4, n = parseInt(c.slice(1), 16); d[i] = n >> 16; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255; };
  const sandy = patches.filter(p => p.kind !== 'scorch'), scorch = patches.filter(p => p.kind === 'scorch');
  const best = new Float32Array(w * h).fill(-99), kindAt = new Uint8Array(w * h);
  for (const p of sandy) {
    const x0 = Math.max(0, Math.floor(p.x - p.w / 2) - 10), x1 = Math.min(w, Math.ceil(p.x + p.w / 2) + 10);
    const y0 = Math.max(0, Math.floor(p.y - p.h / 2) - 10), y1 = Math.min(h, Math.ceil(p.y + p.h / 2) + 10);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const v = depth(p, x, y), i = y * w + x;
      if (p.kind === 'cobble') { if (v > 4) kindAt[i] = 1; if (v > best[i] && best[i] < 0) best[i] = v; } // cobbles sit inside a sandy patch
      else if (v > best[i]) best[i] = v;
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = best[y * w + x]; if (v < -3) continue;
    if (v < 0) { put(x, y, v > -1.5 ? MEADOW[0] : MEADOW[1]); continue; } // a lighter grass rim around paths
    if (v < 1.5) { put(x, y, SAND[3]); continue; }                      // a darker sandy lip just inside
    if (kindAt[y * w + x] === 1) {                              // worn cobbles in the middle of a square
      const row = Math.floor(y / 8), ry = y % 8, sx = x + (row % 2) * 6, tx = sx % 12, stone = (Math.floor(sx / 12) * 7 + row * 13) % 3;
      const T = [['#e0d8c4', '#d2c8b2', '#c0b6a0', '#a49a86'], ['#dcd4c4', '#cec6b4', '#bab2a2', '#a09888'], ['#e2d6c0', '#d4c6ae', '#c2b49c', '#a69882']][stone];
      const corner = (ry === 0 || ry === 6) && (tx === 0 || tx === 10);
      put(x, y, ry === 7 || tx === 11 || corner ? SAND[2] : ry === 0 || tx === 0 ? T[0] : ry === 6 || tx === 10 ? T[3] : T[1]);
      continue;
    }
    const r = rnd(); put(x, y, r < 0.04 ? SAND[0] : r < 0.1 ? SAND[2] : SAND[1]);
  }
  // faint scorch under the fires: darken toward a warm brown, with an ember here and there
  for (const p of scorch) {
    const x0 = Math.max(0, Math.floor(p.x - p.w / 2)), x1 = Math.min(w, Math.ceil(p.x + p.w / 2));
    const y0 = Math.max(0, Math.floor(p.y - p.h / 2)), y1 = Math.min(h, Math.ceil(p.y + p.h / 2));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const dd = ((x - p.x) / (p.w / 2)) ** 2 + ((y - p.y) / (p.h / 2)) ** 2 + (edge(x, y) - 0.5) * 0.5;
      if (dd > 1) continue;
      const i = (y * w + x) * 4, k = (1 - dd) * 0.45;
      d[i] = d[i] * (1 - k) + 70 * k; d[i + 1] = d[i + 1] * (1 - k) + 58 * k; d[i + 2] = d[i + 2] * (1 - k) + 40 * k;
      if (rnd() < 0.002) put(x, y, rnd() < 0.5 ? EMBER[0] : EMBER[1]);
    }
  }
  ctx.putImageData(img, 0, 0);
  // grass tufts poking over path edges
  for (let i = 0; i < w * h / 500; i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), v = best[y * w + x];
    if (v < -1 || v > 3) continue;
    ctx.fillStyle = MEADOW[0]; ctx.fillRect(x, y - 2, 1, 2); ctx.fillRect(x + 2, y - 1, 1, 1);
    ctx.fillStyle = MEADOW[2]; ctx.fillRect(x + 1, y - 1, 1, 2); ctx.fillStyle = MEADOW[4]; ctx.fillRect(x, y, 3, 1);
  }
  paintVillageEdge(ctx, w, wallTop, seed + 1);
  // no hedges on the sides or bottom: the meadow runs to the screen edge and buildings are simply cropped by it
  void wallSide;
}
