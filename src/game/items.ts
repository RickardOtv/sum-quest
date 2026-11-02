/**
 * Gear: every item has a slot, rarity, level, stats and its own look.
 * Item *bases* (below) define what an item is; a dropped item rolls a
 * rarity and bonus traits ("affixes") on top of its base.
 */

/** `free` is the Special items slot: cloaks, tattoos, tiaras, quivers… */
export type Slot = 'weapon' | 'helmet' | 'armor' | 'gloves' | 'pants' | 'boots' | 'free';
export const SLOTS: Slot[] = ['weapon', 'helmet', 'armor', 'gloves', 'pants', 'boots', 'free'];
export const SLOT_LABEL: Record<Slot, string> = {
  weapon: 'Weapon', helmet: 'Helmet', armor: 'Armor', gloves: 'Gloves', pants: 'Pants', boots: 'Boots', free: 'Special item',
};

export type Stat = 'damage' | 'hp' | 'armor' | 'crit' | 'critTime' | 'charge' | 'calm' | 'speed' | 'rate' | 'gold' | 'close' | 'lifesteal';
export const STAT_LABEL: Record<Stat, (v: number) => string> = {
  damage: v => `+${v.toFixed(1)} damage`,
  hp: v => `+${Math.round(v)} HP`,
  armor: v => `${Math.round(v)}% less damage taken`,
  crit: v => `+${v.toFixed(1)}% crit chance`,
  critTime: v => `+${v.toFixed(1)}s to answer crits`,
  charge: v => `special charges ${Math.round(v)}% faster`,
  calm: v => `+${Math.round(v)}% time for speed bonuses`,
  speed: v => `${v >= 0 ? '+' : ''}${Math.round(v)}% move speed`,
  rate: v => `+${Math.round(v)}% attack speed`,
  gold: v => `+${Math.round(v)}% gold found`,
  close: v => `close answers deal +${Math.round(v)}% damage`,
  lifesteal: v => `heal ${v.toFixed(1)}% HP per kill`,
};
export type Stats = Partial<Record<Stat, number>>;

export const RARITIES = [
  { name: 'Common', color: '#a7a091', mult: 1, affixes: 0, maxLevel: 5 },
  { name: 'Uncommon', color: '#7fbf6a', mult: 1.25, affixes: 1, maxLevel: 8 },
  { name: 'Rare', color: '#6fa8d6', mult: 1.55, affixes: 2, maxLevel: 12 },
  { name: 'Epic', color: '#b08cff', mult: 1.9, affixes: 3, maxLevel: 16 },
  { name: 'Legendary', color: '#e8a24a', mult: 2.4, affixes: 4, maxLevel: 20 },
];

export type WeaponKind = 'sword' | 'dagger' | 'cleaver' | 'axe' | 'staff' | 'spear';
/** Weapon kinds trade damage for attack speed. */
export const WEAPON_KIND: Record<WeaponKind, { damage: number; rate: number; label: string }> = {
  sword: { damage: 1, rate: 1, label: 'Sword' },
  dagger: { damage: 0.75, rate: 1.4, label: 'Dagger: fast, light hits' },
  cleaver: { damage: 1.45, rate: 0.72, label: 'Cleaver: slow, heavy hits' },
  axe: { damage: 1.3, rate: 0.8, label: 'Axe: heavy, steady swings' },
  staff: { damage: 0.85, rate: 1, label: 'Staff: light hits, strong magic' },
  spear: { damage: 1.1, rate: 0.9, label: 'Spear: long reach' },
};

