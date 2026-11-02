# Sum Quest

A dark-fantasy action game (Archero-style) that trains fast everyday mental math.
Dodge and position to fight; math is your power: crits, specials, the forge and training rooms.

## Run it

```bash
npm install
npm run dev          # opens on http://localhost:5173 (and on your phone via the network URL)
npm run build        # type-check + production build in dist/
npm run build:single # one self-contained HTML file in dist-single/
```

Controls in camp: drag to walk or tap a place to walk there (WASD/arrows on desktop), E/Enter = use the station
you're standing at, I = Bag (big button top left), Esc = close a panel. Settings (currency, reset, credits) are behind
the cog, top right. In a run: drag to move, stand still to attack,
Space / E = skill 1 / 2, 1–3 = crit answer, digits + Enter = typed answers, Esc = pause.
Dev shortcuts (only with `npm run dev`): `?boss` jumps to the boss, `?super` makes every crit a super crit.

## Publishing (Cloudflare)

The game is a static site: Cloudflare runs `npm run build` on every push to `main` and publishes `dist/`.
It's an installable web app: on iPhone, Safari → ••• → Share → Add to Home Screen gives it an icon,
full screen and an offline copy (`sw.js`, written at build time by `scripts/sw-plugin.ts`).

- `public/manifest.webmanifest` name, colours and icons for the home screen
- `public/icons/` app icons, made by `python3 scripts/make_icons.py` from the hero sprite
- `public/_headers` cache rules (the page and `sw.js` are always re-checked, so updates arrive on the next start)
- `wrangler.jsonc` Cloudflare settings (the site is the `dist/` folder)
- `src/pwa.ts` service worker registration, "installed?" checks, Android's install prompt
- `src/ui/install.ts` the "Add to your home screen" tip in camp and the steps sheet

Privacy: no cookies, no accounts, no tracking. The save is in localStorage on the device (needed for the game
itself, so no consent banner). Fonts are bundled (no Google Fonts requests). Settings → Backup save makes a code
that moves progress to another device.

## Where things live

