/**
 * Art for the camp hub: trees, the campfire, each station and the people
 * who run them. Same style as the hero: flat colours, 1-px outline, light
 * from the top-left.
 */
import Phaser from 'phaser';
import { Pixels, tone } from './pixels';
import { C, dirtColor, paintGrass, seeded } from './world';
import { drawHero, type Person } from './hero';
import type { HeroLooks } from './hero';
import { adventurerFrame, type Skin } from './adventurer';

const S = (c: string) => tone(c, -0.3), L = (c: string) => tone(c, 0.25);
const WOOD = '#6b4a2e', WOOD_D = '#4a3220', IRON = '#5c6270', STRAW = '#b8a35a';

/** Swap colours in a finished drawing (used to turn the old night scenes into day / dusk). */
function recolor(g: Pixels, map: Record<string, string>) {
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const c = g.get(x, y); if (c && map[c]) g.set(x, y, map[c]); }
  return g;
}
/** Night forest colours → the bright world palette. */
const DAY: Record<string, string> = {
  '#15231a': C.leaf[2][3], '#182a1e': C.leaf[2][2], '#1c3222': C.leaf[0][2], '#1f3a26': C.leaf[0][1],
  [S('#15231a')]: C.wood[3], [S('#182a1e')]: C.wood[3], [S('#1c3222')]: C.wood[2], [S('#1f3a26')]: C.wood[2], '#2a1c14': C.wood[2],
  '#1a2a1e': C.leaf[2][2], '#2b3a28': C.leaf[2][1],
  '#3a3326': C.dirt[2], '#2b3425': C.grass[2], '#36452c': C.grass[3], '#465a33': C.grass[1], '#3a4a2c': C.grass[3],
  '#4d4332': C.dirt[1], '#2e2820': C.dirt[3], '#22291d': C.grass[3], '#2f3a28': C.grass[2],
};

/** A pine tree, 22×30. */
export function drawTree(variant = 0): Pixels {
  const g = new Pixels(22, 30);
  const green = [C.leaf[2][2], C.leaf[0][2], C.leaf[2][2]][variant % 3], dark = C.leaf[[2, 0, 2][variant % 3]][3], light = C.leaf[[2, 0, 2][variant % 3]][1];
  g.rect(9, 18, 4, 12, WOOD_D); g.vline(9, 18, 29, WOOD); g.dots([[10, 27], [11, 25]], S(WOOD_D)); // trunk runs up into the branches
  const layer = (y: number, half: number) => { for (let r = 0; r <= 5; r++) { const w = Math.round((half * (r + 1)) / 6); g.hline(11 - w, 10 + w, y + r, green); } };
  layer(14, 10); layer(8, 8); layer(3, 6); g.dots([[10, 1], [11, 1], [10, 2], [11, 2]], green);
  for (let y = 3; y < 24; y++) for (let x = 1; x < 21; x++) if (g.get(x, y) === green && (x + y * 3) % 7 === 0) g.set(x, y, light);
  for (let y = 3; y < 24; y++) for (let x = 1; x < 21; x++) if (g.get(x, y) === green && x > 12 && (x * 2 + y) % 5 === 0) g.set(x, y, dark);
  g.hline(2, 19, 19, dark); g.hline(4, 17, 13, dark); g.hline(6, 15, 8, dark);
  return g.outline();
}

