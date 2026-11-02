/**
 * Special skills and the skill tree.
 *
 * Each skill asks one kind of math and does one thing. Skills have levels
 * (1–5): every level is +15% effect and recharges 5% faster. The tree has three
 * branches (builds); nodes unlock top to bottom and every node costs one
 * skill point. Points come from training lessons, boss kills and streaks.
 */
import type { IconName } from '../ui/icons';
import type { Category } from '../math/problems';

export type SkillEffect = 'nova' | 'ward' | 'mend' | 'chain' | 'frost' | 'execute' | 'sight' | 'meteor' | 'rift';
export type PassiveId = 'sharp' | 'overcharge' | 'vigor' | 'thickskin' | 'keen' | 'clearmind';
export type Branch = 'striker' | 'warden' | 'tactician';

export interface Skill {
  id: SkillEffect;
  name: string;
  glyph: IconName;
  category: Category;
  tier: 1 | 2 | 3 | 4;
  recharge: number;    // seconds of combat to fill the meter at level 1 (each skill charges at its own speed)
  power: number;       // damage as a multiple of your hit, or seconds / percent for other effects
  short: string;       // one-line effect
  tip: string;         // when to use it
}

export const SKILLS: Skill[] = [
  { id: 'nova', name: 'Nova', glyph: 'explosion-rays', category: 'everyday', tier: 2, recharge: 26, power: 10, short: 'Shockwave that hits every enemy', tip: 'Best against crowds.' },
  { id: 'ward', name: 'Ward', glyph: 'magic-shield', category: 'addsub', tier: 1, recharge: 32, power: 5, short: 'Shield for 5 s and wipe all bullets', tip: 'Easy math, no damage. Saves you from bullet rings.' },
  { id: 'mend', name: 'Mend', glyph: 'health-increase', category: 'facts', tier: 1, recharge: 40, power: 30, short: 'Heal 30% of your HP', tip: 'For when a run is slipping away.' },
  { id: 'chain', name: 'Chain Lightning', glyph: 'lightning-branches', category: 'facts', tier: 2, recharge: 22, power: 6, short: 'Strikes the 3 nearest enemies hard', tip: 'Great against a few tough enemies.' },
  { id: 'frost', name: 'Frost Field', glyph: 'frozen-orb', category: 'everyday', tier: 3, recharge: 28, power: 6, short: 'Enemies move and shoot at 40% for 6 s', tip: 'Buys time to dodge and reposition.' },
  { id: 'execute', name: "Executioner's Mark", glyph: 'executioner-hood', category: 'muldiv', tier: 3, recharge: 30, power: 28, short: 'One huge hit on your target', tip: 'The boss killer.' },
  { id: 'sight', name: 'Second Sight', glyph: 'third-eye', category: 'addsub', tier: 2, recharge: 20, power: 1, short: 'Your next crit is a super crit, right away', tip: 'Sets up a big moment.' },
  { id: 'meteor', name: 'Meteor', glyph: 'meteor-impact', category: 'muldiv', tier: 4, recharge: 40, power: 24, short: 'Massive hit on everything', tip: 'Hardest math, biggest payoff.' },
  { id: 'rift', name: 'Time Rift', glyph: 'time-trap', category: 'everyday', tier: 4, recharge: 38, power: 4, short: 'Freezes every enemy for 4 s, then they take damage', tip: 'Total control. Expert everyday math.' },
];

export interface Passive { id: PassiveId; name: string; glyph: IconName; max: number; text: (lv: number) => string; }
export const PASSIVES: Passive[] = [
  { id: 'sharp', name: 'Sharpened', glyph: 'sword-slice', max: 3, text: lv => `+${10 * lv}% damage` },
  { id: 'overcharge', name: 'Overcharge', glyph: 'battery-pack', max: 2, text: lv => `skills charge ${15 * lv}% faster` },
  { id: 'vigor', name: 'Vigor', glyph: 'hearts', max: 3, text: lv => `+${10 * lv}% max HP` },
  { id: 'thickskin', name: 'Thick Skin', glyph: 'stone-wall', max: 3, text: lv => `${8 * lv}% less damage taken` },
  { id: 'keen', name: 'Keen Eye', glyph: 'eye-target', max: 3, text: lv => `+${4 * lv}% crit chance` },
  { id: 'clearmind', name: 'Clear Mind', glyph: 'brain', max: 3, text: lv => `+${(0.5 * lv).toFixed(1)}s to answer crits` },
];

export type NodeId = SkillEffect | PassiveId;
export interface TreeBranch { id: Branch; name: string; blurb: string; nodes: NodeId[]; }
export const TREE: TreeBranch[] = [
  { id: 'striker', name: 'Striker', blurb: 'Raw damage. Times tables and big multiply/divide.', nodes: ['chain', 'sharp', 'execute', 'overcharge', 'meteor'] },
  { id: 'warden', name: 'Warden', blurb: 'Survive anything. Adding and subtracting.', nodes: ['ward', 'vigor', 'mend', 'thickskin', 'sight'] },
  { id: 'tactician', name: 'Tactician', blurb: 'Control the room. Everyday math.', nodes: ['nova', 'keen', 'frost', 'clearmind', 'rift'] },
];

export const SKILL_MAX_LEVEL = 5;
export const SKILL_SLOTS = 2;
export const STARTER_SKILLS: SkillEffect[] = ['nova', 'ward'];

export const skillById = (id: string) => SKILLS.find(s => s.id === id)!;
export const passiveById = (id: string) => PASSIVES.find(p => p.id === id)!;
export const isSkillId = (id: string): id is SkillEffect => SKILLS.some(s => s.id === id);
export const maxLevelOf = (id: NodeId) => (isSkillId(id) ? SKILL_MAX_LEVEL : passiveById(id).max);

/** A skill with its level applied: stronger effect, cheaper cast. */
export function skillAt(id: SkillEffect, level: number): Skill & { level: number } {
  const s = skillById(id), lv = Math.max(1, level);
  return { ...s, level: lv, power: s.power * (1 + 0.15 * (lv - 1)), recharge: Math.round(s.recharge * (1 - 0.05 * (lv - 1))) };
}

/** The node above this one in its branch (must be unlocked first), or undefined for a branch root. */
export function requirementOf(id: NodeId): NodeId | undefined {
  for (const b of TREE) { const i = b.nodes.indexOf(id); if (i > 0) return b.nodes[i - 1]; }
  return undefined;
}
