/**
 * Emberfall room maps. Unlike the forest (scattered at random), each village
 * room starts from a hand-made map (a street, the square with its well, a
 * farmstead, the chapel and its graveyard, a burnt row…) so it reads as a
 * real place. On top of that, a few things are random every time:
 *   - which houses still stand and which burned (and their roof colours),
 *   - which barrels, crates, carts and haystacks are there, nudged a little,
 *   - where the fires are still burning.
 * Every layout is checked so you can always walk from the start to the doors;
 * if the random bits block the way, small things are taken out until it works.
 *
 * Positions are fractions of the play area: u = 0 (left) … 1 (right),
 * v = 0 (just below the door strip) … 1 (just above the hero's start).
 * Pure data, no Phaser.
 */
import type { Reward } from './run';
import { DECOR, PROPS, collidersOf, reach, type Area, type PlacedDecor, type PlacedProp, type PropKind } from './room';

/** A painted patch of ground (world px): cobbles, a dirt yard, or scorched ash. */
export interface Ground { kind: 'cobble' | 'dirt' | 'scorch'; shape: 'rect' | 'ellipse'; x: number; y: number; w: number; h: number; }
export interface VillageLayout { name: string; props: PlacedProp[]; decor: PlacedDecor[]; ground: Ground[]; }

/** A slot on a map. `kinds`: one is picked; `chance`: how often the slot is used at all. */
interface Slot { kinds: PropKind[]; u: number; v: number; chance?: number; flip?: boolean; }
interface GroundSpec { kind: Ground['kind']; shape: Ground['shape']; u: number; v: number; w: number; h: number; } // centre + size, in fractions
interface MapDef { name: string; ground: GroundSpec[]; slots: Slot[]; blazes: number; }

const BUILDING: PropKind[] = ['house', 'burnt', 'burnt']; // most houses burned
const SMALL: PropKind[] = ['barrel', 'barrel', 'crate'];

