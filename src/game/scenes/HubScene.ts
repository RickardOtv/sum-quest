/**
 * The camp: a walkable hub at the forest edge. Walk (or tap) to a station
 * and use it: the smith's anvil (Forge), the training yard (lessons and
 * the Sprint), the notice board (Progress), the meditation stone (skills)
 * and the path north, which starts a run. Menus open as HTML panels on top
 * while this scene is paused.
 */
import { openSettings } from '../../ui/settings';
import type { IconName } from '../../ui/icons';
import Phaser from 'phaser';
import { CONFIG } from '../../config';
import { paintVignette } from '../art/textures';
import { ORIGIN_X, ORIGIN_Y, buildAdventurer, dirOf, type Dir } from '../art/adventurer';
import { NPCS, drawAnvil, drawBoard, drawCampfire, drawDummy, drawStone, drawTent, drawTree, glowCanvas, paintCampGround } from '../art/camp';
import { heroSkin } from '../../state/gear';
import * as hubUI from '../../ui/hub';

export type StationId = 'gate' | 'forge' | 'training' | 'board' | 'stone';
export interface HubCallbacks { onStation: (id: StationId) => void; onBag: () => void; initial?: () => void; }

interface Station { id: StationId; x: number; y: number; standY: number; label: string; plate: string; glyph: IconName; npc?: keyof typeof NPCS; radius: number; }
interface Obstacle { x: number; y: number; r: number; }