```
src/
  config.ts              all balance numbers (damage, HP, crit chance, costs…)
  main.ts                boots Phaser and switches between the camp (HubScene) and runs
  math/
    problems.ts          27 problem types in 4 tiers + worked solutions + answer checking + the picker
    mastery.ts           memory model (half-life forgetting curve), per-skill stats, overlearning cap
    adaptive.ts          difficulty per category (aims for ~85% right) and the "next run focuses on" plan
    tricks.ts            training lessons (mental-math shortcuts)
  game/
    items.ts             gear: 8 slots, item bases, sets + set bonuses, rarity, affixes, chests, hero stats
    run.ts               run state (one journey: 10 rooms of Thornwood, then 10 of Emberfall), door choices, which enemies a room spawns
    zones.ts             the zones in order: their enemies, mini boss, boss, colours, difficulty and reward multipliers
    room.ts              forest room layouts: themed props (rocks, trees, pits…) + decoration; also every prop's colliders
    village.ts           Emberfall room maps: hand-made maps (street, square, farmstead, chapel, burnt row, plaza) + random bits
    skills.ts            special skills, levels, and the three-branch skill tree
    perks.ts             run powers
    entities/enemies.ts  enemy behaviour (slime, spore-cap, wisp, boar, Old Tusk, Old Rootback; ember imp, cinder hound, Cinderjaw, the Cinder Golem)
    scenes/HubScene.ts   the camp: walk to the anvil (Forge), yard (Training), board (Progress), stone (skills) or the path north (run)
    scenes/RunScene.ts   the action: movement, attacks, crits, specials, rooms
    scenes/BootScene.ts  builds textures
    art/camp.ts          camp art: trees, campfire, stations, the three characters (Brannoc, Ysolde, Old Ferrin), ground
    art/world.ts         the world's look: bright palette, coloured outlines, HD helpers (5-tone blobs, foliage, grain, strokes), grass / bush-wall / shadow painters
    art/villagehd.ts     Emberfall (HD): houses (standing and burnt), ruins, chapel, well, stalls, carts, hay, lamps, graves, rubble, fire, the doorway; imp, hound, Cinderjaw, Golem
    art/village.ts       Emberfall's ground: cobbles, yards, scorch marks, the village edge above the doors
    art/creatures.ts     Thornwood's enemies (HD): slime, spore-cap, wisp, boar, Old Tusk, Old Rootback
    art/props.ts         room props: leafy trees, pines, rocks, boulders, stumps, logs, pillars, a stone wall, crates, barrels, fences, pits, bushes, flowers
    art/adventurer.ts    the hero sprite (Mattz Art's Adventurer, see Credits): loads the sheets, dresses every frame, builds animations
    art/adventurer/      the 16 sprite sheets (idle, run, attack 1–2 × four directions)
    art/paperdoll.ts     reads each frame back into body parts (head, torso, hands, legs, feet) and dresses it: recolours + stamped pieces
    art/gear.ts          every gear STYLE: which regions it recolours and the pixel pieces it adds (pauldrons, visors, capes…)
    art/weapons.ts       finds the sword in attack frames and redraws the equipped weapon along the same swing line
    art/hero.ts          the old code-drawn hero, still used for item icons; weapons; chests
    art/pixels.ts        tiny pixel-drawing helper (auto outline, shading)
    art/sprites.ts       enemies and icons as text pixel art
    art/textures.ts      turns art into Phaser textures, paints floors/effects
  state/
    save.ts              save data in localStorage, daily goal + streak
    answers.ts           records every answer (mastery, totals, practice time)
    gear.ts              inventory: equip, sell, salvage, open chests, hero portrait, stats incl. passives
    points.ts            skill points: sources, spending, node requirements
  ui/                    HTML menus and prompts on top of the game
    camp.ts              the panels that open from camp stations (Bag, Forge, Training yard, Notice board, Meditation stone) + "head out"
    hub.ts               the thin overlay on the camp: Bag button, gold/streak chips, settings cog, the "Use" prompt
    settings.ts          the settings sheet (currency, reset, credits)
    progress.ts          the notice board: pinned notes + Focus / Skills / Tables / Records tabs with small SVG charts
    loot.ts  runUI.ts  training.ts  styles.css
    sprint.ts            the 60-second Sprint (fixed-time benchmark, personal best → chest)
    icons.ts             interface icons (game-icons.net, see Credits): gi('name') for HTML, SLOT_ICON per gear slot
    icons.data.ts        the SVGs we use, generated by scripts/icons.mjs (add a name there and run it to add an icon)
    dom.ts               shared pieces: sheets, keypad, the one typed-answer prompt (askTyped, with the optional confidence check), key handling
dev/preview.html         gear preview: outfit builder, every set in all directions, every item icon (open while `npm run dev` runs)
```

## HD art

