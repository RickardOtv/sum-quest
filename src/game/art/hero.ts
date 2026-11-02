/**
 * The hero is drawn in layers, one per gear slot, so every item has its
 * own look. Canvas is 24×36 art pixels; light comes from the top-left.
 *
 * Body map (x, y), a slim build with long legs:
 *   hair 8–15 × 3–8 · face 9–14 × 7–13 · neck y 14
 *   torso 9–14 × 15–23 (shoulders 8–15 at y 15) · arms 7–8 / 15–16 × 16–24 (hands y 23–24)
 *   hips 9–14 × 24–26 · legs 9–10 / 13–14 × 27–32 · feet 8–10 / 13–15 × 33–34
 */
import { Pixels, tone } from './pixels';
import type { Look } from '../items';

export const HERO_W = 24, HERO_H = 36;

const SKIN_S = '#b8835e'; // used by gear layers for skin showing through
const EYE = '#1a1624', SHIRT = '#3e3a48', SHORTS = '#3a3230';

const S = (c: string) => tone(c, -0.3);  // shade
const L = (c: string) => tone(c, 0.25);  // light

/** Who is being drawn: the hero by default, or a camp character with their own skin, hair and beard. */
export interface Person { skin?: string; hair?: string; style?: 'spiky' | 'bald' | 'long' | 'bun'; beard?: boolean; }
/** How the figure is drawn: `back` = seen from behind (walking away from the camera). */
export interface Pose { back?: boolean; }

const HERO_SKIN = '#e6bf9a', HERO_HAIR = '#5a3424';

/* ---------------- body ---------------- */
function body(g: Pixels, p: Person = {}, pose: Pose = {}) {
  const SKIN = p.skin ?? HERO_SKIN, SKIN_S = S(SKIN), SKIN_L = L(SKIN);
  const HAIR = p.hair ?? HERO_HAIR, HAIR_L = L(HAIR), HAIR_D = S(HAIR);
  const style = p.style ?? 'spiky';
  // legs with a gap between them, then feet
  g.rect(9, 27, 2, 6, SKIN); g.rect(13, 27, 2, 6, SKIN); g.vline(10, 27, 32, SKIN_S); g.vline(14, 27, 32, SKIN_S);
  g.hline(8, 10, 33, SKIN); g.hline(13, 15, 33, SKIN); g.hline(8, 10, 34, SKIN_S); g.hline(13, 15, 34, SKIN_S);
  // shorts
  g.rect(9, 24, 6, 3, SHORTS); g.hline(9, 14, 26, S(SHORTS));
  // torso (undershirt), shoulders one pixel wider, a belt line
  g.rect(9, 15, 6, 9, SHIRT); g.hline(8, 15, 15, SHIRT); g.vline(14, 16, 23, S(SHIRT)); g.hline(9, 14, 22, S(SHIRT));
  // arms hang close to the body: short sleeves, forearms, hands
  g.rect(7, 16, 2, 2, SHIRT); g.rect(15, 16, 2, 2, SHIRT);
  g.rect(7, 18, 2, 5, SKIN); g.rect(15, 18, 2, 5, SKIN); g.vline(8, 18, 22, SKIN_S); g.vline(16, 18, 22, SKIN_S);
  g.rect(7, 23, 2, 2, SKIN_S); g.rect(15, 23, 2, 2, SKIN_S);
  // neck
  g.hline(11, 12, 14, SKIN_S);
  // head: a narrow face, hair framing it
  g.rect(9, 7, 6, 7, SKIN); g.vline(14, 8, 12, SKIN_S); g.dots([[9, 9], [9, 10]], SKIN_L); g.dots([[9, 13], [14, 13]], SKIN_S); g.hline(10, 13, 13, SKIN_S);
  if (pose.back) {
    g.rect(8, 6, 8, 8, HAIR); g.vline(15, 7, 12, HAIR_D); g.dots([[9, 8], [10, 7], [9, 11]], HAIR_L);
  } else {
    // the brow sits in the shadow of the bangs; eyes are two dark pixels, no mouth
    if (style !== 'bald') g.dots([[9, 9], [10, 9], [13, 9]], HAIR_D);
    g.dots([[10, 10], [13, 10]], EYE);
  }
  if (p.beard) { g.rect(9, 12, 6, 3, HAIR); g.hline(10, 13, 15, HAIR_D); g.hline(8, 15, 12, HAIR); g.dots([[11, 12], [12, 12]], SKIN_S); }
  if (style === 'bald') { g.hline(10, 13, 5, SKIN); g.hline(9, 14, 6, SKIN); g.dots([[10, 5], [10, 6]], SKIN_L); g.dots([[8, 8], [15, 8], [8, 9], [15, 9]], HAIR); return; }
  // the hair: full on top, swept bangs across the brow with a parting, a light streak, dark underside
  g.hline(10, 13, 3, HAIR); g.hline(9, 14, 4, HAIR); g.rect(8, 5, 8, 3, HAIR); g.dots([[7, 6], [7, 7], [16, 6], [16, 7]], HAIR);
  g.dots([[8, 8], [9, 8], [10, 8], [12, 8], [13, 8], [15, 8], [8, 9], [15, 9], [8, 10], [15, 10]], HAIR); // bangs + sideburns
  g.dots([[10, 4], [11, 4], [12, 4], [9, 5], [10, 5], [9, 6]], HAIR_L); g.dots([[14, 7], [15, 7], [15, 6], [13, 8]], HAIR_D);
  if (style === 'spiky') { g.dots([[11, 2], [12, 2], [8, 4], [7, 5], [6, 7], [6, 8], [7, 9], [6, 9], [16, 5], [17, 6]], HAIR); g.dots([[6, 8], [7, 8]], HAIR_D); }
  if (style === 'long') { g.vline(7, 8, 17, HAIR); g.vline(16, 8, 17, HAIR); g.vline(6, 11, 16, HAIR); g.vline(17, 11, 16, HAIR_D); g.dots([[6, 17], [17, 17]], HAIR_D); }
  if (style === 'bun') { g.rect(10, 1, 4, 3, HAIR); g.hline(11, 12, 0, HAIR); g.dots([[11, 1], [11, 2]], HAIR_L); }
}

