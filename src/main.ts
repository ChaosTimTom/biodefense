// ═══════════════════════════════════════════════════
// src/main.ts — Phaser game initialization entry point
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { TitleScene } from "./game/scenes/TitleScene";
import { MenuScene } from "./game/scenes/MenuScene";
import { LevelScene } from "./game/scenes/LevelScene";
import { WinScene } from "./game/scenes/WinScene";
import { ScoresScene } from "./game/scenes/ScoresScene";

// ── HiDPI text: render at native pixel density ──
const TEXT_DPR = Math.ceil(Math.min(window.devicePixelRatio ?? 1, 3));
if (TEXT_DPR > 1) {
  const F = Phaser.GameObjects.GameObjectFactory
    .prototype as unknown as Record<string, Function>;
  const orig = F["text"];
  F["text"] = function (this: unknown, ...a: unknown[]) {
    const t = orig.apply(this, a) as Phaser.GameObjects.Text;
    t.setResolution(TEXT_DPR);
    return t;
  };
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 400,
  height: 720,
  backgroundColor: "#0a0a1a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, MenuScene, LevelScene, WinScene, ScoresScene],
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },
};

// Launch the game
new Phaser.Game(config);
