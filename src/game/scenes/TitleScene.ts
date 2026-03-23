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
    const compact = h <= 760;
    const tall = h >= 860;
    const buttonW = Math.min(240, w - 48);
    const heroY = compact ? 108 : tall ? 134 : 122;
    const titleY = heroY + (compact ? 58 : 68);
    const subtitleY = titleY + (compact ? 28 : 36);
    const taglineY = subtitleY + 20;
    const metaPanelW = w - 30;
    const metaPanelH = compact ? 82 : 92;
    const continuePanelH = compact ? 50 : 56;
    const footerY = h - (compact ? 24 : 28);
    const buttonGap = compact ? 10 : 12;

    fadeIn(this, 420);
    syncSceneMusic(this);
    addBackground(this, "title");
    addBioParticles(this, compact ? 18 : 26, featuredWorld.id);

    const halo = this.add.graphics().setDepth(1);
    halo.fillStyle(featuredWorld.accentNumber, 0.16);
    halo.fillCircle(w / 2, heroY, compact ? 84 : 92);
    halo.fillStyle(featuredWorld.accentNumber, 0.08);
    halo.fillCircle(w / 2, heroY, compact ? 118 : 132);

    const dna = this.add
      .text(w / 2, heroY, "🧬", { fontSize: compact ? "54px" : "60px" })
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
      .text(w / 2, titleY, "BIO DEFENCE", {
        fontSize: compact ? "30px" : "34px",
        color: APP_THEME.colors.textPrimary,
        fontFamily: UI_DISPLAY_FONT,
        fontStyle: "bold",
        letterSpacing: 1.5,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, subtitleY, "TACTICAL CELLULAR DEFENCE", {
        fontSize: compact ? "10px" : "11px",
        color: featuredWorld.accent,
        fontFamily: UI_FONT,
        fontStyle: "bold",
        letterSpacing: compact ? 2.2 : 3,
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add
      .text(w / 2, taglineY, featuredWorld.tagline, {
        fontSize: "12px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(3);

    const buttonSpecs = [
      ...(highest > 0
        ? [{
            label: "Continue",
            action: () => fadeToScene(this, "Menu", { autoStartLevel: save.preferences.lastPlayedLevel ?? highest }),
            opts: { style: "success" as const, icon: "▶", fontSize: compact ? "15px" : "16px", w: buttonW, h: compact ? 50 : 54 },
          }]
        : []),
      {
        label: "Play Campaign",
        action: () => fadeToScene(this, "Menu"),
        opts: { style: "primary" as const, icon: "🧫", fontSize: compact ? "15px" : "16px", w: buttonW, h: compact ? 50 : 54 },
      },
      {
        label: "Endless Run",
        action: () => {
          const endlessRun = createEndlessRunState();
          const levelSpec = generateEndlessLevel(endlessRun);
          updatePreferences({ lastPlayedLevel: null });
          fadeToScene(this, "Level", { levelSpec, endlessRun });
        },
        opts: { style: "danger" as const, icon: "∞", fontSize: compact ? "13px" : "14px", w: buttonW, h: compact ? 46 : 50 },
      },
      {
        label: "Profile & Scores",
        action: () => fadeToScene(this, "Scores"),
        opts: { style: "gold" as const, icon: "★", fontSize: compact ? "13px" : "14px", w: buttonW, h: compact ? 46 : 50 },
      },
      {
        label: "How To Play",
        action: () => {
          localStorage.removeItem("bio_defence_rules_seen");
          fadeToScene(this, "Menu", { autoStartLevel: 1 });
        },
        opts: { style: "secondary" as const, icon: "?", fontSize: compact ? "12px" : "13px", w: buttonW, h: compact ? 44 : 46 },
      },
    ];

    const buttonStackHeight = buttonSpecs.reduce((sum, spec, index) => {
      return sum + spec.opts.h + (index > 0 ? buttonGap : 0);
    }, 0);
    const buttonStackTop = footerY - 18 - buttonStackHeight;
    const infoLineY = highest > 0
      ? buttonStackTop - 18 - continuePanelH
      : buttonStackTop - 18;
    const metaPanelY = infoLineY - 16 - metaPanelH / 2;

    genPanelTex(
      this,
      `title_meta_panel_${metaPanelW}x${metaPanelH}`,
      metaPanelW,
      metaPanelH,
      22,
      APP_THEME.colors.panel,
      APP_THEME.colors.panelBorder,
    );
    this.add.image(w / 2, metaPanelY, `title_meta_panel_${metaPanelW}x${metaPanelH}`).setDepth(2);

    const cards = [
      { value: `${stars}`, label: "STARS", color: APP_THEME.colors.gold },
      { value: `${score.toLocaleString()}`, label: "SCORE", color: APP_THEME.colors.accent },
      { value: `${completed}`, label: "CLEARS", color: featuredWorld.accent },
    ];
    const statsStartX = w / 2 - metaPanelW / 2 + metaPanelW / 6;
    const statsStep = metaPanelW / 3;

    cards.forEach((card, index) => {
      const cx = statsStartX + index * statsStep;
      this.add
        .text(cx, metaPanelY - (compact ? 14 : 16), card.value, {
          fontSize: index === 1 ? (compact ? "17px" : "18px") : compact ? "20px" : "22px",
          color: card.color,
          fontFamily: UI_DISPLAY_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);

      this.add
        .text(cx, metaPanelY + (compact ? 12 : 14), card.label, {
          fontSize: compact ? "9px" : "10px",
          color: APP_THEME.colors.textMuted,
          fontFamily: UI_FONT,
          letterSpacing: 1.5,
        })
        .setOrigin(0.5)
        .setDepth(3);
    });

    this.add
      .text(w / 2, infoLineY, endlessBest > 0
        ? `Endless best ${endlessBest.toLocaleString()}  •  round ${endlessRound}`
        : "Endless mode unlocked: survive random escalating outbreaks",
      {
        fontSize: compact ? "9px" : "10px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
        fontStyle: endlessBest > 0 ? "bold" : "normal",
      })
      .setOrigin(0.5)
      .setDepth(3);

    if (highest > 0) {
      const continuePanelY = buttonStackTop - 16 - continuePanelH / 2;
      genPanelTex(
        this,
        `title_continue_panel_${metaPanelW}x${continuePanelH}`,
        metaPanelW,
        continuePanelH,
        18,
        featuredWorld.card,
        featuredWorld.border,
      );
      this.add.image(w / 2, continuePanelY, `title_continue_panel_${metaPanelW}x${continuePanelH}`).setDepth(2);

      this.add
        .text(38, continuePanelY - 10, featuredWorld.titleGlyph, { fontSize: compact ? "18px" : "20px" })
        .setOrigin(0.5)
        .setDepth(3);

      this.add
        .text(64, continuePanelY - 10, `Continue from level ${save.preferences.lastPlayedLevel ?? highest}`, {
          fontSize: compact ? "13px" : "14px",
          color: APP_THEME.colors.textPrimary,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setDepth(3);

      this.add
        .text(64, continuePanelY + 8, `${featuredWorld.name} progression ready`, {
          fontSize: compact ? "10px" : "11px",
          color: APP_THEME.colors.textSecondary,
          fontFamily: UI_FONT,
        })
        .setDepth(3);
    }

    let buttonCursorY = buttonStackTop;
    for (const spec of buttonSpecs) {
      const centerY = buttonCursorY + spec.opts.h / 2;
      addButton(this, w / 2, centerY, spec.label, spec.action, spec.opts);
      buttonCursorY += spec.opts.h + buttonGap;
    }

    this.add
      .text(28, footerY, `${featuredWorld.titleGlyph} ${featuredWorld.name}`, {
        fontSize: compact ? "10px" : "11px",
        color: featuredWorld.accent,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setDepth(3);

    this.add
      .text(w - 16, footerY, "v7.0 premium rebuild", {
        fontSize: compact ? "9px" : "10px",
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
