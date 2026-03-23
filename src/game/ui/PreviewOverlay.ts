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
      const inset = Math.max(2, Math.round(this.ts * 0.06));
      const boxSize = this.ts - inset * 2;
      const dangerOutline = 0xff2a2a;

      this.graphics.fillStyle(PATHOGEN_COLORS[type], 0.12);
      this.graphics.fillRect(px + inset, py + inset, boxSize, boxSize);

      this.graphics.lineStyle(3, dangerOutline, 0.92);
      this.graphics.strokeRect(px + inset, py + inset, boxSize, boxSize);

      this.graphics.lineStyle(1, 0x7a0f12, 0.34);
      this.graphics.strokeRect(px + inset + 1.5, py + inset + 1.5, boxSize - 3, boxSize - 3);

      this.graphics.fillStyle(PATHOGEN_COLORS[type], 0.52);
      this.graphics.fillCircle(px + this.ts - 8, py + 8, 4);
    }

    for (const key of blockedKeys) {
      const [x, y] = key.split(",").map(Number);
      const px = tileX(x, this.offsetX, this.ts, this.tg);
      const py = tileY(y, this.offsetY, this.ts, this.tg);
      const inset = Math.max(3, Math.round(this.ts * 0.08));
      const boxSize = this.ts - inset * 2;

      this.graphics.lineStyle(2, UI.accentCyan, 0.9);
      this.graphics.strokeRect(px + inset, py + inset, boxSize, boxSize);
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
