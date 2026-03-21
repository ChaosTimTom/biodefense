// ═══════════════════════════════════════════════════
// src/game/ui/ToolPalette.ts — Premium touch-first tool dock
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { ToolId, ToolInventory } from "../../sim/types";
import { ALL_TOOL_IDS } from "../../sim/constants";
import { playCue, triggerHaptic } from "../feedback";
import { APP_THEME } from "../theme";
import { TOOL_NAMES, TOOL_TEXTURES } from "../config";

const ALL_TOOLS: ToolId[] = ALL_TOOL_IDS;
const BTN_W = 62;
const BTN_H = 58;
const BTN_GAP = 8;
const BTN_RADIUS = 16;

export interface ToolPaletteEvents {
  onSelectTool: (tool: ToolId | null) => void;
}

export class ToolPalette {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private stripBg: Phaser.GameObjects.Graphics;
  private tooltipText: Phaser.GameObjects.Text | null = null;
  private buttons: Map<ToolId, {
    bg: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
    count: Phaser.GameObjects.Text;
    label: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Rectangle;
  }> = new Map();
  private selectedTool: ToolId | null = null;
  private visibleTools: ToolId[] = [];
  private events: ToolPaletteEvents;
  private centerX: number;
  private baseY: number;

  constructor(scene: Phaser.Scene, centerX: number, y: number, events: ToolPaletteEvents) {
    this.scene = scene;
    this.centerX = centerX;
    this.baseY = y;
    this.events = events;
    this.container = scene.add.container(0, 0).setDepth(20);
    this.stripBg = scene.add.graphics();
    this.container.add(this.stripBg);
  }