/* ---------------- sets ---------------- */
/** Wearing several pieces of a set adds bonuses at 2, 4 and 6 pieces. */
export interface ItemSet { id: string; name: string; blurb: string; bonuses: [number, Stats][]; }
export const SETS: Record<string, ItemSet> = {
  warden: { id: 'warden', name: 'Thornwood Warden', blurb: 'Steel and moss. The forest keeps its own.',
    bonuses: [[2, { hp: 20, armor: 3 }], [4, { armor: 6, critTime: 0.5 }], [6, { hp: 40, lifesteal: 2 }]] },
  reaver: { id: 'reaver', name: 'Ashen Reaver', blurb: 'Blackened iron that still remembers the fire.',
    bonuses: [[2, { damage: 1.5 }], [4, { crit: 5, close: 15 }], [6, { rate: 10, lifesteal: 2 }]] },
  seer: { id: 'seer', name: 'Starseer', blurb: 'Midnight cloth stitched with the night sky.',
    bonuses: [[2, { charge: 10 }], [4, { calm: 15, critTime: 0.5 }], [6, { charge: 20, calm: 15 }]] },
  hunt: { id: 'hunt', name: 'Wild Hunt', blurb: 'Leather, fur and feathers. Nothing in Thornwood outruns you.',
    bonuses: [[2, { speed: 5 }], [4, { rate: 8, crit: 3 }], [6, { gold: 15, speed: 6 }]] },
};

/** How an item is drawn: a style the art code knows, plus its colours. */
export interface Look { style: string; main: string; accent: string; extra?: string; }

export interface ItemBase {
  id: string; slot: Slot; name: string; look: Look; stats: Stats;
  minRarity?: number; weapon?: WeaponKind;
  set?: string; // part of a set (see SETS)
  blocks?: Slot; // e.g. enchanted underpants can't be worn with pants
  note?: string;
}

