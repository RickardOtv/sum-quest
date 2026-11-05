# Sum Quest: lore and math-as-magic plan

Goal: the game is ABOUT math. Test for every feature: if the question could be swapped for a
vocabulary quiz and nothing breaks, math is not built in deep enough.

Rules kept from the design talks:
- A wrong answer fizzles. It never hurts the hero. (Overclaiming, like trusting a scam, may cost a little gold.)
- Crits stay luck + one question. In the lore it is a moment of clarity.
- No rune-styled cosmetic pass (glowing rune numbers, spell-book UI). Text and mechanics only.

---

## 1. Lore bible

### The Miscount
Once, everything had its measure. Rivers knew how far to run. Trees counted their rings.
Ovens knew how hot to burn. Bakers knew how many buns make a tray.

The measure was kept on the **Counting Stones**, old rune stones in every clearing.
One night the great stone cracked. Numbers slipped loose. People call it **the Miscount**.

Now almost nothing adds up. Most folk can't count past their fingers. Prices are guesses.
Fires don't know when to stop. And the loose numbers clump into creatures.

### Miscounts (the enemies)
A **miscount** is a wrong number made flesh: a sum that never got finished.
They are not evil. They are muddled. Beat one and its number falls back into place.
- **Slimes**: the simplest miscounts, a blob around one number. (See idea 1: they carry it.)
- **Spore-caps**: mushrooms that multiply wrong. Always too many spores.
- **Wisps**: lost digits, floating, looking for their sum.
- **Boars**: charge without measuring the distance.
- **Old Tusk** (mini boss): the boar that never measures. It hits walls and sprays thorns. (Already how it plays.)
- **Old Rootback** (boss): Thornwood's oldest tree. It lost count of its rings and kept growing.
  Roots burst up everywhere because it can't tell where it ends.

Name note: "the Miscount" for the event, "miscounts" for the creatures. Clear for kids, says what it is.
Alternative if you want softer: "the Muddle" / "muddlings".

### Emberfall
A village past the forest. Its hearth fire was kept by a recipe: so much wood, so much fire.
- **The Cinder Golem** (boss): the village's hearth-keeper, built from oven bricks. After the Miscount it
  forgot the measure and fed the fire everything. Its fire rings are the recipe gone wrong.
- **Cinderjaw** (mini boss): the village watchdog. Now a burning hound that can't count its steps,
  so it leaves fire behind.
- **Ember imps**: sparks that can't count down to "out".
- **Cinder hounds**: Cinderjaw's pack.
- "Not quite abandoned": villagers are still hiding. They can't count any more. (Idea 8.)

### Magic: how a spell works
- A spell is a **sum**: a true equation, written in the head and spoken out.
- A true sum has weight. Reality has to agree with it, so it acts. That is the spell.
- A wrong sum has nothing to stand on. It doesn't explode or backfire. It just **fizzles**.
- A **close** sum is almost true. It works a little. (Matches the existing close-answer credit.)
- A **fast** sum is cleanly written, so it hits harder. (Matches the existing Quick / Lightning bonus.)
- Harder sums hold more power. (Matches tiers: harder crit = more damage.)
- Each spell needs its kind of sum. Ward is held up by easy adding. Meteor needs big multiplying.
- **Crits are moments of clarity.** For a heartbeat the world's numbers go sharp and still (time freezes).
  The spark waits for the true answer. Name it right and it strikes. Miss and it fades.

### The hero: a Reckoner
The hero is one of the few who can still **reckon**: do sums in the head.
That is rare now, so it is magic. The hero camps at the edge of Thornwood with three others who
remember a little of the old measure. The job: put the numbers back, one room at a time.

### The camp
- **Brannoc** the smith. Forging is measure: steel only holds if the numbers are true.
  He can't do sums well himself, so he needs the hero at the anvil. Gruff, warm.
- **Ysolde** the trainer. A former scout. She remembers the shortcuts, the quick clean ways to write a sum.
  Her lessons are spell-writing tricks.