/* ---------------- armor ---------------- */
function torso(g: Pixels, c: string, sleeves = 2) {
  g.rect(9, 15, 6, 9, c); g.hline(8, 15, 15, c);
  if (sleeves) { g.rect(7, 16, 2, sleeves, c); g.rect(15, 16, 2, sleeves, c); g.vline(16, 16, 15 + sleeves, S(c)); }
  g.vline(14, 16, 23, S(c)); g.vline(9, 16, 21, L(c));
}
const ARMOR: Record<string, (g: Pixels, l: Look) => void> = {
  tunic: (g, { main, accent }) => {
    torso(g, main); g.dots([[11, 15], [12, 15]], SKIN_S);
    for (let i = 0; i < 5; i++) g.set(10 + i, 16 + i, accent); // the sash
    g.hline(9, 14, 21, accent); g.dots([[11, 21], [12, 21]], L(accent));
    g.rect(9, 22, 6, 3, main); g.hline(9, 14, 24, S(main));
  },
  jerkin: (g, { main, accent }) => {
    torso(g, main, 1);
    for (let i = 0; i < 5; i++) g.set(10 + i, 16 + i, accent);
    g.dots([[10, 16], [14, 16]], L(accent)); g.hline(8, 15, 15, S(main));
    g.hline(9, 14, 23, accent); g.set(12, 23, L(accent));
  },
  chain: (g, { main, accent }) => {
    torso(g, main, 4);
    for (let y = 16; y <= 23; y++) for (let x = 9; x <= 14; x++) if ((x + y) % 2) g.set(x, y, S(main));
    g.hline(8, 15, 15, L(main)); g.hline(9, 14, 21, accent); g.rect(9, 22, 6, 3, main); g.hline(9, 14, 24, S(main));
  },
  plate: (g, { main, accent }) => {
    torso(g, main, 3);
    g.rect(6, 14, 3, 3, main); g.rect(15, 14, 3, 3, main); g.hline(6, 8, 14, L(main)); g.hline(15, 17, 14, L(main)); g.vline(17, 14, 16, S(main));
    g.vline(12, 16, 20, S(main)); g.dots([[10, 16], [10, 17], [11, 16]], L(L(main)));
    g.hline(9, 14, 21, accent); g.rect(9, 22, 6, 3, S(main)); g.dots([[11, 22], [12, 22]], main);
  },
  robe: (g, { main, accent }) => {
    torso(g, main, 0);
    g.rect(6, 16, 3, 6, main); g.rect(15, 16, 3, 6, main); g.hline(6, 8, 21, accent); g.hline(15, 17, 21, accent); g.vline(17, 16, 21, S(main));
    g.rect(8, 22, 8, 4, main); g.rect(7, 26, 10, 6, main); g.vline(15, 22, 31, S(main)); g.vline(16, 26, 31, S(main));
    g.vline(11, 15, 31, accent); g.hline(7, 16, 31, accent); g.dots([[11, 17], [11, 19]], L(accent)); g.dots([[10, 15], [13, 15]], accent);
  },
};