const MAPS: MapDef[] = [
  { name: 'main street', blazes: 1,
    ground: [{ kind: 'dirt', shape: 'rect', u: 0.5, v: 0.5, w: 0.2, h: 1.6 }, { kind: 'dirt', shape: 'ellipse', u: 0.25, v: 0.4, w: 0.35, h: 0.25 }],
    slots: [
      { kinds: BUILDING, u: 0.15, v: 0.28 }, { kinds: BUILDING, u: 0.85, v: 0.6 }, { kinds: ['house', 'burnt', 'ruin'], u: 0.15, v: 0.98, chance: 0.8 },
      { kinds: ['lamp'], u: 0.31, v: 0.05 }, { kinds: ['lamp'], u: 0.69, v: 0.42 },
      { kinds: SMALL, u: 0.33, v: 0.38, chance: 0.7 }, { kinds: SMALL, u: 0.31, v: 0.7, chance: 0.5 }, { kinds: SMALL, u: 0.7, v: 0.12, chance: 0.7 },
      { kinds: ['cart', 'hay'], u: 0.8, v: 0.1, chance: 0.6 }, { kinds: ['sign'], u: 0.68, v: 0.9, chance: 0.6 }, { kinds: SMALL, u: 0.73, v: 0.96, chance: 0.5 },
      { kinds: ['birch'], u: 0.9, v: 0.25, chance: 0.8 }, { kinds: ['birch'], u: 0.1, v: 0.62, chance: 0.6 },
    ] },
  { name: 'village square', blazes: 1,
    ground: [{ kind: 'dirt', shape: 'ellipse', u: 0.5, v: 0.45, w: 0.8, h: 0.8 }, { kind: 'cobble', shape: 'ellipse', u: 0.5, v: 0.45, w: 0.45, h: 0.45 }, { kind: 'dirt', shape: 'rect', u: 0.5, v: 1, w: 0.18, h: 0.6 }],
    slots: [
      { kinds: ['well'], u: 0.5, v: 0.45 },
      { kinds: ['stall'], u: 0.2, v: 0.08 }, { kinds: ['stall', 'cart'], u: 0.8, v: 0.82, chance: 0.8 },
      { kinds: BUILDING, u: 0.86, v: 0.22 }, { kinds: BUILDING, u: 0.14, v: 0.8 },
      { kinds: ['lamp'], u: 0.3, v: 0.32 }, { kinds: ['lamp'], u: 0.7, v: 0.58 },
      { kinds: SMALL, u: 0.36, v: 0.62, chance: 0.6 }, { kinds: SMALL, u: 0.64, v: 0.25, chance: 0.6 }, { kinds: SMALL, u: 0.38, v: 0.1, chance: 0.5 },
      { kinds: ['hay', 'barrel'], u: 0.62, v: 0.98, chance: 0.4 }, { kinds: ['birch'], u: 0.08, v: 0.38, chance: 0.7 }, { kinds: ['birch'], u: 0.93, v: 0.55, chance: 0.6 },
    ] },
  { name: 'farmstead', blazes: 1,
    ground: [{ kind: 'dirt', shape: 'ellipse', u: 0.3, v: 0.55, w: 0.55, h: 0.7 }, { kind: 'dirt', shape: 'rect', u: 0.6, v: 0.5, w: 0.16, h: 1.6 }],
    slots: [
      { kinds: BUILDING, u: 0.18, v: 0.22 }, { kinds: ['hay'], u: 0.12, v: 0.62 }, { kinds: ['hay'], u: 0.3, v: 0.76, chance: 0.7 }, { kinds: ['hay', 'cart'], u: 0.88, v: 0.68 },
      { kinds: ['fence'], u: 0.3, v: 0.48, chance: 0.8 }, { kinds: ['fence'], u: 0.85, v: 0.12 }, { kinds: ['cart'], u: 0.85, v: 0.38, chance: 0.7 },
      { kinds: SMALL, u: 0.38, v: 0.2, chance: 0.6 }, { kinds: SMALL, u: 0.75, v: 0.95, chance: 0.6 }, { kinds: SMALL, u: 0.1, v: 0.95, chance: 0.5 },
      { kinds: ['lamp'], u: 0.47, v: 0.05 }, { kinds: ['birch'], u: 0.45, v: 0.88, chance: 0.7 }, { kinds: ['birch'], u: 0.9, v: 0.92, chance: 0.5 },
    ] },
  { name: 'chapel', blazes: 0,
    ground: [{ kind: 'dirt', shape: 'rect', u: 0.6, v: 0.5, w: 0.18, h: 1.6 }, { kind: 'dirt', shape: 'ellipse', u: 0.25, v: 0.45, w: 0.45, h: 0.22 }],
    slots: [
      { kinds: ['chapel'], u: 0.22, v: 0.3 },
      { kinds: ['grave'], u: 0.8, v: 0.1 }, { kinds: ['grave'], u: 0.92, v: 0.16 }, { kinds: ['grave'], u: 0.78, v: 0.3, chance: 0.8 }, { kinds: ['grave'], u: 0.92, v: 0.36, chance: 0.8 }, { kinds: ['grave'], u: 0.8, v: 0.5, chance: 0.6 },
      { kinds: ['fence'], u: 0.84, v: 0.62 }, { kinds: ['ruin', 'burnt'], u: 0.16, v: 0.9 },
      { kinds: ['lamp'], u: 0.44, v: 0.15 }, { kinds: ['rubble'], u: 0.42, v: 0.6, chance: 0.7 }, { kinds: SMALL, u: 0.86, v: 0.92, chance: 0.6 },
      { kinds: ['birch'], u: 0.94, v: 0.75, chance: 0.8 }, { kinds: ['birch'], u: 0.36, v: 0.92, chance: 0.5 },
    ] },
  { name: 'burnt row', blazes: 2,
    ground: [{ kind: 'dirt', shape: 'rect', u: 0.5, v: 0.5, w: 0.22, h: 1.6 }],
    slots: [
      { kinds: ['burnt'], u: 0.15, v: 0.26 }, { kinds: ['burnt', 'ruin'], u: 0.85, v: 0.5 }, { kinds: ['ruin'], u: 0.17, v: 0.9 },
      { kinds: ['rubble'], u: 0.68, v: 0.15, chance: 0.7 }, { kinds: ['cart'], u: 0.72, v: 0.88, chance: 0.7 },
      { kinds: SMALL, u: 0.34, v: 0.62, chance: 0.6 }, { kinds: ['lamp'], u: 0.67, v: 0.72 }, { kinds: SMALL, u: 0.33, v: 0.12, chance: 0.6 },
      { kinds: ['birch'], u: 0.9, v: 0.15, chance: 0.6 },
    ] },
];

