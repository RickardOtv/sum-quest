/**
 * The notice board (Progress): a cork strip with three pinned notes (streak,
 * today's goal, overall mastery), then four tabs so each page shows one thing:
 *   Focus   – what the next run will serve and why, and the difficulty per category
 *   Skills  – every skill by category, with a status bar per category
 *   Tables  – the times-table map; tap a cell for its details
 *   Records – Sprint scores over time, practice calendar, confidence, lifetime totals
 * Inspired by brain-training apps (one headline score, detail on demand) and
 * RPG codex screens (icon tabs, one topic per page).
 */
import { CONFIG } from '../config';
import { ALL_PAIRS, CATEGORIES, GENERATORS, TIER_LABEL, TIER_TARGET, type Category } from '../math/problems';
import { accuracy, effectiveBox, getSkill, recall, statusOf, trendOf, type Status } from '../math/mastery';
import { CATEGORY_LABEL, CATEGORY_SHORT, WHY_LABEL, planFocus, type FocusWhy } from '../math/adaptive';
import { trickForGenerator } from '../math/tricks';
import { currentStreak, dayKey, save } from '../state/save';
import { esc, fmtTime, html } from './dom';
import { gi, type IconName } from './icons';
import type { CampTab } from './camp';

type BoardTab = 'focus' | 'skills' | 'tables' | 'records';
const TABS: [BoardTab, IconName, string][] = [['focus', 'target-arrows', 'Focus'], ['skills', 'stairs-goal', 'Skills'], ['tables', 'abacus', 'Tables'], ['records', 'laurels-trophy', 'Records']];
let tab: BoardTab = 'focus';
let skillCat: Category = 'facts';

const STATUS_LABEL: Record<Status, string> = { new: 'Not tried', struggling: 'Struggling', learning: 'Learning', solid: 'Solid', fluent: 'Fluent' };
const STATUS_ORDER: Status[] = ['fluent', 'solid', 'learning', 'struggling', 'new'];
const STATUS_STEP: Record<Status, number> = { new: 0, struggling: 1, learning: 2, solid: 3, fluent: 4 }; // pips lit (of 4)
const STATUS_WEIGHT: Record<Status, number> = { new: 0, struggling: 0.15, learning: 0.45, solid: 0.75, fluent: 1 };
const CAT_ICON: Record<Category, IconName> = { facts: 'brain', addsub: 'calculator', muldiv: 'divided-square', everyday: 'two-coins' };
const WHY_ICON: Record<FocusWhy, IconName> = { weak: 'broken-shield', rusty: 'hourglass', new: 'sparkles' };

/* ---------------- mastery numbers ---------------- */
const pairKey = (a: number, b: number) => `m:${Math.min(a, b)}×${Math.max(a, b)}`;
/** 0..1 for one category: how far its skills have come. Facts also count the times-table map. */
function categoryMastery(cat: Category): number {
  const gens = GENERATORS.filter(g => g.category === cat);
  const g = gens.reduce((a, x) => a + STATUS_WEIGHT[statusOf(getSkill(x.key))], 0) / gens.length;
  if (cat !== 'facts') return g;
  const pairs = ALL_PAIRS.reduce((a, [x, y]) => a + STATUS_WEIGHT[statusOf(getSkill(pairKey(x, y)))], 0) / ALL_PAIRS.length;
  return (g + pairs) / 2;
}
const overallMastery = () => CATEGORIES.reduce((a, c) => a + categoryMastery(c), 0) / CATEGORIES.length;

/* ---------------- small diagrams ---------------- */
/** A progress ring with something in the middle. */
function ring(frac: number, size: number, stroke: number, color: string, inner: string) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return `<span class="ring-wrap" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}"/>
    ${f > 0.005 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : ''}</svg><span class="ring-in">${inner}</span></span>`;
}
/** A labelled horizontal meter; `mark` draws a goal tick. */
const meter = (label: string, frac: number, value: string, cls: string, mark?: number) =>
  `<div class="meter ${cls}"><span class="m-label">${label}</span><span class="m-track"><i style="width:${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%"></i>${mark !== undefined ? `<b class="m-mark" style="left:${Math.round(mark * 100)}%"></b>` : ''}</span><span class="m-val num">${value}</span></div>`;