export const ITEM_BASES: ItemBase[] = [
  // weapons (damage is the base hit before kind multiplier)
  { id: 'rusty_blade', slot: 'weapon', name: 'Rusty Blade', weapon: 'sword', stats: { damage: 9 }, look: { style: 'sword', main: '#9c9282', accent: '#6b4a2e', extra: '#d8cfb8' } },
  { id: 'iron_sword', slot: 'weapon', name: 'Iron Sword', weapon: 'sword', stats: { damage: 10.5 }, look: { style: 'sword', main: '#c4c8cf', accent: '#7a5434', extra: '#e6ecf2' } },
  { id: 'viper_fang', slot: 'weapon', name: 'Viper Fang', weapon: 'dagger', minRarity: 1, stats: { damage: 10, crit: 3 }, look: { style: 'dagger', main: '#9ccf8a', accent: '#2e4a2a', extra: '#c8f0a8' } },
  { id: 'grave_cleaver', slot: 'weapon', name: 'Grave Cleaver', weapon: 'cleaver', minRarity: 1, stats: { damage: 11 }, look: { style: 'cleaver', main: '#8a8f99', accent: '#3b2a20', extra: '#d0d6de' } },
  { id: 'witchbane_saber', slot: 'weapon', name: 'Witchbane Saber', weapon: 'sword', minRarity: 2, stats: { damage: 12, critTime: 0.4 }, look: { style: 'sword', main: '#c9b6ff', accent: '#3a2e55', extra: '#b89cff' } },
  { id: 'moonsteel_edge', slot: 'weapon', name: 'Moonsteel Edge', weapon: 'sword', minRarity: 3, stats: { damage: 14, charge: 10 }, look: { style: 'sword', main: '#d6f0ff', accent: '#2e3961', extra: '#a8e4ff' } },
  // helmets
  { id: 'leather_cap', slot: 'helmet', name: 'Leather Cap', stats: { hp: 8 }, look: { style: 'cap', main: '#6e4a30', accent: '#a07040' } },
  { id: 'iron_helm', slot: 'helmet', name: 'Iron Helm', stats: { hp: 14, armor: 2 }, look: { style: 'helm', main: '#8890a0', accent: '#c9a24a' } },
  { id: 'horned_helm', slot: 'helmet', name: 'Horned Helm', minRarity: 1, stats: { hp: 12, rate: 5 }, look: { style: 'horned', main: '#5c6070', accent: '#d8ccb0' } },
  { id: 'witch_hat', slot: 'helmet', name: "Witch's Hat", minRarity: 2, stats: { hp: 6, critTime: 0.5, charge: 8 }, look: { style: 'witchhat', main: '#3a2a4a', accent: '#a68bff' } },
  // armor
  { id: 'wanderer_tunic', slot: 'armor', name: "Wanderer's Tunic", stats: { hp: 10 }, look: { style: 'tunic', main: '#a0302c', accent: '#3a2420' } },
  { id: 'leather_jerkin', slot: 'armor', name: 'Leather Jerkin', stats: { hp: 16, armor: 3 }, look: { style: 'jerkin', main: '#7a4b30', accent: '#c08a3e' } },
  { id: 'chainmail', slot: 'armor', name: 'Chainmail', minRarity: 1, stats: { hp: 22, armor: 6 }, look: { style: 'chain', main: '#7d8596', accent: '#6b4a2e' } },
  { id: 'knight_plate', slot: 'armor', name: 'Knight Plate', minRarity: 2, stats: { hp: 30, armor: 9, speed: -5 }, look: { style: 'plate', main: '#a9b2c3', accent: '#c9a24a' } },
  { id: 'witch_robe', slot: 'armor', name: "Witch's Robe", minRarity: 2, stats: { hp: 14, armor: 3, calm: 15, charge: 10 }, look: { style: 'robe', main: '#3a2a4a', accent: '#a68bff' } },
  // gloves
  { id: 'cloth_wraps', slot: 'gloves', name: 'Cloth Wraps', stats: { rate: 4 }, look: { style: 'wraps', main: '#b8ab90', accent: '#8a7a60' } },
  { id: 'leather_gloves', slot: 'gloves', name: 'Leather Gloves', stats: { rate: 6, crit: 2 }, look: { style: 'gloves', main: '#6e4a30', accent: '#a07040' } },
  { id: 'iron_gauntlets', slot: 'gloves', name: 'Iron Gauntlets', minRarity: 1, stats: { damage: 1.5, armor: 2 }, look: { style: 'gauntlets', main: '#8890a0', accent: '#c9a24a' } },
  { id: 'witch_claws', slot: 'gloves', name: "Witch's Claws", minRarity: 2, stats: { crit: 5, critTime: 0.3 }, look: { style: 'claws', main: '#3a2a4a', accent: '#c9b6ff' } },
  // pants
  { id: 'linen_trousers', slot: 'pants', name: 'Linen Trousers', stats: { hp: 6 }, look: { style: 'trousers', main: '#3a3230', accent: '#2a2220' } },
  { id: 'leather_breeches', slot: 'pants', name: 'Leather Breeches', stats: { hp: 10, speed: 3 }, look: { style: 'trousers', main: '#6e4a30', accent: '#c08a3e' } },
  { id: 'chain_leggings', slot: 'pants', name: 'Chain Leggings', minRarity: 1, stats: { hp: 14, armor: 3 }, look: { style: 'chainlegs', main: '#7d8596', accent: '#565c6e' } },
  { id: 'witch_skirt', slot: 'pants', name: "Witch's Skirt", minRarity: 2, stats: { hp: 8, calm: 10 }, look: { style: 'skirt', main: '#3a2a4a', accent: '#a68bff' } },
  // boots
  { id: 'sandals', slot: 'boots', name: 'Worn Sandals', stats: { speed: 4 }, look: { style: 'sandals', main: '#7a5a3a', accent: '#4a3324' } },
  { id: 'leather_boots', slot: 'boots', name: 'Leather Boots', stats: { speed: 7, hp: 4 }, look: { style: 'boots', main: '#5a3a26', accent: '#a07040' } },
  { id: 'iron_greaves', slot: 'boots', name: 'Iron Greaves', minRarity: 1, stats: { speed: 3, armor: 3, hp: 8 }, look: { style: 'greaves', main: '#8890a0', accent: '#c9a24a' } },
  { id: 'witch_shoes', slot: 'boots', name: "Witch's Pointed Shoes", minRarity: 2, stats: { speed: 9, critTime: 0.2 }, look: { style: 'pointy', main: '#2a2030', accent: '#a68bff' } },
  // special items: tattoos (math-flavoured bonuses)
  { id: 'rune_focus', slot: 'free', name: 'Rune of Focus', stats: { charge: 10 }, look: { style: 'rune', main: '#6fc0ff', accent: '#6fc0ff' } },
  { id: 'serpent_mark', slot: 'free', name: 'Serpent Mark', stats: { critTime: 0.4 }, look: { style: 'serpent', main: '#6fd08a', accent: '#6fd08a' } },
  { id: 'blood_sigil', slot: 'free', name: 'Blood Sigil', stats: { lifesteal: 1.5, damage: 1 }, look: { style: 'sigil', main: '#e0505a', accent: '#e0505a' } },
  { id: 'star_glyph', slot: 'free', name: 'Star Glyph', minRarity: 1, stats: { calm: 12, gold: 10 }, look: { style: 'star', main: '#f2d27a', accent: '#f2d27a' } },
  // special items: cloaks, scarves, tiaras, underpants…
  { id: 'tattered_scarf', slot: 'free', name: 'Tattered Scarf', stats: { speed: 3 }, look: { style: 'scarf', main: '#8a3a36', accent: '#5e2724' } },
  { id: 'travelers_cloak', slot: 'free', name: "Traveler's Cloak", stats: { hp: 8, speed: 3 }, look: { style: 'cloak', main: '#4a5a3a', accent: '#2e3824' } },
  { id: 'raven_cloak', slot: 'free', name: 'Raven Cloak', minRarity: 1, stats: { crit: 4, speed: 5 }, look: { style: 'cloak', main: '#2a2434', accent: '#6a5a8a' } },
  { id: 'silver_tiara', slot: 'free', name: 'Silver Tiara', minRarity: 2, stats: { charge: 12, calm: 10 }, look: { style: 'tiara', main: '#d8dce6', accent: '#6fc0ff' } },
  { id: 'enchanted_underpants', slot: 'free', name: 'Enchanted Underpants', minRarity: 3, blocks: 'pants', note: "So powerful you can't wear pants over them.",
    stats: { hp: 40, armor: 8, speed: 8 }, look: { style: 'underpants', main: '#e8c24a', accent: '#fff2b0' } },

  /* ---- sets (Epic and up; Wild Hunt from Rare). Colours: main = the material, accent = trim, extra = glow ---- */
  // Thornwood Warden: steel plate, moss-green cloth, green runes
  { id: 'warden_helm', slot: 'helmet', name: "Warden's Helm", set: 'warden', minRarity: 3, stats: { hp: 18, armor: 3 }, look: { style: 'warden_helm', main: '#9aa6b0', accent: '#4a7a3a', extra: '#8ef05a' } },
  { id: 'warden_plate', slot: 'armor', name: "Warden's Plate", set: 'warden', minRarity: 3, stats: { hp: 34, armor: 8 }, look: { style: 'warden_plate', main: '#4e5e6c', accent: '#4a7a3a', extra: '#8ef05a' } },
  { id: 'warden_gauntlets', slot: 'gloves', name: "Warden's Gauntlets", set: 'warden', minRarity: 3, stats: { damage: 1.5, armor: 3 }, look: { style: 'warden_gauntlets', main: '#9aa6b0', accent: '#4a7a3a', extra: '#8ef05a' } },
  { id: 'warden_legs', slot: 'pants', name: "Warden's Tassets", set: 'warden', minRarity: 3, stats: { hp: 16, armor: 4 }, look: { style: 'warden_legs', main: '#2e3338', accent: '#4a7a3a', extra: '#8ef05a' } },
  { id: 'warden_boots', slot: 'boots', name: "Warden's Sabatons", set: 'warden', minRarity: 3, stats: { speed: 4, armor: 3, hp: 10 }, look: { style: 'warden_boots', main: '#3a4248', accent: '#4a7a3a', extra: '#8ef05a' } },
  { id: 'warden_cloak', slot: 'free', name: "Warden's Mantle", set: 'warden', minRarity: 3, stats: { hp: 14, critTime: 0.4 }, look: { style: 'warden_cloak', main: '#2f4a2b', accent: '#6a9a4a', extra: '#8ef05a' } },
  { id: 'warden_sword', slot: 'weapon', name: "Warden's Broadsword", set: 'warden', weapon: 'sword', minRarity: 3, stats: { damage: 13.5, hp: 12 }, look: { style: 'broadsword', main: '#b8c4cc', accent: '#4a7a3a', extra: '#8ef05a' } },
  // Ashen Reaver: blackened iron, ember glow, horns and spikes
  { id: 'reaver_helm', slot: 'helmet', name: "Reaver's Horned Skull", set: 'reaver', minRarity: 3, stats: { hp: 12, crit: 3 }, look: { style: 'reaver_helm', main: '#3a3038', accent: '#8a3a24', extra: '#ff9a3a' } },
  { id: 'reaver_plate', slot: 'armor', name: "Reaver's Spiked Plate", set: 'reaver', minRarity: 3, stats: { hp: 26, armor: 5, damage: 1 }, look: { style: 'reaver_plate', main: '#3d343c', accent: '#8a3a24', extra: '#ff9a3a' } },
  { id: 'reaver_claws', slot: 'gloves', name: "Reaver's Claws", set: 'reaver', minRarity: 3, stats: { damage: 2, crit: 3 }, look: { style: 'reaver_claws', main: '#3a3038', accent: '#8a3a24', extra: '#ff9a3a' } },
  { id: 'reaver_legs', slot: 'pants', name: "Reaver's Greaves", set: 'reaver', minRarity: 3, stats: { hp: 14, rate: 4 }, look: { style: 'reaver_legs', main: '#332a30', accent: '#8a3a24', extra: '#ff9a3a' } },
  { id: 'reaver_boots', slot: 'boots', name: "Reaver's Spurs", set: 'reaver', minRarity: 3, stats: { speed: 6, damage: 0.8 }, look: { style: 'reaver_boots', main: '#2a1c20', accent: '#8a3a24', extra: '#ff9a3a' } },
  { id: 'reaver_cloak', slot: 'free', name: "Reaver's Ragged Cloak", set: 'reaver', minRarity: 3, stats: { crit: 4, speed: 4 }, look: { style: 'reaver_cloak', main: '#2a1c20', accent: '#6a3a2a', extra: '#ff9a3a' } },
  { id: 'reaver_axe', slot: 'weapon', name: 'Ashen Greataxe', set: 'reaver', weapon: 'axe', minRarity: 3, stats: { damage: 13, close: 10 }, look: { style: 'axe', main: '#c8ccd4', accent: '#3a2a24', extra: '#ff9a3a' } },
  // Starseer: midnight blue cloth, silver trim, starlight
  { id: 'seer_hood', slot: 'helmet', name: "Starseer's Hood", set: 'seer', minRarity: 3, stats: { hp: 8, charge: 8, critTime: 0.3 }, look: { style: 'seer_hood', main: '#2a2e5a', accent: '#8a8fc0', extra: '#d8e8ff' } },
  { id: 'seer_robe', slot: 'armor', name: "Starseer's Robe", set: 'seer', minRarity: 3, stats: { hp: 16, armor: 3, charge: 12, calm: 10 }, look: { style: 'seer_robe', main: '#2a2e5a', accent: '#8a8fc0', extra: '#d8e8ff' } },
  { id: 'seer_gloves', slot: 'gloves', name: "Starseer's Gloves", set: 'seer', minRarity: 3, stats: { critTime: 0.4, charge: 6 }, look: { style: 'seer_gloves', main: '#3a3e6a', accent: '#8a8fc0', extra: '#d8e8ff' } },
  { id: 'seer_skirt', slot: 'pants', name: "Starseer's Long Skirt", set: 'seer', minRarity: 3, stats: { hp: 10, calm: 12 }, look: { style: 'seer_skirt', main: '#232650', accent: '#8a8fc0', extra: '#d8e8ff' } },
  { id: 'seer_slippers', slot: 'boots', name: "Starseer's Slippers", set: 'seer', minRarity: 3, stats: { speed: 7, calm: 6 }, look: { style: 'seer_slippers', main: '#3a3e6a', accent: '#8a8fc0', extra: '#d8e8ff' } },
  { id: 'seer_mantle', slot: 'free', name: "Starseer's Mantle", set: 'seer', minRarity: 3, stats: { charge: 10, critTime: 0.3 }, look: { style: 'seer_mantle', main: '#1e2048', accent: '#8a8fc0', extra: '#d8e8ff' } },
  { id: 'seer_staff', slot: 'weapon', name: "Starseer's Staff", set: 'seer', weapon: 'staff', minRarity: 3, stats: { damage: 12, charge: 15 }, look: { style: 'staff', main: '#d8e8ff', accent: '#3a3050', extra: '#a8e4ff' } },
  // Wild Hunt: forest leather, fur and feathers
  { id: 'hunt_hood', slot: 'helmet', name: "Hunter's Hood", set: 'hunt', minRarity: 2, stats: { hp: 10, crit: 2 }, look: { style: 'hunt_hood', main: '#4a5a34', accent: '#c8b088', extra: '#e8d8a8' } },
  { id: 'hunt_jerkin', slot: 'armor', name: "Hunter's Jerkin", set: 'hunt', minRarity: 2, stats: { hp: 20, armor: 4, speed: 3 }, look: { style: 'hunt_jerkin', main: '#5a4a30', accent: '#c8b088', extra: '#e8d8a8' } },
  { id: 'hunt_bracers', slot: 'gloves', name: "Hunter's Bracers", set: 'hunt', minRarity: 2, stats: { rate: 6, crit: 2 }, look: { style: 'hunt_bracers', main: '#5a4a30', accent: '#8a6a40', extra: '#e8d8a8' } },
  { id: 'hunt_breeches', slot: 'pants', name: "Hunter's Breeches", set: 'hunt', minRarity: 2, stats: { hp: 10, speed: 4 }, look: { style: 'hunt_breeches', main: '#3a3a2c', accent: '#8a6a40', extra: '#e8d8a8' } },
  { id: 'hunt_boots', slot: 'boots', name: "Hunter's Fur Boots", set: 'hunt', minRarity: 2, stats: { speed: 8, hp: 6 }, look: { style: 'hunt_boots', main: '#4a3a26', accent: '#c8b088', extra: '#e8d8a8' } },
  { id: 'hunt_quiver', slot: 'free', name: "Hunter's Quiver", set: 'hunt', minRarity: 2, stats: { rate: 6, gold: 8 }, look: { style: 'hunt_quiver', main: '#6a4a2c', accent: '#c8b088', extra: '#e8d8a8' } },
  { id: 'hunt_spear', slot: 'weapon', name: "Hunter's Spear", set: 'hunt', weapon: 'spear', minRarity: 2, stats: { damage: 12, speed: 4 }, look: { style: 'spear', main: '#d0d8e0', accent: '#6a4a30', extra: '#e8d8a8' } },
];