/** The campfire, two frames so the flame flickers. 18×16. */
export function drawCampfire(frame: 0 | 1): Pixels {
  const g = new Pixels(18, 16);
  g.dots([[1, 13], [2, 12], [3, 12], [4, 13], [13, 12], [14, 12], [15, 13], [16, 13], [6, 14], [11, 14]], '#4c4a44'); // stones
  g.rect(3, 11, 12, 2, WOOD); g.hline(3, 14, 12, WOOD_D); g.rect(6, 9, 2, 5, WOOD_D); g.rect(10, 9, 2, 5, WOOD);
  const F1 = '#e0702a', F2 = '#f3a83a', F3 = '#fff0a0';
  if (frame === 0) { g.rect(6, 6, 6, 5, F1); g.hline(7, 10, 5, F1); g.dots([[8, 3], [9, 4], [5, 8], [12, 7]], F1); g.rect(7, 7, 4, 3, F2); g.dots([[8, 5], [9, 6], [11, 8]], F2); g.dots([[8, 8], [9, 9], [9, 8]], F3); }
  else { g.rect(6, 7, 6, 4, F1); g.hline(7, 10, 6, F1); g.dots([[7, 4], [8, 5], [10, 3], [10, 4], [13, 8], [4, 9]], F1); g.rect(7, 8, 4, 2, F2); g.dots([[8, 6], [10, 5], [7, 7]], F2); g.dots([[8, 9], [9, 9], [9, 8]], F3); }
  return g.outline();
}

/** Anvil on a stump, 18×16. */
export function drawAnvil(): Pixels {
  const g = new Pixels(18, 16);
  g.rect(5, 10, 8, 5, WOOD); g.hline(5, 12, 10, L(WOOD)); g.vline(12, 11, 14, WOOD_D);
  g.rect(3, 4, 12, 3, IRON); g.hline(1, 3, 4, IRON); g.set(1, 5, IRON); g.rect(6, 7, 6, 3, S(IRON));
  g.hline(3, 14, 4, L(IRON)); g.hline(1, 2, 4, L(IRON)); g.vline(14, 5, 6, S(IRON)); g.set(12, 8, L(IRON));
  g.dots([[9, 2], [10, 1]], '#f3a83a'); // a spark
  return g.outline();
}

/** Straw training dummy on a post, 14×26. */
export function drawDummy(): Pixels {
  const g = new Pixels(14, 26);
  g.rect(6, 14, 2, 12, WOOD_D); g.vline(6, 14, 25, WOOD);
  g.rect(4, 7, 6, 8, STRAW); g.hline(2, 11, 9, STRAW); g.rect(1, 9, 2, 2, S(STRAW)); g.rect(11, 9, 2, 2, S(STRAW));
  g.vline(9, 8, 14, S(STRAW)); g.dots([[5, 8], [5, 10], [6, 12]], L(STRAW)); g.hline(4, 9, 11, '#7a5a3a');
  g.rect(5, 2, 4, 5, STRAW); g.hline(5, 8, 2, S(STRAW)); g.dots([[6, 4], [8, 4]], '#2a2030'); g.vline(8, 3, 6, S(STRAW));
  g.dots([[3, 13], [10, 13], [10, 14]], '#d0604f'); // old hit marks
  return g.outline();
}

/** Notice board with pinned notes, 22×22. */
export function drawBoard(): Pixels {
  const g = new Pixels(22, 22);
  g.rect(2, 15, 2, 7, WOOD_D); g.rect(18, 15, 2, 7, WOOD_D); g.vline(2, 15, 21, WOOD); g.vline(18, 15, 21, WOOD);
  g.rect(1, 2, 20, 13, WOOD); g.hline(1, 20, 2, L(WOOD)); g.vline(1, 3, 14, L(WOOD)); g.hline(1, 20, 14, WOOD_D); g.vline(20, 3, 14, WOOD_D);
  g.rect(0, 0, 22, 2, WOOD_D); g.hline(0, 21, 0, WOOD);
  g.rect(3, 4, 6, 6, '#ece4d4'); g.rect(11, 4, 7, 5, '#e6d8b8'); g.rect(4, 10, 8, 4, '#ece4d4');
  g.dots([[4, 5], [5, 5], [6, 5], [4, 7], [5, 7], [12, 5], [13, 5], [14, 5], [15, 5], [12, 7], [13, 7], [5, 11], [6, 11], [7, 11], [8, 11], [5, 12], [6, 12]], '#6a6058');
  g.dots([[5, 4], [14, 4], [7, 10]], '#d0604f'); // pins
  return g.outline();
}

