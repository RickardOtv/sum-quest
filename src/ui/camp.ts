/**
 * Camp menus, opened from the walkable camp (HubScene) as full-screen
 * panels: Bag (gear, chests), Forge, Training (lessons + Sprint), the
 * notice board (Progress), the meditation stone (skills, tree, loadouts)
 * and the "head out" sheet that starts a run.
 */
import { couldInstallOnPhone, isIos } from '../pwa';
import { SLOT_ICON, gi, giEl } from './icons';
import { CONFIG, forgeChance } from '../config';
import { TIER_LABEL, pickProblem } from '../math/problems';
import { effectiveBox, getSkill } from '../math/mastery';
import { planFocus, recommendedTier } from '../math/adaptive';
import { TRICKS } from '../math/tricks';
import { SKILLS, SKILL_SLOTS, TREE, isSkillId, maxLevelOf, passiveById, skillAt, type NodeId, type SkillEffect } from '../game/skills';
import { branchOf, buy, canBuy, checkStreakMilestones, earnPoint, isUnlocked, levelOf, refundablePoints, respec, respecCost, respecUnlocked } from '../state/points';
import { logAnswer } from '../state/answers';
import { currentStreak, dayKey, persist, save } from '../state/save';
import { applyLoadout, blockedSlot, currentStats, equippedItem, equippedItems, heroCanvas, isEquipped, itemIcon, loadoutMatchesCurrent, salvage, saveLoadout, slotIcon } from '../state/gear';
import { CHESTS, RARITIES, SETS, SLOTS, SLOT_LABEL, baseById, forgeCost, heroPower, heroStats, maxLevel, salvageValue, setCounts, type Item } from '../game/items';
import { ROOTBACK, spriteCanvas, ICONS } from '../game/art/sprites';
import { drawChest } from '../game/art/hero';
import { NPCS, drawAnvil, drawShrine, drawWorkshop, drawYard, npcCanvas } from '../game/art/camp';
import { ZONE_ROOMS, localRoom, zoneOfRoom } from '../game/run';
import { ZONES, ZONE_LIST } from '../game/zones';
import { answerText, askTyped, confidenceDue, esc, fmtTime, html, openSheet, pushKeys, uiRoot, vibrate } from './dom';
import { runLesson } from './training';
import { runSprint } from './sprint';
import { renderProgress } from './progress';
import { itemTile, openChestFlow, openItem, statLines } from './loot';

export type CampTab = 'bag' | 'forge' | 'training' | 'progress' | 'skills';
export interface CampActions { startRun: () => void; back: () => void; }

let actions: CampActions;
let releaseKeys: (() => void) | null = null;
let bagFilter = 'all'; // remembered while the panel is open
const TAB_TITLE: Record<CampTab, [string, string]> = {
  bag: ['Bag', 'gear, chests and what you wear'], forge: ['Forge', "Brannoc's smithy"], training: ['Training yard', "Ysolde's yard"],
  progress: ['Notice board', 'your progress'], skills: ['Meditation', "Old Ferrin's clearing"],
};

/** Open one panel over the (paused) camp. */
export function showCamp(tab: CampTab, a: CampActions) {
  actions = a;
  releaseKeys?.(); releaseKeys = null;
  uiRoot().innerHTML = '';
  const [title, sub] = TAB_TITLE[tab];
  const camp = html(`<div class="camp">
    <header class="panel-top"><div><h2>${title}</h2><span class="note small">${sub}</span></div>
      <span class="chip num" title="Gold and scrap"><span class="coin"></span>${save.gold}<span class="scrap-ic">${gi('metal-bar')}</span>${save.scrap}</span>
      <button class="close-btn" id="back" title="Back to camp (Esc)">✕</button></header>
    <main class="camp-body" id="camp-body"></main></div>`);
  camp.querySelector('.coin')!.appendChild(spriteCanvas(ICONS.gold, 2));
  camp.querySelector('#back')!.addEventListener('click', backToCamp);
  uiRoot().appendChild(camp);
  const body = camp.querySelector<HTMLElement>('#camp-body')!;
  body.classList.toggle('flush', tab === 'forge' || tab === 'training' || tab === 'skills'); // scenes run edge to edge
  ({ bag: bagTab, forge: forgeTab, training: trainingTab, progress: (b: HTMLElement) => renderProgress(b, t => showCamp(t, actions)), skills: skillsTab })[tab](body);
  releaseKeys = pushKeys(e => { if (e.key === 'Escape') { backToCamp(); return true; } return false; });
}

const refresh = (tab: CampTab) => () => showCamp(tab, actions);
function clearCamp() { releaseKeys?.(); releaseKeys = null; uiRoot().innerHTML = ''; }
function backToCamp() { clearCamp(); actions.back(); }

