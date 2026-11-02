/** One place that records every answer: mastery, difficulty, totals, daily practice. */
import { recordAnswer, type AnswerKind } from '../math/mastery';
import { noteAnswer } from '../math/adaptive';
import { TIER_TARGET, type Problem } from '../math/problems';
import { addPractice, persist, save } from './save';
import { toast } from '../ui/dom';

/**
 * `recognitionOnly`: a 3-option question (crits). `confident`: the player's
 * "Sure / Not sure" call when the prompt asked for one; undefined otherwise.
 */
export function logAnswer(p: Problem, kind: AnswerKind, seconds: number, recognitionOnly = false, confident?: boolean) {
  const target = TIER_TARGET[p.tier] * (recognitionOnly ? 0.6 : 1);
  const { personalBest } = recordAnswer(p.key, kind, seconds, target, recognitionOnly, confident);
  if (p.key !== p.genKey) recordAnswer(p.genKey, kind, seconds, target, recognitionOnly, confident);
  noteAnswer(p.genKey, p.tier, kind);
  save.totals.answered++;
  if (kind === 'exact') save.totals.exact++;
  if (confident !== undefined) {
    const c = save.calibration;
    if (confident) { c.sureN++; if (kind === 'exact') c.sureOk++; } else { c.unsureN++; if (kind === 'exact') c.unsureOk++; }
  }
  if (addPractice(Math.min(seconds, 40))) toast(`Daily goal reached! Streak: ${save.streak.count} 🔥`);
  persist();
  return { personalBest };
}