export const baseById = (id: string) => ITEM_BASES.find(b => b.id === id)!;

export interface Item { uid: number; baseId: string; rarity: number; level: number; affixes: [Stat, number][]; }

/** Random bonus traits. Values are for Common; rarity scales them up. */
const AFFIX_RANGES: Record<Stat, [number, number]> = {
  damage: [0.8, 1.6], hp: [6, 12], armor: [2, 4], crit: [2, 4], critTime: [0.2, 0.4], charge: [5, 10],
  calm: [5, 12], speed: [3, 6], rate: [4, 8], gold: [5, 15], close: [10, 25], lifesteal: [0.5, 1.5],
};

const LEVEL_GROWTH = 1.1;

export function makeItem(baseId: string, rarity: number, uid: number): Item {
  const base = baseById(baseId);
  const pool = (Object.keys(AFFIX_RANGES) as Stat[]).filter(s => !(base.slot !== 'weapon' && s === 'damage' && Math.random() < 0.5));
  const affixes: [Stat, number][] = [];
  for (let i = 0; i < RARITIES[rarity].affixes; i++) {
    const s = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const [lo, hi] = AFFIX_RANGES[s];
    affixes.push([s, Math.round((lo + Math.random() * (hi - lo)) * RARITIES[rarity].mult * 10) / 10]);
  }
  return { uid, baseId, rarity, level: 0, affixes };
}

