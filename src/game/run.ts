/**
 * Run state and room planning (no rendering here).
 * A run is one journey through the zones in order (see zones.ts): 10 rooms
 * of Thornwood, then the only way on leads out of the forest into Emberfall
 * for 10 more. In each zone room 5 is the mini boss and room 10 the boss.
 * After each room you choose the next door; each door shows its difficulty
 * and what you'll get for clearing it.
 */
import { CONFIG } from '../config';
import type { PerkLevels } from './perks';
import { ZONES, ZONE_LIST, type ZoneId } from './zones';

/** 'onward' is the single path out of a zone after its boss (it leads into the next zone). */
export type Reward = 'gold' | 'power' | 'heal' | 'chest' | 'training' | 'miniboss' | 'boss' | 'onward';
export type EnemyKind = 'slime' | 'spore' | 'wisp' | 'boar' | 'tusk' | 'boss' | 'imp' | 'hound' | 'cinderjaw' | 'golem';

export interface DoorSpec { reward: Reward; difficulty: 1 | 2 | 3; }

export interface RunStats {
  answered: number; exact: number;
  critsHit: number; critsMissed: number;
  specials: number; bestHit: number;
  kills: number;
}

export interface RunState {
  zone: ZoneId;
  room: number;          // index of the current room over the whole journey (0-based: 0–9 Thornwood, 10–19 Emberfall)
  lastReward?: Reward;   // the room before this one (no two heal doors in a row)
  current: DoorSpec;     // the room you're in now
  hp: number; maxHp: number;
  perks: PerkLevels;
  gold: number;          // gold found this run (kept even if you die)
  charges: number[];     // one special meter per skill slot, 0..100
  trainingDone: string[];
  stats: RunStats;
}

export function newRun(maxHp: number, zone: ZoneId = 'thornwood'): RunState {
  return {
    zone, room: 0, current: { reward: 'power', difficulty: 1 },
    hp: maxHp, maxHp, perks: {}, gold: 0, charges: [CONFIG.special.startCharge, CONFIG.special.startCharge], trainingDone: [],
    stats: { answered: 0, exact: 0, critsHit: 0, critsMissed: 0, specials: 0, bestHit: 0, kills: 0 },
  };
}

/** Rooms per zone (the boss room comes right after the last normal room), and over the whole journey. */
export const ZONE_ROOMS = CONFIG.run.roomsBeforeBoss + 1;
export const TOTAL_ROOMS = ZONE_ROOMS * ZONE_LIST.length;
/** Which zone a room (0-based, whole journey) is in, and its number inside that zone (0-based). */
export const zoneOfRoom = (room: number): ZoneId => ZONE_LIST[Math.min(ZONE_LIST.length - 1, Math.floor(room / ZONE_ROOMS))];
export const localRoom = (room: number) => room % ZONE_ROOMS;
/** Is this the last zone's boss (the end of the journey)? */
export const isFinalBoss = (run: RunState) => run.zone === ZONE_LIST[ZONE_LIST.length - 1];
export const isBossNext = (run: RunState) => localRoom(run.room) === CONFIG.run.roomsBeforeBoss - 1;
export const isMiniBossNext = (run: RunState) => localRoom(run.room) === CONFIG.run.miniBossRoom - 1;

/** Choose the doors shown after a room. Heal doors are rare (a bit less so when you're hurt) and never twice in a row. */
export function rollDoors(run: RunState): DoorSpec[] {
  if (run.current.reward === 'boss') return [{ reward: 'onward', difficulty: 1 }]; // the only path: out of the zone
  if (isBossNext(run)) return [{ reward: 'boss', difficulty: 3 }];
  if (isMiniBossNext(run)) return [{ reward: 'miniboss', difficulty: 3 }];
  const count = Math.random() < 0.4 ? 3 : 2;
  const lowHp = run.hp / run.maxHp < 0.5, r = CONFIG.run;
  const healW = run.current.reward === 'heal' || run.current.reward === 'miniboss' ? 0 : lowHp ? r.healDoorWeightHurt : r.healDoorWeight;
  const weights: [Reward, number][] = [
    ['gold', 0.3], ['power', 0.28], ['heal', healW], ['chest', 0.18],
    ['training', run.trainingDone.length < 2 ? 0.2 : 0],
  ];
  const doors: DoorSpec[] = [];
  const used = new Set<Reward>();
  while (doors.length < count) {
    const pool = weights.filter(([r, w]) => w > 0 && !used.has(r));
    if (!pool.length) break;
    let x = Math.random() * pool.reduce((a, [, w]) => a + w, 0);
    const reward = pool.find(([, w]) => (x -= w) <= 0)?.[0] ?? pool[0][0];
    used.add(reward);
    const r = Math.random();
    doors.push({ reward, difficulty: r < 0.4 ? 1 : r < 0.8 ? 2 : 3 });
  }
  return doors;
}

/** Which enemies a room spawns, from a difficulty "budget". */
export function planEnemies(run: RunState): EnemyKind[] {
  const zone = ZONES[run.zone];
  if (run.current.reward === 'boss') return [zone.boss];
  if (run.current.reward === 'miniboss') return [zone.miniboss];
  if (run.current.reward === 'training') return [];
  const r = CONFIG.run, local = localRoom(run.room);
  let budget = r.budgetBase + zone.budgetBonus + r.budgetPerRoom * local + r.budgetPerDifficulty * (run.current.difficulty - 1);
  const kinds: EnemyKind[] = [];
  const cost = (k: EnemyKind) => (CONFIG.enemies as unknown as Record<string, { cost?: number }>)[k].cost ?? 1;
  while (budget >= 1) {
    const options = zone.roster.filter(e => cost(e.kind) <= budget && local >= e.from).map(e => e.kind); // the room a kind first shows up in
    if (!options.length) break;
    const k = options[Math.floor(Math.random() * options.length)];
    kinds.push(k); budget -= cost(k);
  }
  return kinds;
}

export const enemyHpMult = (run: RunState) =>
  (1 + CONFIG.enemies.hpGrowthPerRoom * localRoom(run.room)) * CONFIG.enemies.hpByDifficulty[run.current.difficulty] * ZONES[run.zone].hpMult;
