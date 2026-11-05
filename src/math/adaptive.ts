/**
 * Adaptive difficulty and the "next run focuses on…" plan.
 *
 * Difficulty: each category (facts, add/sub, multiply/divide, everyday) has a
 * level 1–4. Recent accuracy in that category is tracked as a running
 * average; above ~90% the level goes up, below ~72% it comes down, so
 * practice stays near the ~85% success rate where learning is fastest.
 *
 * Focus: before a run (or a Sprint) the two or three skills that need work
 * most are chosen — weak ones, fading ones, then new ones — and the problem
 * picker weights them up so the plan shown on Progress is what you get.
 */
import { CATEGORIES, GENERATORS, PRACTICE_GENERATORS, TIER_TARGET, generatorByKey, setFocusGenerators, type Category } from './problems';
import { getSkill, recall, statusOf, struggleScore, type AnswerKind } from './mastery';
import { save } from '../state/save';

export const CATEGORY_LABEL: Record<Category, string> = { everyday: 'Everyday math', facts: 'Times tables & division facts', addsub: 'Adding & subtracting', muldiv: 'Bigger multiply & divide' };
export const CATEGORY_SHORT: Record<Category, string> = { everyday: 'Everyday', facts: 'Facts', addsub: 'Add/sub', muldiv: 'Mul/div' };

/** Per-category difficulty state (lives in the save). */
export interface Adaptive { level: number; acc: number; n: number }

const UP_AT = 0.9, DOWN_AT = 0.72, MIN_SAMPLE = 6;
/** Highest tier that has problems in each category (times-table facts stop at tier 2). */
const MAX_TIER: Record<Category, number> = Object.fromEntries(CATEGORIES.map(c => [c, Math.max(...PRACTICE_GENERATORS.filter(g => g.category === c).map(g => g.tier))])) as Record<Category, number>;

/** Fold one answer into its category. Called for every answer in the game. */
export function noteAnswer(genKey: string, tier: number, kind: AnswerKind) {
  const g = generatorByKey(genKey);
  if (!g) return;
  const a = save.adaptive[g.category];
  const score = kind === 'exact' ? 1 : kind === 'close' ? 0.5 : 0;
  a.n++;
  a.acc += (score - a.acc) / Math.min(a.n, 10);
  // only answers at (or above) the current level can raise it; only ones at (or below) can lower it
  if (tier >= a.level && a.acc >= UP_AT && a.n >= MIN_SAMPLE && a.level < MAX_TIER[g.category]) { a.level++; a.acc = 0.82; a.n = 2; }
  else if (tier <= a.level && a.acc <= DOWN_AT && a.n >= MIN_SAMPLE && a.level > 1) { a.level--; a.acc = 0.82; a.n = 2; }
}

/** Level for one category, or the rounded average when none is given (chests, forge). */
export function recommendedTier(cat?: Category): number {
  if (cat) return Math.min(save.adaptive[cat].level, MAX_TIER[cat]);
  const mean = CATEGORIES.reduce((s, c) => s + save.adaptive[c].level, 0) / CATEGORIES.length;
  return Math.max(1, Math.min(4, Math.round(mean)));
}

/** Pick a category for a problem: everyday math first (the goal), focus categories doubled. */
export function pickCategory(): Category {
  const base: Record<Category, number> = { everyday: 2, facts: 1.6, addsub: 1, muldiv: 1 };
  const focusCats = new Set(currentFocus.map(f => f.g.category));
  let total = 0;
  const w = CATEGORIES.map(c => { const v = base[c] * (focusCats.has(c) ? 2 : 1); total += v; return v; });
  let r = Math.random() * total;
  for (let i = 0; i < CATEGORIES.length; i++) { r -= w[i]; if (r <= 0) return CATEGORIES[i]; }
  return 'everyday';
}

/* ---------------- the focus plan ---------------- */
export type FocusWhy = 'weak' | 'rusty' | 'new';
export interface FocusItem { g: (typeof GENERATORS)[number]; why: FocusWhy; }
let currentFocus: FocusItem[] = [];

/**
 * Choose up to three skills: the two biggest struggles, the skill fading
 * fastest (learned before, recall now under 50%), and a new one at your
 * level if there is room. Also tells the problem picker about them.
 */
export function planFocus(): FocusItem[] {
  const out: FocusItem[] = [];
  const taken = new Set<string>();
  const add = (g: FocusItem['g'], why: FocusWhy) => { if (!taken.has(g.key)) { taken.add(g.key); out.push({ g, why }); } };

  const tried = PRACTICE_GENERATORS.filter(g => (getSkill(g.key)?.n ?? 0) >= 3);
  const recentAcc = (g: FocusItem['g']) => { const h = getSkill(g.key)!.hist.slice(-8); return h.reduce((a, [c]) => a + c, 0) / h.length; };
  tried.filter(g => statusOf(getSkill(g.key)) === 'struggling' || recentAcc(g) < 0.8)
    .sort((a, b) => struggleScore(getSkill(b.key)!, TIER_TARGET[b.tier]) - struggleScore(getSkill(a.key)!, TIER_TARGET[a.tier]))
    .slice(0, 2).forEach(g => add(g, 'weak'));

  const fading = tried.filter(g => { const s = getSkill(g.key)!; return s.hl >= 6 && recall(s) < 0.5; })
    .sort((a, b) => recall(getSkill(a.key)) - recall(getSkill(b.key)));
  if (fading.length) add(fading[0], 'rusty');

  if (out.length < 3) {
    const fresh = PRACTICE_GENERATORS.filter(g => !(getSkill(g.key)?.n) && g.tier <= recommendedTier(g.category));
    if (fresh.length) add(fresh[Math.floor(Math.random() * fresh.length)], 'new');
  }
  currentFocus = out.slice(0, 3);
  setFocusGenerators(currentFocus.map(f => f.g.key));
  return currentFocus;
}

export const WHY_LABEL: Record<FocusWhy, string> = { weak: 'needs work', rusty: 'getting rusty', new: 'new' };
