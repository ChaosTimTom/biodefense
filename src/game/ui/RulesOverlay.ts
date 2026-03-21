// ═══════════════════════════════════════════════════
// src/game/ui/RulesOverlay.ts — Scrollable "How to Play" overlay
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { APP_THEME } from "../theme";
import { addButton, genPanelTex } from "./UIFactory";

const RULES_SEEN_KEY = "bio_defence_rules_seen";

const RULES_TEXT = `HOW TO PLAY

GOAL: Contain infection below the threshold shown for
each level. Checked EVERY turn — one spike = you lose!

GROWTH PATTERNS (chess-piece movement):
 • Bacteria spread in CARDINAL directions (←↑→↓)
   like a Rook — straight lines only
 • Virus spread in KNIGHT L-shapes (2+1 jumps)
   like a Knight — unpredictable leaps
 • Fungus spread in DIAGONAL directions (↗↘↙↖)
   like a Bishop — corner-to-corner

DEAD ZONES:
 • Medicine does NOT kill pathogens directly
 • When pathogen AND medicine both try to grow
   into the same empty cell, it stays EMPTY
 • This "dead zone" blocks further spread
 • Use dead zones to wall off pathogen expansion

ISOLATION DEATH:
 • A cell with ZERO allies in its growth pattern
   dies next turn (it's isolated!)
 • Bacteria need a cardinal neighbor to survive
 • Virus need a knight-distance ally to survive
 • Fungus need a diagonal neighbor to survive
 • This applies to medicine too — place in pairs!

MEDICINE OVERWHELM:
 • Pathogens die when SURROUNDED by their counter-
   medicine in enough growth directions
 • Bacteria/Fungus: 2+ counter-medicine → killed
 • Virus: 3+ counter-medicine → killed
 • Box in groups to wipe them out!

SUFFOCATION:
 • Pathogens that CANNOT GROW anywhere die!
 • If every growth direction is blocked (wall, edge,
   occupied) or would form a dead zone → suffocates
 • Trap pathogens with dead zones to starve them out
 • Interior cells of large blobs also suffocate

PLACING MEDICINE:
 • Select a tool, then click an empty cell
 • Each type mirrors its pathogen's growth pattern
 • You receive tool grants each turn
 • Place strategically — isolated medicine dies!

TYPE MATCHING:
 💊 Antibiotic  → Rook pattern (cardinal)
 💉 Antiviral   → Knight pattern (L-shapes)
 🧬 Antifungal  → Bishop pattern (diagonal)
 Wrong type won't form effective dead zones!

STRATEGY:
 • Learn each pattern — they're like chess pieces
 • Block growth DIRECTIONS, not just neighbors
 • Sandwich pathogens using their own pattern
 • Exploit isolation death — cut off stragglers
 • Match medicine type to the pathogen you face

CONTROLS:
 Step (Space)  — advance one turn
 Undo (Z)      — undo last action
 Reset (R)     — restart level`;

