/**
 * Problem generators, grouped into four difficulty tiers.
 * Every problem carries a worked solution ("the quick way"), because
 * showing a better strategy after a miss is where most learning happens.
 */
import { priority, type AnswerKind } from './mastery';

export type Category = 'facts' | 'addsub' | 'muldiv' | 'everyday';
export const CATEGORIES: Category[] = ['facts', 'addsub', 'muldiv', 'everyday'];

export interface Problem {
  text: string;        // what the player sees, e.g. "15% tip on €48"
  hint?: string;       // small extra label, e.g. "1 decimal"
  answer: number;
  tolerance: number;   // how far off still counts as exact (money: half a cent)
  explain: string;     // worked solution
  prefix?: string;     // shown before the typed answer (currency)
  suffix?: string;     // shown after the typed answer (%)
  key: string;         // mastery key (a specific fact like "m:7×8", or the generator key)
  genKey: string;      // generator key, used for the Progress screen
  tier: number;
}

interface Generator {
  key: string;
  tier: 1 | 2 | 3 | 4;
  category: Category;
  label: string;
  weight: number; // everyday math is weighted higher, as it's the main goal
  /** Problems that only make sense inside one feature (a chest lock, a trader's deal, a rune gate):
   *  never picked for crits, skills or the focus plan, but still tracked and shown on Progress. */
  context?: 'lock' | 'deal' | 'gate';
  make(recent: string[]): Omit<Problem, 'genKey' | 'tier' | 'key' | 'tolerance'> & { key?: string; tolerance?: number };
}

/** Target answer time per tier. Faster earns the speed bonus and counts as "fluent". */
export const TIER_TARGET = [0, 3.5, 7, 12, 20];
export const TIER_LABEL = ['', 'easy', 'medium', 'hard', 'expert'];

/* ---------------- small helpers ---------------- */
let currency = '€';
export const setCurrency = (c: string) => { currency = c; };
export const getCurrency = () => currency;

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const maybeSwap = (a: number, b: number): [number, number] => (Math.random() < 0.5 ? [a, b] : [b, a]);
export function shuffle<T>(arr: T[]): T[] { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
export function weightedPick<T>(items: T[], weights: number[]): T {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
/** Number formatting: at most 2 decimals, no trailing zeros. */
export const fmt = (n: number) => { const r = Math.round(n * 100) / 100; return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0$/, ''); };
/** Money formatting: whole amounts without decimals, otherwise 2 decimals. */
/** Some currencies are written after the amount (48 kr), others before (€48). */
const currencyAfter = () => currency.trim() === 'kr';
const amount = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : (Math.round(n * 100) / 100).toFixed(2));
/**
 * Kronor are worth about a tenth of a euro/dollar/pound, and nobody counts öre:
 * with kr, money problems use 10× bigger, whole amounts (a 480 kr dinner, not a 48 kr one).
 */
const inKr = () => currencyAfter();
export const money = (n: number) => (currencyAfter() ? `${amount(n)} ${currency.trim()}` : currency + amount(n));
/** A number the way the answer is written: money gets two decimals (66.50, not 66.5). */
export const fmtValue = (p: { tolerance: number; prefix?: string; suffix?: string }, n: number) =>
  isMoney(p) ? amount(n) : fmt(n);
const isMoney = (p: { tolerance: number; prefix?: string; suffix?: string }) =>
  Math.abs(p.tolerance - 0.005) < 1e-9 && (!!p.prefix || (!!p.suffix && p.suffix !== '%'));
/** Where the currency goes around a typed money answer. */
const cur = (): { prefix?: string; suffix?: string } => (currencyAfter() ? { suffix: ` ${currency.trim()}` } : { prefix: currency });

