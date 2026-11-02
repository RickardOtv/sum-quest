/**
 * The action part of the game: one room at a time.
 *
 * Archero rule: you throw slashes automatically while standing still and
 * can't attack while moving, so positioning matters. Math happens at key
 * moments (crits, special skills, training rooms): time freezes while you
 * answer, or slows to a crawl during a super crit.
 */
import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { TIER_TARGET, generatorByKey, pickProblem } from '../../math/problems';
import { pickCategory, planFocus, recommendedTier } from '../../math/adaptive';
import { effectiveBox, getSkill } from '../../math/mastery';
import { TRICKS, trickForGenerator } from '../../math/tricks';
import { logAnswer } from '../../state/answers';
import { persist, save } from '../../state/save';
import { buildHeroTextures, paintFloor, paintVillage, paintVignette } from '../art/textures';
import { ORIGIN_X, ORIGIN_Y, buildAdventurer, dirOf, type Dir } from '../art/adventurer';
import { baseById, forgeCost, type HeroStats } from '../items';
import { currentLooks, currentStats, equippedItem, heroSkin } from '../../state/gear';
import { skillAt, type Skill } from '../skills';
import { earnPoint, earnPointAlways } from '../../state/points';
import { type Arena, type Enemy, createEnemy, destroyEnemy, flies, isBig, updateEnemy } from '../entities/enemies';
import { rollPerks } from '../perks';
import { type DoorSpec, type EnemyKind, type RunState, ZONE_ROOMS, enemyHpMult, isFinalBoss, localRoom, newRun, planEnemies, rollDoors, zoneOfRoom } from '../run';
import { ZONES, type Zone } from '../zones';
import { FIRE_SPOTS, planVillage, reachable, type VillageLayout } from '../village';
import * as ui from '../../ui/runUI';
import { runLesson } from '../../ui/training';
import { openChestFlow } from '../../ui/loot';
import type { ChestKind } from '../items';
import { PROPS, collidersOf, planRoom, type PlacedDecor, type PlacedProp } from '../room';

interface Shot { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; damage: number; pierce: number; hits: Set<Enemy>; }
interface Bullet { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; damage: number; }
interface Coin { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; age: number; value: number; }
/** `enterY`: walk above this line at the door's x to go through (the big gates stand forward of the hedge). */
interface Door { spec: DoorSpec; x: number; enterY: number; parts: Phaser.GameObjects.GameObject[]; }
/** A marked spot on the ground that bursts after a delay (Old Rootback's roots, the Golem's and Cinderjaw's fire). */
interface Hazard { x: number; y: number; r: number; t: number; delay: number; damage: number; style: 'roots' | 'fire'; g: Phaser.GameObjects.Graphics; }
interface CritShot { img: Phaser.GameObjects.Image; x: number; y: number; target: Enemy; speed: number; damage: number; state: 'pending' | 'hit' | 'fizzle'; isSuper: boolean; }

export type ExitChoice = 'again' | 'camp' | 'forge' | 'bag';

/** Cached solid-pixel masks for prop textures (see RunScene.maskOf). */
const MASKS = new Map<string, { w: number; solid: Uint8Array } | null>();

export class RunScene extends Phaser.Scene {
  private run!: RunState;
  /** Numbers from equipped gear (damage, HP, crit chance…), fixed for the run. */
  private stats!: HeroStats;
  private trailTimer = 0;
  private onExit!: (c: ExitChoice) => void;

  /** Gameplay time scale: 1 = normal, lower = slow motion while solving. */
  private timeScale = 1;
  private prompting = false;
  private promptGuard = 0;
  private easing = 1; // seconds into the ease-in after a question (≥ 0.5 = done)
  private critSaved = false; // a crit rolled and waits for a safe moment
  private critRing?: Phaser.GameObjects.Ellipse; // ms since the last "is a question really open?" check
  private paused = false;
  private ended = false;
  private roomActive = false;

  private W = 360; private H = 640;
  private bounds = { left: 0, right: 0, top: 0, bottom: 0 };

  private hero!: { x: number; y: number; body: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image; invulnerable: number; fireCooldown: number; swing: number; moving: boolean; facing: number; dir: Dir; attackUntil: number };
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private bullets: Bullet[] = [];
  private coins: Coin[] = [];
  private hazards: Hazard[] = [];
  /** This room's props: their sprites and colliders (solid ones also stop shots and bullets). */
  /**
   * This room's props: sprite, walking colliders (circles at the base), and whether it's solid.
   * Solid props also stop shots and bullets wherever their picture is drawn (tree crowns, roofs),
   * unless the shot passes in front of them.
   */
  private props: { img: Phaser.GameObjects.Image; colliders: { x: number; y: number; r: number }[]; solid: boolean; box?: { x: number; y: number; w: number; h: number } }[] = [];
  /** Everything else that belongs to the room's look: decoration, shadows, fires, smoke. */
  private decor: Phaser.GameObjects.GameObject[] = [];
  private bossesBeaten = 0;
  private chestsOpened = 0;
  private doors: Door[] = [];
  private crit: CritShot | null = null;
  private superTint?: Phaser.GameObjects.Rectangle;
  private skills: (Skill | null)[] = []; // index = slot (Space, E); null = empty slot
  private wardTimer = 0;      // seconds of Ward shield left
  private frostTimer = 0;     // seconds of Frost Field / Time Rift left
  private frostFactor = 0.4;  // enemy speed while slowed (0 = frozen)
  private riftDamage = 0;     // damage dealt when a Time Rift ends
  private forceSuper = false; // Second Sight: next crit is a super crit
  private guaranteedCrit = false; // Second Sight: the very next attack crits
  private wardRing?: Phaser.GameObjects.Arc;
  private critCooldown = 2;
  private recent: string[] = [];
  private runSkills: Record<string, { n: number; ok: number }> = {};
  private missed: ui.Missed[] = [];

  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private stick = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
  private stickGfx!: Phaser.GameObjects.Graphics;
  private bossBar!: Phaser.GameObjects.Graphics;
  private floor?: Phaser.GameObjects.Image;
  private hudTimer = 0;
  private arena!: Arena;

  constructor() { super('run'); }

  init(data: { onExit: (c: ExitChoice) => void }) {
    this.onExit = data.onExit;
    this.stats = currentStats();
    planFocus(); // what this run should serve more of (shown on Progress as "next run focuses on")
    this.skills = save.equippedSkills.map(id => (id && (save.tree[id] ?? 0) > 0 ? skillAt(id, save.tree[id]!) : null));
    this.run = newRun(this.stats.maxHp);
    this.wardTimer = 0; this.frostTimer = 0; this.forceSuper = false; this.bossesBeaten = 0;
    // Dev shortcuts (only in `npm run dev`): ?zone=emberfall starts in the village, ?boss jumps straight to that zone's boss, ?super makes every crit a super crit.
    if (import.meta.env.DEV) {
      const q = new URLSearchParams(location.search);
      if (q.get('zone') === 'emberfall') { this.run.room = ZONE_ROOMS; this.run.zone = 'emberfall'; }
      if (q.has('boss')) { this.run.room += ZONE_ROOMS - 1; this.run.current = { reward: 'boss', difficulty: 3 }; }
    }
    // Everything that must not leak from one run into the next.
    Object.assign(this, {
      timeScale: 1, prompting: false, promptGuard: 0, easing: 1, critSaved: false, critRing: undefined, paused: false, ended: false, roomActive: false,
      enemies: [], shots: [], bullets: [], coins: [], hazards: [], props: [], decor: [], chestsOpened: 0, doors: [], crit: null, critCooldown: 2, recent: [], runSkills: {}, missed: [],
      stick: { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 }, trailTimer: 0, hudTimer: 0,
      superTint: undefined, wardRing: undefined, frostFactor: 0.4, riftDamage: 0, guaranteedCrit: false,
    });
  }

  create() {
    this.W = this.scale.width; this.H = this.scale.height;
    const w = CONFIG.world;
    this.bounds = { left: w.wallSide + 4, right: this.W - w.wallSide - 4, top: w.wallTop + 6, bottom: this.H - w.wallBottom - 4 };
    paintVignette(this, this.W, this.H);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(1900);
    this.bossBar = this.add.graphics().setDepth(1950);
    this.stickGfx = this.add.graphics().setDepth(2000);

    this.arena = {
      scene: this,
      heroX: () => this.hero.x, heroY: () => this.hero.y,
      fire: (x, y, a, speed, damage, tex) => this.fireBullet(x, y, a, speed, damage, tex),
      spawn: (k, x, y) => this.spawnEnemy(k, x, y),
      hazard: (x, y, r, delay, damage, style = 'roots') => this.hazards.push({ x, y, r, t: 0, delay, damage, style, g: this.add.graphics().setDepth(2) }),
      blocked: (x, y, r) => this.props.some(p => p.colliders.some(c => Math.hypot(c.x - x, c.y - y) < c.r + r)),
      bounds: this.bounds,
      enemyCount: () => this.enemies.length,
    };

    if (!this.anims.exists('vfire')) this.anims.create({ key: 'vfire', frames: [0, 1, 2].map(i => ({ key: `vh_fire${i}` })), frameRate: 8, repeat: -1 });
    this.createHero();
    this.setupInput();
    if (import.meta.env.DEV) (window as unknown as { run: RunScene }).run = this; // for tests: window.run.devClear()
    ui.showHud({ special: i => this.useSpecial(i), pause: () => this.pause() }, this.skills);
    this.startRoom();

    const onHide = () => { if (document.hidden) this.pause(); };
    document.addEventListener('visibilitychange', onHide);
    this.events.once('shutdown', () => { document.removeEventListener('visibilitychange', onHide); ui.hideHud(); });
  }

