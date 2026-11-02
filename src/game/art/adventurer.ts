/**
 * The hero sprite: "Adventurer 2D Top-Down" by Mattz Art (xzany.itch.io,
 * free version; licence allows use and modification in a game, no
 * redistribution as an asset). Four directions, 8 frames each, for idle,
 * run and two attacks, on 96×80 frames.
 *
 * Gear is applied by recolouring the sprite's palette regions on every
 * frame (tunic, belt, trousers, boots, hands, sword hilt, hair), so what
 * you wear shows in every direction and animation; shapes recolouring
 * can't express (helmets, pauldrons, cloaks) are pieces stamped onto the
 * body parts (paperdoll.ts, gear.ts), and the equipped weapon replaces the
 * sword in attack frames (weapons.ts).
 */
import Phaser from 'phaser';
import { dressFrame, type Outfit } from './paperdoll';

import idle_down from './adventurer/idle_down.png?url';
import idle_up from './adventurer/idle_up.png?url';
import idle_left from './adventurer/idle_left.png?url';
import idle_right from './adventurer/idle_right.png?url';
import run_down from './adventurer/run_down.png?url';
import run_up from './adventurer/run_up.png?url';
import run_left from './adventurer/run_left.png?url';
import run_right from './adventurer/run_right.png?url';
import attack1_down from './adventurer/attack1_down.png?url';
import attack1_up from './adventurer/attack1_up.png?url';
import attack1_left from './adventurer/attack1_left.png?url';
import attack1_right from './adventurer/attack1_right.png?url';
import attack2_down from './adventurer/attack2_down.png?url';
import attack2_up from './adventurer/attack2_up.png?url';
import attack2_left from './adventurer/attack2_left.png?url';
import attack2_right from './adventurer/attack2_right.png?url';

export type Anim = 'idle' | 'run' | 'attack1' | 'attack2';
export type Dir = 'down' | 'up' | 'left' | 'right';
export const ANIMS: Anim[] = ['idle', 'run', 'attack1', 'attack2'];
export const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
export const SHEETS: Record<string, string> = {
  idle_down, idle_up, idle_left, idle_right, run_down, run_up, run_left, run_right,
  attack1_down, attack1_up, attack1_left, attack1_right, attack2_down, attack2_up, attack2_left, attack2_right,
};
export const FRAME_W = 96, FRAME_H = 80, FRAMES = 8;
/** Where the figure stands inside a frame: feet at y 58, centre at x 46.5. */
export const ORIGIN_X = 0.485, ORIGIN_Y = 0.725;
const FRAME_RATE: Record<Anim, number> = { idle: 6, run: 12, attack1: 20, attack2: 20 };

/** What to put on the sprite. Missing slots keep the sprite's own colours. */
export type Skin = Outfit;

/* ---------------- building textures and animations ---------------- */
const loaded: Record<string, HTMLImageElement> = {};
/** Queue the 16 sheets in a scene's preload. */
export function preloadAdventurer(scene: Phaser.Scene) { for (const [k, url] of Object.entries(SHEETS)) scene.load.image(`adv_${k}`, url); }
/** Keep the raw images for sync use outside Phaser (the Bag portrait, camp panels). */
export function rememberAdventurer(scene: Phaser.Scene) { for (const k of Object.keys(SHEETS)) loaded[k] = scene.textures.get(`adv_${k}`).getSourceImage() as HTMLImageElement; }
/** Load the sheets without Phaser (the dev preview page). */
export async function loadAdventurerImages() {
  await Promise.all(Object.entries(SHEETS).map(([k, url]) => new Promise<void>((ok, fail) => { const im = new Image(); im.onload = () => { loaded[k] = im; ok(); }; im.onerror = () => fail(new Error(url)); im.src = url; })));
}

/** One recoloured sheet as a canvas. */
export function skinnedSheet(sheet: string, skin: Skin): HTMLCanvasElement {
  const img = loaded[sheet];
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const [anim, dir] = sheet.split('_') as [Anim, Dir];
  for (let f = 0; f < FRAMES; f++) dressFrame(data.data, c.width, f * FRAME_W, skin, dir, anim.startsWith('attack'));
  ctx.putImageData(data, 0, 0);
  return c;
}

/** Build `${prefix}_${anim}_${dir}` spritesheets and animations for one outfit. */
export function buildAdventurer(scene: Phaser.Scene, prefix: string, skin: Skin, anims: Anim[] = ANIMS) {
  for (const anim of anims) for (const dir of DIRS) {
    const key = `${prefix}_${anim}_${dir}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addSpriteSheet(key, skinnedSheet(`${anim}_${dir}`, skin) as unknown as HTMLImageElement, { frameWidth: FRAME_W, frameHeight: FRAME_H });
    scene.anims.remove(key);
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: FRAMES - 1 }), frameRate: FRAME_RATE[anim], repeat: anim === 'idle' || anim === 'run' ? -1 : 0 });
  }
}

/** One dressed frame on its own 96×80 canvas (cheaper than a whole sheet when only one pose is needed). */
export function skinnedFrame(anim: Anim, dir: Dir, frame: number, skin: Skin): HTMLCanvasElement {
  const img = loaded[`${anim}_${dir}`];
  const c = document.createElement('canvas'); c.width = FRAME_W; c.height = FRAME_H;
  const ctx = c.getContext('2d')!; ctx.drawImage(img, -frame * FRAME_W, 0);
  const data = ctx.getImageData(0, 0, FRAME_W, FRAME_H);
  dressFrame(data.data, FRAME_W, 0, skin, dir, anim.startsWith('attack'));
  ctx.putImageData(data, 0, 0);
  return c;
}

/** A single frame cropped around the figure (for menus). `scale` is an integer. */
export function adventurerFrame(skin: Skin, anim: Anim, dir: Dir, frame: number, scale = 4): HTMLCanvasElement {
  return cropFrame(skinnedFrame(anim, dir, frame, skin), 30, 14, 36, 48, scale);
}

/** Part of a frame, scaled up without smoothing. */
export function cropFrame(frame: HTMLCanvasElement, x0: number, y0: number, w: number, h: number, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame, x0, y0, w, h, 0, 0, c.width, c.height);
  return c;
}

/** Direction from a movement vector; keeps the last one when standing still. */
export function dirOf(mx: number, my: number, last: Dir): Dir {
  if (Math.abs(mx) < 0.15 && Math.abs(my) < 0.15) return last;
  if (Math.abs(mx) >= Math.abs(my)) return mx > 0 ? 'right' : 'left';
  return my > 0 ? 'down' : 'up';
}
