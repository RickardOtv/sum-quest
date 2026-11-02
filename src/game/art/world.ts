/**
 * The look of the world (inspired by Cainos' "Pixel Art Top Down" packs):
 * sunny saturated greens, soft 3–4 tone shading lit from the top-left,
 * outlines in a dark shade of the object's own colour instead of black,
 * round leafy trees, blue-grey stones with bright top faces, warm wood,
 * flower patches, and a soft shadow under everything.
 *
 * This file holds the palette, the shading helpers and the ground painter
 * shared by the camp and the run rooms.
 */
import { Pixels } from './pixels';

/* ---------------- palette ---------------- */
export const C = {
  grass: ['#86c25a', '#66a849', '#55933f', '#447c35'] as const,     // highlight, light, base, dark
  dirt: ['#d2bc90', '#bea47a', '#a68a62', '#86704e'] as const,   // light tan, not orange
  stone: ['#c4ccd2', '#9aa6b0', '#76828e', '#56606c'] as const,
  wood: ['#c89058', '#a8743f', '#82562e', '#5e3c20'] as const,
  leaf: [
    ['#9ad35e', '#6cb043', '#4c8c34', '#346a28'],   // fresh green
    ['#b4cf52', '#86b03e', '#5e8c30', '#426a24'],   // yellow-green
    ['#7cc276', '#4fa05a', '#357e44', '#245e34'],   // blue-green
  ] as const,
  flowers: ['#f4f0e8', '#f2d24a', '#f08aa8', '#9ab8f0', '#e86a5a'] as const,
  outlineFor: (dark: string) => shade(dark, -0.35),
};

/** Darken (negative) or lighten (positive) a hex colour. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** Small seeded random so a drawing is the same every time. */
export function seeded(seed: number) { let s = (seed * 9301 + 49297) % 2147483647 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/**
 * A rounded, shaded clump lit from the top-left: highlight rim, light, base,
 * dark underside. `ramp` = [highlight, light, base, dark].
 */
export function clump(g: Pixels, cx: number, cy: number, rx: number, ry: number, ramp: readonly string[], rnd: () => number, rough = 0.1) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1 + (rnd() - 0.5) * rough) continue;
    const l = -nx * 0.45 - ny * 0.85 + (rnd() - 0.5) * 0.2;
    g.set(x, y, l > 0.55 && d > 0.35 ? ramp[0] : l > 0.05 ? ramp[1] : l > -0.5 ? ramp[2] : ramp[3]);
  }
}

/** Outline every filled pixel with a dark shade of its own neighbour (coloured outlines, not black). */
export function softOutline(g: Pixels, fallback: string) {
  const add: [number, number, string][] = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g.get(x, y)) continue;
    const n = g.get(x, y + 1) ?? g.get(x, y - 1) ?? g.get(x - 1, y) ?? g.get(x + 1, y);
    if (n) add.push([x, y, n === fallback ? fallback : shade(n, -0.55)]);
  }
  add.forEach(([x, y, c]) => g.set(x, y, c));
  return g;
}

