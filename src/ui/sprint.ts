/**
 * Sprint: 60 seconds, as many right answers as you can. A fixed-time round
 * like the classic arithmetic benchmarks, so your score is comparable from
 * day to day. Problems follow your adaptive level and the focus plan; a new
 * personal best earns a chest.
 */
import { CONFIG } from '../config';
import { pickCategory, planFocus, recommendedTier } from '../math/adaptive';
import { judge, pickProblem, type Problem } from '../math/problems';
import { logAnswer } from '../state/answers';
import { dayKey, persist, save } from '../state/save';
import { answerText, esc, numberPad, openSheet, pushKeys, vibrate } from './dom';

interface Missed { text: string; answer: string; explain: string }

/** Intro → round → results. `done` is called when the player leaves. */
export function runSprint(done: () => void) {
  const best = save.sprint.best;
  const sheet = openSheet(`<div class="label center">Sprint</div><h2>${CONFIG.sprint.seconds} seconds</h2>
    <p class="note center">As many right answers as you can. Problems follow your level. A wrong answer shows the solution and moves on.</p>
    <p class="center num">${best ? `Personal best: <b>${best}</b>` : 'Your first Sprint sets your personal best.'}</p>
    <p class="note center small">Beat your best to earn a chest.</p>
    <button class="btn primary big" id="start">Start</button><button class="btn ghost" id="back">Back</button>`);
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#start')!.addEventListener('click', () => { close(); round(done); });
  sheet.querySelector('#back')!.addEventListener('click', () => { close(); done(); });
  const release = pushKeys(e => { if (e.key === 'Enter') { close(); round(done); return true; } if (e.key === 'Escape') { close(); done(); return true; } return false; });
}

function round(done: () => void) {
  planFocus();
  const total = CONFIG.sprint.seconds;
  const sheet = openSheet(`
    <div class="sprint-top"><span class="label">Sprint</span><b class="num score">0</b><span class="num time">${total}</span></div>
    <div class="sprint-bar"><i></i></div>
    <div class="q"></div>
    <div class="answer num"></div>
    <div class="flash"></div>
    <div class="pad-slot"></div>
    <button class="btn ghost" id="skip">Skip <kbd>Esc</kbd></button>`);
  sheet.classList.add('typed-sheet', 'sprint');
  const q = sheet.querySelector<HTMLElement>('.q')!, scoreEl = sheet.querySelector<HTMLElement>('.score')!;
  const timeEl = sheet.querySelector<HTMLElement>('.time')!, bar = sheet.querySelector<HTMLElement>('.sprint-bar i')!, flash = sheet.querySelector<HTMLElement>('.flash')!;

  let score = 0, answered = 0, elapsed = 0, lastTick = performance.now(), ended = false;
  let pad: ReturnType<typeof numberPad> | null = null, lastGen: string | undefined, t0 = 0;
  const recent: string[] = [], missed: Missed[] = [];
  let problem!: Problem;

  const next = () => {
    const cat = pickCategory(), lvl = recommendedTier(cat);
    const tier = Math.random() < 0.35 ? Math.max(1, lvl - 1) : lvl; // a third easier ones keep the pace up
    problem = pickProblem(tier, recent, lastGen, cat);
    lastGen = problem.genKey; recent.push(problem.key); if (recent.length > 8) recent.shift();
    q.innerHTML = `${esc(problem.text)}${problem.hint ? ` <small>${esc(problem.hint)}</small>` : ''}`;
    pad?.destroy();
    pad = numberPad(sheet.querySelector('.answer')!, problem.prefix ?? '', problem.suffix ?? '', submit, 'Answer');
    sheet.querySelector('.pad-slot, .pad')!.replaceWith(pad.el);
    t0 = performance.now();
  };
  const show = (cls: string, text: string) => {
    flash.className = 'flash'; void flash.offsetWidth; // restart the fade animation
    flash.className = `flash ${cls}`; flash.textContent = text;
  };
  const submit = (value: string) => {
    if (ended) return;
    const seconds = (performance.now() - t0) / 1000, { kind } = judge(value, problem);
    logAnswer(problem, kind, seconds);
    answered++;
    if (kind === 'exact') { score++; scoreEl.textContent = String(score); show('ok', '✓'); vibrate(10); }
    else { missed.push({ text: problem.text, answer: answerText(problem), explain: problem.explain }); show(kind === 'close' ? 'warn' : 'bad', `${kind === 'close' ? '≈' : '✗'} ${answerText(problem)}`); vibrate(40); }
    next();
  };
  const skip = () => { if (ended) return; submit(''); }; // a skip counts as a miss

  sheet.querySelector('#skip')!.addEventListener('click', skip);
  const release = pushKeys(e => { if (e.key === 'Escape') { skip(); return true; } return false; });

  const tick = () => {
    if (ended) return;
    const now = performance.now();
    if (!document.hidden) elapsed += (now - lastTick) / 1000; // the clock pauses while the tab is hidden
    lastTick = now;
    const left = Math.max(0, total - elapsed);
    timeEl.textContent = String(Math.ceil(left));
    bar.style.width = `${(left / total) * 100}%`;
    if (left <= 10) timeEl.classList.add('bad');
    if (left <= 0) finish(); else requestAnimationFrame(tick);
  };
  const finish = () => {
    ended = true; pad?.destroy(); release(); sheet.remove();
    results(score, answered, missed, done);
  };
  next();
  requestAnimationFrame(tick);
}