/** Open plazas for the big fights: everything at the edges, the middle clear. */
const PLAZA: MapDef = { name: 'plaza', blazes: 2,
  ground: [{ kind: 'dirt', shape: 'ellipse', u: 0.5, v: 0.35, w: 0.8, h: 1.0 }, { kind: 'cobble', shape: 'ellipse', u: 0.5, v: 0.3, w: 0.5, h: 0.6 }, { kind: 'dirt', shape: 'rect', u: 0.5, v: 1, w: 0.18, h: 0.8 }],
  slots: [
    { kinds: ['burnt', 'ruin'], u: 0.13, v: 0.85 }, { kinds: ['burnt', 'ruin'], u: 0.87, v: 0.85 },
    { kinds: ['lamp'], u: 0.08, v: 0.35 }, { kinds: ['lamp'], u: 0.92, v: 0.35 },
    { kinds: SMALL, u: 0.1, v: 0.12, chance: 0.7 }, { kinds: SMALL, u: 0.9, v: 0.15, chance: 0.7 }, { kinds: ['rubble'], u: 0.3, v: 0.6, chance: 0.5 }, { kinds: ['rubble'], u: 0.7, v: 0.55, chance: 0.5 },
  ] };

/** Plan one village room. `rnd` returns 0..1. */
export function planVillage(area: Area, room: number, reward: Reward, rnd: () => number = Math.random): VillageLayout {
  const big = reward === 'boss' || reward === 'miniboss';
  const map = big ? PLAZA : MAPS[(room + Math.floor(rnd() * MAPS.length)) % MAPS.length];
  const W = area.right - area.left, cx = (area.left + area.right) / 2;
  const yMin = area.top + 80, yMax = area.bottom - 96;
  const at = (u: number, v: number) => [area.left + u * W, yMin + v * (yMax - yMin)] as const;
  const startX = cx, startY = area.bottom - 40;

  const ground: Ground[] = map.ground.map(g => { const [x, y] = at(g.u, g.v); return { kind: g.kind, shape: g.shape, x, y, w: g.w * W, h: g.h * (yMax - yMin) }; });
  // a street along the village wall where the doors are, and the way up from where you start
  ground.push({ kind: 'dirt', shape: 'rect', x: cx, y: area.top + 22, w: W + 40, h: 40 });

  const props: PlacedProp[] = [];
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const fits = (kind: PropKind, x: number, y: number) => {
    const p = { kind, texture: '', x, y, flip: false };
    const cols = collidersOf(p);
    const side = cols.length > 4 ? 70 : 6; // big buildings may stand partly behind the side hedges (cropped, like a real street)
    if (cols.some(c => c.y - c.r < area.top + 62 || c.x - c.r < area.left - side || c.x + c.r > area.right + side || c.y + c.r > area.bottom - 6)) return false;
    if (cols.some(c => Math.hypot(c.x - startX, c.y - startY) < c.r + 44)) return false;
    if (big && cols.some(c => Math.abs(c.x - cx) < 100 && c.y < area.top + 200)) return false; // the boss's spot
    return props.every(o => Math.hypot(o.x - x, o.y - y) > reach(o.kind) + reach(kind) + 6);
  };
  for (const s of map.slots) {
    if (s.chance !== undefined && rnd() > s.chance) continue;
    const kind = pick(s.kinds);
    let [x, y] = at(s.u, s.v);
    const jitter = PROPS[kind].colliders.length > 4 ? 4 : 10; // buildings stay put, small things wander a bit
    x += (rnd() - 0.5) * 2 * jitter; y += (rnd() - 0.5) * 2 * jitter;
    // if it doesn't fit (off the edge or too near the doors), nudge it inward a few times
    for (let t = 0; t < 16 && !fits(kind, x, y); t++) { y += 8; x += x < cx ? 3 : -3; }
    if (!fits(kind, x, y)) continue;
    props.push({ kind, texture: pick(PROPS[kind].textures), x: Math.round(x), y: Math.round(y), flip: kind === 'house' || kind === 'burnt' ? rnd() < 0.5 : rnd() < 0.3 });
  }
  // burning rubble in free spots
  for (let i = 0, tries = 0; i < map.blazes && tries < 40; tries++) {
    const x = area.left + 40 + rnd() * (W - 80), y = yMin + rnd() * (yMax - yMin);
    if (!fits('blaze', x, y)) continue;
    props.push({ kind: 'blaze', texture: pick(PROPS.blaze.textures), x: Math.round(x), y: Math.round(y), flip: rnd() < 0.5 });
    i++;
  }
  // a couple of extra barrels or crates anywhere they fit
  for (let i = 0, n = Math.floor(rnd() * 3), tries = 0; i < n && tries < 30; tries++) {
    const kind = pick(SMALL), x = area.left + 30 + rnd() * (W - 60), y = yMin + rnd() * (yMax - yMin);
    if (!fits(kind, x, y)) continue;
    props.push({ kind, texture: pick(PROPS[kind].textures), x: Math.round(x), y: Math.round(y), flip: rnd() < 0.5 }); i++;
  }
  // make sure you can always get from the start to the doors; drop small things (last first) until you can
  while (!reachable(area, props) && props.length) {
    const i = props.map(p => PROPS[p.kind].colliders.length).lastIndexOf(Math.min(...props.map(p => PROPS[p.kind].colliders.length)));
    props.splice(i, 1);
  }

  // decoration that ties things into the ground: grass tufts at the feet of props, olive bushes and
  // flower pots against the houses (cozy), ash with embers near the fires
  const decor: PlacedDecor[] = [];
  const burning = props.filter(p => p.kind === 'burnt' || p.kind === 'blaze');
  const clear = (x: number, y: number, pad: number) => Math.hypot(x - startX, y - startY) > 36 && !props.some(p => collidersOf(p).some(c => Math.hypot(c.x - x, c.y - y) < c.r + pad));
  for (const p of props) {
    if (p.kind === 'blaze' || p.kind === 'rubble') continue;
    const half = Math.max(...PROPS[p.kind].colliders.map(([dx, , r]) => Math.abs(dx) + r));
    for (const side of [-1, 1]) if (rnd() < 0.8) decor.push({ kind: 'tuft', texture: pick(DECOR.tuft), x: Math.round(p.x + side * (half - 2 + rnd() * 6)), y: Math.round(p.y + 2 + rnd() * 3) });
    if ((p.kind === 'house' || p.kind === 'well') && rnd() < 0.7) {
      const x = p.x + (rnd() < 0.5 ? -1 : 1) * (half + 10), y = p.y + 4;
      if (clear(x, y, 4)) decor.push({ kind: rnd() < 0.5 ? 'pot' : 'bush', texture: '', x: Math.round(x), y: Math.round(y) });
    }
  }
  for (let i = 0, tries = 0; i < 8 && tries < 90; tries++) {
    const x = area.left + 12 + rnd() * (W - 24), y = area.top + 70 + rnd() * (area.bottom - area.top - 90);
    if (!clear(x, y, 8)) continue;
    const nearFire = burning.some(p => Math.hypot(p.x - x, p.y - y) < 90);
    decor.push({ kind: nearFire ? 'ash' : 'bush', texture: '', x: Math.round(x), y: Math.round(y) }); i++;
  }
  for (const d of decor) if (!d.texture) d.texture = d.kind === 'bush' ? pick(['vh_bush0', 'vh_bush1', 'vh_bush2']) : pick(DECOR[d.kind]);
  // scorch marks under every burnt building and fire
  for (const p of burning) ground.push({ kind: 'scorch', shape: 'ellipse', x: p.x, y: p.y - 4, w: p.kind === 'blaze' ? 56 : 100, h: p.kind === 'blaze' ? 26 : 34 });
  return { name: map.name, props, decor, ground };
}

