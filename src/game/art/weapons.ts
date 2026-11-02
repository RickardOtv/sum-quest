/**
 * Weapons on the adventurer sprite.
 *
 * The base sprite swings one short sword. In every attack frame we find that
 * sword (its hilt and blade colours), remember where the hand grips it and
 * which way it points, erase it, and draw the equipped weapon along the same
 * line. So a dagger, axe or staff follows the swing exactly like the original
 * sword did. The slash flash (the big white / grey arc in frames 1–2) is an
 * effect, not the weapon, and is left alone.
 *
 * In idle and run frames the sword hangs on the back; there it is only
 * recoloured (see paperdoll.ts).
 */
import type { Look } from '../items';
import { FRAME_H, FRAME_W, PAL, hex, idx, ramp, type Parts, type RGB } from './paperdoll';
import { tone } from './pixels';

/**
 * How a weapon is built along its axis (lengths in pixels, from the grip point).
 *   grip   handle behind the hand         guard  half-width of the cross-guard (0 = none)
 *   blade  length in front of the guard   width  blade thickness
 *   head   extra shape at the end: axe head to one side, mace ball, spear leaf, staff orb
 */
export interface WeaponDef { grip: number; guard: number; blade: number; width: number; taper: number; head?: 'axe' | 'mace' | 'leaf' | 'orb' | 'hook'; }

export const WEAPON_STYLES: Record<string, WeaponDef> = {
  sword:   { grip: 3, guard: 2, blade: 13, width: 2, taper: 3 },
  broadsword: { grip: 4, guard: 3, blade: 14, width: 3, taper: 3 },
  dagger:  { grip: 3, guard: 1, blade: 7, width: 2, taper: 3 },
  cleaver: { grip: 3, guard: 1, blade: 11, width: 4, taper: 1 },
  axe:     { grip: 3, guard: 0, blade: 13, width: 1, taper: 0, head: 'axe' },
  mace:    { grip: 3, guard: 0, blade: 11, width: 1, taper: 0, head: 'mace' },
  spear:   { grip: 5, guard: 0, blade: 17, width: 1, taper: 0, head: 'leaf' },
  staff:   { grip: 6, guard: 0, blade: 13, width: 1, taper: 0, head: 'orb' },
  scythe:  { grip: 5, guard: 0, blade: 14, width: 1, taper: 0, head: 'hook' },
};

export interface WeaponRig { grip: [number, number]; tip: [number, number]; pts: number[]; }

const isWeaponColour = (c: RGB) => idx(PAL.hilt, c) >= 0 || idx(PAL.wraps, c) >= 0;
/** The grip's own colours (dark blue wrap and the gem), as opposed to steel. */
const isGrip = (c: RGB) => { const k = idx(PAL.hilt, c); return k >= 1 && k <= 3; };

/**
 * Find the drawn sword in an attack frame. Returns null for frames where the
 * sword is sheathed or hidden in the slash flash.
 */
