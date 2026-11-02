/**
 * A tiny pixel canvas for drawing sprites in code. Draw flat shapes, then
 * `outline()` adds the dark 1-px edge that makes pixel art read clearly.
 */
export class Pixels {
  readonly w: number;
  readonly h: number;
  private data: (string | null)[];

  constructor(w: number, h: number) { this.w = w; this.h = h; this.data = new Array(w * h).fill(null); }

  set(x: number, y: number, c: string | null) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = c; }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.data[y * this.w + x] : null; }
  rect(x: number, y: number, w: number, h: number, c: string) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  hline(x1: number, x2: number, y: number, c: string) { for (let x = x1; x <= x2; x++) this.set(x, y, c); }
  vline(x: number, y1: number, y2: number, c: string) { for (let y = y1; y <= y2; y++) this.set(x, y, c); }
  /** Plot a list of [x, y] points. */
  dots(points: [number, number][], c: string) { points.forEach(([x, y]) => this.set(x, y, c)); }
  /** Add a 1-px outline around every filled pixel. */
  outline(color = '#120e18') {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.set(x, y, color));
    return this;
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w * scale; c.height = this.h * scale;
    const ctx = c.getContext('2d')!;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const col = this.get(x, y);
      if (col) { ctx.fillStyle = col; ctx.fillRect(x * scale, y * scale, scale, scale); }
    }
    return c;
  }
}

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. */
export function tone(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v =>
    Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)));
  return '#' + ch.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}