/** Can the hero (radius 8) walk from the start to the door strip? A flood fill over a 6-px grid. */
export function reachable(area: Area, props: PlacedProp[], extra: { x: number; y: number; r: number }[] = []): boolean {
  const cols = [...props.flatMap(collidersOf), ...extra], step = 6, r = 9;
  const gw = Math.floor((area.right - area.left) / step), gh = Math.floor((area.bottom - area.top) / step);
  const free = (i: number, j: number) => { const x = area.left + i * step, y = area.top + j * step; return cols.every(c => Math.hypot(c.x - x, c.y - y) >= c.r + r); };
  const seen = new Uint8Array(gw * gh), queue: number[] = [];
  const si = Math.floor(gw / 2), sj = gh - 7;
  if (!free(si, sj)) return false;
  queue.push(sj * gw + si); seen[sj * gw + si] = 1;
  while (queue.length) {
    const k = queue.pop()!, i = k % gw, j = (k - i) / gw;
    if (j * step < 40) return true; // reached the door street
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
      const nk = nj * gw + ni; if (seen[nk] || !free(ni, nj)) continue;
      seen[nk] = 1; queue.push(nk);
    }
  }
  return false;
}

/**
 * Where flames sit on a prop, in texture pixels (from the texture's top-left; textures are HD, shown at scale 1).
 * Burnt houses burn in their roof hole; burning rubble on top; the smoking haystack.
 */
export const FIRE_SPOTS: Record<string, [number, number][]> = {
  vh_burnt_slate: [[76, 48], [62, 54]], vh_burnt_teal: [[88, 48]], vh_burnt_brown: [[100, 48], [86, 54]],
  vh_rubble0: [[28, 18], [16, 22]], vh_rubble1: [[28, 18], [40, 20]],
  vh_hay1: [[30, 14]],
  vh_ruin1: [[88, 88]],
};
