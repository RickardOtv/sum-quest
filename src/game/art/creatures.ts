/**
 * Enemies drawn at 2× detail (HD) in the same bright, softly shaded style as
 * the props. Regular enemies are 32×32 and bosses 64×64 (or bigger), all shown
 * at scale 1. The feet sit about 3/4 of the way down (sprite origin 0.5, 0.75).
 * Side-view creatures face right and are flipped when they run left.
 */
import { Pixels } from './pixels';
import { C, blob, foliage, grain, ramp5, seeded, shade, softOutline, stroke } from './world';

const EYE_DARK = '#1a1626';

/** Two-pixel eye with a white glint. */
function eye(g: Pixels, x: number, y: number, col = EYE_DARK, h = 3) {
  g.rect(x, y, 2, h, col); g.set(x, y, '#ffffff');
}

/** Blue slime, 32×32: a glossy jelly dome with a shine and a little face. */
export function drawSlime(): Pixels {
  const rnd = seeded(3), g = new Pixels(32, 32), R = ['#d8f0ff', '#8cc8f0', '#5aa0dc', '#3a78b8', '#28548c'];
  for (let y = 9; y < 30; y++) for (let x = 2; x < 30; x++) {
    const nx = (x + 0.5 - 16) / 14, ny = (y + 0.5 - 22) / (y < 22 ? 13 : 8), d = nx * nx + ny * ny; if (d > 1) continue;
    const l = -nx * 0.4 - ny * 0.7 + (rnd() - 0.5) * 0.06;
    g.set(x, y, l > 0.55 ? R[1] : l > 0.1 ? R[2] : l > -0.4 ? R[3] : R[4]);
  }
  for (let y = 12; y < 16; y++) for (let x = 7; x < 13; x++) if (((x - 10) / 2.6) ** 2 + ((y - 13.6) / 1.8) ** 2 < 1) g.set(x, y, R[0]);
  g.set(14, 12, R[0]); g.set(23, 25, R[1]); // shine + a bubble
  eye(g, 11, 19, '#1a2a44', 4); eye(g, 19, 19, '#1a2a44', 4);
  g.hline(14, 17, 24, '#1a2a44');
  return softOutline(g, '#1a3050');
}

/** Spore-cap, 32×32: a red toadstool with white spots, gills, and a little face on its stem. */
export function drawSpore(): Pixels {
  const rnd = seeded(41), g = new Pixels(32, 32), CAP = ['#ff9a88', '#e0645a', '#b84a40', '#8a3b36', '#5e2724'], STEM = ['#fff4e0', '#ecdcbc', '#d8c8a8', '#b8a684'];
  for (let y = 15; y < 30; y++) for (let x = 9; x < 23; x++) { const t = (x - 9) / 13; g.set(x, y, y > 27 ? STEM[3] : t < 0.25 ? STEM[0] : t < 0.7 ? STEM[1] : STEM[2]); } // stem
  g.hline(7, 24, 29, STEM[3]); g.hline(8, 23, 28, STEM[2]); // a foot
  blob(g, 16, 11, 14, 8.5, CAP, rnd, 0.04);
  for (let x = 4; x < 28; x++) { g.set(x, 17, CAP[4]); if (x % 2) g.set(x, 18, '#c9b08c'); } // gills under the rim
  for (const [x, y, r] of [[10, 7, 2], [20, 6, 1.6], [16, 12, 1.4], [24, 11, 1.4], [7, 12, 1.2]] as [number, number, number][])
    for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= r * r + 0.5) g.set(x + xx, y + yy, xx + yy < 0 ? '#ffffff' : '#ece4dc');
  eye(g, 12, 21); eye(g, 18, 21); g.hline(14, 17, 25, '#7a5a4a');
  return softOutline(g, '#3e1a14');
}

/** Wisp (a dusk bat), 32×32: violet membrane wings, round body, two amber eyes. */
export function drawWisp(): Pixels {
  const rnd = seeded(62), g = new Pixels(32, 32), V = ['#c8b4e8', '#a088c8', '#7d6a92', '#5a4a6a', '#3e3250'];
  for (const s of [-1, 1]) { // wings
    for (let y = 8; y < 24; y++) for (let x = 0; x < 16; x++) {
      const wx = s < 0 ? x : 31 - x, u = x / 15, top = 9 + u * 4 + Math.sin(u * 3) * 1.5, bottom = 22 - Math.abs(Math.sin(u * 7.5)) * 5 * (1 - u * 0.3);
      if (y < top || y > bottom || u > 0.8) continue;
      g.set(wx, y, y < top + 1.5 ? V[2] : (x % 5 === 0) ? V[4] : V[3]);
    }
    stroke(g, [[s < 0 ? 12 : 19, 14], [s < 0 ? 5 : 26, 10], [s < 0 ? 0 : 31, 8]], 2, V);
  }
  blob(g, 16, 17, 7, 7, V, rnd, 0.05);
  g.dots([[12, 10], [13, 11], [19, 10], [18, 11]], V[3]); // ears
  for (const x of [12, 18]) { g.rect(x, 15, 3, 3, '#f2c94c'); g.set(x, 15, '#fff4c0'); g.set(x + 2, 17, '#b8862a'); }
  g.dots([[14, 21], [17, 21]], '#f4f0e8'); // fangs
  return softOutline(g, '#221a30');
}

