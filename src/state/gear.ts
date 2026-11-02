/** What the player owns and wears: equip, sell, salvage, and the hero's look. */
import { baseById, heroStats, rollLoot, salvageValue, sellValue, SLOTS, type ChestKind, type HeroStats, type Item, type Look, type Slot } from '../game/items';
import { drawHero, type HeroLooks } from '../game/art/hero';
import { adventurerFrame, cropFrame, skinnedFrame, type Skin } from '../game/art/adventurer';
import { drawWeapon } from '../game/art/weapons';
import { persist, save } from './save';
import { SLOT_ICON, giEl } from '../ui/icons';

export const itemByUid = (uid: number) => save.inventory.find(i => i.uid === uid);
export const slotOf = (it: Item) => baseById(it.baseId).slot;
export const isEquipped = (it: Item) => save.equipped[slotOf(it)] === it.uid;

export function equippedItem(slot: Slot): Item | undefined {
  const uid = save.equipped[slot];
  return uid ? itemByUid(uid) : undefined;
}
export const equippedItems = () => SLOTS.map(equippedItem).filter((i): i is Item => !!i);
/** Gear stats plus skill-tree passives. */
export function currentStats(): HeroStats {
  const st = heroStats(equippedItems());
  const lv = (id: string) => save.tree[id as keyof typeof save.tree] ?? 0;
  st.damage *= 1 + 0.1 * lv('sharp');
  st.chargeMult = Math.min(2.2, st.chargeMult * (1 + 0.15 * lv('overcharge')));
  st.maxHp = Math.round(st.maxHp * (1 + 0.1 * lv('vigor')));
  st.damageTaken = Math.max(0.3, st.damageTaken * (1 - 0.08 * lv('thickskin')));
  st.critChance = Math.min(0.45, st.critChance + 0.04 * lv('keen'));
  st.critWindow = Math.min(9.5, st.critWindow + 0.5 * lv('clearmind'));
  return st;
}

/** The slot this item blocks (e.g. pants under enchanted underpants), if any. */
export function blockedSlot(): Slot | undefined {
  const free = equippedItem('free');
  return free ? baseById(free.baseId).blocks : undefined;
}

export function equip(it: Item): string | null {
  const slot = slotOf(it), blocks = baseById(it.baseId).blocks;
  if (slot === blockedSlot()) return `You can't wear ${slot} with ${baseById(equippedItem('free')!.baseId).name}.`;
  save.equipped[slot] = it.uid;
  if (blocks) delete save.equipped[blocks];
  persist();
  return null;
}

/* ---------- loadouts: skills + gear presets ---------- */
export function saveLoadout(index: number, name: string) {
  save.loadouts[index] = { name, skills: [...save.equippedSkills], gear: { ...save.equipped } };
  persist();
}
/** Apply a preset. Items that were sold since are skipped; returns how many pieces were missing. */
export function applyLoadout(index: number): number {
  const lo = save.loadouts[index];
  if (!lo) return 0;
  let missing = 0;
  const gear: Partial<Record<Slot, number>> = {};
  for (const [slot, uid] of Object.entries(lo.gear) as [Slot, number][]) { if (itemByUid(uid)) gear[slot] = uid; else missing++; }
  if (!gear.weapon) gear.weapon = save.equipped.weapon; // never go weaponless
  save.equipped = gear;
  const blocks = equippedItem('free') ? baseById(equippedItem('free')!.baseId).blocks : undefined;
  if (blocks) delete save.equipped[blocks];
  save.equippedSkills = [0, 1].map(i => { const s = lo.skills[i]; return s && (save.tree[s] ?? 0) > 0 ? s : null; });
  persist();
  return missing;
}
export const loadoutMatchesCurrent = (lo: { skills: (string | null)[]; gear: Partial<Record<Slot, number>> }) =>
  [0, 1].every(i => (lo.skills[i] ?? null) === (save.equippedSkills[i] ?? null)) && SLOTS.every(s => (lo.gear[s] ?? 0) === (save.equipped[s] ?? 0));

export function unequip(slot: Slot) {
  if (slot === 'weapon') return; // always keep a weapon
  delete save.equipped[slot];
  persist();
}

export function addItem(it: Item) { save.inventory.push(it); persist(); }
function remove(it: Item) {
  save.inventory = save.inventory.filter(i => i.uid !== it.uid);
  if (isEquipped(it)) delete save.equipped[slotOf(it)];
}
export function sell(it: Item) { remove(it); save.gold += sellValue(it); persist(); }
export function salvage(it: Item) { remove(it); save.scrap += salvageValue(it); persist(); }

/** How many items you own with the same base (for the "duplicate" badge). */
export const copiesOf = (it: Item) => save.inventory.filter(i => i.baseId === it.baseId).length;

