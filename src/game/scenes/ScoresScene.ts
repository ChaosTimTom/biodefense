// ═══════════════════════════════════════════════════
// src/game/scenes/ScoresScene.ts — Premium profile / score screen
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import {
  loadSave,
  totalStars,
  totalScore,
  levelsCompleted,
  highestLevel,
  bestLevelScore,
} from "../save";
import { syncSceneMusic } from "../music";
import { APP_THEME, getWorldTheme } from "../theme";
import {
  UI_FONT,
  UI_DISPLAY_FONT,
  addBackground,
  addButton,
  fadeIn,
  fadeToScene,
  genPanelTex,
} from "../ui/UIFactory";

export class ScoresScene extends Phaser.Scene {
  constructor() {
    super({ key: "Scores" });
  }

  create(): void {
    const { width: w, height: h } = this.cameras.main;
    const save = loadSave();
    const stars = totalStars(save);
    const score = totalScore(save);
    const completed = levelsCompleted(save);
    const highest = highestLevel(save);
    const bestLevel = bestLevelScore(save);
    const endlessBest = save.endlessHighScore;
    const endlessRound = save.endlessBestRound;

    fadeIn(this, 360);
    syncSceneMusic(this);
    addBackground(this, "dark");

    genPanelTex(this, "scores_top_panel", w - 18, 54, 18, APP_THEME.colors.panel, APP_THEME.colors.panelBorder);
    this.add.image(w / 2, 34, "scores_top_panel").setDepth(2);

    const backText = this.add
      .text(28, 34, "←", {
        fontSize: "20px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add.rectangle(28, 34, 44, 44)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(4)
      .on("pointerover", () => backText.setColor(APP_THEME.colors.gold))
      .on("pointerout", () => backText.setColor(APP_THEME.colors.textSecondary))
      .on("pointerdown", () => fadeToScene(this, "Title"));

    this.add
      .text(w / 2, 18, "PROFILE & SCORES", {
        fontSize: "16px",
        color: APP_THEME.colors.textPrimary,
        fontFamily: UI_DISPLAY_FONT,
        fontStyle: "bold",
        letterSpacing: 1,
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.add
      .text(w / 2, 38, "Your campaign meta progression at a glance.", {
        fontSize: "10px",
        color: APP_THEME.colors.textMuted,
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    genPanelTex(this, "scores_hero_panel", w - 28, 112, 24, "rgba(21,25,10,0.84)", "rgba(255,215,64,0.16)");
    this.add.image(w / 2, 114, "scores_hero_panel").setDepth(2);

    this.add
      .text(w / 2, 80, score.toLocaleString(), {
        fontSize: "34px",
        color: APP_THEME.colors.gold,
        fontFamily: UI_DISPLAY_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 108, "TOTAL SCORE", {
        fontSize: "10px",
        color: APP_THEME.colors.textMuted,
        fontFamily: UI_FONT,
        letterSpacing: 2.5,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 132, `★ ${stars} stars   •   ${completed} clears   •   highest level ${highest || 0}`, {
        fontSize: "11px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(3);

    if (bestLevel) {
      this.add
        .text(w / 2, 152, `Best run: level ${bestLevel.levelId} at ${bestLevel.score.toLocaleString()} points`, {
          fontSize: "11px",
          color: APP_THEME.colors.accent,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);
    }

    this.add
      .text(w / 2, 170, endlessBest > 0
        ? `Endless best: ${endlessBest.toLocaleString()} score • round ${endlessRound}`
        : "Endless best: no completed runs yet",
      {
        fontSize: "11px",
        color: APP_THEME.colors.accent,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    const worldNames = [1, 2, 3, 4];
    const gridTop = 210;
    const cardW = 178;
    const cardH = 80;
    const gap = 10;

    worldNames.forEach((worldId, index) => {
      const theme = getWorldTheme(worldId);
      const x = index % 2 === 0 ? 16 : 16 + cardW + gap;
      const y = gridTop + Math.floor(index / 2) * (cardH + gap);
      const levelStart = (worldId - 1) * 50 + 1;
      const levelEnd = levelStart + 49;
      let worldStars = 0;
      let worldScore = 0;
      let worldClears = 0;

      for (let levelId = levelStart; levelId <= levelEnd; levelId++) {
        worldStars += save.stars[levelId] ?? 0;
        worldScore += save.scores[levelId] ?? 0;
        if ((save.stars[levelId] ?? 0) > 0) worldClears += 1;
      }

      const key = `score_world_card_${worldId}`;
      genPanelTex(this, key, cardW, cardH, 18, theme.card, theme.border);
      this.add.image(x + cardW / 2, y + cardH / 2, key).setDepth(2);

      this.add
        .text(x + 12, y + 10, `${theme.titleGlyph} ${theme.name}`, {
          fontSize: "13px",
          color: theme.accent,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setDepth(3);

      this.add
        .text(x + 12, y + 34, `${worldClears}/50 cleared`, {
          fontSize: "11px",
          color: APP_THEME.colors.textPrimary,
          fontFamily: UI_FONT,
        })
        .setDepth(3);

      this.add
        .text(x + 12, y + 54, `${worldStars} stars`, {
          fontSize: "10px",
          color: APP_THEME.colors.gold,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setDepth(3);

      this.add
        .text(x + cardW - 12, y + 54, worldScore > 0 ? worldScore.toLocaleString() : "0", {
          fontSize: "10px",
          color: APP_THEME.colors.textSecondary,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(1, 0)
        .setDepth(3);
    });

    const listY = 390;
    const listH = 262;
    genPanelTex(this, "scores_list_panel", w - 24, listH, 22, APP_THEME.colors.panel, APP_THEME.colors.panelBorder);
    this.add.image(w / 2, listY + listH / 2, "scores_list_panel").setDepth(2);

    this.add
      .text(28, listY + 14, "TOP LEVEL RESULTS", {
        fontSize: "12px",
        color: APP_THEME.colors.textPrimary,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setDepth(3);

    const sorted = Object.keys(save.scores)
      .map(Number)
      .sort((a, b) => (save.scores[b] ?? 0) - (save.scores[a] ?? 0))
      .slice(0, 10);

    if (sorted.length === 0) {
      this.add
        .text(w / 2, listY + 120, "No campaign results yet.\nFinish a level and your best clears will appear here.", {
          fontSize: "13px",
          color: APP_THEME.colors.textMuted,
          fontFamily: UI_FONT,
          align: "center",
          lineSpacing: 8,
        })
        .setOrigin(0.5)
        .setDepth(3);
    } else {
      sorted.forEach((levelId, index) => {
        const y = listY + 44 + index * 20;
        const rowTheme = getWorldTheme(Math.floor((levelId - 1) / 50) + 1);
        const starsText = `${"★".repeat(save.stars[levelId] ?? 0)}${"☆".repeat(3 - (save.stars[levelId] ?? 0))}`;

        this.add
          .text(28, y, `${rowTheme.titleGlyph} L${levelId}`, {
            fontSize: "11px",
            color: rowTheme.accent,
            fontFamily: UI_FONT,
            fontStyle: "bold",
          })
          .setDepth(3);

        this.add
          .text(132, y, starsText, {
            fontSize: "11px",
            color: APP_THEME.colors.gold,
            fontFamily: UI_FONT,
          })
          .setDepth(3);

        this.add
          .text(w - 28, y, (save.scores[levelId] ?? 0).toLocaleString(), {
            fontSize: "11px",
            color: APP_THEME.colors.textPrimary,
            fontFamily: UI_FONT,
            fontStyle: "bold",
          })
          .setOrigin(1, 0)
          .setDepth(3);
      });
    }

    addButton(this, w / 2, h - 28, "Back To Campaign", () => {
      fadeToScene(this, "Title");
    }, { style: "secondary", w: 210, h: 44, fontSize: "12px" });
  }
}