/** The meditation stone: a smooth rock with a glowing rune, 18×14. */
export function drawStone(): Pixels {
  const g = new Pixels(18, 14);
  const R = '#4a4650';
  g.rect(2, 4, 14, 8, R); g.hline(4, 13, 3, R); g.hline(6, 11, 2, R); g.hline(3, 14, 12, S(R)); g.hline(5, 12, 13, S(R));
  g.vline(15, 5, 11, S(R)); g.hline(5, 9, 3, L(R)); g.dots([[3, 5], [4, 4]], L(R));
  g.dots([[8, 5], [9, 5], [7, 6], [10, 6], [8, 7], [9, 7], [8, 8], [9, 9], [7, 10], [10, 10]], '#a68bff'); g.dots([[8, 6], [9, 8]], '#e2d5ff');
  g.dots([[0, 12], [1, 11], [17, 12]], '#3a4a2c'); // grass at the base
  return g.outline();
}

/** Your tent, 36×26. */
export function drawTent(): Pixels {
  const g = new Pixels(36, 26);
  const CV = '#e6d6ae', CD = '#bca67a', CL = '#f6ead0', TRIM = '#c8584a';
  for (let y = 0; y < 22; y++) { const half = Math.round((y + 1) * 0.78); g.hline(17 - half, 18 + half, y + 3, CV); }
  for (let y = 4; y < 25; y++) { const half = Math.round((y - 3) * 0.5); if (half > 0) g.hline(17 - half, 18 + half, y, '#4a3426'); } // opening
  g.rect(14, 12, 8, 13, '#3a281e');
  for (let y = 3; y < 25; y++) { const half = Math.round((y - 2) * 0.78); g.set(17 - half, y, CL); g.set(18 + half, y, CD); g.set(18 + half - 1, y, CD); }
  for (let y = 4; y < 25; y++) { const half = Math.round((y - 3) * 0.5); if (half > 0) { g.set(17 - half, y, TRIM); g.set(18 + half, y, TRIM); } } // red trim round the opening
  g.hline(0, 35, 25, CD); g.dots([[16, 2], [19, 2], [17, 1], [18, 1]], WOOD_D); g.dots([[3, 24], [32, 24]], WOOD);
  g.dots([[17, 0], [18, 0]], TRIM); g.set(18, -1, TRIM); // a little pennant
  g.dots([[6, 18], [7, 18], [28, 16], [29, 16]], '#9a8a62'); // patches
  return g.outline('#4a3426');
}

/**
 * Brannoc's smithy at the edge of the camp: pines behind, a plank lean-to
 * on two posts with tools on the beam, a stone forge with its fire on the
 * left, trampled earth below. 120×84; the anvil and Brannoc are overlaid.
 */
