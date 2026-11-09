<p align="center">
  <img src="public/icons/icon-192.png" width="96" alt="Sum Quest icon">
</p>

<h1 align="center">Sum Quest</h1>

<p align="center">
  <b>A pixel-art action roguelite where mental math is your magic.</b><br>
  Dodge, fight and loot your way through Thornwood and Emberfall. Every crit, spell and forge strike is a sum.
</p>

<p align="center">
  <a href="https://sum-quest.rickardotvos.workers.dev"><img src="https://img.shields.io/badge/%E2%96%B6%20Play%20in%20your%20browser-e0a43a?style=for-the-badge" alt="Play in your browser" height="40"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Phaser-4-8B5CF6" alt="Phaser 4">
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/installable-PWA-5A0FC8" alt="PWA">
  <img src="https://img.shields.io/badge/no%20tracking-%E2%9C%93-2ea043" alt="No tracking">
</p>

<p align="center">
  <img src="docs/screenshots/camp.png" width="250" alt="The camp">
  <img src="docs/screenshots/emberfall.png" width="250" alt="A fight in Emberfall">
  <img src="docs/screenshots/crit.png" width="250" alt="A critical hit question">
</p>

## The idea

<sub>The world lost its logic and the forest creatures miscount. Math is rare here and works like magic: move to dodge,
stand still to attack, and every crit, spell, chest and forge strike is a sum. A wrong sum just fizzles.
Training lessons teach real shortcuts, and a memory model brings back what you're about to forget.</sub>

## Screenshots

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/fight.png" width="240" alt="Thornwood fight"><br><sub>Thornwood</sub></td>
    <td align="center"><img src="docs/screenshots/emberfall.png" width="240" alt="Emberfall"><br><sub>Emberfall, the burning village</sub></td>
    <td align="center"><img src="docs/screenshots/camp.png" width="240" alt="Camp"><br><sub>The camp between runs</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/training.png" width="240" alt="Training yard"><br><sub>Training yard</sub></td>
    <td align="center"><img src="docs/screenshots/lesson.png" width="240" alt="A lesson"><br><sub>A lesson: the shortcut, then your turn</sub></td>
    <td align="center"><img src="docs/screenshots/meditation.png" width="240" alt="Skill tree"><br><sub>The skill tree</sub></td>
  </tr>
</table>

## What's in it

<sub>

- **Two zones:** Thornwood and burning Emberfall, each with a mini boss and a boss.
- **Math as power:** crits, typed-answer spells, chests and the forge.
- **Gear and sets** that show on your hero, and a three-branch **skill tree**.
- **Learns with you:** difficulty stays around 85% right; a daily 3-minute goal and a 60-second Sprint.

</sub>

## Run it yourself

```bash
npm install
npm run dev     # http://localhost:5173, and on your phone through the network URL
npm test
```

How it's built, where everything lives and how to publish it: [docs/development.md](docs/development.md).
The story and the math-as-magic plan: [docs/lore.md](docs/lore.md).

## Privacy

<sub>No accounts, no cookies, no tracking. Your save stays on your device. Settings → <b>Backup save</b> gives you a code
to move your progress to another device.</sub>

## Credits

<sub>

- Hero sprite: **[Adventurer 2D Top-Down](https://xzany.itch.io/top-down-adventurer-character)** by Mattz Art (free
  version), used and modified under its licence. Gear and weapons are drawn on top of it in code.
- Interface icons: **[game-icons.net](https://game-icons.net)** by Lorc, Delapouite and contributors,
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via the `@iconify-json/game-icons` package.
- Everything else (enemies, camp, props, items, UI) is drawn in code in this repo. The bright top-down look is
  inspired by Cainos' "Pixel Art Top Down" packs; none of their assets are used.

</sub>

Made by [RickardOtv](https://github.com/RickardOtv).
