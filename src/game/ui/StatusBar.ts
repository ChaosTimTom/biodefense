// ═══════════════════════════════════════════════════
// src/game/ui/StatusBar.ts — Turn counter + infection % bar
// 3-row layout: Row1 Turn/Actions | Row2 InfBar | Row3 Objective
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { UI } from "../config";

const BAR_H = 10;
const BAR_RADIUS = 5;
const ROW_GAP = 4;

export class StatusBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  private turnText: Phaser.GameObjects.Text;
  private actionsText: Phaser.GameObjects.Text;
  private pctText: Phaser.GameObjects.Text;
  private barBg: Phaser.GameObjects.Graphics;
  private barFill: Phaser.GameObjects.Graphics;
  private objectiveText: Phaser.GameObjects.Text;

  private barX: number;
  private barY: number;
  private barW: number;
  private totalW: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
  ) {
    this.scene = scene;
    this.totalW = width;
    this.container = scene.add.container(0, 0);

    // ── Row 1: Turn (left) + Actions (right) ──
    const row1Y = y + 2;

    this.turnText = scene.add
      .text(x + 4, row1Y, "Turn 0", {
        fontSize: "11px",
        color: "#ffffff",
        fontFamily: "'Orbitron', sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.actionsText = scene.add
      .text(x + width - 4, row1Y, "", {
        fontSize: "10px",
        color: "#88aadd",
        fontFamily: "'Orbitron', sans-serif",
      })
      .setOrigin(1, 0);

    // ── Row 2: Infection bar + pct ──
    const row2Y = row1Y + 16 + ROW_GAP;
    this.barX = x + 4;
    this.barW = Math.max(40, width - 56);
    this.barY = row2Y;

    this.barBg = scene.add.graphics();
    this.barBg.fillStyle(0x333355, 0.8);
    this.barBg.fillRoundedRect(this.barX, this.barY, this.barW, BAR_H, BAR_RADIUS);

    this.barFill = scene.add.graphics();

    this.pctText = scene.add
      .text(this.barX + this.barW + 6, row2Y - 1, "0%", {
        fontSize: "11px",
        color: "#ff4444",
        fontFamily: "'Orbitron', sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    // ── Row 3: Objective hint ──
    const row3Y = row2Y + BAR_H + ROW_GAP + 2;
    this.objectiveText = scene.add
      .text(x + width / 2, row3Y, "", {
        fontSize: "9px",
        color: "#8899bb",
        fontFamily: "'Orbitron', sans-serif",
      })
      .setOrigin(0.5, 0);

    this.container.add([this.turnText, this.actionsText, this.barBg, this.barFill, this.pctText, this.objectiveText]);
  }

  update(turn: number, infectionPct: number, maxTurns?: number): void {
    const turnLabel = maxTurns != null ? `Turn ${turn}/${maxTurns}` : `Turn ${turn}`;
    this.turnText.setText(turnLabel);

    // Update bar fill
    const fillW = Math.max(0, Math.min(1, infectionPct / 100)) * this.barW;
    this.barFill.clear();

    // Color gradient: green → yellow → red based on infection %
    let barColor: number;
    if (infectionPct < 25) barColor = UI.successGreen;
    else if (infectionPct < 60) barColor = UI.accentGold;
    else barColor = UI.dangerRed;

    this.barFill.fillStyle(barColor, 0.9);
    if (fillW > 0) {
      this.barFill.fillRoundedRect(this.barX, this.barY, fillW, BAR_H, BAR_RADIUS);
    }

    this.pctText.setText(`${Math.round(infectionPct)}%`);
    this.pctText.setColor(
      infectionPct >= 60 ? "#ff4444" : infectionPct >= 25 ? "#ffd740" : "#4caf50",
    );
  }

  setObjectiveHint(text: string): void {
    this.objectiveText.setText(text);
  }

  setActions(remaining: number, max: number): void {
    if (remaining > 0) {
      this.actionsText.setText(`${remaining}/${max} actions`);
      this.actionsText.setColor("#88aadd");
    } else {
      this.actionsText.setText("▶ Step");
      this.actionsText.setColor("#ffcc44");
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