/** An item's total stats at its current level. */
export function itemStats(item: Item): Stats {
  const base = baseById(item.baseId), r = RARITIES[item.rarity];
  const grow = Math.pow(LEVEL_GROWTH, item.level);
  const out: Stats = {};
  for (const [k, v] of Object.entries(base.stats) as [Stat, number][]) out[k] = (out[k] ?? 0) + v * (v > 0 ? r.mult * grow : 1);
  for (const [k, v] of item.affixes) out[k] = (out[k] ?? 0) + v; // bonus traits are fixed on the item
  return out;
}

export interface HeroStats {
  damage: number; maxHp: number; damageTaken: number; critChance: number; critWindow: number;
  chargeMult: number; calm: number; moveMult: number; rateMult: number; goldMult: number; closeMult: number; lifesteal: number;
  weapon: WeaponKind;
}

/** How many pieces of each set are worn. */
export function setCounts(equipped: Item[]): Record<string, number> {
  const n: Record<string, number> = {};
  for (const it of equipped) { const set = baseById(it.baseId).set; if (set) n[set] = (n[set] ?? 0) + 1; }
  return n;
}
/** The set bonuses currently active, as one stat sum. */
export function setBonusStats(equipped: Item[]): Stats {
  const out: Stats = {};
  for (const [id, count] of Object.entries(setCounts(equipped))) for (const [need, stats] of SETS[id].bonuses) if (count >= need)
    for (const [k, v] of Object.entries(stats) as [Stat, number][]) out[k] = (out[k] ?? 0) + v;
  return out;
}