const pips = (lit: number, of = 4, cls = '') => `<span class="pips ${cls}">${Array.from({ length: of }, (_, i) => `<i class="${i < lit ? 'on' : ''}"></i>`).join('')}</span>`;

/* ---------------- the board ---------------- */
export function renderProgress(body: HTMLElement, open: (t: CampTab) => void) {
  body.classList.add('flush');
  body.appendChild(pinnedNotes());
  const tabs = html(`<nav class="board-tabs">${TABS.map(([id, icon, label]) => `<button data-t="${id}" class="${id === tab ? 'on' : ''}">${gi(icon)}<span>${label}</span></button>`).join('')}</nav>`);
  const pane = html(`<div class="board-pane"></div>`);
  const show = () => {
    tabs.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    pane.innerHTML = '';
    ({ focus: () => focusTab(pane, open), skills: () => skillsTab(pane), tables: () => tablesTab(pane), records: () => recordsTab(pane) })[tab]();
  };
  tabs.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.t as BoardTab; show(); }));
  body.append(tabs, pane);
  show();
}

/** Cork strip: streak with this week's days, today's goal ring, overall mastery. */
function pinnedNotes(): HTMLElement {
  const today = save.practiceByDay[dayKey()] ?? 0, goal = CONFIG.dailyGoalSec, streak = currentStreak();
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const dots = week.map(d => { const s = save.practiceByDay[dayKey(d)] ?? 0; return `<i class="${s >= goal ? 'met' : s > 0 ? 'some' : ''} ${dayKey(d) === dayKey() ? 'today' : ''}" title="${d.toLocaleDateString(undefined, { weekday: 'long' })}: ${fmtTime(s)}"><span>${d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span></i>`; }).join('');
  const m = Math.round(overallMastery() * 100);
  return html(`<section class="cork">
    <div class="note n1"><span class="pin">${gi('pin')}</span><span class="n-label">Streak</span>
      <span class="n-big"><span class="flame ${streak ? 'lit' : ''}">${gi('flame')}</span><b class="num">${streak}</b><small>day${streak === 1 ? '' : 's'}</small></span>
      <span class="week-dots">${dots}</span></div>
    <div class="note n2"><span class="pin">${gi('pin')}</span><span class="n-label">Today</span>
      ${ring(today / goal, 64, 7, today >= goal ? '#8fd07a' : '#f2c94c', `<b class="num">${Math.floor(Math.min(today, goal) / 60)}:${String(Math.min(today, goal) % 60).padStart(2, '0')}</b><small>of ${goal / 60}:00</small>`)}</div>
    <div class="note n3"><span class="pin">${gi('pin')}</span><span class="n-label">Mastery</span>
      ${ring(m / 100, 64, 7, '#b08cff', `<b class="num">${m}%</b>`)}
      <small class="n-sub">of all skills</small></div>
  </section>`);
}

