// ═══════════════════════════════════════════════════
// src/game/ui/StatusBar.ts — Premium turn / infection HUD
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { APP_THEME } from "../theme";

const BAR_H = 12;
const BAR_RADIUS = 6;

interface StatusBarOptions {
  compact?: boolean;
}

export class StatusBar {
  private container: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Graphics;
  private turnText: Phaser.GameObjects.Text;
  private actionsText: Phaser.GameObjects.Text;
  private pctText: Phaser.GameObjects.Text;
  private barBg: Phaser.GameObjects.Graphics;
  private barFill: Phaser.GameObjects.Graphics;
  private objectiveText: Phaser.GameObjects.Text;
  private barX: number;
  private barY: number;
  private barW: number;
  private compact: boolean;
  private panelH: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, options: StatusBarOptions = {}) {
    this.compact = options.compact ?? false;
    this.panelH = this.compact ? 54 : 60;
    this.container = scene.add.container(0, 0).setDepth(20);

    this.panel = scene.add.graphics();
    this.panel.fillStyle(0x08131f, 0.84);
    this.panel.fillRoundedRect(x, y, width, this.panelH, 18);
    this.panel.lineStyle(1, 0xffffff, 0.08);
    this.panel.strokeRoundedRect(x, y, width, this.panelH, 18);

    this.turnText = scene.add.text(x + 12, y + 8, "Turn 0", {
      fontSize: this.compact ? "10px" : "11px",
      color: APP_THEME.colors.textPrimary,
      fontFamily: APP_THEME.fonts.body,
      fontStyle: "bold",
    });

    this.actionsText = scene.add.text(x + width - 12, y + 8, "", {
      fontSize: this.compact ? "9px" : "10px",
      color: APP_THEME.colors.textSecondary,
      fontFamily: APP_THEME.fonts.body,
      fontStyle: "bold",
    }).setOrigin(1, 0);

    this.barX = x + 12;
    this.barY = y + (this.compact ? 26 : 28);
    this.barW = Math.max(40, width - 84);

    this.barBg = scene.add.graphics();
    this.barBg.fillStyle(0x203040, 0.9);
    this.barBg.fillRoundedRect(this.barX, this.barY, this.barW, BAR_H, BAR_RADIUS);

    this.barFill = scene.add.graphics();

    this.pctText = scene.add.text(x + width - 12, y + (this.compact ? 23 : 25), "0%", {
      fontSize: this.compact ? "10px" : "11px",
      color: APP_THEME.colors.danger,
      fontFamily: APP_THEME.fonts.body,
      fontStyle: "bold",
    }).setOrigin(1, 0);

    this.objectiveText = scene.add.text(x + 12, y + (this.compact ? 39 : 43), "", {
      fontSize: this.compact ? "9px" : "10px",
      color: APP_THEME.colors.textMuted,
      fontFamily: APP_THEME.fonts.body,
      wordWrap: { width: width - 24 },
    });

    this.container.add([
      this.panel,
      this.turnText,
      this.actionsText,
      this.barBg,
      this.barFill,
      this.pctText,
      this.objectiveText,
    ]);
  }

  update(turn: number, infectionPct: number, maxTurns?: number): void {
    this.turnText.setText(maxTurns != null ? `Turn ${turn}/${maxTurns}` : `Turn ${turn}`);

    const fillW = Math.max(0, Math.min(1, infectionPct / 100)) * this.barW;
    this.barFill.clear();

    let barColor = 0x00e676;
    if (infectionPct >= 25) barColor = 0xffd740;
    if (infectionPct >= 60) barColor = 0xff5252;

    this.barFill.fillStyle(barColor, 0.95);
    if (fillW > 0) {
      this.barFill.fillRoundedRect(this.barX, this.barY, fillW, BAR_H, BAR_RADIUS);
    }

    this.pctText.setText(`${Math.round(infectionPct)}%`);
    this.pctText.setColor(
      infectionPct >= 60
        ? APP_THEME.colors.danger
        : infectionPct >= 25
          ? APP_THEME.colors.gold
          : APP_THEME.colors.success,
    );
  }

  setObjectiveHint(text: string): void {
    this.objectiveText.setText(text);
  }

  setActions(remaining: number, max: number, switchesRemaining = 0): void {
    const switchText = switchesRemaining > 0 ? ` • ${switchesRemaining} switch` : "";
    const plural = switchesRemaining === 1 ? "" : "es";
    if (remaining > 0) {
      this.actionsText.setText(`${remaining}/${max} actions${switchText}${switchesRemaining > 0 ? plural : ""}`);
      this.actionsText.setColor(APP_THEME.colors.textSecondary);
    } else {
      this.actionsText.setText(`Ready to resolve${switchesRemaining > 0 ? ` • ${switchesRemaining} switch${plural}` : ""}`);
      this.actionsText.setColor(APP_THEME.colors.gold);
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
