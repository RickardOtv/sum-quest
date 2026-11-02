/**
 * Player save data, stored in the browser (localStorage).
 * Everything the player keeps between runs lives here.
 */
import { bindSkills, migrateSkills, type Skills } from '../math/mastery';
import { CATEGORIES, setCurrency, type Category } from '../math/problems';
import type { Adaptive } from '../math/adaptive';
import { CONFIG } from '../config';
import { CHESTS, ITEM_BASES, baseById, makeItem, type ChestKind, type Item, type Slot } from '../game/items';
import { STARTER_SKILLS, type NodeId, type SkillEffect } from '../game/skills';

export interface Loadout { name: string; skills: (SkillEffect | null)[]; gear: Partial<Record<Slot, number>>; }

export interface SaveData {
  version: 2;
  gold: number;
  scrap: number;                         // from salvaging items, used by the Forge
  inventory: Item[];                     // every item you own (equipped ones too)
  equipped: Partial<Record<Slot, number>>; // slot → item uid
  chests: ChestKind[];                   // unopened chests
  tree: Partial<Record<NodeId, number>>; // skill-tree node → level (missing = locked)
  skillPoints: number;                   // unspent points
  pointsEarned: string[];                // ids of one-time point sources already claimed (lessons, streak milestones)
  equippedSkills: (SkillEffect | null)[]; // one entry per slot (Space, E); null = empty
  loadouts: (Loadout | null)[];          // 3 preset slots: skills + gear together
  respecs: number;                       // times the tree has been reset (price rises each time)
  nextUid: number;
  bestRoom: number;
  clears: number;
  skills: Skills;
  practiceByDay: Record<string, number>; // "YYYY-MM-DD" → seconds spent solving
  streak: { lastDay: string | null; count: number };
  trainingByDay: Record<string, string[]>;
  totals: { answered: number; exact: number };
  adaptive: Record<Category, Adaptive>;      // difficulty level + running accuracy per category
  calibration: { sureN: number; sureOk: number; unsureN: number; unsureOk: number }; // "Sure / Not sure" vs actual
  sprint: { best: number; history: { day: string; score: number }[] }; // 60-second Sprint results
  currency: string;
  seenIntro: boolean;
}

const freshAdaptive = () => Object.fromEntries(CATEGORIES.map(c => [c, { level: 1, acc: 0.82, n: 0 }])) as Record<Category, Adaptive>;

const KEY = 'sumquest-save-v1';

function starterKit(): Pick<SaveData, 'inventory' | 'equipped' | 'nextUid'> {
  const ids: [Slot, string][] = [['weapon', 'rusty_blade'], ['armor', 'wanderer_tunic'], ['pants', 'linen_trousers'], ['boots', 'sandals'], ['free', 'tattered_scarf']];
  const inventory = ids.map(([, id], i) => makeItem(id, 0, i + 1));
  const equipped: Partial<Record<Slot, number>> = {};
  ids.forEach(([slot], i) => { equipped[slot] = i + 1; });
  return { inventory, equipped, nextUid: ids.length + 1 };
}

const fresh = (): SaveData => ({
  version: 2, gold: 0, scrap: 0, ...starterKit(), chests: ['wood'], tree: Object.fromEntries(STARTER_SKILLS.map(s => [s, 1])), skillPoints: 0, pointsEarned: [], equippedSkills: [...STARTER_SKILLS], loadouts: [null, null, null], respecs: 0, bestRoom: 0, clears: 0,
  skills: {}, practiceByDay: {}, streak: { lastDay: null, count: 0 }, trainingByDay: {},
  totals: { answered: 0, exact: 0 }, adaptive: freshAdaptive(), calibration: { sureN: 0, sureOk: 0, unsureN: 0, unsureOk: 0 },
  sprint: { best: 0, history: [] }, currency: '€', seenIntro: false,
});

export let save: SaveData = fresh();

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const old = JSON.parse(raw);
      const base = fresh();
      // only known fields are kept, so leftovers from older versions don't pile up
      save = { ...base, ...Object.fromEntries(Object.entries(old).filter(([k]) => k in base)) } as SaveData;
      if (old.version !== 2) migrateFromV1(old);
      if (Array.isArray(old.knownSkills)) { // v0.4: skills were unlocked by lessons, no tree yet
        for (const id of old.knownSkills as SkillEffect[]) save.tree[id] = Math.max(1, save.tree[id] ?? 0);
        delete (save as unknown as Record<string, unknown>).knownSkills;
      }
      sanitize();
      persist();
    }
  } catch { /* private mode or blocked storage: play without saving */ }
  bindSkills(save.skills);
  setCurrency(save.currency);
}

/**
 * Repair anything a save can't be trusted on: equipped ids of items that were sold,
 * skill slots pointing at locked skills, a missing weapon, malformed loadouts, NaNs.
 */