/* ---------------- worked-solution builders ---------------- */
function factTip(a: number, b: number): string {
  const p = a * b, has = (f: number) => a === f || b === f, other = (f: number) => (a === f ? b : a);
  if (a === b && a >= 6) return `${a}×${a} = ${p}. Squares are worth memorising.`;
  if (has(10)) return `×10: add a zero → ${other(10)}0`;
  if (has(9)) { const x = other(9); return `9×${x} = 10×${x} − ${x} = ${10 * x} − ${x} = ${p}`; }
  if (has(11)) { const x = other(11); return `11×${x} = 10×${x} + ${x} = ${10 * x} + ${x} = ${p}`; }
  if (has(12)) { const x = other(12); return `12×${x} = 10×${x} + 2×${x} = ${10 * x} + ${2 * x} = ${p}`; }
  if (has(5)) { const x = other(5); return `5×${x} = half of 10×${x} = ${10 * x} ÷ 2 = ${p}`; }
  if (has(2)) return `2×${other(2)} = double ${other(2)} = ${p}`;
  if (has(4)) { const x = other(4); return `4×${x} = double, then double: ${x} → ${2 * x} → ${p}`; }
  if (has(8)) { const x = other(8); return `8×${x} = double 3 times: ${x} → ${2 * x} → ${4 * x} → ${p}`; }
  if (has(6)) { const x = other(6); return `6×${x} = 5×${x} + ${x} = ${5 * x} + ${x} = ${p}`; }
  if (has(7)) { const x = other(7); return `7×${x} = 5×${x} + 2×${x} = ${5 * x} + ${2 * x} = ${p}`; }
  if (has(3)) { const x = other(3); return `3×${x} = 2×${x} + ${x} = ${2 * x} + ${x} = ${p}`; }
  return `${a}×${b} = ${p}`;
}
function addTip(a: number, b: number): string {
  if (b < 10) {
    const up = 10 - (a % 10);
    if ((a % 10) + b >= 10 && up < b) return `Bridge through ${a + up}: ${a} + ${up} = ${a + up}, then + ${b - up} = ${a + b}`;
    return `${a} + ${b} = ${a + b}`;
  }
  const tens = b - (b % 10), ones = b % 10;
  return ones ? `Tens first: ${a} + ${tens} = ${a + tens}, then + ${ones} = ${a + b}` : `${a} + ${tens} = ${a + b}`;
}
function subTip(a: number, b: number): string {
  if (b < 10) {
    const d = a % 10;
    if (b > d && d > 0) return `Bridge through ${a - d}: ${a} − ${d} = ${a - d}, then − ${b - d} = ${a - b}`;
    return `${a} − ${b} = ${a - b}`;
  }
  if (b % 10 >= 7) { const r = b + 10 - (b % 10); return `Round ${b} up to ${r}: ${a} − ${r} = ${a - r}, add back ${r - b} → ${a - b}`; }
  const tens = b - (b % 10), ones = b % 10;
  return ones ? `Tens first: ${a} − ${tens} = ${a - tens}, then − ${ones} = ${a - b}` : `${a} − ${tens} = ${a - b}`;
}
function mulSplit(a: number, b: number): string {
  if (a % 10 >= 8 && a > 10) { const r = a + 10 - (a % 10); return `${r}×${b} − ${r - a}×${b} = ${r * b} − ${(r - a) * b} = ${a * b}`; }
  const t = a - (a % 10), o = a % 10;
  return `${t}×${b} + ${o}×${b} = ${t * b} + ${o * b} = ${a * b}`;
}
function divSplit(n: number, d: number): string {
  const chunk = Math.floor(n / (10 * d)) * 10 * d, rest = n - chunk;
  if (chunk === 0) return `${n} ÷ ${d} = ${fmt(n / d)}`;
  return `${chunk}÷${d} + ${rest}÷${d} = ${chunk / d} + ${fmt(rest / d)} = ${fmt(n / d)}`;
}

/* ---------------- times-table pairs, chosen by mastery ---------------- */
const pairs = (maxA: number, filter: (a: number, b: number) => boolean) => {
  const out: [number, number][] = [];
  for (let a = 2; a <= maxA; a++) for (let b = a; b <= 12; b++) if (filter(a, b)) out.push([a, b]);
  return out;
};
export const ALL_PAIRS = pairs(12, () => true);
const SMALL_PAIRS = pairs(9, (_a, b) => b <= 9);
const BIG_PAIRS = pairs(12, (_a, b) => b >= 11);

/** Fading, missed and unseen facts are much more likely; facts shown in the last few problems are avoided.
 *  Exported so features can pick their numbers by need too (a slime's 12 = the 3×4 you're forgetting). */
export function pickPair(list: [number, number][], prefix: string, recent: string[]): [number, number] {
  const weights = list.map(([a, b]) => {
    const key = `${prefix}:${a}×${b}`, w = priority(key);
    return recent.includes(key) ? w * 0.05 : w;
  });
  return weightedPick(list, weights);
}

