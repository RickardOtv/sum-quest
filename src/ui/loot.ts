/**
 * Chests and items: opening a chest (solve a problem, better answer =
 * better loot), the item detail sheet, and selling / salvaging.
 */
import { CHESTS, ITEM_BASES, RARITIES, SETS, SLOT_LABEL, STAT_LABEL, TIER_QUALITY, WEAPON_KIND, answerQuality, baseById, itemStats, maxLevel, rarityOdds, salvageValue, sellValue, setCounts, type ChestKind, type Item, type Stat, type Stats } from '../game/items';
import { drawChest } from '../game/art/hero';
import { TIER_LABEL, pickProblem } from '../math/problems';
import { logAnswer } from '../state/answers';
import { copiesOf, equip, equippedItem, equippedItems, isEquipped, itemIcon, openChest, salvage, sell, slotOf, unequip } from '../state/gear';
import { save } from '../state/save';
import { recommendedTier } from '../math/adaptive';
import { answerText, askTyped, confidenceDue, esc, html, openSheet, pushKeys, vibrate } from './dom';

/** Compact item tile for grids. */
export function itemTile(it: Item, onClick: () => void): HTMLElement {
  const b = baseById(it.baseId);
  const el = html(`<button class="item-tile" style="--rc:${RARITIES[it.rarity].color}" title="${esc(b.name)} · ${RARITIES[it.rarity].name} Lv ${it.level}" aria-label="${esc(b.name)}">
    <span class="icon"></span>${it.level ? `<span class="lvb num">${it.level}</span>` : ''}
    ${copiesOf(it) > 1 ? '<span class="dup num">×' + copiesOf(it) + '</span>' : ''}</button>`);
  el.querySelector('.icon')!.appendChild(itemIcon(it, 2));
  el.addEventListener('click', onClick);
  return el;
}

/** A 5-colour bar showing the chance of each rarity. */
function oddsBar(odds: number[]) {
  return `<div class="odds">${odds.map((p, i) => p > 0.001 ? `<i style="flex:${p};background:${RARITIES[i].color}" title="${RARITIES[i].name} ${(p * 100).toFixed(1)}%"></i>` : '').join('')}</div>`;
}
const bestOdds = (odds: number[]) => { const rarePlus = odds.slice(2).reduce((a, b) => a + b, 0); return `Rare or better: ${(rarePlus * 100).toFixed(0)}%`; };

