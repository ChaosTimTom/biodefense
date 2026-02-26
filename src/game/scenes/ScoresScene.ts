// ═══════════════════════════════════════════════════
// src/game/scenes/ScoresScene.ts — High score board
// Hero stats, best level, scrollable per-level list
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import {
  loadSave, totalStars, totalScore, levelsCompleted,
  highestLevel, bestLevelScore,
} from "../save";
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
    const stars = totalStars(save);
    const score = totalScore(save);
    const completed = levelsCompleted(save);
    const highest = highestLevel(save);
    const bestLevel = bestLevelScore(save);

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

    // ── Hero total score ──
    genPanelTex(this, "scores_hero", w - 32, 70, 12, "rgba(30,25,10,0.85)", "rgba(255,215,64,0.15)");
    this.add.image(w / 2, 86, "scores_hero").setDepth(2);

    this.add
      .text(w / 2, 72, score > 0 ? score.toLocaleString() : "0", {
        fontSize: "26px",
        color: "#ffd740",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        shadow: { offsetX: 0, offsetY: 2, color: "#332200", blur: 6, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 94, "TOTAL SCORE", {
        fontSize: "8px",
        color: "#887744",
        fontFamily: UI_FONT,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(3);

    // ── Stat cards row ──
    const cardY = 138;
    const cardW = (w - 48) / 3;
    const cardH = 44;

    const statCards = [
      { label: "STARS", value: `★ ${stars}`, color: "#ffd740" },
      { label: "LEVELS", value: `${completed}`, color: "#00e5ff" },
      { label: "HIGHEST", value: highest > 0 ? `Lv ${highest}` : "—", color: "#76ff03" },
    ];

    statCards.forEach((card, i) => {
      const cx = 24 + i * (cardW + 8) + cardW / 2;
      const key = `stat_card_${i}`;
      genPanelTex(this, key, cardW, cardH, 8, "rgba(13,21,37,0.8)", "rgba(0,229,255,0.08)");
      this.add.image(cx, cardY, key).setDepth(2);

      this.add
        .text(cx, cardY - 6, card.value, {
          fontSize: "14px",
          color: card.color,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);

      this.add
        .text(cx, cardY + 12, card.label, {
          fontSize: "7px",
          color: "#4a6080",
          fontFamily: UI_FONT,
          letterSpacing: 1,
        })
        .setOrigin(0.5)
        .setDepth(3);
    });

    // ── Best level highlight ──
    const bestY = 180;
    if (bestLevel) {
      genPanelTex(this, "best_level_panel", w - 32, 36, 8, "rgba(0,40,60,0.7)", "rgba(0,229,255,0.12)");
      this.add.image(w / 2, bestY, "best_level_panel").setDepth(2);

      const bestStars = save.stars[bestLevel.levelId] ?? 0;
      const starStr = "★".repeat(bestStars) + "☆".repeat(3 - bestStars);

      this.add
        .text(w / 2, bestY, `🥇  Best: Level ${bestLevel.levelId}  —  ${bestLevel.score.toLocaleString()} pts  ${starStr}`, {
          fontSize: "9px",
          color: "#00e5ff",
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);
    }

    // ── Per-world breakdown ──
    const worldNames = ["Petri Dish", "Bloodstream", "Tissue", "Pandemic"];
    const breakdownY = bestLevel ? 210 : 188;

    genPanelTex(this, "world_break", w - 32, 58, 8, "rgba(13,21,37,0.7)", "rgba(0,229,255,0.06)");
    this.add.image(w / 2, breakdownY + 22, "world_break").setDepth(2);

    worldNames.forEach((name, i) => {
      const worldStart = i * 50 + 1;
      const worldEnd = worldStart + 49;
      let wStars = 0, wScore = 0, wLevels = 0;
      for (let id = worldStart; id <= worldEnd; id++) {
        if (save.stars[id]) { wStars += save.stars[id]; wLevels++; }
        if (save.scores[id]) wScore += save.scores[id];
      }
      const colors = ["#4caf50", "#e53935", "#ab47bc", "#ff6f00"];

      const rowY = breakdownY + 4 + i * 12;
      this.add
        .text(24, rowY, name, {
          fontSize: "8px",
          color: colors[i],
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setDepth(3);

      this.add
        .text(w / 2 + 20, rowY, `${wLevels}/50`, {
          fontSize: "8px",
          color: "#667799",
          fontFamily: UI_FONT,
        })
        .setDepth(3);

      this.add
        .text(w - 24, rowY, wScore > 0 ? wScore.toLocaleString() : "—", {
          fontSize: "8px",
          color: wScore > 0 ? "#ccddee" : "#333355",
          fontFamily: UI_FONT,
          fontStyle: wScore > 0 ? "bold" : "normal",
        })
        .setOrigin(1, 0)
        .setDepth(3);
    });

    // ── Column headers ──
    const listStartY = breakdownY + 62;
    const divGfx = this.add.graphics().setDepth(2);
    divGfx.lineStyle(1, 0x1a2a40, 1);
    divGfx.lineBetween(20, listStartY - 6, w - 20, listStartY - 6);

    this.add.text(20, listStartY, "LVL", { fontSize: "8px", color: "#4a6080", fontFamily: UI_FONT, fontStyle: "bold" }).setDepth(3);
    this.add.text(60, listStartY, "STARS", { fontSize: "8px", color: "#4a6080", fontFamily: UI_FONT, fontStyle: "bold" }).setDepth(3);
    this.add.text(w - 24, listStartY, "SCORE", { fontSize: "8px", color: "#4a6080", fontFamily: UI_FONT, fontStyle: "bold" }).setOrigin(1, 0).setDepth(3);

    // ── Scrollable level list ──
    const levelIds = Object.keys(save.stars)
      .map(Number)
      .sort((a, b) => a - b);

    const rowStartY = listStartY + 14;
    const rowH = 26;
    const listHeight = h - rowStartY - 50;
    const maxVisible = Math.floor(listHeight / rowH);

    // Mask for scroll region
    const maskGfx = this.make.graphics();
    maskGfx.fillRect(0, rowStartY - 2, w, listHeight + 4);
    const mask = maskGfx.createGeometryMask();

    const listContainer = this.add.container(0, 0).setDepth(2);
    listContainer.setMask(mask);

    levelIds.forEach((levelId, i) => {
      const y = rowStartY + i * rowH;
      const earned = save.stars[levelId] ?? 0;
      const levelScore = save.scores[levelId] ?? 0;

      // Row background (alternating)
      const rowBg = this.add.graphics();
      if (i % 2 === 0) {
        rowBg.fillStyle(0x0d1525, 0.5);
        rowBg.fillRect(12, y - 2, w - 24, rowH - 2);
      }
      listContainer.add(rowBg);

      // Level number
      const lvlText = this.add.text(28, y + 4, `${levelId}`, {
        fontSize: "11px",
        color: "#ffffff",
        fontFamily: UI_FONT,
        fontStyle: "bold",
      }).setOrigin(0.5, 0);
      listContainer.add(lvlText);

      // Stars (drawn dots)
      const starGfx = this.add.graphics();
      for (let s = 0; s < 3; s++) {
        const sx = 60 + s * 12;
        const sy = y + 9;
        if (s < earned) {
          starGfx.fillStyle(0xffd740, 1);
          starGfx.fillCircle(sx, sy, 3.5);
        } else {
          starGfx.fillStyle(0x333355, 0.5);
          starGfx.fillCircle(sx, sy, 3.5);
        }
      }
      listContainer.add(starGfx);

      // Score (right-aligned)
      const scoreText = this.add.text(w - 24, y + 4, levelScore > 0 ? levelScore.toLocaleString() : "—", {
        fontSize: "11px",
        color: levelScore > 0 ? "#00e5ff" : "#333355",
        fontFamily: UI_FONT,
        fontStyle: levelScore > 0 ? "bold" : "normal",
      }).setOrigin(1, 0);
      listContainer.add(scoreText);
    });

    // Scroll handling
    let scrollY = 0;
    const maxScroll = Math.max(0, levelIds.length * rowH - listHeight);

    if (levelIds.length > maxVisible) {
      // Wheel scroll
      this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
        scrollY = Phaser.Math.Clamp(scrollY + deltaY * 0.5, 0, maxScroll);
        listContainer.setY(-scrollY);
      });

      // Touch drag scroll
      let dragStartY = 0;
      let dragScrollStart = 0;

      const dragZone = this.add
        .rectangle(w / 2, rowStartY + listHeight / 2, w, listHeight)
        .setInteractive()
        .setAlpha(0.001)
        .setDepth(5);

      dragZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        dragStartY = pointer.y;
        dragScrollStart = scrollY;
      });

      this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown) return;
        const delta = dragStartY - pointer.y;
        scrollY = Phaser.Math.Clamp(dragScrollStart + delta, 0, maxScroll);
        listContainer.setY(-scrollY);
      });

      // Scroll indicator
      const indicatorH = Math.max(20, listHeight * (maxVisible / levelIds.length));
      const indicator = this.add.graphics().setDepth(6);
      indicator.fillStyle(0x334466, 0.4);
      indicator.fillRoundedRect(w - 8, rowStartY, 3, indicatorH, 1.5);

      this.events.on("update", () => {
        const pct = maxScroll > 0 ? scrollY / maxScroll : 0;
        const indicatorY = rowStartY + pct * (listHeight - indicatorH);
        indicator.clear();
        indicator.fillStyle(0x4466aa, 0.5);
        indicator.fillRoundedRect(w - 8, indicatorY, 3, indicatorH, 1.5);
      });
    }

    // ── No data message ──
    if (levelIds.length === 0) {
      this.add
        .text(w / 2, h * 0.55, "No scores yet!\nComplete a level to see\nyour scores here.", {
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