/* ---------------- head out: the path north ---------------- */
export function showHeadOut(a: CampActions) {
  actions = a;
  const st = currentStats(), focus = planFocus();
  const sheet = openSheet(`<section class="zone">
      <div class="zone-art"></div>
      <div class="zone-info">
        <span class="label">The journey</span><h1>Thornwood</h1>
        <p class="note">${ZONE_ROOMS - 1} rooms of forest, then Old Rootback. Beat him and the only path leads on, out of the forest${save.bestRoom > ZONE_ROOMS ? ' into <b>Emberfall</b>, the burning village' : '… to somewhere smoky'}.</p>
        ${ZONE_LIST.map((id, z) => {
          const zone = ZONES[id], seen = save.bestRoom > z * ZONE_ROOMS || z === 0;
          return `<div class="journey${seen ? '' : ' unseen'}"><span>${seen ? esc(zone.name) : '???'}</span><div class="dots">${Array.from({ length: ZONE_ROOMS }, (_, i) => {
            const n = z * ZONE_ROOMS + i;
            return `<i class="${n < save.bestRoom ? 'done' : ''} ${i === ZONE_ROOMS - 1 ? 'boss' : ''}"></i>`;
          }).join('')}</div></div>`;
        }).join('')}
        <p class="note small">${save.bestRoom ? `Furthest: ${esc(ZONES[zoneOfRoom(save.bestRoom - 1)].name)}, room ${localRoom(save.bestRoom - 1) + 1}` : 'Not explored yet'}${save.clears ? ` · ${save.clears} boss${save.clears > 1 ? 'es' : ''} beaten` : ''}</p>
      </div></section>
    <p class="note small center num"><b>${st.maxHp}</b> HP · <b>${st.damage.toFixed(1)}</b> damage · ${Math.round(st.critChance * 100)}% crit · ${st.critWindow.toFixed(1)}s to answer</p>
    <p class="note small center">${focus.length ? `Focus: <b>${focus.map(f => esc(f.g.label)).join('</b>, <b>')}</b> · ` : ''}crit difficulty <b class="t${recommendedTier()}c">${TIER_LABEL[recommendedTier()]}</b></p>
    <button class="btn primary big" id="go">Enter Thornwood</button><button class="btn ghost" id="stay">Stay in camp</button>`);
  sheet.querySelector('.zone-art')!.appendChild(spriteCanvas(ROOTBACK, 6));
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#go')!.addEventListener('click', () => { close(); actions.startRun(); });
  sheet.querySelector('#stay')!.addEventListener('click', () => { close(); actions.back(); });
  const release = pushKeys(e => { if (e.key === 'Enter') { close(); actions.startRun(); return true; } if (e.key === 'Escape') { close(); actions.back(); return true; } return false; });
}

/** Things to check whenever the camp shows (streak rewards, first-launch intro). */
export function onCampShown() {
  checkStreakMilestones(currentStreak());
  if (!save.seenIntro) showIntro();
}

/* ---------------- bag ---------------- */
const LEFT_SLOTS = ['weapon', 'helmet', 'armor', 'gloves'] as const, RIGHT_SLOTS = ['pants', 'boots', 'free'] as const;
let bagSearch = '';

interface StageOpts {
  selected?: (typeof SLOTS)[number] | null;              // slot with the gold ring (forge)
  onSlot: (slot: (typeof SLOTS)[number], it: Item | undefined) => void;
  foot: string;                                           // markup under the hero
  stats?: boolean;                                        // show the stat strip on top
}
/** The hero big on a stage with icon-only gear slots either side. Shared by the Bag and the Forge. */
function heroStage(o: StageOpts): HTMLElement {
  const st = currentStats();
  const el = html(`<section class="hero-screen">
    ${o.stats ? `<div class="stat-strip">
      <div><i>${gi('hearts')}</i><b class="num">${st.maxHp}</b><span>health</span></div>
      <div><i>${gi('sword-wound')}</i><b class="num">${st.damage.toFixed(1)}</b><span>damage</span></div>
      <div><i>${gi('bullseye')}</i><b class="num">${Math.round(st.critChance * 100)}%</b><span>crit</span></div>
      <div><i>${gi('checked-shield')}</i><b class="num">${Math.round((1 - st.damageTaken) * 100)}%</b><span>armor</span></div></div>` : ''}
    <div class="stage">
      <div class="slot-col" data-side="left"></div>
      <div class="stage-hero"><div class="pedestal"></div></div>
      <div class="slot-col" data-side="right"></div>
      <div class="stage-foot">${o.foot}</div>
    </div></section>`);
  el.querySelector('.stage-hero')!.prepend(heroCanvas(6));
  const blocked = blockedSlot();
  const slotButton = (slot: (typeof SLOTS)[number]) => {
    const it = equippedItem(slot);
    const b = html(`<button class="slot ${it ? '' : 'empty'} ${slot === o.selected ? 'on' : ''}" title="${it ? `${esc(baseById(it.baseId).name)} · Lv ${it.level}` : blocked === slot ? `${SLOT_LABEL[slot]}: blocked by your special item` : `${SLOT_LABEL[slot]}: empty`}" style="--rc:${it ? RARITIES[it.rarity].color : 'var(--line)'}">
      <span class="icon"></span>${it ? `<span class="lvb num">${it.level}</span>` : blocked === slot ? '<span class="lock">🔒</span>' : ''}</button>`);
    b.querySelector('.icon')!.appendChild(it ? itemIcon(it, 1.6) : slotIcon(slot, 1.6));
    b.addEventListener('click', () => o.onSlot(slot, it));
    return b;
  };
  LEFT_SLOTS.forEach(sl => el.querySelector('[data-side=left]')!.appendChild(slotButton(sl)));
  RIGHT_SLOTS.forEach(sl => el.querySelector('[data-side=right]')!.appendChild(slotButton(sl)));
  return el;
}

/**
 * The Bag: the hero stage (stats, slots, power), then the bag as an icon
 * tab bar + a grid of square item tiles with a search box.
 */
/** The hero's title under the stage: the set worn most (2+ pieces), otherwise "Wanderer". */
function setTitle(): string {
  const counts = Object.entries(setCounts(equippedItems())).sort((a, b) => b[1] - a[1])[0];
  return counts && counts[1] >= 2 ? `${SETS[counts[0]].name} · ${counts[1]} pc` : 'Wanderer';
}