/* ---------------- chest opening ---------------- */
/** `inRun`: a chest found in a run is opened right away, so there's no "Later". */
export function openChestFlow(index: number, done: () => void, inRun = false) {
  const chestKind = save.chests[index] as ChestKind, chest = CHESTS[chestKind], rec = recommendedTier();
  const sheet = openSheet(`<div class="chest-art"></div>${inRun ? '<div class="label center">Room cleared · you found</div>' : ''}<h2>${chest.name}</h2>
    <p class="note center">Solve a problem to open it. <b>Harder problems give better loot.</b> A close answer still helps (the closer the better), and an exact answer gives the best odds.</p>
    <div class="chest-tiers">${[1, 2, 3, 4].map(t => {
      const odds = rarityOdds(TIER_QUALITY[t] + chest.bonus, chest.minRarity);
      return `<button data-t="${t}" class="t${t} ${t === rec ? 'rec' : ''}"><kbd>${t === rec ? '↵' : t}</kbd><b>${TIER_LABEL[t]}</b>${oddsBar(odds)}<small>${bestOdds(odds)}${t === rec ? ' · <em>your level</em>' : ''}</small></button>`;
    }).join('')}</div>
    ${inRun ? '' : '<button class="btn ghost" id="cancel">Later</button>'}`);
  sheet.querySelector('.chest-art')!.appendChild(drawChest(chestKind).toCanvas(6));
  const close = () => { release(); sheet.remove(); };
  const go = (t: number) => { close(); solve(t); };
  sheet.querySelectorAll<HTMLButtonElement>('[data-t]').forEach(b => b.addEventListener('click', () => go(+b.dataset.t!)));
  sheet.querySelector('#cancel')?.addEventListener('click', () => { close(); done(); });
  const release = pushKeys(e => {
    const i = ['1', '2', '3', '4'].indexOf(e.key);
    if (i >= 0) { go(i + 1); return true; }
    if (e.key === 'Enter') { go(rec); return true; }
    if (e.key === 'Escape' && !inRun) { close(); done(); return true; }
    return false;
  });

  async function solve(tier: number) {
    const p = pickProblem(tier);
    const r = await askTyped({ problem: p, heading: `Unlock the ${chest.name.toLowerCase()}`, note: `${TIER_LABEL[tier]} problem`, submitLabel: 'Open the chest', bottom: true, tier, confidence: confidenceDue() });
    if (!r) return;
    logAnswer(p, r.kind, r.seconds, false, r.confident);
    const q = TIER_QUALITY[tier] * answerQuality(r.kind, r.relError);
    const odds = rarityOdds(q + chest.bonus, chest.minRarity);
    const item = openChest(index, q);
    reveal(item, r.kind, r.relError, esc(answerText(p)), p.explain, odds);
  }

  function reveal(item: Item, kind: string, rel: number, answer: string, explain: string, odds: number[]) {
    const verdict = kind === 'exact' ? `<div class="verdict ok"><b>✓ Correct</b><span>Best odds unlocked</span></div>`
      : kind === 'close' ? `<div class="verdict warn"><b>≈ Close</b><span>Off by ${(rel * 100).toFixed(1)}% · the answer was ${answer}</span></div>`
      : `<div class="verdict bad"><b>✗ Wrong</b><span>The answer was ${answer}</span></div>`;
    const r = openSheet(`${verdict}${kind !== 'exact' ? `<p class="note center small">${esc(explain)}</p>` : ''}
      <div class="odds-row"><span class="label">Your loot odds</span>${oddsBar(odds)}</div><div class="chest-art shaking"></div><div class="reveal" hidden></div>`);
    r.querySelector('.chest-art')!.appendChild(drawChest(chestKind).toCanvas(6));
    vibrate([20, 40, 20]);
    setTimeout(() => {
      r.querySelector('.chest-art')!.remove();
      const box = r.querySelector<HTMLElement>('.reveal')!;
      box.hidden = false;
      box.appendChild(itemCard(item, true));
      const actions = html(`<div class="row2"><button class="btn primary" id="equip">Equip</button><button class="btn" id="keep">Keep</button></div>`);
      const more = html(`<div class="row2"><button class="btn ghost" id="sell">Sell +${sellValue(item)} gold</button><button class="btn ghost" id="salvage">Salvage +${salvageValue(item)} scrap</button></div>`);
      box.append(actions, more);
      const finish = () => { r.remove(); done(); };
      actions.querySelector('#equip')!.addEventListener('click', () => { const err = equip(item); if (err) alertLine(box, err); else finish(); });
      actions.querySelector('#keep')!.addEventListener('click', finish);
      more.querySelector('#sell')!.addEventListener('click', () => { sell(item); finish(); });
      more.querySelector('#salvage')!.addEventListener('click', () => { salvage(item); finish(); });
      if (item.rarity >= 3) vibrate([40, 60, 40, 60, 80]);
    }, 900);
  }
}

function alertLine(box: HTMLElement, msg: string) { box.querySelector('.alert-line')?.remove(); box.appendChild(html(`<p class="bad center small alert-line">${esc(msg)}</p>`)); }

/* ---------------- item card + detail ---------------- */
export function statLines(it: Item, compare?: Item) {
  const mine = itemStats(it), other = compare ? itemStats(compare) : {};
  const keys = new Set([...Object.keys(mine), ...Object.keys(other)] as Stat[]);
  return [...keys].map(k => {
    const v = mine[k] ?? 0, o = other[k] ?? 0, diff = v - o;
    const d = compare && Math.abs(diff) > 0.05 ? ` <span class="${diff > 0 ? 'ok' : 'bad'}">(${diff > 0 ? '+' : ''}${k === 'critTime' || k === 'damage' || k === 'crit' || k === 'lifesteal' ? diff.toFixed(1) : Math.round(diff)})</span>` : '';
    return v ? `<li>${esc(STAT_LABEL[k](v))}${d}</li>` : `<li class="muted">${esc(STAT_LABEL[k](0))}${d}</li>`;
  }).join('');
}

/** How many pieces of this item's set are worn (counting the item itself once it is equipped). */
const setWorn = (it: Item) => { const set = baseById(it.baseId).set; return set ? setCounts(equippedItems())[set] ?? 0 : 0; };
const setPieces = (setId: string) => ITEM_BASES.filter(b => b.set === setId).length;
const statList = (st: Stats) => (Object.entries(st) as [Stat, number][]).map(([k, v]) => STAT_LABEL[k](v)).join(', ');

