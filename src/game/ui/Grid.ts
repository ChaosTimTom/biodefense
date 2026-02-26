// ═══════════════════════════════════════════════════
// src/game/ui/Grid.ts — Renders the game board
// Bio Defence v3: Pathogens + medicine cells
// Two layers: tile backgrounds and cell entities
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { Board, Tile } from "../../sim/types";
import { getTile } from "../../sim/board";
import { MEDICINE_LIFESPAN } from "../../sim/constants";
import type { PathogenShape } from "../config";
import {
  TILE_SIZE,
  TILE_GAP,
  TILE_RADIUS,
  TILE_BG,
  TILE_BG_TEXTURES,
  PATHOGEN_COLORS,
  PATHOGEN_SHAPES,
  PATHOGEN_TEXTURES,
  MEDICINE_COLORS,
  MEDICINE_TEXTURES,
  UI,
  tileX,
  tileY,
  worldTileTexture,
} from "../config";

export interface GridEvents {
  onTileClick: (x: number, y: number) => void;
  onTileHover: (x: number, y: number) => void;
  onTileOut: () => void;
}

export class Grid {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private tileGraphics: Phaser.GameObjects.Graphics;
  private entityLayer: Phaser.GameObjects.Graphics;
  private hitZones: Phaser.GameObjects.Rectangle[] = [];
  private entitySprites: Phaser.GameObjects.Image[] = [];
  private bgSprites: Phaser.GameObjects.Image[] = [];

  private cols: number;
  private rows: number;
  private offsetX: number;
  private offsetY: number;
  private events: GridEvents;
  private ts: number;   // effective tile size
  private tg: number;   // effective tile gap
  private tr: number;   // effective tile radius
  private world: number; // world number for themed tiles

  constructor(
    scene: Phaser.Scene,
    cols: number,
    rows: number,
    offsetX: number,
    offsetY: number,
    events: GridEvents,
    tileSize = TILE_SIZE,
    tileGap = TILE_GAP,
    tileRadius = TILE_RADIUS,
    world = 1,
  ) {
    this.scene = scene;
    this.cols = cols;
    this.rows = rows;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.events = events;
    this.ts = tileSize;
    this.tg = tileGap;
    this.tr = tileRadius;
    this.world = world;

    this.container = scene.add.container(0, 0);

    // Two layers: tile bg → entities on top
    this.tileGraphics = scene.add.graphics();
    this.entityLayer = scene.add.graphics();
    this.container.add([this.tileGraphics, this.entityLayer]);

    this.createHitZones();
  }

