/**
 * Camp menus, opened from the walkable camp (HubScene) as full-screen
 * panels: Bag (gear, chests), Forge, Training (lessons + Sprint), the
 * notice board (Progress), the meditation stone (skills, tree, loadouts)
 * and the "head out" sheet that starts a run.
 */
import { couldInstallOnPhone, isIos } from '../pwa';
import { SLOT_ICON, gi, giEl } from './icons';
import { CONFIG, MADE_BY, forgeChance } from '../config';
import { TIER_LABEL, pickProblem } from '../math/problems';
import { effectiveBox, getSkill } from '../math/mastery';
import { planFocus, recommendedTier } from '../math/adaptive';
import { TRICKS, suggestTrick, type Trick } from '../math/tricks';
import { SKILLS, SKILL_SLOTS, TREE, isSkillId, maxLevelOf, passiveById, skillAt, type NodeId, type SkillEffect } from '../game/skills';
import { branchOf, buy, canBuy, checkStreakMilestones, earnPoint, isUnlocked, levelOf, refundablePoints, respec, respecCost, respecUnlocked } from '../state/points';
import { logAnswer } from '../state/answers';
import { currentStreak, dayKey, persist, save } from '../state/save';
import { applyLoadout, blockedSlot, currentStats, equippedItem, equippedItems, heroCanvas, isEquipped, itemIcon, loadoutMatchesCurrent, salvage, saveLoadout, slotIcon } from '../state/gear';
import { CHESTS, RARITIES, SETS, SLOTS, SLOT_LABEL, baseById, forgeCost, heroPower, heroStats, maxLevel, salvageValue, setCounts, type Item } from '../game/items';
import { ROOTBACK, spriteCanvas, ICONS } from '../game/art/sprites';
import { drawChest } from '../game/art/hero';
import { NPCS, drawAnvil, drawShrine, drawWorkshop, drawYard, npcCanvas, type Npc } from '../game/art/camp';
import type { Pixels } from '../game/art/pixels';
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

/** One line shown the first time each panel opens (seen ones are kept in the save). */
const FIRST_TIP: Record<CampTab, string> = {
  bag: 'Tap a chest to open it. Tap a slot or an item to change what you wear.',
  forge: 'Pick a piece below, then Forge. A harder problem makes it more likely to hold.',
  training: 'Lessons teach a shortcut. Finish one for gold and a skill point.',
  progress: 'What you know, what is fading, and your records.',
  skills: 'Spend skill points in the tree. Tap a slot to choose the skills you take on a run.',
};
let tipFor: CampTab | null = null; // the panel whose tip shows during this visit

/** Open one panel over the (paused) camp. `keepScroll` re-renders it where it was scrolled to. */
export function showCamp(tab: CampTab, a: CampActions, keepScroll = false) {
  actions = a;
  releaseKeys?.(); releaseKeys = null;
  const scroll = keepScroll ? uiRoot().querySelector('#camp-body')?.scrollTop ?? 0 : 0;
  const toasts = [...uiRoot().querySelectorAll('.toast')]; // e.g. "+1 skill point" from what just happened
  uiRoot().innerHTML = '';
  uiRoot().append(...toasts);
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
  if (!save.seenTips.includes(tab)) { save.seenTips.push(tab); persist(); tipFor = tab; }
  if (tipFor === tab) body.prepend(firstTip(tab));
  body.scrollTop = scroll;
  releaseKeys = pushKeys(e => { if (e.key === 'Escape') { backToCamp(); return true; } return false; });
}

const refresh = (tab: CampTab) => () => showCamp(tab, actions);
function clearCamp() { releaseKeys?.(); releaseKeys = null; tipFor = null; uiRoot().innerHTML = ''; }