/* ---------------- pants & boots ---------------- */
const PANTS: Record<string, (g: Pixels, l: Look) => void> = {
  trousers: (g, { main, accent }) => {
    g.rect(9, 24, 6, 3, main); g.rect(9, 27, 2, 6, main); g.rect(13, 27, 2, 6, main);
    g.vline(10, 27, 32, S(main)); g.vline(14, 24, 32, S(main)); g.vline(9, 25, 31, L(main));
    g.hline(9, 14, 24, accent); g.dots([[9, 30], [13, 30]], S(main));
  },
  chainlegs: (g, { main, accent }) => {
    PANTS.trousers(g, { style: '', main, accent });
    for (let y = 27; y <= 32; y++) for (const x of [9, 10, 13, 14]) if ((x + y) % 2) g.set(x, y, S(main));
  },
  skirt: (g, { main, accent }) => {
    g.rect(9, 24, 6, 2, main); g.rect(8, 26, 8, 3, main); g.hline(8, 15, 28, accent); g.vline(15, 26, 27, S(main));
    g.rect(9, 29, 2, 4, '#2a2030'); g.rect(13, 29, 2, 4, '#2a2030');
  },
};
const BOOTS: Record<string, (g: Pixels, l: Look) => void> = {
  sandals: (g, { main, accent }) => { g.hline(8, 10, 34, main); g.hline(13, 15, 34, main); g.dots([[9, 33], [14, 33], [8, 33], [15, 33]], accent); },
  boots: (g, { main, accent }) => {
    g.rect(9, 30, 2, 4, main); g.rect(13, 30, 2, 4, main); g.hline(8, 10, 33, main); g.hline(13, 15, 33, main);
    g.hline(8, 10, 34, S(main)); g.hline(13, 15, 34, S(main)); g.hline(9, 10, 30, accent); g.hline(13, 14, 30, accent);
    g.vline(10, 31, 32, S(main)); g.vline(14, 31, 32, S(main));
  },
  greaves: (g, l) => {
    BOOTS.boots(g, l); g.hline(9, 10, 29, L(l.main)); g.hline(13, 14, 29, L(l.main)); g.dots([[9, 32], [13, 32]], L(l.main));
  },
  pointy: (g, l) => {
    BOOTS.boots(g, l); g.dots([[7, 34], [6, 33], [16, 34], [17, 33]], l.main); g.dots([[9, 30], [14, 30]], l.accent);
  },
};

/* ---------------- gloves (arms 7–8 / 15–16, hands y 23–24) ---------------- */
const GLOVES: Record<string, (g: Pixels, l: Look) => void> = {
  wraps: (g, { main, accent }) => { g.rect(7, 21, 2, 4, main); g.rect(15, 21, 2, 4, main); g.dots([[7, 22], [15, 22]], accent); },
  gloves: (g, { main, accent }) => { g.rect(7, 22, 2, 3, main); g.rect(15, 22, 2, 3, main); g.hline(7, 8, 21, accent); g.hline(15, 16, 21, accent); },
  gauntlets: (g, { main, accent }) => {
    g.rect(7, 20, 2, 5, main); g.rect(15, 20, 2, 5, main); g.dots([[7, 24], [15, 24]], L(main)); g.dots([[8, 21], [16, 21]], S(main));
    g.hline(6, 8, 20, accent); g.hline(15, 17, 20, accent);
  },
  claws: (g, { main, accent }) => { g.rect(7, 21, 2, 4, main); g.rect(15, 21, 2, 4, main); g.dots([[7, 25], [8, 26], [15, 25], [16, 26]], accent); },
};

/* ---------------- tattoos (glowing marks) ---------------- */
const TATTOO: Record<string, (g: Pixels, l: Look) => void> = {
  rune: (g, { main }) => g.dots([[9, 11], [14, 11], [7, 19], [16, 19], [7, 20]], main),
  serpent: (g, { main }) => g.dots([[7, 18], [8, 19], [7, 20], [16, 18], [15, 19], [16, 20]], main),
  sigil: (g, { main }) => g.dots([[10, 12], [13, 12], [8, 19], [15, 19], [15, 20]], main),
  star: (g, { main }) => g.dots([[16, 18], [15, 19], [16, 19], [16, 20], [14, 11]], main),
};

