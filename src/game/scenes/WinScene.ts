// ═══════════════════════════════════════════════════
// src/game/scenes/WinScene.ts — Premium victory / reward screen
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { LevelSpec } from "../../sim/types";
import { speedMultiplier } from "../../sim/metrics";
import { tweenWinBurst } from "../animation/tweens";
import { playCue, triggerHaptic } from "../feedback";
import { APP_THEME, getWorldTheme } from "../theme";
import { updateLevelResult } from "../save";
import { syncSceneMusic } from "../music";
import { StarDisplay } from "../ui/StarDisplay";
import {
  UI_FONT,
  UI_DISPLAY_FONT,
  addBackground,
  addButton,
  fadeIn,
  genPanelTex,
} from "../ui/UIFactory";

interface WinSceneData {
  levelSpec: LevelSpec;
  stars: number;
  turns: number;
  score: number;
}

export class WinScene extends Phaser.Scene {
  private winData!: WinSceneData;

  constructor() {
    super({ key: "Win" });
  }

  init(data: WinSceneData): void {
    this.winData = data;
  }

  create(): void {
    const { width: w, height: h } = this.cameras.main;
    const { levelSpec, stars, turns, score } = this.winData;
    const theme = getWorldTheme(levelSpec.world ?? 1);
    const nextId = levelSpec.id + 1;
    const hasNextLevel = nextId <= 200;

    updateLevelResult(levelSpec.id, stars, score);
    fadeIn(this, 420);
    syncSceneMusic(this);
    addBackground(this, "win");
    playCue("win");
    triggerHaptic("success");

    const glow = this.add.graphics().setDepth(1);
    glow.fillStyle(theme.accentNumber, 0.12);
    glow.fillCircle(w / 2, 168, 140);

    genPanelTex(this, "win_hero_panel", w - 30, 306, 28, "rgba(8,19,31,0.9)", theme.border);
    this.add.image(w / 2, 208, "win_hero_panel").setDepth(2);

    this.add
      .text(w / 2, 62, `${theme.titleGlyph} LEVEL COMPLETE`, {
        fontSize: "25px",
        color: APP_THEME.colors.textPrimary,
        fontFamily: UI_DISPLAY_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 96, levelSpec.title || `Level ${levelSpec.id}`, {
        fontSize: "15px",
        color: theme.accent,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 116, `${theme.name} world clear`, {
        fontSize: "11px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(3);

    const starDisplay = new StarDisplay(this, w / 2 - 36, 138);
    this.time.delayedCall(260, () => starDisplay.animateStars(stars));

    const scoreText = this.add
      .text(w / 2, 222, "0", {
        fontSize: "40px",
        color: APP_THEME.colors.gold,
        fontFamily: UI_DISPLAY_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 252, "SCORE", {
        fontSize: "10px",
        color: APP_THEME.colors.textMuted,
        fontFamily: UI_FONT,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.tweens.addCounter({
      from: 0,
      to: score,
      duration: 1100,
      delay: 360,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        scoreText.setText(Math.round(tween.getValue() ?? 0).toLocaleString());
      },
    });

    const parTarget = levelSpec.parTurns > 0 ? levelSpec.parTurns : turns;
    const turnsSaved = Math.max(0, parTarget - turns);
    const { label: speedLabel } = speedMultiplier(turns, parTarget);
    const efficiencyLabel = stars === 3 ? "Unused tools banked" : "Tactical clear";

    const stats = [
      { label: "Turns", value: `${turns} / ${parTarget}` },
      { label: "Par Bonus", value: turnsSaved > 0 ? `+${turnsSaved * 100}` : "On par" },
      { label: "Speed", value: speedLabel || "Steady" },
      { label: "Efficiency", value: efficiencyLabel },
    ];

    stats.forEach((stat, index) => {
      const y = 292 + index * 22;
      this.add
        .text(44, y, stat.label, {
          fontSize: "11px",
          color: APP_THEME.colors.textMuted,
          fontFamily: UI_FONT,
        })
        .setDepth(3);

      this.add
        .text(w - 44, y, stat.value, {
          fontSize: "11px",
          color: stat.label === "Par Bonus" && turnsSaved > 0 ? APP_THEME.colors.gold : APP_THEME.colors.textPrimary,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(1, 0)
        .setDepth(3);
    });

    this.add
      .text(w / 2, 394, stars === 3
        ? "Perfect containment. You beat par and kept resources in reserve."
        : stars === 2
          ? "Strong clear. One more optimization run gets the perfect finish."
          : "Objective secured. Replay for a cleaner, faster containment.",
      {
        fontSize: "12px",
        color: stars === 3 ? APP_THEME.colors.gold : APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
        align: "center",
        wordWrap: { width: w - 60 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    addButton(this, w / 2, 508, hasNextLevel ? "Next Level" : "Campaign Map", () => {
      this.scene.start("Menu", {
        updatedStars: { levelId: levelSpec.id, stars },
        updatedScore: { levelId: levelSpec.id, score },
        autoStartLevel: hasNextLevel ? nextId : undefined,
      });
    }, { style: "primary", icon: hasNextLevel ? "▶" : "🧫", fontSize: "15px", w: 220, h: 54 });

    addButton(this, w / 2, 576, "Replay Level", () => {
      this.scene.start("Level", { levelSpec });
    }, { style: "secondary", fontSize: "13px", w: 190, h: 46 });

    addButton(this, w / 2, 638, "Scores & Profile", () => {
      this.scene.start("Scores");
    }, { style: "gold", fontSize: "13px", w: 190, h: 46 });

    tweenWinBurst(this, w / 2, 144);
  }
}
