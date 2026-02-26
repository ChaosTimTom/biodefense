// ═══════════════════════════════════════════════════
// src/game/ui/StarDisplay.ts — 3-star rating display
// Uses Graphics-drawn 5-pointed star polygons
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import { drawStar } from "./UIFactory";

const STAR_OUTER = 10;
const STAR_INNER = 5;
const STAR_GAP = 24;
const FILLED_COLOR = 0xffd740;
const EMPTY_COLOR = 0x333355;
const GLOW_COLOR = 0xffd740;

export class StarDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private starGraphics: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(5);

    for (let i = 0; i < 3; i++) {
      const sx = x + i * STAR_GAP;
      const gfx = scene.add.graphics();
      gfx.setPosition(sx + STAR_OUTER, y + STAR_OUTER);
      drawStar(gfx, 0, 0, STAR_OUTER, STAR_INNER, EMPTY_COLOR, 0.5);
      this.starGraphics.push(gfx);
      this.container.add(gfx);
    }
  }

  /** Update display to show `count` filled stars (0-3) */
  setStars(count: number): void {
    for (let i = 0; i < 3; i++) {
      const gfx = this.starGraphics[i];
      gfx.clear();

      if (i < count) {
        drawStar(gfx, 0, 0, STAR_OUTER + 3, STAR_INNER + 2, GLOW_COLOR, 0.15);
        drawStar(gfx, 0, 0, STAR_OUTER, STAR_INNER, FILLED_COLOR, 1, 0xffecb3);
      } else {
        drawStar(gfx, 0, 0, STAR_OUTER, STAR_INNER, EMPTY_COLOR, 0.5);
      }
    }
  }

  /** Animate stars filling in one by one */
  animateStars(count: number): void {
    for (let i = 0; i < 3; i++) {
      if (i < count) {
        this.scene.time.delayedCall(i * 300, () => {
          const gfx = this.starGraphics[i];
          gfx.clear();
          // Glow
          drawStar(gfx, 0, 0, STAR_OUTER + 3, STAR_INNER + 2, GLOW_COLOR, 0.15);
          drawStar(gfx, 0, 0, STAR_OUTER, STAR_INNER, FILLED_COLOR, 1, 0xffecb3);

          // Pop scale animation
          this.scene.tweens.add({
            targets: gfx,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 150,
            yoyo: true,
            ease: "Quad.easeOut",
          });
        });
      }
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