- **Old Ferrin** the monk. Keeper of the camp's **Counting Stone** (the Meditation stone; it already has a
  rune on it). Skills are inscribed on the stone. Rebirth = wiping the stone clean.
- **Nim Fairprice** the trader (new). A cheerful wandering merchant who noticed nobody can count any more,
  and thinks that's great for business. Not a villain: a cheeky rascal who respects anyone who catches him.
  "Ey, got a deal for you!"

---

## 2. Text pass (existing strings)

Line numbers as of commit `d844a7e`. Keep everything short for phones.

### Zones: `src/game/zones.ts`
| Line | Field | Old | New |
|---|---|---|---|
| 30 | Thornwood `blurb` | Slimes, spore-caps, wisps and boars under the old trees. | The old trees lost count. Their woods crawl with miscounts. |
| 33 | `bossSub` | the heart of Thornwood | the tree that lost count of its rings |
| 37 | Emberfall `blurb` | The village past the forest. Empty, still burning, and not quite abandoned. | The village forgot its measure. The fire never learned to stop. Someone is still hiding. |
| 40 | `bossSub` | the burning heart of Emberfall | the hearth-keeper who forgot the measure |

`minibossTip` (lines 32, 39) stay: they are gameplay hints.

### NPC lines: `src/game/art/camp.ts`
| Line | NPC | Old | New |
|---|---|---|---|
| 224 | Brannoc | `'Steel\'s hot. What needs work?'`, `'Bring scrap and I\'ll make it sing.'`, `'A sharp mind, a sharp blade.'` | `'Steel\'s hot. You bring the sums.'`, `'Wrong sum, cracked steel. Right sum, it sings.'`, `'I swing the hammer. You do the counting.'` |
| 230 | Ysolde | `'Fast hands, faster head. Ready?'`, `'Sixty seconds. Show me.'`, `'Every trick I teach saves you a second.'` | `'Fast hands, faster head. Ready?'` (keep), `'Sixty seconds. Show me.'` (keep), `'A shortcut is a spell written cleaner.'` |
| 236 | Old Ferrin | `'Sit. Your skills are shaped here.'`, `'The mind is a blade too. Hone it.'`, `'What you unlearn, you can learn anew.'` | `'Sit. Spells are written on this stone.'`, `'A true sum has weight. A false one, none.'`, `'The stone cracked once. We mend it one number at a time.'` |

### Camp panels: `src/ui/camp.ts`
| Line | Where | Old | New |
|---|---|---|---|
| 39 | Training subtitle | Ysolde's yard | Ysolde's yard · shortcuts |
| 40 | Progress subtitle | your progress | what you can reckon |
| 40 | Meditation subtitle | Old Ferrin's clearing | Old Ferrin's Counting Stone |
| 46 | Forge first tip | Pick a piece below, then Forge. A harder problem makes it more likely to hold. | Pick a piece, then Forge. Steel holds a true sum. Harder sums hold better. |
| 47 | Training first tip | Lessons teach a shortcut. Finish one for gold and a skill point. | Each lesson is a shortcut for writing sums. Finish one for gold and a skill point. |
| 49 | Meditation first tip | Spend skill points in the tree. Tap a slot to choose the skills you take on a run. | Spend points to inscribe spells on the stone. Tap a slot to pick the two you carry. |
| 97 | Head-out note | …rooms of forest, then Old Rootback. Beat him and the only path leads on… | …rooms of miscounts, then Old Rootback, the tree that lost count. Beat him and the only path leads on… |
| 336 | Skill points note | Each point unlocks a node in the tree or raises it one level. | Each point inscribes a new spell on the stone, or deepens one. |
| 348 | Rebirth | Refund **N** points for **X gold**? | Wipe the stone clean? Get back **N** points for **X gold**. |
| 500 | Forge fail title | The metal cracked | The sum was off. The metal cracked |
| 591 | Intro bullet | **Math is your power:** crits, skills and chests ask a quick sum. | **Math is magic:** the world lost its count. A true sum casts a spell. A wrong one just fizzles. |