  private createHitZones(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const px = tileX(x, this.offsetX, this.ts, this.tg);
        const py = tileY(y, this.offsetY, this.ts, this.tg);

        const zone = this.scene.add
          .rectangle(px + this.ts / 2, py + this.ts / 2, this.ts, this.ts)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setAlpha(0.001);

        const gx = x;
        const gy = y;
        zone.on("pointerdown", () => this.events.onTileClick(gx, gy));
        zone.on("pointerover", () => this.events.onTileHover(gx, gy));
        zone.on("pointerout", () => this.events.onTileOut());

        this.hitZones.push(zone);
        this.container.add(zone);
      }
    }
  }

  /** Full redraw from board state */
  render(board: Board): void {
    this.tileGraphics.clear();
    this.entityLayer.clear();

    // Destroy previous frame sprites
    for (const s of this.bgSprites) s.destroy();
    this.bgSprites.length = 0;
    for (const s of this.entitySprites) s.destroy();
    this.entitySprites.length = 0;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = getTile(board, x, y);
        const px = tileX(x, this.offsetX, this.ts, this.tg);
        const py = tileY(y, this.offsetY, this.ts, this.tg);
        this.drawTileBg(px, py, tile, x, y);
        this.drawEntity(px, py, tile, x, y);
      }
    }
  }

  /** Check whether a texture key actually exists in the Phaser cache */
  private hasTexture(key: string): boolean {
    return this.scene.textures.exists(key) && key !== "__MISSING";
  }

  /** Create a sprite scaled to fit one tile cell */
  private addTileSprite(px: number, py: number, textureKey: string, alpha = 1): Phaser.GameObjects.Image {
    const img = this.scene.add.image(px + this.ts / 2, py + this.ts / 2, textureKey);
    // Scale to fill the tile
    const frame = img.frame;
    const scaleX = this.ts / frame.width;
    const scaleY = this.ts / frame.height;
    img.setScale(scaleX, scaleY);
    img.setAlpha(alpha);
    this.container.add(img);
    // Push hit zones back on top so they stay interactive
    for (const hz of this.hitZones) this.container.bringToTop(hz);
    return img;
  }

  private drawTileBg(px: number, py: number, tile: Tile, gx: number, gy: number): void {
    // Pathogen/medicine tiles get their full-coverage texture from drawEntity
    if (tile.kind === "pathogen" || tile.kind === "medicine") {
      // Draw a dark fallback in case the entity texture fails to load
      const color = TILE_BG[tile.kind] ?? TILE_BG.empty;
      this.tileGraphics.fillStyle(color, 1);
      this.tileGraphics.fillRect(px, py, this.ts, this.ts);
      return;
    }

    // Try world-specific texture first, then default
    if (tile.kind === "empty" || tile.kind === "wall") {
      const worldKey = worldTileTexture(tile.kind, this.world);
      if (this.hasTexture(worldKey)) {
        const spr = this.addTileSprite(px, py, worldKey);
        this.bgSprites.push(spr);
        return;
      }
    }

    // Background tile texture (empty, wall) — default
    const texKey = TILE_BG_TEXTURES[tile.kind];
    if (texKey && this.hasTexture(texKey)) {
      const spr = this.addTileSprite(px, py, texKey);
      this.bgSprites.push(spr);
      return;
    }
    // Fallback: procedural rect
    const color = TILE_BG[tile.kind] ?? TILE_BG.empty;
    this.tileGraphics.fillStyle(color, 1);
    this.tileGraphics.fillRect(px, py, this.ts, this.ts);
  }

  private drawEntity(px: number, py: number, tile: Tile, gx: number, gy: number): void {
    const cx = px + this.ts / 2;
    const cy = py + this.ts / 2;
    const r = this.ts * 0.32;

    // ── Pathogen rendering ─────────────────────
    if (tile.kind === "pathogen" && tile.pathogenType) {
      // Try sprite-based rendering first
      const texKey = PATHOGEN_TEXTURES[tile.pathogenType];
      if (texKey && this.hasTexture(texKey)) {
        const spr = this.addTileSprite(px, py, texKey);
        this.entitySprites.push(spr);

        // Age indicator: small dots
        if (tile.age > 0) {
          const dots = Math.min(tile.age, 4);
          for (let i = 0; i < dots; i++) {
            this.entityLayer.fillStyle(0xffffff, 0.5);
            this.entityLayer.fillCircle(px + 6 + i * 5, py + 6, 2);
          }
        }
        return;
      }

      // Fallback: procedural shape
      const color = PATHOGEN_COLORS[tile.pathogenType];
      const shape: PathogenShape = PATHOGEN_SHAPES[tile.pathogenType];

      this.entityLayer.fillStyle(color, 1);

      switch (shape) {
        case "circle":
          this.entityLayer.fillCircle(cx, cy, r);
          break;
        case "diamond":
          this.drawDiamond(cx, cy, r);
          break;
        case "branch":
          this.drawBranch(cx, cy, r, color);
          break;
        case "rod":
          // Horizontal rounded rectangle
          this.entityLayer.fillRoundedRect(cx - r, cy - r * 0.35, r * 2, r * 0.7, 4);
          break;
        case "spiral":
          // Spiral approximation: 3 offset circles
          this.entityLayer.fillCircle(cx - r * 0.25, cy - r * 0.2, r * 0.45);
          this.entityLayer.fillCircle(cx + r * 0.15, cy + r * 0.1, r * 0.4);
          this.entityLayer.fillCircle(cx - r * 0.05, cy + r * 0.3, r * 0.35);
          break;
        case "spike":
          // Spiky circle (star-ish with many points)
          this.drawSpikyCircle(cx, cy, r, 8, color);
          break;
        case "icosa":
          // Hexagonal shape
          this.drawHex(cx, cy, r);
          break;
        case "phage_t4":
          // T4 phage: hexagonal head + legs
          this.drawHex(cx, cy - r * 0.15, r * 0.55);
          this.entityLayer.lineStyle(2, color, 0.8);
          for (let i = 0; i < 3; i++) {
            const lx = cx + (i - 1) * r * 0.4;
            this.entityLayer.lineBetween(lx, cy + r * 0.3, lx, cy + r * 0.9);
          }
          break;
        case "starburst":
          // 6-pointed starburst
          this.drawSpikyCircle(cx, cy, r, 6, color);
          break;
      }

      // Age indicator: small dots
      if (tile.age > 0) {
        const dots = Math.min(tile.age, 4);
        for (let i = 0; i < dots; i++) {
          this.entityLayer.fillStyle(0xffffff, 0.5);
          this.entityLayer.fillCircle(px + 6 + i * 5, py + 6, 2);
        }
      }

      return;
    }

    // ── Medicine rendering ─────────────────────
    if (tile.kind === "medicine" && tile.medicineType) {
      const lifeRemaining = MEDICINE_LIFESPAN - tile.age;
      const alpha = Math.max(0.3, lifeRemaining / MEDICINE_LIFESPAN);

      // Try sprite-based rendering first
      const texKey = MEDICINE_TEXTURES[tile.medicineType];
      if (texKey && this.hasTexture(texKey)) {
        const spr = this.addTileSprite(px, py, texKey, alpha);
        this.entitySprites.push(spr);

        // Lifespan ring
        if (lifeRemaining > 0) {
          const medColor = MEDICINE_COLORS[tile.medicineType];
          this.entityLayer.lineStyle(1, medColor, alpha * 0.5);
          this.entityLayer.strokeCircle(cx, cy, r + 3);
        }
        return;
      }

      // Fallback: procedural circle + cross
      const color = MEDICINE_COLORS[tile.medicineType];

      this.entityLayer.fillStyle(color, alpha);
      this.entityLayer.fillCircle(cx, cy, r);

      // White + cross to distinguish from pathogens
      this.entityLayer.lineStyle(2, 0xffffff, alpha * 0.8);
      this.entityLayer.lineBetween(cx - r * 0.45, cy, cx + r * 0.45, cy);
      this.entityLayer.lineBetween(cx, cy - r * 0.45, cx, cy + r * 0.45);

      // Lifespan ring: gets thinner as it ages
      if (lifeRemaining > 0) {
        this.entityLayer.lineStyle(1, color, alpha * 0.5);
        this.entityLayer.strokeCircle(cx, cy, r + 3);
      }

      return;
    }
  }

  private drawDiamond(cx: number, cy: number, r: number): void {
    this.entityLayer.beginPath();
    this.entityLayer.moveTo(cx, cy - r);
    this.entityLayer.lineTo(cx + r, cy);
    this.entityLayer.lineTo(cx, cy + r);
    this.entityLayer.lineTo(cx - r, cy);
    this.entityLayer.closePath();
    this.entityLayer.fillPath();
  }

  private drawBranch(cx: number, cy: number, r: number, color: number): void {
    const armLen = r * 0.9;
    this.entityLayer.fillCircle(cx, cy, r * 0.35);
    this.entityLayer.lineStyle(3, color, 1);
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
      this.entityLayer.lineBetween(
        cx,
        cy,
        cx + Math.cos(angle) * armLen,
        cy + Math.sin(angle) * armLen,
      );
    }
  }

  private drawSpikyCircle(cx: number, cy: number, r: number, points: number, color: number): void {
    const innerR = r * 0.55;
    this.entityLayer.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? r : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + rad * Math.cos(angle);
      const py = cy + rad * Math.sin(angle);
      if (i === 0) this.entityLayer.moveTo(px, py);
      else this.entityLayer.lineTo(px, py);
    }
    this.entityLayer.closePath();
    this.entityLayer.fillPath();
  }

  private drawHex(cx: number, cy: number, r: number): void {
    this.entityLayer.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) this.entityLayer.moveTo(px, py);
      else this.entityLayer.lineTo(px, py);
    }
    this.entityLayer.closePath();
    this.entityLayer.fillPath();
  }

  /** Highlight a specific tile */
  highlightTile(x: number, y: number, color: number = UI.selectedOutline): void {
    const px = tileX(x, this.offsetX, this.ts, this.tg);
    const py = tileY(y, this.offsetY, this.ts, this.tg);
    this.entityLayer.lineStyle(2, color, 1);
    this.entityLayer.strokeRect(px - 1, py - 1, this.ts + 2, this.ts + 2);
  }

  /** Show tool placement validity overlay */
  showPlacementHint(x: number, y: number, valid: boolean): void {
    const px = tileX(x, this.offsetX, this.ts, this.tg);
    const py = tileY(y, this.offsetY, this.ts, this.tg);
    const color = valid ? UI.successGreen : UI.dangerRed;
    this.entityLayer.fillStyle(color, 0.25);
    this.entityLayer.fillRect(px, py, this.ts, this.ts);
  }

  destroy(): void {
    this.hitZones.forEach((z) => z.destroy());
    for (const s of this.bgSprites) s.destroy();
    for (const s of this.entitySprites) s.destroy();
    this.bgSprites.length = 0;
    this.entitySprites.length = 0;
    this.container.destroy(true);
  }
}
