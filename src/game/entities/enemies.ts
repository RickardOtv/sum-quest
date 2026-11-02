/**
 * Enemy types and their behaviour. Each enemy gets `update(dt)` every frame;
 * shooting goes through the `Arena` interface so this file never needs to
 * know about the rest of the scene.
 */
import Phaser from 'phaser';
import { CONFIG } from '../../config';
import type { EnemyKind } from '../run';

export interface Arena {
  scene: Phaser.Scene;
  heroX(): number;
  heroY(): number;
  fire(x: number, y: number, angle: number, speed: number, damage: number, texture: string): void;
  spawn(kind: EnemyKind, x: number, y: number): void;
  /** Mark a circle on the ground that bursts after `delay` seconds and hurts the hero if they're still in it (roots or fire). */
  hazard(x: number, y: number, radius: number, delay: number, damage: number, style?: 'roots' | 'fire'): void;
  /** True if a circle at (x, y) overlaps a prop (rock, tree, pit…). */
  blocked(x: number, y: number, r: number): boolean;
  bounds: { left: number; right: number; top: number; bottom: number };
  enemyCount(): number;
}

export interface Enemy {
  kind: EnemyKind;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Graphics;
  x: number; y: number;
  hp: number; maxHp: number;
  radius: number;
  contactDamage: number;
  gold: number;
  timer: number;      // attack timer
  phase: number;      // attack step / telegraph state
  aim: number;        // charge direction (boars)
  special: number;    // timer for a rarer extra attack (the boss's root eruption)
  charges: number;    // charges left in a combo (Old Tusk charges twice)
  age: number;
  target: { x: number; y: number };
  dead: boolean;
}

const TEX: Record<EnemyKind, string> = { slime: 'slime', spore: 'spore', wisp: 'wisp', boar: 'boar', tusk: 'tusk', boss: 'rootback', imp: 'imp', hound: 'hound', cinderjaw: 'cinderjaw', golem: 'golem' };
/** How big each kind is on screen, in old art pixels (regular 2, bosses 4): sets the shadow size. */
const SIZE: Record<EnemyKind, number> = { slime: 2, spore: 2, wisp: 2, boar: 2, tusk: 4, boss: 4, imp: 2, hound: 2, cinderjaw: 4, golem: 4 };
/** Display scale of each texture: the HD art (art/creatures.ts) is drawn at full size, so 1. */
export const SCALE: Record<EnemyKind, number> = { slime: 1, spore: 1, wisp: 1, boar: 1, tusk: 1, boss: 1, imp: 1, hound: 1, cinderjaw: 1, golem: 1 };
/** Mini bosses and bosses: big, with a health bar at the top instead of over their head. */
export const isBig = (k: EnemyKind) => k === 'boss' || k === 'tusk' || k === 'cinderjaw' || k === 'golem';
/** Floaters ignore props and pits and bob in the air. */
export const flies = (k: EnemyKind) => k === 'wisp' || k === 'imp';
const CHARGERS: EnemyKind[] = ['boar', 'tusk', 'hound', 'cinderjaw'];

export function createEnemy(arena: Arena, kind: EnemyKind, x: number, y: number, hpMult: number): Enemy {
  const cfg = CONFIG.enemies[kind];
  const s = arena.scene;
  const scale = SCALE[kind];
  const shadow = s.add.image(x, y, 'shadow').setScale(SIZE[kind] * (isBig(kind) ? 1.4 : 1)).setDepth(1);
  const img = s.add.image(x, y, TEX[kind]).setScale(scale).setOrigin(0.5, 0.75);
  const bar = s.add.graphics().setDepth(1400);
  const hp = Math.round(cfg.hp * hpMult);
  // appear with a small pop
  img.setScale(0); s.tweens.add({ targets: img, scale, duration: 260, ease: 'Back.Out' });
  return {
    kind, img, shadow, bar, x, y, hp, maxHp: hp, radius: cfg.radius, contactDamage: cfg.contactDamage, gold: cfg.gold,
    timer: Math.random() * 1.5, phase: 0, aim: 0, special: 0, charges: 0, age: 0, target: { x, y }, dead: false,
  };
}

const angleTo = (e: Enemy, a: Arena) => Math.atan2(a.heroY() - e.y, a.heroX() - e.x);

