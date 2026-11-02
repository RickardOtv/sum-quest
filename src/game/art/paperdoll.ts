/**
 * Paper-doll gear on the adventurer sprite.
 *
 * Every frame of the base sprite is read back into body PARTS (head, torso,
 * hands, legs, feet) from its palette. A gear STYLE then does two things:
 *   1. recolours body regions (so the piece follows the pose exactly), and
 *   2. attaches PIECES — small pixel drawings anchored to a part — that change
 *      the silhouette (pauldrons, visors, tabards, cuffs, horns…).
 * Pieces are drawn once per direction (down / up / right; left is mirrored)
 * and ride the animation because they are placed relative to the part's
 * bounding box in each frame.
 *
 * Pixel letters in a piece:  M m L = main (mid, dark, light)   A a = accent (mid, dark)
 *                            G = glow (bright accent)  O = outline  S = skin shade  . = empty
 */
import type { Look } from '../items';
import { tone } from './pixels';

export type RGB = [number, number, number];
export const FRAME_W = 96, FRAME_H = 80;

/* ---------------- the base sprite's palette ---------------- */
export const PAL = {
  hair: [[57, 31, 33], [93, 44, 40], [138, 72, 54]] as RGB[],          // dark, main, light
  skin: [[246, 202, 159], [230, 156, 105], [191, 111, 74]] as RGB[],   // light, main, shade
  tunic: [[196, 36, 48], [137, 30, 43], [87, 28, 39]] as RGB[],        // light, main, dark
  trousers: [[61, 61, 61], [39, 39, 39]] as RGB[],                      // main, dark
  hilt: [[146, 161, 185], [66, 76, 110], [42, 47, 78], [0, 105, 170], [199, 207, 221]] as RGB[], // steel, grip, grip dark, gem, blade
  wraps: [[255, 255, 255], [180, 180, 180]] as RGB[],
  outline: [19, 19, 19] as RGB,
};
const same = (p: RGB, q: RGB) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2];
export const idx = (set: RGB[], p: RGB) => set.findIndex(c => same(c, p));
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** [mid, dark, light] for a colour. */
export const ramp = (main: string): RGB[] => [hex(main), hex(tone(main, -0.34)), hex(tone(main, 0.24))];

/* ---------------- parts ---------------- */
export interface Box { x0: number; y0: number; x1: number; y1: number; }
export interface Parts { top: number; head: Box; torso: Box; handL: Box | null; handR: Box | null; legL: Box; legR: Box; footL: Box; footR: Box; cx: number; }
export type PartName = 'head' | 'torso' | 'handL' | 'handR' | 'legL' | 'legR' | 'footL' | 'footR';

const box = (): Box => ({ x0: 1e9, y0: 1e9, x1: -1, y1: -1 });
const grow = (b: Box, x: number, y: number) => { b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); };
const ok = (b: Box) => b.x1 >= 0;

/** Read the body parts of one frame. `fx` is the frame's left edge in the sheet. */
export function findParts(px: Uint8ClampedArray, w: number, fx: number): Parts | null {
  const at = (x: number, y: number) => (y * w + fx + x) * 4;
  const colour = (x: number, y: number): RGB | null => { const i = at(x, y); return px[i + 3] ? [px[i], px[i + 1], px[i + 2]] : null; };
  let top = -1;
  for (let y = 0; y < FRAME_H && top < 0; y++) for (let x = 0; x < FRAME_W; x++) { const c = colour(x, y); if (c && idx(PAL.hair, c) >= 0) { top = y; break; } }
  if (top < 0) return null;
  const head = box(), torso = box(), hands = box(), legs = box(), feet = box();
  const handPts: [number, number][] = [], legPts: [number, number][] = [], footPts: [number, number][] = [];
  for (let y = top; y < Math.min(FRAME_H, top + 40); y++) for (let x = 0; x < FRAME_W; x++) {
    const c = colour(x, y); if (!c) continue;
    const r = y - top;
    if (idx(PAL.hair, c) >= 0 && r <= 11) grow(head, x, y);
    else if (idx(PAL.skin, c) >= 0 && r <= 14) grow(head, x, y);
    else if (idx(PAL.tunic, c) >= 0) grow(torso, x, y);
    else if ((idx(PAL.skin, c) === 0 || idx(PAL.skin, c) === 1 || idx(PAL.wraps, c) >= 0) && r >= 16 && r <= 23) { grow(hands, x, y); handPts.push([x, y]); } // not the strap's shade
    else if (idx(PAL.trousers, c) >= 0 && r >= 19 && r < 27) { grow(legs, x, y); legPts.push([x, y]); }
    else if (r >= 27 && (idx(PAL.trousers, c) >= 0 || idx(PAL.hair, c) >= 0 || idx(PAL.skin, c) >= 0)) { grow(feet, x, y); footPts.push([x, y]); }
  }
  if (!ok(head) || !ok(torso)) return null;
  const cx = Math.round((torso.x0 + torso.x1) / 2);
  const split = (pts: [number, number][]): [Box, Box] => {
    const l = box(), r = box();
    pts.forEach(([x, y]) => grow(x < cx ? l : r, x, y));
    return [l, r];
  };
  const [handL, handR] = split(handPts), [legL, legR] = split(legPts), [footL, footR] = split(footPts);
  return { top, head, torso, handL: ok(handL) ? handL : null, handR: ok(handR) ? handR : null, legL: ok(legL) ? legL : legs, legR: ok(legR) ? legR : legs, footL: ok(footL) ? footL : feet, footR: ok(footR) ? footR : feet, cx };
}

