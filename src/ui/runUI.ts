/**
 * Everything drawn on top of the game while a run is active: the HUD,
 * crit questions (3 options), the special attack (typed answer), power
 * choices, pause and the end-of-run screen. Each prompt returns a Promise,
 * so the game scene can simply `await` the player's answer.
 */
import { gi, type IconName } from './icons';
import type { Reward } from '../game/run';
import { CONFIG } from '../config';
import { TIER_LABEL, TIER_TARGET, makeChoices, pickProblem, fmt, type Problem } from '../math/problems';
import type { AnswerKind } from '../math/mastery';
import type { Perk, PerkId, PerkLevels } from '../game/perks';
import { PERKS } from '../game/perks';
import { type Skill } from '../game/skills';
import { ICONS, spriteCanvas } from '../game/art/sprites';
import { answerText as answerOf, askTyped, esc, html, openSheet, pushKeys, releaseAllKeys, uiRoot, vibrate } from './dom';

let hud: HTMLElement | null = null;
let feedbackTimer = 0;
let lastRooms = '', lastPerks = '';
let onSpecialPress: ((index: number) => void) | null = null;
let onPausePress: (() => void) | null = null;

export function showHud(handlers: { special: (index: number) => void; pause: () => void }, skills: (Skill | null)[]) {
  hideHud();
  onSpecialPress = handlers.special; onPausePress = handlers.pause;
  hud = html(`<div class="hud">
    <div class="hud-top">
      <button class="icon-btn" id="pause" aria-label="Pause">❚❚</button>
      <div class="hud-mid">
        <div class="hp-pill" id="hp-pill"><span class="hp-ic">${gi('hearts')}</span><div class="hp-track"><i></i></div><b class="num">0</b></div>
        <div class="rooms"></div>
      </div>
      <div class="gold-pill"><span class="coin"></span><b class="num" id="run-gold">0</b></div>
    </div>
    <div class="fx-layer"></div><div class="door-layer"></div><div class="boss-name" hidden></div>
    <div class="perk-strip" id="perk-strip"></div>
    <div class="feedback" id="feedback"></div>
    <div class="skills-dock">${skills.map((sk, i) => sk ? `<button class="special" data-i="${i}" aria-label="${esc(sk.name)}" title="${esc(sk.short)}"><span class="ring"></span><b>${gi(sk.glyph)}</b><span class="nm">${esc(sk.name)}</span><small>${i === 0 ? 'Space' : 'E'}</small></button>` : '').join('')}</div>
  </div>`);
  hud.querySelector('.coin')!.appendChild(spriteCanvas(ICONS.gold, 2));
  hud.querySelector('#pause')!.addEventListener('click', () => onPausePress?.());
  hud.querySelectorAll<HTMLButtonElement>('.special').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); onSpecialPress?.(+b.dataset.i!); }));
  uiRoot().appendChild(hud);
  pushKeys(e => {
    if (e.key === ' ') { onSpecialPress?.(0); return true; }
    if (e.key === 'e' || e.key === 'E') { onSpecialPress?.(1); return true; }
    if (e.key === 'Escape' || e.key === 'p') { onPausePress?.(); return true; }
    return false;
  });
}

export function hideHud() {
  hud?.remove(); hud = null; lastRooms = ''; lastPerks = '';
  releaseAllKeys(); // any open prompt's handler goes too; its promise simply never resolves
  document.querySelectorAll('.overlay').forEach(o => o.remove());
}