/* ---------------- the generators ---------------- */
export const GENERATORS: Generator[] = [
  // Tier 1 · easy
  { key: 'mf', tier: 1, category: 'facts', weight: 1.3, label: 'Times tables 2–9',
    make: r => { const [a, b] = pickPair(SMALL_PAIRS, 'm', r), [x, y] = maybeSwap(a, b); return { text: `${x} × ${y}`, answer: a * b, explain: factTip(a, b), key: `m:${a}×${b}` }; } },
  { key: 'add1', tier: 1, category: 'addsub', weight: 1, label: 'Add a single digit',
    make: () => { const a = rand(12, 89), b = rand(3, 9); return { text: `${a} + ${b}`, answer: a + b, explain: addTip(a, b) }; } },
  { key: 'sub1', tier: 1, category: 'addsub', weight: 1, label: 'Subtract a single digit',
    make: () => { const a = rand(21, 99), b = rand(3, 9); return { text: `${a} − ${b}`, answer: a - b, explain: subTip(a, b) }; } },
  { key: 'dbl', tier: 1, category: 'everyday', weight: 0.8, label: 'Doubling',
    make: () => { const n = rand(13, 49), t = n - (n % 10), o = n % 10; return { text: `Double ${n}`, answer: 2 * n, explain: `Double tens and ones: ${2 * t} + ${2 * o} = ${2 * n}` }; } },
  { key: 'p10r', tier: 1, category: 'everyday', weight: 1.2, label: '10% of round numbers',
    make: () => { const n = rand(2, 90) * 10; return { text: `10% of ${n}`, answer: n / 10, explain: `10% = divide by 10 → ${n / 10}` }; } },

  // Tier 2 · medium
  { key: 'mfb', tier: 2, category: 'facts', weight: 1, label: 'Times tables 11–12',
    make: r => { const [a, b] = pickPair(BIG_PAIRS, 'm', r), [x, y] = maybeSwap(a, b); return { text: `${x} × ${y}`, answer: a * b, explain: factTip(a, b), key: `m:${a}×${b}` }; } },
  { key: 'df', tier: 2, category: 'facts', weight: 1.2, label: 'Division facts',
    make: r => { const [a, b] = pickPair(ALL_PAIRS, 'd', r), [d, q] = maybeSwap(a, b); return { text: `${a * b} ÷ ${d}`, answer: q, explain: `Think ${d} × ? = ${a * b}. ${factTip(a, b)}`, key: `d:${a}×${b}` }; } },
  { key: 'add2', tier: 2, category: 'addsub', weight: 1, label: 'Add 2-digit numbers',
    make: () => { const a = rand(23, 89); let b = rand(13, 79); if (Math.random() < 0.7 && (a % 10) + (b % 10) < 10) b = b - (b % 10) + 9; return { text: `${a} + ${b}`, answer: a + b, explain: addTip(a, b) }; } },
  { key: 'sub2', tier: 2, category: 'addsub', weight: 1, label: 'Subtract 2-digit numbers',
    make: () => { const a = rand(41, 99), b = rand(12, a - 8); return { text: `${a} − ${b}`, answer: a - b, explain: subTip(a, b) }; } },
  { key: 'half', tier: 2, category: 'everyday', weight: 0.8, label: 'Halving',
    make: () => { const n = rand(15, 99) * 2 + 1, t = n - (n % 10), o = n % 10; return { text: `Half of ${n}`, answer: n / 2, explain: `Half of ${t} = ${t / 2}, half of ${o} = ${o / 2} → ${fmt(n / 2)}` }; } },
  { key: 'p50', tier: 2, category: 'everyday', weight: 1.4, label: '50%, 25% and 10%',
    make: () => {
      const mode = rand(0, 2);
      if (mode === 0) { const n = rand(12, 199) * 2; return { text: `50% of ${n}`, answer: n / 2, explain: `50% = half → ${n / 2}` }; }
      if (mode === 1) { const n = rand(10, 150) * 4; return { text: `25% of ${n}`, answer: n / 4, explain: `25% = half of half: ${n} → ${n / 2} → ${n / 4}` }; }
      let n = rand(12, 999); if (n % 10 === 0) n += 3;
      return { text: `10% of ${n}`, answer: n / 10, explain: `10% = divide by 10 → ${fmt(n / 10)}` };
    } },
  { key: 'chg', tier: 2, category: 'everyday', weight: 1.2, label: 'Change from a note',
    make: () => {
      // kr: whole-krona prices and 100/200/500 notes; otherwise prices to the 5 cents and 10/20/50 notes
      const paid = inKr() ? pick([100, 200, 500]) : pick([10, 20, 50]);
      const price = inKr() ? rand(Math.round(paid * 0.15), paid - 1) : rand(paid * 3, paid * 20 - 1) / 20;
      const step = inKr() ? 10 : 1, up = Math.ceil(price / step) * step, change = Math.round((paid - price) * 100) / 100;
      return { text: `Pay ${money(price)} with ${money(paid)}`, hint: 'How much change do you get?', answer: change, tolerance: 0.005, ...cur(),
        explain: up === price || up === paid ? `${money(paid)} − ${money(price)} = ${money(change)}` : `Count up: ${money(price)} → ${money(up)} is ${money(up - price)} · ${money(up)} → ${money(paid)} is ${money(paid - up)} · change = ${money(change)}` };
    } },

  // Tier 3 · hard
  { key: 'add3', tier: 3, category: 'addsub', weight: 0.9, label: 'Add 3-digit numbers',
    make: () => { const a = rand(120, 899), b = rand(35, 399); return { text: `${a} + ${b}`, answer: a + b, explain: addTip(a, b) }; } },
  { key: 'sub3', tier: 3, category: 'addsub', weight: 1, label: 'Subtract 3-digit numbers',
    make: () => { const a = rand(150, 999), b = rand(28, a - 30); return { text: `${a} − ${b}`, answer: a - b, explain: subTip(a, b) }; } },
  { key: 'm21', tier: 3, category: 'muldiv', weight: 1, label: '2-digit × 1-digit',
    make: () => { let a = rand(13, 98); if (a % 10 === 0) a++; const b = rand(3, 9), [x, y] = maybeSwap(a, b); return { text: `${x} × ${y}`, answer: a * b, explain: mulSplit(a, b) }; } },
  { key: 'dx', tier: 3, category: 'muldiv', weight: 1, label: 'Divide by 1 digit (exact)',
    make: () => { const d = rand(3, 9), q = rand(14, 99); return { text: `${q * d} ÷ ${d}`, answer: q, explain: divSplit(q * d, d) }; } },
  { key: 'tip', tier: 3, category: 'everyday', weight: 1.4, label: 'Tips: 10%, 15%, 20%',
    make: () => {
      // bills are chosen so the tip comes out in whole kronor, or in whole cents
      const pct = pick([10, 15, 20]), bill = inKr() ? rand(12, 60) * 20 : rand(9, 60) * 2, tip = bill * pct / 100, ten = bill / 10;
      const explain = pct === 10 ? `10% = ${money(bill)} ÷ 10 = ${money(ten)}`
        : pct === 15 ? `10% = ${money(ten)} · 5% is half of that = ${money(ten / 2)} · 15% = ${money(ten)} + ${money(ten / 2)} = ${money(tip)}`
        : `10% = ${money(ten)} · 20% is double = ${money(tip)}`;
      return { text: `${pct}% tip on ${money(bill)}`, hint: 'How much is the tip?', answer: tip, tolerance: 0.005, ...cur(), explain };
    } },
  { key: 'split', tier: 3, category: 'everyday', weight: 1.3, label: 'Splitting the bill',
    make: () => {
      const k = rand(2, 5), each = inKr() ? rand(30, 450) : rand(28, 180) / 4, bill = each * k, chunk = Math.floor(bill / (10 * k)) * 10 * k;
      const explain = chunk > 0 && chunk < bill ? `${money(chunk)} ÷ ${k} = ${money(chunk / k)} · ${money(bill - chunk)} ÷ ${k} = ${money((bill - chunk) / k)} · together ${money(each)}` : `${money(bill)} ÷ ${k} = ${money(each)}`;
      return { text: `${money(bill)} split ${k} ways`, hint: 'How much does each person pay?', answer: each, tolerance: 0.005, ...cur(), explain };
    } },
  { key: 'disc', tier: 3, category: 'everyday', weight: 1.2, label: 'Discounts',
    make: () => {
      const pct = pick([10, 20, 25, 30, 40, 50]), price = inKr() ? rand(4, 40) * 50 : rand(4, 40) * 5, off = price * pct / 100, pay = price - off;
      const explain = pct % 10 === 0
        ? `${pct}% off → you pay ${100 - pct}% · 10% = ${money(price / 10)} · ${100 - pct}% = ${(100 - pct) / 10} × ${money(price / 10)} = ${money(pay)}`
        : `${pct}% of ${money(price)} = ${money(off)} · ${money(price)} − ${money(off)} = ${money(pay)}`;
      return { text: `${money(price)} with ${pct}% off`, hint: 'What do you pay?', answer: pay, tolerance: 0.005, ...cur(), explain };
    } },
  { key: 'pof', tier: 3, category: 'everyday', weight: 1, label: '5%–40% of a number',
    make: () => {
      const pct = pick([5, 20, 30, 40]), n = rand(6, 99) * 10, ans = n * pct / 100, ten = n / 10;
      return { text: `${pct}% of ${n}`, answer: ans, explain: pct === 5 ? `10% = ${n} ÷ 10 = ${ten} · 5% is half = ${fmt(ans)}` : `10% = ${n} ÷ 10 = ${ten} · ${pct}% = ${pct / 10} × ${ten} = ${fmt(ans)}` };
    } },

  // Tier 4 · expert
  { key: 'm22', tier: 4, category: 'muldiv', weight: 1, label: '2-digit × 2-digit',
    make: () => { let a = rand(12, 39), b = rand(12, 29); if (a % 10 === 0) a++; if (b % 10 === 0) b++; const bt = b - (b % 10), bo = b % 10;
      return { text: `${a} × ${b}`, answer: a * b, explain: `${a}×${bt} + ${a}×${bo} = ${a * bt} + ${a * bo} = ${a * b}` }; } },
  { key: 'ddec', tier: 4, category: 'muldiv', weight: 1.1, label: 'Division with decimals',
    make: () => { const d = rand(3, 9); let n = rand(100, 400); if (n % d === 0) n++;
      return { text: `${n} ÷ ${d}`, hint: 'Round to 1 decimal', answer: Math.round((n / d) * 10) / 10, tolerance: 0.06, explain: `${divSplit(n, d)} ≈ ${(n / d).toFixed(1)}` }; } },
  { key: 'sq', tier: 4, category: 'muldiv', weight: 0.8, label: 'Squares 13–39',
    make: () => { let n = rand(13, 39); if (n % 10 === 0) n++; const round = n % 10 <= 5 ? n - (n % 10) : n + 10 - (n % 10), d = Math.abs(n - round), other = 2 * n - round;
      return { text: `${n}²`, answer: n * n, explain: `${n}² = ${Math.max(round, other)}×${Math.min(round, other)} + ${d}² = ${round * other} + ${d * d} = ${n * n}` }; } },
  { key: 'phard', tier: 4, category: 'everyday', weight: 1.2, label: 'Tricky percents',
    make: () => {
      const mode = rand(0, 3);
      if (mode === 0) { const n = rand(2, 40) * 8; return { text: `12.5% of ${n}`, answer: n / 8, explain: `12.5% = ⅛: halve 3 times, ${n} → ${n / 2} → ${n / 4} → ${n / 8}` }; }
      if (mode === 1) { const n = rand(3, 60) * 4; return { text: `75% of ${n}`, answer: (n * 3) / 4, explain: `75% = all minus a quarter: ${n} − ${n / 4} = ${(n * 3) / 4}` }; }
      const n = rand(2, 40) * 20;
      if (mode === 2) return { text: `35% of ${n}`, answer: (n * 35) / 100, explain: `30% = ${fmt((n * 30) / 100)}, + 5% ${fmt((n * 5) / 100)} = ${fmt((n * 35) / 100)}` };
      return { text: `45% of ${n}`, answer: (n * 45) / 100, explain: `50% = ${n / 2}, − 5% ${fmt((n * 5) / 100)} = ${fmt((n * 45) / 100)}` };
    } },
  { key: 'pchg', tier: 4, category: 'everyday', weight: 1.1, label: 'Percent change',
    make: () => {
      let a = 0, pct = 0, b = 0;
      do { a = pick([20, 25, 40, 50, 60, 80, 120, 150, 200, 250, 400]); pct = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]); b = (a * (100 + pct)) / 100; } while ((a * pct) % 100 !== 0);
      return { text: `${a} → ${b}`, hint: 'By what % did it go up?', answer: pct, suffix: '%', explain: `(${b} − ${a}) ÷ ${a} = ${b - a} ÷ ${a} = ${pct}%` };
    } },
  { key: 'tip18', tier: 4, category: 'everyday', weight: 1, label: 'Odd tips (12%, 18%)',
    make: () => {
      const pct = pick([12, 18]), bill = inKr() ? rand(4, 30) * 50 : rand(4, 30) * 5, tip = bill * pct / 100;
      return { text: `${pct}% tip on ${money(bill)}`, hint: 'How much is the tip?', answer: tip, tolerance: 0.005, ...cur(),
        explain: pct === 18 ? `20% = ${money(bill * 0.2)} · 2% = ${money(bill * 0.02)} · 18% = ${money(bill * 0.2)} − ${money(bill * 0.02)} = ${money(tip)}` : `10% = ${money(bill * 0.1)} · 2% = ${money(bill * 0.02)} · 12% = ${money(bill * 0.1)} + ${money(bill * 0.02)} = ${money(tip)}` };
    } },
];