function firstTip(tab: CampTab): HTMLElement {
  const el = html(`<div class="first-tip">${gi('sparkles')}<span>${esc(FIRST_TIP[tab])}</span><button aria-label="Hide tip">✕</button></div>`);
  el.querySelector('button')!.addEventListener('click', () => { tipFor = null; el.remove(); });
  return el;
}
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
  // the hero at the biggest whole-pixel size that fits between the two slot columns (crisp pixels on any phone)
  const room = Math.min(460, document.getElementById('app')!.clientWidth) - 32 - 20 - 2 * 60 - 2 * 10;
  el.querySelector('.stage-hero')!.prepend(heroCanvas(Math.max(3, Math.min(6, Math.floor(room / 36)))));
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
const GEM = '<span class="gem">◆</span>'; // a skill point, everywhere it shows
const SLOT_KEY = ['Space', 'E'];
const slotName = (i: number) => `Slot ${i + 1} <kbd class="key">${SLOT_KEY[i]}</kbd>`;
const reskills = () => showCamp('skills', actions, true); // re-render, staying where you were in the tree

/** One screen: the two equipped slots and your points on top, the three-branch tree, loadouts, Rebirth. */
function skillsTab(body: HTMLElement) {
  body.appendChild(banner(drawShrine(), 'shrine', 112, NPCS.monk, NPCS.monk.lines[monkLine++ % NPCS.monk.lines.length], 44)); // centred on the stone circle's base and the altar

  const top = html(`<section class="skill-top"><div class="skill-slots"></div>
    <div class="points-row">${GEM}<b class="num">${save.skillPoints}</b><span>skill point${save.skillPoints === 1 ? '' : 's'} to spend</span>
      <button class="info-btn" aria-label="How to earn skill points">?</button></div></section>`);
  const slots = top.querySelector('.skill-slots')!;
  for (let i = 0; i < SKILL_SLOTS; i++) {
    const id = save.equippedSkills[i] ?? null, sk = id && isUnlocked(id) ? skillAt(id, levelOf(id)) : undefined;
    const b = html(`<button class="slot-btn ${sk ? '' : 'empty'}"><span class="glyph">${sk ? gi(sk.glyph) : '+'}</span>
      <span class="info"><span class="label">${slotName(i)}</span><b>${sk ? esc(sk.name) : 'Empty'}</b><span class="note small">${sk ? `Lv ${sk.level}` : 'tap to choose'}</span></span></button>`);
    b.addEventListener('click', () => pickSkill(i));
    slots.appendChild(b);
  }
  top.querySelector('.info-btn')!.addEventListener('click', pointsInfo);
  body.appendChild(top);

  // the tree, inline: tap a node for details, unlock / level up, and equip
  const tree = html(`<section class="deck"><div class="deck-head"><span class="label">Skill tree</span><span class="note small">1 point per level · top to bottom</span></div><div class="tree"></div></section>`);
  for (const br of TREE) {
    const col = html(`<div class="branch"><div class="branch-head"><b>${br.name}</b><span class="note small">${esc(br.blurb)}</span></div></div>`);
    br.nodes.forEach((id, i) => {
      const lv = levelOf(id), max = maxLevelOf(id), skill = isSkillId(id) ? skillAt(id, Math.max(1, lv)) : undefined, pas = skill ? undefined : passiveById(id);
      const slot = skill ? save.equippedSkills.indexOf(skill.id) : -1;
      const node = html(`<button class="node ${skill ? 'is-skill' : 'passive'} ${lv ? 'on' : 'locked'} ${canBuy(id).ok ? 'buyable' : ''}">
        ${i > 0 ? '<i class="link"></i>' : ''}<span class="kind">${skill ? 'Skill' : 'Passive'}</span>
        <span class="ic">${gi(skill ? skill.glyph : pas!.glyph)}</span><b>${esc(skill ? skill.name : pas!.name)}</b>
        <span class="eff">${esc(skill ? skill.short : pas!.text(Math.max(1, lv)))}</span><span class="lv num">Lv ${lv}/${max}</span>
        ${slot >= 0 ? `<span class="where">Slot ${slot + 1}</span>` : ''}</button>`);
      node.addEventListener('click', () => openNode(id));
      col.appendChild(node);
    });
    tree.querySelector('.tree')!.appendChild(col);
  }
  body.appendChild(tree);

  // loadouts as three seals
  const seals = html(`<section class="deck"><div class="deck-head"><span class="label">Loadouts</span><span class="note small">skills + gear, saved together</span></div><div class="seals"></div></section>`);
  const row = seals.querySelector('.seals')!;
  save.loadouts.forEach((lo, i) => {
    const active = lo && loadoutMatchesCurrent(lo);
    const b = html(`<button class="seal ${lo ? '' : 'empty'} ${active ? 'on' : ''}"><span class="ring"><span class="glyph">${lo ? lo.skills.filter((x): x is SkillEffect => !!x).map(x => gi(skillAt(x, 1).glyph)).join('') || '+' : '+'}</span></span>
      <b>${lo ? esc(lo.name) : `Loadout ${i + 1}`}</b><span class="note small">${lo ? (active ? 'equipped' : `${Object.keys(lo.gear).length} pieces`) : 'empty'}</span></button>`);
    b.addEventListener('click', () => (lo ? loadoutMenu(i) : nameLoadout(i, `Build ${i + 1}`)));
    row.appendChild(b);
  });
  body.appendChild(seals);

  if (respecUnlocked()) {
    const re = html(`<button class="btn ghost">Rebirth: refund all ${refundablePoints()} point${refundablePoints() === 1 ? '' : 's'} for ${respecCost()} gold</button>`);
    re.addEventListener('click', openRebirth);
    body.appendChild(re);
  } else body.appendChild(html('<p class="note small center">Beat Old Rootback once to unlock Rebirth (refund your points).</p>'));
}