/* ---------------- Focus ---------------- */
function focusTab(pane: HTMLElement, open: (t: CampTab) => void) {
  const focus = planFocus();
  pane.appendChild(html(`<div class="pane-head"><b>Next run focuses on</b><span class="note small">also Sprint and chests</span></div>`));
  if (!focus.length) pane.appendChild(html(`<p class="note pad">Play a run, a Sprint or a lesson. After a few answers the board picks what to work on: weak skills first, then ones going rusty, then new ones.</p>`));
  const notes = html(`<div class="quest-notes"></div>`);
  focus.forEach(({ g, why }, i) => {
    const s = getSkill(g.key), trick = trickForGenerator(g.key), goal = TIER_TARGET[g.tier];
    const acc = s && s.n ? accuracy(s) : 0, time = s && s.n ? s.avgTime : 0;
    // speed bar: full = at or under the goal time; goal tick at 100%; slower answers shrink it
    const speedFrac = time ? Math.min(1, goal / time) : 0;
    const el = html(`<article class="quest ${why}" style="--tilt:${[-1.2, 0.8, -0.5][i % 3]}deg">
      <span class="pin">${gi('pin')}</span>
      <header><span class="why-ic">${gi(WHY_ICON[why])}</span><span class="why-tag">${WHY_LABEL[why]}</span><span class="tier-tag t${g.tier}c">${TIER_LABEL[g.tier]}</span></header>
      <h3>${esc(g.label)}</h3>
      ${s && s.n ? `${meter('Right', acc, `${Math.round(acc * 100)}%`, acc >= 0.85 ? 'good' : acc >= 0.7 ? 'warn' : 'bad', 0.85)}
        ${meter('Speed', speedFrac, `${time.toFixed(1)}s`, time <= goal ? 'good' : time <= goal * 1.5 ? 'warn' : 'bad')}
        <p class="q-foot note small num">goal ${goal}s · tick = 85% right${why === 'rusty' ? ` · ${Math.round(recall(s) * 100)}% likely to remember now` : ''}${trendWord(s)}</p>`
      : '<p class="note small">Not tried yet: it will show up in your next run.</p>'}
      ${trick && why === 'weak' ? `<button class="btn small lesson-btn">${gi('open-book')} Lesson: ${esc(trick.title)}</button>` : ''}
    </article>`);
    el.querySelector('.lesson-btn')?.addEventListener('click', () => open('training'));
    notes.appendChild(el);
  });
  pane.appendChild(notes);

  // difficulty per category: a 4-step meter each
  pane.appendChild(html(`<section class="board-card"><div class="pane-head"><b>Difficulty</b><span class="note small">aims for ~85% right</span></div>
    <div class="diff-rows">${CATEGORIES.map(c => { const lv = save.adaptive[c].level; return `<div class="diff-row"><span class="cat-ic">${gi(CAT_ICON[c])}</span><span class="d-name">${CATEGORY_SHORT[c]}</span>
      <span class="steps">${[1, 2, 3, 4].map(t => `<i class="${t <= lv ? `on t${t}` : ''}"></i>`).join('')}</span><b class="t${lv}c">${TIER_LABEL[lv]}</b></div>`; }).join('')}</div>
    <p class="note small">Goes up when you're above ~90% right in a category, eases off below ~72%.</p></section>`));
}
function trendWord(s: NonNullable<ReturnType<typeof getSkill>>) {
  const t = trendOf(s); if (!t) return '';
  if (t.accDelta > 0.1 || t.timeDelta < -0.8) return ' · <span class="ok">improving</span>';
  if (t.accDelta < -0.1 || t.timeDelta > 0.8) return ' · <span class="bad">slipping</span>';
  return ' · steady';
}