/** `room` and `totalRooms` count inside the current zone (the dots show this zone's 10 rooms). */
export function updateHud(s: { hp: number; maxHp: number; gold: number; room: number; totalRooms: number; zone: string; charges: number[]; perks: PerkLevels; skills: (Skill | null)[] }) {
  if (!hud) return;
  hud.querySelector('#run-gold')!.textContent = String(s.gold);
  // health, top left: a small heart, a bar and the number (red and pulsing when low)
  const hp = Math.max(0, Math.ceil(s.hp)), f = Math.max(0, s.hp / s.maxHp), pill = hud.querySelector<HTMLElement>('#hp-pill')!;
  pill.querySelector<HTMLElement>('i')!.style.width = `${Math.round(f * 100)}%`;
  const num = pill.querySelector('b')!; if (num.textContent !== String(hp)) num.textContent = String(hp);
  pill.classList.toggle('low', f <= 0.25); pill.classList.toggle('mid', f > 0.25 && f <= 0.5);
  const rooms = Array.from({ length: s.totalRooms }, (_, i) => {
    const kind = i === s.totalRooms - 1 ? 'boss' : i === CONFIG.run.miniBossRoom ? 'mini' : '';
    return `<i class="${i < s.room ? 'done' : i === s.room ? 'now' : ''} ${kind}">${kind === 'boss' ? gi('daemon-skull') : kind === 'mini' ? gi('crowned-skull') : ''}</i>`;
  }).join(''); // the dots alone show the room; the zone's name is in the pause menu
  if (rooms !== lastRooms) { lastRooms = rooms; hud.querySelector('.rooms')!.innerHTML = rooms; }
  hud.querySelectorAll<HTMLElement>('.special').forEach(btn => {
    const i = +btn.dataset.i!, charge = s.charges[i] ?? 0;
    btn.style.setProperty('--charge', String(Math.min(100, charge)));
    btn.classList.toggle('ready', charge >= 100);
  });
  const perks = PERKS.filter(p => p.id !== 'heal' && s.perks[p.id])
    .map(p => `<span title="${esc(p.name)}">${gi(p.glyph)}${(s.perks[p.id] ?? 0) > 1 ? `<sub>${s.perks[p.id]}</sub>` : ''}</span>`).join('');
  if (perks !== lastPerks) { lastPerks = perks; hud.querySelector('#perk-strip')!.innerHTML = perks; }
}

/* ---------------- text and labels in the world ----------------
 * Drawn as HTML over the canvas (same coordinates), so numbers and labels are sharp on high-DPI phones
 * instead of being an upscaled 1× canvas. */

/** A number or word that rises and fades, e.g. damage. */
export function floatText(x: number, y: number, text: string, color: string, size: number) {
  const layer = hud?.querySelector('.fx-layer'); if (!layer) return;
  const el = document.createElement('span');
  el.className = 'ftxt'; el.textContent = text;
  el.style.cssText = `left:${x}px;top:${y}px;color:${color};font-size:${size}px`;
  layer.appendChild(el); setTimeout(() => el.remove(), 800);
}

/** Room title in the middle of the screen for a moment. */
export function banner(title: string, sub = '', tone: 'room' | 'mini' | 'boss' | 'land' = 'room') {
  const layer = hud?.querySelector('.fx-layer'); if (!layer) return;
  const icon = tone === 'boss' ? gi('daemon-skull') : tone === 'mini' ? gi('crowned-skull') : '';
  const el = html(`<div class="room-banner ${tone}">${tone === 'land' ? '<small>a new land</small>' : icon}<b>${esc(title)}</b>${sub ? `<span>${sub}</span>` : ''}</div>`);
  layer.appendChild(el); setTimeout(() => el.remove(), tone === 'land' ? 2800 : 1900);
}

const REWARD_ICON: Record<Reward, IconName> = { gold: 'two-coins', power: 'upgrade', heal: 'heart-plus', chest: 'chest', training: 'open-book', miniboss: 'crowned-skull', boss: 'daemon-skull', onward: 'open-gate' };
const REWARD_LABEL: Record<Reward, string> = { gold: 'Gold', power: 'Power', heal: 'Heal', chest: 'Chest', training: 'Lesson', miniboss: 'Mini boss', boss: 'Boss', onward: 'Onward' };
/** `name` replaces the generic label (the boss's name, or the next zone for the path onward). */
export interface DoorTag { x: number; y: number; reward: Reward; difficulty: number; name?: string; sub?: string; }

/** The reward badge in each doorway and its name + danger underneath. */
export function showDoorTags(doors: DoorTag[]) {
  const layer = hud?.querySelector('.door-layer'); if (!layer) return;
  layer.innerHTML = '';
  for (const d of doors) {
    const big = d.reward === 'boss' || d.reward === 'miniboss' || d.reward === 'onward';
    const skulls = big ? '' : `<span class="skulls" title="Danger ${d.difficulty} of 3">${Array.from({ length: 3 }, (_, i) => `<i class="${i < d.difficulty ? 'on' : ''}">${gi('death-skull')}</i>`).join('')}</span>`;
    // the door stays visible: its reward (icon + name) and danger sit on a small plate just below it
    const el = html(`<div class="door-tag r-${d.reward}" style="left:${d.x}px;top:${d.y + (big ? 6 : 4)}px">
      <span class="door-name">${gi(REWARD_ICON[d.reward])}${esc(d.name ?? REWARD_LABEL[d.reward])}</span>${skulls}
      ${d.sub ? `<span class="door-sub">${esc(d.sub)}</span>` : ''}</div>`);
    layer.appendChild(el);
  }
}
export function clearDoorTags() { const l = hud?.querySelector('.door-layer'); if (l) l.innerHTML = ''; }