  /* ================= setup ================= */

  private createHero() {
    buildHeroTextures(this, currentLooks(), baseById(equippedItem('weapon')!.baseId).look); // the slash colour
    buildAdventurer(this, 'hero', heroSkin());
    const shadow = this.add.image(0, 0, 'shadow').setScale(2.6, 2.2).setDepth(1);
    const body = this.add.sprite(0, 0, 'hero_idle_down').setScale(2).setOrigin(ORIGIN_X, ORIGIN_Y);
    this.hero = { x: this.W / 2, y: this.H - 90, body, shadow, invulnerable: 0, fireCooldown: 0.4, swing: 0, moving: false, facing: 1, dir: 'up', attackUntil: 0 };
  }

  private setupInput() {
    const k = this.input.keyboard!;
    this.keys = k.addKeys({ up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D' }, false) as typeof this.keys;
    // Floating thumb-stick: touch anywhere, drag to move, let go to stop (and attack).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // a second finger doesn't steal the stick, unless the stick's own finger is gone (lifted where we couldn't see it)
      const holder = this.input.manager.pointers.find(q => q.id === this.stick.id);
      if (this.stick.active && holder?.isDown && holder !== p) return;
      this.stick = { active: true, id: p.id, ox: p.x, oy: p.y, dx: 0, dy: 0 };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.stick.active || p.id !== this.stick.id) return;
      const dx = p.x - this.stick.ox, dy = p.y - this.stick.oy, d = Math.hypot(dx, dy), max = 34;
      if (d > max) { this.stick.ox = p.x - (dx / d) * max; this.stick.oy = p.y - (dy / d) * max; }
      this.stick.dx = (p.x - this.stick.ox) / max; this.stick.dy = (p.y - this.stick.oy) / max;
    });
    const release = (p: Phaser.Input.Pointer) => { if (p.id === this.stick.id) this.stick = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 }; };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  /* ================= rooms ================= */

  private get zone(): Zone { return ZONES[this.run.zone]; }

  private startRoom(entered = false) {
    this.clearRoom();
    const seed = 1000 + this.run.room * 7919 + Math.floor(Math.random() * 999);
    const spec = this.run.current, zone = this.zone, w = CONFIG.world;
    // painted at full resolution (HD), like the props and enemies
    let village: VillageLayout | undefined;
    if (zone.style === 'village') {
      village = planVillage(this.bounds, localRoom(this.run.room), spec.reward);
      paintVillage(this, 'floor', this.W, this.H, w.wallTop, w.wallSide, seed, village.ground);
    } else paintFloor(this, 'floor', this.W, this.H, w.wallTop, w.wallSide, seed);
    this.floor?.destroy();
    this.floor = this.add.image(0, 0, 'floor').setOrigin(0).setDepth(0);
    this.hero.x = this.W / 2; this.hero.y = this.bounds.bottom - 40;

    if (village) { this.placeLayout(village.props, village.decor); this.villageAir(); }
    else { const l = planRoom(this.bounds, localRoom(this.run.room), spec.reward); this.placeLayout(l.props, l.decor); }
    const n = localRoom(this.run.room) + 1;
    if (entered) ui.banner(zone.name, zone.blurb, 'land'); // you just walked into a new zone
    else if (spec.reward === 'boss') ui.banner(zone.bossName, `Room ${n} · ${zone.bossSub}`, 'boss');
    else if (spec.reward === 'miniboss') ui.banner(zone.minibossName, `Room ${n} · ${zone.minibossTip}`, 'mini');
    else ui.banner(spec.reward === 'training' ? 'Training room' : `Room ${n}`, spec.reward === 'training' ? 'learn a trick' : `${zone.name} · danger ${spec.difficulty} of 3`);

    if (spec.reward === 'training') { this.roomActive = false; this.time.delayedCall(500, () => this.trainingRoom()); return; }

    const kinds = planEnemies(this.run);
    kinds.forEach((k, i) => {
      const big = isBig(k);
      let x = this.W / 2, y = this.bounds.top + 70;
      // small enemies: a random spot in the top half that isn't inside a prop
      for (let t = 0; !big && t < 25; t++) {
        x = Phaser.Math.Between(this.bounds.left + 30, this.bounds.right - 30);
        y = Phaser.Math.Between(this.bounds.top + 20, this.bounds.top + (this.bounds.bottom - this.bounds.top) * 0.5);
        if (!this.arena.blocked(x, y, 18)) break;
      }
      this.time.delayedCall(250 + i * 90, () => this.spawnEnemy(k, x, y));
    });
    this.roomActive = true;
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number) {
    if (this.ended) return;
    this.enemies.push(createEnemy(this.arena, kind, x, y, isBig(kind) ? 1 : enemyHpMult(this.run))); // bosses have fixed HP (config)
  }

  private clearRoom() {
    this.enemies.forEach(destroyEnemy); this.enemies = [];
    this.shots.forEach(s => s.img.destroy()); this.shots = [];
    this.bullets.forEach(b => b.img.destroy()); this.bullets = [];
    this.coins.forEach(c => c.img.destroy()); this.coins = [];
    this.hazards.forEach(h => h.g.destroy()); this.hazards = [];
    this.props.forEach(p => p.img.destroy()); this.props = [];
    this.decor.forEach(d => d.destroy()); this.decor = [];
    this.doors.forEach(d => d.parts.forEach(p => p.destroy())); this.doors = [];
    this.crit?.img.destroy(); this.crit = null;
    this.bossBar.clear(); ui.bossName(null); ui.clearDoorTags(); ui.clearFeedback();
    this.frostTimer = 0; this.riftDamage = 0; // a Frost Field or Rift never carries into the next room
  }

  /** All enemies dead: hand out this room's reward, then show the next doors. */
  private async roomCleared() {
    this.roomActive = false;
    this.bullets.forEach(b => b.img.destroy()); this.bullets = [];
    this.hazards.forEach(h => h.g.destroy()); this.hazards = [];
    save.bestRoom = Math.max(save.bestRoom, this.run.room + 1); persist();
    await this.wait(600);
    const spec = this.run.current;
    if (spec.reward === 'boss') {
      this.bossesBeaten++;
      await this.openChestNow('gilded');
      if (isFinalBoss(this.run)) { this.endRun('won'); return; }
      // not the end: the boss counts, and the only way on leads out of this zone
      save.clears++; earnPointAlways(`${this.zone.bossName} defeated`); persist();
    }
    if (spec.reward === 'chest') {
      let kind = CONFIG.run.chestByDifficulty[spec.difficulty];
      if (kind === 'wood' && spec.difficulty > 1 && Math.random() < this.zone.chestBonus * 4) kind = 'iron'; // better chests further from camp
      await this.openChestNow(kind);
    }
    if (spec.reward === 'miniboss') {
      const amount = Math.round(this.run.maxHp * CONFIG.run.miniBossHeal);
      if (await ui.pickBoon(amount, this.zone.minibossName) === 'heal') this.heal(amount); else await this.openChestNow('iron');
    }
    if (spec.reward === 'gold') { const g = Math.round(CONFIG.run.goldReward[spec.difficulty] * this.stats.goldMult * this.zone.goldMult); this.run.gold += g; this.floatText(this.W / 2, this.H * 0.45, `+${g} gold`, '#e8c46a', 20); }
    if (spec.reward === 'heal') { const h = Math.round(this.run.maxHp * CONFIG.run.healReward[spec.difficulty]); this.heal(h); }
    if (spec.reward === 'power') {
      const choice = await ui.pickPerk(rollPerks(this.run.perks, this.run.hp / this.run.maxHp < 0.6), this.run.perks);
      if (choice === 'heal') this.heal(Math.round(this.run.maxHp * 0.25));
      else this.run.perks[choice] = (this.run.perks[choice] ?? 0) + 1;
    }
    if (CONFIG.run.healBetweenRooms) this.heal(Math.round(this.run.maxHp * CONFIG.run.healBetweenRooms), false);
    this.showDoors();
  }

  /**
   * A chest found in a run is opened right away (one problem, then the loot),
   * so chests don't pile up into a wall of math later. Gear you equip from it
   * takes effect immediately.
   */
  private async openChestNow(kind: ChestKind) {
    this.paused = true;
    const before = JSON.stringify(save.equipped);
    save.chests.push(kind); persist();
    await new Promise<void>(done => openChestFlow(save.chests.length - 1, done, true));
    this.chestsOpened++;
    if (JSON.stringify(save.equipped) !== before) this.refreshGear();
    this.paused = false; this.resetStick();
  }

  /** New gear mid-run: recompute stats and redraw the hero. Max HP changes keep your missing HP the same. */
  private refreshGear() {
    const missing = this.run.maxHp - this.run.hp;
    this.stats = currentStats();
    this.run.maxHp = this.stats.maxHp;
    this.run.hp = Math.max(1, this.run.maxHp - missing);
    const body = this.hero.body;
    body.anims.stop(); body.setTexture('pxw');
    buildHeroTextures(this, currentLooks(), baseById(equippedItem('weapon')!.baseId).look);
    buildAdventurer(this, 'hero', heroSkin());
    body.play(`hero_idle_${this.hero.dir}`, true);
    this.pushHud();
  }

  private showDoors() {
    const specs = rollDoors(this.run);
    const y = CONFIG.world.wallTop;
    specs.forEach((spec, i) => {
      const x = Math.round((this.W / (specs.length + 1)) * (i + 1));
      const parts: Phaser.GameObjects.GameObject[] = [];
      const village = this.zone.style === 'village';
      const tex = spec.reward === 'boss' ? 'door_boss' : spec.reward === 'miniboss' ? 'door_mini' : spec.reward === 'onward' || village ? 'door_arch' : 'door';
      // the big gates are drawn larger and stand forward of the hedge, so they're fully visible under the HUD
      const forward = spec.reward === 'boss' ? 36 : spec.reward === 'miniboss' || spec.reward === 'onward' ? 20 : 0;
      parts.push(this.add.image(x, y + 2 + forward, tex).setOrigin(0.5, 1).setScale((forward ? 3 : 2) / (tex === 'door_arch' ? 2 : 1)).setDepth(5)); // the arch is HD (twice the pixels)
      if (forward) {
        // a pulsing glow spilling out of the gate onto the floor (warm daylight for the way out)
        const col = spec.reward === 'boss' ? 0xe0505a : spec.reward === 'onward' ? 0xffe0a0 : 0xffb648;
        const glow = this.add.ellipse(x, y + forward + 8, spec.reward === 'boss' ? 140 : 90, 30, col, 0.22).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: glow, alpha: 0.08, scaleX: 1.15, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
        parts.push(glow);
        if (spec.reward === 'boss') { this.cameras.main.shake(400, 0.004); }
      }
      parts.forEach(p => { (p as Phaser.GameObjects.Image).setAlpha(0); this.tweens.add({ targets: p, alpha: (p as Phaser.GameObjects.Ellipse).type === 'Ellipse' ? 0.22 : 1, duration: 400 }); });
      this.doors.push({ spec, x, enterY: y + 2 + forward, parts });
    });
    const zone = this.zone, next = ZONES[zoneOfRoom(this.run.room + 1)];
    ui.showDoorTags(this.doors.map(d => ({
      x: d.x, y: d.enterY - 2, reward: d.spec.reward, difficulty: d.spec.difficulty,
      name: d.spec.reward === 'boss' ? zone.bossName : d.spec.reward === 'miniboss' ? zone.minibossName : d.spec.reward === 'onward' ? next.name : undefined,
      sub: d.spec.reward === 'boss' ? (isFinalBoss(this.run) ? 'the final fight' : 'zone boss') : d.spec.reward === 'miniboss' ? 'mini boss' : d.spec.reward === 'onward' ? 'the only way on' : undefined,
    })));
    ui.feedback(specs.length > 1 ? 'Walk into a door to pick your next room'
      : specs[0].reward === 'boss' ? `${zone.bossName} waits beyond the gate…`
      : specs[0].reward === 'onward' ? `The path leads out of ${zone.name}. There's smoke ahead…` : 'Something big is behind this door…', 0, 'low');
  }

  private enterDoor(door: Door) {
    if (this.ended) return;
    const onward = door.spec.reward === 'onward';
    // the path onward leads into the next zone's first room (a quiet one: a power to pick when it's cleared)
    this.run.current = onward ? { reward: 'power', difficulty: 1 } : door.spec;
    this.run.room++;
    this.run.zone = zoneOfRoom(this.run.room);
    this.doors.forEach(d => d.parts.forEach(p => p.destroy())); this.doors = [];
    ui.clearDoorTags(); ui.clearFeedback();
    if (onward) this.heal(Math.round(this.run.maxHp * CONFIG.run.zoneHeal), false); // a breather on the road between zones
    this.cameras.main.fadeOut(onward ? 600 : 220, 8, 8, 16);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.startRoom(onward); this.cameras.main.fadeIn(onward ? 700 : 260, 8, 8, 16); });
  }

  /** Training room: learn a trick for loot. Picks a lesson for your weakest skill when possible. */
  private async trainingRoom() {
    this.paused = true;
    const weakest = Object.keys(this.runSkills).concat(Object.keys(save.skills))
      .map(k => ({ k, s: getSkill(k) })).filter(x => x.s && generatorByKey(x.k))
      .sort((a, b) => effectiveBox(a.s) - effectiveBox(b.s))[0];
    const fromWeak = weakest ? trickForGenerator(weakest.k) : undefined;
    const options = TRICKS.filter(t => !this.run.trainingDone.includes(t.id));
    const trick = fromWeak && !this.run.trainingDone.includes(fromWeak.id) ? fromWeak : options[Math.floor(Math.random() * options.length)];
    this.run.trainingDone.push(trick.id);
    const goldFor = (c: number) => c * CONFIG.training.goldPerCorrect + 10;
    const firstTime = !save.pointsEarned.includes(`lesson-${trick.id}`);
    const { correct } = await runLesson(trick, c => `You earned ${goldFor(c)} gold and +25 special charge.${firstTime ? (c >= 3 ? ' +1 skill point!' : ' Get 3 of 4 right for a skill point.') : ''}`);
    this.run.gold += goldFor(correct);
    if (correct >= 3) earnPoint(`lesson-${trick.id}`, trick.title);
    this.addCharge(25);
    this.paused = false; this.resetStick();
    this.showDoors();
  }

  /** Rocks, trees, houses… so a room isn't an empty field (see game/room.ts and game/village.ts). */
  private placeLayout(props: PlacedProp[], decor: PlacedDecor[]) {
    // bushes are low: you can't walk through them, but shots fly over
    const bushCol = (d: PlacedDecor, w: number) => ({ x: d.x, y: d.y - 3, r: Math.max(7, Math.min(11, w * 0.3)) });
    const bushes = decor.filter(d => d.kind === 'bush');
    const area = { left: this.bounds.left, right: this.bounds.right, top: this.bounds.top, bottom: this.bounds.bottom };
    const solidBushes = this.zone.style !== 'village' || reachable(area, props, bushes.map(d => bushCol(d, this.textures.getFrame(d.texture).width)));
    for (const d of decor) {
      const img = this.add.image(d.x, d.y, d.texture).setOrigin(0.5, 0.8).setDepth(d.kind === 'bush' ? d.y : 1.5);
      if (d.kind === 'bush') {
        this.castShadow(img, false);
        if (solidBushes) { this.props.push({ img, colliders: [bushCol(d, img.width)], solid: false }); continue; }
      }
      this.decor.push(img);
    }
    for (const p of props) {
      const def = PROPS[p.kind];
      const img = this.add.image(p.x, p.y, p.texture).setOrigin(0.5, def.originY).setFlipX(p.flip).setDepth(p.kind === 'pit' ? 1.6 : p.y);
      const cols = collidersOf(p);
      if (p.kind !== 'pit') { // a soft contact shadow at the foot, and the long cast shadow to the lower right
        const span = Math.max(...def.colliders.map(([dx, , r]) => Math.abs(dx) + r)) * 2 + 8;
        this.decor.push(this.add.image(p.x, p.y - 3, 'prop_shadow').setScale(span / 32, Math.min(1.3, span / 44)).setAlpha(0.6).setDepth(1.7));
        this.castShadow(img, p.flip);
      }
      const b = img.getBounds();
      this.props.push({ img, colliders: cols, solid: def.solid, box: def.solid ? { x: b.x, y: b.y, w: b.width, h: b.height } : undefined });
      const burning = p.kind === 'burnt' || p.kind === 'blaze' || p.texture === 'vh_hay1' || p.texture === 'vh_ruin1';
      if (burning) for (const [sx, sy] of FIRE_SPOTS[p.texture] ?? []) {
        const fw = img.width, fh = img.height;
        this.addFire(p.x + (sx - fw / 2) * (p.flip ? -1 : 1), p.y + (sy - fh * def.originY) + 6, p.y + 1, p.kind === 'blaze' ? 0.8 : 1);
      }
    }
  }

  /** The slanted cast shadow under a sprite (see castShadow in art/textures.ts), lined up with its top-left corner. */
  private castShadow(img: Phaser.GameObjects.Image, flip: boolean) {
    const key = `${flip ? 'shf' : 'sh'}_${img.texture.key}`;
    if (!this.textures.exists(key)) return;
    const left = img.x - img.width * img.originX, top = img.y - img.height * img.originY;
    this.decor.push(this.add.image(left, top, key).setOrigin(0).setAlpha(0.42).setDepth(1.65));
  }

  /** A flickering flame with a warm glow, rising smoke and the odd ember. */
  private addFire(x: number, y: number, depth: number, scale: number) {
    const glow = this.add.ellipse(x, y - 8, 70 * scale, 40 * scale, 0xff9a40, 0.18).setDepth(depth - 0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.08, scale: 1.12, yoyo: true, repeat: -1, duration: 380 + Math.random() * 200, ease: 'Sine.InOut' });
    const flame = this.add.sprite(x, y, 'vh_fire0').setOrigin(0.5, 1).setScale(scale).setDepth(depth).play({ key: 'vfire', startFrame: Math.floor(Math.random() * 3) });
    flame.anims.timeScale = 0.8 + Math.random() * 0.5;
    const smoke = this.add.particles(x, y - 22 * scale, 'smoke', {
      speedY: { min: -38, max: -22 }, speedX: { min: -6, max: 14 }, lifespan: 2400, frequency: 300, quantity: 1,
      scale: { start: 0.8, end: 2.3 }, alpha: { start: 0.38, end: 0 }, rotate: { min: 0, max: 360 },
    }).setDepth(1850);
    const embers = this.add.particles(x, y - 10, 'pxw', {
      speedY: { min: -70, max: -30 }, speedX: { min: -20, max: 20 }, lifespan: 1100, frequency: 420, quantity: 1,
      scale: { start: 1, end: 0.3 }, alpha: { start: 1, end: 0 }, tint: [0xffd060, 0xff8a30],
    }).setDepth(1851);
    this.decor.push(glow, flame, smoke, embers);
  }

  /** Emberfall's air: a warm haze and embers drifting across the whole room. */
  private villageAir() {
    this.decor.push(this.add.rectangle(0, 0, this.W, this.H, 0xffb060, 0.035).setOrigin(0).setDepth(1880).setBlendMode(Phaser.BlendModes.ADD)); // warm late-afternoon light
    this.decor.push(this.add.particles(0, 0, 'pxw', {
      x: { min: 0, max: this.W }, y: { min: this.H * 0.4, max: this.H }, speedY: { min: -40, max: -15 }, speedX: { min: 5, max: 25 },
      lifespan: 4000, frequency: 260, scale: { start: 1, end: 0.4 }, alpha: { start: 0.9, end: 0 }, tint: [0xffc060, 0xff7a30],
    }).setDepth(1870));
  }

  /** Push a circle out of every prop it overlaps (so things slide around rocks instead of sticking). */
  private pushOut(x: number, y: number, r: number): [number, number] {
    for (const p of this.props) for (const c of p.colliders) {
      let dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy);
      const min = c.r + r;
      if (d >= min) continue;
      if (d < 0.01) { dx = 0; dy = 1; d = 1; }
      x = c.x + (dx / d) * min; y = c.y + (dy / d) * min;
    }
    return [x, y];
  }
  /**
   * Does a shot or bullet hit something solid? (`x`, `y`) is where it's drawn, `ground` the ground
   * line under it. It hits a prop's base colliders, or any visible pixel of the prop's picture
   * (a tree crown, a roof) as long as the shot is behind or level with the prop, not passing in front.
   */
  private hitsSolid(x: number, y: number, ground: number): boolean {
    for (const p of this.props) {
      if (!p.solid) continue;
      if (p.colliders.some(c => Math.hypot(c.x - x, c.y - ground) < c.r)) return true;
      const b = p.box;
      if (!b || ground > p.img.y + 2 || x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h) continue;
      const lx = Math.floor(p.img.flipX ? b.w - 1 - (x - b.x) : x - b.x), ly = Math.floor(y - b.y);
      const m = this.maskOf(p.img.texture.key);
      if (m && m.solid[ly * m.w + lx]) return true;
    }
    return false;
  }

  /** Which pixels of a texture are solid (opaque), worked out once per texture and kept. */
  private maskOf(key: string): { w: number; solid: Uint8Array } | null {
    const hit = MASKS.get(key);
    if (hit !== undefined) return hit;
    const src = this.textures.get(key).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
    let mask: { w: number; solid: Uint8Array } | null = null;
    try {
      const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
      const ctx = c.getContext('2d')!; ctx.drawImage(src, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data, solid = new Uint8Array(c.width * c.height);
      for (let i = 0; i < solid.length; i++) solid[i] = data[i * 4 + 3] > 120 ? 1 : 0;
      mask = { w: c.width, solid };
    } catch { /* unreadable texture: fall back to the base colliders only */ }
    MASKS.set(key, mask);
    return mask;
  }
  private dust(x: number, y: number) {
    const puff = this.add.particles(x, y, 'pxw', { speed: { min: 20, max: 70 }, lifespan: 260, quantity: 6, scale: { start: 1.4, end: 0 }, tint: [0x8a847c, 0x6a6460], emitting: false }).setDepth(1500);
    puff.explode(6); this.time.delayedCall(400, () => puff.destroy());
  }

  /* ================= main loop ================= */

  update(_time: number, deltaMs: number) {
    if (this.paused || this.ended) { this.drawStick(); return; }
    this.checkPromptGuard(deltaMs);
    if (this.easing < 0.5 && !this.prompting) { this.easing += deltaMs / 1000; this.timeScale = 0.25 + 0.75 * Math.min(1, this.easing / 0.5); }
    const dt = Math.min(0.05, deltaMs / 1000) * this.timeScale;
    this.tweens.timeScale = this.timeScale || 1;

    this.updateHero(dt);
    const edt = this.frostTimer > 0 ? dt * this.frostFactor : dt; // Frost Field / Time Rift slow or freeze enemies and their bullets
    if (this.frostTimer > 0) {
      this.frostTimer -= dt;
      if (this.frostTimer <= 0) {
        this.enemies.forEach(e => { if (!e.dead) e.img.clearTint(); });
        if (this.riftDamage > 0) { const d = this.riftDamage; this.riftDamage = 0; this.cameras.main.shake(200, 0.01); [...this.enemies].forEach(e => this.damageEnemy(e, d, 'special')); }
      }
    }
    for (const e of this.enemies) {
      updateEnemy(e, this.arena, edt);
      if (!flies(e.kind) && this.props.length) { [e.x, e.y] = this.pushOut(e.x, e.y, e.radius * 0.8); e.img.x = e.x; e.img.y = e.y; e.shadow.setPosition(e.x, e.y + (isBig(e.kind) ? 6 : 2)); }
    }
    if (dt > 0) this.updateContact();
    this.updateShots(dt);
    this.updateBullets(edt);
    this.updateHazards(edt);
    this.updateWard(dt);
    this.updateCrit(dt);
    this.updateCoins(dt);
    this.checkDoors();
    this.drawBossBar();
    this.drawStick();

    if (this.roomActive && this.enemies.length) {
      this.chargeOverTime(dt);
      this.critCooldown -= dt;
    }
    this.hudTimer -= deltaMs;
    if (this.hudTimer <= 0) { this.hudTimer = 80; this.pushHud(); }
  }

  /** Every equipped skill charges on its own, so casting one never sets the other back. */
  private addCharge(amount: number) {
    this.run.charges = this.run.charges.map(c => Math.min(100, c + amount));
  }
  /** Fill each skill's meter at its own speed: full in `recharge` seconds of combat (gear and the Focus power speed it up). */
  private chargeOverTime(dt: number) {
    const mult = this.stats.chargeMult * (1 + 0.3 * (this.run.perks.focus ?? 0));
    this.run.charges = this.run.charges.map((c, i) => { const sk = this.skills[i]; return sk ? Math.min(100, c + (100 / sk.recharge) * mult * dt) : c; });
  }

  private pushHud() {
    const r = this.run;
    ui.updateHud({ hp: r.hp, maxHp: r.maxHp, gold: r.gold, room: localRoom(r.room), totalRooms: ZONE_ROOMS, zone: this.zone.name, charges: r.charges, perks: r.perks, skills: this.skills });
  }

  private updateHero(dt: number) {
    const h = this.hero, k = this.keys;
    let mx = this.stick.dx, my = this.stick.dy;
    if (k.left.isDown || k.a.isDown) mx -= 1;
    if (k.right.isDown || k.d.isDown) mx += 1;
    if (k.up.isDown || k.w.isDown) my -= 1;
    if (k.down.isDown || k.s.isDown) my += 1;
    const len = Math.hypot(mx, my);
    h.moving = len > 0.2;
    if (h.moving) {
      const speed = CONFIG.hero.speed * this.stats.moveMult * (1 + 0.15 * (this.run.perks.swift ?? 0)) * Math.min(1, len);
      h.x += (mx / len) * speed * dt; h.y += (my / len) * speed * dt;
      h.dir = dirOf(mx, my, h.dir); if (Math.abs(mx) > 0.1) h.facing = mx > 0 ? 1 : -1;
    }
    // near a door you may step into the wall gap
    const top = this.doors.some(d => Math.abs(d.x - h.x) < 18) ? CONFIG.world.wallTop - 4 : this.bounds.top;
    h.x = Phaser.Math.Clamp(h.x, this.bounds.left + 8, this.bounds.right - 8);
    h.y = Phaser.Math.Clamp(h.y, top, this.bounds.bottom - 4);
    // a few passes, so standing between two colliders (or a collider and the wall) can't trap you
    for (let i = 0; i < 3 && this.props.length; i++) {
      [h.x, h.y] = this.pushOut(h.x, h.y, CONFIG.hero.radius);
      h.x = Phaser.Math.Clamp(h.x, this.bounds.left + 8, this.bounds.right - 8);
      h.y = Phaser.Math.Clamp(h.y, top, this.bounds.bottom - 4);
    }

    // attack when standing still
    h.fireCooldown -= dt;
    const target = this.nearestEnemy();
    if (!h.moving && target && h.fireCooldown <= 0 && this.roomActive && !this.prompting) {
      h.fireCooldown = 1 / (CONFIG.hero.shotsPerSecond * this.stats.rateMult * (1 + 0.2 * (this.run.perks.rapid ?? 0)));
      this.attack(target);
    }
    if (target && !h.moving) { h.facing = target.x >= h.x ? 1 : -1; h.dir = dirOf(target.x - h.x, target.y - h.y, h.dir); }

    // draw: pick the animation (attack > run > idle) for the direction faced, damage blink
    h.invulnerable -= dt; h.swing = Math.max(0, h.swing - dt);
    const now = this.time.now;
    const want = now < h.attackUntil ? `hero_attack1_${h.dir}` : h.moving ? `hero_run_${h.dir}` : `hero_idle_${h.dir}`;
    if (h.body.anims.currentAnim?.key !== want) h.body.play(want, true);
    h.body.setPosition(h.x, h.y).setDepth(h.y);
    h.body.setAlpha(h.invulnerable > 0 && Math.floor(h.invulnerable * 20) % 2 === 0 ? 0.4 : 1);
    h.shadow.setPosition(h.x, h.y);
    // a saved crit: a pulsing gold ring under the hero until it fires
    if (this.critSaved) {
      this.critRing ??= this.add.ellipse(h.x, h.y, 34, 14).setStrokeStyle(2, 0xf2c94c, 0.9).setDepth(1.9);
      this.critRing.setPosition(h.x, h.y).setVisible(true).setScale(1 + 0.08 * Math.sin(this.time.now / 120));
    } else this.critRing?.setVisible(false);
    const bob = 0;
    // fading after-images while moving, for a fast, sharp feel
    this.trailTimer -= dt;
    if (h.moving && this.trailTimer <= 0) {
      this.trailTimer = 0.07;
      const ghost = this.add.image(h.x, h.y - bob, h.body.texture.key, h.body.frame.name).setScale(2).setOrigin(ORIGIN_X, ORIGIN_Y)
        .setTint(0x8fb4ff).setAlpha(0.3).setDepth(h.y - 1);
      this.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
    }
  }

  /** Auto-aim target: the nearest enemy, except that a boss takes priority unless a helper is right on top of you. */
  private nearestEnemy(): Enemy | undefined {
    let best: Enemy | undefined, bd = Infinity;
    for (const e of this.enemies) { const d = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    const boss = this.enemies.find(e => isBig(e.kind));
    if (boss && best && best !== boss && bd > 70) return boss;
    return best;
  }

  /**
   * Is now a fair moment to stop for a question? Not when a bullet is about to reach you, an enemy
   * is right on top of you, a charger is winding up or charging, or a warning circle is under you.
   */
  private safeForCrit(): boolean {
    const h = this.hero;
    for (const b of this.bullets) {
      const dx = h.x - b.x, dy = h.y - 16 - b.y, d = Math.hypot(dx, dy);
      if (d < 70) return false;
      if (d < 170 && (b.vx * dx + b.vy * dy) / (Math.hypot(b.vx, b.vy) * d || 1) > 0.8) return false; // heading your way
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Phaser.Math.Distance.Between(h.x, h.y, e.x, e.y);
      if (d < e.radius + 55) return false;
      const charger = e.kind === 'boar' || e.kind === 'tusk' || e.kind === 'hound' || e.kind === 'cinderjaw';
      if (charger && e.phase >= 1 && d < 260) return false;
    }
    for (const hz of this.hazards) if (Phaser.Math.Distance.Between(hz.x, hz.y, h.x, h.y) < hz.r + 30) return false;
    return true;
  }

  /** Is there a clear line for a slash from the hero to this enemy (no tree, rock or house in the way)? */
  private clearShot(e: Enemy): boolean {
    const h = this.hero, x0 = h.x, y0 = h.y - 20, x1 = e.x, y1 = e.y - 8, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10);
    for (let i = 1; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; if (this.hitsSolid(x, y, y + 20)) return false; }
    return true;
  }

  /** Throw slashes at the target. Sometimes it becomes a crit, which asks a question. */
  private attack(target: Enemy) {
    // auto-aim prefers someone you can actually hit: the nearest enemy in clear view, if the first pick is behind cover
    if (this.props.length && !this.clearShot(target)) {
      const open = this.enemies.filter(e => !e.dead && e !== target && this.clearShot(e))
        .sort((a, b) => Phaser.Math.Distance.Between(this.hero.x, this.hero.y, a.x, a.y) - Phaser.Math.Distance.Between(this.hero.x, this.hero.y, b.x, b.y))[0];
      if (open) target = open;
    }
    const h = this.hero, p = this.run.perks;
    h.swing = 0.15; h.attackUntil = this.time.now + 400; // play the swing animation
    const damage = this.stats.damage * (1 + 0.2 * (p.sharp ?? 0));
    const chance = this.stats.critChance + 0.05 * (p.keen ?? 0);
    // A crit that rolls is saved (gold ring under the hero) until a safe moment, so the question
    // never pops up just as a bullet or a charging boar is about to hit you.
    if (!this.critSaved && !this.crit && (this.guaranteedCrit || (this.critCooldown <= 0 && Math.random() < chance))) { this.guaranteedCrit = false; this.critSaved = true; }
    if (this.critSaved && !this.crit && !this.prompting && this.safeForCrit()) { this.critSaved = false; this.launchCrit(target, damage); return; }

    const base = Math.atan2(target.y - h.y, target.x - h.x);
    const count = 1 + (p.multishot ?? 0);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * 0.2;
      const img = this.add.image(h.x, h.y - 20, 'slash').setScale(2).setRotation(a).setDepth(1500);
      this.shots.push({ img, x: h.x, y: h.y - 20, vx: Math.cos(a) * CONFIG.hero.slashSpeed, vy: Math.sin(a) * CONFIG.hero.slashSpeed, damage, pierce: 1 + (p.pierce ?? 0), hits: new Set() });
    }
  }

  private updateShots(dt: number) {
    this.shots = this.shots.filter(s => {
      s.x += s.vx * dt; s.y += s.vy * dt; s.img.setPosition(s.x, s.y);
      if (s.x < 0 || s.x > this.W || s.y < CONFIG.world.wallTop - 10 || s.y > this.H) { s.img.destroy(); return false; }
      s.img.setDepth(s.y + 20); // drawn at its ground line: behind things in front of it, over things behind it
      if (this.hitsSolid(s.x, s.y, s.y + 20)) { this.dust(s.x, s.y + 4); s.img.destroy(); return false; } // slashes fly 20 px above the ground
      for (const e of this.enemies) {
        if (s.hits.has(e) || e.dead) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, e.x, e.y - 8) < e.radius + 6) {
          s.hits.add(e);
          this.damageEnemy(e, s.damage, 'normal');
          this.addCharge(CONFIG.special.chargePerHit);
          if (--s.pierce <= 0) { s.img.destroy(); return false; }
        }
      }
      return true;
    });
  }

  private fireBullet(x: number, y: number, angle: number, speed: number, damage: number, tex: string) {
    if (this.crit?.isSuper) return; // a super crit silences every enemy
    const img = this.add.image(x, y, tex).setScale(2).setDepth(1600);
    this.bullets.push({ img, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage });
  }

  private updateBullets(dt: number) {
    const h = this.hero;
    this.bullets = this.bullets.filter(b => {
      b.x += b.vx * dt; b.y += b.vy * dt; b.img.setPosition(b.x, b.y);
      if (b.x < 0 || b.x > this.W || b.y < CONFIG.world.wallTop - 20 || b.y > this.H) { b.img.destroy(); return false; }
      b.img.setDepth(b.y + 8);
      if (this.hitsSolid(b.x, b.y, b.y + 8)) { this.dust(b.x, b.y); b.img.destroy(); return false; } // rocks, trees and houses are cover
      if (Phaser.Math.Distance.Between(b.x, b.y, h.x, h.y - 16) < CONFIG.hero.radius + 4) { this.hurtHero(b.damage); b.img.destroy(); return false; }
      return true;
    });
  }

  /** Root eruption warnings fill up, then burst: stand in one and you get hit. */
  private updateHazards(dt: number) {
    if (!this.hazards.length) return;
    this.hazards = this.hazards.filter(hz => {
      hz.t += dt;
      const k = Math.min(1, hz.t / hz.delay), g = hz.g;
      g.clear();
      const col = hz.style === 'fire' ? 0xff8a30 : 0xd0604f;
      g.fillStyle(col, 0.1 + 0.25 * k).fillEllipse(hz.x, hz.y, hz.r * 2 * k, hz.r * 1.4 * k);
      g.lineStyle(2, col, 0.5 + 0.4 * k).strokeEllipse(hz.x, hz.y, hz.r * 2, hz.r * 1.4);
      if (hz.t < hz.delay) return true;
      g.destroy();
      if (hz.style === 'fire') this.fireBurst(hz.x, hz.y, hz.r); else this.rootBurst(hz.x, hz.y, hz.r);
      if (Phaser.Math.Distance.Between(hz.x, hz.y, this.hero.x, this.hero.y) < hz.r + CONFIG.hero.radius) this.hurtHero(hz.damage);
      return false;
    });
  }

  /** Roots spearing up out of the ground. */
  private rootBurst(x: number, y: number, r: number) {
    const g = this.add.graphics().setDepth(y + 1);
    for (let i = 0; i < 7; i++) {
      const ox = x + (i - 3) * (r / 3.5) + Phaser.Math.Between(-3, 3), h = 22 + Math.random() * 18, w = 5 + Math.random() * 3;
      g.fillStyle(0x191521, 1).fillTriangle(ox - w - 1, y + 4, ox + w + 1, y + 4, ox, y - h - 2);
      g.fillStyle(i % 2 ? 0x5a4030 : 0x6f8c48, 1).fillTriangle(ox - w, y + 3, ox + w, y + 3, ox, y - h);
    }
    this.tweens.add({ targets: g, alpha: 0, delay: 350, duration: 300, onComplete: () => g.destroy() });
    this.cameras.main.shake(110, 0.005);
  }

  /** Flames bursting up out of the ground. */
  private fireBurst(x: number, y: number, r: number) {
    const n = Math.max(2, Math.round(r / 9));
    for (let i = 0; i < n; i++) {
      const f = this.add.sprite(x + (i - (n - 1) / 2) * (r / n) * 1.6, y + 4 + (i % 2) * 3, 'vh_fire0').setOrigin(0.5, 1).setScale(0.8).setDepth(y + 1).play('vfire');
      this.tweens.add({ targets: f, alpha: 0, scaleY: 2.2, delay: 250, duration: 350, onComplete: () => f.destroy() });
    }
    const puff = this.add.particles(x, y - 6, 'pxw', { speed: { min: 30, max: 110 }, angle: { min: 200, max: 340 }, lifespan: 500, quantity: 10, scale: { start: 1.4, end: 0 }, tint: [0xffd060, 0xff7a30, 0xe0502a], emitting: false }).setDepth(1500);
    puff.explode(10); this.time.delayedCall(600, () => puff.destroy());
    if (r > 20) this.cameras.main.shake(90, 0.004);
  }

  private updateContact() {
    for (const e of this.enemies) {
      if (Phaser.Math.Distance.Between(e.x, e.y, this.hero.x, this.hero.y) < e.radius + CONFIG.hero.radius) this.hurtHero(e.contactDamage);
    }
  }

  /* ================= crit: slow-mo + 3 options ================= */

  private launchCrit(target: Enemy, damage: number) {
    const h = this.hero;
    // adaptive: the problem's category sets its tier (your level there); early rooms stay gentler
    const cat = pickCategory();
    const tier = Math.min(recommendedTier(cat), this.run.room < 2 ? 2 : 3, Math.random() < 0.25 ? 1 : 4);
    const problem = pickProblem(tier, this.recent, undefined, cat);
    this.remember(problem.key);
    const isSuper = this.forceSuper || Math.random() < CONFIG.crit.superChance || (import.meta.env.DEV && new URLSearchParams(location.search).has('super'));
    this.forceSuper = false;
    const windowSec = this.stats.critWindow * CONFIG.critByTier.windowMult[tier] * (isSuper ? CONFIG.crit.superWindowMult : 1);
    const dist = Phaser.Math.Distance.Between(h.x, h.y, target.x, target.y);
    // super crit: the orb drifts in slow motion and lands as the window closes; normal crit: time is frozen, orb hovers
    const speed = isSuper ? Math.max(40, dist / (windowSec * CONFIG.crit.superTimeScale)) * 0.95 : 0;
    const img = this.add.image(h.x, h.y - 24, 'crit').setScale(isSuper ? 3 : 2).setDepth(1700);
    if (isSuper) img.setTint(0xff9a45);
    this.tweens.add({ targets: img, scale: isSuper ? 4 : 3.2, yoyo: true, repeat: -1, duration: 160 });
    this.crit = { img, x: h.x, y: h.y - 20, target, speed, damage: damage * CONFIG.critByTier.damageMult[tier], state: 'pending', isSuper };
    this.startPrompt();
    this.timeScale = isSuper ? CONFIG.crit.superTimeScale : 0;
    this.cameras.main.zoomTo(isSuper ? 1.08 : 1.04, 200);
    if (isSuper) {
      // drama: wipe every bullet, tint the screen, big label
      this.bullets.forEach(b => { this.tweens.add({ targets: b.img, alpha: 0, scale: 0, duration: 250, onComplete: () => b.img.destroy() }); }); this.bullets = [];
      this.superTint = this.add.rectangle(0, 0, this.W, this.H, 0xff9a45, 0.12).setOrigin(0).setDepth(1890);
      this.cameras.main.flash(150, 255, 190, 110);
      this.floatText(this.W / 2, this.H * 0.4, 'SUPER CRIT', '#ffb648', 30);
      this.hero.invulnerable = windowSec + 1;
    }

    ui.askChoice(problem, windowSec, isSuper).then(res => {
      if (this.ended) return;
      // unfreeze first, so nothing below can ever leave the game stuck in frozen time
      this.endPrompt(); this.critCooldown = CONFIG.crit.cooldown;
      this.easeIn(); // time picks up over half a second, and you're briefly safe, so you can react
      this.cameras.main.zoomTo(1, 200);
      if (this.superTint) { const t = this.superTint; this.superTint = undefined; this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }); }
      const c = this.crit;
      if (c?.isSuper) this.hero.invulnerable = Math.max(0.5, this.wardTimer); // don't cut short an active Ward
      if (res.kind === 'exact') { this.run.stats.exact++; this.run.stats.critsHit++; if (c) { c.state = 'hit'; c.speed = 520; } }
      else { this.run.stats.critsMissed++; if (c) c.state = 'fizzle'; }
      this.run.stats.answered++;
      try {
        logAnswer(problem, res.kind, res.seconds, true);
        this.trackRunSkill(problem.genKey, res.kind === 'exact');
        if (res.kind !== 'exact') { ui.explainResult(problem, res.kind, res.seconds); this.missed.push(ui.missedEntry(problem)); }
      } catch (err) { console.error(err); }
    });
  }

  private updateCrit(dt: number) {
    const c = this.crit;
    if (!c) return;
    if (c.target.dead) { const t = this.nearestEnemy(); if (t) c.target = t; else if (c.state === 'hit') c.state = 'fizzle'; }
    const tx = c.target.x, ty = c.target.y - 8, d = Phaser.Math.Distance.Between(c.x, c.y, tx, ty);
    if (c.state === 'fizzle') {
      this.crit = null;
      this.tweens.add({ targets: c.img, alpha: 0, scale: 0.5, duration: 250, onComplete: () => c.img.destroy() });
      this.floatText(c.x, c.y, 'miss', '#8a8478', 14);
      return;
    }
    if (c.state === 'pending' && (d < 18 || c.speed === 0)) return; // hover until answered
    const step = Math.min(d, c.speed * dt);
    c.x += ((tx - c.x) / d) * step; c.y += ((ty - c.y) / d) * step; c.img.setPosition(c.x, c.y);
    if (c.state === 'hit' && d < 10) {
      const dmg = c.damage * (c.isSuper ? CONFIG.crit.superDamageMult : CONFIG.crit.damageMult) * (1 + 0.5 * (this.run.perks.execute ?? 0));
      this.damageEnemy(c.target, dmg, 'crit');
      this.cameras.main.shake(c.isSuper ? 260 : 120, c.isSuper ? 0.014 : 0.006);
      c.img.destroy(); this.crit = null;
    }
  }

  /**
   * A question is on screen: time stops and the thumb-stick lets go (the finger that held it
   * lifts over the question panel, where the game can't always see it).
   */
  private startPrompt() { this.prompting = true; this.timeScale = 0; this.promptGuard = 0; this.resetStick(); }
  private endPrompt() { this.prompting = false; this.timeScale = 1; this.promptGuard = 0; this.resetStick(); }
  /** After a question: time speeds back up from slow motion over 0.5 s, with a short safety window. */
  private easeIn() {
    this.hero.invulnerable = Math.max(this.hero.invulnerable, 0.6);
    this.easing = 0; this.timeScale = 0.25; // update() ramps it to 1
  }
  private resetStick() { this.stick = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 }; }
  /**
   * Safety net: if the game thinks a question is open but none is on screen, unfreeze.
   * (Checked about twice a second; a question panel always has the .crit or .typed-sheet class.)
   */
  private checkPromptGuard(deltaMs: number) {
    if (!this.prompting) return;
    this.promptGuard += deltaMs;
    if (this.promptGuard < 600) return;
    this.promptGuard = 0;
    if (!document.querySelector('.overlay.crit, .typed-sheet')) { console.warn('prompt guard: no question on screen, unfreezing'); this.endPrompt(); this.cameras.main.zoomTo(1, 200); }
  }

  /* ================= special skills: type the answer, cast the effect ================= */

  private useSpecial(index: number) {
    const skill = this.skills[index];
    if (!skill || this.prompting || this.paused || this.ended) return;
    if (!this.roomActive || !this.enemies.length) { ui.feedback('No enemies here', 1.2); return; }
    if (this.run.charges[index] < 100) { const left = ((100 - this.run.charges[index]) / 100) * skill.recharge / this.stats.chargeMult; ui.feedback(`${skill.name} recharging · about ${Math.ceil(left)}s`, 1.2); return; }
    this.startPrompt(); // time stands still while you think
    ui.askSpecial(skill, this.stats.calm, this.run.perks, this.recent).catch(err => { console.error(err); return null; }).then(res => {
      if (this.ended) return;
      this.endPrompt(); this.easeIn();
      if (!res) return;
      const p = res.problem, perks = this.run.perks;
      this.remember(p.key);
      logAnswer(p, res.kind, res.seconds);
      this.trackRunSkill(p.genKey, res.kind === 'exact');
      this.run.stats.answered++; this.run.stats.specials++;
      if (res.kind === 'exact') this.run.stats.exact++;
      if (res.kind !== 'exact') this.missed.push(ui.missedEntry(p));

      const target = TIER_TARGET[p.tier] * CONFIG.speed.targetMult * (1 + this.stats.calm + 0.35 * (perks.calm ?? 0));
      const sp = CONFIG.speed;
      const [mult, label] = res.kind !== 'exact' ? [1, ''] : res.seconds <= target * 0.5 ? [sp.lightningMult, ' · Lightning!'] : res.seconds <= target ? [sp.quickMult, ' · Quick'] : res.seconds <= target * 2 ? [1, ''] : [sp.slowMult, ' · Slow'];
      const closeBoost = this.stats.closeMult * (perks.close ? 2 : 1);
      const credit = res.kind === 'close' ? Math.min(0.9, res.credit * closeBoost) : res.credit;
      const strength = credit * mult; // 0 = fizzle, 1 = exact, up to 1.5 = lightning-fast exact

      if (strength <= 0) {
        this.run.charges[index] = CONFIG.special.missKeeps; // a miss burns most of the charge
        this.floatText(this.hero.x, this.hero.y - 50, 'fizzle…', '#8a8478', 16);
        ui.explainResult(p, res.kind, res.seconds);
        return;
      }
      this.run.charges[index] = 0;
      const note = this.cast(skill, strength);
      ui.explainResult(p, res.kind, res.seconds, `${label} · ${note}`);
    });
  }

  /** Apply a skill's effect. `strength` scales damage, duration or healing. Returns a short note for the feedback line. */
  private cast(skill: Skill, strength: number): string {
    const h = this.hero, hit = this.stats.damage * skill.power * strength;
    const dmg = Math.round(hit);
    switch (skill.id) {
      case 'nova':
        this.shockwave(dmg, 0x7fbf9a); return `${dmg} to everything`;
      case 'meteor':
        this.shockwave(dmg, 0xd9894a); this.cameras.main.shake(400, 0.018); return `${dmg} to everything`;
      case 'ward': {
        const secs = skill.power * strength;
        this.wardTimer = secs; h.invulnerable = Math.max(h.invulnerable, secs);
        this.bullets.forEach(b => b.img.destroy()); this.bullets = [];
        this.cameras.main.flash(100, 160, 200, 255);
        return `shielded for ${secs.toFixed(1)}s`;
      }
      case 'mend': {
        const amount = Math.round(this.run.maxHp * (skill.power / 100) * strength);
        this.heal(amount); this.cameras.main.flash(100, 160, 255, 160);
        return `+${amount} HP`;
      }
      case 'chain': {
        const targets = [...this.enemies].sort((a, b) => Phaser.Math.Distance.Between(h.x, h.y, a.x, a.y) - Phaser.Math.Distance.Between(h.x, h.y, b.x, b.y)).slice(0, 3);
        const g = this.add.graphics().setDepth(1800);
        let px = h.x, py = h.y - 20;
        for (const t of targets) {
          g.lineStyle(3, 0xfff2b0, 1).lineBetween(px, py, t.x, t.y - 8); g.lineStyle(1, 0xa8e4ff, 1).lineBetween(px, py, t.x, t.y - 8);
          px = t.x; py = t.y - 8;
          this.damageEnemy(t, dmg, 'special');
        }
        this.tweens.add({ targets: g, alpha: 0, duration: 350, onComplete: () => g.destroy() });
        this.cameras.main.flash(80, 255, 250, 220);
        return `${dmg} × ${targets.length}`;
      }
      case 'frost': {
        const secs = skill.power * strength;
        this.frostTimer = secs; this.frostFactor = 0.4;
        this.enemies.forEach(e => e.img.setTint(0x9ad0ff));
        this.cameras.main.flash(120, 150, 200, 255);
        return `enemies slowed for ${secs.toFixed(1)}s`;
      }
      case 'execute': {
        const t = this.nearestEnemy();
        if (!t) return 'no target';
        this.damageEnemy(t, dmg, 'special');
        const mark = this.add.image(t.x, t.y - 8, 'crit').setScale(6).setTint(0xff5d72).setDepth(1800);
        this.tweens.add({ targets: mark, scale: 0, alpha: 0, duration: 400, onComplete: () => mark.destroy() });
        this.cameras.main.shake(300, 0.014);
        return `${dmg} to ${isBig(t.kind) ? 'the boss' : 'your target'}`;
      }
      case 'rift': {
        const secs = skill.power * Math.min(1.2, strength);
        this.frostTimer = secs; this.frostFactor = 0; this.riftDamage = Math.round(this.stats.damage * 12 * strength);
        this.enemies.forEach(e => e.img.setTint(0xc9b6ff));
        this.cameras.main.flash(160, 200, 180, 255);
        return `frozen ${secs.toFixed(1)}s, then ${this.riftDamage} to everything`;
      }
      case 'sight':
        this.forceSuper = true; this.guaranteedCrit = true; this.critCooldown = 0;
        this.floatText(h.x, h.y - 50, 'super crit ready', '#ffb648', 16);
        return 'next crit is a super crit';
    }
  }

  /** Nova / Meteor: hit every enemy and wipe enemy bullets. */
  private shockwave(dmg: number, color: number) {
    const ring = this.add.circle(this.hero.x, this.hero.y - 10, 10, color, 0.25).setStrokeStyle(4, color, 0.9).setDepth(1800);
    this.tweens.add({ targets: ring, radius: 420, alpha: 0, duration: 520, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
    this.cameras.main.shake(220, 0.01);
    this.cameras.main.flash(120, 255, 240, 210);
    this.bullets.forEach(b => b.img.destroy()); this.bullets = [];
    [...this.enemies].forEach(e => this.damageEnemy(e, dmg, 'special'));
    this.run.stats.bestHit = Math.max(this.run.stats.bestHit, dmg);
  }

  /* ================= damage, death, loot ================= */

  private damageEnemy(e: Enemy, amount: number, kind: 'normal' | 'crit' | 'special') {
    if (e.dead) return;
    const dmg = Math.max(1, Math.round(amount));
    e.hp -= dmg;
    this.run.stats.bestHit = Math.max(this.run.stats.bestHit, dmg);
    e.img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => { if (e.dead) return; e.img.setTintMode(Phaser.TintModes.MULTIPLY); if (this.frostTimer > 0) e.img.setTint(0x9ad0ff); else e.img.clearTint(); });
    const color = kind === 'crit' ? '#f2c94c' : kind === 'special' ? '#c9b6ff' : '#ece6d8';
    this.floatText(e.x + Phaser.Math.Between(-6, 6), e.y - 24, kind === 'crit' ? `${dmg}!` : String(dmg), color, kind === 'normal' ? 13 : 20);
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy) {
    e.dead = true;
    this.enemies = this.enemies.filter(x => x !== e);
    this.run.stats.kills++;
    const steal = 0.03 * (this.run.perks.vamp ?? 0) + this.stats.lifesteal;
    if (steal > 0) this.heal(Math.round(this.run.maxHp * steal), false);
    const burst = this.add.particles(e.x, e.y - 8, 'pxw', { speed: { min: 40, max: 140 }, lifespan: 420, quantity: 14, scale: { start: 1.6, end: 0 }, tint: [0x86a04f, 0x5a4a6a, 0xc9b86a], emitting: false }).setDepth(1450);
    burst.explode(14); this.time.delayedCall(600, () => burst.destroy());
    const coins = Math.max(1, Math.round(e.gold / 3));
    for (let i = 0; i < coins; i++) this.dropCoin(e.x, e.y, (e.gold * this.stats.goldMult * this.zone.goldMult) / coins);
    this.tweens.add({ targets: e.img, alpha: 0, scale: e.img.scale * 0.4, duration: 180, onComplete: () => destroyEnemy(e) });
    if (this.roomActive && this.enemies.length === 0) this.scheduleRoomClear();
  }

  /** Clear the room once nothing is left, but never on top of an open crit/skill prompt. */
  private scheduleRoomClear() {
    this.time.delayedCall(250, () => {
      if (this.ended || !this.roomActive || this.enemies.length) return;
      if (this.crit || this.prompting) { this.scheduleRoomClear(); return; }
      this.roomCleared();
    });
  }

  private dropCoin(x: number, y: number, value: number) {
    const img = this.add.image(x, y, 'coin').setScale(2).setDepth(1300);
    const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 60;
    this.coins.push({ img, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, value });
  }

  /** Coins pop out, then fly to the hero. */
  private updateCoins(dt: number) {
    const h = this.hero;
    this.coins = this.coins.filter(c => {
      c.age += dt;
      if (c.age < 0.35) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.9; c.vy *= 0.9; }
      else { const a = Math.atan2(h.y - 10 - c.y, h.x - c.x), sp = 200 + c.age * 300; c.x += Math.cos(a) * sp * dt; c.y += Math.sin(a) * sp * dt; }
      c.img.setPosition(c.x, c.y);
      if (Phaser.Math.Distance.Between(c.x, c.y, h.x, h.y - 10) < 10) { this.run.gold += Math.round(c.value); c.img.destroy(); return false; }
      return true;
    });
  }

  private hurtHero(amount: number) {
    const h = this.hero;
    if (h.invulnerable > 0 || this.ended) return;
    const dmg = Math.max(1, Math.round(amount * this.stats.damageTaken * Math.pow(0.85, this.run.perks.skin ?? 0)));
    this.run.hp -= dmg;
    h.invulnerable = CONFIG.hero.invulnerableAfterHit;
    this.floatText(h.x, h.y - 50, `-${dmg}`, '#d0604f', 16);
    this.cameras.main.shake(90, 0.005);
    try { navigator.vibrate?.(40); } catch { /* */ }
    this.pushHud();
    if (this.run.hp <= 0) this.endRun('died');
  }

  private heal(amount: number, show = true) {
    this.run.hp = Math.min(this.run.maxHp, this.run.hp + amount);
    if (show && amount > 0) this.floatText(this.hero.x, this.hero.y - 54, `+${amount} HP`, '#7fbf6a', 16);
  }

  private checkDoors() {
    if (!this.doors.length) return;
    const h = this.hero;
    const door = this.doors.find(d => Math.abs(d.x - h.x) < (d.enterY > CONFIG.world.wallTop + 2 ? 26 : 16) && h.y <= d.enterY);
    if (door) this.enterDoor(door);
  }

  /* ================= run end ================= */

  private async endRun(outcome: 'won' | 'died' | 'fled') {
    if (this.ended) return;
    this.ended = true; this.roomActive = false;
    if (outcome === 'died') {
      this.tweens.add({ targets: this.hero.body, alpha: 0, angle: 90, duration: 500 });
      await this.wait(700);
    }
    this.run.gold += Math.round(this.coins.reduce((a, c) => a + c.value, 0)); // coins still flying count too
    const bonus = outcome === 'won' ? CONFIG.run.clearBonus : 0;
    const total = this.run.gold + bonus;
    save.gold += total;
    if (outcome === 'won') { save.clears++; earnPointAlways('boss defeated'); }
    persist();

    const weak = Object.entries(this.runSkills).filter(([, v]) => v.n >= 2 && v.ok < v.n).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
    const st = this.run.stats;
    const choice = await ui.runEnd({
      outcome, room: localRoom(this.run.room), zone: this.zone.name, boss: this.zone.bossName, bosses: this.bossesBeaten, gold: total, bonus,
      answered: st.answered, exact: st.exact, critsHit: st.critsHit, critsMissed: st.critsMissed, bestHit: st.bestHit,
      weakest: weak ? generatorByKey(weak[0])?.label : undefined,
      tip: weak ? trickForGenerator(weak[0])?.title : undefined,
      chests: this.chestsOpened, missed: this.missed,
      canUpgrade: save.gold >= forgeCost(equippedItem('weapon')!, 1).gold,
    });
    this.onExit(choice);
  }

  private async pause() {
    if (this.paused || this.prompting || this.ended) return;
    this.paused = true;
    const r = await ui.pauseMenu(this.run.gold, `${this.zone.name} · room ${localRoom(this.run.room) + 1} of ${ZONE_ROOMS}`);
    if (r === 'flee') { this.paused = false; this.endRun('fled'); return; }
    this.paused = false; this.resetStick();
  }

  private updateWard(dt: number) {
    if (this.wardTimer <= 0) { if (this.wardRing) { this.wardRing.destroy(); this.wardRing = undefined; } return; }
    this.wardTimer -= dt;
    if (!this.wardRing) this.wardRing = this.add.circle(0, 0, 26, 0x6fa8d6, 0.12).setStrokeStyle(2, 0x9ad0ff, 0.9).setDepth(1750);
    this.wardRing.setPosition(this.hero.x, this.hero.y - 16).setScale(1 + Math.sin(this.time.now / 120) * 0.05);
  }

  /* ================= small helpers ================= */

  /** Dev/tests only: kill every enemy in the room. */
  devClear() { [...this.enemies].forEach(e => this.damageEnemy(e, e.hp + 1, 'special')); }
  /** Dev/tests only: jump to a room (0-based) of a given kind. */
  devGoto(room: number, reward: DoorSpec['reward'], difficulty: 1 | 2 | 3 = 2) { this.run.room = room; this.run.zone = zoneOfRoom(room); this.run.current = { reward, difficulty }; this.startRoom(); }
  /** Dev/tests only: show the doors you'd get after the current room. */
  devDoors() { this.clearRoom(); this.roomActive = false; this.showDoors(); }


  private remember(key: string) { this.recent.push(key); if (this.recent.length > 6) this.recent.shift(); }
  private trackRunSkill(genKey: string, ok: boolean) {
    const s = this.runSkills[genKey] ?? (this.runSkills[genKey] = { n: 0, ok: 0 });
    s.n++; if (ok) s.ok++;
  }
  private wait(ms: number) { return new Promise<void>(r => this.time.delayedCall(ms, r)); }

  /** Rising text (damage, rewards). Drawn in HTML so it stays sharp on high-DPI screens; sizes are a bit bigger than before for readability. */
  private floatText(x: number, y: number, text: string, color: string, size: number) {
    ui.floatText(x, y, text, color, Math.round(size * 1.25));
  }

  private drawStick() {
    const g = this.stickGfx; g.clear();
    if (!this.stick.active || this.paused) return;
    g.fillStyle(0xece6d8, 0.08).fillCircle(this.stick.ox, this.stick.oy, 34);
    g.lineStyle(2, 0xece6d8, 0.25).strokeCircle(this.stick.ox, this.stick.oy, 34);
    g.fillStyle(0xece6d8, 0.35).fillCircle(this.stick.ox + this.stick.dx * 34, this.stick.oy + this.stick.dy * 34, 13);
  }

  private drawBossBar() {
    const zone = this.zone, boss = this.enemies.find(e => e.kind === zone.boss || e.kind === zone.miniboss);
    const g = this.bossBar; g.clear();
    if (!boss) { ui.bossName(null); return; }
    const x = 30, y = CONFIG.world.wallTop + 8, w = this.W - 60, main = boss.kind === zone.boss;
    g.fillStyle(0x0d0b12, 0.85).fillRect(x - 2, y - 2, w + 4, 12);
    g.fillStyle(main ? zone.bossBar : zone.minibossBar, 1).fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 8);
    ui.bossName(main ? zone.bossName : zone.minibossName, y - 22);
  }
}