  build(tools: ToolInventory): void {
    this.clear();
    this.visibleTools = ALL_TOOLS.filter((tool) => tools[tool] > 0);

    const totalW = this.visibleTools.length * BTN_W + Math.max(0, this.visibleTools.length - 1) * BTN_GAP;
    const startX = this.centerX - totalW / 2;

    this.stripBg.fillStyle(0x08131f, 0.86);
    this.stripBg.fillRoundedRect(startX - 10, this.baseY - 8, totalW + 20, BTN_H + 16, 22);
    this.stripBg.lineStyle(1, 0xffffff, 0.08);
    this.stripBg.strokeRoundedRect(startX - 10, this.baseY - 8, totalW + 20, BTN_H + 16, 22);

    this.visibleTools.forEach((tool, index) => {
      const bx = startX + index * (BTN_W + BTN_GAP);
      const by = this.baseY;
      const bg = this.scene.add.graphics();
      this.drawButtonBg(bg, bx, by, false, tools[tool] > 0);

      const iconKey = TOOL_TEXTURES[tool].normal;
      const icon = this.scene.textures.exists(iconKey)
        ? this.scene.add.image(bx + BTN_W / 2, by + 20, iconKey).setDisplaySize(22, 22)
        : this.scene.add.text(bx + BTN_W / 2, by + 18, tool.slice(0, 3).toUpperCase(), {
            fontSize: "12px",
            color: APP_THEME.colors.textPrimary,
            fontFamily: APP_THEME.fonts.body,
            fontStyle: "bold",
          }).setOrigin(0.5);

      const label = this.scene.add.text(bx + BTN_W / 2, by + 37, TOOL_NAMES[tool].slice(0, 4).toUpperCase(), {
        fontSize: "7px",
        color: APP_THEME.colors.textMuted,
        fontFamily: APP_THEME.fonts.body,
        fontStyle: "bold",
      }).setOrigin(0.5);

      const count = this.scene.add.text(bx + BTN_W / 2, by + 49, `${tools[tool]}`, {
        fontSize: "12px",
        color: APP_THEME.colors.textPrimary,
        fontFamily: APP_THEME.fonts.body,
        fontStyle: "bold",
      }).setOrigin(0.5);

      const zone = this.scene.add.rectangle(bx + BTN_W / 2, by + BTN_H / 2, BTN_W, BTN_H)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.001);

      zone.on("pointerdown", () => this.selectTool(tool));
      zone.on("pointerover", () => this.showToolTooltip(tool, bx, by));
      zone.on("pointerout", () => this.hideToolTooltip());

      this.buttons.set(tool, { bg, icon, count, label, zone });
      this.container.add([bg, icon, label, count, zone]);
    });
  }

  updateCounts(tools: ToolInventory): void {
    for (const [toolId, btn] of this.buttons) {
      const remaining = tools[toolId];
      btn.count.setText(`${remaining}`);
      const alpha = remaining > 0 ? 1 : 0.32;
      btn.icon.setAlpha(alpha);
      btn.count.setAlpha(alpha);
      btn.label.setAlpha(alpha);
      btn.bg.clear();
      this.drawButtonBg(btn.bg, this.getButtonX(toolId), this.baseY, toolId === this.selectedTool, remaining > 0);
    }

    if (this.selectedTool && tools[this.selectedTool] <= 0) {
      this.selectTool(null);
    }
  }

  selectTool(tool: ToolId | null): void {
    if (this.selectedTool === tool) {
      this.selectedTool = null;
      this.redrawButtons();
      this.events.onSelectTool(null);
      return;
    }

    this.selectedTool = tool;
    if (tool) {
      playCue("ui_toggle");
      triggerHaptic("soft");
    }
    this.redrawButtons();
    this.events.onSelectTool(tool);
  }

  getSelectedTool(): ToolId | null {
    return this.selectedTool;
  }

  private redrawButtons(): void {
    for (const [tool, btn] of this.buttons) {
      btn.bg.clear();
      this.drawButtonBg(btn.bg, this.getButtonX(tool), this.baseY, tool === this.selectedTool, btn.count.text !== "0");
      const textures = TOOL_TEXTURES[tool];
      if (btn.icon instanceof Phaser.GameObjects.Image) {
        const tex = tool === this.selectedTool && this.scene.textures.exists(textures.selected)
          ? textures.selected
          : textures.normal;
        btn.icon.setTexture(tex);
      }
      btn.label.setColor(tool === this.selectedTool ? APP_THEME.colors.textPrimary : APP_THEME.colors.textMuted);
    }
  }

  private getButtonX(tool: ToolId): number {
    const idx = this.visibleTools.indexOf(tool);
    const totalW = this.visibleTools.length * BTN_W + Math.max(0, this.visibleTools.length - 1) * BTN_GAP;
    return this.centerX - totalW / 2 + idx * (BTN_W + BTN_GAP);
  }

  private drawButtonBg(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    selected: boolean,
    enabled: boolean,
  ): void {
    g.fillStyle(selected ? 0x123247 : 0x102131, enabled ? 0.96 : 0.58);
    g.fillRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
    g.lineStyle(1.5, selected ? 0x00e5ff : 0xffffff, selected ? 0.95 : 0.06);
    g.strokeRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
  }

  private showToolTooltip(tool: ToolId, bx: number, by: number): void {
    if (!this.tooltipText) {
      this.tooltipText = this.scene.add.text(0, 0, "", {
        fontSize: "11px",
        color: APP_THEME.colors.textPrimary,
        fontFamily: APP_THEME.fonts.body,
        backgroundColor: "rgba(6,16,28,0.92)",
        padding: { x: 8, y: 6 },
      }).setDepth(100);
    }

    this.tooltipText.setText(TOOL_NAMES[tool]);
    this.tooltipText.setAlpha(1);

    const tx = Phaser.Math.Clamp(
      bx + BTN_W / 2 - this.tooltipText.width / 2,
      8,
      this.scene.cameras.main.width - this.tooltipText.width - 8,
    );
    this.tooltipText.setPosition(tx, by - this.tooltipText.height - 6);
  }

  private hideToolTooltip(): void {
    this.tooltipText?.setAlpha(0);
  }

  private clear(): void {
    for (const btn of this.buttons.values()) {
      btn.bg.destroy();
      btn.icon.destroy();
      btn.count.destroy();
      btn.label.destroy();
      btn.zone.destroy();
    }
    this.stripBg.clear();
    this.buttons.clear();
    this.selectedTool = null;
    this.tooltipText?.destroy();
    this.tooltipText = null;
  }

  destroy(): void {
    this.tooltipText?.destroy();
    this.container.destroy(true);
  }
}
