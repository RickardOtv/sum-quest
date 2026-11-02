/**
 * Room layout: which props stand where. Pure data (no Phaser), so the rules
 * are easy to read and test.
 *
 * Every room picks a theme (grove, ruins, rocky, bog) and places a few
 * obstacles, keeping clear: the strip in front of the doors, the hero's
 * start at the bottom, and (in boss rooms) the space the boss needs.
 * Obstacles keep enough distance from each other that there is always a
 * way around them.
 *
 * Solid props (rocks, trees, logs, pillars, stumps) block walking and shots,
 * so they work as cover. Pits block walking only: shots fly over them.
 */
import type { Reward } from './run';

export type PropKind = 'rock' | 'boulder' | 'stump' | 'log' | 'pillar' | 'pit' | 'pine' | 'tree' | 'deadtree' | 'wall' | 'crate' | 'barrel' | 'fence'
  // Emberfall (see village.ts)
  | 'house' | 'burnt' | 'ruin' | 'chapel' | 'well' | 'stall' | 'cart' | 'hay' | 'lamp' | 'sign' | 'grave' | 'rubble' | 'blaze' | 'birch';
export type DecorKind = 'bush' | 'flowers' | 'shrooms' | 'ash' | 'tuft' | 'pot';

interface PropDef {
  textures: string[];                    // texture variants (see art/props.ts)
  colliders: [number, number, number][]; // [dx, dy, radius] from the prop's base point, in world px
  solid: boolean;                        // blocks shots and bullets too
  originY: number;                       // where the base point sits in the sprite (0 = top, 1 = bottom)
}
export const PROPS: Record<PropKind, PropDef> = {
  rock: { textures: ['prop_rock0', 'prop_rock1', 'prop_rock2', 'prop_rock3'], colliders: [[0, -6, 13]], solid: true, originY: 0.85 },
  boulder: { textures: ['prop_boulder0', 'prop_boulder1'], colliders: [[0, -10, 21]], solid: true, originY: 0.88 },
  stump: { textures: ['prop_stump'], colliders: [[0, -6, 12]], solid: true, originY: 0.88 },
  log: { textures: ['prop_log'], colliders: [[-24, -8, 10], [0, -8, 10], [24, -8, 10]], solid: true, originY: 0.82 },
  pillar: { textures: ['prop_pillar0', 'prop_pillar1'], colliders: [[0, -6, 11]], solid: true, originY: 0.93 },
  pit: { textures: ['prop_pit0', 'prop_pit1'], colliders: [[-13, 0, 15], [13, 0, 15], [0, 0, 16]], solid: false, originY: 0.5 },
  pine: { textures: ['prop_pine0', 'prop_pine1', 'prop_pine2'], colliders: [[0, -5, 12]], solid: true, originY: 0.97 },
  tree: { textures: ['prop_tree0', 'prop_tree1', 'prop_tree2'], colliders: [[0, -7, 15]], solid: true, originY: 0.96 },
  deadtree: { textures: ['prop_deadtree'], colliders: [[0, -5, 9]], solid: true, originY: 0.95 },
  wall: { textures: ['prop_wall'], colliders: [[-24, -10, 12], [0, -10, 12], [24, -10, 12]], solid: true, originY: 0.9 },
  crate: { textures: ['prop_crate'], colliders: [[0, -10, 13]], solid: true, originY: 0.94 },
  barrel: { textures: ['prop_barrel'], colliders: [[0, -8, 11]], solid: true, originY: 0.94 },
  // a fence stops you walking but shots go through the gaps
  fence: { textures: ['prop_fence'], colliders: [[-22, -6, 11], [0, -6, 11], [22, -6, 11]], solid: false, originY: 0.9 },

  // ---- Emberfall. Buildings block a grid of circles over their whole footprint (you can't walk behind them). ----
  house: { textures: ['vh_house_slate', 'vh_house_teal', 'vh_house_brown'], colliders: grid([-56, -28, 0, 28, 56], [-14, -42, -70, -96], 16), solid: true, originY: 0.97 },
  burnt: { textures: ['vh_burnt_slate', 'vh_burnt_teal', 'vh_burnt_brown'], colliders: grid([-56, -28, 0, 28, 56], [-14, -42, -70, -96], 16), solid: true, originY: 0.97 },
  ruin: { textures: ['vh_ruin0', 'vh_ruin1'], colliders: grid([-54, -27, 0, 27, 54], [-12, -38], 15), solid: true, originY: 0.975 },
  chapel: { textures: ['vh_chapel'], colliders: grid([-60, -30, 0, 30, 60], [-16, -46, -76, -104], 17), solid: true, originY: 0.965 },
  well: { textures: ['vh_well'], colliders: [[0, -12, 20]], solid: true, originY: 0.93 },
  stall: { textures: ['vh_stall0', 'vh_stall1'], colliders: [[-26, -10, 11], [0, -10, 11], [26, -10, 11]], solid: true, originY: 0.9 },
  cart: { textures: ['vh_cart'], colliders: [[-18, -10, 12], [8, -12, 14]], solid: true, originY: 0.92 },
  hay: { textures: ['vh_hay0', 'vh_hay1'], colliders: [[0, -10, 16]], solid: true, originY: 0.94 },
  lamp: { textures: ['vh_lamp'], colliders: [[0, -4, 6]], solid: true, originY: 0.96 },
  sign: { textures: ['vh_sign'], colliders: [[0, -4, 7]], solid: true, originY: 0.96 },
  grave: { textures: ['vh_grave0', 'vh_grave1'], colliders: [[0, -6, 9]], solid: true, originY: 0.9 },
  // low heaps: they stop you walking, but shots fly over them
  birch: { textures: ['vh_birch0', 'vh_birch1'], colliders: [[0, -6, 11]], solid: true, originY: 0.96 },
  rubble: { textures: ['vh_rubble0', 'vh_rubble1'], colliders: [[-12, -8, 11], [10, -8, 11]], solid: false, originY: 0.85 },
  blaze: { textures: ['vh_rubble0', 'vh_rubble1'], colliders: [[-12, -8, 12], [10, -8, 12]], solid: false, originY: 0.85 }, // burning rubble
};
/** Circles on a grid (for buildings). */
function grid(xs: number[], ys: number[], r: number): [number, number, number][] { return ys.flatMap(y => xs.map(x => [x, y, r] as [number, number, number])); }
export const DECOR: Record<DecorKind, string[]> = {
  bush: ['prop_bush0', 'prop_bush1', 'prop_bush2'], flowers: ['prop_flowers0', 'prop_flowers1', 'prop_flowers2'], shrooms: ['prop_shrooms'], ash: ['vh_ash0', 'vh_ash1'], tuft: ['vh_tuft0', 'vh_tuft1', 'vh_tuft2'], pot: ['vh_pot0', 'vh_pot1'],
};