/** Put a skill in a slot (null empties it). If it sat in the other slot, the two swap. */
function equipSkill(slot: number, id: SkillEffect | null) {
  const other = id ? save.equippedSkills.indexOf(id) : -1;
  if (other >= 0 && other !== slot) save.equippedSkills[other] = save.equippedSkills[slot] ?? null;
  save.equippedSkills[slot] = id; persist(); vibrate(20);
}

/** Tap a slot: choose one of your unlocked skills for it. */
function pickSkill(slot: number) {
  const current = save.equippedSkills[slot] ?? null;
  const sheet = openSheet(`<span class="label center">${slotName(slot)}</span><h2>Choose a skill</h2><div class="skill-list">${SKILLS.filter(b => isUnlocked(b.id)).map(base => {
    const sk = skillAt(base.id, levelOf(base.id)), other = save.equippedSkills.indexOf(base.id);
    return `<button data-id="${base.id}" class="skill-row ${base.id === current ? 'on' : ''}"><span class="glyph">${gi(sk.glyph)}</span>
      <span class="info"><b>${esc(sk.name)} <span class="lvl">Lv ${sk.level}</span></b><span>${esc(sk.short)}</span>${other >= 0 && base.id !== current ? `<small>In Slot ${other + 1} now: the two swap</small>` : ''}</span></button>`; }).join('')}</div>
    <p class="note small center">Unlock more skills in the tree.</p>
    <div class="row2">${current ? '<button class="btn" id="clear">Empty this slot</button>' : ''}<button class="btn" id="close">Close</button></div>`);
  const close = () => { release(); sheet.remove(); };
  const done = (id: SkillEffect | null) => { equipSkill(slot, id); close(); reskills(); };
  sheet.querySelectorAll<HTMLButtonElement>('[data-id]').forEach(b => b.addEventListener('click', () => done(b.dataset.id as SkillEffect)));
  sheet.querySelector('#clear')?.addEventListener('click', () => done(null));
  sheet.querySelector('#close')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

/** One node: what it does, Unlock / Level up, and for an unlocked skill, Equip to Slot 1 / Slot 2. */
function openNode(id: NodeId) {
  const lv = levelOf(id), max = maxLevelOf(id);
  const skill = isSkillId(id) ? skillAt(id, Math.max(1, lv)) : undefined, next = isSkillId(id) ? skillAt(id, Math.max(1, lv) + 1) : undefined, pas = skill ? undefined : passiveById(id);
  const { ok, why } = canBuy(id), slot = skill ? save.equippedSkills.indexOf(skill.id) : -1, canEquip = !!skill && lv > 0;
  const details = skill
    ? `<p class="note">${esc(skill.short)}. ${esc(skill.tip)}</p><p class="small">${TIER_LABEL[skill.tier]} ${CATEGORY_WORD[skill.category]} problems · recharges in ${skill.recharge}s of combat</p>
       ${lv === 0 ? '<p class="small"><b>Unlock</b> it to put it in a slot.</p>' : lv < max ? `<p class="small"><b>Next level:</b> +${Math.round((next!.power / skill.power - 1) * 100)}% effect, recharges in ${next!.recharge}s (now ${skill.recharge}s)</p>` : '<p class="small">Max level.</p>'}`
    : `<p class="note">Always on. ${lv ? esc(pas!.text(lv)) : `Lv 1: ${esc(pas!.text(1))}`}.</p>${lv && lv < max ? `<p class="small"><b>Next level:</b> ${esc(pas!.text(lv + 1))}</p>` : lv ? '<p class="small">Max level.</p>' : ''}`;
  const sheet = openSheet(`<span class="label center">${esc(branchOf(id).name)} · ${skill ? 'Skill' : 'Passive'} · Lv ${lv}/${max}</span><h2>${gi(skill ? skill.glyph : pas!.glyph)} ${esc(skill ? skill.name : pas!.name)}</h2>${details}
    ${canEquip ? `<div class="row2">${[0, 1].map(i => `<button class="btn ${slot === i ? '' : 'primary'}" data-slot="${i}" ${slot === i ? 'disabled' : ''}>${slot === i ? `In ${slotName(i)}` : `Equip to ${slotName(i)}`}</button>`).join('')}</div>` : ''}
    <div class="row2"><button class="btn ${canEquip ? '' : 'primary'}" id="buy" ${ok ? '' : 'disabled'}>${lv ? 'Level up' : 'Unlock'} · 1 point</button><button class="btn ghost" id="close">Close</button></div>
    ${!ok && why ? `<p class="note small center">${esc(why)}</p>` : ''}`);
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#buy')!.addEventListener('click', () => { if (buy(id)) { vibrate(30); close(); reskills(); } });
  sheet.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b => b.addEventListener('click', () => { equipSkill(+b.dataset.slot!, skill!.id); close(); reskills(); }));
  sheet.querySelector('#close')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

/** The "?" next to your points: what they're for and where they come from. */
function pointsInfo() {
  const sheet = openSheet(`<h2>${GEM} Skill points</h2><p class="note center">Each point unlocks a node in the tree or raises it one level.</p>
    <ul class="how"><li><b>Finish a Training lesson:</b> 3 of 4 right in camp, 2 of 2 in a run (once per lesson)</li>
    <li><b>Master a lesson:</b> get it to 3 stars (once per lesson)</li>
    <li><b>Beat a boss</b> (every time)</li>
    <li><b>Keep your daily streak:</b> 3, 7, 14 and 30 days</li></ul>
    <button class="btn primary" id="ok">Got it</button>`);
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#ok')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape' || e.key === 'Enter') { close(); return true; } return false; });
}

function openRebirth() {
  const c = openSheet(`<h2>Rebirth</h2><p class="note center">Refund <b>${refundablePoints()}</b> point${refundablePoints() === 1 ? '' : 's'} for <b>${respecCost()} gold</b>? Nova and Ward stay at Lv 1. The price goes up each time.</p>
    <div class="row2"><button class="btn" id="no">Keep my tree</button><button class="btn primary" id="yes" ${save.gold >= respecCost() && refundablePoints() > 0 ? '' : 'disabled'}>Rebirth</button></div>
    ${save.gold < respecCost() ? '<p class="note small center">Not enough gold.</p>' : ''}`);
  const close = () => { release(); c.remove(); };
  c.querySelector('#no')!.addEventListener('click', close);
  c.querySelector('#yes')!.addEventListener('click', () => { if (respec()) { vibrate([30, 40, 30]); close(); reskills(); } });
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

function loadoutMenu(i: number) {
  const lo = save.loadouts[i]!, active = loadoutMatchesCurrent(lo);
  const sheet = openSheet(`<span class="label center">Loadout ${i + 1}</span><h2>${esc(lo.name)}</h2>
    <p class="note center">${lo.skills.filter((x): x is SkillEffect => !!x).map(x => `${gi(skillAt(x, 1).glyph)} ${skillAt(x, 1).name}`).join(' · ') || 'no skills'} · ${Object.keys(lo.gear).length} gear pieces</p>
    <div class="row2"><button class="btn primary" id="apply" ${active ? 'disabled' : ''}>${active ? 'Equipped' : 'Equip'}</button><button class="btn" id="save">Overwrite</button></div>
    <button class="btn ghost" id="close">Close</button>`);
  const close = () => { release(); sheet.remove(); };
  sheet.querySelector('#apply')!.addEventListener('click', () => { const missing = applyLoadout(i); close(); reskills(); if (missing) toastMissing(missing); });
  sheet.querySelector('#save')!.addEventListener('click', () => { close(); nameLoadout(i, lo.name); });
  sheet.querySelector('#close')!.addEventListener('click', close);
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}

const CATEGORY_WORD = { addsub: 'add & subtract', muldiv: 'big × ÷', facts: 'times tables', everyday: 'everyday' } as const;

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
  sheet.querySelector('#ok')!.addEventListener('click', () => { saveLoadout(index, input.value.trim() || suggested); close(); reskills(); });
  // let the text field take the keyboard
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } if (e.key === 'Enter') { (sheet.querySelector('#ok') as HTMLButtonElement).click(); return true; } return false; });
  input.focus(); input.select(); // synchronous, inside the tap, so iOS opens the keyboard
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