export function drawWorkshop(): Pixels {
  const g = new Pixels(120, 84);
  // night sky and a wall of pines
  g.rect(0, 0, 120, 60, '#0f0d16');
  const pine = (cx: number, top: number, h: number, c: string, ground: number) => { for (let y = 0; y < h; y++) { const half = Math.round(((y + 2) / h) * 7); g.hline(cx - half, cx + half, top + y, c); } g.rect(cx - 1, top + h, 3, Math.max(0, ground - top - h), S(c)); g.vline(cx - 1, top + h, ground - 1, '#2a1c14'); }; // trunk runs down to the ground
  for (let x = -4; x < 126; x += 11) pine(x, 4 + (x * 7) % 9, 34, (x / 11) % 2 ? '#15231a' : '#182a1e', 58);
  for (let x = 2; x < 126; x += 13) pine(x, 18 + (x * 5) % 7, 30, (x / 13) % 2 ? '#1c3222' : '#1f3a26', 58);
  g.rect(0, 50, 120, 9, '#1a2a1e'); for (let i = 0; i < 50; i++) { const x = (i * 29) % 120; g.set(x, 50 + (i * 7) % 8, '#2b3a28'); } // undergrowth down to the ground, so the pines stand in it
  // ground: trampled earth with a few tufts and flagstones by the anvil
  g.rect(0, 58, 120, 26, '#3a3326'); g.hline(0, 119, 58, '#2b3425');
  for (let x = 0; x < 120; x += 3) if ((x * 7) % 5 === 0) g.set(x, 59 + (x % 4), '#465a33');
  for (let i = 0; i < 40; i++) g.set((i * 37) % 120, 62 + (i * 11) % 20, (i % 2) ? '#4d4332' : '#2e2820');
  [[70, 72], [84, 76], [98, 70], [106, 78], [78, 80]].forEach(([x, y]) => { g.rect(x, y, 9, 4, '#4a4250'); g.hline(x, x + 8, y, '#5c5460'); });
  // the stone forge: a waist-high block of stones with the fire on top, a bellows beside it
  const ST = '#4a4248', STL = '#5c5458', STD = '#38303a';
  g.rect(6, 40, 46, 20, ST); g.hline(6, 51, 40, STL); g.vline(51, 41, 59, STD);
  for (let y = 42; y < 60; y += 5) for (let x = (y / 5) % 2 ? 8 : 12; x < 50; x += 8) g.hline(x, x + 5, y, STD);
  g.rect(10, 36, 38, 5, '#2a2026'); g.hline(10, 47, 36, '#3a2e30'); // the coal bed
  g.rect(11, 26, 36, 12, '#c0501e'); g.rect(13, 16, 32, 11, '#e0702a'); g.rect(17, 8, 24, 9, '#e0702a'); g.rect(21, 3, 16, 6, '#e0702a');
  g.dots([[19, 2], [28, 0], [36, 1], [41, 5], [9, 22], [48, 24], [14, 12], [44, 11], [25, 1], [32, 0]], '#e0702a');
  g.rect(16, 28, 26, 9, '#f3a83a'); g.rect(19, 18, 20, 11, '#f3a83a'); g.rect(23, 10, 12, 9, '#f3a83a'); g.dots([[27, 6], [31, 5], [29, 3]], '#f3a83a');
  g.rect(21, 31, 16, 6, '#fff0a0'); g.rect(25, 22, 8, 10, '#fff0a0'); g.dots([[28, 16], [30, 14], [29, 12]], '#fff0a0');
  g.rect(16, 36, 26, 2, '#5a3a24'); g.dots([[18, 35], [36, 35], [28, 37]], '#8a5a34'); // logs
  g.rect(54, 48, 12, 7, '#5a3a24'); g.hline(54, 65, 48, '#7a5234'); g.vline(66, 49, 53, '#3a2418'); g.hline(66, 70, 51, IRON); // bellows
  // the lean-to (drawn last: it's overhead, so it covers the tops of the flames)
  g.rect(8, 14, 3, 46, WOOD_D); g.rect(108, 10, 3, 50, WOOD_D); g.vline(8, 14, 59, WOOD); g.vline(108, 10, 59, WOOD);
  for (let i = 0; i < 6; i++) { const y = 4 + i * 2; g.hline(2 + i * 2, 118, y, i % 2 ? '#5a3c24' : '#6b4a2e'); }
  g.hline(2, 118, 16, '#4a3220'); g.hline(4, 116, 17, WOOD_D); // the beam
  g.rect(0, 2, 120, 2, '#2a1c12');
  // tools hung from the beam: hammer, tongs, a saw blade, a mallet
  g.vline(62, 18, 30, WOOD); g.rect(59, 17, 7, 3, IRON); g.hline(59, 65, 17, L(IRON));
  g.vline(74, 18, 32, IRON); g.vline(76, 18, 32, IRON); g.dots([[73, 33], [77, 33]], S(IRON));
  g.vline(88, 18, 34, IRON); g.rect(86, 18, 5, 2, L(IRON)); g.dots([[87, 35], [89, 35]], S(IRON));
  g.vline(100, 18, 26, WOOD); g.rect(97, 26, 7, 4, S(IRON));
  // a water barrel for quenching, a bucket
  g.rect(94, 44, 11, 15, '#5a4030'); g.hline(94, 104, 44, '#7a5a44'); g.hline(94, 104, 49, IRON); g.hline(94, 104, 55, IRON); g.rect(95, 45, 9, 2, '#3a5a7a');
  g.rect(110, 52, 7, 7, '#4a4a52'); g.hline(110, 116, 52, '#6a6a74');
  return recolor(g, { ...DAY, '#0f0d16': '#9ad0ec' }); // a sunny day in the woods
}