/* ---------------- ground ---------------- */
/** Smooth 2-D value noise in 0..1, for natural light and dark patches. */
export function valueNoise(seed: number, cell: number) {
  const rnd = seeded(seed), grid = new Map<string, number>();
  const at = (i: number, j: number) => { const k = i + ',' + j; if (!grid.has(k)) grid.set(k, rnd()); return grid.get(k)!; };
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const gx = x / cell, gy = y / cell, i = Math.floor(gx), j = Math.floor(gy), fx = s(gx - i), fy = s(gy - j);
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

/**
 * Paint grass into a canvas context: patchy light/dark areas, tufts, flower
 * clusters and pebbles. `k` = pixels per world unit of detail: 2 paints at
 * full screen resolution (HD), so blades and petals are 1 fine pixel.
 * `avoid(x, y)` can keep spots clear (paths), in the same pixel units.
 */
export function paintGrass(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, seed: number, avoid: (x: number, y: number) => boolean = () => false, k = 1) {
  const n1 = valueNoise(seed, 34 * k), n2 = valueNoise(seed + 7, 11 * k), n3 = valueNoise(seed + 9, 4 * k), rnd = seeded(seed + 13);
  const [hi, light, base, dark] = C.grass, mid = k > 1 ? shade(base, 0.08) : base;
  const img = ctx.getImageData(x0, y0, w, h), d = img.data;
  const rgb = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const T = [light, base, dark, mid, shade(base, -0.07)].map(rgb); // HD adds two in-between tones so patches fade instead of stepping
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = n1(x0 + x, y0 + y) * 0.75 + n2(x0 + x, y0 + y) * 0.17 + (k > 1 ? n3(x0 + x, y0 + y) * 0.08 : 0);
    const c = v > 0.64 ? T[0] : v < 0.26 ? T[2] : k > 1 && v > 0.57 ? T[3] : k > 1 && v < 0.32 ? T[4] : T[1];
    const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, x0, y0);
  const px = (x: number, y: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const area = w * h / (k * k);
  for (let i = 0; i < area / (k > 1 ? 70 : 110); i++) { // tufts: a few light blades with a dark root
    const x = x0 + rnd() * w, y = y0 + rnd() * h; if (avoid(x, y)) continue;
    const c = rnd() < 0.5 ? hi : light;
    if (k > 1) { px(x, y + 3, dark); px(x - 1, y + 2, dark); px(x - 2, y, c); px(x - 1, y + 1, c); px(x, y - 1, c); px(x, y, c); px(x + 1, y + 1, c); px(x + 2, y, c); px(x + 1, y + 2, dark); }
    else { px(x, y, c); px(x + 2, y, c); px(x + 1, y + 1, c); px(x + 1, y + 2, dark); }
  }
  for (let i = 0; i < area / 1800; i++) { // flower clusters
    const cx = x0 + rnd() * w, cy = y0 + rnd() * h; if (avoid(cx, cy)) continue;
    const col = C.flowers[Math.floor(rnd() * C.flowers.length)], colL = shade(col, 0.4), colD = shade(col, -0.2);
    for (let f = 0; f < 3 + rnd() * 4; f++) {
      const fx = cx + (rnd() - 0.5) * 9 * k, fy = cy + (rnd() - 0.5) * 6 * k;
      if (k > 1) { px(fx, fy + 2, dark); px(fx + 1, fy + 3, dark); px(fx - 1, fy, col); px(fx + 1, fy, colD); px(fx, fy - 1, colL); px(fx, fy + 1, colD); px(fx, fy, '#f2d24a'); }
      else { px(fx, fy + 1, dark); px(fx, fy, col); if (rnd() < 0.5) { px(fx - 1, fy, col); px(fx + 1, fy, col); px(fx, fy, '#f2d24a'); } }
    }
  }
  for (let i = 0; i < area / 1400; i++) { // pebbles
    const x = x0 + rnd() * w, y = y0 + rnd() * h; if (avoid(x, y)) continue;
    if (k > 1) { px(x + 1, y, C.stone[0]); px(x, y + 1, C.stone[1]); px(x + 1, y + 1, C.stone[1]); px(x + 2, y + 1, C.stone[2]); px(x + 1, y + 2, C.stone[3]); px(x + 2, y + 2, C.stone[3]); px(x, y + 2, C.stone[2]); }
    else { px(x, y, C.stone[1]); px(x + 1, y, C.stone[2]); px(x, y + 1, C.stone[3]); px(x + 1, y + 1, C.stone[3]); }
  }
}

/** A dirt patch / path pixel with a ragged grass edge (`edge` 0..1 = how close to the border). */
export function dirtColor(x: number, y: number, rnd: () => number): string {
  const r = rnd();
  return r < 0.06 ? C.dirt[0] : r < 0.12 ? C.dirt[2] : r < 0.14 ? C.dirt[3] : C.dirt[1]; // mostly one tone with a few specks
}

/**
 * A wall of round bushes along a band (top, sides or bottom of a room).
 * Bushes are drawn back to front with highlights, berries and flowers, and
 * the front row casts a shadow onto the grass. `k` = 2 paints HD (each bush
 * made of small leaf clusters, lit as one round shape).
 */
export function paintBushWall(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, seed: number, facing: 'down' | 'up' | 'left' | 'right', k = 1,
  ramps: readonly (readonly string[])[] = C.leaf) {
  const rnd = seeded(seed);
  const g = new Pixels(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g.set(x, y, ramps[ramps.length - 1][3]); // dark base so no gaps show through
  const r = Math.max(4 * k, Math.min(9 * k, Math.min(w, h) / 2.2));
  const along = facing === 'down' || facing === 'up' ? w : h, across = facing === 'down' || facing === 'up' ? h : w;
  const rows = Math.max(2, Math.round(across / (r * 1.1)));
  for (let row = 0; row < rows; row++) {
    for (let t = -r; t < along + r; t += r * (1.2 + rnd() * 0.5)) {
      const depth = (row + 0.5) / rows * across + (rnd() - 0.5) * r * 0.6;
      const ramp = ramps[Math.floor(rnd() * ramps.length)];
      const [cx, cy] = facing === 'down' ? [t, depth] : facing === 'up' ? [t, across - depth] : facing === 'right' ? [depth, t] : [across - depth, t];
      const rx = r * (0.9 + rnd() * 0.4), ry = r * (0.8 + rnd() * 0.3);
      if (k > 1) foliage(g, cx, cy, rx, ry, ramp, rnd, 0.9); else clump(g, cx, cy, rx, ry, ramp, rnd, 0.25);
      if (rnd() < 0.18) { const fc = C.flowers[Math.floor(rnd() * C.flowers.length)]; for (const [dx, dy] of [[0, -r * 0.3], [2 * k, 0], [-k * 2, r * 0.2]]) { g.set(Math.round(cx + dx), Math.round(cy + dy), fc); if (k > 1) g.set(Math.round(cx + dx) + 1, Math.round(cy + dy), shade(fc, -0.2)); } }
    }
  }
  // draw it, then the shadow it casts onto the room
  const img = ctx.getImageData(x0, y0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = g.get(x, y); if (!c) continue; const i = (y * w + x) * 4, n = parseInt(c.slice(1), 16); d[i] = n >> 16; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255; d[i + 3] = 255; }
  ctx.putImageData(img, x0, y0);
  ctx.fillStyle = 'rgba(20, 40, 20, 0.35)';
  if (facing === 'down') ctx.fillRect(x0, y0 + h, w, 3 * k);
  if (facing === 'right') ctx.fillRect(x0 + w, y0, 2 * k, h);
  if (facing === 'left') ctx.fillRect(x0 - 2 * k, y0, 2 * k, h);
}

/** A soft round shadow (drawn under every prop and creature). */
export function shadowCanvas(w: number, h: number, alpha = 0.32): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2), d = nx * nx + ny * ny;
    if (d <= 1) { ctx.fillStyle = `rgba(24, 48, 24, ${d < 0.45 ? alpha : alpha * 0.6})`; ctx.fillRect(x, y, 1, 1); }
  }
  return c;
}