function results(score: number, answered: number, missed: Missed[], done: () => void) {
  const prevBest = save.sprint.best, newBest = score > prevBest;
  const gold = score * CONFIG.sprint.goldPerCorrect;
  save.gold += gold;
  let chest = '';
  if (newBest) { save.sprint.best = score; chest = prevBest ? 'iron' : 'wood'; save.chests.push(chest as 'iron' | 'wood'); }
  save.sprint.history.push({ day: dayKey(), score });
  if (save.sprint.history.length > 30) save.sprint.history.shift();
  persist();
  if (newBest) vibrate([30, 50, 30, 50, 60]);

  const pct = answered ? Math.round((score / answered) * 100) : 0;
  const sheet = openSheet(`<div class="label center">Sprint over</div><h2>${newBest ? 'New personal best!' : `${score} right`}</h2>
    <div class="results">
      <div><span class="label">Score</span><b class="num">${score}</b></div>
      <div><span class="label">Best</span><b class="num">${save.sprint.best}</b></div>
      <div><span class="label">Gold</span><b class="num">+${gold}</b></div>
    </div>
    <p class="note center num">${answered} answered · ${pct}% right${pct > 92 && answered >= 8 ? ' · your level will rise' : pct < 65 && answered >= 8 ? ' · it will ease off a little' : ''}</p>
    ${chest ? `<p class="center"><b class="gold-text">${chest === 'iron' ? 'An iron' : 'A wooden'} chest</b> for the new best: open it in Gear.</p>` : ''}
    ${missed.length ? `<details class="missed" open><summary class="label">What you missed (${missed.length})</summary>
      ${missed.slice(0, 6).map(m => `<div class="miss"><b class="num">${esc(m.text)} = ${esc(m.answer)}</b><span>${esc(m.explain)}</span></div>`).join('')}
      ${missed.length > 6 ? `<p class="note small">…and ${missed.length - 6} more. They'll come back soon.</p>` : ''}</details>` : ''}
    <div class="row2"><button class="btn" id="back">Camp</button><button class="btn primary" id="again">Sprint again</button></div>`);
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#again')!.addEventListener('click', () => { close(); round(done); });
  sheet.querySelector('#back')!.addEventListener('click', () => { close(); done(); });
  const release = pushKeys(e => { if (e.key === 'Enter') { close(); round(done); return true; } if (e.key === 'Escape') { close(); done(); return true; } return false; });
}