/** Ysolde's training yard: pines, a rope fence, a straw target with arrows, a weapon rack, worn grass. 120×84. */
export function drawYard(): Pixels {
  const g = new Pixels(120, 84);
  g.rect(0, 0, 120, 60, '#0f0d16');
  const pine = (cx: number, top: number, h: number, c: string, ground: number) => { for (let y = 0; y < h; y++) { const half = Math.round(((y + 2) / h) * 7); g.hline(cx - half, cx + half, top + y, c); } g.rect(cx - 1, top + h, 3, Math.max(0, ground - top - h), S(c)); g.vline(cx - 1, top + h, ground - 1, '#2a1c14'); }; // trunk runs down to the ground
  for (let x = -4; x < 126; x += 11) pine(x, 4 + (x * 7) % 9, 34, (x / 11) % 2 ? '#15231a' : '#182a1e', 56);
  for (let x = 2; x < 126; x += 13) pine(x, 18 + (x * 5) % 7, 30, (x / 13) % 2 ? '#1c3222' : '#1f3a26', 56);
  g.rect(0, 48, 120, 9, '#1a2a1e'); for (let i = 0; i < 50; i++) { const x = (i * 29) % 120; g.set(x, 50 + (i * 7) % 8, '#2b3a28'); } // undergrowth down to the ground, so the pines stand in it
  // worn grass with bare patches
  g.rect(0, 56, 120, 28, '#2b3425'); g.hline(0, 119, 56, '#36452c');
  [[10, 62, 30, 8], [50, 70, 40, 7], [84, 60, 24, 6]].forEach(([x, y, w, h]) => g.rect(x, y, w, h, '#3a3326'));
  for (let i = 0; i < 60; i++) { const x = (i * 41) % 120, y = 58 + (i * 13) % 24; if (g.get(x, y) === '#2b3425') { g.set(x, y, '#465a33'); g.set(x, y + 1, '#3a4a2c'); } }
  // rope fence along the back
  [6, 36, 66, 96].forEach(x => { g.rect(x, 40, 3, 18, WOOD_D); g.vline(x, 40, 57, WOOD); g.hline(x, x + 2, 40, L(WOOD)); });
  for (let x = 8; x < 96; x++) { g.set(x, 45 + Math.round(Math.sin(((x - 8) % 30) / 30 * Math.PI) * 2), '#b8a35a'); g.set(x, 52 + Math.round(Math.sin(((x - 8) % 30) / 30 * Math.PI) * 2), '#a89050'); }
  // straw target on a stand with two arrows in it
  g.rect(88, 20, 4, 40, WOOD_D); g.vline(88, 20, 59, WOOD); g.hline(80, 100, 60, WOOD_D);
  for (let r = 11; r > 0; r -= 1) { const c = r > 9 ? '#c9b86a' : r > 7 ? '#d0604f' : r > 5 ? '#ece4d4' : r > 3 ? '#d0604f' : r > 1 ? '#ece4d4' : '#d0604f'; for (let y = -r; y <= r; y++) { const half = Math.round(Math.sqrt(r * r - y * y)); g.hline(90 - half, 90 + half, 30 + y, c); } }
  g.hline(70, 88, 27, WOOD); g.dots([[69, 26], [69, 28], [70, 27]], '#c9c0b0'); g.hline(74, 91, 33, WOOD); g.dots([[73, 32], [73, 34]], '#c9c0b0');
  // a weapon rack with two wooden swords and a staff
  g.rect(14, 30, 26, 2, WOOD); g.rect(14, 44, 26, 2, WOOD); g.rect(14, 30, 2, 28, WOOD_D); g.rect(38, 30, 2, 28, WOOD_D);
  g.vline(20, 24, 56, '#8a6a44'); g.rect(19, 36, 3, 2, WOOD_D); g.vline(28, 26, 56, '#8a6a44'); g.rect(27, 38, 3, 2, WOOD_D); g.vline(34, 22, 56, '#6b4a2e'); g.set(34, 21, '#a68bff');
  // a water trough and a rolled mat
  g.rect(100, 68, 16, 7, '#5a4030'); g.hline(100, 115, 68, '#7a5a44'); g.rect(101, 69, 14, 2, '#3a5a7a');
  g.rect(4, 70, 14, 5, '#8a6a7a'); g.hline(4, 17, 70, '#a08a9a'); g.dots([[6, 72], [10, 72], [14, 72]], '#6a4a5a');
  return recolor(g, { ...DAY, '#0f0d16': '#a8d8f0' });
}