/* ---------------- Skills ---------------- */
function skillsTab(pane: HTMLElement) {
  // category picker: icon + mastery ring
  const picker = html(`<div class="cat-pick">${CATEGORIES.map(c => `<button data-c="${c}" class="${c === skillCat ? 'on' : ''}">${ring(categoryMastery(c), 46, 5, '#b08cff', gi(CAT_ICON[c]))}<span>${CATEGORY_SHORT[c]}</span><small class="num">${Math.round(categoryMastery(c) * 100)}%</small></button>`).join('')}</div>`);
  pane.appendChild(picker);
  const detail = html(`<section class="board-card"></section>`);
  pane.appendChild(detail);
  const draw = () => {
    picker.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.classList.toggle('on', b.dataset.c === skillCat));
    const gens = GENERATORS.filter(g => g.category === skillCat).map(g => ({ g, s: getSkill(g.key), st: statusOf(getSkill(g.key)) }));
    const counts = STATUS_ORDER.map(st => [st, gens.filter(x => x.st === st).length] as const);
    const rank = (st: Status) => ({ struggling: 0, learning: 1, new: 4, solid: 2, fluent: 3 })[st];
    gens.sort((a, b) => rank(a.st) - rank(b.st) || a.g.tier - b.g.tier);
    detail.innerHTML = `<div class="pane-head"><b>${CATEGORY_LABEL[skillCat]}</b><span class="note small num">${gens.length} skills</span></div>
      <div class="stack-bar">${counts.filter(([, n]) => n).map(([st, n]) => `<i class="s-${st}" style="flex:${n}" title="${STATUS_LABEL[st]}: ${n}">${n}</i>`).join('')}</div>
      <div class="stack-legend">${counts.filter(([, n]) => n).map(([st, n]) => `<span><i class="s-${st}"></i>${STATUS_LABEL[st]} <b class="num">${n}</b></span>`).join('')}</div>
      <div class="skill-rows">${gens.map(({ g, s, st }) => `<div class="skill-row2 ${st}">
        <span class="tier-dot t${g.tier}" title="${TIER_LABEL[g.tier]}"></span>
        <span class="sk-name">${esc(g.label)}${s && s.n ? `<small class="num">${Math.round(accuracy(s) * 100)}% right · ${s.avgTime.toFixed(1)}s · ${s.n}×</small>` : '<small>not tried yet</small>'}</span>
        <span class="sk-status">${pips(STATUS_STEP[st], 4, `s-${st}`)}<small>${STATUS_LABEL[st]}</small></span></div>`).join('')}</div>
      <p class="note small">Pips: struggling → learning → solid → fluent. Skills you're struggling with come first.</p>`;
  };
  picker.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.addEventListener('click', () => { skillCat = b.dataset.c as Category; draw(); }));
  draw();
}

/* ---------------- Tables ---------------- */
const BOX_WORD = ['missed recently', 'just learned', 'learning', 'solid', 'remembered for weeks', 'remembered for weeks'];
function tablesTab(pane: HTMLElement) {
  const fluent = ALL_PAIRS.filter(([a, b]) => effectiveBox(getSkill(pairKey(a, b))) >= 3).length;
  let cells = '<span class="corner">×</span>';
  for (let b = 2; b <= 12; b++) cells += `<span class="h">${b}</span>`;
  for (let a = 2; a <= 12; a++) {
    cells += `<span class="h">${a}</span>`;
    for (let b = 2; b <= 12; b++) { const s = getSkill(pairKey(a, b)); cells += `<button class="m b${s ? effectiveBox(s) : 'x'}" data-a="${a}" data-b="${b}" aria-label="${a} × ${b}"></button>`; }
  }
  const card = html(`<section class="board-card">
    <div class="pane-head"><b>Times-table map</b><span class="num"><b>${fluent}</b> / ${ALL_PAIRS.length} solid or better</span></div>
    <span class="big-progress"><i style="width:${Math.round((fluent / ALL_PAIRS.length) * 100)}%"></i></span>
    <div class="grid12 big">${cells}</div>
    <div class="cell-info note">Tap a square to see how that fact is going.</div>
    <div class="legend"><span><i class="m bx"></i>not seen</span><span><i class="m b0"></i>missed</span><span><i class="m b1"></i>new</span><span><i class="m b2"></i>learning</span><span><i class="m b3"></i>solid</span><span><i class="m b5"></i>weeks</span></div></section>`);
  const info = card.querySelector<HTMLElement>('.cell-info')!;
  card.querySelectorAll<HTMLButtonElement>('button.m').forEach(btn => btn.addEventListener('click', () => {
    card.querySelectorAll('button.m.sel').forEach(x => x.classList.remove('sel')); btn.classList.add('sel');
    const a = +btn.dataset.a!, b = +btn.dataset.b!, s = getSkill(pairKey(a, b));
    info.innerHTML = s ? `<b class="num">${a} × ${b} = ${a * b}</b> · ${BOX_WORD[effectiveBox(s)]} · <span class="num">${Math.round(accuracy(s) * 100)}% right · best ${s.bestTime ? s.bestTime.toFixed(1) + 's' : '–'} · ${Math.round(recall(s) * 100)}% likely to remember now</span>`
      : `<b class="num">${a} × ${b} = ${a * b}</b> · not seen yet`;
  }));
  pane.appendChild(card);
}

