/** Loads the character sheets, builds all textures once, then tells the app the game is ready. */
import Phaser from 'phaser';
import { buildTextures } from '../art/textures';
import { preloadAdventurer, rememberAdventurer } from '../art/adventurer';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() { preloadAdventurer(this); }

  create() {
    rememberAdventurer(this);
    buildTextures(this);
    this.game.events.emit('textures-ready');
  }
}
