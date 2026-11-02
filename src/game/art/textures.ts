/**
 * Turns the text sprites into Phaser textures, and paints the few
 * procedural textures (floor, slashes, bullets, door, vignette).
 */
import Phaser from 'phaser';
import { ICONS, spriteCanvas } from './sprites';
import { creatureCanvases } from './creatures';
import { propCanvases } from './props';
import { paintVillageFloor, type GroundPatch } from './village';
import { villageCanvases } from './villagehd';
import { paintBushWall, paintGrass, shadowCanvas } from './world';
import { drawWeapon, heroFrames, type HeroLooks } from './hero';
import type { Look } from '../items';

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d')! };
};

export function buildTextures(scene: Phaser.Scene) {
  const tex = scene.textures;
  const add = (key: string, c: HTMLCanvasElement) => { if (!tex.exists(key)) tex.addCanvas(key, c); };

  Object.entries(creatureCanvases()).forEach(([k, c]) => add(k, c)); // Thornwood's enemies (HD)
  add('bullet_thorn', orb('#6f8c48', '#c8e09a'));
  Object.entries(ICONS).forEach(([k, s]) => add(`icon_${k}`, spriteCanvas(s)));

  add('bullet_spore', orb('#c9b86a', '#f4ecb8'));
  add('bullet_wisp', orb('#9a6fc8', '#e2ccff'));
  add('bullet_boss', orb('#d6874a', '#ffd9a8'));
  add('crit', critOrb());
  add('coin', spriteCanvas(ICONS.gold));
  pixel(tex);
  add('shadow', shadow());
  add('door', door());
  add('door_boss', bossGate());
  add('door_mini', miniGate());
  Object.entries(propCanvases()).forEach(([k, c]) => add(k, c));
  Object.entries(villageCanvases()).forEach(([k, c]) => add(k, c)); // Emberfall: houses, fire, its creatures
  // soft cast shadows (light from the top-left, so they fall to the lower right), one per prop and its mirror
  for (const key of tex.getTextureKeys()) {
    if (!/^(prop_|vh_)/.test(key) || /flowers|shadow|pit|fire|ash|tuft|smoke/.test(key)) continue;
    const src = tex.get(key).getSourceImage() as HTMLCanvasElement;
    add(`sh_${key}`, castShadow(src, false)); add(`shf_${key}`, castShadow(src, true));
  }
  add('bullet_fire', orb('#e0602a', '#ffe08a'));
}

/**
 * (Re)build the hero, weapon and slash textures from the current gear.
 * Hero textures: hero_0..2 (standing, left step, right step) and heroB_0..2 seen from behind.
 */
export function buildHeroTextures(scene: Phaser.Scene, looks: HeroLooks, weapon: Look) {
  const set = (key: string, c: HTMLCanvasElement) => { if (scene.textures.exists(key)) scene.textures.remove(key); scene.textures.addCanvas(key, c); };
  const front = heroFrames(looks);
  front.forEach((f, i) => set(`hero_${i}`, f.toCanvas()));
  heroFrames(looks, undefined, { back: true }).forEach((f, i) => set(`heroB_${i}`, f.toCanvas()));
  set('hero', front[0].toCanvas()); // plain standing frame, used by after-images
  set('weapon', drawWeapon(weapon).toCanvas());
  set('slash', slash(weapon.extra ?? weapon.main));
}

/** A crescent-shaped sword slash. */
function slash(color: string) {
  const { c, ctx } = canvas(16, 16);
  ctx.fillStyle = color;
  // crescent = big circle minus offset circle, drawn as pixels for a crisp look
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d1 = Math.hypot(x - 7.5, y - 7.5), d2 = Math.hypot(x - 4.5, y - 7.5);
    if (d1 < 7 && d2 > 6.2) ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff';
  for (let y = 4; y < 12; y++) { ctx.fillRect(13, y, 1, 1); }
  return c;
}

function orb(outer: string, inner: string) {
  const { c, ctx } = canvas(8, 8);
  ctx.fillStyle = outer;
  [[2, 0, 4, 1], [1, 1, 6, 1], [0, 2, 8, 4], [1, 6, 6, 1], [2, 7, 4, 1]].forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
  ctx.fillStyle = inner; ctx.fillRect(2, 2, 3, 3);
  return c;
}

function critOrb() {
  const { c, ctx } = canvas(12, 12);
  const g = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
  g.addColorStop(0, '#fff6d8'); g.addColorStop(0.45, '#e8b84a'); g.addColorStop(1, 'rgba(232,184,74,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 12, 12);
  return c;
}

function pixel(tex: Phaser.Textures.TextureManager) {
  if (tex.exists('pxw')) return;
  const { c, ctx } = canvas(2, 2); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2, 2); tex.addCanvas('pxw', c);
}

