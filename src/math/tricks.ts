/**
 * Training-room lessons. Each lesson teaches one mental-math trick, shows a
 * worked example, then gives practice problems from the matching generator.
 * Research note: teaching a strategy transfers to new problems better than
 * drill alone, so these are the "learn a shortcut" moments of the game.
 */
import type { Problem } from './problems';

export interface Trick {
  id: string;
  title: string;
  idea: string;          // the trick in one sentence
  steps: string[];       // worked example, one step per line
  practice: string[];    // generator keys used for the practice problems
  focus?: (p: Problem) => boolean; // keep only problems where the trick applies
}

const nums = (p: Problem) => (p.text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

export const TRICKS: Trick[] = [
  { id: 'nines', title: 'The 9s shortcut', idea: 'Multiply by 10, then take one away.',
    steps: ['9 × 7', '10 × 7 = 70', '70 − 7 = 63'], practice: ['mf'], focus: p => nums(p).includes(9) },
  { id: 'bridge', title: 'Bridge through ten', idea: 'Fill up to the next ten first, then add what is left.',
    steps: ['47 + 8', '47 + 3 = 50', '50 + 5 = 55'], practice: ['add1', 'add2'], focus: p => { const [a, b] = nums(p); return (a % 10) + (b % 10) >= 10; } },
  { id: 'round', title: 'Round, then fix', idea: 'Subtract a round number, then add back the difference.',
    steps: ['157 − 68', '157 − 70 = 87', 'you took 2 too many → 89'], practice: ['sub2', 'sub3'], focus: p => nums(p)[1] % 10 >= 7 },
  { id: 'tens', title: 'Tens first', idea: 'Add or subtract the tens, then the ones.',
    steps: ['63 + 29', '63 + 20 = 83', '83 + 9 = 92'], practice: ['add2', 'add3'], focus: p => nums(p)[1] % 10 !== 0 },
  { id: 'percent', title: 'Build from 10%', idea: '10% is easy (÷10). Halve it for 5%, double it for 20%.',
    steps: ['Bill €48, tip 15%: how much?', '10% = €4.80', '5% = €2.40', '€4.80 + €2.40 = €7.20'], practice: ['tip', 'pof'] },
  { id: 'split', title: 'Split the bill in chunks', idea: 'Divide an easy chunk first, then the rest.',
    steps: ['Bill €87, 3 people: each pays?', '€60 ÷ 3 = €20', '€27 ÷ 3 = €9', '€20 + €9 = €29'], practice: ['split'] },
  { id: 'change', title: 'Count up for change', idea: 'Go from the price up to a round number, then to the note.',
    steps: ['€13.65, paid with €20: your change?', '€13.65 → €14 is €0.35', '€14 → €20 is €6', 'change = €6.35'], practice: ['chg'] },
  { id: 'distribute', title: 'Split one number', idea: 'Break a 2-digit number into tens and ones, multiply both, add.',
    steps: ['23 × 7', '20 × 7 = 140', '3 × 7 = 21', '140 + 21 = 161'], practice: ['m21', 'm22'], focus: p => nums(p).every(n => n % 10 !== 0) },
  { id: 'chunkdiv', title: 'Divide in chunks', idea: 'Take a big easy chunk out first, then divide what is left.',
    steps: ['157 ÷ 3', '150 ÷ 3 = 50', '7 ÷ 3 ≈ 2.33', '≈ 52.3'], practice: ['dx', 'ddec'] },
  { id: 'discount', title: 'Pay what is left', idea: '30% off means you pay 70%. Work out the part you pay.',
    steps: ['€60, 30% off', '10% = €6', 'pay 70% = 7 × €6 = €42'], practice: ['disc'] },
  { id: 'squares', title: 'Squares near a round number', idea: 'n² = (n + d)(n − d) + d². Pick d to land on a round number.',
    steps: ['27²', '30 × 24 = 720', '+ 3² = 9', '= 729'], practice: ['sq'] },
];

export const trickById = (id: string) => TRICKS.find(t => t.id === id)!;

/** Find the lesson that teaches a given generator (used to suggest training). */
export const trickForGenerator = (genKey: string) => TRICKS.find(t => t.practice.includes(genKey));
