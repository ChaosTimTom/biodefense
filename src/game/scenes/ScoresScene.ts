// ═══════════════════════════════════════════════════
// src/game/scenes/ScoresScene.ts — High score board
// Gradient bg, styled panels, scrollable list
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { loadSave } from "../save";
import {
  UI_FONT, addBackground, addButton,
  genPanelTex, fadeIn, fadeToScene,
} from "../ui/UIFactory";

export class ScoresScene extends Phaser.Scene {
  constructor() {
    super({ key: "Scores" });
  }

  create(): void {
    const { width: w, height: h } = this.cameras.main;
    fadeIn(this);

    const save = loadSave();

    // ── Background ──
    addBackground(this, "dark");

    // ── Header panel ──
    genPanelTex(this, "scores_header", w - 16, 44, 10, "rgba(13,21,37,0.85)", "rgba(255,215,64,0.12)");
    this.add.image(w / 2, 30, "scores_header").setDepth(2);

    // Back button
    const backText = this.add
      .text(32, 30, "←", {
        fontSize: "18px",
        color: "#aaaacc",
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.add.rectangle(32, 30, 50, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(3)
      .on("pointerdown", () => fadeToScene(this, "Title"))
      .on("pointerover", () => backText.setColor("#ffd740"))
      .on("pointerout", () => backText.setColor("#aaaacc"));

    // Title
    this.add
      .text(w / 2, 24, "HIGH SCORES", {
        fontSize: "15px",
        color: "#ffd740",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        shadow: { offsetX: 0, offsetY: 1, color: "#332200", blur: 3, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 40, "🏆", { fontSize: "10px" })
      .setOrigin(0.5)
      .setDepth(3);

    // ── Summary panel ──
    const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
    const totalScore = Object.values(save.scores).reduce((a, b) => a + b, 0);
    const levelsCompleted = Object.keys(save.stars).length;

    genPanelTex(this, "scores_summary", w - 32, 50, 10, "rgba(30,25,10,0.8)", "rgba(255,215,64,0.1)");
    this.add.image(w / 2, 76, "scores_summary").setDepth(2);

    this.add
      .text(w / 2, 68, `${totalScore.toLocaleString()} pts`, {
        fontSize: "18px",
        color: "#ffffff",
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 88, `★ ${totalStars}  |  ${levelsCompleted} levels completed`, {
        fontSize: "9px",
        color: "#667799",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(3);

    // ── Column headers ──
    const divY = 106;
    const gfx = this.add.graphics().setDepth(2);
    gfx.lineStyle(1, 0x1a2a40, 1);
    gfx.lineBetween(20, divY, w - 20, divY);

    const headerY = 114;
    this.add.text(20, headerY, "LVL", { fontSize: "8px", color: "#4a6080", fontFamily: UI_FONT, fontStyle: "bold" }).setDepth(3);
    this.add.text(60, headerY, "STARS", { fontSize: "8px", color: "#4a6080", fontFamily: UI_FONT, fontStyle: "bold" }).setDepth(3);
    this.add.text(130, headerY, "SCORE", { fontSize: "8px", color: "#4a6080", fontFamily: UI_FONT, fontStyle: "bold" }).setDepth(3);

    // ── Scrollable level list ──
    const levelIds = Object.keys(save.stars)
      .map(Number)
      .sort((a, b) => a - b);

    const startY = 130;
    const rowH = 28;
    const maxVisible = Math.floor((h - startY - 60) / rowH);

    const listContainer = this.add.container(0, 0).setDepth(2);
    let scrollOffset = 0;
    const maxScroll = Math.max(0, (levelIds.length - maxVisible) * rowH);

    levelIds.forEach((levelId, i) => {
      const y = startY + i * rowH;
      const earned = save.stars[levelId] ?? 0;
      const score = save.scores[levelId] ?? 0;

      // Row background (alternating)
      const rowBg = this.add.graphics();
      if (i % 2 === 0) {
        rowBg.fillStyle(0x0d1525, 0.5);
        rowBg.fillRoundedRect(12, y - 2, w - 24, rowH - 2, 4);
      }
      listContainer.add(rowBg);

      // Level number
      const lvlText = this.add.text(28, y + 4, `${levelId}`, {
        fontSize: "12px",
        color: "#ffffff",
        fontFamily: UI_FONT,
        fontStyle: "bold",
      }).setOrigin(0.5, 0);
      listContainer.add(lvlText);

      // Stars (drawn dots)
      const starGfx = this.add.graphics();
      for (let s = 0; s < 3; s++) {
        const sx = 60 + s * 12;
        const sy = y + 10;
        if (s < earned) {
          starGfx.fillStyle(0xffd740, 1);
          starGfx.fillCircle(sx, sy, 3.5);
        } else {
          starGfx.fillStyle(0x333355, 0.5);
          starGfx.fillCircle(sx, sy, 3.5);
        }
      }
      listContainer.add(starGfx);

      // Score
      const scoreText = this.add.text(130, y + 4, score > 0 ? score.toLocaleString() : "—", {
        fontSize: "12px",
        color: score > 0 ? "#00e5ff" : "#333355",
        fontFamily: UI_FONT,
        fontStyle: score > 0 ? "bold" : "normal",
      });
      listContainer.add(scoreText);
    });

    // Scroll handling via drag
    if (levelIds.length > maxVisible) {
      const dragZone = this.add
        .rectangle(w / 2, (startY + h) / 2, w, h - startY)
        .setInteractive()
        .setAlpha(0.001);

      this.input.setDraggable(dragZone);

      dragZone.on("drag", (_pointer: Phaser.Input.Pointer, _dragX: number, dragY: number) => {
        const deltaY = dragY - (startY + h) / 2;
        scrollOffset = Phaser.Math.Clamp(-deltaY, 0, maxScroll);
        listContainer.setY(scrollOffset);
      });

      this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
        scrollOffset = Phaser.Math.Clamp(scrollOffset - deltaY * 0.5, -maxScroll, 0);
        listContainer.setY(scrollOffset);
      });
    }

    // ── No data message ──
    if (levelIds.length === 0) {
      this.add
        .text(w / 2, h * 0.45, "No scores yet!\nComplete a level to see\nyour scores here.", {
          fontSize: "12px",
          color: "#4a6080",
          fontFamily: UI_FONT,
          align: "center",
          lineSpacing: 6,
        })
        .setOrigin(0.5)
        .setDepth(3);
    }

    // ── Bottom button ──
    addButton(this, w / 2, h - 32, "Back to Menu", () => {
      fadeToScene(this, "Title");
    }, { style: "secondary", w: 180, h: 40, fontSize: "12px" });
  }
}