function ring(arena: Arena, e: Enemy, count: number, speed: number, damage: number, tex: string, offset = 0) {
  for (let i = 0; i < count; i++) arena.fire(e.x, e.y - 6, offset + (i / count) * Math.PI * 2, speed, damage, tex);
}

/** Short "about to attack" pulse so attacks can be dodged. */
function telegraph(e: Enemy, scene: Phaser.Scene, base: number) {
  scene.tweens.add({ targets: e.img, scaleX: base * 1.18, scaleY: base * 0.86, yoyo: true, duration: 200 });
}

export function updateEnemy(e: Enemy, arena: Arena, dt: number) {
  e.age += dt;
  e.timer += dt;
  const b = arena.bounds;
  switch (e.kind) {
    case 'slime': {
      // hops toward the hero: speed pulses with each hop
      const c = CONFIG.enemies.slime, a = angleTo(e, arena);
      const hop = Math.max(0, Math.sin(e.age * 6));
      e.x += Math.cos(a) * c.speed * (0.3 + hop * 1.4) * dt;
      e.y += Math.sin(a) * c.speed * (0.3 + hop * 1.4) * dt;
      e.img.setScale(SCALE.slime * (1 + hop * 0.08), SCALE.slime * (1 - hop * 0.08));
      break;
    }
    case 'spore': {
      // stands still and shoots at you
      const c = CONFIG.enemies.spore;
      if (e.phase === 0 && e.timer > c.fireEvery - 0.45) { e.phase = 1; telegraph(e, arena.scene, SCALE[e.kind]); }
      if (e.timer >= c.fireEvery) {
        e.timer = 0; e.phase = 0;
        arena.fire(e.x, e.y - 8, angleTo(e, arena), c.bulletSpeed, c.bulletDamage, 'bullet_spore');
      }
      break;
    }
    case 'wisp': {
      // drifts around and fires bullet rings
      const c = CONFIG.enemies.wisp;
      const dx = e.target.x - e.x, dy = e.target.y - e.y, d = Math.hypot(dx, dy);
      if (d < 6) e.target = { x: Phaser.Math.Between(b.left + 20, b.right - 20), y: Phaser.Math.Between(b.top + 20, b.top + (b.bottom - b.top) * 0.55) };
      else { e.x += (dx / d) * c.speed * dt; e.y += (dy / d) * c.speed * dt; }
      e.img.y = e.y - 4 + Math.sin(e.age * 4) * 3;
      if (e.phase === 0 && e.timer > c.fireEvery - 0.5) { e.phase = 1; telegraph(e, arena.scene, SCALE[e.kind]); }
      if (e.timer >= c.fireEvery) { e.timer = 0; e.phase = 0; ring(arena, e, c.ringCount, c.bulletSpeed, c.bulletDamage, 'bullet_wisp', e.age); }
      break;
    }
    case 'imp': {
      // Ember imp: flits between spots in the upper room, then throws a spread of three fireballs at you
      const c = CONFIG.enemies.imp;
      const dx = e.target.x - e.x, dy = e.target.y - e.y, d = Math.hypot(dx, dy);
      if (d < 6) e.target = { x: Phaser.Math.Between(b.left + 20, b.right - 20), y: Phaser.Math.Between(b.top + 20, b.top + (b.bottom - b.top) * 0.6) };
      else { e.x += (dx / d) * c.speed * dt; e.y += (dy / d) * c.speed * dt; }
      e.img.y = e.y - 6 + Math.sin(e.age * 6) * 3; e.img.setFlipX(arena.heroX() < e.x);
      if (e.phase === 0 && e.timer > c.fireEvery - 0.45) { e.phase = 1; telegraph(e, arena.scene, SCALE[e.kind]); }
      if (e.timer >= c.fireEvery) { e.timer = 0; e.phase = 0; for (let i = -1; i <= 1; i++) arena.fire(e.x, e.y - 8, angleTo(e, arena) + i * c.spread, c.bulletSpeed, c.bulletDamage, 'bullet_fire'); }
      break;
    }
    case 'boar': case 'tusk': case 'hound': case 'cinderjaw': {
      chargeAI(e, arena, dt);
      break;
    }
    case 'boss': {
      // Old Rootback: sways side to side, cycles four attacks, faster below half HP; roots erupt under you now and then
      bossAI(e, arena, dt, CONFIG.enemies.boss, { bullet: 'bullet_boss', helper: 'slime', hazard: 'roots', sway: 90, swaySpeed: 0.6 });
      break;
    }
    case 'golem': {
      // The Cinder Golem: lumbers side to side, fire rings and aimed fire, eruptions under you, calls ember imps
      bossAI(e, arena, dt, CONFIG.enemies.golem, { bullet: 'bullet_fire', helper: 'imp', hazard: 'fire', sway: 70, swaySpeed: 0.45 });
      break;
    }
  }
  // stay inside the room
  e.x = Phaser.Math.Clamp(e.x, b.left + e.radius, b.right - e.radius);
  e.y = Phaser.Math.Clamp(e.y, b.top + e.radius, b.bottom - e.radius);
  e.img.x = e.x;
  if (!flies(e.kind)) e.img.y = e.y;
  e.img.setDepth(e.y);
  e.shadow.setPosition(e.x, e.y + (isBig(e.kind) ? 6 : 2));
  drawBar(e);
}