### In a run
| File:line | Old | New |
|---|---|---|
| `src/ui/runUI.ts:179` crit sub | time is frozen · pick an answer | a moment of clarity · pick the true sum |
| `src/ui/runUI.ts:229` miss line | ✗ It's X | ✗ Fizzled · it's X |
| `src/ui/runUI.ts:270` win label | The journey is complete | Emberfall's fire is out |
| `src/game/scenes/RunScene.ts:219` training banner | learn a trick | learn a shortcut |
| `src/game/scenes/RunScene.ts:814` crit miss float | miss | fizzle |
| `src/ui/loot.ts:36` chest note | Solve a problem to open it. | Sealed with a sum. Solve it to open. |

### Skills: `src/game/skills.ts`
`short` stays (it's the effect). Tips and branch blurbs carry the lore.

| Line | Old | New |
|---|---|---|
| 30 Ward tip | Easy math, no damage. Saves you from bullet rings. | Held up by easy sums. No damage, wipes every bullet. |
| 34 Mark tip | The boss killer. | One big true sum, one big hit. Boss killer. |
| 36 Meteor tip | Hardest math, biggest payoff. | The hardest sum. Brings down the sky. |
| 37 Rift tip | Total control. Expert everyday math. | Expert everyday sums. Time itself agrees. |
| 53 Striker | Raw damage. Times tables and big multiply/divide. | Sums that strike. Times tables, big multiply/divide. |
| 54 Warden | Survive anything. Adding and subtracting. | Sums that shield. Adding and subtracting. |
| 55 Tactician | Control the room. Everyday math. | Sums that bend the room. Everyday math. |

---

## 3. The eight ideas

### How new math plugs into the learning engine (applies to all)
Every answer already goes through `logAnswer(p, kind, seconds, recognitionOnly)` in `src/state/answers.ts`,
which feeds `recordAnswer` (mastery.ts) and `noteAnswer` (adaptive.ts). So a new feature must:
1. **Produce a `Problem`** (text, answer, explain, `key`, `genKey`, tier).
2. **Reuse existing mastery keys where the fact is the same.** "12 = 3 × ?" is the fact `m:3×4`.
   "? × 6 = 42" is `d:6×7`. Then a slime split or a shield trains the same memory as the times-table crit.
3. **Register new skills as generators** in `GENERATORS` (problems.ts), so `noteAnswer` finds their category
   and `planFocus` can pick them. Add a field `context?: 'lock' | 'deal' | ...` and filter those out in
   `pickProblem` so they don't show up as crit questions.
4. **Pick numbers by need**, not at random: export `pickPair` from problems.ts and choose slime / shield /
   lock numbers from products of fading or focus pairs (`priority()` weights). That way what the player
   sees in a fight is what they are about to forget.
5. **Pass `recognitionOnly = true`** for choices (yes/no deals, 3 options, door picks). Guessable answers grow memory less.
6. **Never record exposure as an answer.** Seeing "12 → 3 × 4" when a slime splits is not a recall. Don't log it.

New generators proposed below:
| Key | Category | Tier | What |
|---|---|---|---|
| `bond10` | addsub | 1 | pairs to 10 (key `b:3+7`) |
| `fact` (reuse `mf`/`df` keys) | facts | 1–2 | factor pairs, "is 7 a factor of 42?" |
| `miss` (rephrase of existing gens) | same as source | same | "? × 6 = 42", "35 + ? = 61" |
| `seq` | facts | 2–3 | patterns: ×2, +k, squares |
| `deal` | everyday | 2–4 | is this deal fair? |
| `ratio` | everyday | 2–4 | scale a recipe |

### 1. Number slimes
**Lore**: slimes are the purest miscounts: one number in a blob. Hit it and the number falls apart into its
true parts. A prime has no parts; it is already true, so it pops.

**Play**: a slime shows a number (12, 18, 24, 36…). A slash splits it into two smaller slimes, a factor pair
(12 → 3 and 4). Primes pop on hit. A crit on a number slime asks about its number ("12 = 3 × ?").

**Younger variant (bonds to 10)**: small slimes show 1–9. Touching slimes merge into their sum.
Exactly 10 pops in a burst (gold). Over 10 bursts a 10 and leaves the rest (7 + 6 → pop, 3 left), which is the
"bridge through ten" lesson in `tricks.ts`. Slashes knock slimes back, so the player herds them.
Pick by setting (age mode) or by adaptive level: addsub level 1 → bonds mode.

**Vocab-swap test**: passes. The fight itself is factoring / adding.

**Build**:
- `src/game/entities/enemies.ts`: add `value?: number` to `Enemy`; slime split logic on damage.
- `src/game/scenes/RunScene.ts`: in `damageEnemy`/`killEnemy`, if `e.value` is composite, spawn two slimes with
  the factor pair (smaller HP); prime → pop. Float text "12 → 3 × 4". Merge check in contact loop (bonds mode).
- `src/game/run.ts`: cap splits so a room's enemy budget stays fair (a split slime costs 0 budget, HP scales with value).
- Number label: HTML over canvas like damage numbers (`runUI.ts`), cheap.
- `src/math/problems.ts`: export `pickPair`; slime numbers = `a*b` from `pickPair(ALL_PAIRS, 'm', recent)`.
- Crit on a number slime: build the problem from its value, key `m:a×b`.

**Effort**: M (split), +S for bonds mode.

### 2. Number shields
**Lore**: some miscounts wrap themselves in a number they can't solve. Solve it for them and the shield
falls away.

**Play**: shielded enemy shows a number (e.g. 24). First hit freezes time like a crit and asks about that number:
"a factor of 24?", "24 = 4 × ?", "24 + ? = 30", "half of 24?". Right: shield shatters, bonus hit.
Wrong: fizzle, shield cracks; it breaks on its own after a few more hits (no harsh penalty), no second question.
Max 1–2 shielded enemies per room; respect the crit cooldown so prompts don't pile up.

**Vocab-swap test**: passes. The question is about the number in front of you.

**Build**:
- `enemies.ts`: `shield?: { value: number; hits: number }` + draw a ring with the number (HTML label).
- `run.ts` `planEnemies`: mark 0–2 enemies shielded from room 2.
- `RunScene.ts`: in the hit path, if shielded and not asked, `startPrompt` + `ui.askChoice(shieldProblem(value))`.
- `problems.ts`: `shieldProblem(n, tier)` picks a question type by the category the player needs
  (`pickCategory()`), with keys `m:`/`d:`/addsub so mastery is shared. `makeChoices` already gives smart wrong options.
- `recognitionOnly = true` (3 options).

**Effort**: M.

### 3. Nim Fairprice, the scam trader
**Lore**: since the Miscount nobody checks a price. Nim loves it. Catch him and he laughs and pays up.

**Play**: rare "trader" door (Thornwood from room 3, more in Emberfall), or he wanders into a cleared room.
He makes 2–3 offers, each with a timer bar and **Deal / No deal**:
- "3 potions for 40! Normally 15 each." (45 → good deal)
- "20% off, then 20% off again. That's 40% off!" (it's 36% → scam)
- "Buy 2, get 1 free: 3 for 30. Normally 9 each." (27 → scam)
After each choice he shows the working ("3 × 15 = 45, so 40 is good").
- Accept a fair deal: you get it.
- Accept a scam: you pay the extra gold (small).
- Call out a scam: small gold bonus, Nim grins ("Sharp one, you are!").
- Decline a fair deal: nothing lost.
Wares: heals, a run power, a peek at the next doors, a wooden chest. Paid with run gold.

**Vocab-swap test**: passes. Deciding needs the sum.

**Build**:
- `src/game/run.ts`: new `Reward` `'trader'`, weight in `rollDoors`.
- `src/game/trader.ts` (new): offer templates (bulk vs unit price, stacked %, buy-N-get-1, "was/now" %),
  each returns `{ text, fair: boolean, working: string, cost, ware }`. Numbers from `money()` so kr works.
- `src/ui/trader.ts` (new): sheet with Nim's portrait (reuse `npcCanvas` with a new `Npc` in `art/camp.ts`),
  timer bar (copy from `askChoice`), two buttons, then the working.
- `problems.ts`: generator `deal` (everyday, tiers 2–4, `context: 'deal'`); key per template (`deal:stack`, `deal:bulk`…)
  so the mastery model learns which scams fool the player. `recognitionOnly = true`.
- `RunScene.ts` `roomCleared`: handle `'trader'`.

**Effort**: M.

### 4. Spell crafting at the Counting Stone
**Lore**: a spell's power is a number. How you write it decides what it does: 24 can be 2 × 12 or 8 × 3.

**Play**: each multi-target skill has mana that grows with level (Lv 1–5: 12, 18, 24, 30, 36, numbers with many
factors). The player picks targets with a slider, then **types** the damage per target (24 ÷ 6 = ?).
Right: the spell is inscribed (saved in the save / loadout). Wrong: "fizzles, try again". Untimed, calm.
Fits: Chain Lightning (damage × targets), Frost Field (slow % × seconds), Nova (damage × rings).

**Vocab-swap test**: passes. The build choice is a factor pair.

**Build**:
- `src/game/skills.ts`: `mana(level)` and `split?: { a: string; b: string }` per skill.
- `src/state/save.ts`: `spellSplit: Record<SkillEffect, number>` (the chosen factor); include in loadouts.
- `src/ui/camp.ts` skill detail sheet (~line 320): "Inscribe" row with slider + `askTyped`.
- `RunScene.ts` `cast()`: Chain Lightning uses targets/damage from the split instead of fixed 3.
- Engine: problem built with key `d:a×b`, logged normally (typed recall).
- Balance: total damage = mana × hit, so no split is strictly better (few big hits vs many small).

**Effort**: M.

### 5. Rune locks on chests
**Lore**: Counting Stone shards seal old chests. A lock is a sum with a hole in it.

**Play**: the chest prompt is shown as a lock: missing-number ("? × 6 = 42", "35 + ? = 61", "? % of 80 = 20")
or pattern ("3, 6, 12, ?", "50, 45, 40, ?", "1, 4, 9, 16, ?"). Same tiers and loot odds as now.

**Vocab-swap test**: weaker (a chest could ask anything). Missing-number and patterns still train
inverse thinking that plain sums don't, so it's worth it, and cheap.

**Build**:
- `problems.ts`: `asMissing(p)` that rewrites a times/add/sub/percent problem with a blank; key unchanged
  (`d:6×7` for "? × 6 = 42"). New generator `seq` (facts, tiers 2–3, `context: 'lock'`).
- `src/ui/loot.ts:55` `solve()`: 50% `asMissing(pickProblem(tier))`, else `seq` when tier fits.
- Heading "Unlock the wooden chest" → show a lock icon (existing icon set).

**Effort**: S.

### 6. Rune gates
**Lore**: doors are written in runes now. A gate's rune changes what's behind it. Read it right.

**Play**: some door pairs show math labels instead of plain rewards:
- "+15 gold" vs "× 1.5 gold" (the player has 40 run gold: 55 vs 60).
- "÷ 2 enemy HP" vs "× 2 shots for this room".
- "+25 HP" vs "+30% HP" (with max HP shown).
After walking through, a one-line check: "× 1.5 gave 60. +15 would have given 55. Good read!"

**Vocab-swap test**: passes. Choosing well needs the sum.

**Build**:
- `run.ts`: `DoorSpec` gets `rune?: { op: '+' | '×' | '÷' | '%'; n: number; stat: 'gold' | 'hp' | 'enemyHp' | 'shots' }`.
  Roll paired gates so the better one changes with current values.
- `runUI.ts` `showDoorTags`: render the rune label.
- `RunScene.ts` `roomCleared` / `startRoom`: apply the op.
- Engine: log as a `gate` generator (everyday, `context: 'gate'`), exact = chose the better door, `recognitionOnly = true`.

**Effort**: M.

### 7. Potion brewing with ratios
**Lore**: potions are recipes, and recipes are ratios. Since the Miscount nobody can scale one.

**Play**: at the campfire (new station, or Nim's stall in camp later): "Healing draught: 2 moss to 3 water.
You have 8 moss. How much water?" Brew 1–2 potions to carry into a run (a heal button). Better ratios,
stronger potion types (mana potion = skill charge).

**Vocab-swap test**: passes. Scaling a recipe is the brew.

**Build**:
- `problems.ts`: generator `ratio` (everyday, tiers 2–4, normal context too: it's real-life math).
- `src/state/save.ts`: `potions` count; ingredients from chests / Nim.
- `src/game/scenes/HubScene.ts` `layout()`: one station entry (+ art in `art/camp.ts`).
- `src/ui/camp.ts`: brew panel with `askTyped`.
- `RunScene.ts` + `runUI.ts`: a potion button, heal on tap.

**Effort**: L (new consumable, station, art, run UI).

### 8. Emberfall villagers
**Lore**: the villagers hid when their numbers ran away. They can't count anymore. Help them and they come
back to life, and later to your camp.

**Play**: a rare "villager" room in Emberfall. A villager asks one everyday sum in story form:
- Baker: "Three trays of 12 buns. I have 20. How many more?"
- Miller: "This flour was 40, it's 25% off. What do I pay?"
- Twins: "We split 87 apples between 3 of us. How many each?"
Right: they're saved (gold, and they show up near the camp fire). Wrong: Ysolde-style worked answer,
they still thank you, smaller reward.

**Vocab-swap test**: middling on its own; the story makes everyday math concrete (the game's main goal),
and the rescued-villager camp is a lasting reason to do it.

**Build**:
- `src/game/villagers.ts` (new): story templates keyed by existing generators (`tip`, `split`, `disc`, `chg`, `m21`…),
  which take the generator's numbers and wrap them in a line. No new math keys: mastery and focus work unchanged.
  Prefer the player's focus generators (`planFocus`).
- `run.ts`: `Reward` `'villager'` (Emberfall only).
- `RunScene.ts`: villager sprite (reuse the adventurer paper-doll with plain clothes like the NPCs), talk prompt.
- `save.ts`: `rescued: string[]`; `HubScene.ts`: draw rescued villagers around the fire.

**Effort**: M.

---

## 4. Build order

1. **Text pass** (S). Sets the tone; every later feature reads right.
2. **Rune locks** (S). Uses the chest flow as is; adds `asMissing` + `seq`, the base for shields.
3. **Number shields** (M). Biggest "math is the fight" win for the cost; reuses `askChoice`.
4. **Number slimes** (M). Then the bonds-to-10 mode (S) for younger players.
5. **Nim Fairprice** (M). New character, strong everyday-math value, funny.
6. **Rune gates** (M). Door system exists; mostly labels + ops.
7. **Emberfall villagers** (M). Story skins over existing generators, then the camp payoff.
8. **Spell crafting** (M). Needs balance work on Chain Lightning first.
9. **Potion brewing** (L). Most new systems; do last.

Before 3–4: add the `context` field to generators and export `pickPair` (one small engine change both use).

## Open questions
- Name: "miscounts" or "muddlings"?
- Bonds mode: by age setting, or by addsub level?
- Nim: run-only, or also a camp stall later?
- Potions: new campfire station, or Nim sells them?
