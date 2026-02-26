// ═══════════════════════════════════════════════════
// src/game/ui/RulesOverlay.ts — "How to Play" overlay  (v5.0)
// Shows game rules when the "?" button is clicked.
// Auto-shows on first play (localStorage flag).
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { UI } from "../config";

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
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(500).setVisible(false);
    this.build();
  }

  private build(): void {
    const { width: w, height: h } = this.scene.cameras.main;

    // Dimmed background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, w, h);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains,
    );
    bg.on("pointerdown", () => this.hide());
    this.container.add(bg);

    // Panel
    const panelW = Math.min(w - 40, 420);
    const panelH = Math.min(h - 40, 560);
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x16162b, 0.97);
    panel.fillRoundedRect(px, py, panelW, panelH, 12);
    panel.lineStyle(2, UI.accentCyan, 0.8);
    panel.strokeRoundedRect(px, py, panelW, panelH, 12);
    this.container.add(panel);

    // Rules text
    const text = this.scene.add
      .text(px + 20, py + 16, RULES_TEXT, {
        fontSize: "11px",
        color: "#ccccee",
        fontFamily: "'Orbitron', sans-serif",
        lineSpacing: 3,
        wordWrap: { width: panelW - 40 },
      });
    this.container.add(text);

    // Close button
    const closeBtn = this.scene.add
      .text(px + panelW - 16, py + 8, "✕", {
        fontSize: "18px",
        color: "#ff6666",
        fontFamily: "'Orbitron', sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    this.container.add(closeBtn);

    const closeZone = this.scene.add.rectangle(px + panelW - 16, py + 18, 48, 48)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);
    closeZone.on("pointerdown", () => this.hide());
    this.container.add(closeZone);

    // "Click anywhere to close" hint
    const closeHint = this.scene.add
      .text(w / 2, py + panelH - 14, "click anywhere to close", {
        fontSize: "10px",
        color: "#666688",
        fontFamily: "'Orbitron', sans-serif",
      })
      .setOrigin(0.5);
    this.container.add(closeHint);
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

  /** Returns true if the player has never seen the rules overlay */
  static shouldAutoShow(): boolean {
    try {
      return !localStorage.getItem(RULES_SEEN_KEY);
    } catch {
      return true;
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