/* ---------------- styles and pieces ---------------- */
export type Dir = 'down' | 'up' | 'left' | 'right';
export type Anchor = 'top' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';
export interface Piece { part: PartName; anchor: Anchor; dx: number; dy: number; rows: string[]; under?: boolean; }
export interface StyleDef {
  /** Which body regions take the item's colours: 'main' ramp or 'accent' ramp. */
  recolour?: Partial<Record<'tunic' | 'strap' | 'trousers' | 'shoes' | 'hands' | 'hair' | 'collar', 'main' | 'accent'>>;
  /** A pattern drawn into a recoloured region: alternating darker pixels (chain) or a lighter stripe (plate). */
  pattern?: 'chain' | 'plate';
  /** For headgear: how many hair rows (from the top) it covers. Default: all. */
  hairRows?: number;
  /** For full helms: remove the hair entirely, the helmet piece draws the whole head shape. */
  clearHair?: boolean;
  pieces?: Partial<Record<'down' | 'up' | 'right', Piece[]>>;
}

export interface GearColours { main: RGB[]; accent: RGB[]; glow: RGB; }
/** `extra` on a look is its glow colour; otherwise a brightened accent. */
export const colours = (look: Look): GearColours => ({ main: ramp(look.main), accent: ramp(look.accent), glow: hex(look.extra ?? tone(look.accent, 0.45)) });

/** Place a piece's pixels for a frame. Mirrors it for the left view. */
export function stampPiece(px: Uint8ClampedArray, w: number, fx: number, parts: Parts, piece: Piece, c: GearColours, mirror: boolean) {
  const b = parts[piece.part]; if (!b) return;
  const pw = piece.rows[0].length, ph = piece.rows.length;
  // anchor point on the part, then the piece's own offset (mirrored horizontally for the left view)
  const ax = piece.anchor.endsWith('Left') ? b.x0 : piece.anchor.endsWith('Right') ? b.x1 : Math.round((b.x0 + b.x1) / 2);
  const ay = piece.anchor.startsWith('top') ? b.y0 : piece.anchor.startsWith('bottom') ? b.y1 : Math.round((b.y0 + b.y1) / 2);
  const bx = mirror ? (piece.anchor.endsWith('Left') ? b.x1 : piece.anchor.endsWith('Right') ? b.x0 : ax) : ax;
  const ox = mirror ? bx - piece.dx - (pw - 1) : bx + piece.dx, oy = ay + piece.dy;
  for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
    const ch = piece.rows[y][mirror ? pw - 1 - x : x]; if (ch === '.') continue;
    const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= FRAME_W || Y >= FRAME_H) continue;
    const i = (Y * w + fx + X) * 4;
    if (piece.under && px[i + 3]) continue; // "under" pieces only fill empty pixels (capes, hems behind the body)
    const col: RGB = ch === 'M' ? c.main[0] : ch === 'm' ? c.main[1] : ch === 'L' ? c.main[2] : ch === 'A' ? c.accent[0] : ch === 'a' ? c.accent[1] : ch === 'G' ? c.glow : ch === 'S' ? PAL.skin[2] : PAL.outline;
    px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
  }
}

/* ---------------- applying an outfit to a frame ---------------- */
import type { HeroLooks } from './hero';
import { STYLES } from './gear';
import { drawWeapon, eraseSheath, eraseWeapon, findWeapon } from './weapons';

/** `hideWeapon`: don't show the sword sheathed on the back (axes, staves and spears aren't carried there). */
export interface Outfit { looks: HeroLooks; weapon?: Look; hair?: string; hideWeapon?: boolean; }
const SLOT_ORDER: (keyof HeroLooks)[] = ['pants', 'boots', 'armor', 'gloves', 'free', 'helmet'];

/**
 * Recolour the body regions, attach every piece and (in attack frames) swap
 * the sword for the equipped weapon, for one frame.
 */