/** Soft green-tinted shadow under creatures (matches the props' shadows). */
function shadow() { return shadowCanvas(16, 6, 0.36); }

function door() {
  const { c, ctx } = canvas(20, 24);
  ctx.fillStyle = '#191521'; ctx.fillRect(2, 2, 16, 22); ctx.fillRect(4, 0, 12, 2);
  ctx.fillStyle = '#4a4440'; ctx.fillRect(3, 3, 14, 21); ctx.fillRect(5, 1, 10, 2); // stone frame
  ctx.fillStyle = '#0d0b12'; ctx.fillRect(5, 4, 10, 20); ctx.fillRect(6, 3, 8, 1);  // dark opening
  ctx.fillStyle = '#5c5650'; [[3, 8], [16, 12], [3, 17], [16, 5]].forEach(([x, y]) => ctx.fillRect(x, y, 1, 2));
  return c;
}

/** Tiny pixel painter for the gates below. */
function painter(w: number, h: number) {
  const { c, ctx } = canvas(w, h);
  const px = (x: number, y: number, col: string, ww = 1, hh = 1) => { ctx.fillStyle = col; ctx.fillRect(x, y, ww, hh); };
  return { c, px };
}

/**
 * Old Rootback's gate (40×36): a gnarled root arch with horns, a horned skull
 * keystone, a glowing red maw, thorns, and a brazier burning on each side.
 */
function bossGate() {
  const W = 40, H = 36, { c, px } = painter(W, H);
  const O = '#191521', wood = '#4a3628', woodD = '#33241b', woodL = '#6a4e38', bone = '#e8dcc0', boneD = '#b8a888';
  const inArch = (x: number, y: number, x0: number, x1: number, top: number) => { const cx = (x0 + x1 - 1) / 2, r = (x1 - x0) / 2; return x >= x0 && x < x1 && y >= top + r ? true : x >= x0 && x < x1 && y >= top && (x - cx) ** 2 + (y - top - r) ** 2 <= r * r; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (inArch(x, y, 7, 33, 7)) px(x, y, O);                       // outline of the whole arch
    if (inArch(x, y, 8, 32, 8)) px(x, y, (x + y * 3) % 7 === 0 ? woodD : (x * 5 + y) % 9 === 0 ? woodL : wood); // root wood
    if (inArch(x, y, 13, 27, 13)) px(x, y, O);
    if (inArch(x, y, 14, 26, 14)) { const t = (y - 14) / (H - 14); px(x, y, t < 0.35 ? '#8a2a1e' : t < 0.65 ? '#5e1a16' : '#2e0c0e'); if ((x + y) % 2 && t > 0.5) px(x, y, '#3e1012'); } // the glowing maw
  }
  [[18, 22], [22, 26], [16, 29], [24, 31], [20, 19]].forEach(([x, y]) => px(x, y, '#ffb648')); // embers inside
  for (let y = 12; y < H; y += 3) { px(6, y, O); px(5, y + 1, woodD); px(33, y + 1, O); px(34, y + 2, woodD); } // thorns down the sides
  // horns curling up from the top corners
  [[9, 9], [8, 8], [7, 7], [6, 5], [6, 4], [7, 2], [8, 1]].forEach(([x, y]) => { px(x, y, bone); px(x + 1, y, boneD); px(x - 1, y, O); });
  [[30, 9], [31, 8], [32, 7], [33, 5], [33, 4], [32, 2], [31, 1]].forEach(([x, y]) => { px(x, y, bone); px(x - 1, y, boneD); px(x + 1, y, O); });
  // horned skull keystone
  px(16, 3, O, 8, 8); px(17, 4, bone, 6, 5); px(18, 9, bone, 4, 1); px(17, 8, boneD, 6, 1);
  px(18, 5, '#e0505a', 1, 2); px(21, 5, '#e0505a', 1, 2); px(19, 8, O); px(20, 8, O);
  px(15, 2, bone); px(14, 1, bone); px(24, 2, bone); px(25, 1, bone);
  // braziers: stone bowl + flame, each side at the foot
  for (const bx of [1, 34]) {
    px(bx, 30, O, 6, 6); px(bx + 1, 31, '#5c5650', 4, 2); px(bx + 2, 33, '#4a4440', 2, 3);
    px(bx + 1, 27, '#d6874a', 4, 3); px(bx + 2, 25, '#ffb648', 2, 3); px(bx + 2, 28, '#fff2b0', 2, 2); px(bx + 3, 24, '#ffb648');
  }
  return c;
}

