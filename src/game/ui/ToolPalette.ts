// ═══════════════════════════════════════════════════
// src/game/ui/ToolPalette.ts — Tool selection bar
// Horizontal row of tool buttons with emoji + count
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { ToolId, ToolInventory } from "../../sim/types";
import { TOOL_COLORS, TOOL_LABELS, TOOL_NAMES, TOOL_DESCRIPTIONS, TOOL_TEXTURES, UI } from "../config";

const ALL_TOOLS: ToolId[] = [
  "antibiotic",
  "antiviral",
  "antifungal",
  "wall",
];

const BTN_W = 56;
const BTN_H = 48;
const BTN_GAP = 6;
const BTN_RADIUS = 8;

export interface ToolPaletteEvents {
  onSelectTool: (tool: ToolId | null) => void;
}

export class ToolPalette {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private buttons: Map<ToolId, {
    bg: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
    count: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Rectangle;
  }> = new Map();

  private selectedTool: ToolId | null = null;
  private events: ToolPaletteEvents;
  private centerX: number;
  private baseY: number;
  private visibleTools: ToolId[] = [];
  private tooltipText: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    y: number,
    events: ToolPaletteEvents,
  ) {
    this.scene = scene;
    this.centerX = centerX;
    this.baseY = y;
    this.events = events;
    this.container = scene.add.container(0, 0);
  }

  /** Build palette buttons for the tools available in this level */
  build(tools: ToolInventory): void {
    this.clear();

    // Only show tools the player actually has (count > 0)
    this.visibleTools = ALL_TOOLS.filter((t) => tools[t] > 0);

    const totalW =
      this.visibleTools.length * BTN_W +
      (this.visibleTools.length - 1) * BTN_GAP;
    const startX = this.centerX - totalW / 2;

    this.visibleTools.forEach((tool, i) => {
      const bx = startX + i * (BTN_W + BTN_GAP);
      const by = this.baseY;

      // Background
      const bg = this.scene.add.graphics();
      this.drawButtonBg(bg, bx, by, false);

      // Canvas-drawn vector icons (generated in BootScene)
      const iconKey = `icon_${tool}`;
      const icon: Phaser.GameObjects.Image | Phaser.GameObjects.Text =
        this.scene.textures.exists(iconKey)
          ? this.scene.add
              .image(bx + BTN_W / 2, by + BTN_H / 2 - 6, iconKey)
              .setDisplaySize(24, 24)
          : this.scene.add
              .text(bx + BTN_W / 2, by + BTN_H / 2 - 6, TOOL_LABELS[tool], {
                fontSize: "20px",
              })
              .setOrigin(0.5);

      // Count text
      const count = this.scene.add
        .text(bx + BTN_W / 2, by + BTN_H - 6, `${tools[tool]}`, {
          fontSize: "11px",
          color: "#aaaacc",
          fontFamily: "'Orbitron', sans-serif",
        })
        .setOrigin(0.5);

      // Hit zone
      const zone = this.scene.add
        .rectangle(bx + BTN_W / 2, by + BTN_H / 2, BTN_W, BTN_H)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.001);

      zone.on("pointerdown", () => this.selectTool(tool));
      zone.on("pointerover", () => this.showToolTooltip(tool, bx, by));
      zone.on("pointerout", () => this.hideToolTooltip());

      this.container.add([bg, icon, count, zone]);
      this.buttons.set(tool, { bg, icon, count, zone });
    });
  }

  /** Update tool counts (e.g., after placing a tool) */
  updateCounts(tools: ToolInventory): void {
    for (const [toolId, btn] of this.buttons) {
      const remaining = tools[toolId];
      btn.count.setText(`${remaining}`);
      if (remaining <= 0) {
        btn.icon.setAlpha(0.3);
        btn.count.setAlpha(0.3);
      } else {
        btn.icon.setAlpha(1);
        btn.count.setAlpha(1);
      }
    }
    // Deselect if current tool is depleted
    if (this.selectedTool && tools[this.selectedTool] <= 0) {
      this.selectTool(null);
    }
  }

  selectTool(tool: ToolId | null): void {
    // Deselect previous
    if (this.selectedTool && this.buttons.has(this.selectedTool)) {
      const prev = this.buttons.get(this.selectedTool)!;
      prev.bg.clear();
      this.drawButtonBg(
        prev.bg,
        this.getButtonX(this.selectedTool),
        this.baseY,
        false,
      );
      // Swap icon back to normal texture
      this.swapToolIcon(this.selectedTool, false);
    }

    // Toggle off if same tool selected again
    if (this.selectedTool === tool) {
      this.selectedTool = null;
      this.events.onSelectTool(null);
      return;
    }

    this.selectedTool = tool;

    // Highlight new
    if (tool && this.buttons.has(tool)) {
      const btn = this.buttons.get(tool)!;
      btn.bg.clear();
      this.drawButtonBg(btn.bg, this.getButtonX(tool), this.baseY, true);
      // Swap icon to selected texture
      this.swapToolIcon(tool, true);
    }

    this.events.onSelectTool(tool);
  }

  getSelectedTool(): ToolId | null {
    return this.selectedTool;
  }

  private getButtonX(tool: ToolId): number {
    const idx = this.visibleTools.indexOf(tool);
    const totalW =
      this.visibleTools.length * BTN_W +
      (this.visibleTools.length - 1) * BTN_GAP;
    return this.centerX - totalW / 2 + idx * (BTN_W + BTN_GAP);
  }

  /** Swap a tool icon between normal and selected texture */
  private swapToolIcon(tool: ToolId, selected: boolean): void {
    const btn = this.buttons.get(tool);
    if (!btn) return;
    const textures = TOOL_TEXTURES[tool];
    if (!textures) return;
    const texKey = selected ? textures.selected : textures.normal;
    if (btn.icon instanceof Phaser.GameObjects.Image && this.scene.textures.exists(texKey) && texKey !== "__MISSING") {
      btn.icon.setTexture(texKey);
    }
  }

  private drawButtonBg(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    selected: boolean,
  ): void {
    if (selected) {
      g.fillStyle(UI.accentCyan, 0.2);
      g.fillRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
      g.lineStyle(2, UI.accentCyan, 1);
      g.strokeRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
    } else {
      g.fillStyle(UI.bgPanel, 0.8);
      g.fillRoundedRect(x, y, BTN_W, BTN_H, BTN_RADIUS);
    }
  }

  private clear(): void {
    this.container.removeAll(true);
    this.buttons.clear();
    this.selectedTool = null;
    this.tooltipText?.destroy();
    this.tooltipText = null;
  }

  private showToolTooltip(tool: ToolId, bx: number, by: number): void {
    if (!this.tooltipText) {
      this.tooltipText = this.scene.add
        .text(0, 0, "", {
          fontSize: "11px",
          color: "#ffffff",
          fontFamily: "'Orbitron', sans-serif",
          backgroundColor: "#22224499",
          padding: { x: 6, y: 4 },
          wordWrap: { width: 180 },
        })
        .setDepth(300);
    }

    const name = TOOL_NAMES[tool];
    const desc = TOOL_DESCRIPTIONS[tool];
    this.tooltipText.setText(`${name}\n${desc}`);
    this.tooltipText.setAlpha(1);

    // Position above the button, clamped within canvas
    const cam = this.scene.cameras.main;
    let tx = bx + BTN_W / 2 - this.tooltipText.width / 2;
    let ty = by - this.tooltipText.height - 6;
    tx = Math.max(4, Math.min(tx, cam.width - this.tooltipText.width - 4));
    ty = Math.max(4, ty);
    this.tooltipText.setPosition(tx, ty);
  }

  private hideToolTooltip(): void {
    this.tooltipText?.setAlpha(0);
  }

  destroy(): void {
    this.tooltipText?.destroy();
    this.container.destroy(true);
  }
}