/** Name over the boss health bar (null hides it). */
export function bossName(name: string | null, y = 0) {
  const el = hud?.querySelector<HTMLElement>('.boss-name'); if (!el) return;
  el.hidden = !name; if (name) { el.textContent = name; el.style.top = `${y}px`; }
}

/** After the mini boss: heal, or an iron chest opened on the spot. */
export function pickBoon(healAmount: number, foe: string): Promise<'heal' | 'chest'> {
  const sheet = openSheet(`<div class="label center">${esc(foe)} is down</div><h2>Choose your reward</h2>
    <div class="boons">
      <button data-b="heal"><span class="glyph ok">${gi('heart-plus')}</span><b>Heal</b><span class="num">+${healAmount} HP</span><kbd>1</kbd></button>
      <button data-b="chest"><span class="glyph gold-text">${gi('chest')}</span><b>Iron chest</b><span>open it now</span><kbd>2</kbd></button>
    </div>`);
  return new Promise(resolve => {
    const done = (b: 'heal' | 'chest') => { release(); sheet.remove(); resolve(b); };
    sheet.querySelectorAll<HTMLButtonElement>('[data-b]').forEach(b => b.addEventListener('click', () => done(b.dataset.b as 'heal' | 'chest')));
    const release = pushKeys(e => { if (e.key === '1') { done('heal'); return true; } if (e.key === '2') { done('chest'); return true; } return false; });
  });
}

/** Short message under the HUD, e.g. the quick way to solve a missed problem. `seconds = 0` keeps it until cleared. */
export function feedback(markup: string, seconds = 3.2, position: 'top' | 'low' = 'top') {
  const f = hud?.querySelector<HTMLElement>('#feedback');
  if (!f) return;
  f.innerHTML = markup; f.classList.add('show'); f.classList.toggle('low', position === 'low');
  clearTimeout(feedbackTimer);
  if (seconds > 0) feedbackTimer = window.setTimeout(() => f.classList.remove('show'), seconds * 1000);
}
export function clearFeedback() { clearTimeout(feedbackTimer); hud?.querySelector('#feedback')?.classList.remove('show'); }

const answerText = (p: Problem) => esc(answerOf(p));

/* ---------------- crit: pick 1 of 3 before the slash lands ---------------- */
export interface ChoiceResult { kind: AnswerKind; seconds: number; timedOut: boolean; }

export function askChoice(p: Problem, windowSec: number, isSuper = false): Promise<ChoiceResult> {
  const options = makeChoices(p);
  const sheet = openSheet(`
    <div class="crit-head"><span class="label ${isSuper ? 'super' : 'gold'}">${isSuper ? 'Super crit!' : 'Critical hit!'}</span><span class="label">${p.tier > 1 ? `<span class="t${p.tier}c">${TIER_LABEL[p.tier]} · ×${CONFIG.critByTier.damageMult[p.tier]} damage</span>` : isSuper ? 'time slows · nothing can touch you' : 'time is frozen · pick an answer'}</span></div>
    <div class="q">${esc(p.text)}${p.hint ? ` <small>${esc(p.hint)}</small>` : ''}</div>
    <div class="timer"><i style="animation-duration:${windowSec}s"></i></div>
    <div class="choices">${options.map((o, i) => `<button data-i="${i}"><kbd>${i + 1}</kbd>${esc((p.prefix ?? '') + fmt(o) + (p.suffix ?? ''))}</button>`).join('')}</div>`,
    { bottom: true, dim: false });
  sheet.classList.add('crit'); if (isSuper) sheet.classList.add('super');
  const bar = sheet.querySelector<HTMLElement>('.timer i')!;

  return new Promise(resolve => {
    let done = false;
    // The countdown only runs while the page is visible, so locking the phone mid-crit isn't an automatic miss.
    let remaining = windowSec * 1000, startedAt = performance.now(), timeout = 0, thinking = 0;
    const start = () => { startedAt = performance.now(); bar.style.animationPlayState = 'running'; timeout = window.setTimeout(() => finish(null), remaining); };
    const stop = () => { clearTimeout(timeout); const used = performance.now() - startedAt; remaining -= used; thinking += used; bar.style.animationPlayState = 'paused'; };
    const onVisibility = () => { if (done) return; if (document.hidden) stop(); else start(); };
    document.addEventListener('visibilitychange', onVisibility);
    const finish = (chosen: number | null) => {
      if (done) return; done = true;
      if (!document.hidden) stop();
      document.removeEventListener('visibilitychange', onVisibility);
      release();
      const seconds = thinking / 1000;
      const correct = chosen !== null && Math.abs(options[chosen] - p.answer) < 1e-6;
      const buttons = sheet.querySelectorAll<HTMLButtonElement>('.choices button');
      buttons.forEach((b, i) => { if (Math.abs(options[i] - p.answer) < 1e-6) b.classList.add('right'); else if (i === chosen) b.classList.add('wrong'); });
      vibrate(correct ? 20 : 70);
      setTimeout(() => { sheet.remove(); resolve({ kind: correct ? 'exact' : 'miss', seconds, timedOut: chosen === null }); }, correct ? 180 : 450);
    };
    sheet.querySelectorAll<HTMLButtonElement>('.choices button').forEach(b =>
      b.addEventListener('pointerdown', e => { e.preventDefault(); finish(+b.dataset.i!); }));
    const release = pushKeys(e => { const i = ['1', '2', '3'].indexOf(e.key); if (i < 0) return false; finish(i); return true; });
    start();
  });
}

