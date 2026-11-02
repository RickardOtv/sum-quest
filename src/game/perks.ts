/** Run powers you pick from "power" rooms (they reset when the run ends). */
import type { IconName } from '../ui/icons';
import { shuffle } from '../math/problems';
export type PerkId =
  | 'multishot' | 'rapid' | 'sharp' | 'pierce' | 'swift' | 'vamp' | 'skin'
  | 'keen' | 'focus' | 'calm' | 'close' | 'heal' | 'execute';

export interface Perk { id: PerkId; glyph: IconName; name: string; text: string; max: number; }

export const PERKS: Perk[] = [
  { id: 'multishot', glyph: 'sword-clash', name: 'Twin Slash', text: 'Throw one extra slash', max: 2 },
  { id: 'rapid', glyph: 'fast-arrow', name: 'Quick Hands', text: 'Throw 20% faster', max: 3 },
  { id: 'sharp', glyph: 'sword-slice', name: 'Whetstone', text: '+20% slash damage', max: 4 },
  { id: 'pierce', glyph: 'piercing-sword', name: 'Piercing Edge', text: 'Slashes pass through one more enemy', max: 2 },
  { id: 'swift', glyph: 'run', name: 'Light Feet', text: 'Move 15% faster', max: 2 },
  { id: 'vamp', glyph: 'heart-drop', name: 'Lifesteal', text: 'Heal 2% of max HP per kill', max: 3 },
  { id: 'skin', glyph: 'stone-wall', name: 'Stone Skin', text: 'Take 15% less damage', max: 3 },
  { id: 'keen', glyph: 'eye-target', name: 'Keen Eye', text: '+5% crit chance', max: 3 },
  { id: 'execute', glyph: 'executioner-hood', name: 'Executioner', text: 'Crits deal 50% more', max: 3 },
  { id: 'focus', glyph: 'magic-swirl', name: 'Focus', text: 'Special charges 30% faster', max: 3 },
  { id: 'calm', glyph: 'stopwatch', name: 'Clear Mind', text: '35% more time for speed bonuses', max: 2 },
  { id: 'close', glyph: 'bullseye', name: 'Close Enough', text: 'Close answers deal double damage', max: 1 },
  { id: 'heal', glyph: 'health-increase', name: 'Second Wind', text: 'Heal 25% now', max: 99 },
];

export type PerkLevels = Partial<Record<PerkId, number>>;

/** Three random perks you don't already have maxed. Second Wind (a heal) only shows up when you're hurt. */
export function rollPerks(have: PerkLevels, hurt: boolean, count = 3): Perk[] {
  return shuffle(PERKS.filter(p => (have[p.id] ?? 0) < p.max && (p.id !== 'heal' || hurt))).slice(0, count);
}