/** Mastery stars (0–3) for a lesson: how well you know the skills it practises. */
function lessonStars(t: Trick) {
  const boxes = t.practice.map(k => effectiveBox(getSkill(k)));
  return Math.round((boxes.reduce((a, b) => a + b, 0) / boxes.length / 5) * 3);
}

/** The yard: a short banner, Sprint + the daily goal, then every lesson as a card with stars. */
function trainingTab(body: HTMLElement) {
  const done = save.trainingByDay[dayKey()] ?? [], today = save.practiceByDay[dayKey()] ?? 0;
  const goalMet = today >= CONFIG.dailyGoalSec, pct = Math.min(1, today / CONFIG.dailyGoalSec);
  body.appendChild(banner(drawYard(), 'yard', 110, NPCS.trainer, NPCS.trainer.lines[trainerLine++ % NPCS.trainer.lines.length]));

  // Sprint is a button; the daily goal is a status card (it fills from solving anywhere)
  const R = 26, C = 2 * Math.PI * R;
  const modes = html(`<div class="mode-cards">
    <button class="mode-card sprint"><span class="big-glyph">${gi('stopwatch')}</span><b>Sprint</b><span class="sub num">${save.sprint.best ? `best ${save.sprint.best}` : '60 seconds'}</span></button>
    <div class="mode-card daily ${goalMet ? 'met' : ''}" role="status"><svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}"/><circle class="val" cx="32" cy="32" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
      <span class="chest"></span><b>Daily goal</b><span class="sub num">${goalMet ? 'chest earned' : `${fmtTime(today)} / ${fmtTime(CONFIG.dailyGoalSec)}`}</span>
      <span class="sub">${goalMet ? 'back tomorrow' : `solve ${CONFIG.dailyGoalSec / 60} min anywhere for a chest`}</span></div></div>`);
  modes.querySelector('.chest')!.appendChild(drawChest('wood').toCanvas(2));
  modes.querySelector('.sprint')!.addEventListener('click', () => { clearCamp(); runSprint(() => showCamp('training', actions)); });
  body.appendChild(modes);

  // lessons as cards: icon, name, mastery stars; a corner badge when there are points or gold to earn
  const rec = suggestTrick(done);
  const deck = html(`<section class="deck"><div class="deck-head"><span class="label">Lessons</span><span class="note small">${done.length} / ${TRICKS.length} today</span></div>
    <p class="note small legend">${GEM} skill point to earn · <span class="star">★</span> how well you know it · <span class="gold-dot">◉</span> gold today</p><div class="lesson-cards"></div></section>`);
  const grid = deck.querySelector('.lesson-cards')!;
  TRICKS.forEach(t => {
    const stars = lessonStars(t), isDone = done.includes(t.id), point = !save.pointsEarned.includes(`lesson-${t.id}`);
    const pts = Number(point) + Number(!save.pointsEarned.includes(`mastery-${t.id}`));
    const card = html(`<button class="lesson-card ${isDone ? 'done' : ''} ${t === rec ? 'rec' : ''}" title="${esc(t.idea)}">
      ${t === rec ? '<span class="rec-tag">Recommended</span>' : ''}
      <span class="orb"><span class="glyph">${LESSON_GLYPH[t.id] ?? '?'}</span></span><b>${esc(t.title)}</b>
      <span class="stars">${[0, 1, 2].map(k => `<i class="${k < stars ? 'on' : ''}">★</i>`).join('')}</span>
      ${pts ? `<span class="corner pt">${GEM}+${pts}</span>` : isDone ? '<span class="corner ok">✓</span>' : '<span class="corner gold">◉</span>'}</button>`);
    card.addEventListener('click', async () => {
      const first = !isDone;
      const pay = (c: number) => (first ? CONFIG.training.dailyBonusGold + c * CONFIG.training.goldPerCorrect : 0);
      const { correct } = await runLesson(t, c => (first ? `You earned ${pay(c)} gold.` : 'Practice makes it stick. No gold for repeats today.') + (point ? (c >= 3 ? ' +1 skill point!' : ' Get 3 of 4 right for a skill point.') : ''));
      if (first) { save.gold += pay(correct); save.trainingByDay = { [dayKey()]: [...done, t.id] }; }
      persist();
      if (correct >= 3) earnPoint(`lesson-${t.id}`, t.title);
      if (lessonStars(t) >= 3) earnPoint(`mastery-${t.id}`, `${t.title} mastered`);
      showCamp('training', actions);
    });
    grid.appendChild(card);
  });
  body.appendChild(deck);
}