export function findWeapon(px: Uint8ClampedArray, w: number, fx: number, parts: Parts): WeaponRig | null {
  const at = (x: number, y: number) => (y * w + fx + x) * 4;
  const colour = (x: number, y: number): RGB | null => { const i = at(x, y); return px[i + 3] ? [px[i], px[i + 1], px[i + 2]] : null; };
  const isSteel = (c: RGB) => idx(PAL.hilt, c) === 4;
  // connected components of sword-coloured pixels (8-connected). The slash arc in frame 2 is drawn in the
  // blade's steel colour and touches the sword, so if that merges everything into one huge patch we try
  // again without the steel colour.
  const search = (withSteel: boolean) => {
    const ok = (c: RGB) => isWeaponColour(c) && (withSteel || !isSteel(c));
    const seen = new Uint8Array(FRAME_W * FRAME_H);
    let best: { pts: number[]; hilt: number[]; blade: number[] } | null = null;
    for (let y = 0; y < FRAME_H; y++) for (let x = 0; x < FRAME_W; x++) {
      const k = y * FRAME_W + x; if (seen[k]) continue;
      const c = colour(x, y); if (!c || !ok(c)) { seen[k] = 1; continue; }
      const stack = [k], pts: number[] = [], hilt: number[] = [], blade: number[] = []; seen[k] = 1;
      while (stack.length) {
        const q = stack.pop()!, qx = q % FRAME_W, qy = (q - qx) / FRAME_W;
        const qc = colour(qx, qy)!; pts.push(q); (isGrip(qc) ? hilt : blade).push(q);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= FRAME_W || ny >= FRAME_H) continue;
          const nk = ny * FRAME_W + nx; if (seen[nk]) continue;
          const nc = colour(nx, ny); if (nc && ok(nc)) { seen[nk] = 1; stack.push(nk); } else seen[nk] = 1;
        }
      }
      // a weapon has a blade of some size, is not the arc flash (huge) and is not a hand wrap (tiny);
      // the hilt may be mostly hidden by the hand, so it is optional
      if (blade.length < 4 || pts.length > 80) continue;
      if (!best || blade.length > best.blade.length) best = { pts, hilt, blade };
    }
    return best;
  };
  let best = search(true);
  if (!best || best.blade.length < 12) best = search(false) ?? best;
  if (!best) return null;
  // steel pixels touching the sword belong to it too (the blade's light edge)
  const set = new Set(best.pts);
  for (const q of [...best.pts]) {
    const qx = q % FRAME_W, qy = (q - qx) / FRAME_W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= FRAME_W || ny >= FRAME_H) continue;
      const nk = ny * FRAME_W + nx; if (set.has(nk)) continue;
      const nc = colour(nx, ny); if (nc && isSteel(nc)) { set.add(nk); best.pts.push(nk); }
    }
  }
  // the hand grips the hilt: the hilt (or, failing that, blade) pixel nearest to skin is the grip
  const skin: [number, number][] = [];
  const r0 = Math.max(0, parts.top + 12), r1 = Math.min(FRAME_H, parts.top + 40);
  for (let y = r0; y < r1; y++) for (let x = 0; x < FRAME_W; x++) { const c = colour(x, y); if (c && idx(PAL.skin, c) >= 0) skin.push([x, y]); }
  let grip: [number, number] = [0, 0]; let gd = 1e9;
  for (const q of best.hilt.length ? best.hilt : best.blade) {
    const x = q % FRAME_W, y = (q - x) / FRAME_W;
    for (const [sx, sy] of skin) { const d = (sx - x) ** 2 + (sy - y) ** 2; if (d < gd) { gd = d; grip = [x, y]; } }
  }
  let tip: [number, number] = grip, td = -1;
  for (const q of best.blade) { const x = q % FRAME_W, y = (q - x) / FRAME_W; const d = (x - grip[0]) ** 2 + (y - grip[1]) ** 2; if (d > td) { td = d; tip = [x, y]; } }
  return { grip, tip, pts: best.pts };
}

/**
 * Remove the sword sheathed on the back (idle / run frames): every patch of
 * sword-coloured pixels that contains part of the hilt. Hand wraps are their
 * own patches without hilt colours, so they stay.
 */
