/**
 * Entry point: loads the save, starts Phaser, and switches between the
 * camp (HubScene, with HTML panels on top) and a run (RunScene).
 */
import Phaser from 'phaser';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './ui/styles.css';
import { setupPwa } from './pwa';
import { loadSave, save } from './state/save';
import { BootScene } from './game/scenes/BootScene';
import { HubScene, type StationId } from './game/scenes/HubScene';
import { RunScene, type ExitChoice } from './game/scenes/RunScene';
import { onCampShown, showCamp, showHeadOut, type CampActions, type CampTab } from './ui/camp';
import { uiRoot } from './ui/dom';

/**
 * The canvas is exactly the size of the app box in CSS pixels, so nothing is
 * stretched: every sprite is drawn at an integer scale and the browser only
 * ever upscales by the device pixel ratio. That is what keeps pixel art crisp.
 */
function gameSize() {
  const box = document.getElementById('app')!.getBoundingClientRect();
  return { width: Math.round(box.width), height: Math.round(box.height) };
}

async function boot() {
  setupPwa();
  loadSave();
  try { await document.fonts.ready; } catch { /* fonts are optional */ }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0d0b12',
    pixelArt: true,
    ...gameSize(),
    scale: { mode: Phaser.Scale.NONE },
    input: { activePointers: 2 },
    scene: [BootScene, HubScene, RunScene],
  });

  const startRun = () => {
    uiRoot().innerHTML = '';
    game.scene.stop('hub');
    game.scene.start('run', { onExit: (choice: ExitChoice) => exitRun(choice) });
  };
  /** Close the open panel and hand control back to the camp. */
  const panelActions: CampActions = { startRun, back: () => { uiRoot().innerHTML = ''; game.scene.resume('hub'); } };
  const STATION_TAB: Record<Exclude<StationId, 'gate'>, CampTab> = { forge: 'forge', training: 'training', board: 'progress', stone: 'skills' };

  const openHub = (then?: CampTab) => {
    game.scene.start('hub', {
      onStation: (id: StationId) => (id === 'gate' ? showHeadOut(panelActions) : showCamp(STATION_TAB[id], panelActions)),
      onBag: () => showCamp('bag', panelActions),
      initial: then ? () => showCamp(then, panelActions) : undefined,
    });
    onCampShown();
  };
  const exitRun = (choice: ExitChoice) => {
    game.scene.stop('run');
    if (choice === 'again') startRun();
    else openHub(choice === 'bag' ? 'bag' : choice === 'forge' ? (save.chests.length ? 'bag' : 'forge') : undefined);
  };

  game.events.once('textures-ready', () => openHub());
}

boot();