/** Combine everything the hero wears into the numbers the game uses. */
export function heroStats(equipped: Item[]): HeroStats {
  const sum: Stats = {};
  for (const it of equipped) for (const [k, v] of Object.entries(itemStats(it)) as [Stat, number][]) sum[k] = (sum[k] ?? 0) + v;
  for (const [k, v] of Object.entries(setBonusStats(equipped)) as [Stat, number][]) sum[k] = (sum[k] ?? 0) + v;
  const weaponItem = equipped.find(i => baseById(i.baseId).slot === 'weapon');
  const kind = weaponItem ? baseById(weaponItem.baseId).weapon! : 'sword';
  const k = WEAPON_KIND[kind];
  const g = (s: Stat) => sum[s] ?? 0;
  return {
    weapon: kind,
    damage: Math.max(5, g('damage')) * k.damage,
    maxHp: Math.round(70 + g('hp')), // base 70 (was 100, then 90): runs should feel dangerous
    damageTaken: Math.max(0.4, 1 - g('armor') / 100),
    critChance: Math.min(0.35, 0.14 + g('crit') / 100),
    critWindow: Math.min(9.5, 6.5 + g('critTime')),
    chargeMult: Math.min(1.8, 1 + g('charge') / 100),
    calm: Math.min(0.6, g('calm') / 100),
    moveMult: Math.max(0.6, 1 + g('speed') / 100),
    rateMult: (1 + g('rate') / 100) * k.rate,
    goldMult: 1 + g('gold') / 100,
    closeMult: Math.min(1.8, 1 + g('close') / 100),
    lifesteal: g('lifesteal') / 100,
  };
}

