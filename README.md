<p align="center">
  <img src="public/icons/icon-192.png" width="96" alt="Sum Quest icon">
</p>

<h1 align="center">Sum Quest</h1>

<p align="center">
  A top-down action roguelite for practising mental math.<br>
  Critical hits, spells and upgrades are earned by solving arithmetic.
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

## About

Sum Quest combines a top-down action game with mental-math practice. You move to dodge and stand still to
attack. Critical hits, spells, chests and gear upgrades each ask a math question. A wrong answer costs you the
bonus, nothing more. Questions adapt to your level and repeat what you are close to forgetting.

## Screenshots

<div align="center">
<table>
  <tr>
    <td align="center"><img src="docs/screenshots/camp.png" width="240" alt="Camp"><br><sub>Camp</sub></td>
    <td align="center"><img src="docs/screenshots/emberfall.png" width="240" alt="Emberfall"><br><sub>Combat in Emberfall</sub></td>
    <td align="center"><img src="docs/screenshots/crit.png" width="240" alt="Critical hit"><br><sub>Critical hit question</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/training.png" width="240" alt="Training"><br><sub>Training</sub></td>
    <td align="center"><img src="docs/screenshots/lesson.png" width="240" alt="Lesson"><br><sub>Lesson</sub></td>
    <td align="center"><img src="docs/screenshots/meditation.png" width="240" alt="Skill tree"><br><sub>Skill tree</sub></td>
  </tr>
</table>
</div>

## Features

- Two zones, 20 rooms, with mini bosses and bosses.
- Math-driven combat: multiple-choice critical hits and typed-answer spells.
- Gear with rarities and sets, and a skill tree with three branches.
- Adaptive difficulty aimed at about 85% accuracy, with spaced repetition.
- Short lessons on mental-math techniques, a daily 3-minute goal and a 60-second sprint mode.

## Run it yourself

```bash
npm install
npm run dev     # http://localhost:5173, and on your phone through the network URL
npm test
```

Architecture, file layout and deployment: [docs/development.md](docs/development.md).
Setting and design notes: [docs/lore.md](docs/lore.md).

## Privacy

No accounts, cookies or tracking. Progress is stored locally on the device.

## Credits

- Hero sprite: **[Adventurer 2D Top-Down](https://xzany.itch.io/top-down-adventurer-character)** by Mattz Art (free
  version), used and modified under its licence. Gear and weapons are drawn on top of it in code.
- Interface icons: **[game-icons.net](https://game-icons.net)** by Lorc, Delapouite and contributors,
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), via the `@iconify-json/game-icons` package.
- Everything else (enemies, camp, props, items, UI) is drawn in code in this repo. The visual style is inspired
  by Cainos' "Pixel Art Top Down" packs; no assets from them are used.

Made by [RickardOtv](https://github.com/RickardOtv).