export const generatorByKey = (k: string) => GENERATORS.find(g => g.key === k);
/** The generators for general practice (crits, skills, Sprint, the focus plan): everything without a `context`. */
export const PRACTICE_GENERATORS = GENERATORS.filter(g => !g.context);

/** Build a problem from a specific generator. With `focus`, retries a few times for one that matches. */
export function makeProblem(genKey: string, recent: string[] = [], focus?: (p: Problem) => boolean): Problem {
  const g = generatorByKey(genKey)!;
  let out: Problem;
  for (let tries = 0; ; tries++) {
    const p = g.make(recent);
    out = { ...p, key: p.key ?? g.key, genKey: g.key, tier: g.tier, tolerance: p.tolerance ?? 1e-9 };
    if (!focus || focus(out) || tries >= 30) return out;
  }
}

/** Generators the current focus plan wants more of (set by math/adaptive.ts). */
let focusGens = new Set<string>();
export const setFocusGenerators = (keys: string[]) => { focusGens = new Set(keys); };

/**
 * Pick a problem for a tier. Generators are mixed (interleaving), fading or
 * weak skills are weighted up and fresh fluent ones down (spacing), focus
 * skills get extra weight, and the same generator twice in a row is discouraged.
 */
export function pickProblem(tier: number, recent: string[] = [], lastGen?: string, category?: Category): Problem {
  let gens = PRACTICE_GENERATORS.filter(g => g.tier === tier && (!category || g.category === category));
  if (!gens.length) gens = PRACTICE_GENERATORS.filter(g => g.tier === tier);
  // a whole problem type is only held back after three fluent answers this session (single facts after one)
  const weights = gens.map(g => g.weight * priority(g.key, 3) * (focusGens.has(g.key) ? 2.5 : 1) * (g.key === lastGen ? 0.25 : 1));
  return makeProblem(weightedPick(gens, weights).key, recent);
}