function sanitize() {
  // v0.14: the tattoo slot became part of Special items; a worn tattoo moves there if that slot is free
  const eq = save.equipped as Record<string, number | undefined>;
  if (eq.tattoo !== undefined) { if (save.equipped.free === undefined) save.equipped.free = eq.tattoo; delete eq.tattoo; }
  for (const lo of save.loadouts ?? []) if (lo?.gear) { const g = lo.gear as Record<string, number | undefined>; if (g.tattoo !== undefined) { if (g.free === undefined) g.free = g.tattoo; delete g.tattoo; } }
  save.inventory = save.inventory.filter(i => ITEM_BASES.some(b => b.id === i.baseId)); // items from removed bases
  const owns = (uid?: number) => uid !== undefined && save.inventory.some(i => i.uid === uid);
  for (const slot of Object.keys(save.equipped) as Slot[]) if (!owns(save.equipped[slot])) delete save.equipped[slot];
  if (!save.equipped.weapon) {
    const w = save.inventory.find(i => baseById(i.baseId).slot === 'weapon');
    if (w) save.equipped.weapon = w.uid;
    else { const it = makeItem('rusty_blade', 0, save.nextUid++); save.inventory.push(it); save.equipped.weapon = it.uid; }
  }
  for (const id of STARTER_SKILLS) save.tree[id] = Math.max(1, save.tree[id] ?? 0);
  const seen = new Set<string>();
  save.equippedSkills = [0, 1].map(i => { const id = save.equippedSkills[i]; if (!id || !(save.tree[id]! > 0) || seen.has(id)) return null; seen.add(id); return id; });
  save.chests = save.chests.filter(c => c in CHESTS);
  if (!Array.isArray(save.loadouts)) save.loadouts = [null, null, null];
  while (save.loadouts.length < 3) save.loadouts.push(null);
  for (const k of ['gold', 'scrap', 'skillPoints', 'respecs', 'bestRoom', 'clears', 'nextUid'] as const) if (!Number.isFinite(save[k])) save[k] = k === 'nextUid' ? save.inventory.length + 1 : 0;
  save.nextUid = Math.max(save.nextUid, ...save.inventory.map(i => i.uid + 1));
  // v0.8 additions: fill in anything missing or malformed
  migrateSkills(save.skills);
  const ad = freshAdaptive();
  for (const c of CATEGORIES) {
    const a = { ...ad[c], ...(save.adaptive?.[c] ?? {}) };
    if (!Number.isFinite(a.level) || a.level < 1 || a.level > 4) a.level = 1;
    if (!Number.isFinite(a.acc)) a.acc = 0.82;
    if (!Number.isFinite(a.n)) a.n = 0;
    ad[c] = a;
  }
  save.adaptive = ad;
  const cal = (save.calibration ?? {}) as Partial<SaveData['calibration']>;
  save.calibration = { sureN: cal.sureN ?? 0, sureOk: cal.sureOk ?? 0, unsureN: cal.unsureN ?? 0, unsureOk: cal.unsureOk ?? 0 };
  const sp = (save.sprint ?? {}) as Partial<SaveData['sprint']>;
  save.sprint = { best: Number.isFinite(sp.best) ? sp.best! : 0, history: Array.isArray(sp.history) ? sp.history : [] };
}

/** v0.1 had one sword level and one armor level: carry them onto the starter gear. */
function migrateFromV1(old: { swordLevel?: number; armorLevel?: number }) {
  save.version = 2;
  const kit = starterKit();
  save.inventory = kit.inventory; save.equipped = kit.equipped; save.nextUid = kit.nextUid;
  const lift = (uid: number, lv = 0) => { const it = save.inventory.find(i => i.uid === uid)!; it.rarity = lv > 5 ? 1 : 0; it.level = Math.min(lv, 8); };
  lift(save.equipped.weapon!, old.swordLevel); lift(save.equipped.armor!, old.armorLevel);
  save.chests = ['iron'];
  persist();
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

/* ---- backup codes: move a save to another phone/browser by copy-paste ---- */
const CODE_PREFIX = 'SQ1-';
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  return new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());
}

/** The whole save as one text code (gzip + base64). */
export async function exportSaveCode(): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(save));
  const packed = await pipe(json, new CompressionStream('gzip'));
  let s = ''; // chunked, so a long save doesn't overflow String.fromCharCode's argument limit
  for (let i = 0; i < packed.length; i += 0x8000) s += String.fromCharCode(...packed.subarray(i, i + 0x8000));
  return CODE_PREFIX + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Replace this device's save with the one in `code`. Throws if the code isn't a Sum Quest save. */
export async function importSaveCode(code: string) {
  const clean = code.trim().replace(/\s+/g, '');
  if (!clean.startsWith(CODE_PREFIX)) throw new Error('not a save code');
  const json = new TextDecoder().decode(await pipe(fromB64(clean.slice(CODE_PREFIX.length)), new DecompressionStream('gzip')));
  const data = JSON.parse(json);
  if (typeof data !== 'object' || !data || !('gold' in data) || !('skills' in data)) throw new Error('not a save code');
  localStorage.setItem(KEY, json); // loadSave() repairs and migrates it on the next start
}

export function resetSave() {
  save = fresh();
  save.seenIntro = true;
  bindSkills(save.skills);
  persist();
}

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

/** Add solving time to today. Returns true the moment today's goal is reached (and grants a chest). */
export function addPractice(seconds: number): boolean {
  const today = dayKey(), before = save.practiceByDay[today] ?? 0;
  save.practiceByDay[today] = before + seconds;
  if (before < CONFIG.dailyGoalSec && before + seconds >= CONFIG.dailyGoalSec) {
    save.streak.count = save.streak.lastDay === yesterday() ? save.streak.count + 1 : 1;
    save.streak.lastDay = today;
    save.chests.push('wood');
    return true;
  }
  return false;
}

export function currentStreak(): number {
  const last = save.streak.lastDay;
  return last === dayKey() || last === yesterday() ? save.streak.count : 0;
}