export function eraseSheath(px: Uint8ClampedArray, w: number, fx: number) {
  const at = (x: number, y: number) => (y * w + fx + x) * 4;
  const colour = (x: number, y: number): RGB | null => { const i = at(x, y); return px[i + 3] ? [px[i], px[i + 1], px[i + 2]] : null; };
  const seen = new Uint8Array(FRAME_W * FRAME_H);
  for (let y = 0; y < FRAME_H; y++) for (let x = 0; x < FRAME_W; x++) {
    const k = y * FRAME_W + x; if (seen[k]) continue; seen[k] = 1;
    const c = colour(x, y); if (!c || !isWeaponColour(c)) continue;
    const stack = [k], pts: number[] = []; let hilt = 0;
    while (stack.length) {
      const q = stack.pop()!, qx = q % FRAME_W, qy = (q - qx) / FRAME_W;
      pts.push(q); if (isGrip(colour(qx, qy)!)) hilt++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= FRAME_W || ny >= FRAME_H) continue;
        const nk = ny * FRAME_W + nx; if (seen[nk]) continue;
        const nc = colour(nx, ny); if (nc && isWeaponColour(nc)) { seen[nk] = 1; stack.push(nk); }
      }
    }
    if (hilt && pts.length < 140) for (const q of pts) px[(((q - q % FRAME_W) / FRAME_W) * w + fx + q % FRAME_W) * 4 + 3] = 0;
  }
}

/** Erase the base sword and fill the holes it leaves over the body from neighbouring body pixels. */
export function eraseWeapon(px: Uint8ClampedArray, w: number, fx: number, rig: WeaponRig) {
  const at = (x: number, y: number) => (y * w + fx + x) * 4;
  const holes: [number, number][] = [];
  for (const q of rig.pts) { const x = q % FRAME_W, y = (q - x) / FRAME_W; px[at(x, y) + 3] = 0; holes.push([x, y]); }
  // in-paint: a hole with 3+ opaque body neighbours takes the most common neighbour colour (two passes)
  for (let pass = 0; pass < 2; pass++) {
    const filled: [number, number, RGB][] = [];
    for (const [x, y] of holes) {
      if (px[at(x, y) + 3]) continue;
      const seenCols: Record<string, { n: number; c: RGB }> = {}; let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= FRAME_W || ny >= FRAME_H) continue;
        const i = at(nx, ny); if (!px[i + 3]) continue;
        const c: RGB = [px[i], px[i + 1], px[i + 2]]; if (isWeaponColour(c)) continue;
        n++; const key = c.join(','); (seenCols[key] ??= { n: 0, c }).n++;
      }
      if (n >= 3) { const top = Object.values(seenCols).sort((a, b) => b.n - a.n)[0]; filled.push([x, y, top.c]); }
    }
    for (const [x, y, c] of filled) { const i = at(x, y); px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; }
  }
}

