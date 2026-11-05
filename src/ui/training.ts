/**
 * Training lesson flow, used by the training room in a run and by the
 * Training tab at camp: learn the trick → try it a few times → reward.
 */
import { CONFIG } from '../config';
import { makeProblem, getCurrency, money } from '../math/problems';
import type { Example, Trick } from '../math/tricks';
import { logAnswer } from '../state/answers';
import { answerText, askTyped, confidenceDue, esc, openSheet, pushKeys } from './dom';

/** Lessons are written in €; show them in the player's currency, with kr after the amount. */
const cur = (s: string) => s.replace(/€(\d+(?:\.\d+)?)/g, (_, n: string) => money(+n)).replace(/€/g, getCurrency().trim());
/** The worked example in the player's currency (kronor lessons have their own, kronor-sized example). */
const exampleFor = (t: Trick): Example => {
  if (getCurrency().trim() === 'kr' && t.kr) return t.kr;
  return { question: cur(t.example.question), steps: t.example.steps.map(cur), answer: cur(t.example.answer) };
};

/** A worked solution as numbered lines ("a · b · c" in the problem's explanation = one line each). */
const stepList = (explain: string) => {
  const parts = explain.split(' · ');
  return parts.length > 1 ? `<ol class="lesson-steps">${parts.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : `<p class="lesson-why">${esc(explain)}</p>`;
};

/** `problems`: how many practice problems (camp lessons use the default; a run's training room asks fewer). */
export function runLesson(trick: Trick, rewardText: (correct: number) => string, opts: { problems?: number } = {}): Promise<{ correct: number }> {
  return new Promise(resolve => {
    const n = opts.problems ?? CONFIG.training.problemsPerLesson, ex = exampleFor(trick);
    // 1. the trick: one sentence, a worked example step by step, then what you'll be asked and one Start button
    const intro = openSheet(`<h2>${esc(trick.title)}</h2>
      <p class="lesson-idea">${esc(cur(trick.idea))}</p>
      <div class="lesson-example">
        <span class="label">Example</span>
        <div class="ex-q">${esc(ex.question)}</div>
        <ol class="lesson-steps">${ex.steps.map((s, i) => `<li style="animation-delay:${0.2 + i * 0.35}s">${esc(s)}</li>`).join('')}</ol>
        <div class="ex-a" style="animation-delay:${0.2 + ex.steps.length * 0.35}s">= ${esc(ex.answer)}</div>
      </div>
      <p class="lesson-task"><span class="label">Your turn</span>${esc(trick.task)}</p>
      <button class="btn primary big" id="go">Try ${n} problems</button>`);
    intro.classList.add('lesson-sheet');
    const releaseIntro = pushKeys(e => { if (e.key === 'Enter') { start(); return true; } return false; });
    intro.querySelector('#go')!.addEventListener('click', start);

    let correct = 0, index = 0;
    function start() { releaseIntro(); intro.remove(); next(); }

    // 2. practice problems from this trick's generators
    async function next() {
      if (index >= n) return finish();
      const p = makeProblem(trick.practice[index % trick.practice.length], [], trick.focus);
      index++;
      const r = await askTyped({ problem: p, heading: esc(trick.title), note: `${index} / ${n}`, submitLabel: 'Answer', bottom: true, confidence: confidenceDue(4) });
      if (!r) return;
      logAnswer(p, r.kind, r.seconds, false, r.confident);
      if (r.kind === 'exact') correct++;
      const yours = r.value === '' ? 'nothing' : (p.prefix ?? '') + r.value + (p.suffix ?? '');
      const verdict = r.kind === 'exact' ? `<b class="ok">✓ Right, ${r.seconds.toFixed(1)}s</b>`
        : `<b class="${r.kind === 'close' ? 'warn' : 'bad'}">${r.kind === 'close' ? '≈ Close' : '✗ Not quite'}</b>`;
      const sheet = openSheet(`<div class="result lesson-result">${verdict}
          <div class="ex-q small-q">${esc(p.text)}${p.hint ? ` <span>${esc(p.hint)}</span>` : ''}</div>
          ${r.kind === 'exact' ? '' : `<div class="answers"><span>You typed <b>${esc(yours)}</b></span><span>Answer <b class="ok">${esc(answerText(p))}</b></span></div>`}
          <span class="label">How to get there</span>${stepList(p.explain)}</div>
        <button class="btn primary" id="next">${index >= n ? 'See result' : 'Next problem'}</button>`, { bottom: true });
      sheet.classList.add('lesson-sheet');
      const go = () => { releaseNext(); sheet.remove(); next(); };
      sheet.querySelector('#next')!.addEventListener('click', go);
      const releaseNext = pushKeys(e => { if (e.key === 'Enter') { go(); return true; } return false; });
    }

    // 3. result
    function finish() {
      const done = openSheet(`<h2>${correct}/${n} correct</h2>
        <p class="note center">${esc(rewardText(correct))}</p><button class="btn primary" id="ok">Continue</button>`);
      const close = () => { release(); done.remove(); resolve({ correct }); };
      done.querySelector('#ok')!.addEventListener('click', close);
      const release = pushKeys(e => { if (e.key === 'Enter') { close(); return true; } return false; });
    }
  });
}
