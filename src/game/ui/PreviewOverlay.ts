// ═══════════════════════════════════════════════════
// src/game/ui/PreviewOverlay.ts — Ghost tiles showing next-turn spread
// Bio Defence v2: Uses previewNextTurn / previewSpreadTargets
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { GameState, ToolId } from "../../sim/types";
import { previewSpreadTargets } from "../../sim/preview";
import { PATHOGEN_COLORS, TILE_SIZE, UI, tileX, tileY } from "../config";

export class PreviewOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private offsetX: number;
  private offsetY: number;
  private ts: number;
  private tg: number;
  private visible = true;

  constructor(
    scene: Phaser.Scene,
    offsetX: number,
    offsetY: number,
    tileSize = TILE_SIZE,
    tileGap = 2,
  ) {
    this.scene = scene;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.ts = tileSize;
    this.tg = tileGap;
    this.container = scene.add.container(0, 0);
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);
  }

  /** Show preview of where pathogens will spread next turn */
  showPreview(
    state: GameState,
    placement?: { tool: ToolId; x: number; y: number },
  ): void {
    if (!this.visible) return;
    this.graphics.clear();

    const current = previewSpreadTargets(state);
    const currentKeys = new Set(current.map(({ x, y }) => `${x},${y}`));
    const blockedKeys = new Set<string>();
    const shown = placement ? previewSpreadTargets(state, placement) : current;

    if (placement) {
      const nextKeys = new Set(shown.map(({ x, y }) => `${x},${y}`));
      for (const key of currentKeys) {
        if (!nextKeys.has(key)) blockedKeys.add(key);
      }
    }

    for (const { x, y, type } of shown) {
      const px = tileX(x, this.offsetX, this.ts, this.tg);
      const py = tileY(y, this.offsetY, this.ts, this.tg);

      this.graphics.fillStyle(PATHOGEN_COLORS[type], 0.3);
      this.graphics.fillRoundedRect(px + 2, py + 2, this.ts - 4, this.ts - 4, 4);

      this.graphics.fillStyle(PATHOGEN_COLORS[type], 0.5);
      this.graphics.fillCircle(px + this.ts - 8, py + 8, 4);
    }

    for (const key of blockedKeys) {
      const [x, y] = key.split(",").map(Number);
      const px = tileX(x, this.offsetX, this.ts, this.tg);
      const py = tileY(y, this.offsetY, this.ts, this.tg);

      this.graphics.lineStyle(2, UI.accentCyan, 0.9);
      this.graphics.strokeRoundedRect(px + 3, py + 3, this.ts - 6, this.ts - 6, 5);
    }
  }

  /** Toggle visibility on/off */
  toggleVisible(): void {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);
    if (!this.visible) this.graphics.clear();
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.container.setVisible(v);
    if (!v) this.graphics.clear();
  }

  clear(): void {
    this.graphics.clear();
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
