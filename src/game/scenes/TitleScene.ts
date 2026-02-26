// ═══════════════════════════════════════════════════
// src/game/scenes/TitleScene.ts — Welcome / title screen
// Gradient background, floating particles, styled buttons
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { loadSave } from "../save";
import {
  UI_FONT, addBackground, addBioParticles, addButton,
  genPanelTex, fadeIn, fadeToScene,
} from "../ui/UIFactory";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: "Title" });
  }

  create(): void {
    const { width: w, height: h } = this.cameras.main;
    fadeIn(this, 400);

    // ── Background ──
    addBackground(this, "title");
    addBioParticles(this, 18);

    // ── DNA icon ──
    const dna = this.add
      .text(w / 2, h * 0.13, "🧬", { fontSize: "52px" })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({
      targets: dna,
      y: dna.y - 6,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── Title ──
    const title = this.add
      .text(w / 2, h * 0.26, "BIO\nDEFENCE", {
        fontSize: "36px",
        color: "#00e5ff",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        align: "center",
        lineSpacing: 2,
        shadow: { offsetX: 0, offsetY: 3, color: "#001a33", blur: 8, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Subtle pulse
    this.tweens.add({
      targets: title,
      alpha: { from: 0.85, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── Tagline ──
    this.add
      .text(w / 2, h * 0.375, "TACTICAL CELLULAR DEFENCE", {
        fontSize: "9px",
        color: "#4a6a8a",
        fontFamily: UI_FONT,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    // ── Stats Panel ──
    const save = loadSave();
    const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);
    const totalScore = Object.values(save.scores).reduce((a, b) => a + b, 0);
    const levelsCompleted = Object.keys(save.stars).length;

    if (levelsCompleted > 0) {
      genPanelTex(this, "stats_panel", 280, 28, 8, "rgba(13,21,37,0.8)", "rgba(0,229,255,0.08)");
      this.add.image(w / 2, h * 0.425, "stats_panel").setDepth(4);
      this.add
        .text(
          w / 2, h * 0.425,
          `★ ${totalStars}   |   ${totalScore.toLocaleString()} pts   |   ${levelsCompleted} levels`,
          { fontSize: "9px", color: "#5577aa", fontFamily: UI_FONT },
        )
        .setOrigin(0.5)
        .setDepth(5);
    }

    // ── Buttons ──
    addButton(this, w / 2, h * 0.53, "PLAY", () => {
      fadeToScene(this, "Menu");
    }, { style: "primary", icon: "▶", fontSize: "17px" });

    addButton(this, w / 2, h * 0.635, "HIGH SCORES", () => {
      fadeToScene(this, "Scores");
    }, { style: "gold", icon: "🏆", fontSize: "14px" });

    addButton(this, w / 2, h * 0.74, "HOW TO PLAY", () => {
      localStorage.removeItem("bio_defence_rules_seen");
      fadeToScene(this, "Menu", { autoStartLevel: 1 });
    }, { style: "secondary", icon: "?", fontSize: "13px" });

    // ── Version ──
    this.add
      .text(w / 2, h - 18, "v6.0", {
        fontSize: "8px",
        color: "#2a3a4a",
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5)
      .setDepth(5);
  }
}