/** The meditation clearing: an old standing stone circle, a lit brazier, lanterns, mist. 120×84. */
export function drawShrine(): Pixels {
  const g = new Pixels(120, 84);
  g.rect(0, 0, 120, 60, '#0f0d16');
  // stars and a thin moon
  [[8, 6], [22, 12], [40, 4], [57, 9], [75, 3], [96, 8], [111, 14], [30, 20], [88, 18]].forEach(([x, y]) => g.set(x, y, '#c9c0d8'));
  g.dots([[100, 20], [101, 19], [102, 19], [103, 20], [103, 21], [102, 23], [101, 24], [100, 24], [104, 22]], '#ece4d4');
  const pine = (cx: number, top: number, h: number, c: string, ground: number) => { for (let y = 0; y < h; y++) { const half = Math.round(((y + 2) / h) * 7); g.hline(cx - half, cx + half, top + y, c); } g.rect(cx - 1, top + h, 3, Math.max(0, ground - top - h), S(c)); g.vline(cx - 1, top + h, ground - 1, '#2a1c14'); }; // trunk runs down to the ground
  for (let x = -4; x < 126; x += 12) pine(x, 22 + (x * 7) % 7, 30, (x / 12) % 2 ? '#15231a' : '#182a1e', 52);
  g.rect(0, 46, 120, 7, '#1a2a1e'); for (let i = 0; i < 50; i++) { const x = (i * 29) % 120; g.set(x, 50 + (i * 7) % 8, '#2b3a28'); } // undergrowth down to the ground, so the pines stand in it
  // mossy ground and mist
  g.rect(0, 52, 120, 32, '#22291d'); g.hline(0, 119, 52, '#2b3425');
  for (let i = 0; i < 70; i++) { const x = (i * 43) % 120, y = 54 + (i * 17) % 28; g.set(x, y, (i % 3) ? '#2f3a28' : '#3a4a2c'); }
  for (let x = 0; x < 120; x++) if ((x * 5) % 7 < 3) g.hline(x, x + 1, 50 + (x % 3), '#2a2a3a');
  // the stone circle: tall menhirs with faint runes
  const R = '#4a4650', RL = '#5c5864', RD = '#38343e', RUNE = '#a68bff';
  [[10, 24, 9, 32], [30, 18, 10, 38], [80, 18, 10, 38], [102, 24, 9, 32]].forEach(([x, y, w, h], i) => {
    g.rect(x, y, w, h, R); g.vline(x, y + 1, y + h - 1, RL); g.vline(x + w - 1, y + 1, y + h - 1, RD); g.hline(x + 1, x + w - 2, y, RL); g.hline(x, x + w - 1, y + h - 1, RD);
    g.dots([[x + 3, y + 8], [x + 4, y + 9], [x + 3, y + 11], [x + 5, y + 13 + i]], RUNE);
  });
  // the central altar stone with the glowing rune (the player meditates here)
  g.rect(44, 42, 32, 14, R); g.hline(46, 73, 41, RL); g.hline(44, 75, 55, RD); g.vline(75, 42, 54, RD);
  // a brazier and two lanterns
  g.rect(58, 24, 6, 4, IRON); g.vline(60, 28, 40, IRON); g.rect(57, 40, 8, 2, S(IRON)); g.rect(59, 20, 4, 4, '#e0702a'); g.dots([[60, 18], [62, 19], [61, 22]], '#f3a83a');
  [[20, 48], [96, 48]].forEach(([x, y]) => { g.rect(x, y, 5, 7, IRON); g.rect(x + 1, y + 1, 3, 4, '#f3a83a'); g.set(x + 2, y + 2, '#fff0a0'); g.rect(x + 1, y - 2, 3, 2, S(IRON)); });
  // candles on the ground
  [[38, 60], [84, 62], [50, 66], [70, 64]].forEach(([x, y]) => { g.rect(x, y, 2, 3, '#ece4d4'); g.set(x, y - 1, '#f3a83a'); });
  // a magical violet dusk: still green, but the sky glows and the mist is light
  return recolor(g, { ...DAY, '#0f0d16': '#6a5aa0', '#2a2a3a': '#b8b0d8', '#c9c0d8': '#f4f0e8',
    '#4a4650': '#8a909c', '#5c5864': '#aab2bc', '#38343e': '#626a76' });
}

