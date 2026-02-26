// ═══════════════════════════════════════════════════
// src/game/ui/TurnControls.ts — Step / Undo / Reset buttons
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { UI } from "../config";

const BTN_W = 80;
const BTN_H = 44;
const BTN_GAP = 8;
const BTN_RADIUS = 8;

export interface TurnControlEvents {
  onStep: () => void;
  onUndo: () => void;
  onReset: () => void;
}

export class TurnControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private stepBtn!: { bg: Phaser.GameObjects.Graphics; icon: Phaser.GameObjects.Image | null; text: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Rectangle };
  private undoBtn!: { bg: Phaser.GameObjects.Graphics; icon: Phaser.GameObjects.Image | null; text: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Rectangle };
  private resetBtn!: { bg: Phaser.GameObjects.Graphics; icon: Phaser.GameObjects.Image | null; text: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Rectangle };

  private events: TurnControlEvents;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    y: number,
    events: TurnControlEvents,
  ) {
    this.scene = scene;
    this.events = events;
    this.container = scene.add.container(0, 0);

    const totalW = BTN_W * 3 + BTN_GAP * 2;
    const startX = centerX - totalW / 2;

    this.undoBtn = this.createButton(startX, y, "↩ Undo", UI.textSecondary, () => events.onUndo());
    this.stepBtn = this.createButton(startX + BTN_W + BTN_GAP, y, "▶ Step", UI.accentCyan, () => events.onStep());
    this.resetBtn = this.createButton(startX + (BTN_W + BTN_GAP) * 2, y, "⟳ Reset", UI.dangerRed, () => events.onReset());
  }

  private hasTexture(key: string): boolean {
    return this.scene.textures.exists(key) && key !== "__MISSING";
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    accentColor: number,
    callback: () => void,
    normalTex?: string,
    hoverTex?: string,
  ): { bg: Phaser.GameObjects.Graphics; icon: Phaser.GameObjects.Image | null; text: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Rectangle } {
    const bg = this.scene.add.graphics();
    const useSprite = normalTex && this.hasTexture(normalTex);
    let icon: Phaser.GameObjects.Image | null = null;

    if (useSprite) {
      // Sprite-based button
      icon = this.scene.add.image(x + BTN_W / 2, y + BTN_H / 2, normalTex);
      const scale = Math.min(BTN_W / icon.width, BTN_H / icon.height) * 0.85;
      icon.setScale(scale);
    } else {
      // Procedural background fallback
      bg.fillStyle(UI.bgPanel, 0.9);
      bg.fillRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
      bg.lineStyle(1, accentColor, 0.6);
      bg.strokeRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
    }

    // Text label (shown below sprite or centered if procedural)
    const text = this.scene.add
      .text(x + BTN_W / 2, y + BTN_H / 2, label, {
        fontSize: useSprite ? "10px" : "14px",
        color: `#${accentColor.toString(16).padStart(6, "0")}`,
        fontFamily: "'Orbitron', sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (useSprite) {
      // Shift icon up and text below it
      icon!.setY(y + BTN_H / 2 - 4);
      text.setY(y + BTN_H - 4);
      text.setFontSize(9);
    }

    const zone = this.scene.add
      .rectangle(x + BTN_W / 2, y + BTN_H / 2, BTN_W, BTN_H)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);

    zone.on("pointerdown", callback);
    zone.on("pointerover", () => {
      if (useSprite && hoverTex && this.hasTexture(hoverTex)) {
        icon!.setTexture(hoverTex);
      } else {
        bg.clear();
        bg.fillStyle(accentColor, 0.15);
        bg.fillRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
        bg.lineStyle(2, accentColor, 1);
        bg.strokeRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
      }
    });
    zone.on("pointerout", () => {
      if (useSprite && normalTex) {
        icon!.setTexture(normalTex);
      } else {
        bg.clear();
        bg.fillStyle(UI.bgPanel, 0.9);
        bg.fillRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
        bg.lineStyle(1, accentColor, 0.6);
        bg.strokeRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
      }
    });

    const items: Phaser.GameObjects.GameObject[] = [bg];
    if (icon) items.push(icon);
    items.push(text, zone);
    this.container.add(items);
    return { bg, icon, text, zone };
  }

  /** Enable/disable undo based on history */
  setUndoEnabled(enabled: boolean): void {
    this.undoBtn.text.setAlpha(enabled ? 1 : 0.3);
    this.undoBtn.icon?.setAlpha(enabled ? 1 : 0.3);
    if (enabled) {
      this.undoBtn.zone.setInteractive({ useHandCursor: true });
    } else {
      this.undoBtn.zone.disableInteractive();
    }
  }

  /** Disable controls when game is over */
  setEnabled(enabled: boolean): void {
    const alpha = enabled ? 1 : 0.3;
    this.stepBtn.text.setAlpha(alpha);
    this.stepBtn.icon?.setAlpha(alpha);
    this.undoBtn.text.setAlpha(alpha);
    this.undoBtn.icon?.setAlpha(alpha);
    this.resetBtn.text.setAlpha(alpha);
    this.resetBtn.icon?.setAlpha(alpha);
    if (enabled) {
      this.stepBtn.zone.setInteractive({ useHandCursor: true });
      this.resetBtn.zone.setInteractive({ useHandCursor: true });
    } else {
      this.stepBtn.zone.disableInteractive();
      this.resetBtn.zone.disableInteractive();
      this.undoBtn.zone.disableInteractive();
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
