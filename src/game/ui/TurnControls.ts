// ═══════════════════════════════════════════════════
// src/game/ui/TurnControls.ts — Premium action controls
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { APP_THEME } from "../theme";

const BTN_H = 46;
const BTN_RADIUS = 16;

export interface TurnControlEvents {
  onStep: () => void;
  onUndo: () => void;
  onReset: () => void;
  onSwitch: () => void;
}

interface TurnControlsOptions {
  compact?: boolean;
}

export class TurnControls {
  private container: Phaser.GameObjects.Container;
  private stepBtn!: ControlButton;
  private undoBtn!: ControlButton;
  private resetBtn!: ControlButton;
  private switchBtn!: ControlButton;
  private compact: boolean;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    y: number,
    events: TurnControlEvents,
    options: TurnControlsOptions = {},
  ) {
    this.compact = options.compact ?? false;
    this.container = scene.add.container(0, 0).setDepth(20);

    const switchWidth = this.compact ? 68 : 78;
    const sideWidth = this.compact ? 74 : 82;
    const stepWidth = this.compact ? 108 : 120;
    const gap = this.compact ? 6 : 8;
    const totalWidth = switchWidth + sideWidth + stepWidth + sideWidth + gap * 3;
    const startX = centerX - totalWidth / 2;

    let cursor = startX;
    this.switchBtn = this.createButton(scene, cursor + switchWidth / 2, y, switchWidth, "Swap", APP_THEME.colors.gold, events.onSwitch);
    cursor += switchWidth + gap;
    this.undoBtn = this.createButton(scene, cursor + sideWidth / 2, y, sideWidth, "Undo", APP_THEME.colors.textSecondary, events.onUndo);
    cursor += sideWidth + gap;
    this.stepBtn = this.createButton(scene, cursor + stepWidth / 2, y, stepWidth, this.compact ? "Resolve" : "Resolve Turn", APP_THEME.colors.accent, events.onStep);
    cursor += stepWidth + gap;
    this.resetBtn = this.createButton(scene, cursor + sideWidth / 2, y, sideWidth, "Restart", APP_THEME.colors.danger, events.onReset);
  }

  private createButton(
    scene: Phaser.Scene,
    centerX: number,
    y: number,
    width: number,
    label: string,
    accent: string,
    callback: () => void,
  ): ControlButton {
    const x = centerX - width / 2;
    const bg = scene.add.graphics();
    this.drawButton(bg, x, y, width, accent, true);

    const text = scene.add.text(centerX, y + BTN_H / 2, label, {
      fontSize: width > 100 ? "13px" : this.compact ? "11px" : "12px",
      color: accent,
      fontFamily: APP_THEME.fonts.body,
      fontStyle: "bold",
    }).setOrigin(0.5);

    const zone = scene.add.rectangle(centerX, y + BTN_H / 2, width, BTN_H)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);

    const button: ControlButton = { bg, text, zone, x, y, width, accent };

    zone.on("pointerdown", callback);
    zone.on("pointerover", () => {
      bg.clear();
      this.drawButton(bg, x, y, width, button.accent, false);
    });
    zone.on("pointerout", () => {
      bg.clear();
      this.drawButton(bg, x, y, width, button.accent, true);
    });

    this.container.add([bg, text, zone]);
    return button;
  }

  private drawButton(
    bg: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    accent: string,
    idle: boolean,
  ): void {
    bg.fillStyle(idle ? 0x0b1723 : 0x12304a, idle ? 0.92 : 0.98);
    bg.fillRoundedRect(x, y, width, BTN_H, BTN_RADIUS);
    bg.lineStyle(idle ? 1 : 2, parseInt(accent.replace("#", ""), 16), idle ? 0.2 : 0.95);
    bg.strokeRoundedRect(x, y, width, BTN_H, BTN_RADIUS);
  }

  setUndoEnabled(enabled: boolean): void {
    this.undoBtn.text.setAlpha(enabled ? 1 : 0.35);
    if (enabled) {
      this.undoBtn.zone.setInteractive({ useHandCursor: true });
    } else {
      this.undoBtn.zone.disableInteractive();
    }
  }

  setSwitchState(active: boolean, remaining: number): void {
    const enabled = remaining > 0;
    const accent = active
      ? APP_THEME.colors.accent
      : enabled
        ? APP_THEME.colors.gold
        : APP_THEME.colors.textMuted;

    this.switchBtn.accent = accent;
    this.switchBtn.text.setColor(accent);
    this.switchBtn.text.setAlpha(enabled || active ? 1 : 0.45);
    this.switchBtn.bg.clear();
    this.drawButton(this.switchBtn.bg, this.switchBtn.x, this.switchBtn.y, this.switchBtn.width, accent, !active);

    if (enabled) {
      this.switchBtn.zone.setInteractive({ useHandCursor: true });
    } else {
      this.switchBtn.zone.disableInteractive();
    }
  }

  setEnabled(enabled: boolean): void {
    const alpha = enabled ? 1 : 0.38;
    [this.stepBtn, this.undoBtn, this.resetBtn, this.switchBtn].forEach((btn) => {
      btn.text.setAlpha(alpha);
      if (enabled || btn === this.undoBtn) return;
    });

    if (enabled) {
      this.stepBtn.zone.setInteractive({ useHandCursor: true });
      this.switchBtn.zone.setInteractive({ useHandCursor: true });
      this.resetBtn.zone.setInteractive({ useHandCursor: true });
    } else {
      this.stepBtn.zone.disableInteractive();
      this.undoBtn.zone.disableInteractive();
      this.switchBtn.zone.disableInteractive();
      this.resetBtn.zone.disableInteractive();
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}

interface ControlButton {
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  width: number;
  accent: string;
}