/* ---------------- the people ---------------- */
export interface Npc { id: string; name: string; person: Person; looks: HeroLooks; lines: string[]; skin: Skin; }
export const NPCS: Record<string, Npc> = {
  smith: {
    id: 'smith', name: 'Brannoc', person: { skin: '#b8865c', hair: '#2a1e1a', style: 'bald', beard: true },
    looks: { armor: { style: 'jerkin', main: '#5a3c2a', accent: '#8a6a44' }, gloves: { style: 'gauntlets', main: '#4a4a52', accent: '#7a7a84' }, pants: { style: 'trousers', main: '#3a3230', accent: '#2a2420' }, boots: { style: 'boots', main: '#3a2a1e', accent: '#5a4432' } },
    lines: ['Steel\'s hot. You bring the sums.', 'Wrong sum, cracked steel. Right sum, it sings.', 'I swing the hammer. You do the counting.'],
    skin: { looks: { armor: { style: 'jerkin', main: '#5a3c2a', accent: '#8a6a44' }, gloves: { style: 'gauntlets', main: '#4a4a52', accent: '#7a7a84' }, pants: { style: 'trousers', main: '#3a3230', accent: '#2a2420' }, boots: { style: 'boots', main: '#3a2a1e', accent: '#5a4432' } }, hair: '#2a1e1a', hideWeapon: true },
  },
  trainer: {
    id: 'trainer', name: 'Ysolde', person: { skin: '#e8b48c', hair: '#8a3a2a', style: 'bun' },
    looks: { armor: { style: 'tunic', main: '#3e5a3a', accent: '#6a8a4a' }, gloves: { style: 'wraps', main: '#c8b898', accent: '#a89878' }, pants: { style: 'trousers', main: '#4a4030', accent: '#3a3020' }, boots: { style: 'boots', main: '#4a3020', accent: '#6a4a32' } },
    lines: ['Fast hands, faster head. Ready?', 'Sixty seconds. Show me.', 'A shortcut is a spell written cleaner.'],
    skin: { looks: { armor: { style: 'tunic', main: '#3e5a3a', accent: '#6a8a4a' }, gloves: { style: 'wraps', main: '#c8b898', accent: '#a89878' }, pants: { style: 'trousers', main: '#4a4030', accent: '#3a3020' }, boots: { style: 'boots', main: '#4a3020', accent: '#6a4a32' } }, hair: '#8a3a2a' },
  },
  monk: {
    id: 'monk', name: 'Old Ferrin', person: { skin: '#caa078', hair: '#b8b4b0', style: 'long', beard: true },
    looks: { armor: { style: 'robe', main: '#5a4a6a', accent: '#8a7aa8' }, boots: { style: 'sandals', main: '#5a4432', accent: '#3a2a20' } },
    lines: ['Sit. Spells are written on this stone.', 'A true sum has weight. A false one, none.', 'The stone cracked once. We mend it one number at a time.'],
    skin: { looks: { armor: { style: 'robe', main: '#5a4a6a', accent: '#8a7aa8' }, pants: { style: 'trousers', main: '#4a4060', accent: '#3a3050' }, boots: { style: 'sandals', main: '#5a4432', accent: '#3a2a20' }, free: { style: 'cloak', main: '#3a2e4a', accent: '#5a4a6a' } }, hair: '#b8b4b0', hideWeapon: true },
  },
};

