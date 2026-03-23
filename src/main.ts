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
const DEVICE_DPR = window.devicePixelRatio ?? 1;
const TEXT_DPR = Math.ceil(Math.min(DEVICE_DPR, 3));
const GAME_RESOLUTION = Math.min(Math.max(DEVICE_DPR, 1), 2);
const MAX_GAME_WIDTH = 460;
const MIN_GAME_WIDTH = 360;
const MIN_GAME_HEIGHT = 720;
const GAME_WIDTH = Math.min(MAX_GAME_WIDTH, Math.max(MIN_GAME_WIDTH, window.innerWidth || 400));
const GAME_HEIGHT = Math.max(MIN_GAME_HEIGHT, window.innerHeight || 720);
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

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#0a0a1a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  resolution: GAME_RESOLUTION,
  scene: [BootScene, TitleScene, MenuScene, LevelScene, WinScene, ScoresScene],
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    mipmapFilter: "LINEAR_MIPMAP_LINEAR",
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
} as Phaser.Types.Core.GameConfig;

// Launch the game
new Phaser.Game(config);