/** The two bosses share one pattern: four attacks in turn, faster below half HP, plus a ground eruption every few seconds. */
function bossAI(e: Enemy, arena: Arena, dt: number, c: { bulletSpeed: number; bulletDamage: number; cadence: number; cadenceEnraged: number; slamEvery: number; slamWarn: number; slamRadius: number; slamDamage: number; slamSpots: number },
  o: { bullet: string; helper: EnemyKind; hazard: 'roots' | 'fire'; sway: number; swaySpeed: number }) {
  const b = arena.bounds, enraged = e.hp < e.maxHp / 2;
  e.special += dt;
  if (e.special >= (enraged ? c.slamEvery * 0.75 : c.slamEvery)) {
    e.special = 0; telegraph(e, arena.scene, SCALE[e.kind]);
    arena.scene.cameras.main.shake(250, 0.004);
    const spots = c.slamSpots + (enraged ? 2 : 0);
    arena.hazard(arena.heroX(), arena.heroY(), c.slamRadius, c.slamWarn, c.slamDamage, o.hazard);
    for (let i = 1; i < spots; i++) {
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 70;
      const x = Phaser.Math.Clamp(arena.heroX() + Math.cos(a) * d, b.left + 20, b.right - 20);
      const y = Phaser.Math.Clamp(arena.heroY() + Math.sin(a) * d, b.top + 60, b.bottom - 20);
      arena.hazard(x, y, c.slamRadius, c.slamWarn + i * 0.12, c.slamDamage, o.hazard);
    }
  }
  const cx = (b.left + b.right) / 2;
  e.x += (cx + Math.sin(e.age * o.swaySpeed) * o.sway - e.x) * Math.min(1, dt * 2);
  const cadence = enraged ? c.cadenceEnraged : c.cadence;
  if (e.timer > cadence - 0.35 && e.phase % 2 === 0) { e.phase++; telegraph(e, arena.scene, SCALE[e.kind]); }
  if (e.timer >= cadence) {
    e.timer = 0; e.phase++;
    const step = Math.floor(e.phase / 2) % 4;
    if (step === 0) ring(arena, e, enraged ? 18 : 14, c.bulletSpeed, c.bulletDamage, o.bullet);
    if (step === 1) for (let i = -2; i <= 2; i++) arena.fire(e.x, e.y, angleTo(e, arena) + i * 0.2, c.bulletSpeed * 1.2, c.bulletDamage, o.bullet);
    if (step === 2) ring(arena, e, enraged ? 18 : 14, c.bulletSpeed * 0.9, c.bulletDamage, o.bullet, Math.PI / 14);
    if (step === 3 && arena.enemyCount() < 2) arena.spawn(o.helper, e.x + (Math.random() < 0.5 ? -50 : 50), e.y + 30); // one helper at a time
  }
}

/**
 * Boars: amble toward the hero, then stop, lower the head and paw the ground
 * (a red line shows where it will go), then charge in a straight line and stand
 * dazed for a moment. Old Tusk charges twice in a row and sprays thorns when it
 * slams into a wall.
 */
