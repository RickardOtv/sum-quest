/**
 * Training lesson flow, used by the training room in a run and by the
 * Training tab at camp: learn the trick → try it a few times → reward.
 */
import { CONFIG } from '../config';
import { makeProblem, getCurrency, money } from '../math/problems';
import type { Trick } from '../math/tricks';
import { logAnswer } from '../state/answers';
import { answerText, askTyped, confidenceDue, esc, openSheet, pushKeys } from './dom';

/** Lessons are written in €; show them in the player's currency, with kr after the amount. */
const cur = (s: string) => s.replace(/€(\d+(?:\.\d+)?)/g, (_, n: string) => money(+n)).replace(/€/g, getCurrency().trim());

export function runLesson(trick: Trick, rewardText: (correct: number) => string): Promise<{ correct: number }> {
  return new Promise(resolve => {
    // 1. the trick
    const intro = openSheet(`<div class="label center">Training</div><h2>${esc(trick.title)}</h2>
      <p class="lesson-idea">${esc(cur(trick.idea))}</p>
      <ol class="steps">${trick.steps.map((s, i) => `<li style="animation-delay:${i * 0.35}s">${esc(cur(s))}</li>`).join('')}</ol>
      <button class="btn primary" id="go">Try it (${CONFIG.training.problemsPerLesson} problems)</button>`);
    const releaseIntro = pushKeys(e => { if (e.key === 'Enter') { start(); return true; } return false; });
    intro.querySelector('#go')!.addEventListener('click', start);

    let correct = 0, index = 0;
    function start() { releaseIntro(); intro.remove(); next(); }

    // 2. practice problems from this trick's generators
    async function next() {
      if (index >= CONFIG.training.problemsPerLesson) return finish();
      const p = makeProblem(trick.practice[index % trick.practice.length], [], trick.focus);
      index++;
      const r = await askTyped({ problem: p, heading: esc(trick.title), note: `${index} / ${CONFIG.training.problemsPerLesson}`, submitLabel: 'Answer', bottom: true, confidence: confidenceDue(4) });
      if (!r) return;
      logAnswer(p, r.kind, r.seconds, false, r.confident);
      if (r.kind === 'exact') correct++;
      const sheet = openSheet(`<p class="note center">${esc(cur(trick.idea))}</p>
        <div class="result">${r.kind === 'exact'
          ? `<b class="ok">✓ Nice, ${r.seconds.toFixed(1)}s</b><span>${esc(p.explain)}</span>`
          : `<b class="${r.kind === 'close' ? 'warn' : 'bad'}">${r.kind === 'close' ? '≈ Close' : '✗ Not quite'}: it's ${esc(answerText(p))}</b><span>${esc(p.explain)}</span>`}</div>
        <button class="btn primary" id="next">Next</button>`, { bottom: true });
      const go = () => { releaseNext(); sheet.remove(); next(); };
      sheet.querySelector('#next')!.addEventListener('click', go);
      const releaseNext = pushKeys(e => { if (e.key === 'Enter') { go(); return true; } return false; });
    }

    // 3. result
    function finish() {
      const done = openSheet(`<h2>${correct}/${CONFIG.training.problemsPerLesson} correct</h2>
        <p class="note center">${esc(rewardText(correct))}</p><button class="btn primary" id="ok">Continue</button>`);
      const close = () => { release(); done.remove(); resolve({ correct }); };
      done.querySelector('#ok')!.addEventListener('click', close);
      const release = pushKeys(e => { if (e.key === 'Enter') { close(); return true; } return false; });
    }
  });
}
