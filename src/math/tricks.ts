/**
 * Training-room lessons. Each lesson teaches one mental-math trick, shows a
 * worked example, then gives practice problems from the matching generator.
 * Research note: teaching a strategy transfers to new problems better than
 * drill alone, so these are the "learn a shortcut" moments of the game.
 *
 * Money lessons are written in €; the lesson screen swaps in the player's
 * currency. With kronor (worth ~1/10 of a euro, no öre) they use `kr`, an
 * example with realistic kronor amounts.
 */
import { generatorByKey, type Problem } from './problems';
import { effectiveBox, getSkill } from './mastery';
import { save } from '../state/save';

export interface Example {
  question: string;      // the example problem, as a question
  steps: string[];       // the worked solution, one step per line
  answer: string;        // the result, shown highlighted at the end
}

export interface Trick {
  id: string;
  title: string;
  idea: string;          // the trick in one sentence
  example: Example;
  kr?: Example;          // the same example in kronor amounts (money lessons)
  task: string;          // what the practice problems ask you to type
  practice: string[];    // generator keys used for the practice problems
  focus?: (p: Problem) => boolean; // keep only problems where the trick applies
}

const nums = (p: Problem) => (p.text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

export const TRICKS: Trick[] = [
  { id: 'nines', title: 'The 9s shortcut', idea: 'To multiply by 9: multiply by 10, then take one away.',
    example: { question: '9 × 7 = ?', steps: ['10 × 7 = 70', 'take away one 7: 70 − 7'], answer: '63' },
    task: 'Answer each times-9 question.', practice: ['mf'], focus: p => nums(p).includes(9) },
  { id: 'bridge', title: 'Bridge through ten', idea: 'Fill up to the next ten first, then add what is left.',
    example: { question: '47 + 8 = ?', steps: ['47 + 3 = 50 (fill up to 50)', '8 − 3 = 5 left to add', '50 + 5'], answer: '55' },
    task: 'Answer each sum.', practice: ['add1', 'add2'], focus: p => { const [a, b] = nums(p); return (a % 10) + (b % 10) >= 10; } },
  { id: 'round', title: 'Round, then fix', idea: 'Subtract a round number instead, then give back what you took too much.',
    example: { question: '157 − 68 = ?', steps: ['68 is almost 70: 157 − 70 = 87', 'you took 2 too many, so add 2 back: 87 + 2'], answer: '89' },
    task: 'Answer each subtraction.', practice: ['sub2', 'sub3'], focus: p => nums(p)[1] % 10 >= 7 },
  { id: 'tens', title: 'Tens first', idea: 'Add or subtract the tens first, then the ones.',
    example: { question: '63 + 29 = ?', steps: ['tens: 63 + 20 = 83', 'ones: 83 + 9'], answer: '92' },
    task: 'Answer each sum or subtraction.', practice: ['add2', 'add3'], focus: p => nums(p)[1] % 10 !== 0 },
  { id: 'percent', title: 'Build from 10%', idea: '10% is easy: divide by 10. Half of it is 5%, double it is 20%.',
    example: { question: 'Tip 15% on a €48 bill: how much is the tip?', steps: ['10% = €48 ÷ 10 = €4.80', '5% = half of that = €2.40', '15% = €4.80 + €2.40'], answer: '€7.20' },
    kr: { question: 'Tip 15% on a 480 kr bill: how much is the tip?', steps: ['10% = 480 ÷ 10 = 48 kr', '5% = half of that = 24 kr', '15% = 48 + 24'], answer: '72 kr' },
    task: 'Type the tip, or the percent of the number.', practice: ['tip', 'pof'] },
  { id: 'split', title: 'Split the bill in chunks', idea: 'Divide an easy round chunk first, then divide the rest.',
    example: { question: '€87 split between 3 people: how much each?', steps: ['easy chunk: €60 ÷ 3 = €20', 'the rest: €27 ÷ 3 = €9', 'together: €20 + €9'], answer: '€29 each' },
    kr: { question: '870 kr split between 3 people: how much each?', steps: ['easy chunk: 600 ÷ 3 = 200 kr', 'the rest: 270 ÷ 3 = 90 kr', 'together: 200 + 90'], answer: '290 kr each' },
    task: 'Type what one person pays.', practice: ['split'] },
  { id: 'change', title: 'Count up for change', idea: 'Count up from the price to a round number, then up to the note you paid with.',
    example: { question: 'You pay €13.65 with a €20 note: how much change?', steps: ['€13.65 → €14 is €0.35', '€14 → €20 is €6', 'change: €6 + €0.35'], answer: '€6.35' },
    kr: { question: 'You pay 136 kr with a 200 kr note: how much change?', steps: ['136 → 140 is 4 kr', '140 → 200 is 60 kr', 'change: 60 + 4'], answer: '64 kr' },
    task: 'Type the change you get back.', practice: ['chg'] },
  { id: 'distribute', title: 'Split one number', idea: 'Break a 2-digit number into tens and ones, multiply both, then add.',
    example: { question: '23 × 7 = ?', steps: ['tens: 20 × 7 = 140', 'ones: 3 × 7 = 21', 'add: 140 + 21'], answer: '161' },
    task: 'Answer each multiplication.', practice: ['m21', 'm22'], focus: p => nums(p).every(n => n % 10 !== 0) },
  { id: 'chunkdiv', title: 'Divide in chunks', idea: 'Take a big easy chunk out first, then divide what is left.',
    example: { question: '157 ÷ 3 = ? (1 decimal)', steps: ['easy chunk: 150 ÷ 3 = 50', 'what is left: 7 ÷ 3 ≈ 2.3', 'together: 50 + 2.3'], answer: '≈ 52.3' },
    task: 'Answer each division (round to 1 decimal when asked).', practice: ['dx', 'ddec'] },
  { id: 'discount', title: 'Pay what is left', idea: '30% off means you pay the other 70%. Work out that part directly.',
    example: { question: '€60 with 30% off: what do you pay?', steps: ['30% off → you pay 70%', '10% of €60 = €6', '70% = 7 × €6'], answer: '€42' },
    kr: { question: '600 kr with 30% off: what do you pay?', steps: ['30% off → you pay 70%', '10% of 600 = 60 kr', '70% = 7 × 60'], answer: '420 kr' },
    task: 'Type the price you pay after the discount (not the discount itself).', practice: ['disc'] },
  { id: 'squares', title: 'Squares near a round number', idea: 'Go up and down by the same amount to hit a round number: n² = (n + d)(n − d) + d².',
    example: { question: '27² = ?', steps: ['up 3 and down 3: 30 × 24 = 720', 'add 3² = 9: 720 + 9'], answer: '729' },
    task: 'Answer each square.', practice: ['sq'] },
];

export const trickById = (id: string) => TRICKS.find(t => t.id === id)!;

/** Find the lesson that teaches a given generator (used to suggest training). */
export const trickForGenerator = (genKey: string) => TRICKS.find(t => t.practice.includes(genKey));

/**
 * The lesson to suggest next: the one for your weakest practised skill (lowest memory box) that
 * has a lesson not in `exclude`; otherwise the first lesson not excluded (they go roughly easy → hard).
 * Deterministic, so the "Recommended" tag doesn't jump around between visits.
 */
export function suggestTrick(exclude: string[] = []): Trick {
  const open = (t: Trick | undefined): t is Trick => !!t && !exclude.includes(t.id);
  const byWeakness = Object.keys(save.skills)
    .map(k => ({ k, s: getSkill(k) })).filter(x => x.s && generatorByKey(x.k))
    .sort((a, b) => effectiveBox(a.s) - effectiveBox(b.s))
    .map(x => trickForGenerator(x.k));
  return byWeakness.find(open) ?? TRICKS.find(open) ?? TRICKS[0];
}