function chargeAI(e: Enemy, arena: Arena, dt: number) {
  const c = CONFIG.enemies[e.kind as 'boar' | 'tusk' | 'hound' | 'cinderjaw'], b = arena.bounds, base = SCALE[e.kind];
  const big = e.kind === 'tusk' || e.kind === 'cinderjaw';
  const g = e.bar;
  if (e.phase === 0) { // walk
    const a = angleTo(e, arena);
    e.x += Math.cos(a) * c.speed * dt; e.y += Math.sin(a) * c.speed * dt;
    e.img.setFlipX(Math.cos(a) < 0);
    if (e.timer >= c.chargeEvery) { e.phase = 1; e.timer = 0; e.aim = angleTo(e, arena); if (!e.charges) e.charges = big ? 2 : 1; e.img.setFlipX(Math.cos(e.aim) < 0); }
  } else if (e.phase === 1) { // wind-up: shake and show the charge line
    e.img.setTintMode(Phaser.TintModes.MULTIPLY).setTint(Math.floor(e.age * 12) % 2 ? 0xff8070 : 0xffffff);
    const len = c.chargeSpeed * c.chargeTime;
    g.clear().lineStyle(big ? 6 : 3, 0xd0604f, 0.25 + 0.35 * (e.timer / c.windup));
    g.lineBetween(e.x, e.y, e.x + Math.cos(e.aim) * len, e.y + Math.sin(e.aim) * len);
    if (e.timer >= c.windup) { e.phase = 2; e.timer = 0; e.img.clearTint(); }
  } else if (e.phase === 2) { // charge
    e.x += Math.cos(e.aim) * c.chargeSpeed * dt; e.y += Math.sin(e.aim) * c.chargeSpeed * dt;
    e.img.setScale(base * 1.08, base * 0.94);
    if (e.kind === 'cinderjaw') { // leaves fire along its path
      const j = CONFIG.enemies.cinderjaw;
      e.special += dt;
      if (e.special >= j.trailEvery) { e.special = 0; arena.hazard(e.x, e.y, j.trailRadius, j.trailDelay, j.trailDamage, 'fire'); }
    }
    // a charge ends against a wall or a prop: the boar is dazed (lure it into a rock!)
    const hitWall = e.x <= b.left + e.radius || e.x >= b.right - e.radius || e.y <= b.top + e.radius || e.y >= b.bottom - e.radius || arena.blocked(e.x, e.y, e.radius);
    if (hitWall || e.timer >= c.chargeTime) {
      e.img.setScale(base);
      if (hitWall) {
        arena.scene.cameras.main.shake(big ? 220 : 90, big ? 0.01 : 0.004);
        if (e.kind === 'tusk') { const t = CONFIG.enemies.tusk; ring(arena, e, t.thorns, t.bulletSpeed, t.bulletDamage, 'bullet_thorn', Math.random()); }
        if (e.kind === 'cinderjaw') ring(arena, e, 10, 110, 11, 'bullet_fire', Math.random()); // a burst of embers
      }
      e.charges--;
      if (e.charges > 0) { e.phase = 1; e.timer = c.windup * 0.4; e.aim = angleTo(e, arena); e.img.setFlipX(Math.cos(e.aim) < 0); } // quick second charge
      else { e.phase = 3; e.timer = 0; }
    }
  } else { // dazed
    e.img.angle = Math.sin(e.age * 20) * 4;
    if (e.timer >= c.stun) { e.phase = 0; e.timer = 0; e.img.angle = 0; }
  }
}

function drawBar(e: Enemy) {
  if (!CHARGERS.includes(e.kind)) e.bar.clear(); // chargers draw their charge line here first (cleared each frame below)
  else if (e.phase !== 1) e.bar.clear();
  if (e.hp >= e.maxHp || isBig(e.kind)) return;
  const w = 24, x = e.x - w / 2, y = e.y - (flies(e.kind) ? 30 : 26);
  e.bar.fillStyle(0x0d0b12, 0.8).fillRect(x - 1, y - 1, w + 2, 5);
  e.bar.fillStyle(0xc0504a, 1).fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 3);
}

export function destroyEnemy(e: Enemy) {
  e.img.destroy(); e.shadow.destroy(); e.bar.destroy();
}
