/**
 * Tracks how well the player knows each skill, and powers spaced
 * repetition (what comes back, and when) and the Progress screen.
 *
 * Method: a half-life forgetting model, like Duolingo's. Every skill has a
 * half-life `hl` (hours): the time until the chance of remembering it drops
 * to 50%. Recall right now is 2^(−idle / hl). A correct answer stretches the
 * half-life, a miss shrinks it. Items are served when recall is fading, and
 * items you clearly know right now are held back (overlearning adds little).
 */

export interface SkillRecord {
  n: number;        // attempts
  ok: number;       // exact answers
  hl: number;       // half-life in hours
  last: number;     // timestamp of last attempt (ms)
  avgTime: number;  // smoothed answer time (s)
  bestTime: number; // fastest correct answer (s), 0 = none yet
  hist: [number, number][]; // last 20 attempts: [correct 0/1, seconds]
}

export type Skills = Record<string, SkillRecord>;
export type AnswerKind = 'exact' | 'close' | 'miss';
export type Status = 'new' | 'struggling' | 'learning' | 'solid' | 'fluent';

const HOUR = 3600e3;
const MIN_HL = 0.1, MAX_HL = 24 * 90; // 6 minutes … 90 days
/** Half-life (hours) that corresponds to each of the five "boxes" the UI shows. */
const BOX_HL = [0.1, 1, 6, 24, 24 * 4, 24 * 14];

let skills: Skills = {};
export function bindSkills(s: Skills) { skills = s; }
export function getSkill(key: string): SkillRecord | undefined { return skills[key]; }

/** Saves from before v0.8 stored Leitner boxes; turn them into half-lives. */
export function migrateSkills(s: Skills) {
  for (const r of Object.values(s) as (SkillRecord & { box?: number })[]) {
    if (typeof r.hl !== 'number' || !isFinite(r.hl)) r.hl = BOX_HL[Math.max(0, Math.min(5, r.box ?? 0))];
    delete r.box;
  }
}

/** Chance (0..1) of answering right now, from the forgetting curve. */
export function recall(s: SkillRecord | undefined, now = Date.now()): number {
  if (!s || !s.n) return 0;
  return Math.pow(2, -Math.max(0, now - s.last) / HOUR / s.hl);
}

/**
 * A 0..5 level for display: how long the memory lasts (half-life), pulled
 * down while recall is fading. 5 = known for weeks and fresh in mind.
 */
export function effectiveBox(s: SkillRecord | undefined, now = Date.now()): number {
  if (!s || !s.n) return 0;
  let stage = 0;
  while (stage < 5 && s.hl >= BOX_HL[stage + 1]) stage++;
  const r = recall(s, now);
  return Math.round(stage * Math.min(1, r / 0.6));
}

/* ---------- the session cap on overlearning ---------- */
const fluentThisSession = new Map<string, number>();

/**
 * How much a skill wants to be practised right now (used as a pick weight).
 * New: eager. Fading or missed: urgent. Fresh in mind and already answered
 * fluently this session: nearly skipped.
 */
export function priority(key: string, capAfter = 1, now = Date.now()): number {
  const s = skills[key];
  if (!s || !s.n) return 1.4;
  const r = recall(s, now);
  let w = 0.15 + (1 - r) * 1.6;
  const lastWrong = s.hist.length && s.hist[s.hist.length - 1][0] === 0;
  if (lastWrong) w += 0.6;
  if (r > 0.85 && (fluentThisSession.get(key) ?? 0) >= capAfter && !lastWrong) w *= 0.05;
  return w;
}

/**
 * Record one answer. `recognitionOnly` is true for 3-option questions
 * (picking is easier than recalling, so the memory grows less).
 * `confident` is the player's own "Sure / Not sure" call when asked: a
 * hesitant right answer grows less, a confident wrong one shrinks more.
 */
export function recordAnswer(key: string, kind: AnswerKind, seconds: number, targetSec: number,
  recognitionOnly = false, confident?: boolean, now = Date.now()): { personalBest: boolean } {
  const s = skills[key] ?? (skills[key] = { n: 0, ok: 0, hl: MIN_HL, last: 0, avgTime: 0, bestTime: 0, hist: [] });
  const correct = kind === 'exact';
  const fluent = correct && seconds <= targetSec;
  const r = s.n ? recall(s, now) : 0;

  s.n++;
  if (correct) s.ok++;
  s.avgTime = s.n === 1 ? seconds : s.avgTime * 0.7 + seconds * 0.3;

  let personalBest = false;
  if (correct && (s.bestTime === 0 || seconds < s.bestTime)) { personalBest = s.bestTime > 0; s.bestTime = seconds; }

  if (correct) {
    // retrieving something that was about to be forgotten strengthens it most (desirable difficulty)
    let growth = fluent ? 1.6 + (1 - r) * 1.6 : 1.3;
    if (recognitionOnly) growth = 1 + (growth - 1) * 0.6;
    if (confident === false) growth = 1 + (growth - 1) * 0.6;
    s.hl = Math.min(MAX_HL, Math.max(s.n === 1 ? 1 : s.hl, s.hl * growth));
    if (fluent && r > 0.85) fluentThisSession.set(key, (fluentThisSession.get(key) ?? 0) + 1);
  } else {
    // a miss sends the item back to "learning": at most a few hours of half-life, less when you felt sure
    s.hl = Math.max(MIN_HL, Math.min(s.hl * 0.2, confident === true ? 6 : 12));
    fluentThisSession.delete(key);
  }

  s.hist.push([correct ? 1 : 0, Math.round(seconds * 10) / 10]);
  if (s.hist.length > 20) s.hist.shift();
  s.last = now;
  return { personalBest };
}

export function accuracy(s: SkillRecord) { return s.n ? s.ok / s.n : 0; }

export function statusOf(s: SkillRecord | undefined): Status {
  if (!s || s.n < 3) return 'new';
  const box = effectiveBox(s);
  const recent = s.hist.slice(-8);
  const recentAcc = recent.reduce((a, [c]) => a + c, 0) / recent.length;
  if (recentAcc < 0.6 || box === 0) return 'struggling';
  if (box <= 2) return 'learning';
  if (box <= 3) return 'solid';
  return 'fluent';
}

/** Compare the latest 10 attempts with the 10 before them. */
export function trendOf(s: SkillRecord): { accDelta: number; timeDelta: number } | null {
  if (s.hist.length < 12) return null;
  const now = s.hist.slice(-10), before = s.hist.slice(-20, -10);
  const acc = (h: [number, number][]) => h.reduce((a, [c]) => a + c, 0) / h.length;
  const time = (h: [number, number][]) => h.reduce((a, [, t]) => a + t, 0) / h.length;
  return { accDelta: acc(now) - acc(before), timeDelta: time(now) - time(before) };
}

/** Higher = more of a struggle. Combines recent accuracy and slowness vs target. */
export function struggleScore(s: SkillRecord, targetSec: number): number {
  const recent = s.hist.slice(-10);
  const acc = recent.reduce((a, [c]) => a + c, 0) / recent.length;
  const slow = Math.min(2, s.avgTime / targetSec);
  return (1 - acc) * 2 + slow * 0.5 + (5 - effectiveBox(s)) * 0.1;
}
