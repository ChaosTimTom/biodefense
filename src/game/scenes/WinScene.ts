// ═══════════════════════════════════════════════════
// src/game/scenes/WinScene.ts — Level complete + stars + score
// Gradient bg, styled buttons, animated score counter
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { LevelSpec } from "../../sim/types";
import { StarDisplay } from "../ui/StarDisplay";
import { tweenWinBurst } from "../animation/tweens";
import { updateLevelResult } from "../save";
import { speedMultiplier } from "../../sim/metrics";
import {
  UI_FONT, addBackground, addButton,
  genPanelTex, fadeIn, fadeToScene,
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
    fadeIn(this, 400);

    const { levelSpec, stars, turns, score } = this.winData;

    // Save progress
    updateLevelResult(levelSpec.id, stars, score);

    // ── Background ──
    addBackground(this, "win");

    // ── Victory Banner ──
    genPanelTex(this, "win_banner", w - 40, 44, 12, "rgba(0,40,60,0.9)", "rgba(0,229,255,0.25)");
    this.add.image(w / 2, h * 0.10, "win_banner").setDepth(3);
    this.add
      .text(w / 2, h * 0.10, "LEVEL COMPLETE!", {
        fontSize: "18px",
        color: "#00e5ff",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        shadow: { offsetX: 0, offsetY: 2, color: "#001122", blur: 4, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(4);

    // ── Level name ──
    this.add
      .text(w / 2, h * 0.17, levelSpec.title || `Level ${levelSpec.id}`, {
        fontSize: "12px",
        color: "#6688aa",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(4);

    // ── Stars ──
    const starDisplay = new StarDisplay(this, w / 2 - 36, h * 0.23);
    this.time.delayedCall(400, () => {
      starDisplay.animateStars(stars);
    });

    // ── Score ──
    const scoreText = this.add
      .text(w / 2, h * 0.32, "0", {
        fontSize: "32px",
        color: "#ffd740",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        shadow: { offsetX: 0, offsetY: 2, color: "#332200", blur: 6, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.add
      .text(w / 2, h * 0.37, "POINTS", {
        fontSize: "9px",
        color: "#667799",
        fontFamily: UI_FONT,
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(4);

    // Animated score counter
    this.tweens.addCounter({
      from: 0,
      to: score,
      duration: 1200,
      delay: 600,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        scoreText.setText(Math.round(tween.getValue() ?? 0).toLocaleString());
      },
    });

    // ── Stats Panel ──
    genPanelTex(this, "win_stats", w - 60, 72, 10);
    this.add.image(w / 2, h * 0.445, "win_stats").setDepth(3);

    const limit = levelSpec.turnLimit > 0 ? levelSpec.turnLimit : turns;
    const turnsSaved = limit - turns;
    const { mult: speedMult, label: speedLabel } = speedMultiplier(turns, levelSpec.turnLimit);

    const stats = [
      { label: "Turns", value: `${turns} / Par: ${levelSpec.parTurns}` },
      { label: "Par Bonus", value: turnsSaved > 0 ? `+${turnsSaved * 100}` : "—" },
      { label: "Speed", value: speedLabel || "—", highlight: speedMult > 1 },
    ];

    stats.forEach((stat, i) => {
      const sy = h * 0.42 + i * 18;
      this.add
        .text(w * 0.2, sy, stat.label, {
          fontSize: "10px", color: "#667799", fontFamily: UI_FONT,
        })
        .setOrigin(0, 0.5)
        .setDepth(4);
      this.add
        .text(w * 0.8, sy, stat.value, {
          fontSize: "10px",
          color: (stat as { highlight?: boolean }).highlight ? "#ffd740" : "#ccddee",
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(1, 0.5)
        .setDepth(4);
    });

    // ── Star message ──
    const starText =
      stars === 3 ? "⭐ Perfect! All 3 stars!"
        : stars === 2 ? "Great! 2 stars earned"
          : "1 star — try for par time!";

    this.add
      .text(w / 2, h * 0.54, starText, {
        fontSize: "11px",
        color: stars === 3 ? "#ffd740" : "#8899bb",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(4);

    // ── Buttons ──
    addButton(this, w / 2, h * 0.63, "Next Level  →", () => {
      const nextId = levelSpec.id + 1;
      this.scene.start("Menu", {
        updatedStars: { levelId: levelSpec.id, stars },
        updatedScore: { levelId: levelSpec.id, score },
        autoStartLevel: nextId,
      });
    }, { style: "primary", fontSize: "15px", w: 200 });

    addButton(this, w / 2, h * 0.72, "Replay", () => {
      this.scene.start("Level", { levelSpec });
    }, { style: "secondary", fontSize: "13px", w: 160 });

    addButton(this, w / 2, h * 0.80, "High Scores", () => {
      this.scene.start("Scores");
    }, { style: "gold", fontSize: "12px", w: 160 });

    addButton(this, w / 2, h * 0.88, "Menu", () => {
      this.scene.start("Menu", {
        updatedStars: { levelId: levelSpec.id, stars },
        updatedScore: { levelId: levelSpec.id, score },
      });
    }, { style: "secondary", fontSize: "12px", w: 140 });

    // Win burst particles
    tweenWinBurst(this, w / 2, h * 0.23);
  }
}