function bagTab(body: HTMLElement) {
  const st = currentStats();
  body.appendChild(heroStage({
    stats: true,
    foot: `<span class="label">${esc(setTitle())}</span><b class="power num">${heroPower(st).toLocaleString()}</b><span class="label">hero power</span>`,
    onSlot: (slot, it) => { if (it) openItem(it, refresh('bag')); else { showFilter(slot); uiRoot().querySelector('.bag-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
  }));

  // --- the bag: icon tabs, count + search, chests first, then every item you aren't wearing
  const bag = save.inventory.filter(i => !isEquipped(i)).sort((a, b) => b.rarity - a.rarity || SLOTS.indexOf(baseById(a.baseId).slot) - SLOTS.indexOf(baseById(b.baseId).slot) || b.level - a.level);
  const inv = html(`<section class="bag-card">
    <div class="tabs"><button class="tab on" data-f="all" title="Everything">${gi('knapsack')}</button>${SLOTS.map(sl => `<button class="tab" data-f="${sl}" title="${sl === 'free' ? 'Special items' : SLOT_LABEL[sl]}"></button>`).join('')}</div>
    <div class="bag-head"><span id="what">Everything</span><span class="num"><b id="shown">${bag.length}</b> / ${bag.length}</span>
      <input class="search" id="search" type="search" placeholder="Search" value="${esc(bagSearch)}" aria-label="Search the bag"></div>
    <div class="bag"></div></section>`);
  SLOTS.forEach(sl => inv.querySelector(`[data-f="${sl}"]`)!.appendChild(giEl(SLOT_ICON[sl])));
  const bagEl = inv.querySelector<HTMLElement>('.bag')!, search = inv.querySelector<HTMLInputElement>('#search')!;
  const showFilter = (f: string) => {
    bagFilter = f;
    inv.querySelectorAll<HTMLButtonElement>('.tabs .tab').forEach(c => c.classList.toggle('on', c.dataset.f === f));
    inv.querySelector('#what')!.textContent = f === 'all' ? 'Everything' : SLOT_LABEL[f as (typeof SLOTS)[number]];
    const q = bagSearch.trim().toLowerCase();
    const shown = bag.filter(it => (f === 'all' || baseById(it.baseId).slot === f) && (!q || baseById(it.baseId).name.toLowerCase().includes(q) || RARITIES[it.rarity].name.toLowerCase().includes(q)));
    inv.querySelector('#shown')!.textContent = String(shown.length);
    bagEl.innerHTML = '';
    if (f === 'all' && !q) save.chests.forEach((k, i) => {
      const b = html(`<button class="item-tile chest" title="${CHESTS[k].name}: solve a problem to open it"><span class="icon"></span><span class="dup">open</span></button>`);
      b.querySelector('.icon')!.appendChild(drawChest(k).toCanvas(3));
      b.addEventListener('click', () => openChestFlow(i, refresh('bag')));
      bagEl.appendChild(b);
    });
    shown.forEach(it => bagEl.appendChild(itemTile(it, () => openItem(it, refresh('bag')))));
    // empty slots in the grid so it always reads as a grid
    const filled = bagEl.children.length, cols = 4, pad = Math.max(cols * 2 - filled, (cols - (filled % cols)) % cols);
    for (let i = 0; i < pad; i++) bagEl.appendChild(html('<span class="item-tile empty"></span>'));
    if (!shown.length && !(f === 'all' && save.chests.length)) bagEl.appendChild(html(`<p class="note small">${bag.length ? (q ? 'Nothing matches that search.' : 'Nothing for this slot.') : 'Nothing yet. Chests come from chest doors, the boss, a Sprint best and your daily 3 minutes.'}</p>`));
  };
  inv.querySelectorAll<HTMLButtonElement>('.tabs .tab').forEach(c => c.addEventListener('click', () => showFilter(c.dataset.f!)));
  search.addEventListener('input', () => { bagSearch = search.value; showFilter(bagFilter); });
  showFilter(bagFilter);
  body.appendChild(inv);

  // one tap to clear out spare commons (items you already own a copy of)
  const spares = bag.filter(it => it.rarity === 0 && save.inventory.some(o => o.uid !== it.uid && o.baseId === it.baseId && (isEquipped(o) || o.rarity > it.rarity || o.uid < it.uid)));
  if (spares.length) {
    const scrap = spares.reduce((a, it) => a + salvageValue(it), 0);
    const btn = html(`<button class="btn">Salvage ${spares.length} spare common${spares.length > 1 ? 's' : ''} for ${scrap} scrap</button>`);
    btn.addEventListener('click', () => { spares.forEach(salvage); refresh('bag')(); });
    body.appendChild(btn);
  }
}

/* ---------------- skills: the meditation stone ---------------- */
let monkLine = 0;

/** The clearing: your two skills float over the altar; below, every skill as a card and the three loadout seals. */
function skillsTab(body: HTMLElement) {
  const line = NPCS.monk.lines[monkLine++ % NPCS.monk.lines.length];
  const scene = html(`<section class="scene shrine"><div class="speech">${esc(line)}</div><div class="npc"></div><div class="skill-float"></div></section>`);
  scene.prepend(Object.assign(drawShrine().toCanvas(1), { className: 'wall-art' }));
  scene.querySelector('.npc')!.appendChild(npcCanvas(NPCS.monk, 4));
  const float = scene.querySelector('.skill-float')!;
  for (let i = 0; i < SKILL_SLOTS; i++) {
    const id = save.equippedSkills[i] ?? null, sk = id && isUnlocked(id) ? skillAt(id, levelOf(id)) : undefined;
    const b = html(`<button class="skill-orb ${sk ? '' : 'empty'}" title="${sk ? `${esc(sk.name)} Lv ${sk.level}` : 'Empty slot'}"><span class="glyph">${sk ? gi(sk.glyph) : '+'}</span><kbd>${i === 0 ? 'Space' : 'E'}</kbd>${sk ? `<span class="lvb num">${sk.level}</span>` : ''}</button>`);
    b.addEventListener('click', () => pickSkill(i));
    float.appendChild(b);
  }
  body.appendChild(scene);

  const bar = html(`<div class="shop-bar"><div class="points"><span class="gem">◆</span><b class="num">${save.skillPoints}</b><span class="label">point${save.skillPoints === 1 ? '' : 's'}</span></div>
    <button class="btn primary big" id="tree">Skill tree</button></div>`);
  bar.querySelector('#tree')!.addEventListener('click', openTree);
  body.appendChild(bar);

  // every skill as a card: tap to equip it, level it, or read it
  const cards = html(`<section class="deck"><div class="deck-head"><span class="label">Skills</span><span class="note small">tap a card</span></div><div class="skill-cards"></div></section>`);
  const grid = cards.querySelector('.skill-cards')!;
  SKILLS.forEach(base => {
    const lv = levelOf(base.id), sk = skillAt(base.id, Math.max(1, lv)), slot = save.equippedSkills.indexOf(base.id);
    const max = maxLevelOf(base.id);
    const c = html(`<button class="skill-card ${lv ? '' : 'locked'} ${slot >= 0 ? 'on' : ''}" title="${esc(sk.name)}">
      <span class="orb"><span class="glyph">${gi(lv ? sk.glyph : 'padlock')}</span></span><b>${esc(sk.name)}</b>
      <span class="pips">${Array.from({ length: max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span>
      ${slot >= 0 ? `<span class="where">${slot === 0 ? 'Space' : 'E'}</span>` : ''}</button>`);
    c.addEventListener('click', () => skillCardMenu(base.id));
    grid.appendChild(c);
  });
  body.appendChild(cards);

  // loadouts as three seals
  const seals = html(`<section class="deck"><div class="deck-head"><span class="label">Loadouts</span><span class="note small">skills + gear, saved together</span></div><div class="seals"></div></section>`);
  const row = seals.querySelector('.seals')!;
  save.loadouts.forEach((lo, i) => {
    const active = lo && loadoutMatchesCurrent(lo);
    const b = html(`<button class="seal ${lo ? '' : 'empty'} ${active ? 'on' : ''}"><span class="ring"><span class="glyph">${lo ? lo.skills.filter((x): x is SkillEffect => !!x).map(x => gi(skillAt(x, 1).glyph)).join('') || '+' : '+'}</span></span>
      <b>${lo ? esc(lo.name) : `Slot ${i + 1}`}</b><span class="note small">${lo ? (active ? 'equipped' : `${Object.keys(lo.gear).length} pieces`) : 'empty'}</span></button>`);
    b.addEventListener('click', () => (lo ? loadoutMenu(i) : nameLoadout(i, `Build ${i + 1}`)));
    row.appendChild(b);
  });
  body.appendChild(seals);
}

/** What you can do with one skill: equip it to a key, level it, or just read about it. */
function skillCardMenu(id: SkillEffect) {
  const lv = levelOf(id), sk = skillAt(id, Math.max(1, lv)), max = maxLevelOf(id), { ok, why } = canBuy(id);
  const slot = save.equippedSkills.indexOf(id);
  const sheet = openSheet(`<div class="orb big"><span class="glyph">${gi(sk.glyph)}</span></div><h2>${esc(sk.name)}</h2>
    <p class="note center">${esc(sk.short)}. ${esc(sk.tip)}</p>
    <p class="center small">${TIER_LABEL[sk.tier]} ${CATEGORY_WORD[sk.category]} · recharges in ${sk.recharge}s · ${lv ? `Lv ${lv} / ${max}` : `locked · ${esc(branchOf(id).name)} branch`}</p>
    <div class="row2"><button class="btn ${slot === 0 ? '' : 'primary'}" id="s0" ${lv && slot !== 0 ? '' : 'disabled'}>${slot === 0 ? 'On Space' : 'Equip · Space'}</button><button class="btn ${slot === 1 ? '' : 'primary'}" id="s1" ${lv && slot !== 1 ? '' : 'disabled'}>${slot === 1 ? 'On E' : 'Equip · E'}</button></div>
    <div class="row2"><button class="btn" id="buy" ${ok ? '' : 'disabled'}>${lv ? 'Level up' : 'Unlock'} · 1 point</button><button class="btn ghost" id="close">Close</button></div>
    ${!ok && why ? `<p class="note small center">${esc(why)}</p>` : ''}`);
  const close = () => { release(); sheet.remove(); showCamp('skills', actions); };
  const equipTo = (i: number) => { const other = save.equippedSkills.indexOf(id); if (other >= 0) save.equippedSkills[other] = null; save.equippedSkills[i] = id; persist(); vibrate(20); close(); };
  sheet.querySelector('#s0')!.addEventListener('click', () => equipTo(0));
  sheet.querySelector('#s1')!.addEventListener('click', () => equipTo(1));
  sheet.querySelector('#buy')!.addEventListener('click', () => { if (buy(id)) { vibrate(30); close(); } });
  sheet.querySelector('#close')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

function loadoutMenu(i: number) {
  const lo = save.loadouts[i]!, active = loadoutMatchesCurrent(lo);
  const sheet = openSheet(`<span class="label center">Loadout ${i + 1}</span><h2>${esc(lo.name)}</h2>
    <p class="note center">${lo.skills.filter((x): x is SkillEffect => !!x).map(x => `${gi(skillAt(x, 1).glyph)} ${skillAt(x, 1).name}`).join(' · ') || 'no skills'} · ${Object.keys(lo.gear).length} gear pieces</p>
    <div class="row2"><button class="btn primary" id="apply" ${active ? 'disabled' : ''}>${active ? 'Equipped' : 'Equip'}</button><button class="btn" id="save">Overwrite</button></div>
    <button class="btn ghost" id="close">Close</button>`);
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#apply')!.addEventListener('click', () => { const missing = applyLoadout(i); close(); showCamp('skills', actions); if (missing) toastMissing(missing); });
  sheet.querySelector('#save')!.addEventListener('click', () => { close(); nameLoadout(i, lo.name); });
  sheet.querySelector('#close')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

const CATEGORY_WORD = { addsub: 'add & subtract', muldiv: 'big × ÷', facts: 'times tables', everyday: 'everyday' } as const;

function pickSkill(slot: number) {
  const current = save.equippedSkills[slot] ?? null;
  const sheet = openSheet(`<span class="label center">Slot ${slot + 1}</span><h2>Choose a skill</h2><div class="skill-list">${SKILLS.map(base => {
    const lv = levelOf(base.id), known = lv > 0, sk = skillAt(base.id, lv), inOther = save.equippedSkills.includes(base.id) && base.id !== current;
    return `<button data-id="${base.id}" class="skill-row ${known ? '' : 'locked'} ${base.id === current ? 'on' : ''}" ${known && !inOther ? '' : 'disabled'}>
      <span class="glyph">${gi(sk.glyph)}</span><span class="info"><b>${esc(sk.name)}${known ? ` <span class="lvl">Lv ${lv}</span>` : ''}</b><span>${esc(sk.short)}</span><small>${TIER_LABEL[sk.tier]} ${CATEGORY_WORD[sk.category]} · recharges in ${sk.recharge}s · ${esc(sk.tip)}</small>
      ${!known ? `<small class="warn">Locked · unlock it in the skill tree (${esc(branchOf(base.id).name)} branch)</small>` : inOther ? '<small>In your other slot</small>' : ''}</span></button>`; }).join('')}</div>
    <div class="row2">${current ? '<button class="btn" id="clear">Empty this slot</button>' : ''}<button class="btn" id="close">Close</button></div>`);
  const close = () => { release(); sheet.remove(); showCamp('skills', actions); };
  sheet.querySelectorAll<HTMLButtonElement>('[data-id]').forEach(b => b.addEventListener('click', () => { save.equippedSkills[slot] = b.dataset.id as SkillEffect; persist(); close(); }));
  sheet.querySelector('#clear')?.addEventListener('click', () => { save.equippedSkills[slot] = null; persist(); close(); });
  sheet.querySelector('#close')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

/* ---------------- loadouts ---------------- */
function toastMissing(n: number) { const t = html(`<div class="toast">${n} item${n > 1 ? 's' : ''} from that loadout ${n > 1 ? 'were' : 'was'} sold or salvaged, skipped</div>`); uiRoot().appendChild(t); setTimeout(() => t.remove(), 2600); }

function nameLoadout(index: number, suggested: string) {
  const sheet = openSheet(`<h2>Save loadout ${index + 1}</h2><p class="note center">Saves your two skills and everything you're wearing.</p>
    <input id="lo-name" class="text-input" maxlength="18" value="${esc(suggested)}" aria-label="Loadout name">
    <div class="presets">${['Boss killer', 'Crowd control', 'Tank', 'Farming', 'Glass cannon'].map(n => `<button class="chip" data-n="${n}">${n}</button>`).join('')}</div>
    <div class="row2"><button class="btn" id="cancel">Cancel</button><button class="btn primary" id="ok">Save</button></div>`);
  const input = sheet.querySelector<HTMLInputElement>('#lo-name')!;
  sheet.querySelectorAll<HTMLButtonElement>('[data-n]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.n!; }));
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#cancel')!.addEventListener('click', close);
  sheet.querySelector('#ok')!.addEventListener('click', () => { saveLoadout(index, input.value.trim() || suggested); close(); showCamp('skills', actions); });
  // let the text field take the keyboard
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } if (e.key === 'Enter') { (sheet.querySelector('#ok') as HTMLButtonElement).click(); return true; } return false; });
  input.focus(); input.select(); // synchronous, inside the tap, so iOS opens the keyboard
}

/** The skill tree: three branches, five nodes each, unlocked top to bottom. */
function openTree() {
  const sheet = openSheet(`<div class="row-between"><h2 style="text-align:left">Skill tree</h2><span class="tag gold num">${save.skillPoints} point${save.skillPoints === 1 ? '' : 's'}</span></div>
    <p class="note small">Every node costs 1 point. Earn points by finishing a Training lesson with 3 of 4 right (once per lesson), beating the boss, and keeping your daily streak (3, 7, 14, 30 days).</p>
    <div class="tree"></div>
    ${respecUnlocked() ? `<button class="btn ghost" id="respec">Rebirth: refund all ${refundablePoints()} point${refundablePoints() === 1 ? '' : 's'} for ${respecCost()} gold</button>` : '<p class="note small center">Beat Old Rootback once to unlock Rebirth (refund your points).</p>'}
    <button class="btn" id="close">Close</button>`);
  sheet.classList.add('tree-sheet');
  sheet.querySelector('#respec')?.addEventListener('click', () => {
    const c = openSheet(`<h2>Rebirth</h2><p class="note center">Refund <b>${refundablePoints()}</b> point${refundablePoints() === 1 ? '' : 's'} for <b>${respecCost()} gold</b>? Nova and Ward stay at Lv 1. The price goes up each time.</p>
      <div class="row2"><button class="btn" id="no">Keep my tree</button><button class="btn primary" id="yes" ${save.gold >= respecCost() && refundablePoints() > 0 ? '' : 'disabled'}>Rebirth</button></div>
      ${save.gold < respecCost() ? '<p class="note small center">Not enough gold.</p>' : ''}`);
    c.querySelector('#no')!.addEventListener('click', () => c.remove());
    c.querySelector('#yes')!.addEventListener('click', () => { if (respec()) { vibrate([30, 40, 30]); c.remove(); release(); sheet.remove(); openTree(); } });
  });
  const tree = sheet.querySelector('.tree')!;
  const render = () => {
    tree.innerHTML = '';
    sheet.querySelector('.tag.gold')!.textContent = `${save.skillPoints} point${save.skillPoints === 1 ? '' : 's'}`;
    for (const br of TREE) {
      const col = html(`<div class="branch"><div class="branch-head"><b>${br.name}</b><span class="note small">${esc(br.blurb)}</span></div></div>`);
      br.nodes.forEach((id, i) => {
        const lv = levelOf(id), max = maxLevelOf(id), skill = isSkillId(id) ? skillAt(id, Math.max(1, lv)) : undefined, pas = skill ? undefined : passiveById(id);
        const { ok, why } = canBuy(id);
        const node = html(`<button class="node ${lv ? 'on' : ''} ${skill ? 'is-skill' : 'passive'} ${ok ? 'buyable' : ''}" title="${esc(why ?? '')}">
          ${i > 0 ? '<i class="link"></i>' : ''}
          <span class="glyph">${gi(skill ? skill.glyph : pas!.glyph)}</span>
          <b>${esc(skill ? skill.name : pas!.name)}</b>
          <span class="pips">${Array.from({ length: max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span></button>`);
        node.addEventListener('click', () => openNode(id, render));
        col.appendChild(node);
      });
      tree.appendChild(col);
    }
  };
  render();
  const close = () => { release(); sheet.remove(); showCamp('skills', actions); };
  sheet.querySelector('#close')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

function openNode(id: NodeId, onChange: () => void) {
  const lv = levelOf(id), max = maxLevelOf(id);
  const skill = isSkillId(id) ? skillAt(id, Math.max(1, lv)) : undefined, next = isSkillId(id) ? skillAt(id, Math.max(1, lv) + 1) : undefined, pas = skill ? undefined : passiveById(id);
  const { ok, why } = canBuy(id);
  const body = skill
    ? `<p class="note">${esc(skill.short)}. ${esc(skill.tip)}</p><p class="small">${TIER_LABEL[skill.tier]} ${CATEGORY_WORD[skill.category]} problems · recharges in ${skill.recharge}s of combat</p>
       ${lv === 0 ? '<p class="small"><b>Unlock</b> to equip it.</p>' : lv < max ? `<p class="small"><b>Next level:</b> +${Math.round((next!.power / skill.power - 1) * 100)}% effect, recharges in ${next!.recharge}s (now ${skill.recharge}s)</p>` : '<p class="small">Max level.</p>'}`
    : `<p class="note">${lv ? esc(pas!.text(lv)) : 'Locked.'}</p>${lv < max ? `<p class="small"><b>Next level:</b> ${esc(pas!.text(lv + 1))}</p>` : '<p class="small">Max level.</p>'}`;
  const sheet = openSheet(`<span class="label center">${esc(branchOf(id).name)} · ${lv ? `Lv ${lv} / ${max}` : 'locked'}</span><h2>${gi(skill ? skill.glyph : pas!.glyph)} ${esc(skill ? skill.name : pas!.name)}</h2>${body}
    <div class="row2"><button class="btn primary" id="buy" ${ok ? '' : 'disabled'}>${lv === 0 ? 'Unlock' : 'Level up'} · 1 point</button><button class="btn" id="back">Back</button></div>
    ${!ok ? `<p class="note small center">${esc(why!)}</p>` : ''}`);
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#buy')!.addEventListener('click', () => { if (buy(id)) { vibrate(30); close(); onChange(); } });
  sheet.querySelector('#back')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

/* ---------------- forge: Brannoc's workshop ---------------- */
let forgeUid: number | null = null; // the item in the hearth
let forgeSize = 1;                   // +1 / +2 / +3
let smithLine = 0;

/**
 * Walking into the workshop: the hearth on the left holds the item you're
 * forging with its stat change beside it, Brannoc hammers at his anvil on
 * the right, a title bar with one big Forge button, then everything you own.
 */
function forgeTab(body: HTMLElement) {
  const items = [...save.inventory].sort((a, b) => Number(isEquipped(b)) - Number(isEquipped(a)) || b.rarity - a.rarity || b.level - a.level);
  let it = items.find(i => i.uid === forgeUid);
  if (!it) { it = items[0]; forgeUid = it?.uid ?? null; }
  const line = NPCS.smith.lines[smithLine++ % NPCS.smith.lines.length];
  const max = it ? maxLevel(it) : 0, capped = !!it && it.level >= max;
  if (it && it.level + forgeSize > max) forgeSize = Math.max(1, max - it.level);

  const scene = html(`<section class="scene workshop">
    <div class="speech">${esc(line)}</div>
    <div class="smith"></div><div class="anvil"></div>
    <div class="hearth-slot ${it ? '' : 'empty'}" style="--rc:${it ? RARITIES[it.rarity].color : 'var(--line)'}"><span class="icon"></span>${it ? `<span class="lvb num">${it.level}</span>` : ''}</div>
    <div class="arrow">▲</div>
    <div class="stat-pill"></div></section>`);
  scene.prepend(Object.assign(drawWorkshop().toCanvas(1), { className: 'wall-art' }));
  scene.querySelector('.smith')!.appendChild(npcCanvas(NPCS.smith, 4));
  scene.querySelector('.anvil')!.appendChild(drawAnvil().toCanvas(3.5));
  const slot = scene.querySelector('.hearth-slot .icon')!, pill = scene.querySelector('.stat-pill')!;
  slot.appendChild(it ? itemIcon(it, 2.2) : html(`<span class="slot-glyph" style="font-size:34px">${gi('anvil-impact')}</span>`));

  let cost = { gold: 0, scrap: 0 };
  if (!it) pill.appendChild(html('<p class="note small">Nothing to forge yet. Open a chest or find gear in the woods.</p>'));
  else {
    const b = baseById(it.baseId), r = RARITIES[it.rarity];
    const next: Item = { ...it, level: Math.min(max, it.level + forgeSize) };
    const worn = isEquipped(it), stNow = currentStats();
    const stNext = worn ? heroStats([...SLOTS.map(equippedItem).filter((i): i is Item => !!i && i.uid !== it!.uid), next]) : null;
    cost = forgeCost(it, forgeSize);
    pill.appendChild(html(`<div class="pill-body"><div class="pill-head"><b style="color:${r.color}">${esc(b.name)}</b><span class="num small">Lv ${it.level} / ${max}${worn ? ' · worn' : ''}</span></div>
      ${capped ? `<p class="note small">Max level for ${r.name.toLowerCase()} gear.</p>` : `<ul class="stats inline">${statLines(next, it)}</ul>${stNext ? `<span class="small num">power ${heroPower(stNow)} <b class="ok">→ ${heroPower(stNext)}</b></span>` : ''}`}</div>`));
  }
  body.appendChild(scene);

  // how many levels to add in one go: each option says what it does and what it costs
  if (it && !capped) {
    const pick = html(`<section class="level-pick"><div class="lp-head"><b>Upgrade by</b><span class="note small">Bigger jumps cost more and are harder to make hold.</span></div>
      <div class="lp-row">${[1, 2, 3].map(n => {
        const c = forgeCost(it!, n), ok = it!.level + n <= max;
        return `<button data-n="${n}" class="${n === forgeSize ? 'on' : ''}" ${ok ? '' : 'disabled'}><b>+${n} level${n > 1 ? 's' : ''}</b><span class="num">Lv ${it!.level} → ${Math.min(max, it!.level + n)}</span><small class="num">${ok ? `${c.gold} gold · ${c.scrap} scrap` : 'over max level'}</small></button>`;
      }).join('')}</div></section>`);
    pick.querySelectorAll<HTMLButtonElement>('button[data-n]').forEach(b => b.addEventListener('click', () => { forgeSize = +b.dataset.n!; showCamp('forge', actions); }));
    body.appendChild(pick);
  }

  // the cost and the one big button
  const afford = !!it && !capped && save.gold >= cost.gold && save.scrap >= cost.scrap;
  const bar = html(`<div class="shop-bar"><div>${it && !capped
      ? `<span class="label">Cost for +${forgeSize}</span><span class="cost"><span class="cost-part ${save.gold < cost.gold ? 'short' : ''}"><span class="coin"></span><b class="num">${cost.gold}</b><small>gold</small></span><span class="cost-part ${save.scrap < cost.scrap ? 'short' : ''}">${gi('metal-bar')}<b class="num">${cost.scrap}</b><small>scrap</small></span></span>`
      : `<span class="label">Blacksmith</span><span class="note">${it ? 'This piece is at its max level.' : 'Pick a piece below.'}</span>`}</div>
    <button class="btn primary big" id="forge" ${afford ? '' : 'disabled'}>Forge</button></div>`);
  bar.querySelector('.coin')?.appendChild(spriteCanvas(ICONS.gold, 2));
  bar.querySelector('#forge')!.addEventListener('click', () => { if (it) forgeChoose(it, forgeSize); });
  body.appendChild(bar);

  // everything you own; tap one to put it in the hearth
  const inv = html(`<section class="bag-card"><div class="bag-head"><span>Your gear</span><span class="num"><b>${items.length}</b> items</span><span class="note small" style="justify-self:end">tap one to put it in the fire</span></div><div class="bag"></div>
    <p class="note small center">Gold comes from runs and selling; scrap from salvaging spare gear in your Bag.</p></section>`);
  const grid = inv.querySelector('.bag')!;
  items.forEach(i => {
    const t = itemTile(i, () => { forgeUid = i.uid; showCamp('forge', actions); });
    if (i.uid === forgeUid) t.classList.add('on');
    if (isEquipped(i)) t.appendChild(html('<span class="worn">worn</span>'));
    grid.appendChild(t);
  });
  const pad = Math.max(10 - items.length, (5 - (items.length % 5)) % 5); for (let i = 0; i < pad; i++) grid.appendChild(html('<span class="item-tile empty"></span>'));
  body.appendChild(inv);
}

function forgeChoose(it: Item, size: number) {
  const cost = forgeCost(it, size), name = baseById(it.baseId).name, rec = recommendedTier();
  const sheet = openSheet(`<span class="label center">${esc(name)} +${size} · ${cost.gold} gold · ${cost.scrap} scrap</span><h2>How hard a problem?</h2>
    <p class="note small center">Harder problems make the forge more likely to hold.</p>
    <div class="tiers">${[1, 2, 3, 4].map(t => `<button data-t="${t}" class="t${t} ${t === rec ? 'rec' : ''}"><kbd>${t === rec ? '↵' : t}</kbd><span class="tname">${TIER_LABEL[t]}</span><b class="num">${Math.round(forgeChance(t, size) * 100)}%</b><small>chance to hold</small>${t === rec ? '<em class="tag">your level</em>' : ''}</button>`).join('')}</div>
    <button class="btn ghost" id="cancel">Cancel</button>`);
  const close = () => { release(); sheet.remove(); };
  const go = (t: number) => { close(); forgeSolve(it, size, t); };
  sheet.querySelectorAll<HTMLButtonElement>('[data-t]').forEach(b => b.addEventListener('click', () => go(+b.dataset.t!)));
  sheet.querySelector('#cancel')!.addEventListener('click', close);
  const release = pushKeys(e => {
    const i = ['1', '2', '3', '4'].indexOf(e.key);
    if (i >= 0) { go(i + 1); return true; }
    if (e.key === 'Enter') { go(rec); return true; }
    if (e.key === 'Escape') { close(); return true; }
    return false;
  });
}

async function forgeSolve(it: Item, size: number, tier: number) {
  const cost = forgeCost(it, size);
  const p = pickProblem(tier);
  const r = await askTyped({ problem: p, heading: 'Forging', note: `exact = ${Math.round(forgeChance(tier, size) * 100)}% · close = half`, submitLabel: 'Forge!', bottom: true, tier, confidence: confidenceDue() });
  if (!r) return;
  // the gold and scrap are only spent once you've answered, so a reload mid-problem costs nothing
  save.gold -= cost.gold; save.scrap -= cost.scrap;
  logAnswer(p, r.kind, r.seconds, false, r.confident);
  const chance = r.kind === 'exact' ? forgeChance(tier, size) : r.kind === 'close' ? forgeChance(tier, size) / 2 : 0;
  const success = Math.random() < chance;
  const refund = { gold: Math.floor(cost.gold * CONFIG.forge.refundOnFail), scrap: Math.floor(cost.scrap * CONFIG.forge.refundOnFail) };
  if (success) it.level += size; else { save.gold += refund.gold; save.scrap += refund.scrap; }
  persist(); vibrate(success ? [30, 40, 30] : 80);
  const sheet = openSheet(`<h2>${success ? 'The steel holds!' : 'The metal cracked'}</h2>
    <p class="center">${r.kind === 'exact' ? '<b class="ok">Exact answer</b>' : `<b class="${r.kind === 'close' ? 'warn' : 'bad'}">${r.kind === 'close' ? 'Close' : 'Miss'}: it's ${esc(answerText(p))}</b>`}</p>
    <p class="note center">${esc(p.explain)}</p>
    <p class="center">${success ? `${esc(baseById(it.baseId).name)} is now <b class="lvl">Lv ${it.level}</b>` : `Refunded ${refund.gold} gold and ${refund.scrap} scrap`}</p>
    <button class="btn primary" id="ok">Back to the Forge</button>`);
  sheet.querySelector('#ok')!.addEventListener('click', refresh('forge'));
}

/* ---------------- training: Ysolde's yard ---------------- */
let trainerLine = 0;
const LESSON_GLYPH: Record<string, string> = { nines: '×9', bridge: '→10', round: '≈', tens: '10s', percent: '%', split: '÷', change: '¢', distribute: '⨉', chunkdiv: '÷÷', discount: '−%', squares: 'n²' };

/** The yard: two mode cards (Sprint, daily goal), then every lesson as a card with an icon and stars. */
function trainingTab(body: HTMLElement) {
  const done = save.trainingByDay[dayKey()] ?? [], today = save.practiceByDay[dayKey()] ?? 0;
  const goalMet = today >= CONFIG.dailyGoalSec, pct = Math.min(1, today / CONFIG.dailyGoalSec);
  const line = NPCS.trainer.lines[trainerLine++ % NPCS.trainer.lines.length];
  const scene = html(`<section class="scene yard"><div class="speech">${esc(line)}</div><div class="npc"></div></section>`);
  scene.prepend(Object.assign(drawYard().toCanvas(1), { className: 'wall-art' }));
  scene.querySelector('.npc')!.appendChild(npcCanvas(NPCS.trainer, 4));
  body.appendChild(scene);

  // the two modes as big cards
  const R = 26, C = 2 * Math.PI * R;
  const modes = html(`<div class="mode-cards">
    <button class="mode-card sprint"><span class="big-glyph">${gi('stopwatch')}</span><b>Sprint</b><span class="sub num">${save.sprint.best ? `best ${save.sprint.best}` : '60 seconds'}</span></button>
    <div class="mode-card daily ${goalMet ? 'met' : ''}"><svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}"/><circle class="val" cx="32" cy="32" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
      <span class="chest"></span><b>Daily</b><span class="sub num">${goalMet ? 'chest earned' : `${fmtTime(today)} / ${fmtTime(CONFIG.dailyGoalSec)}`}</span></div></div>`);
  modes.querySelector('.chest')!.appendChild(drawChest('wood').toCanvas(2));
  modes.querySelector('.sprint')!.addEventListener('click', () => { clearCamp(); runSprint(() => showCamp('training', actions)); });
  body.appendChild(modes);

  // lessons as cards: icon, name, mastery stars; a corner badge when there is a point or gold to earn
  const deck = html(`<section class="deck"><div class="deck-head"><span class="label">Lessons</span><span class="note small">${done.length} / ${TRICKS.length} today</span></div><div class="lesson-cards"></div></section>`);
  const grid = deck.querySelector('.lesson-cards')!;
  TRICKS.forEach((t, idx) => {
    const boxes = t.practice.map(k => effectiveBox(getSkill(k)));
    const stars = Math.round((boxes.reduce((a, b) => a + b, 0) / boxes.length / 5) * 3);
    const isDone = done.includes(t.id), point = !save.pointsEarned.includes(`lesson-${t.id}`);
    const card = html(`<button class="lesson-card t${(idx % 4) + 1} ${isDone ? 'done' : ''}" title="${esc(t.idea)}">
      <span class="orb"><span class="glyph">${LESSON_GLYPH[t.id] ?? '?'}</span></span><b>${esc(t.title)}</b>
      <span class="stars">${[0, 1, 2].map(k => `<i class="${k < stars ? 'on' : ''}">★</i>`).join('')}</span>
      ${point ? '<span class="corner pt">+1</span>' : isDone ? '<span class="corner ok">✓</span>' : '<span class="corner gold">◉</span>'}</button>`);
    card.addEventListener('click', async () => {
      const first = !isDone;
      const pay = (c: number) => (first ? CONFIG.training.dailyBonusGold + c * CONFIG.training.goldPerCorrect : 0);
      const { correct } = await runLesson(t, c => (first ? `You earned ${pay(c)} gold.` : 'Practice makes it stick. No gold for repeats today.') + (point ? (c >= 3 ? ' +1 skill point!' : ' Get 3 of 4 right for a skill point.') : ''));
      if (first) { save.gold += pay(correct); save.trainingByDay = { [dayKey()]: [...done, t.id] }; }
      persist();
      if (correct >= 3) earnPoint(`lesson-${t.id}`, t.title);
      showCamp('training', actions);
    });
    grid.appendChild(card);
  });
  body.appendChild(deck);
}

/* ---------------- first launch (also Settings → How to play) ---------------- */
/** The home-screen steps for this phone, or '' when they don't apply (desktop, already installed). */
function installHowTo(): string {
  if (!couldInstallOnPhone()) return '';
  const steps = isIos()
    ? `In <b>Safari</b>, tap <b>•••</b> next to the address bar → <b>Share</b> → <b>Add to Home Screen</b>, keep <b>Open as Web App</b> on and tap <b>Add</b>. (Older iPhones: the Share button is at the bottom.)`
    : `In <b>Chrome</b>, tap <b>⋮</b> (top right) → <b>Add to Home screen</b> or <b>Install app</b>.`;
  return `<li><b>Play it like an app:</b> ${steps} Then start Sum Quest from its new icon: full screen, works offline, and your progress stays safe.</li>`;
}

export function showIntro(done: () => void = () => {}) {
  const s = openSheet(`<span class="label center">Welcome</span><h2>Sum Quest</h2>
    <ul class="how"><li><b>Fight like Archero:</b> move to dodge, stand still to attack.</li>
    <li><b>Math is your power.</b> Crits ask a quick pick-one question and specials ask you to type the answer. You choose how hard.</li>
    <li><b>Loot:</b> open chests by solving a problem. Harder problems and closer answers give rarer gear.</li>
    <li><b>Lost a run?</b> You keep the gold and chests. Gear up and come back stronger.</li>
    <li><b>The camp:</b> walk to the anvil, the yard, the board or the stone to use them. The path north starts a run.</li>
    ${installHowTo()}</ul>
    ${save.seenIntro ? '' : '<p class="note small center">You have a chest waiting in your Bag.</p>'}
    <button class="btn primary" id="go">${save.seenIntro ? 'Got it' : "Let's go"}</button>`);
  const go = () => { release(); save.seenIntro = true; persist(); s.remove(); done(); };
  s.querySelector('#go')!.addEventListener('click', go);
  const release = pushKeys(e => { if (e.key === 'Enter') { go(); return true; } return true; }); // swallow every key while the intro is up
}
