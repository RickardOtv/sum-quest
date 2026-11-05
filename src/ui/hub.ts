/**
 * The thin overlay on top of the camp scene: gold / streak / daily chips,
 * the bag button, the stations' name plates, and the prompt that appears
 * when you reach a station.
 */
import { gi, type IconName } from './icons';
import { CONFIG } from '../config';
import type { Npc } from '../game/art/camp';
import { ICONS, spriteCanvas } from '../game/art/sprites';
import { currentStreak, dayKey, persist, save } from '../state/save';
import { esc, fmtTime, html, uiRoot } from './dom';
import { installHint } from './install';
import { applyUpdate, onUpdateReady, updateReady } from '../pwa';

export interface HubPrompt { id: string; label: string; glyph: IconName; npc?: Npc; }
/** A station's name plate; x / y in game px (the same as CSS px over the canvas). */
export interface HubPlate { id: string; x: number; y: number; label: string; }
interface Handlers { bag: () => void; settings: () => void; use: () => void; }

let hud: HTMLElement | null = null;
let handlers: Handlers | null = null;
const lineIndex: Record<string, number> = {};

export function showHubHud(h: Handlers, plates: HubPlate[] = []) {
  hideHubHud();
  handlers = h;
  const today = save.practiceByDay[dayKey()] ?? 0;
  hud = html(`<div class="hub-hud">
    <header class="camp-top">
      <button class="bag-btn" title="Bag (I)" aria-label="Bag">${gi('swap-bag')}<span>Bag</span>${save.chests.length ? `<i class="badge">${save.chests.length}</i>` : ''}</button>
      <div class="camp-chips">
        <span class="chip num" title="Gold and scrap"><span class="coin"></span>${save.gold}<span class="scrap-ic">${gi('metal-bar')}</span>${save.scrap}</span>
        <span class="chip num" title="Days in a row you hit the daily goal">Streak ${currentStreak()}</span>
        <span class="chip num" title="Time spent solving today (daily goal: a chest)">${gi('hourglass')}Today ${fmtTime(Math.min(today, CONFIG.dailyGoalSec))} / ${fmtTime(CONFIG.dailyGoalSec)}</span>
      </div>
      <button class="settings-btn" title="Settings" aria-label="Settings">${gi('cog')}</button>
    </header>
    ${plates.map(p => `<span class="hub-plate" data-id="${p.id}" style="left:${Math.round(p.x)}px;top:${Math.round(p.y)}px">${esc(p.label)}</span>`).join('')}
    <div class="hub-prompt" hidden></div>
    <p class="hub-hint small">Drag to walk, or tap a place to go there.<span class="keys-only"> <kbd>E</kbd> to use it.</span></p></div>`);
  hud.querySelector('.coin')!.appendChild(spriteCanvas(ICONS.gold, 2));
  hud.querySelector('.bag-btn')!.addEventListener('click', () => handlers?.bag());
  hud.querySelector('.settings-btn')!.addEventListener('click', () => handlers?.settings());
  // a newer version is live: offer it here in camp (never mid-run). Otherwise, new players first meet
  // the camp; the "add to home screen" tip comes once they've played a little.
  const tip = updateReady() ? updateCard() : save.totals.answered > 0 ? installHint() : null;
  if (tip) hud.querySelector('.camp-top')!.after(tip);
  uiRoot().appendChild(hud);
  if (save.totals.answered > 30) hud.querySelector('.hub-hint')!.remove(); // the hint is for new players
}

/** "New version ready": tapping it restarts into the update. Progress is saved, so nothing is lost. */
function updateCard(): HTMLElement {
  const el = html(`<div class="install-hint update-card"><button class="ih-main">${gi('sparkles')}<span><b>New version ready</b><span class="note small">Tap to update. Your progress is kept.</span></span></button></div>`);
  el.querySelector('.ih-main')!.addEventListener('click', () => { persist(); applyUpdate(); });
  return el;
}
// found while you're in camp: show it straight away (in a run it waits for the next camp visit)
onUpdateReady(() => {
  if (!hud || hud.querySelector('.update-card')) return;
  hud.querySelector('.install-hint')?.remove();
  hud.querySelector('.camp-top')!.after(updateCard());
});

export function hideHubHud() { hud?.remove(); hud = null; handlers = null; }

/** Show (or clear) the "use this station" prompt. Each visit gets the next line from the character. */
export function setPrompt(p: HubPrompt | null) {
  const el = hud?.querySelector<HTMLElement>('.hub-prompt');
  if (!el) return;
  hud!.querySelectorAll<HTMLElement>('.hub-plate').forEach(pl => pl.classList.toggle('near', pl.dataset.id === p?.id)); // the prompt names it already
  if (!p) { el.hidden = true; el.innerHTML = ''; return; }
  let said = '';
  if (p.npc) { const i = (lineIndex[p.npc.id] ?? -1) + 1; lineIndex[p.npc.id] = i % p.npc.lines.length; said = p.npc.lines[lineIndex[p.npc.id]]; }
  el.innerHTML = `<button class="prompt-btn"><span class="glyph">${gi(p.glyph)}</span><span class="info"><b>${esc(p.label)}</b>${p.npc ? `<span class="note small"><b>${esc(p.npc.name)}:</b> “${esc(said)}”</span>` : ''}</span><span class="use">Use <kbd>E</kbd></span></button>`;
  el.hidden = false;
  el.querySelector('.prompt-btn')!.addEventListener('click', () => handlers?.use());
}