/* ---------------- special skill: type the answer ---------------- */
export interface SpecialResult { problem: Problem; kind: AnswerKind; credit: number; seconds: number; }

/** `gearCalm` = extra time for speed bonuses from gear. Resolves null if the player backs out. */
export async function askSpecial(skill: Skill, gearCalm: number, perks: PerkLevels, recent: string[]): Promise<SpecialResult | null> {
  const p = pickProblem(skill.tier, recent, undefined, skill.category);
  const target = TIER_TARGET[skill.tier] * CONFIG.speed.targetMult * (1 + gearCalm + 0.35 * (perks.calm ?? 0));
  const r = await askTyped({ problem: p, heading: `${gi(skill.glyph)} ${esc(skill.name)}`, note: `${TIER_LABEL[skill.tier]} · fast = stronger`, submitLabel: 'Cast!', bottom: true, dim: false, speedTarget: target, cancellable: true, tier: skill.tier });
  return r && { problem: p, kind: r.kind, credit: r.credit, seconds: r.seconds };
}

/** Short verdict after a special or crit. The worked solution is saved for the end-of-run screen. */
export function explainResult(p: Problem, kind: AnswerKind, seconds: number, extra = '') {
  if (kind === 'exact') feedback(`<b class="ok">✓ ${seconds.toFixed(1)}s</b>${extra}`, 2);
  else if (kind === 'close') feedback(`<b class="warn">≈ Close · it's ${answerText(p)}</b>${extra}`, 2.5);
  else feedback(`<b class="bad">✗ It's ${answerText(p)}</b>`, 2.5);
}

export interface Missed { text: string; answer: string; explain: string; }
export const missedEntry = (p: Problem): Missed => ({ text: p.text + (p.hint ? ` (${p.hint})` : ''), answer: answerOf(p), explain: p.explain });

/* ---------------- power choice ---------------- */
export function pickPerk(options: Perk[], have: PerkLevels): Promise<PerkId> {
  const sheet = openSheet(`<div class="label center">Room cleared</div><h2>Choose a power</h2>
    <div class="perks">${options.map((p, i) => `<button data-p="${p.id}"><span class="glyph">${gi(p.glyph)}</span>
      <span><b>${esc(p.name)}${have[p.id] ? ` <small>Lv ${(have[p.id] ?? 0) + 1}</small>` : ''}</b><span>${esc(p.text)}</span></span><kbd>${i + 1}</kbd></button>`).join('')}</div>`);
  return new Promise(resolve => {
    const done = (id: PerkId) => { release(); sheet.remove(); resolve(id); };
    sheet.querySelectorAll<HTMLButtonElement>('[data-p]').forEach(b => b.addEventListener('click', () => done(b.dataset.p as PerkId)));
    const release = pushKeys(e => { const i = ['1', '2', '3'].indexOf(e.key); if (i < 0 || !options[i]) return false; done(options[i].id); return true; });
  });
}