/** One number for the whole kit, for the Bag header. Roughly: damage output + survivability + math bonuses. */
export function heroPower(st: HeroStats): number {
  const offence = st.damage * st.rateMult * (1 + st.critChance * 3) * 10;
  const defence = st.maxHp / st.damageTaken / 2;
  const bonuses = (st.chargeMult + st.calm + st.closeMult + st.goldMult + st.moveMult - 4) * 120 + (st.critWindow - 6.5) * 25 + st.lifesteal * 400;
  return Math.round(offence + defence + bonuses);
}

/* ---------------- economy ---------------- */
export const sellValue = (it: Item) => Math.round(8 * Math.pow(it.rarity + 1, 2) * (1 + it.level * 0.3));
export const salvageValue = (it: Item) => (it.rarity + 1) * 3 + it.level;

/** Forge cost for upgrading this item by `size` levels: gold + scrap. */
export function forgeCost(it: Item, size: number) {
  let gold = 0, scrap = 0;
  for (let i = 0; i < size; i++) {
    const lv = it.level + i;
    gold += Math.round(18 * Math.pow(1.28, lv) * (1 + it.rarity * 0.4));
    scrap += lv + 1;
  }
  return { gold, scrap };
}
export const maxLevel = (it: Item) => RARITIES[it.rarity].maxLevel;

