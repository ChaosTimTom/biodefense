// ═══════════════════════════════════════════════════
// src/game/scenes/BootScene.ts — Asset loading & init
// Loads assets, waits for Orbitron font, generates textures
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { genToolIcons, genLockIcon } from "../ui/UIFactory";
import { ALL_PATHOGEN_TYPES, ALL_MEDICINE_TYPES } from "../../sim/constants";

export class BootScene extends Phaser.Scene {
  private fontReady = false;

  constructor() {
    super({ key: "Boot" });
  }

  preload(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // ── Start font loading (parallel with assets) ──
    Promise.all([
      document.fonts.load("400 16px 'Orbitron'"),
      document.fonts.load("700 16px 'Orbitron'"),
      document.fonts.load("900 16px 'Orbitron'"),
    ])
      .then(() => { this.fontReady = true; })
      .catch(() => { this.fontReady = true; }); // Proceed even if font fails

    // ── Boot background (canvas gradient) ──
    const bgC = document.createElement("canvas");
    bgC.width = w; bgC.height = h;
    const bgCtx = bgC.getContext("2d")!;
    const bgGrd = bgCtx.createLinearGradient(0, 0, 0, h);
    bgGrd.addColorStop(0, "#0d1b2a");
    bgGrd.addColorStop(0.5, "#142840");
    bgGrd.addColorStop(1, "#0a1628");
    bgCtx.fillStyle = bgGrd;
    bgCtx.fillRect(0, 0, w, h);
    this.textures.addCanvas("boot_bg", bgC);
    this.add.image(w / 2, h / 2, "boot_bg");

    // ── Logo (system font — Orbitron may not be ready yet) ──
    this.add
      .text(w / 2, h * 0.38, "BIO DEFENCE", {
        fontSize: "22px",
        color: "#00e5ff",
        fontFamily: "sans-serif",
        fontStyle: "bold",
        shadow: { offsetX: 0, offsetY: 2, color: "#000000", blur: 4, fill: true },
      })
      .setOrigin(0.5);

    // ── Loading text ──
    const loadText = this.add
      .text(w / 2, h * 0.50, "LOADING...", {
        fontSize: "10px",
        color: "#4a6a8a",
        fontFamily: "sans-serif",
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    // ── Progress bar ──
    const barW = w * 0.55;
    const barH = 6;
    const barX = (w - barW) / 2;
    const barY = h * 0.56;
    const bar = this.add.graphics();

    this.load.on("progress", (p: number) => {
      bar.clear();
      // Track background
      bar.fillStyle(0x1a1a2e, 1);
      bar.fillRoundedRect(barX, barY, barW, barH, 3);
      // Glow behind fill
      bar.fillStyle(0x00e5ff, 0.15);
      bar.fillRoundedRect(barX - 1, barY - 2, barW * p + 2, barH + 4, 5);
      // Fill
      bar.fillStyle(0x00e5ff, 1);
      bar.fillRoundedRect(barX, barY, barW * p, barH, 3);
      loadText.setText(`LOADING  ${Math.round(p * 100)}%`);
    });

    this.load.on("complete", () => {
      bar.destroy();
      loadText.setText("READY");
    });

    // ── 1x1 white pixel for reuse ──
    const px = document.createElement("canvas");
    px.width = 1; px.height = 1;
    const pxCtx = px.getContext("2d")!;
    pxCtx.fillStyle = "#ffffff";
    pxCtx.fillRect(0, 0, 1, 1);
    this.textures.addCanvas("pixel", px);

    // ── Game assets (dynamic: all pathogen + medicine types) ──
    for (const g of ALL_PATHOGEN_TYPES) {
      this.load.image(g, `assets/germs/${g}.png`);
    }
    for (const m of ALL_MEDICINE_TYPES) {
      this.load.image(m, `assets/germs/${m}.png`);
    }
    this.load.image("tile_empty", "assets/tiles/tile_empty.png");
    this.load.image("tile_wall", "assets/tiles/tile_wall.png");

    // World-specific tiles
    for (let w = 1; w <= 4; w++) {
      this.load.image(`tile_empty_w${w}`, `assets/tiles/tile_empty_w${w}.png`);
      this.load.image(`tile_wall_w${w}`, `assets/tiles/tile_wall_w${w}.png`);
    }

    // World backgrounds
    const bgFiles: Record<number, string> = {
      1: "world_1_petri.png",
      2: "world_2_blood.png",
      3: "world_3_tissue.png",
      4: "world_4_pandemic.png",
    };
    for (const [wId, file] of Object.entries(bgFiles)) {
      this.load.image(`bg_world_${wId}`, `assets/bg/${file}`);
    }
  }

  create(): void {
    // Generate canvas-drawn tool & lock icons (persist globally)
    genToolIcons(this);
    genLockIcon(this);

    // Wait for font then proceed with fade
    const proceed = () => {
      if (this.fontReady) {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start("Title");
        });
      } else {
        this.time.delayedCall(50, proceed);
      }
    };
    // Small delay to show "READY" text
    this.time.delayedCall(200, proceed);
  }
}
