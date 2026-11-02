/**
 * Picks the hero frame for this moment: which step of the walk cycle, and
 * whether we see the back (walking away from the camera). Shared by the
 * run and the camp.
 */
const SEQUENCE = [1, 0, 2, 0]; // left step, stand, right step, stand
const FRAME_MS = 110;

export interface WalkState { moving: boolean; faceUp: boolean; }

/** Texture key for the hero right now. `timeMs` is the scene clock. */
export function heroFrameKey(w: WalkState, timeMs: number): string {
  const frame = w.moving ? SEQUENCE[Math.floor(timeMs / FRAME_MS) % SEQUENCE.length] : 0;
  return `${w.faceUp ? 'heroB' : 'hero'}_${frame}`;
}

/** Walking bob: a small lift on the "stand" frames between steps. */
export function heroBob(w: WalkState, timeMs: number): number {
  if (!w.moving) return Math.sin(timeMs / 600) * 0.4; // idle breathing
  return SEQUENCE[Math.floor(timeMs / FRAME_MS) % SEQUENCE.length] === 0 ? 1.5 : 0;
}

/** Update which way the hero faces from the movement vector; vertical only flips the back view. */
export function updateFacing(w: WalkState & { facing: number }, mx: number, my: number) {
  if (Math.abs(mx) > 0.1) w.facing = mx > 0 ? 1 : -1;
  if (Math.abs(my) > 0.2 || Math.abs(mx) > 0.2) w.faceUp = my < -0.2 && Math.abs(my) >= Math.abs(mx) * 0.8;
}