/* ---------------- chests ---------------- */
export type ChestKind = 'wood' | 'iron' | 'gilded';
export const CHESTS: Record<ChestKind, { name: string; bonus: number; minRarity: number }> = {
  wood: { name: 'Wooden Chest', bonus: 0, minRarity: 0 },
  iron: { name: 'Iron Chest', bonus: 0.12, minRarity: 0 },
  gilded: { name: 'Gilded Chest', bonus: 0.22, minRarity: 1 },
};

/** Harder problems give better loot. */
export const TIER_QUALITY = [0, 0.35, 0.55, 0.8, 1];

/**
 * How well you answered, 0..1. Exact is best; a close answer still scores
 * well, and the closer it is, the better. Far off still gives a little.
 */
export function answerQuality(kind: 'exact' | 'close' | 'miss', relError: number): number {
  if (kind === 'exact') return 1;
  return Math.max(0.1, Math.min(0.85, 0.85 - relError * 6));
}

/** Chance of each rarity for a given loot quality q (0..~1.2). */
export function rarityOdds(q: number, minRarity = 0): number[] {
  const w = [1, 0.15 + 1.2 * q, 0.03 + 0.9 * q * q, 0.005 + 0.45 * q ** 3, 0.001 + 0.12 * q ** 4];
  for (let i = 0; i < minRarity; i++) w[i] = 0;
  const total = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / total);
}

export function rollLoot(q: number, chest: ChestKind, uid: number): Item {
  const odds = rarityOdds(q + CHESTS[chest].bonus, CHESTS[chest].minRarity);
  let r = Math.random(), rarity = odds.findIndex(o => o > 0);
  for (let i = 0; i < odds.length; i++) { r -= odds[i]; if (r <= 0) { rarity = i; break; } }
  const bases = ITEM_BASES.filter(b => (b.minRarity ?? 0) <= rarity && b.id !== 'rusty_blade');
  // rarer bases (higher minRarity) are a bit more likely when the roll allows them; set pieces share one slice
  const weights = bases.map(b => (1 + (b.minRarity ?? 0) * 0.6) * (b.set ? 0.5 : 1));
  let x = Math.random() * weights.reduce((a, b) => a + b, 0);
  const base = bases.find((_, i) => (x -= weights[i]) <= 0) ?? bases[0];
  return makeItem(base.id, rarity, uid);
}