/**
 * A short scene banner: the pixel art at the smallest whole-number scale that fills the
 * panel's width, cropped to `height` (never stretched, so the pixels stay crisp).
 */
function banner(art: Pixels, cls: string, height: number, npc: Npc, line: string, focusY = art.h / 2): HTMLElement {
  const w = document.getElementById('app')!.clientWidth, scale = Math.ceil(w / art.w), c = art.toCanvas(scale);
  const el = html(`<section class="scene banner ${cls}" style="height:${height}px"><div class="speech">${esc(line)}</div><div class="npc"></div></section>`);
  const top = Math.min(0, Math.max(height - c.height, Math.round(height / 2 - focusY * scale))); // centre on art row `focusY`, never leave a gap
  Object.assign(c.style, { left: `${Math.floor((w - c.width) / 2)}px`, top: `${top}px` });
  c.className = 'banner-art';
  el.prepend(c);
  el.querySelector('.npc')!.appendChild(npcCanvas(npc, 2));
  return el;
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
    <ul class="how"><li><b>Fight:</b> move to dodge, stand still to attack.</li>
    <li><b>Math is your power:</b> crits, skills and chests ask a quick sum.</li>
    <li><b>Camp:</b> walk to a station to use it. The path north starts a run.</li>
    ${installHowTo()}</ul>
    ${save.seenIntro ? '' : '<p class="note small center">You have a chest waiting in your Bag.</p>'}
    <p class="note small center">Made by <a href="${MADE_BY.github}" target="_blank" rel="noopener">${MADE_BY.name}</a></p>
    <button class="btn primary" id="go">${save.seenIntro ? 'Got it' : "Let's go"}</button>`);
  const go = () => { release(); save.seenIntro = true; persist(); s.remove(); done(); };
  s.querySelector('#go')!.addEventListener('click', go);
  const release = pushKeys(e => { if (e.key === 'Enter') { go(); return true; } return true; }); // swallow every key while the intro is up
}
