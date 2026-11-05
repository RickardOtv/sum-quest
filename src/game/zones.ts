/**
 * The zones you can head out to. Each has its own enemies, mini boss (room 5),
 * boss (room 10), look, and a step up in difficulty and rewards.
 *
 *   Thornwood – the forest at the edge of camp (always open)
 *   Emberfall – the village beyond the forest, abandoned and still burning.
 *               There's no choosing it: once Old Rootback falls, the only
 *               path leads out of the forest and into the village.
 */
import type { EnemyKind } from './run';

export type ZoneId = 'thornwood' | 'emberfall';

export interface Zone {
  id: ZoneId; num: number; name: string; blurb: string;
  style: 'forest' | 'village';
  /** Which enemies rooms are built from, and from which room (0-based) each one shows up. */
  roster: { kind: EnemyKind; from: number }[];
  miniboss: EnemyKind; minibossName: string; minibossTip: string;
  boss: EnemyKind; bossName: string; bossSub: string;
  bossBar: number; minibossBar: number;
  /** Multipliers over Thornwood: enemy HP, gold found, extra chest quality. */
  hpMult: number; goldMult: number; chestBonus: number;
  /** Extra enemy budget per room (more enemies at once). */
  budgetBonus: number;
}

export const ZONES: Record<ZoneId, Zone> = {
  thornwood: {
    id: 'thornwood', num: 1, name: 'Thornwood', blurb: 'The old trees lost count. Their woods crawl with miscounts.', style: 'forest',
    roster: [{ kind: 'slime', from: 0 }, { kind: 'spore', from: 0 }, { kind: 'wisp', from: 1 }, { kind: 'boar', from: 2 }],
    miniboss: 'tusk', minibossName: 'Old Tusk', minibossTip: 'watch for the red line',
    boss: 'boss', bossName: 'Old Rootback', bossSub: 'the tree that lost count of its rings',
    bossBar: 0xb8483e, minibossBar: 0xd08a3a, hpMult: 1, goldMult: 1, chestBonus: 0, budgetBonus: 0,
  },
  emberfall: {
    id: 'emberfall', num: 2, name: 'Emberfall', blurb: 'The village forgot its measure. The fire never learned to stop. Someone is still hiding.', style: 'village',
    roster: [{ kind: 'imp', from: 0 }, { kind: 'slime', from: 0 }, { kind: 'hound', from: 1 }, { kind: 'wisp', from: 3 }],
    miniboss: 'cinderjaw', minibossName: 'Cinderjaw', minibossTip: 'its charge leaves fire behind',
    boss: 'golem', bossName: 'The Cinder Golem', bossSub: 'the hearth-keeper who forgot the measure',
    bossBar: 0xe0702a, minibossBar: 0xd0503e, hpMult: 1.55, goldMult: 1.6, chestBonus: 0.12, budgetBonus: 1.5,
  },
};
export const ZONE_LIST: ZoneId[] = ['thornwood', 'emberfall'];