export function itemCard(it: Item, big = false): HTMLElement {
  const b = baseById(it.baseId), r = RARITIES[it.rarity];
  const set = b.set ? SETS[b.set] : null, worn = b.set ? setWorn(it) : 0;
  const el = html(`<div class="item-card" style="--rc:${r.color}">
    <div class="art"></div>
    <div class="info"><span class="label" style="color:${r.color}">${r.name} ${SLOT_LABEL[b.slot]}${b.weapon ? ' · ' + esc(WEAPON_KIND[b.weapon].label) : ''}</span>
      <h3>${esc(b.name)}</h3><span class="small num">Lv ${it.level} / ${maxLevel(it)}</span>
      <ul class="stats">${statLines(it)}</ul>${b.note ? `<p class="note small">${esc(b.note)}</p>` : ''}
      ${set ? `<p class="set-line"><b>${esc(set.name)}</b> set · <span class="num">${worn}/${setPieces(set.id)}</span> worn</p>` : ''}</div></div>`);
  el.querySelector('.art')!.appendChild(itemIcon(it, big ? 3 : 2.2));
  return el;
}

/** The set's bonuses, with the ones you currently have lit up. */
export function setBonusList(setId: string, worn: number): HTMLElement {
  const set = SETS[setId];
  return html(`<div class="set-box"><p class="label">${esc(set.name)} · ${esc(set.blurb)}</p>
    <ul class="set-bonuses">${set.bonuses.map(([need, st]) => `<li class="${worn >= need ? 'on' : ''}"><span class="num">${need}</span><span>${esc(statList(st))}</span></li>`).join('')}</ul></div>`);
}

/** Detail sheet: compare with what you wear, equip, sell or salvage. */
export function openItem(it: Item, done: () => void) {
  const slot = slotOf(it), worn = equippedItem(slot);
  const equipped = isEquipped(it);
  const sheet = openSheet(`<div class="slot-card"></div>
    ${!equipped && worn ? `<p class="label">Compared with your ${esc(baseById(worn.baseId).name)}</p><ul class="stats">${statLines(it, worn)}</ul>` : ''}
    ${copiesOf(it) > 1 ? `<p class="note small center">You own ${copiesOf(it)} of these. Sell or salvage the spares.</p>` : ''}
    <div class="row2">${equipped
      ? (slot === 'weapon' ? '<button class="btn" disabled>Equipped</button>' : '<button class="btn" id="unequip">Take off</button>')
      : '<button class="btn primary" id="equip">Equip</button>'}<button class="btn" id="close">Close</button></div>
    ${equipped ? '<p class="note small center">Take it off to sell or salvage it.</p>'
      : `<div class="row2"><button class="btn ghost" id="sell">Sell +${sellValue(it)} gold</button><button class="btn ghost" id="salvage">Salvage +${salvageValue(it)} scrap</button></div>`}`);
  const card = itemCard(it, true);
  sheet.querySelector('.slot-card')!.replaceWith(card);
  const setId = baseById(it.baseId).set;
  if (setId) card.after(setBonusList(setId, setWorn(it)));
  const close = () => { release(); sheet.remove(); done(); };
  sheet.querySelector('#close')!.addEventListener('click', close);
  sheet.querySelector('#equip')?.addEventListener('click', () => { const err = equip(it); if (err) alertLine(sheet.querySelector('.sheet')!, err); else close(); });
  sheet.querySelector('#unequip')?.addEventListener('click', () => { unequip(slot); close(); });
  // rare+ items ask for a second tap before selling or salvaging
  const confirmTwice = (btn: HTMLButtonElement, act: () => void) => {
    let armed = it.rarity < 2;
    btn.addEventListener('click', () => {
      if (!armed) { armed = true; btn.textContent = `Tap again to confirm`; btn.classList.add('danger'); return; }
      act(); close();
    });
  };
  const sellBtn = sheet.querySelector<HTMLButtonElement>('#sell'), salvBtn = sheet.querySelector<HTMLButtonElement>('#salvage');
  if (sellBtn) confirmTwice(sellBtn, () => sell(it));
  if (salvBtn) confirmTwice(salvBtn, () => salvage(it));
  const release = pushKeys(e => { if (e.key === 'Escape') { close(); return true; } return false; });
}
