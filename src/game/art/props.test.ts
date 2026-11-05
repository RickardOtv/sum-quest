import { describe, expect, it } from 'vitest';
import { drawShrooms } from './props';

/** Decor mushrooms must never look like the red spore-cap enemy. */
describe('drawShrooms', () => {
  it('has no red pixels', () => {
    const g = drawShrooms();
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y);
      if (!c) continue;
      const r = parseInt(c.slice(1, 3), 16), gr = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
      expect(r > 170 && gr < 0.6 * r && b < 0.6 * r, `red pixel ${c} at ${x},${y}`).toBe(false);
    }
  });
});