/** Open a chest with an answer quality q (0..1). */
export function openChest(index: number, q: number): Item {
  const kind = save.chests[index] as ChestKind;
  save.chests.splice(index, 1);
  const item = rollLoot(q, kind, save.nextUid++);
  addItem(item);
  return item;
}


/* ---------------- looks ---------------- */
export function currentLooks(override?: Item): HeroLooks {
  const looks: HeroLooks = {};
  for (const slot of SLOTS) {
    if (slot === 'weapon') continue;
    let it = equippedItem(slot);
    if (override && slotOf(override) === slot) it = override;
    if (it) (looks as Record<string, unknown>)[slot] = baseById(it.baseId).look;
  }
  if (override && baseById(override.baseId).blocks) delete (looks as Record<string, unknown>)[baseById(override.baseId).blocks!];
  return looks;
}

/** Everything the character sprite needs to show what you wear. */
export function heroSkin(override?: Item): Skin {
  const weaponItem = override && slotOf(override) === 'weapon' ? override : equippedItem('weapon');
  const kind = weaponItem ? baseById(weaponItem.baseId).weapon : undefined;
  return { looks: currentLooks(override), weapon: weaponItem ? baseById(weaponItem.baseId).look : undefined, hideWeapon: kind === 'axe' || kind === 'staff' || kind === 'spear' };
}

/** Hero portrait for menus: the idle-down pose in your current gear. */
export function heroCanvas(scale = 4, override?: Item): HTMLCanvasElement {
  return adventurerFrame(heroSkin(override), 'idle', 'down', 0, scale);
}

/** Part of the idle-down frame each slot's icon zooms in on: [x, y, w, h] in frame pixels. */
const ICON_CROP: Record<string, [number, number, number, number]> = {
  helmet: [36, 22, 22, 16], armor: [38, 35, 20, 15], gloves: [39, 41, 18, 7], pants: [41, 44, 14, 7],
  boots: [40, 50, 16, 8], free: [33, 22, 30, 37],
};

/** Small picture of one item: weapons on their own, wearables zoomed on the body part they cover. */
export function itemIcon(it: Item, scale = 2): HTMLCanvasElement {
  const base = baseById(it.baseId);
  return lookIcon(base.slot, base.look, scale);
}

/** The slot's silhouette icon (empty slots around the hero). */
export function slotIcon(slot: Slot, scale = 2): HTMLElement {
  const span = document.createElement('span');
  span.className = 'slot-glyph'; span.style.fontSize = `${Math.round(scale * 18)}px`;
  span.appendChild(giEl(SLOT_ICON[slot]));
  return span;
}

/** A grey body for icons, so the item's own colours are what stands out. */
const NEUTRAL_BODY: HeroLooks = {
  armor: { style: 'tunic', main: '#4a4852', accent: '#3a3842' }, pants: { style: 'trousers', main: '#3e3c46', accent: '#2e2c36' },
  boots: { style: 'sandals', main: '#3e3c46', accent: '#2e2c36' }, gloves: { style: 'wraps', main: '#5a5862', accent: '#4a4852' },
};
/** Special items that are tattoos: shown as the mark on skin, not on the sprite. */
const TATTOO_STYLES = new Set(['rune', 'serpent', 'sigil', 'star']);
const iconCache = new Map<string, HTMLCanvasElement>();
export function lookIcon(slot: Slot, look: Look, scale: number): HTMLCanvasElement {
  const key = `${slot}|${look.style}|${look.main}|${look.accent}|${look.extra}|${scale}`;
  const hit = iconCache.get(key);
  if (hit) { const c = document.createElement('canvas'); c.width = hit.width; c.height = hit.height; c.getContext('2d')!.drawImage(hit, 0, 0); return c; }
  let out: HTMLCanvasElement;
  if (slot === 'weapon') {
    // the weapon alone, drawn diagonally on a small transparent buffer
    const W = 28, buf = new Uint8ClampedArray(W * W * 4);
    drawWeapon(buf, W, 0, { grip: [8, 20], tip: [20, 8], pts: [] }, look);
    const c = document.createElement('canvas'); c.width = W; c.height = W;
    c.getContext('2d')!.putImageData(new ImageData(buf, W, W), 0, 0);
    out = cropFrame(c, 0, 0, W, W, scale + 1);
  } else if (TATTOO_STYLES.has(look.style)) {
    out = cropFrame(drawHero({ tattoo: look }).toCanvas(1), 4, 6, 16, 20, scale * 1.6);
  } else {
    // the piece worn on a bare body, zoomed on the part it covers
    const frame = skinnedFrame('idle', 'down', 0, { looks: { ...NEUTRAL_BODY, [slot]: look }, hair: '#5a5862', hideWeapon: true });
    const [x, y, w, h] = ICON_CROP[slot];
    out = cropFrame(frame, x, y, w, h, slot === 'free' ? scale : slot === 'gloves' || slot === 'pants' ? scale * 2 : scale * 1.6);
  }
  iconCache.set(key, out);
  return out;
}