/** Draw a weapon of `look` along the rig's line. */
export function drawWeapon(px: Uint8ClampedArray, w: number, fx: number, rig: WeaponRig, look: Look) {
  const def = WEAPON_STYLES[look.style] ?? WEAPON_STYLES.sword;
  const blade = ramp(look.main), hilt = ramp(look.accent), glow = hex(look.extra ?? tone(look.main, 0.4));
  const [gx, gy] = rig.grip;
  let ux = rig.tip[0] - gx, uy = rig.tip[1] - gy; const len = Math.hypot(ux, uy) || 1; ux /= len; uy /= len;
  const nx = -uy, ny = ux;
  const at = (x: number, y: number) => (y * w + fx + x) * 4;
  const drawn: number[] = [];
  const plot = (t: number, s: number, c: RGB) => {
    const X = Math.round(gx + ux * t + nx * s), Y = Math.round(gy + uy * t + ny * s);
    if (X < 0 || Y < 0 || X >= FRAME_W || Y >= FRAME_H) return;
    const i = at(X, Y); px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255; drawn.push(Y * FRAME_W + X);
  };
  // fill a band along the axis: t from t0 to t1, half-width hw(t); colour picked by the side `s`
  const band = (t0: number, t1: number, hw: (t: number) => number, col: (s: number, t: number) => RGB) => {
    for (let t = t0; t <= t1; t += 0.5) { const h = hw(t); for (let s = -h; s <= h; s += 0.5) plot(t, s, col(s, t)); }
  };
  const bladeCol = (s: number) => (s < -0.4 ? blade[2] : s > 0.6 ? blade[1] : blade[0]);
  // handle (behind the hand) + pommel
  band(-def.grip, -0.5, () => 0.4, () => hilt[1]);
  plot(-def.grip, 0, hilt[2]);
  // cross-guard
  if (def.guard) band(0, 0.5, () => def.guard, (s) => (Math.abs(s) >= def.guard - 0.4 ? hilt[2] : hilt[0]));
  const b0 = def.guard ? 1 : 0, b1 = b0 + def.blade;
  if (!def.head) {
    // blade that tapers to a point over the last `taper` pixels
    band(b0, b1, t => (t > b1 - def.taper ? Math.max(0, (def.width / 2) * (b1 - t) / def.taper) : def.width / 2), bladeCol);
  } else {
    // a shaft, then the head
    band(b0, b1, () => def.width / 2, () => hilt[0]);
    const hc = b1 - 1.5;
    if (def.head === 'axe') band(hc - 3, hc + 3, t => 0.5 + (3 - Math.abs(t - hc)) * 1.1, (s, t) => (s < 0.4 ? hilt[0] : Math.abs(t - hc) > 2.2 || s > 3 ? blade[2] : blade[0]));
    if (def.head === 'mace') { band(hc - 2, hc + 2.5, t => Math.sqrt(Math.max(0, 6.25 - (t - hc) ** 2)), (s, t) => (s + (t - hc) < -1.2 ? blade[2] : s + (t - hc) > 1.4 ? blade[1] : blade[0])); for (const [dt, ds] of [[-3.5, 0], [3.5, 0], [0, -3.5], [0, 3.5]]) plot(hc + dt, ds, blade[2]); }
    if (def.head === 'leaf') band(b1 - 6, b1 + 2, t => Math.max(0, (t < b1 - 2 ? (t - (b1 - 6)) / 4 : (b1 + 2 - t) / 4) * 1.6), bladeCol);
    if (def.head === 'orb') { band(hc - 2, hc + 2, t => Math.sqrt(Math.max(0, 4 - (t - hc) ** 2)), (s, t) => (s + (t - hc) < -0.8 ? [255, 255, 255] as RGB : glow)); plot(hc - 2.5, -1, hilt[2]); plot(hc - 2.5, 1, hilt[2]); }
    if (def.head === 'hook') {
      // scythe: a crescent fixed at the shaft's end, sweeping sideways and curving back toward the hand
      for (let u = 0; u <= 1; u += 0.04) {
        const t = b1 - 5 * u * u, sc = 7 * u * (1 - 0.45 * u), hw = 1.3 * (1 - u) + 0.3;
        for (let d = -hw; d <= hw; d += 0.5) plot(t + d * 0.6, sc + d * 0.8, d < -0.3 ? blade[2] : d > 0.4 ? blade[1] : blade[0]);
      }
      plot(b1, 0, hilt[2]);
    }
  }
  // 1-px dark outline around the weapon, only on pixels that were empty
  const dark: RGB = [Math.round(blade[1][0] * 0.55), Math.round(blade[1][1] * 0.55), Math.round(blade[1][2] * 0.6)];
  const set = new Set(drawn);
  for (const q of drawn) {
    const x = q % FRAME_W, y = (q - x) / FRAME_W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= FRAME_W || Y >= FRAME_H) continue;
      const i = at(X, Y); if (px[i + 3] || set.has(Y * FRAME_W + X)) continue;
      px[i] = dark[0]; px[i + 1] = dark[1]; px[i + 2] = dark[2]; px[i + 3] = 255;
    }
  }
}

/** Replace the base sword in an attack frame with the equipped weapon. */
export function swapWeapon(px: Uint8ClampedArray, w: number, fx: number, parts: Parts, look: Look) {
  const rig = findWeapon(px, w, fx, parts);
  if (!rig) return;
  eraseWeapon(px, w, fx, rig);
  drawWeapon(px, w, fx, rig, look);
}