export class RulesOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scrollContainer?: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private visible = false;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private wheelHandler?: (
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number,
    deltaZ: number,
  ) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(500).setVisible(false);
    this.build();
  }

  private build(): void {
    const { width: w, height: h } = this.scene.cameras.main;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, w, h);
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    bg.on("pointerdown", () => this.hide());
    this.container.add(bg);

    const panelW = Math.min(w - 32, 420);
    const panelH = Math.min(h - 28, 620);
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;
    const headerH = 52;
    const footerH = 74;
    const contentTop = py + headerH;
    const contentHeight = panelH - headerH - footerH;

    genPanelTex(this.scene, "rules_panel", panelW, panelH, 22, "rgba(8,18,31,0.95)", "rgba(0,229,255,0.12)");
    this.container.add(this.scene.add.image(w / 2, h / 2, "rules_panel"));

    const title = this.scene.add.text(px + 18, py + 16, "HOW TO PLAY", {
      fontSize: "18px",
      color: APP_THEME.colors.textPrimary,
      fontFamily: APP_THEME.fonts.display,
      fontStyle: "bold",
      letterSpacing: 1,
    });
    this.container.add(title);

    const closeBtn = this.scene.add
      .text(px + panelW - 18, py + 14, "✕", {
        fontSize: "18px",
        color: APP_THEME.colors.danger,
        fontFamily: APP_THEME.fonts.body,
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    this.container.add(closeBtn);

    const closeZone = this.scene.add.rectangle(px + panelW - 20, py + 24, 44, 44)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);
    closeZone.on("pointerdown", () => this.hide());
    this.container.add(closeZone);

    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0xffffff, 0.08);
    divider.lineBetween(px + 16, contentTop - 10, px + panelW - 16, contentTop - 10);
    divider.lineBetween(px + 16, py + panelH - footerH, px + panelW - 16, py + panelH - footerH);
    this.container.add(divider);

    const scrollContainer = this.scene.add.container(0, 0);
    const text = this.scene.add.text(px + 20, contentTop, RULES_TEXT, {
      fontSize: "11px",
      color: APP_THEME.colors.textSecondary,
      fontFamily: APP_THEME.fonts.body,
      lineSpacing: 4,
      wordWrap: { width: panelW - 48 },
    });
    scrollContainer.add(text);
    this.scrollContainer = scrollContainer;
    this.container.add(scrollContainer);

    const maskShape = this.scene.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(px + 12, contentTop, panelW - 24, contentHeight);
    scrollContainer.setMask(maskShape.createGeometryMask());

    this.maxScroll = Math.max(0, text.height - contentHeight);
    this.applyScroll(0);

    const scrollZone = this.scene.add.rectangle(
      px + panelW / 2,
      contentTop + contentHeight / 2,
      panelW - 24,
      contentHeight,
    )
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);

    scrollZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragStartY = pointer.y;
      this.dragStartScroll = this.scrollY;
    });

    scrollZone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.visible) return;
      const delta = this.dragStartY - pointer.y;
      this.applyScroll(this.dragStartScroll + delta);
    });

    this.container.add(scrollZone);

    if (this.maxScroll > 0) {
      const track = this.scene.add.graphics().setDepth(510);
      track.fillStyle(0xffffff, 0.06);
      track.fillRoundedRect(px + panelW - 10, contentTop + 8, 4, contentHeight - 16, 2);
      this.container.add(track);

      const thumb = this.scene.add.graphics().setDepth(511);
      this.container.add(thumb);

      const updateThumb = (): void => {
        const thumbH = Math.max(28, (contentHeight / text.height) * (contentHeight - 16));
        const travel = contentHeight - 16 - thumbH;
        const pct = this.maxScroll > 0 ? this.scrollY / this.maxScroll : 0;
        const thumbY = contentTop + 8 + travel * pct;
        thumb.clear();
        thumb.fillStyle(0x00e5ff, 0.6);
        thumb.fillRoundedRect(px + panelW - 10, thumbY, 4, thumbH, 2);
      };

      updateThumb();

      this.wheelHandler = (_pointer, _gameObjects, _deltaX, deltaY) => {
        if (!this.visible) return;
        this.applyScroll(this.scrollY + deltaY * 0.7);
        updateThumb();
      };
      this.scene.input.on("wheel", this.wheelHandler);

      scrollZone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown || !this.visible) return;
        const delta = this.dragStartY - pointer.y;
        this.applyScroll(this.dragStartScroll + delta);
        updateThumb();
      });
    }

    const hint = this.scene.add.text(w / 2, py + panelH - 58, this.maxScroll > 0 ? "Drag or scroll to read more" : "Tap close when ready", {
      fontSize: "10px",
      color: APP_THEME.colors.textMuted,
      fontFamily: APP_THEME.fonts.body,
    }).setOrigin(0.5);
    this.container.add(hint);

    const closeButton = addButton(this.scene, w / 2, py + panelH - 28, "Close", () => this.hide(), {
      style: "secondary",
      w: 140,
      h: 40,
      fontSize: "12px",
      depth: 520,
    });
    this.container.add(closeButton);
  }

  private applyScroll(next: number): void {
    this.scrollY = Phaser.Math.Clamp(next, 0, this.maxScroll);
    this.scrollContainer?.setY(-this.scrollY);
  }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
    localStorage.setItem(RULES_SEEN_KEY, "1");
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  static shouldAutoShow(): boolean {
    try {
      return !localStorage.getItem(RULES_SEEN_KEY);
    } catch {
      return true;
    }
  }

  destroy(): void {
    if (this.wheelHandler) {
      this.scene.input.off("wheel", this.wheelHandler);
      this.wheelHandler = undefined;
    }
    this.container.destroy(true);
  }
}
