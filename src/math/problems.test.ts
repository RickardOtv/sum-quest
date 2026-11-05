import { describe, expect, it } from 'vitest';
import { GENERATORS, makeChoices, makeProblem, type Problem } from './problems';

/** Every wrong option makeChoices may offer: near misses only (never ×2 or ÷2). */
function nearMisses(p: Problem): number[] {
  const a = p.answer, out = [a + 10, a - 10, a + 1, a - 1, a + 2, a - 2];
  const m = /^(\d+) × (\d+)$/.exec(p.text);
  if (m) { const x = +m[1], y = +m[2]; out.push(x * (y + 1), x * (y - 1), (x + 1) * y, (x - 1) * y); }
  if (p.tolerance > 1e-6 && p.tolerance < 0.01) out.push(a + 0.5, a - 0.5, a * 1.1);
  return out.map(c => Math.round(c * 100) / 100);
}

describe('makeChoices', () => {
  for (const g of GENERATORS) {
    it(`${g.key}: 3 distinct positive options, the answer and near misses only`, () => {
      for (let i = 0; i < 40; i++) {
        const p = makeProblem(g.key), options = makeChoices(p), allowed = nearMisses(p);
        expect(new Set(options).size).toBe(options.length);
        expect(options.length).toBe(3);
        expect(options.some(o => Math.abs(o - p.answer) < 1e-9)).toBe(true);
        for (const o of options) {
          if (Math.abs(o - p.answer) < 1e-9) continue;
          expect(o).toBeGreaterThan(0);
          expect(allowed.some(c => Math.abs(c - o) < 1e-9), `${p.text}: ${o} is not a near miss of ${p.answer}`).toBe(true);
        }
      }
    });
  }

  it('never offers double or half the answer when they are not near misses', () => {
    const p = makeProblem(GENERATORS[0].key);
    const big = { ...p, text: '50 + 50', answer: 100, tolerance: 1e-9 };
    for (let i = 0; i < 50; i++) {
      const options = makeChoices(big);
      expect(options).not.toContain(200);
      expect(options).not.toContain(50);
    }
  });
});