/* ---------------- helmets (hair 8–15 × 3–8, face from y 7) ---------------- */
const HELMET: Record<string, (g: Pixels, l: Look) => void> = {
  cap: (g, { main, accent }) => {
    g.hline(9, 14, 3, main); g.rect(8, 4, 8, 3, main); g.hline(9, 11, 4, L(main)); g.vline(15, 4, 6, S(main));
    g.hline(7, 16, 7, accent); g.set(16, 7, S(accent));
  },
  helm: (g, { main, accent }) => {
    g.hline(9, 14, 2, main); g.rect(8, 3, 8, 5, main); g.rect(7, 5, 1, 8, main); g.rect(16, 5, 1, 8, main);
    g.rect(8, 8, 1, 5, main); g.rect(15, 8, 1, 5, main);
    g.hline(9, 12, 3, L(main)); g.vline(16, 5, 12, S(main)); g.hline(8, 15, 6, accent); g.vline(11, 7, 9, S(main)); g.vline(12, 7, 9, S(main));
  },
  horned: (g, l) => {
    HELMET.helm(g, l);
    g.dots([[6, 5], [5, 4], [4, 3], [4, 2], [5, 1], [17, 5], [18, 4], [19, 3], [19, 2], [18, 1]], l.accent);
    g.dots([[5, 3], [18, 3]], S(l.accent));
  },
  witchhat: (g, { main, accent }) => {
    g.hline(4, 19, 7, main); g.hline(5, 18, 8, S(main));
    g.hline(8, 15, 6, main); g.hline(9, 14, 5, main); g.hline(10, 13, 4, main); g.hline(10, 12, 3, main);
    g.hline(11, 12, 2, main); g.hline(12, 13, 1, main); g.hline(13, 14, 0, main); g.set(15, 0, S(main));
    g.hline(8, 15, 6, accent); g.set(12, 6, L(accent)); g.dots([[10, 4], [11, 3]], L(main));
  },
};

/* ---------------- free slot ---------------- */
const FREE_BACK: Record<string, (g: Pixels, l: Look) => void> = {
  cloak: (g, { main, accent }) => {
    g.hline(7, 16, 14, main); g.rect(6, 15, 12, 15, main);
    for (let x = 6; x <= 17; x += 2) g.set(x, 30, main);
    g.vline(6, 15, 29, L(main)); g.vline(17, 15, 29, S(main)); g.rect(7, 16, 10, 12, accent);
  },
  scarf: (g, { main, accent }) => {
    g.dots([[8, 15], [7, 15], [6, 16], [5, 16], [4, 17], [3, 17], [3, 18], [2, 19]], main);
    g.dots([[6, 17], [4, 18], [3, 19]], accent);
  },
};
const FREE_FRONT: Record<string, (g: Pixels, l: Look) => void> = {
  cloak: (g, { accent }) => g.dots([[9, 15], [14, 15]], L(accent)),
  scarf: (g, { main, accent }) => { g.hline(10, 13, 14, main); g.hline(9, 14, 15, main); g.hline(10, 13, 15, accent); g.dots([[9, 16], [9, 17]], main); },
  underpants: (g, { main, accent }) => { g.rect(9, 24, 6, 2, main); g.hline(9, 14, 24, accent); g.dots([[11, 25], [12, 25]], L(accent)); g.dots([[7, 25], [16, 24], [10, 27]], accent); },
};
const FREE_TOP: Record<string, (g: Pixels, l: Look) => void> = {
  tiara: (g, { main, accent }) => { g.hline(10, 13, 5, main); g.dots([[11, 4], [12, 4]], main); g.dots([[11, 3], [12, 5]], accent); g.set(10, 4, L(main)); g.set(13, 4, L(main)); },
};

export interface HeroLooks { armor?: Look; pants?: Look; boots?: Look; gloves?: Look; tattoo?: Look; helmet?: Look; free?: Look; }

/** Build the hero (or, with `person`, a camp character) with everything they wear. */
export function drawHero(l: HeroLooks, person?: Person, pose: Pose = {}): Pixels {
  const g = new Pixels(HERO_W, HERO_H);
  const run = (table: Record<string, (g: Pixels, l: Look) => void>, look?: Look) => { if (look && table[look.style]) table[look.style](g, look); };
  if (!pose.back) run(FREE_BACK, l.free);
  body(g, person, pose);
  run(PANTS, l.pants);
  run(BOOTS, l.boots);
  if (l.free?.style === 'underpants') run(FREE_FRONT, l.free);
  run(ARMOR, l.armor);
  run(GLOVES, l.gloves);
  run(TATTOO, l.tattoo);
  if (l.free?.style !== 'underpants') run(FREE_FRONT, l.free);
  run(HELMET, l.helmet);
  run(FREE_TOP, l.free);
  if (pose.back) run(FREE_BACK, l.free); // a cloak hangs over everything when seen from behind
  return g.outline();
}