/* ---------------- Records ---------------- */
function recordsTab(pane: HTMLElement) {
  const pct = save.totals.answered ? Math.round((save.totals.exact / save.totals.answered) * 100) : 0;
  pane.appendChild(html(`<section class="record-tiles">
    <div><span class="r-ic">${gi('scroll-quill')}</span><b class="num">${save.totals.answered}</b><small>solved</small></div>
    <div><span class="r-ic">${gi('bullseye')}</span><b class="num">${pct}%</b><small>correct</small></div>
    <div><span class="r-ic">${gi('daemon-skull')}</span><b class="num">${save.clears}</b><small>bosses beaten</small></div>
    <div><span class="r-ic">${gi('open-gate')}</span><b class="num">${save.bestRoom}</b><small>best room</small></div></section>`));
  pane.appendChild(sprintChart());
  pane.appendChild(calendar());
  pane.appendChild(weekChart());
  pane.appendChild(confidence());
}

/** Sprint scores over time (line), with the personal best as a dashed line. */
function sprintChart(): HTMLElement {
  const h = save.sprint.history.slice(-20);
  if (h.length < 2) return html(`<section class="board-card"><div class="pane-head"><b>Sprint</b><span class="num">${save.sprint.best ? `best ${save.sprint.best}` : ''}</span></div>
    <p class="note small">60 seconds, as many right as you can. Do a few Sprints in the training yard and your scores show up here as a line, so you can see your speed climb.</p></section>`);
  const W = 320, H = 130, l = 26, r = 10, t = 12, b = 22, pw = W - l - r, ph = H - t - b;
  const max = Math.max(5, Math.ceil((Math.max(...h.map(x => x.score)) * 1.15) / 5) * 5);
  const X = (i: number) => l + (i / (h.length - 1)) * pw, Y = (v: number) => t + ph - (v / max) * ph;
  const pts = h.map((x, i) => `${X(i).toFixed(1)},${Y(x.score).toFixed(1)}`).join(' ');
  const grid = [0, max / 2, max].map(v => `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${l - 6}" y="${Y(v) + 4}" class="axis end">${v}</text>`).join('');
  const lastI = h.length - 1, fmtDay = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const first = h[0].score, last = h[lastI].score, delta = last - first;
  return html(`<section class="board-card"><div class="pane-head"><b>Sprint scores</b><span class="num">best <b>${save.sprint.best}</b></span></div>
    <svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sprint scores over the last ${h.length} sprints">
      ${grid}
      <line x1="${l}" x2="${W - r}" y1="${Y(save.sprint.best)}" y2="${Y(save.sprint.best)}" class="best"/>
      <polygon points="${l},${t + ph} ${pts} ${X(lastI)},${t + ph}" class="area"/>
      <polyline points="${pts}" class="line"/>
      ${h.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x.score)}" r="${i === lastI ? 4.5 : 2.5}" class="${i === lastI ? 'pt last' : 'pt'}"><title>${fmtDay(x.day)}: ${x.score}</title></circle>`).join('')}
      <text x="${l}" y="${H - 6}" class="axis">${fmtDay(h[0].day)}</text><text x="${W - r}" y="${H - 6}" class="axis end">${fmtDay(h[lastI].day)}</text>
    </svg>
    <p class="note small num">${h.length} sprints · ${delta > 0 ? `<span class="ok">+${delta}</span> since the first one shown` : delta < 0 ? `${delta} since the first one shown` : 'level with the first one shown'} · dashed = your best</p></section>`);
}

/** The last 4 weeks as a calendar: goal met / some practice / none. */
function calendar(): HTMLElement {
  const goal = CONFIG.dailyGoalSec, now = new Date();
  const dow = (now.getDay() + 6) % 7; // Monday = 0
  const start = new Date(now); start.setDate(now.getDate() - dow - 21);
  let cells = '', met = 0;
  for (let i = 0; i < 28; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const future = d > now, s = save.practiceByDay[dayKey(d)] ?? 0;
    if (s >= goal) met++;
    cells += `<i class="${future ? 'future' : s >= goal ? 'met' : s > 0 ? 'some' : ''} ${dayKey(d) === dayKey() ? 'today' : ''}" title="${d.toLocaleDateString()}: ${fmtTime(s)}">${d.getDate()}</i>`;
  }
  const heads = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span>${x}</span>`).join('');
  return html(`<section class="board-card"><div class="pane-head"><b>Last 4 weeks</b><span class="num"><b>${met}</b> days goal met</span></div>
    <div class="cal">${heads}${cells}</div>
    <div class="legend"><span><i class="cal-k met"></i>${goal / 60}-minute goal met</span><span><i class="cal-k some"></i>practised</span><span><i class="cal-k"></i>rest</span></div></section>`);
}