/** Exact, close (partial credit by how far off), or a miss. */
export function judge(input: string, p: Problem): { kind: AnswerKind; credit: number; relError: number } {
  if (input === '' || input === '.') return { kind: 'miss', credit: 0, relError: 1 };
  const x = parseFloat(input);
  if (!isFinite(x)) return { kind: 'miss', credit: 0, relError: 1 };
  const err = Math.abs(x - p.answer);
  const relError = err / Math.max(Math.abs(p.answer), 1e-9);
  if (err <= p.tolerance + 1e-9) return { kind: 'exact', credit: 1, relError: 0 };
  if (relError <= 0.015) return { kind: 'close', credit: 0.5, relError };
  if (relError <= 0.04) return { kind: 'close', credit: 0.3, relError };
  if (relError <= 0.08) return { kind: 'close', credit: 0.12, relError };
  return { kind: 'miss', credit: 0, relError };
}

/**
 * Three options for quick crit questions. The wrong options are the
 * mistakes people really make: off by one in a times table, off by ten,
 * or a neighbouring value.
 */
export function makeChoices(p: Problem): number[] {
  const a = p.answer, out = new Set<number>([a]);
  const isMoney = p.tolerance > 1e-6 && p.tolerance < 0.01;
  const m = /^(\d+) × (\d+)$/.exec(p.text);
  const candidates: number[] = [];
  if (m) { const x = +m[1], y = +m[2]; candidates.push(x * (y + 1), x * (y - 1), (x + 1) * y, (x - 1) * y); }
  if (isMoney) candidates.push(a + 0.5, a - 0.5, a + 1, a - 1, a * 1.1);
  candidates.push(a + 10, a - 10, a + 1, a - 1, a + 2, a - 2); // near misses only: ×2 or ÷2 is too easy to rule out
  const shuffled = shuffle(candidates.filter(c => c > 0 && Math.abs(c - a) > 1e-9).map(c => Math.round(c * 100) / 100));
  for (const c of shuffled) { if (out.size >= 3) break; out.add(c); }
  return shuffle([...out]);
}