export const drawNpc = (n: Npc) => drawHero(n.looks, n.person);
/** The character in the camp panels: the sprite's idle pose in that person's colours. */
export const npcCanvas = (n: Npc, scale = 4) => adventurerFrame(n.skin, 'idle', 'down', 0, scale);

/* ---------------- ground ---------------- */
/** Camp ground: trampled earth around the fire, grass, a path north into the forest. */
/**
 * The camp ground: sunny grass, a trampled dirt clearing around the fire, the
 * path north into the woods, and worn ground at each station. Painted at
 * full resolution (HD); fireX/fireY and `spots` are in world px.
 */
export function paintCampGround(scene: Phaser.Scene, key: string, w: number, h: number, fireX: number, fireY: number, seed: number, spots: [number, number][] = []) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const rnd = seeded(seed);
  // where the dirt goes: the clearing, the path north, and a footpath to every station
  const wob = (t: number, k: number) => Math.sin(t / 9 + k) * 1.6;
  fireX /= 2; fireY /= 2; spots = spots.map(([x, y]) => [x / 2, y / 2]); // the shapes below are in half units
  const onPath = (hx: number, hy: number) => {
    const x = hx / 2, y = hy / 2;
    if (Math.hypot((x - fireX) / 1.3, y - fireY) < 22 + wob(x + y, 1)) return true;
    if (y < fireY && Math.abs(x - fireX - Math.sin(y / 11) * 2.5) < 6 + wob(y, 2)) return true;
    for (const [sx, sy] of spots) if (Math.hypot((x - sx) / 1.4, y - sy) < 8 + wob(x * 0.7 + y, 3)) return true; // worn ground at each station
    return false;
  };
  paintGrass(ctx, 0, 0, w, h, seed, onPath, 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!onPath(x, y)) continue;
    const edge = !onPath(x - 1, y) || !onPath(x + 1, y) || !onPath(x, y - 1) || !onPath(x, y + 1);
    ctx.fillStyle = edge ? (rnd() < 0.5 ? C.grass[3] : C.dirt[3]) : dirtColor(x, y, rnd);
    ctx.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 40; i++) { // pebbles in the clearing
    const a = rnd() * Math.PI * 2, d = 8 + rnd() * 18, x = Math.round((fireX + Math.cos(a) * d * 1.25) * 2), y = Math.round((fireY + Math.sin(a) * d) * 2);
    ctx.fillStyle = C.stone[1]; ctx.fillRect(x, y, 2, 1); ctx.fillStyle = C.stone[3]; ctx.fillRect(x, y + 1, 2, 1); ctx.fillStyle = C.stone[0]; ctx.fillRect(x, y, 1, 1);
  }
  scene.textures.addCanvas(key, c);
}

/** Warm radial glow for the fire (additive blend). */
export function glowCanvas(size = 96, color = '255,150,60'): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${color},0.55)`); g.addColorStop(0.5, `rgba(${color},0.18)`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return c;
}