/* ---------------- pause + end ---------------- */
export function pauseMenu(gold: number, where = ''): Promise<'resume' | 'flee'> {
  const sheet = openSheet(`${where ? `<div class="label center">${esc(where)}</div>` : ''}<h2>Paused</h2><p class="note center">If you flee, the run ends but you keep the ${gold} gold you found.</p>
    <button class="btn primary" id="resume">Resume</button><button class="btn" id="flee">Flee to camp</button>`);
  return new Promise(resolve => {
    const done = (r: 'resume' | 'flee') => { release(); sheet.remove(); resolve(r); };
    sheet.querySelector('#resume')!.addEventListener('click', () => done('resume'));
    sheet.querySelector('#flee')!.addEventListener('click', () => done('flee'));
    const release = pushKeys(e => { if (e.key === 'Escape' || e.key === 'p' || e.key === 'Enter') { done('resume'); return true; } return false; });
  });
}

export interface RunSummary {
  outcome: 'won' | 'died' | 'fled';
  /** room = number inside `zone` (0-based); boss = the final boss's name; bosses = bosses beaten this run */
  room: number; zone: string; boss: string; bosses: number; gold: number; bonus: number;
  answered: number; exact: number; critsHit: number; critsMissed: number; bestHit: number;
  weakest?: string; tip?: string; canUpgrade: boolean; chests: number; missed: Missed[];
}

export function runEnd(s: RunSummary): Promise<'again' | 'camp' | 'forge' | 'bag'> {
  const title = s.outcome === 'won' ? `${esc(s.boss)} falls!` : s.outcome === 'fled' ? 'Back to camp' : `Fallen in ${esc(s.zone)}, room ${s.room + 1}`;
  const pct = s.answered ? Math.round((s.exact / s.answered) * 100) : 0;
  const sheet = openSheet(`<div class="label center">${s.outcome === 'won' ? 'The journey is complete' : s.bosses ? `Run over · ${s.bosses} boss${s.bosses > 1 ? 'es' : ''} beaten` : 'Run over'}</div><h2>${title}</h2>
    <div class="results">
      <div><span class="label">Gold</span><b class="num">+${s.gold}</b></div>
      <div><span class="label">Correct</span><b class="num">${pct}%</b></div>
      <div><span class="label">Crits</span><b class="num">${s.critsHit}/${s.critsHit + s.critsMissed}</b></div>
    </div>
    ${s.bonus ? `<p class="note center">Includes a clear bonus of ${s.bonus} gold.</p>` : ''}
    ${s.chests ? `<p class="center"><b class="gold-text">${s.chests} chest${s.chests > 1 ? 's' : ''} opened</b> this run: your loot is in the Bag.</p>` : ''}
    ${s.missed.length ? `<details class="missed" open><summary class="label">What you missed (${s.missed.length})</summary>
      ${s.missed.slice(0, 6).map(m => `<div class="miss"><b class="num">${esc(m.text)} = ${esc(m.answer)}</b><span>${esc(m.explain)}</span></div>`).join('')}
      ${s.missed.length > 6 ? `<p class="note small">…and ${s.missed.length - 6} more. They'll come back in later runs.</p>` : ''}</details>` : ''}
    ${s.weakest ? `<p class="note center">This run you struggled most with <b>${esc(s.weakest)}</b>.${s.tip ? ` Try the training lesson “${esc(s.tip)}”.` : ''}</p>` : ''}
    ${s.canUpgrade ? `<p class="note center">You can afford an upgrade at the Forge.</p>` : ''}
    <div class="row2"><button class="btn" id="forge">${s.chests ? 'Bag' : 'Forge'}</button><button class="btn primary" id="again">Run again</button></div>
    <button class="btn ghost" id="camp">Camp</button>`);
  return new Promise(resolve => {
    const done = (r: 'again' | 'camp' | 'forge' | 'bag') => { release(); sheet.remove(); resolve(r); };
    (['again', 'camp'] as const).forEach(id => sheet.querySelector('#' + id)!.addEventListener('click', () => done(id)));
    sheet.querySelector('#forge')!.addEventListener('click', () => done(s.chests ? 'bag' : 'forge'));
    const release = pushKeys(e => { if (e.key === 'Enter') { done('again'); return true; } return false; });
  });
}