The world (props, buildings, enemies, floors, the camp ground) is drawn at **2× detail and shown at scale 1**, so its
pixels are half the size of the old ones (closer to Cainos' "Pixel Art Top Down" packs): 5-tone shading lit from the
top-left, canopies built from many small leaf clusters lit as one shape, bark/wood/stone grain, 1-px coloured
outlines. Floors are painted at full screen resolution. The hero (the Adventurer sprite) and the camp stations
still use the original 2× pixels.

## A run

A run is one journey: **ten rooms in Thornwood, then ten in Emberfall.** There's no choosing Emberfall: when Old
Rootback falls you get his gilded chest and a skill point, and the only door left leads out of the forest. Walking
through it heals 30% and drops you into the burning village (rooms count 1–10 again, the top bar says which zone).

**Emberfall** (`game/zones.ts`, `game/village.ts`, art in `game/art/village.ts`) is the village past the forest, empty
of people and still burning, in the same cozy palette as the forest. Enemies have 1.55× HP and come in bigger groups,
gold is 1.6×, chests are more often iron. Ember imps hover and throw three fireballs; cinder hounds charge like boars
but faster. Room 5 is **Cinderjaw**, a burning hound whose charge leaves a trail of fire (it bursts a moment later);
room 10 is **the Cinder Golem**, which fires embers, calls imps and marks the ground with fire rings. Each village
room starts from a hand-made map (main street, village square with the well, farmstead, chapel and graveyard, burnt
row; an open plaza for the two big fights). Random each time: which houses still stand and which burned (and their
roof colours), which barrels, crates, carts, haystacks and lamps are there and where exactly, and where fires still
burn. Every layout is checked so you can always walk from the start to the doors (6,000 generated rooms, none
blocked). Houses, the chapel, the well, carts and stalls block walking and shots; rubble and burning rubble only block
walking. Dev shortcut: `?zone=emberfall` (add `&boss` for the Golem).

**Thornwood:** After each room you pick the next door; each door shows its reward (big icon) and danger
(skulls). **Room 5** is Old Tusk, a huge boar that charges twice and sprays thorns when it hits a wall; beat it and
choose: heal 40% or an iron chest. **Room 10** is Old Rootback, behind its own gate; besides its bullet patterns it
now and then marks the ground under you and roots burst up a moment later: move out of the red rings. Thornback
boars (from room 3) lower their heads and show a red line before charging. Healing is scarce on purpose: no free
heal between rooms, heal doors are rare (a bit less rare when you're under half HP, never twice in a row), and the
Second Wind power only shows up when you're hurt. Numbers live in `config.ts`.

In-run text (damage numbers, banners, door labels) is HTML over the canvas, so it's sharp on high-DPI phones.
Your health is a small bar over the hero (a tick every 20 HP); the top of the screen only shows the room track and gold.

**Rooms aren't empty fields** (`game/room.ts`, art in `game/art/props.ts`): each room picks a theme (grove, ruins,
rocky, bog) and places 4–9 props plus decoration. Rocks, boulders, trees, stumps, logs and pillars block walking,
your slashes and enemy bullets, so use them as cover; pits block walking but shots fly over; wisps float over
everything; a charging boar that hits a prop is dazed. The layout always keeps your start and the door strip clear,
with room to walk between props (checked over 2,000 generated rooms).

## The camp

The menu between runs is a place: a camp at the forest edge with a fire in the middle. Walk up to a
station (or tap it to walk there) and a prompt appears; tap it or press E:
- **Anvil** (Brannoc the smith) → Forge · **Training dummy** (Ysolde) → lessons and the Sprint
- **Notice board** → Progress (a cork strip with streak, today's goal and overall mastery; tabs: Focus, Skills, Tables, Records) · **Meditation stone** (Old Ferrin) → skills, the tree, Rebirth, loadouts
- **Bag** button (top right, or I) → chests, what you wear, inventory · **Path north** → head out (start a run)

Stations are a list in `HubScene.layout()`, so a shop stall or a new character is one entry plus its art.
The hero's look in camp updates the moment you equip something.

## How gear is drawn

The hero is one sprite with one outfit baked in, so gear is applied per frame (`game/art/paperdoll.ts`):
1. `findParts` reads the frame's palette back into body parts: head, torso, each hand, leg and foot.
2. A gear **style** (`game/art/gear.ts`) recolours regions (tunic, trousers, hands, hair…) with the item's colours so
   the piece follows the pose exactly, and may add a `pattern` (chain, plate).
3. Styles can also stamp **pieces**: small text-row pixel drawings anchored to a part (e.g. a pauldron at the torso's
   top-left, a visor at the head's top), drawn for down / up / right (left is mirrored). `under` pieces fill only empty
   pixels, so capes sit behind the body. Full helms set `clearHair` and draw the whole head shape.
4. **Weapons** (`game/art/weapons.ts`): in attack frames the base sword is found by its colours, the grip and tip give the
   swing line, the sword is erased (holes over the body are in-painted) and the equipped weapon is drawn along that line.
   A weapon is a few numbers (`grip`, `guard`, `blade`, `width`, `taper`, optional `head`: axe / mace / leaf / orb / hook).

Every slot is independent, so any helmet works with any chest piece. **Sets** (`SETS` in `game/items.ts`) are seven
items (six wearables + a weapon) that share a look and give bonuses at 2 / 4 / 6 pieces worn: Thornwood Warden (steel
and moss, defensive), Ashen Reaver (black iron and embers, damage), Starseer (midnight robes, magic), Wild Hunt (leather
and fur, speed; drops from Rare, the others from Epic). Item icons are the piece worn on a grey body, zoomed on the part.
To add an item: a base in `game/items.ts` with a `look` (style + colours, optional `set`); if it needs a new shape, a
style in `gear.ts` (or a weapon in `weapons.ts`). `dev/preview.html` shows everything while `npm run dev` runs.

## Skills and the skill tree

Special skills are typed-answer spells. Each one asks a specific kind of math (Ward = easy
add/subtract, Executioner's Mark = hard multiply/divide…) and does one thing. You equip two
(Space / E); each has its own charge meter that fills over time and per hit (casting one never
sets the other back), each skill has its own recharge time (Second Sight 20 s … Mend and Meteor 40 s of combat), and time freezes while you type.

The skill tree (Meditation stone → Skill tree) has three branches, five nodes each, unlocked top to
bottom, one skill point per node:
- **Striker** (damage): Chain Lightning → Sharpened → Executioner's Mark → Overcharge → Meteor
- **Warden** (survival): Ward → Vigor → Mend → Thick Skin → Second Sight
- **Tactician** (control): Nova → Keen Eye → Frost Field → Clear Mind → Time Rift

Skills level 1–5 (+15% effect, 5% faster recharge per level); passives are permanent stat boosts.
Points come from finishing a Training lesson with 3/4 right (once per lesson), every boss
kill, and streak milestones (3, 7, 14, 30 days). Logic lives in `game/skills.ts` and
`state/points.ts`.

**Rebirth** (refund all points, starters stay at Lv 1) unlocks after the first boss kill and
costs 150 gold, rising by 150 each time. **Loadouts** (Meditation stone) store three presets of
skills + all gear slots, with names; items sold since are skipped when applying.

## Loot

Slots: weapon, helmet, armor, gloves, pants, boots and **Special items** (cloaks, tattoos,
tiaras, quivers, Enchanted Underpants that block pants…). Items have rarity (Common →
Legendary), level, stats, bonus traits and their own look; set pieces add set bonuses. Chests come from chest
doors, Old Tusk, the boss, the daily 3-minute goal and Sprint records. Chests found in a run are opened right away,
at the end of the room, so they never pile up into a wall of math later. To open one you solve a problem:
harder problems and closer answers give better odds, exact is best. Spare items
can be sold (gold) or salvaged (scrap for the Forge).

## How the learning engine works

- **Memory model** (`math/mastery.ts`): every skill (a fact like 7×8, or a problem type like "15% tip") has a
  half-life. Recall right now = 2^(−hours since last seen / half-life). A fast correct answer stretches the
  half-life (most when the item was about to be forgotten), a miss shrinks it to a few hours. The picker weights
  items by how much they're fading, so what comes back is what you're about to forget.
- **Overlearning cap**: a fact you answered fluently while it was fresh in mind is nearly skipped for the rest of
  the session (problem types after three such answers). Extra reps on things you already know add little.
- **Adaptive difficulty** (`math/adaptive.ts`): each category has a level 1–4. Running accuracy ≥ 90% raises it,
  ≤ 72% lowers it, so you sit near the ~85% success rate where learning is fastest. Crits take their tier from
  it (harder crit = longer window, more damage); chests and the forge pre-select "your level" (Enter) but any
  tier can still be chosen.
- **Focus plan**: before a run or Sprint the game picks up to three skills (biggest struggles, the fastest-fading
  learned one, a new one at your level) and weights them 2.5× in the picker. Progress and Adventure show the plan.
- **Confidence check**: about one typed prompt in three outside fights (chests, forge, lessons) first asks
  "Sure / Not sure". Progress shows how well you judge what you know; a hesitant right answer grows the memory
  less and a confident miss shrinks it more.
- **Sprint**: 60 seconds, typed answers, problems at your level. Fixed time makes scores comparable day to day;
  a new personal best earns a chest.

Other rules from the research: math is how you win (crits + specials), not an interruption; typed answers for
important moments, 3 options for fast ones; worked solutions after the run, not mid-fight; speed is compared only
to your own past; daily 3-minute goal.

## Credits

- Hero sprite: **Adventurer 2D Top-Down** by Mattz Art (https://xzany.itch.io/top-down-adventurer-character), free version,
  used and modified under its licence (use in any game, modify freely, no redistribution as an asset). Gear, helmets,
  cloaks and weapons are applied on top of it in code.
- Interface icons (slot filters, stats, skills, run powers, camp stations): **game-icons.net** by Lorc, Delapouite and
  contributors (https://game-icons.net), licensed CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). Taken from the
  `@iconify-json/game-icons` package; used as-is, tinted with CSS.
- Everything else (enemies, camp, props, items, UI) is drawn in code in this repo. The world's bright top-down look
  (sunny greens, soft shading, coloured outlines, round trees, soft shadows) is inspired by Cainos' "Pixel Art Top Down"
  packs; no assets from them are used.
