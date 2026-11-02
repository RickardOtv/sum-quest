// Dev-only gear preview: open /dev/preview.html while `npm run dev` runs.
// Shows every item's icon, each set in all directions, and an outfit builder to check how pieces mix.
import { loadAdventurerImages, skinnedFrame, cropFrame, type Anim, type Dir } from '../src/game/art/adventurer';
import type { Skin } from '../src/game/art/adventurer';
import { ITEM_BASES, RARITIES, SETS, SLOTS, type Look, type Slot } from '../src/game/items';
import { lookIcon } from '../src/state/gear';

await loadAdventurerImages();

const POSES: [Anim, Dir, number, string][] = [['idle', 'down', 0, 'front'], ['idle', 'right', 0, 'side'], ['idle', 'up', 0, 'back'], ['run', 'right', 2, 'run'], ['attack1', 'down', 5, 'attack'], ['attack1', 'right', 4, 'attack side'], ['attack1', 'up', 4, 'attack back']];
const skinOf = (ids: Partial<Record<Slot, string>>): Skin => {
  const looks: Record<string, Look> = {}; let weapon: Look | undefined, kind: string | undefined;
  for (const [slot, id] of Object.entries(ids)) { const b = ITEM_BASES.find(b => b.id === id); if (!b) continue; if (slot === 'weapon') { weapon = b.look; kind = b.weapon; } else looks[slot] = b.look; }
  return { looks, weapon, hideWeapon: kind === 'axe' || kind === 'staff' || kind === 'spear' };
};
function poseRow(skin: Skin, scale = 4): HTMLElement {
  const row = document.createElement('div'); row.className = 'row';
  for (const [anim, dir, f, label] of POSES) {
    const cell = document.createElement('div'); cell.className = 'cell';
    cell.appendChild(cropFrame(skinnedFrame(anim, dir, f, skin), 24, 12, 48, 50, scale));
    const s = document.createElement('small'); s.textContent = label; cell.appendChild(s); row.appendChild(cell);
  }
  return row;
}

// sets
const setsEl = document.getElementById('sets')!;
for (const set of Object.values(SETS)) {
  const ids: Partial<Record<Slot, string>> = {}; for (const b of ITEM_BASES) if (b.set === set.id) ids[b.slot] = b.id;
  const h = document.createElement('h2'); h.textContent = set.name; h.style.color = '#b8b0c8'; setsEl.appendChild(h); setsEl.appendChild(poseRow(skinOf(ids), 3));
}

// every item icon (the same function the Bag uses)
const itemsEl = document.getElementById('items')!;
for (const b of ITEM_BASES) {
  const el = document.createElement('div'); el.className = 'item'; el.style.setProperty('--rc', RARITIES[b.minRarity ?? 0].color);
  el.appendChild(lookIcon(b.slot, b.look, 2)); const span = document.createElement('span'); span.textContent = `${b.name}${b.set ? ' · ' + SETS[b.set].name : ''}`; el.appendChild(span); itemsEl.appendChild(el);
}

// outfit builder
const builder = document.getElementById('builder')!, built = document.getElementById('built')!;
const choice: Partial<Record<Slot, string>> = { weapon: 'iron_sword' };
const render = () => { built.innerHTML = ''; built.appendChild(poseRow(skinOf(choice), 4)); };
for (const slot of SLOTS) {
  const sel = document.createElement('select');
  sel.innerHTML = `<option value="">— ${slot} —</option>` + ITEM_BASES.filter(b => b.slot === slot).map(b => `<option value="${b.id}" ${choice[slot] === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
  sel.addEventListener('change', () => { if (sel.value) choice[slot] = sel.value; else delete choice[slot]; render(); });
  builder.appendChild(sel);
}
render();
