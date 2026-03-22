// ═══════════════════════════════════════════════════
// src/game/scenes/TitleScene.ts — Premium title / hub screen
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import {
  loadSave,
  totalStars as getStars,
  totalScore as getScore,
  levelsCompleted as getCompleted,
  highestLevel,
  updatePreferences,
} from "../save";
import { syncSceneMusic } from "../music";
import { createEndlessRunState, generateEndlessLevel } from "../../sim/endless";
import { APP_THEME, getWorldTheme } from "../theme";
import { SettingsOverlay } from "../ui/SettingsOverlay";
import {
  UI_FONT,
  UI_DISPLAY_FONT,
  addBackground,
  addBioParticles,
  addButton,
  genPanelTex,
  fadeIn,
  fadeToScene,
} from "../ui/UIFactory";

export class TitleScene extends Phaser.Scene {
  private settingsOverlay?: SettingsOverlay;

  constructor() {
    super({ key: "Title" });
  }

  create(): void {
    const { width: w, height: h } = this.cameras.main;
    const save = loadSave();
    const stars = getStars(save);
    const score = getScore(save);
    const completed = getCompleted(save);
    const highest = highestLevel(save);
    const featuredWorld = getWorldTheme(save.preferences.lastSelectedWorld || 1);
    const endlessBest = save.endlessHighScore;
    const endlessRound = save.endlessBestRound;

    fadeIn(this, 420);
    syncSceneMusic(this);
    addBackground(this, "title");
    addBioParticles(this, 26, featuredWorld.id);

    const halo = this.add.graphics().setDepth(1);
    halo.fillStyle(featuredWorld.accentNumber, 0.16);
    halo.fillCircle(w / 2, 124, 92);
    halo.fillStyle(featuredWorld.accentNumber, 0.08);
    halo.fillCircle(w / 2, 124, 132);

    const dna = this.add
      .text(w / 2, 124, "🧬", { fontSize: "60px" })
      .setOrigin(0.5)
      .setDepth(3);

    this.tweens.add({
      targets: dna,
      y: dna.y - 8,
      duration: APP_THEME.motion.ambient,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(w / 2, 192, "BIO DEFENCE", {
        fontSize: "34px",
        color: APP_THEME.colors.textPrimary,
        fontFamily: UI_DISPLAY_FONT,
        fontStyle: "bold",
        letterSpacing: 1.5,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 228, "TACTICAL CELLULAR DEFENCE", {
        fontSize: "11px",
        color: featuredWorld.accent,
        fontFamily: UI_FONT,
        fontStyle: "bold",
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, 250, featuredWorld.tagline, {
        fontSize: "12px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(3);

    genPanelTex(this, "title_meta_panel", w - 30, 92, 22, APP_THEME.colors.panel, APP_THEME.colors.panelBorder);
    this.add.image(w / 2, 330, "title_meta_panel").setDepth(2);

    const cards = [
      { value: `${stars}`, label: "STARS", color: APP_THEME.colors.gold },
      { value: `${score.toLocaleString()}`, label: "SCORE", color: APP_THEME.colors.accent },
      { value: `${completed}`, label: "CLEARS", color: featuredWorld.accent },
    ];

    cards.forEach((card, index) => {
      const cx = 72 + index * 128;
      this.add
        .text(cx, 314, card.value, {
          fontSize: index === 1 ? "18px" : "22px",
          color: card.color,
          fontFamily: UI_DISPLAY_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);

      this.add
        .text(cx, 342, card.label, {
          fontSize: "10px",
          color: APP_THEME.colors.textMuted,
          fontFamily: UI_FONT,
          letterSpacing: 1.5,
        })
        .setOrigin(0.5)
        .setDepth(3);
    });

    this.add
      .text(w / 2, 364, endlessBest > 0
        ? `Endless best ${endlessBest.toLocaleString()}  •  round ${endlessRound}`
        : "Endless mode unlocked: survive random escalating outbreaks",
      {
        fontSize: "10px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
        fontStyle: endlessBest > 0 ? "bold" : "normal",
      })
      .setOrigin(0.5)
      .setDepth(3);

    if (highest > 0) {
      genPanelTex(this, "title_continue_panel", w - 30, 56, 18, featuredWorld.card, featuredWorld.border);
      this.add.image(w / 2, 408, "title_continue_panel").setDepth(2);

      this.add
        .text(38, 392, featuredWorld.titleGlyph, { fontSize: "20px" })
        .setOrigin(0.5)
        .setDepth(3);

      this.add
        .text(64, 392, `Continue from level ${save.preferences.lastPlayedLevel ?? highest}`, {
          fontSize: "14px",
          color: APP_THEME.colors.textPrimary,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setDepth(3);

      this.add
        .text(64, 410, `${featuredWorld.name} progression ready`, {
          fontSize: "11px",
          color: APP_THEME.colors.textSecondary,
          fontFamily: UI_FONT,
        })
        .setDepth(3);
    }

    const primaryY = highest > 0 ? 492 : 454;
    if (highest > 0) {
      addButton(this, w / 2, primaryY - 58, "Continue", () => {
        fadeToScene(this, "Menu", { autoStartLevel: save.preferences.lastPlayedLevel ?? highest });
      }, { style: "success", icon: "▶", fontSize: "16px", w: 230, h: 56 });
    }

    addButton(this, w / 2, primaryY, "Play Campaign", () => {
      fadeToScene(this, "Menu");
    }, { style: "primary", icon: "🧫", fontSize: "16px", w: 230, h: 56 });

    addButton(this, w / 2, primaryY + 76, "Endless Run", () => {
      const endlessRun = createEndlessRunState();
      const levelSpec = generateEndlessLevel(endlessRun);
      updatePreferences({ lastPlayedLevel: null });
      fadeToScene(this, "Level", { levelSpec, endlessRun });
    }, { style: "danger", icon: "∞", fontSize: "14px", w: 230, h: 52 });

    addButton(this, w / 2, primaryY + 146, "Profile & Scores", () => {
      fadeToScene(this, "Scores");
    }, { style: "gold", icon: "★", fontSize: "14px", w: 230, h: 52 });

    addButton(this, w / 2, primaryY + 216, "How To Play", () => {
      localStorage.removeItem("bio_defence_rules_seen");
      fadeToScene(this, "Menu", { autoStartLevel: 1 });
    }, { style: "secondary", icon: "?", fontSize: "13px", w: 230, h: 48 });

    this.add
      .text(28, h - 28, `${featuredWorld.titleGlyph} ${featuredWorld.name}`, {
        fontSize: "11px",
        color: featuredWorld.accent,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setDepth(3);

    this.add
      .text(w - 16, h - 28, "v7.0 premium rebuild", {
        fontSize: "10px",
        color: APP_THEME.colors.textMuted,
        fontFamily: UI_FONT,
      })
      .setOrigin(1, 0)
      .setDepth(3);

    const settingsLabel = this.add
      .text(w - 24, 22, "⚙", {
        fontSize: "20px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.add.rectangle(w - 24, 24, 42, 42)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(5)
      .on("pointerover", () => settingsLabel.setColor(featuredWorld.accent))
      .on("pointerout", () => settingsLabel.setColor(APP_THEME.colors.textSecondary))
      .on("pointerdown", () => this.settingsOverlay?.toggle());

    this.settingsOverlay = new SettingsOverlay(this);
  }

  shutdown(): void {
    this.settingsOverlay?.destroy();
    this.settingsOverlay = undefined;
  }
}
