/**
 * Pixel art, written as text. Each character is one pixel and maps to a
 * colour in the palette; '.' is transparent. This keeps the art editable
 * in code and lets the hero's look change with equipped gear.
 *
 * Used for enemies and small icons. Style goal: muted, slightly dark
 * fantasy (Moonlighter / dungeon-crawler), not bright or cartoony.
 */

export type Palette = Record<string, string>;
export interface Sprite { rows: string[]; palette: Palette; }

const OUTLINE = '#191521';

// The hero and weapons are drawn in layers from gear: see hero.ts.

/* ---------------- enemies (Thornwood) ---------------- */
export const SLIME: Sprite = {
  palette: { k: '#1a2a44', g: '#4a8ac8', G: '#8ac4f0', d: '#2e5a8a' }, // blue, so it stands out on the grass
  rows: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '......kkkk......',
    '....kkGGGgkk....',
    '...kGGggggggk...',
    '..kGggggggggdk..',
    '..kgggkggkgggk..',
    '.kggggkggkggggk.',
    '.kggggggggggddk.',
    '.kdgggggggggddk.',
    '..kddddddddddk..',
    '...kkkkkkkkkk...',
    '................',
  ],
};

export const SPORECAP: Sprite = {
  palette: { k: OUTLINE, r: '#8a3b36', R: '#5e2724', w: '#d8c8a8', t: '#cdb894', T: '#9c8a6a' },
  rows: [
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkrrrrrrkk...',
    '..krrwrrrrwrrk..',
    '.krrrrrrwrrrrrk.',
    '.kRrrrrrrrrrrRk.',
    '.kkRRRRRRRRRRkk.',
    '...kkkkkkkkkk...',
    '....kttttttk....',
    '....ktkttktk....',
    '....ktttttTk....',
    '....ktttttTk....',
    '...kkttttTTkk...',
    '...kkkkkkkkkk...',
    '................',
  ],
};

export const WISP: Sprite = {
  palette: { k: OUTLINE, v: '#5a4a6a', V: '#7d6a92', y: '#e8c86a' },
  rows: [
    '................',
    '................',
    '................',
    'k..............k',
    'kk............kk',
    'kvk...kkkk...kvk',
    'kvvk.kvvvvk.kvvk',
    'kvVvkvvvvvvkvVvk',
    '.kvVvvyvvyvvVvk.',
    '..kvvvvvvvvvvk..',
    '...kkvvvvvvkk...',
    '.....kvvvvk.....',
    '......kvvk......',
    '.......kk.......',
    '................',
    '................',
  ],
};

export const ROOTBACK: Sprite = {
  palette: { k: OUTLINE, b: '#5a4030', B: '#3e2c22', l: '#4f6a35', L: '#6f8c48', y: '#e3b84a' },
  rows: [
    '...kkk..kkkk....',
    '..kLlLkkLllLk...',
    '.kLllllLLlllLLk.',
    '.kllLlllllLlllk.',
    '..kkbbbbbbbbkk..',
    '..kbBbbbbbbBbk..',
    '..kbyykbbkyybk..',
    '..kbbbbbbbbbbk..',
    '..kbBkkkkkkBbk..',
    '..kbbkBBBBkbbk..',
    '.kbbbbbbbbbbbbk.',
    'kbBbbbBbbBbbbBbk',
    'kbbBbbbbbbbbBbbk',
    'kBbkBbbkkbbBkbBk',
    'kk.kk.kk.kk.kk.k',
    '................',
  ],
};

/** Thornback boar (side view, facing right; flipped when it runs left). Brambles grow along its back. */
const BOAR_ROWS = [
  '................',
  '....T..T..T.....',
  '...kTkkTkkTk....',
  '..kTtTttTttTk...',
  '.kbbbbbbbbbbbk..',
  'kbBbbbbbbbbbbbk.',
  'kbbbbbbbbbbbrbk.',
  'kBbbbbbbbbbbbbsk',
  'kBbbbbbbbbbbbwsk',
  '.kBBbbbbbbbbBwk.',
  '..kBBBBBBBBBBk..',
  '..kBk.kBk.kBk...',
  '..kkk.kkk.kkk...',
  '................',
  '................',
  '................',
];
export const BOAR: Sprite = {
  palette: { k: OUTLINE, b: '#6a4e3a', B: '#46332a', t: '#4f6a35', T: '#86a04f', r: '#e0505a', s: '#9a7462', w: '#ece0c4' },
  rows: BOAR_ROWS,
};
/** Old Tusk, the mini boss: the same beast, grey with age, moss on its back and a gold eye. */
export const OLD_TUSK: Sprite = {
  palette: { k: OUTLINE, b: '#5c5a54', B: '#3a3936', t: '#3e5226', T: '#6f8c48', r: '#f2c94c', s: '#7a6e64', w: '#fff4d8' },
  rows: BOAR_ROWS,
};

/* ---------------- door icons (8×8) ---------------- */
export const ICONS: Record<string, Sprite> = {
  gold: { palette: { k: OUTLINE, y: '#d9a441', Y: '#f2d27a' }, rows: [
    '..kkkk..', '.kyyyyk.', 'kyYyyyyk', 'kyYyyyyk', 'kyyyyYyk', 'kyyyyYyk', '.kyyyyk.', '..kkkk..'] },
  heal: { palette: { k: OUTLINE, r: '#b8483e', R: '#e07a6a' }, rows: [
    '.kk..kk.', 'krRkkrrk', 'krRrrrrk', 'krrrrrrk', '.krrrrk.', '..krrk..', '...kk...', '........'] },
  power: { palette: { k: OUTLINE, p: '#8a6fc2', P: '#c9b6ff' }, rows: [
    '...kk...', '..kppk..', '.kpPppk.', 'kpPppppk', '.kppppk.', '..kppk..', '...kk...', '........'] },
  training: { palette: { k: OUTLINE, b: '#4a6a8a', w: '#e0d6c0' }, rows: [
    '.kkkkkk.', 'kbbbbbbk', 'kbwwwwbk', 'kbbbbbbk', 'kbwwwbbk', 'kbbbbbbk', 'kkkkkkkk', '.wwwwww.'] },
  boss: { palette: { k: OUTLINE, w: '#e0d6c0', r: '#b8483e' }, rows: [
    '.kkkkkk.', 'kwwwwwwk', 'kwkwwkwk', 'kwkwwkwk', 'kwwwwwwk', '.kwkkwk.', '.kwwwwk.', '..kkkk..'] },
  chest: { palette: { k: OUTLINE, b: '#7a5234', B: '#5a3a24', y: '#d9a441' }, rows: [
    '........', '.kkkkkk.', 'kbbbbbbk', 'kbbyybbk', 'kkkyykkk', 'kBBBBBBk', 'kBBBBBBk', '.kkkkkk.'] },
  skull: { palette: { k: OUTLINE, w: '#c9c0aa' }, rows: [
    '.kkkkk.', 'kwwwwwk', 'kwkwkwk', 'kwwwwwk', '.kwkwk.', '..kkk..'] },
};

/** Draw a sprite into a new canvas, `scale` screen pixels per art pixel. */
export function spriteCanvas(sprite: Sprite, scale = 1): HTMLCanvasElement {
  const h = sprite.rows.length, w = sprite.rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const ctx = c.getContext('2d')!;
  sprite.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = sprite.palette[row[x]];
      if (row[x] === '.' || !color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  return c;
}