/** A boar seen from the side, facing right, at any size (`k` = 1 for 32×32, 2 for 64×64). */
function boar(k: number, fur: readonly string[], back: readonly string[], eyeCol: string, tusk: string, rnd: () => number): Pixels {
  const g = new Pixels(32 * k, 32 * k), F = ramp5(fur), s = (v: number) => v * k;
  for (const [x, back2] of [[7, 0], [11, 1], [20, 0], [24, 1]] as [number, number][]) { // legs, far ones darker
    for (let y = s(21); y < s(28); y++) for (let xx = 0; xx < s(3); xx++) g.set(s(x) + xx, y, back2 ? F[4] : xx < k ? F[2] : F[3]);
    g.rect(s(x), s(27), s(3), k, '#3a2a22');
  }
  blob(g, s(15), s(17), s(11), s(6.5), F, rnd, 0.05); // body
  blob(g, s(26), s(17), s(4.5), s(4.5), F, rnd, 0.05); // head
  for (let y = s(17); y < s(21); y++) for (let x = s(28); x < s(31); x++) g.set(x, y, y < s(18) ? shade(fur[1], 0.1) : fur[2]); // snout
  g.rect(s(30), s(18), k, k, '#3a2a22');
  for (let t = 0; t < 4 * k; t++) { g.set(s(27) + Math.round(t * 0.4), s(21) - Math.round(t * 0.7), tusk); } // tusk
  g.rect(s(26), s(15), k + 1, k + 1, eyeCol); g.set(s(26), s(15), '#ffffff');
  g.dots([[s(23), s(11)], [s(24), s(10)], [s(24), s(11)]], F[3]); // ear
  // brambles / moss along the back
  for (let x = 6; x < 24; x += 3) { const top = s(10.5) - Math.round(Math.sin(x) * k); stroke(g, [[s(x), s(12)], [s(x) + k, top - 2 * k]], 1.6 * k, ramp5(back)); g.set(s(x) + k, top - 2 * k, back[0]); }
  foliage(g, s(14), s(12), s(9), s(2.5), back, rnd, 0.8);
  grain(g, rnd, s(4), s(10), s(24), s(12), 0.08, 0.12);
  return softOutline(g, '#221810');
}

/** Thornback boar, 32×32. */
export const drawBoar = () => boar(1, ['#b08a6a', '#8a6a52', '#6a4e3a', '#46332a'], C.leaf[0], '#e0505a', '#ece0c4', seeded(125));
/** Old Tusk, 64×64: grey with age, moss on its back, a gold eye, big tusks. */
export const drawTusk = () => boar(2, ['#a8a49a', '#86827a', '#5c5a54', '#3a3936'], ['#86a04f', '#6f8c48', '#4f6a35', '#3e5226'], '#f2c94c', '#fff4d8', seeded(130));

/** Old Rootback, 64×64: a walking stump with glowing eyes, a mossy leaf crown and root feet. */
export function drawRootback(): Pixels {
  const rnd = seeded(84), g = new Pixels(64, 64), BK = ['#b08868', '#8a6a4e', '#6a4e38', '#4e3828', '#33241b'];
  for (const [pts, w] of [[[[16, 52], [10, 58], [4, 60]], 6], [[[24, 55], [21, 61]], 6], [[[40, 55], [43, 61]], 6], [[[48, 52], [54, 58], [60, 60]], 6]] as [[number, number][], number][]) stroke(g, pts, w, BK);
  for (let y = 18; y < 56; y++) for (let x = 12; x < 52; x++) { // the trunk body, slightly round
    const t = (x - 12) / 39, bulge = Math.abs(t - 0.5) * 2; if (bulge > 0.97 && (y < 22 || y > 52)) continue;
    g.set(x, y, t < 0.12 ? BK[1] : t < 0.45 ? BK[2] : t < 0.8 ? BK[3] : BK[4]);
  }
  for (let i = 0; i < 70; i++) { const x = 13 + Math.floor(rnd() * 37), y = 20 + Math.floor(rnd() * 34); g.vline(x, y, Math.min(55, y + 3 + Math.floor(rnd() * 6)), rnd() < 0.7 ? BK[4] : BK[1]); }
  // face: angry brow, glowing eyes, a dark mouth with wooden teeth
  for (const [x, dir] of [[20, 1], [36, -1]] as [number, number][]) {
    for (let i = 0; i < 9; i++) { g.set(x + i, 28 + Math.round((dir > 0 ? i : 8 - i) * 0.35), BK[4]); g.set(x + i, 29 + Math.round((dir > 0 ? i : 8 - i) * 0.35), BK[4]); }
    g.rect(x + 1, 31, 7, 4, '#1e140e'); g.rect(x + 2, 32, 5, 2, '#f2c94c'); g.rect(x + 3, 32, 2, 1, '#fff4c0');
  }
  g.rect(22, 40, 20, 8, '#1e140e'); g.rect(23, 41, 18, 6, '#2e1a12');
  for (let x = 24; x < 41; x += 4) { g.rect(x, 40, 2, 3, CUTW); g.rect(x + 2, 45, 2, 2, CUTW); }
  // the crown: moss and leaves
  const light = { x: 30, y: 12, rx: 26, ry: 10 };
  [[20, 14, 12, 8], [44, 14, 12, 8], [32, 9, 14, 8], [32, 17, 20, 6]].forEach(([x, y, rx, ry]) => foliage(g, x, y, rx, ry, C.leaf[0], rnd, 1, light));
  for (let i = 0; i < 7; i++) { const x = 14 + Math.floor(rnd() * 36), y = 18 + Math.floor(rnd() * 4); g.vline(x, y, y + 2 + Math.floor(rnd() * 4), C.leaf[0][2]); } // moss dripping
  return softOutline(g, '#191521');
}
const CUTW = '#e0c898';

/** Every Thornwood enemy texture (HD). */
export function creatureCanvases(): Record<string, HTMLCanvasElement> {
  return {
    slime: drawSlime().toCanvas(), spore: drawSpore().toCanvas(), wisp: drawWisp().toCanvas(),
    boar: drawBoar().toCanvas(), tusk: drawTusk().toCanvas(), rootback: drawRootback().toCanvas(),
  };
}