const THEMES: Record<string, PropKind[]> = {
  grove: ['tree', 'tree', 'pine', 'tree', 'stump', 'rock'],
  ruins: ['pillar', 'pillar', 'wall', 'rock', 'boulder', 'tree'],
  rocky: ['boulder', 'rock', 'rock', 'pit', 'pine', 'stump'],
  bog: ['pit', 'pit', 'log', 'deadtree', 'stump', 'tree'],
  camp: ['crate', 'barrel', 'fence', 'crate', 'stump', 'tree'], // an abandoned camp in the woods
};

export interface PlacedProp { kind: PropKind; texture: string; x: number; y: number; flip: boolean; }
export interface PlacedDecor { kind: DecorKind; texture: string; x: number; y: number; }
export interface Layout { theme: string; props: PlacedProp[]; decor: PlacedDecor[]; }
export interface Area { left: number; right: number; top: number; bottom: number; }

/** Outer radius of a prop (for spacing). */
export const reach = (k: PropKind) => Math.max(...PROPS[k].colliders.map(([dx, dy, r]) => Math.hypot(dx, dy) + r));

/** Plan one room. `rnd` returns 0..1 (pass a seeded one for repeatable rooms). */
export function planRoom(area: Area, room: number, reward: Reward, rnd: () => number = Math.random): Layout {
  const W = area.right - area.left, cx = (area.left + area.right) / 2;
  const themeNames = Object.keys(THEMES);
  const theme = reward === 'boss' ? 'ruins' : themeNames[Math.floor(rnd() * themeNames.length)];
  const pool = THEMES[theme];
  const count = reward === 'training' ? 0 : reward === 'boss' ? 2 : reward === 'miniboss' ? 4 : Math.min(9, 5 + Math.floor(room / 2) + Math.floor(rnd() * 2));
  const props: PlacedProp[] = [];
  // kept clear: the strip in front of the doors (top) and the hero's start (bottom)
  const yMin = area.top + 72, yMax = area.bottom - 110;
  const free = (k: PropKind, x: number, y: number) => {
    if (reward === 'miniboss' || reward === 'boss') { if (Math.abs(x - cx) < 90 && y < area.top + 170) return false; } // the boss's spot
    return props.every(p => Math.hypot(p.x - x, p.y - y) > reach(p.kind) + reach(k) + 24); // 24 px = room for the hero to pass
  };
  for (let i = 0, tries = 0; i < count && tries < 200; tries++) {
    const kind = reward === 'boss' ? 'pillar' : reward === 'miniboss' ? (i === 0 ? 'boulder' : 'rock') : pool[Math.floor(rnd() * pool.length)];
    const margin = reach(kind) + 12;
    let x = area.left + margin + rnd() * (W - margin * 2), y = yMin + rnd() * (yMax - yMin);
    if (reward === 'boss') { x = i === 0 ? area.left + 46 : area.right - 46; y = area.top + 210 + rnd() * 120; } // pillars at the sides to dodge behind
    if (!free(kind, x, y)) continue;
    const tex = PROPS[kind].textures;
    props.push({ kind, texture: tex[Math.floor(rnd() * tex.length)], x: Math.round(x), y: Math.round(y), flip: rnd() < 0.5 });
    i++;
  }
  // decoration: anywhere except on top of a prop or the hero's start
  const decor: PlacedDecor[] = [];
  const nDecor = 10 + Math.floor(rnd() * 6);
  for (let i = 0, tries = 0; i < nDecor && tries < 80; tries++) {
    const kinds: DecorKind[] = theme === 'bog' ? ['bush', 'shrooms', 'shrooms'] : theme === 'grove' ? ['bush', 'flowers', 'shrooms'] : ['flowers', 'bush', 'flowers'];
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    const x = area.left + 16 + rnd() * (W - 32), y = area.top + 24 + rnd() * (area.bottom - area.top - 40);
    if (Math.hypot(x - cx, y - (area.bottom - 40)) < 50) continue;
    if (props.some(p => Math.hypot(p.x - x, p.y - y) < reach(p.kind) + 10)) continue;
    const tex = DECOR[kind];
    decor.push({ kind, texture: tex[Math.floor(rnd() * tex.length)], x: Math.round(x), y: Math.round(y) });
    i++;
  }
  return { theme, props, decor };
}

/** The colliders of a placed prop, in world coordinates. */
export function collidersOf(p: PlacedProp): { x: number; y: number; r: number }[] {
  return PROPS[p.kind].colliders.map(([dx, dy, r]) => ({ x: p.x + (p.flip ? -dx : dx), y: p.y + dy, r }));
}