/* ---------------- walk cycle ---------------- */
/** Copy a rectangle of pixels shifted by (dx, dy); the source area is cleared first. */
function shiftRegion(g: Pixels, x: number, y: number, w: number, h: number, dx: number, dy: number) {
  const grab: [number, number, string][] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = g.get(x + i, y + j); if (c) { grab.push([x + i, y + j, c]); g.set(x + i, y + j, null); } }
  grab.forEach(([px, py, c]) => g.set(px + dx, py + dy, c));
}

/**
 * Walk frames from one drawn hero: 0 = standing, 1 = left leg forward,
 * 2 = right leg forward. Legs and arms swing opposite each other, so every
 * gear layer animates without its own frames. The hero faces right.
 */
export function heroFrames(l: HeroLooks, person?: Person, pose: Pose = {}): Pixels[] {
  const base = drawHero(l, person, pose);
  const clone = () => { const c = new Pixels(HERO_W, HERO_H); for (let y = 0; y < HERO_H; y++) for (let x = 0; x < HERO_W; x++) { const v = base.get(x, y); if (v) c.set(x, y, v); } return c; };
  const step = (leftForward: boolean) => {
    const g = clone();
    const f = leftForward ? 1 : -1;
    shiftRegion(g, 7, 27, 5, 9, f, -1);     // left leg (x 7–11 incl. outline): forward and lifted
    shiftRegion(g, 12, 27, 5, 9, -f, 0);    // right leg: back
    shiftRegion(g, 5, 17, 4, 10, -f, 0);    // left arm swings opposite its leg
    shiftRegion(g, 15, 17, 4, 10, f, 0);    // right arm
    return g;
  };
  return [base, step(true), step(false)];
}

/* ---------------- weapons ---------------- */
export function drawWeapon(look: Look): Pixels {
  const { style, main, accent, extra = main } = look;
  if (style === 'dagger') {
    const g = new Pixels(7, 13);
    g.set(3, 0, L(main)); g.vline(3, 1, 6, L(main)); g.vline(4, 1, 6, main); g.set(3, 2, extra);
    g.hline(1, 5, 7, accent); g.vline(3, 8, 9, S(accent)); g.set(3, 10, extra);
    return g.outline();
  }
  if (style === 'cleaver') {
    const g = new Pixels(8, 20);
    g.rect(1, 1, 5, 8, main); g.vline(1, 1, 8, L(main)); g.hline(1, 5, 1, L(main)); g.vline(5, 2, 8, S(main)); g.dots([[4, 3], [4, 4]], S(main));
    g.vline(3, 9, 16, accent); g.vline(4, 9, 16, S(accent)); g.dots([[3, 17], [4, 17]], extra);
    return g.outline();
  }
  const g = new Pixels(7, 20); // sword
  g.set(3, 0, L(main)); g.vline(3, 1, 12, L(main)); g.vline(4, 1, 12, main); g.vline(3, 3, 10, extra);
  g.hline(0, 6, 13, accent); g.hline(1, 5, 14, S(accent)); g.vline(3, 15, 16, S(S(accent))); g.set(3, 17, extra);
  return g.outline();
}

/* ---------------- chests ---------------- */
export function drawChest(kind: 'wood' | 'iron' | 'gilded'): Pixels {
  const c = { wood: ['#7a5234', '#5a3a24', '#9a9aa4'], iron: ['#5c6270', '#40444e', '#c9a24a'], gilded: ['#c9963a', '#8a6420', '#fff0b0'] }[kind];
  const g = new Pixels(16, 13);
  g.rect(1, 1, 14, 4, c[0]); g.hline(2, 13, 0, c[0]); g.hline(1, 14, 1, L(c[0])); // lid
  g.rect(1, 5, 14, 7, c[1]); g.hline(1, 14, 5, S(c[1]));
  g.vline(4, 0, 11, c[2]); g.vline(11, 0, 11, c[2]); // bands
  g.rect(7, 4, 2, 3, c[2]); g.set(7, 5, S(c[2])); // lock
  if (kind === 'gilded') g.dots([[7, 8], [8, 8]], '#e0505a');
  return g.outline();
}