/* ---------------- HD helpers (the art is drawn at 2× detail and shown at 1×) ---------------- */
/** A 4-tone ramp plus an extra-bright highlight in front: [shine, highlight, light, base, dark]. */
export const ramp5 = (r: readonly string[]) => [shade(r[0], 0.3), r[0], r[1], r[2], r[3]];

/**
 * A shaded ellipse lit from the top-left using a 5-tone ramp. With `light`,
 * the blob is shaded as part of a bigger form (so many small leaf clusters
 * read as one round canopy, light on top-left, dark under the bottom-right).
 */
export function blob(g: Pixels, cx: number, cy: number, rx: number, ry: number, R: readonly string[], rnd: () => number, rough = 0.1,
  light?: { x: number; y: number; rx: number; ry: number }) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1 + (rnd() - 0.5) * rough) continue;
    let l = -nx * 0.45 - ny * 0.8;
    if (light) l = l * 0.5 + (-(x - light.x) / light.rx * 0.45 - (y - light.y) / light.ry * 0.8) * 0.9 - 0.12;
    l += (rnd() - 0.5) * 0.12;
    g.set(x, y, l > 0.75 && d > 0.2 ? R[0] : l > 0.35 ? R[1] : l > -0.05 ? R[2] : l > -0.5 ? R[3] : R[4]);
  }
}

/** A leafy mass: a few big shaded forms, then many small leaf clusters on top, all lit as one shape. */
export function foliage(g: Pixels, cx: number, cy: number, rx: number, ry: number, ramp: readonly string[], rnd: () => number, leaves = 1,
  light = { x: cx, y: cy, rx, ry }) {
  const R = ramp5(ramp);
  blob(g, cx, cy, rx * 0.95, ry * 0.95, R, rnd, 0.12, light);
  const n = Math.round(rx * ry * 0.22 * leaves), size = Math.max(2, Math.min(rx, ry) / 7);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()), x = cx + Math.cos(a) * r * (rx - size), y = cy + Math.sin(a) * r * (ry - size);
    blob(g, x, y, size + rnd() * size * 0.5, size * 0.85 + rnd() * size * 0.4, R, rnd, 0.3, light);
  }
}

/** Grain: lighten or darken a few random pixels in a box (wood, stone, bark texture). */
export function grain(g: Pixels, rnd: () => number, x0: number, y0: number, w: number, h: number, amount = 0.08, strength = 0.1) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const c = g.get(x, y); if (!c || rnd() > amount) continue;
    g.set(x, y, shade(c, rnd() < 0.5 ? -strength : strength * 0.8));
  }
}

/** A thick stroke along points (branches, roots), shaded light on its left/top side. */
export function stroke(g: Pixels, pts: [number, number][], width: number, R: readonly string[]) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
    const wA = width * (1 - i / pts.length * 0.6), wB = width * (1 - (i + 1) / pts.length * 0.6);
    for (let t = 0; t <= len; t += 0.5) {
      const x = x0 + (x1 - x0) * t / len, y = y0 + (y1 - y0) * t / len, w = (wA + (wB - wA) * t / len) / 2;
      for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
        if (dx * dx + dy * dy > w * w + 0.3) continue;
        const l = (-dx - dy) / (w + 0.01);
        g.set(Math.round(x + dx), Math.round(y + dy), l > 0.5 ? R[1] : l > -0.4 ? R[2] : R[3]);
      }
    }
  }
}

/** A soft shadow at 2× detail (for HD sprites). */
export const shadowHD = (w: number, h: number, alpha = 0.32) => shadowCanvas(w * 2, h * 2, alpha);