export function dressFrame(px: Uint8ClampedArray, w: number, fx: number, outfit: Outfit, dir: Dir, attacking = false) {
  const parts = findParts(px, w, fx);
  if (!parts) return;
  // the sword is found by its original colours, so look for it before recolouring anything
  const rig = attacking && outfit.weapon ? findWeapon(px, w, fx, parts) : null;
  const top = parts.top, cx = parts.cx;
  const at = (x: number, y: number) => (y * w + fx + x) * 4;
  // which ramp each region takes, from the worn items' styles
  const region: Partial<Record<string, { ramp: RGB[]; pattern?: StyleDef['pattern']; hairRows?: number }>> = {};
  for (const slot of SLOT_ORDER) {
    const look = outfit.looks[slot]; if (!look) continue;
    const def = STYLES[look.style]; if (!def?.recolour) continue;
    const col = colours(look);
    for (const [reg, which] of Object.entries(def.recolour)) region[reg] = { ramp: which === 'accent' ? col.accent : col.main, pattern: def.pattern, hairRows: def.hairRows };
  }
  const hair = outfit.hair ? ramp(outfit.hair) : null;
  const clearHair = !!(outfit.looks.helmet && STYLES[outfit.looks.helmet.style]?.clearHair);
  // the sheathed sword and the slash trail: steel takes the weapon's blade colour, the grip its accent, the gem its glow
  const wc = outfit.weapon ? colours(outfit.weapon) : null;
  const hilt = wc ? [wc.main[0], wc.accent[0], wc.accent[1], wc.glow, wc.main[2]] : null;
  if (outfit.hideWeapon && !rig) eraseSheath(px, w, fx); // in attack frames the drawn sword is replaced by the rig instead
  const inTorso = (x: number, y: number) => x >= parts.torso.x0 && x <= parts.torso.x1 && y >= parts.torso.y0 && y <= parts.torso.y1;
  const pat = (reg: string, k: number, x: number, y: number, out: RGB[]): RGB => {
    const p = region[reg]?.pattern;
    if (p === 'chain' && (x + y) % 2) return out[1];
    if (p === 'plate' && x === cx - 2 && k === 0) return out[2];
    return out[k];
  };
  for (let y = top; y < Math.min(FRAME_H, top + 40); y++) for (let x = 0; x < FRAME_W; x++) {
    const i = at(x, y); if (!px[i + 3]) continue;
    const p: RGB = [px[i], px[i + 1], px[i + 2]], r = y - top;
    let out: RGB | null = null, k: number;
    if ((k = idx(PAL.tunic, p)) >= 0) { const rg = region.tunic; if (rg) out = pat('tunic', [2, 0, 1][k], x, y, rg.ramp); }
    else if ((k = idx(PAL.trousers, p)) >= 0) { const rg = r >= 27 ? region.shoes : region.trousers; if (rg) out = pat(r >= 27 ? 'shoes' : 'trousers', [0, 1][k], x, y, rg.ramp); }
    else if ((k = idx(PAL.hair, p)) >= 0) {
      if (r <= 11) {
        if (clearHair) { px[i + 3] = 0; continue; }
        const rg = region.hair; if (rg && r < (rg.hairRows ?? 12)) out = r === (rg.hairRows ?? 12) - 1 && rg.hairRows ? rg.ramp[1] : pat('hair', [1, 0, 2][k], x, y, rg.ramp); else if (hair) out = [hair[1], hair[0], hair[2]][k];
      }
      else if (r >= 27) { const rg = region.shoes; if (rg) out = [rg.ramp[1], rg.ramp[0], rg.ramp[2]][k]; }
      else if (k === 2 && region.strap) out = region.strap.ramp[0];
    }
    else if ((k = idx(PAL.skin, p)) >= 0) {
      if (r >= 16 && r <= 23 && region.hands && k < 2) out = [region.hands.ramp[2], region.hands.ramp[0]][k];
      else if (r >= 12 && r <= 17 && k === 2 && region.strap && inTorso(x, y)) out = region.strap.ramp[1];
      else if (r >= 27 && region.shoes) out = [region.shoes.ramp[2], region.shoes.ramp[0], region.shoes.ramp[1]][k];
    }
    else if ((k = idx(PAL.wraps, p)) >= 0) {
      if (r >= 16 && r <= 23 && region.hands) out = [region.hands.ramp[2], region.hands.ramp[0]][k];
      else if (r >= 10 && r <= 14 && Math.abs(x - cx) <= 4 && region.collar) out = [region.collar.ramp[2], region.collar.ramp[0]][k];
    }
    else if ((k = idx(PAL.hilt, p)) >= 0) { if (hilt) out = hilt[k]; }
    if (out) { px[i] = out[0]; px[i + 1] = out[1]; px[i + 2] = out[2]; }
  }
  // pieces, under-pieces first so capes sit behind everything else
  const mirror = dir === 'left', pieceDir = dir === 'left' ? 'right' : dir;
  const all: [Piece, GearColours][] = [];
  for (const slot of SLOT_ORDER) {
    const look = outfit.looks[slot]; if (!look) continue;
    const ps = STYLES[look.style]?.pieces?.[pieceDir]; if (!ps) continue;
    const col = colours(look);
    ps.forEach(pc => all.push([pc, col]));
  }
  all.filter(([pc]) => pc.under).forEach(([pc, col]) => stampPiece(px, w, fx, parts, pc, col, mirror));
  all.filter(([pc]) => !pc.under).forEach(([pc, col]) => stampPiece(px, w, fx, parts, pc, col, mirror));
  // the weapon goes on last so it sits in front of gloves and pauldrons
  if (rig && outfit.weapon) { eraseWeapon(px, w, fx, rig); drawWeapon(px, w, fx, rig, outfit.weapon); }
}