/** Old Tusk's door (26×28): a stone arch with a tusk on each side and an amber glow inside. */
function miniGate() {
  const W = 26, H = 28, { c, px } = painter(W, H);
  const O = '#191521', stone = '#4a4440', stoneL = '#5c5650', tusk = '#ece0c4', tuskD = '#b8a888';
  px(5, 2, O, 16, 26); px(7, 0, O, 12, 2);
  px(6, 3, stone, 14, 25); px(8, 1, stone, 10, 2);
  px(9, 5, O, 8, 23); px(10, 4, O, 6, 1);
  for (let y = 6; y < H; y++) { const t = (y - 6) / (H - 6); px(10, y, t < 0.4 ? '#7a4a1e' : t < 0.7 ? '#4a2e16' : '#22160e', 6, 1); }
  px(12, 12, '#ffb648'); px(14, 17, '#ffb648'); px(11, 21, '#e8a24a');
  [[6, 8], [19, 12], [6, 18], [19, 22]].forEach(([x, y]) => px(x, y, stoneL, 1, 2));
  // tusks curving out and up from the frame
  [[4, 20], [3, 19], [2, 17], [1, 15], [1, 13], [2, 11], [3, 10]].forEach(([x, y]) => { px(x, y, tusk); px(x, y + 1, tuskD); });
  [[21, 20], [22, 19], [23, 17], [24, 15], [24, 13], [23, 11], [22, 10]].forEach(([x, y]) => { px(x, y, tusk); px(x, y + 1, tuskD); });
  // moss on the lintel
  px(8, 1, '#4f6a35', 4, 1); px(14, 1, '#6f8c48', 3, 1); px(7, 2, '#4f6a35', 2, 1);
  return c;
}

/**
 * Paint a room floor at full resolution (world px): grass, tufts, flowers,
 * pebbles and a hedge wall along the top and sides. `seed` keeps each room's look stable.
 */
export function paintFloor(scene: Phaser.Scene, key: string, w: number, h: number, wallTop: number, wallSide: number, seed: number) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const { c, ctx } = canvas(w, h);
  // sunny grass with patches, tufts, flowers and pebbles, then walls of round bushes around the room (HD: full resolution)
  paintGrass(ctx, 0, 0, w, h, seed, undefined, 2);
  paintBushWall(ctx, 0, 0, w, wallTop, seed + 1, 'down', 2);
  paintBushWall(ctx, 0, wallTop, wallSide, h - wallTop, seed + 2, 'right', 2);
  paintBushWall(ctx, w - wallSide, wallTop, wallSide, h - wallTop, seed + 3, 'left', 2);
  paintBushWall(ctx, 0, h - wallSide, w, wallSide, seed + 4, 'up', 2);
  scene.textures.addCanvas(key, c);
}

/**
 * A cast shadow for a sprite: its silhouette slanted to the lower right, more
 * the higher a pixel stands above the sprite's foot (the bottom row of solid
 * pixels), in a soft see-through olive. Same top-left corner as the sprite.
 */
export const SHADOW_SLANT = { x: 0.42, y: 0.22 };
export function castShadow(src: HTMLCanvasElement, flip: boolean): HTMLCanvasElement {
  const w = src.width, h = src.height, data = src.getContext('2d')!.getImageData(0, 0, w, h).data;
  let foot = 0; for (let y = h - 1; y >= 0 && !foot; y--) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) { foot = y; break; }
  const { c, ctx } = canvas(Math.ceil(w + foot * SHADOW_SLANT.x) + 2, Math.ceil(h + foot * SHADOW_SLANT.y) + 2);
  ctx.fillStyle = '#28300f';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + (flip ? w - 1 - x : x)) * 4 + 3] === 0) continue;
    const up = Math.max(0, foot - y);
    ctx.fillRect(Math.round(x + up * SHADOW_SLANT.x), Math.round(y + up * SHADOW_SLANT.y), 2, 2);
  }
  // fade it out toward the far end so it reads as soft light, not a solid stamp
  const fade = ctx.createLinearGradient(0, 0, c.width, c.height);
  fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = fade; ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Paint an Emberfall floor: grass, cobbles, yards and scorch marks from the room's map, the village edge on top. */
export function paintVillage(scene: Phaser.Scene, key: string, w: number, h: number, wallTop: number, wallSide: number, seed: number, ground: GroundPatch[]) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const { c, ctx } = canvas(w, h);
  paintVillageFloor(ctx, w, h, wallTop, wallSide, seed, ground);
  scene.textures.addCanvas(key, c);
}

/** Dark edges so the arena feels lit by a lantern. */
export function paintVignette(scene: Phaser.Scene, w: number, h: number) {
  if (scene.textures.exists('vignette')) scene.textures.remove('vignette');
  const { c, ctx } = canvas(w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(20,30,20,0)'); g.addColorStop(1, 'rgba(20,30,20,0.38)'); // a soft frame, not a dark tunnel
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  scene.textures.addCanvas('vignette', c);
}