/** Minutes solved per day for the last 7 days, with the daily goal as a dashed line. */
function weekChart(): HTMLElement {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const values = days.map(d => (save.practiceByDay[dayKey(d)] ?? 0) / 60);
  const goal = CONFIG.dailyGoalSec / 60;
  const max = Math.max(goal * 1.25, ...values);
  const W = 300, H = 120, top = 10, bottom = 22, left = 4, plotH = H - top - bottom;
  const bw = 22, gap = (W - left * 2 - bw * 7) / 6;
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const bars = values.map((v, i) => {
    const x = left + i * (bw + gap), h = Math.max(0, top + plotH - y(v));
    const label = days[i].toLocaleDateString(undefined, { weekday: 'short' });
    const path = h > 0 ? `<path d="M${x},${top + plotH} V${y(v) + Math.min(4, h)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${top + plotH} Z" class="bar-fill ${v >= goal ? 'met' : ''}"/>` : '';
    return `<g><title>${label}: ${v.toFixed(1)} min</title>${path}<text x="${x + bw / 2}" y="${H - 6}" class="axis">${label}</text></g>`;
  }).join('');
  return html(`<section class="board-card"><div class="pane-head"><b>This week</b><span class="note small">minutes solving · dashed = goal</span></div>
    <svg class="week" viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutes of practice per day for the last 7 days">
      <line x1="0" x2="${W}" y1="${top + plotH}" y2="${top + plotH}" class="baseline"/>
      <line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" class="goal"/>
      ${bars}</svg></section>`);
}

/** How well you judge what you know: accuracy when you said "sure" vs "not sure". */
function confidence(): HTMLElement {
  const cal = save.calibration;
  const sure = cal.sureN >= 5 ? cal.sureOk / cal.sureN : null, unsure = cal.unsureN >= 5 ? cal.unsureOk / cal.unsureN : null;
  let verdict = 'Some prompts first ask "Sure / Not sure". After a few, this shows how well you judge what you know.';
  if (sure !== null && sure < 0.8) verdict = 'You overrate some answers: slow down a touch when you feel sure.';
  else if (unsure !== null && unsure > 0.7) verdict = 'You know more than you think: trust your first answer.';
  else if (sure !== null) verdict = 'Good judgement: when you feel sure, you usually are.';
  const row = (label: string, v: number | null, n: number, cls: string) => v === null
    ? `<div class="meter muted"><span class="m-label">${label}</span><span class="m-track"></span><span class="m-val">–</span></div>`
    : meter(`${label} <small class="num">(${n})</small>`, v, `${Math.round(v * 100)}%`, cls);
  return html(`<section class="board-card"><div class="pane-head"><b>Confidence</b><span class="note small">right answers when you said…</span></div>
    ${row('Sure', sure, cal.sureN, 'good')}${row('Not sure', unsure, cal.unsureN, 'warn')}
    <p class="note small">${verdict}</p></section>`);
}