export class HubScene extends Phaser.Scene {
  private cb!: HubCallbacks;
  private W = 360; private H = 640;
  private hero!: { x: number; y: number; body: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Image; facing: number; moving: boolean; dir: Dir };
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private stick = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, sx: 0, sy: 0, t: 0 };
  private stickGfx!: Phaser.GameObjects.Graphics;
  private walkTo: { x: number; y: number; then?: StationId } | null = null;
  private stations: Station[] = [];
  private obstacles: Obstacle[] = [];
  private npcs: Phaser.GameObjects.Sprite[] = [];
  private fire!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Image;
  private fireTimer = 0;
  private near: StationId | null = null;
  private locked = false;

  constructor() { super('hub'); }

  init(data: HubCallbacks) {
    this.cb = data;
    Object.assign(this, { stick: { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, sx: 0, sy: 0, t: 0 }, walkTo: null, stations: [], obstacles: [], npcs: [], fireTimer: 0, near: null, locked: false });
  }

  create() {
    this.W = this.scale.width; this.H = this.scale.height;
    const W = this.W, H = this.H, fireX = W / 2, fireY = Math.round(H * 0.5);
    // ground art is painted at full resolution (HD), like the props
    const spots: [number, number][] = [[78, H * 0.4], [W - 78, H * 0.4], [70, H * 0.75], [W - 72, H * 0.75], [W - 64, H - 24]].map(([x, y]) => [x, y + 14]);
    paintCampGround(this, 'camp-ground', W, H, fireX, fireY, 4242, spots);
    this.add.image(0, 0, 'camp-ground').setOrigin(0).setDepth(0);
    paintVignette(this, W, H);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDepth(1900);
    this.stickGfx = this.add.graphics().setDepth(2000);

    this.buildTextures();
    this.layout(fireX, fireY);
    this.createHero(fireX - 40, Math.round(H * 0.66));
    this.setupInput();

    hubUI.showHubHud(this.hudHandlers(), this.plates());
    this.events.on('resume', this.onResume, this);
    this.events.once('shutdown', () => { this.events.off('resume', this.onResume, this); hubUI.hideHubHud(); });
    if (this.cb.initial) { const open = this.cb.initial; this.lock(); open(); } // e.g. straight into the Bag after a run
    if (import.meta.env.DEV) (window as unknown as { hub: HubScene }).hub = this; // for tests: window.hub.hero
  }

  /* ================= building the camp ================= */

  private buildTextures() {
    const set = (key: string, c: HTMLCanvasElement) => { if (this.textures.exists(key)) this.textures.remove(key); this.textures.addCanvas(key, c); };
    [0, 1, 2].forEach(v => set(`tree${v}`, drawTree(v).toCanvas()));
    set('fire0', drawCampfire(0).toCanvas()); set('fire1', drawCampfire(1).toCanvas());
    set('anvil', drawAnvil().toCanvas()); set('dummy', drawDummy().toCanvas()); set('board', drawBoard().toCanvas());
    set('stone', drawStone().toCanvas()); set('tent', drawTent().toCanvas()); set('glow', glowCanvas());
    Object.values(NPCS).forEach(n => buildAdventurer(this, `npc_${n.id}`, n.skin, ['idle']));
  }

  private layout(fireX: number, fireY: number) {
    const W = this.W, H = this.H;
    // forest along the top: a deep-green backdrop, then rows of leafy trees and pines with a gap for the path north
    const gapL = fireX - 26, gapR = fireX + 26;
    this.add.rectangle(0, 0, W, 70, 0x2e5a2c).setOrigin(0).setDepth(2);
    for (let row = 0; row < 3; row++) {
      const y = 44 + row * 30;
      for (let x = 6 + (row % 2) * 22; x < W + 10; x += 44) {
        const gap = row === 2 ? 22 : 10;
        if (x > gapL - gap && x < gapR + gap) continue;
        const k = (x * 7 + row * 3) % 5, tex = k < 3 ? `prop_tree${k}` : `prop_pine${k - 3}`;
        this.add.image(x + (row * 7) % 9, y, tex).setOrigin(0.5, 0.95).setDepth(y);
      }
    }
    // a few trees framing the sides
    [[10, H * 0.3], [W - 8, H * 0.28], [6, H * 0.6], [W - 6, H * 0.6], [14, H * 0.94]].forEach(([x, y], i) => {
      this.add.image(x, y - 2, 'prop_shadow').setScale(1.5, 0.8).setDepth(1.7);
      this.add.image(x, y, i % 2 ? `prop_pine${i % 3}` : `prop_tree${i % 3}`).setOrigin(0.5, 0.95).setDepth(y);
    });
    // life around camp: crates and barrels by the forge, a fence by the yard, bushes and flowers
    const deco = (tex: string, x: number, y: number, solid = 0) => {
      if (solid) { this.add.image(x, y - 2, 'prop_shadow').setScale(solid / 16, solid / 28).setDepth(1.7); this.obstacles.push({ x, y: y - 8, r: solid / 2 }); }
      this.add.image(x, y, tex).setOrigin(0.5, 0.92).setDepth(tex.includes('flowers') ? 1.5 : y); // props are HD: scale 1
    };
    deco('prop_crate', 28, H * 0.47, 24); deco('prop_barrel', 50, H * 0.49, 20); deco('prop_crate', 30, H * 0.52, 24);
    deco('prop_fence', W - 52, H * 0.5, 0); deco('prop_barrel', W - 20, H * 0.47, 20);
    deco('prop_bush0', 120, H * 0.27); deco('prop_bush2', W - 118, H * 0.25); deco('prop_bush1', 26, H * 0.82); deco('prop_bush0', W - 120, H * 0.86);
    [[96, H * 0.62], [W - 104, H * 0.67], [140, H * 0.86], [W - 150, H * 0.36], [60, H * 0.22], [W / 2 + 60, H * 0.82]].forEach(([x, y], i) => deco(`prop_flowers${i % 3}`, x, y));
    deco('prop_shrooms', W - 34, H * 0.78);

    // the fire and its light
    this.glow = this.add.image(fireX, fireY - 4, 'glow').setScale(2.6).setAlpha(0.45).setDepth(1).setBlendMode(Phaser.BlendModes.ADD); // soft: the ground is bright now
    this.fire = this.add.image(fireX, fireY, 'fire0').setScale(2).setOrigin(0.5, 0.9).setDepth(fireY);
    this.obstacles.push({ x: fireX, y: fireY - 4, r: 18 });
    const embers = this.add.particles(fireX, fireY - 10, 'pxw', {
      x: { min: -5, max: 5 }, speedY: { min: -28, max: -12 }, speedX: { min: -6, max: 6 }, lifespan: { min: 700, max: 1400 },
      scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffb648, 0xf3a83a, 0xe0702a], frequency: 140, quantity: 1,
    });
    embers.setDepth(fireY + 30);

    const place = (st: Omit<Station, 'standY'>, texture: string, scale = 2, obstacleR = 15) => {
      this.add.image(st.x, st.y - 2, 'prop_shadow').setScale(1.2, 0.7).setDepth(1.7);
      this.add.image(st.x, st.y, texture).setScale(scale).setOrigin(0.5, 0.9).setDepth(st.y);
      this.obstacles.push({ x: st.x, y: st.y - 6, r: obstacleR });
      this.stations.push({ ...st, standY: st.y + 16 });
      if (st.npc) {
        const n = NPCS[st.npc];
        const nx = st.x + (st.x < this.W / 2 ? -26 : 26), ny = st.y + 2;
        this.add.image(nx, ny, 'shadow').setScale(2.6, 2.2).setDepth(1);
        const img = this.add.sprite(nx, ny, `npc_${n.id}_idle_down`).setScale(2).setOrigin(ORIGIN_X, ORIGIN_Y).setDepth(ny);
        img.play(`npc_${n.id}_idle_${st.x > this.W / 2 ? 'left' : 'right'}`);
        this.npcs.push(img);
        this.obstacles.push({ x: nx, y: ny - 8, r: 12 });
      }
    };
    place({ id: 'forge', x: 78, y: Math.round(H * 0.4), label: 'Forge', plate: 'Forge', glyph: 'anvil-impact', npc: 'smith', radius: 40 }, 'anvil');
    place({ id: 'training', x: W - 78, y: Math.round(H * 0.4), label: 'Training yard', plate: 'Training', glyph: 'archery-target', npc: 'trainer', radius: 40 }, 'dummy', 2, 10);
    place({ id: 'board', x: 70, y: Math.round(H * 0.75), label: 'Notice board', plate: 'Notice board', glyph: 'scroll-quill', radius: 36 }, 'board', 2, 16);
    place({ id: 'stone', x: W - 72, y: Math.round(H * 0.75), label: 'Meditation stone', plate: 'Skills', glyph: 'meditation', npc: 'monk', radius: 40 }, 'stone', 2, 14);
    // the tent is yours (decoration for now), the gate is the path into the trees
    this.add.image(W - 64, H - 10, 'tent').setScale(2).setOrigin(0.5, 0.95).setDepth(H - 10);
    this.obstacles.push({ x: W - 64, y: H - 28, r: 28 });
    this.stations.push({ id: 'gate', x: fireX, y: 100, standY: 124, label: 'Head out', plate: 'Head out', glyph: 'open-gate', radius: 34 });
    this.add.image(fireX, 86, 'glow').setScale(1.4).setTint(0x8fb4ff).setAlpha(0.5).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
  }

  private createHero(x: number, y: number) {
    buildAdventurer(this, 'hero', heroSkin(), ['idle', 'run']);
    const shadow = this.add.image(0, 0, 'shadow').setScale(2.6, 2.2).setDepth(1);
    const body = this.add.sprite(0, 0, 'hero_idle_down').setScale(2).setOrigin(ORIGIN_X, ORIGIN_Y);
    this.hero = { x, y, body, shadow, facing: 1, moving: false, dir: 'down' };
  }

  private setupInput() {
    const k = this.input.keyboard!;
    this.keys = k.addKeys({ up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D' }, false) as typeof this.keys;
    k.on('keydown-E', () => { if (this.near && !this.locked) this.activate(this.near); });
    k.on('keydown-ENTER', () => { if (this.near && !this.locked) this.activate(this.near); });
    k.on('keydown-SPACE', () => { if (this.near && !this.locked) this.activate(this.near); });
    k.on('keydown-I', () => { if (!this.locked) this.open('bag'); });
    // Drag anywhere = thumb-stick. A short tap = walk there (or to the station you tapped).
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.stick.active || this.locked) return;
      this.stick = { active: true, id: p.id, ox: p.x, oy: p.y, dx: 0, dy: 0, sx: p.x, sy: p.y, t: this.time.now };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.stick.active || p.id !== this.stick.id) return;
      const dx = p.x - this.stick.ox, dy = p.y - this.stick.oy, d = Math.hypot(dx, dy), max = 34;
      if (d > max) { this.stick.ox = p.x - (dx / d) * max; this.stick.oy = p.y - (dy / d) * max; }
      this.stick.dx = (p.x - this.stick.ox) / max; this.stick.dy = (p.y - this.stick.oy) / max;
      if (Math.hypot(p.x - this.stick.sx, p.y - this.stick.sy) > 10) this.walkTo = null;
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.stick.id) return;
      const tap = Math.hypot(p.x - this.stick.sx, p.y - this.stick.sy) < 10 && this.time.now - this.stick.t < 350;
      this.stick = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, sx: 0, sy: 0, t: 0 };
      if (tap && !this.locked) this.tapAt(p.x, p.y);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  private tapAt(x: number, y: number) {
    const st = this.stations.find(s => Math.hypot(s.x - x, s.y - 10 - y) < 30);
    if (st) { this.walkTo = { x: st.x, y: st.standY, then: st.id }; return; }
    this.walkTo = { x: Phaser.Math.Clamp(x, 24, this.W - 24), y: Phaser.Math.Clamp(y, 130, this.H - 36) };
  }

  /* ================= each frame ================= */

  update(_t: number, dtMs: number) {
    if (this.locked) return;
    const dt = Math.min(0.05, dtMs / 1000);
    this.moveHero(dt);
    this.drawHero();
    this.animate(dt);
    this.drawStick();
  }

  private moveHero(dt: number) {
    const h = this.hero, k = this.keys;
    let mx = this.stick.dx, my = this.stick.dy;
    if (k.left.isDown || k.a.isDown) mx -= 1;
    if (k.right.isDown || k.d.isDown) mx += 1;
    if (k.up.isDown || k.w.isDown) my -= 1;
    if (k.down.isDown || k.s.isDown) my += 1;
    if (Math.hypot(mx, my) > 0.2) this.walkTo = null;
    else if (this.walkTo) {
      const dx = this.walkTo.x - h.x, dy = this.walkTo.y - h.y, d = Math.hypot(dx, dy);
      if (d < 4) { const then = this.walkTo.then; this.walkTo = null; if (then) this.activate(then); }
      else { mx = dx / d; my = dy / d; }
    }
    const len = Math.hypot(mx, my);
    h.moving = len > 0.2;
    if (h.moving) {
      const speed = CONFIG.hero.speed * Math.min(1, len);
      h.x += (mx / len) * speed * dt; h.y += (my / len) * speed * dt;
      h.dir = dirOf(mx, my, h.dir); if (Math.abs(mx) > 0.1) h.facing = mx > 0 ? 1 : -1;
    }
    // soft collisions: get pushed out of the fire, the anvil, the tent…
    for (const o of this.obstacles) {
      const dx = h.x - o.x, dy = (h.y - o.y) * 1.6, d = Math.hypot(dx, dy);
      if (d < o.r && d > 0.01) { const push = (o.r - d) / d; h.x += dx * push; h.y += (dy * push) / 1.6; if (this.walkTo && !this.walkTo.then) this.walkTo = null; }
    }
    const gate = this.stations.find(s => s.id === 'gate')!;
    const topLimit = Math.abs(h.x - gate.x) < 20 ? 108 : 130; // only the path lets you walk into the trees
    h.x = Phaser.Math.Clamp(h.x, 22, this.W - 22);
    h.y = Phaser.Math.Clamp(h.y, topLimit, this.H - 34);

    // which station is close enough to use?
    let best: Station | null = null, bestD = 1e9;
    for (const s of this.stations) { const d = Math.hypot(s.x - h.x, (s.y + 10 - h.y) * 0.8); if (d < s.radius && d < bestD) { best = s; bestD = d; } }
    const id = best?.id ?? null;
    if (id !== this.near) { this.near = id; hubUI.setPrompt(best ? { id: best.id, label: best.label, glyph: best.glyph, npc: best.npc ? NPCS[best.npc] : undefined } : null); }
  }

  private drawHero() {
    const h = this.hero;
    const want = h.moving ? `hero_run_${h.dir}` : `hero_idle_${h.dir}`;
    if (h.body.anims.currentAnim?.key !== want) h.body.play(want, true);
    h.body.setPosition(h.x, h.y).setDepth(h.y);
    h.shadow.setPosition(h.x, h.y);
  }

  private animate(dt: number) {
    this.fireTimer += dt;
    if (this.fireTimer > 0.14) { this.fireTimer = 0; this.fire.setTexture(this.fire.texture.key === 'fire0' ? 'fire1' : 'fire0'); }
    this.glow.setAlpha(0.42 + Math.sin(this.time.now / 110) * 0.08 + Math.sin(this.time.now / 37) * 0.05);
  }

  private drawStick() {
    const g = this.stickGfx; g.clear();
    if (!this.stick.active || Math.hypot(this.stick.dx, this.stick.dy) < 0.05) return;
    g.fillStyle(0xece6d8, 0.08).fillCircle(this.stick.ox, this.stick.oy, 34);
    g.lineStyle(2, 0xece6d8, 0.25).strokeCircle(this.stick.ox, this.stick.oy, 34);
    g.fillStyle(0xece6d8, 0.35).fillCircle(this.stick.ox + this.stick.dx * 34, this.stick.oy + this.stick.dy * 34, 13);
  }

  /* ================= opening menus ================= */

  private activate(id: StationId) {
    this.hero.moving = false; this.walkTo = null;
    this.lock();
    this.cb.onStation(id);
  }
  private open(what: 'bag') { this.lock(); if (what === 'bag') this.cb.onBag(); }
  private hudHandlers() {
    return { bag: () => this.open('bag'), settings: () => { this.lock(); openSettings(() => this.scene.resume()); }, use: () => { if (this.near) this.activate(this.near); } };
  }
  /** Name plates under the stations (HTML in the HUD, so the text is sharp; game px = CSS px). */
  private plates(): hubUI.HubPlate[] { return this.stations.map(s => ({ id: s.id, x: s.x, y: s.y + 4, label: s.plate })); }
  private lock() {
    this.locked = true;
    this.stick = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, sx: 0, sy: 0, t: 0 };
    this.stickGfx.clear();
    hubUI.hideHubHud();
    this.scene.pause();
  }
  /** Back from a menu: gear may have changed, so rebuild the hero's sheets. */
  private onResume() {
    this.locked = false;
    this.hero.body.anims.stop(); this.hero.body.setTexture('pxw'); // let go of the old sheets before they are replaced
    buildAdventurer(this, 'hero', heroSkin(), ['idle', 'run']);
    this.hero.body.play(`hero_idle_${this.hero.dir}`, true);
    hubUI.showHubHud(this.hudHandlers(), this.plates());
    const st = this.stations.find(s => s.id === this.near);
    if (st) hubUI.setPrompt({ id: st.id, label: st.label, glyph: st.glyph, npc: st.npc ? NPCS[st.npc] : undefined });
  }
}
