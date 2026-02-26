// ═══════════════════════════════════════════════════
// src/game/ui/PreviewOverlay.ts — Ghost tiles showing next-turn spread
// Bio Defence v2: Uses previewNextTurn / previewSpreadTargets
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { GameState } from "../../sim/types";
import { previewSpreadTargets } from "../../sim/preview";
import { TILE_SIZE, UI, tileX, tileY } from "../config";

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
  showPreview(state: GameState): void {
    if (!this.visible) return;
    this.graphics.clear();

    const threats = previewSpreadTargets(state);
    for (const [x, y] of threats) {
      const px = tileX(x, this.offsetX, this.ts, this.tg);
      const py = tileY(y, this.offsetY, this.ts, this.tg);

      // Ghost infection overlay — red-tinted
      this.graphics.fillStyle(UI.dangerRed, UI.previewAlpha);
      this.graphics.fillRoundedRect(px + 2, py + 2, this.ts - 4, this.ts - 4, 4);

      // Small "!" warning dot
      this.graphics.fillStyle(UI.dangerRed, 0.5);
      this.graphics.fillCircle(px + this.ts - 8, py + 8, 4);
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
