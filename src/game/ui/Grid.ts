// ═══════════════════════════════════════════════════
// src/game/ui/Grid.ts — Renders the game board
// Premium board pass with persistent animated pieces
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { Board, Tile, MedicineType, PathogenType } from "../../sim/types";
import { cloneTile, getTile } from "../../sim/board";
import { MEDICINE_LIFESPAN } from "../../sim/constants";
import {
  TILE_SIZE,
  TILE_GAP,
  TILE_RADIUS,
  TILE_BG,
  TILE_BG_TEXTURES,
  PATHOGEN_COLORS,
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

interface PieceVisual {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Ellipse;
  glow: Phaser.GameObjects.Ellipse;
  sprite: Phaser.GameObjects.Image;
  ring?: Phaser.GameObjects.Ellipse;
  dots: Phaser.GameObjects.Ellipse[];
  kind: "pathogen" | "medicine";
  subtype: string;
  phase: number;
  baseScale: number;
}

export class Grid {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private boardPane: Phaser.GameObjects.Image;
  private tileGraphics: Phaser.GameObjects.Graphics;
  private overlayGraphics: Phaser.GameObjects.Graphics;
  private hitZones: Phaser.GameObjects.Rectangle[] = [];
  private bgSprites: Phaser.GameObjects.Image[] = [];
  private pieces = new Map<number, PieceVisual>();
  private previousTiles: Tile[] = [];

  private cols: number;
  private rows: number;
  private offsetX: number;
  private offsetY: number;
  private events: GridEvents;
  private ts: number;
  private tg: number;
  private tr: number;
  private world: number;

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
    this.boardPane = scene.add.image(
      this.offsetX + this.boardWidth() / 2,
      this.offsetY + this.boardHeight() / 2,
      this.ensureBoardPaneTexture(),
    );
    this.tileGraphics = scene.add.graphics();
    this.overlayGraphics = scene.add.graphics();
    this.container.add([this.boardPane, this.tileGraphics, this.overlayGraphics]);

    this.createHitZones();
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.handleUpdate, this);
  }

  private createHitZones(): void {
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const px = tileX(x, this.offsetX, this.ts, this.tg);
        const py = tileY(y, this.offsetY, this.ts, this.tg);

        const zone = this.scene.add
          .rectangle(px + this.ts / 2, py + this.ts / 2, this.ts, this.ts)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setAlpha(0.001);

        zone.on("pointerdown", () => this.events.onTileClick(x, y));
        zone.on("pointerover", () => this.events.onTileHover(x, y));
        zone.on("pointerout", () => this.events.onTileOut());

        this.hitZones.push(zone);
        this.container.add(zone);
      }
    }
  }

  render(board: Board): void {
    this.tileGraphics.clear();
    this.overlayGraphics.clear();

    for (const sprite of this.bgSprites) sprite.destroy();
    this.bgSprites.length = 0;

    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const tile = getTile(board, x, y);
        if (tile.kind !== "wall") continue;
        const px = tileX(x, this.offsetX, this.ts, this.tg);
        const py = tileY(y, this.offsetY, this.ts, this.tg);
        this.drawTileBg(px, py, tile);
      }
    }

    this.syncPieces(board);
    this.previousTiles = board.tiles.map((tile) => cloneTile(tile));
  }

  private drawTileBg(px: number, py: number, tile: Tile): void {
    const worldKey = worldTileTexture("wall", this.world);
    if (this.hasTexture(worldKey)) {
      const sprite = this.addTileSprite(px, py, worldKey, 1.62, this.ts * 0.145);
      this.bgSprites.push(sprite);
      return;
    }

    const defaultKey = TILE_BG_TEXTURES.wall;
    if (defaultKey && this.hasTexture(defaultKey)) {
      const sprite = this.addTileSprite(px, py, defaultKey, 1.62, this.ts * 0.145);
      this.bgSprites.push(sprite);
      return;
    }

    this.drawProceduralTile(px, py, "wall");
  }

  private drawProceduralTile(px: number, py: number, kind: "empty" | "wall"): void {
    const accent = kind === "wall" ? 0xffcf66 : this.worldAccent();
    const bg = kind === "wall" ? 0x162635 : TILE_BG.empty;
    const inset = Math.max(4, Math.round(this.ts * 0.11));

    this.tileGraphics.fillStyle(bg, 0.98);
    this.tileGraphics.fillRoundedRect(px, py, this.ts, this.ts, Math.max(6, this.tr));
    this.tileGraphics.lineStyle(1.5, accent, kind === "wall" ? 0.18 : 0.1);
    this.tileGraphics.strokeRoundedRect(px + 1, py + 1, this.ts - 2, this.ts - 2, Math.max(6, this.tr));

    this.tileGraphics.fillStyle(0x08131d, 0.84);
    this.tileGraphics.fillRoundedRect(
      px + inset,
      py + inset,
      this.ts - inset * 2,
      this.ts - inset * 2,
      Math.max(4, this.tr - 2),
    );

    if (kind === "wall") {
      this.tileGraphics.fillStyle(0x334958, 0.96);
      this.tileGraphics.fillRoundedRect(
        px + this.ts * 0.16,
        py + this.ts * 0.28,
        this.ts * 0.68,
        this.ts * 0.24,
        Math.max(4, this.tr - 2),
      );
    }
  }

  private syncPieces(board: Board): void {
    for (let i = 0; i < board.tiles.length; i += 1) {
      const newTile = board.tiles[i];
      const oldTile = this.previousTiles[i];
      const newKey = this.entityKey(newTile);
      const oldKey = oldTile ? this.entityKey(oldTile) : null;
      const visual = this.pieces.get(i);

      if (!newKey) {
        if (visual) {
          this.destroyPiece(i, oldKey === null);
        }
        continue;
      }

      const textureKey = this.textureKey(newTile);
      if (!this.hasTexture(textureKey)) {
        if (visual) {
          this.destroyPiece(i, true);
        }
        continue;
      }

      if (!visual || visual.kind !== newTile.kind || visual.subtype != this.entitySubtype(newTile)) {
        if (visual) {
          this.destroyPiece(i, true);
        }
        this.createPiece(i, newTile, oldKey === null);
      } else {
        this.updatePiece(i, visual, newTile);
      }
    }

    for (const [index] of this.pieces) {
      if (index >= board.tiles.length || !this.entityKey(board.tiles[index])) {
        this.destroyPiece(index, false);
      }
    }
  }

  private createPiece(index: number, tile: Tile, immediate: boolean): void {
    const { x, y } = this.gridCoords(index);
    const cx = tileX(x, this.offsetX, this.ts, this.tg) + this.ts / 2;
    const cy = tileY(y, this.offsetY, this.ts, this.tg) + this.ts / 2;
    const textureKey = this.textureKey(tile);
    const color = this.pieceColor(tile);

    const container = this.scene.add.container(cx, cy);
    container.setDepth(20 + y);

    const glow = this.scene.add
      .ellipse(0, this.ts * 0.06, this.ts * 0.68, this.ts * 0.34, color, tile.kind === "medicine" ? 0.15 : 0.10)
      .setBlendMode(Phaser.BlendModes.ADD);
    const shadow = this.scene.add
      .ellipse(0, this.ts * 0.18, this.ts * 0.46, this.ts * 0.16, 0x02080d, 0.30);

    const sprite = this.scene.add.image(0, -this.ts * 0.02, textureKey).setOrigin(0.5);
    const baseScale =
      Math.min((this.ts * 0.88) / sprite.width, (this.ts * 0.88) / sprite.height) *
      this.pieceScaleMultiplier(tile);
    sprite.setScale(baseScale);

    const dots: Phaser.GameObjects.Ellipse[] = [];
    for (let d = 0; d < 4; d += 1) {
      const dot = this.scene.add.ellipse(-this.ts * 0.16 + d * this.ts * 0.1, -this.ts * 0.26, 4, 4, 0xffffff, 0.68);
      dot.setVisible(false);
      dots.push(dot);
    }

    let ring: Phaser.GameObjects.Ellipse | undefined;
    if (tile.kind === "medicine") {
      ring = this.scene.add
        .ellipse(0, this.ts * 0.02, this.ts * 0.62, this.ts * 0.42, color, 0)
        .setStrokeStyle(2, color, 0.55);
    }

    container.add([glow, shadow, sprite, ...dots, ...(ring ? [ring] : [])]);
    this.container.add(container);

    const visual: PieceVisual = {
      container,
      shadow,
      glow,
      sprite,
      ring,
      dots,
      kind: tile.kind as "pathogen" | "medicine",
      subtype: this.entitySubtype(tile) ?? "unknown",
      phase: (x * 0.41 + y * 0.77) % (Math.PI * 2),
      baseScale,
    };

    this.pieces.set(index, visual);
    this.updatePiece(index, visual, tile);

    if (!immediate) {
      container.setAlpha(0);
      container.setScale(0.58);
      container.y += this.ts * 0.14;
      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        y: cy,
        duration: 180,
        ease: "Back.Out",
      });
    }

    this.bringHitZonesToTop();
  }

  private updatePiece(index: number, visual: PieceVisual, tile: Tile): void {
    const { y } = this.gridCoords(index);
    const color = this.pieceColor(tile);
    visual.container.setDepth(20 + y);
    visual.glow.setFillStyle(color, tile.kind === "medicine" ? 0.16 : 0.11);
    if (visual.ring) {
      const remaining = Math.max(0, MEDICINE_LIFESPAN - tile.age);
      visual.ring.setStrokeStyle(2, color, Math.max(0.16, remaining / MEDICINE_LIFESPAN) * 0.75);
    }
    const dotCount = tile.kind === "pathogen" ? Math.min(tile.age, 4) : 0;
    visual.dots.forEach((dot, idx) => dot.setVisible(idx < dotCount));
  }

  private destroyPiece(index: number, immediate: boolean): void {
    const visual = this.pieces.get(index);
    if (!visual) return;
    this.pieces.delete(index);

    if (immediate) {
      visual.container.destroy(true);
      return;
    }

    this.scene.tweens.add({
      targets: visual.container,
      alpha: 0,
      scaleX: 0.6,
      scaleY: 0.6,
      y: visual.container.y - this.ts * 0.12,
      duration: 160,
      ease: "Quad.Out",
      onComplete: () => visual.container.destroy(true),
    });
  }

  private handleUpdate(time: number): void {
    for (const visual of this.pieces.values()) {
      const pulse = Math.sin(time * 0.003 + visual.phase);
      visual.sprite.y = -this.ts * 0.02 - pulse * (this.ts * 0.028);
      visual.sprite.setScale(visual.baseScale * (1 + pulse * 0.018));
      visual.glow.setAlpha((visual.kind === "medicine" ? 0.13 : 0.09) + (pulse + 1) * 0.02);
      visual.shadow.setAlpha(0.28 - pulse * 0.04);
      if (visual.ring) {
        visual.ring.y = this.ts * 0.02 - pulse * (this.ts * 0.01);
      }
    }
  }

  private addTileSprite(
    px: number,
    py: number,
    textureKey: string,
    scaleMultiplier = 1,
    offsetY = 0,
  ): Phaser.GameObjects.Image {
    const img = this.scene.add.image(px + this.ts / 2, py + this.ts / 2 + offsetY, textureKey);
    const scale = Math.max(this.ts / img.frame.width, this.ts / img.frame.height) * scaleMultiplier;
    img.setScale(scale);
    this.container.add(img);
    return img;
  }

  private hasTexture(key: string): boolean {
    return this.scene.textures.exists(key) && key !== "__MISSING";
  }

  private gridCoords(index: number): { x: number; y: number } {
    return { x: index % this.cols, y: Math.floor(index / this.cols) };
  }

  private entityKey(tile: Tile | undefined): string | null {
    if (!tile) return null;
    if (tile.kind === "pathogen" && tile.pathogenType) return `p:${tile.pathogenType}`;
    if (tile.kind === "medicine" && tile.medicineType) return `m:${tile.medicineType}`;
    return null;
  }

  private entitySubtype(tile: Tile): string | null {
    if (tile.kind === "pathogen") return tile.pathogenType;
    if (tile.kind === "medicine") return tile.medicineType;
    return null;
  }

  private textureKey(tile: Tile): string {
    if (tile.kind === "pathogen" && tile.pathogenType) return PATHOGEN_TEXTURES[tile.pathogenType];
    if (tile.kind === "medicine" && tile.medicineType) return MEDICINE_TEXTURES[tile.medicineType];
    return "pixel";
  }

  private pieceColor(tile: Tile): number {
    if (tile.kind === "pathogen" && tile.pathogenType) return PATHOGEN_COLORS[tile.pathogenType as PathogenType];
    if (tile.kind === "medicine" && tile.medicineType) return MEDICINE_COLORS[tile.medicineType as MedicineType];
    return UI.accentCyan;
  }

  private pieceScaleMultiplier(tile: Tile): number {
    if (tile.kind === "pathogen" && tile.pathogenType === "coccus") {
      return 1.06;
    }
    if (tile.kind === "pathogen" && tile.pathogenType === "bacillus") {
      return 1.16;
    }
    if (tile.kind === "medicine" && tile.medicineType === "penicillin") {
      return 1.18;
    }
    if (tile.kind === "medicine" && tile.medicineType === "tetracycline") {
      return 1.18;
    }
    return 1;
  }

  private worldAccent(): number {
    const accents: Record<number, number> = {
      1: 0x79ffc9,
      2: 0xff6b7d,
      3: 0xb78aff,
      4: 0xff8d45,
    };
    return accents[this.world] ?? UI.accentCyan;
  }

  private bringHitZonesToTop(): void {
    for (const zone of this.hitZones) {
      this.container.bringToTop(zone);
    }
  }

  private boardWidth(): number {
    return this.cols * this.ts + (this.cols - 1) * this.tg;
  }

  private boardHeight(): number {
    return this.rows * this.ts + (this.rows - 1) * this.tg;
  }

  private ensureBoardPaneTexture(): string {
    const key = `board_pane_w${this.world}_${this.cols}x${this.rows}_${this.ts}_${this.tg}`;
    if (this.scene.textures.exists(key)) {
      return key;
    }

    const width = Math.max(8, Math.round(this.boardWidth()));
    const height = Math.max(8, Math.round(this.boardHeight()));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create board pane texture");
    }

    const accent = Phaser.Display.Color.IntegerToColor(this.worldAccent());
    const outline = `rgba(${accent.red}, ${accent.green}, ${accent.blue}, 0.16)`;
    const line = `rgba(${accent.red}, ${accent.green}, ${accent.blue}, 0.10)`;
    const lineStrong = `rgba(${accent.red}, ${accent.green}, ${accent.blue}, 0.16)`;
    const radius = Math.max(14, Math.round(this.ts * 0.22));

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    };

    ctx.clearRect(0, 0, width, height);

    roundRect(0, 0, width, height, radius);
    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, "rgba(210,255,248,0.14)");
    fill.addColorStop(0.18, "rgba(105,190,200,0.08)");
    fill.addColorStop(0.58, "rgba(18,38,48,0.10)");
    fill.addColorStop(1, "rgba(8,18,26,0.18)");
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.save();
    roundRect(0, 0, width, height, radius);
    ctx.clip();

    const glow = ctx.createRadialGradient(width * 0.18, height * 0.14, width * 0.02, width * 0.18, height * 0.14, width * 0.54);
    glow.addColorStop(0, "rgba(220,255,255,0.22)");
    glow.addColorStop(0.25, "rgba(130,255,240,0.10)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    const step = this.ts + this.tg;
    for (let c = 1; c < this.cols; c += 1) {
      const x = Math.round(c * step) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let r = 1; r < this.rows; r += 1) {
      const y = Math.round(r * step) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    roundRect(1, 1, width - 2, height - 2, Math.max(10, radius - 1));
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    roundRect(3, 3, width - 6, height - 6, Math.max(8, radius - 3));
    ctx.stroke();

    ctx.strokeStyle = lineStrong;
    ctx.lineWidth = 1;
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        const px = Math.round(x * step) + 0.5;
        const py = Math.round(y * step) + 0.5;
        ctx.strokeRect(px, py, this.ts, this.ts);
      }
    }

    ctx.restore();

    this.scene.textures.addCanvas(key, canvas);
    return key;
  }

  highlightTile(x: number, y: number, color: number = UI.selectedOutline): void {
    const px = tileX(x, this.offsetX, this.ts, this.tg);
    const py = tileY(y, this.offsetY, this.ts, this.tg);
    this.overlayGraphics.lineStyle(2, color, 1);
    this.overlayGraphics.strokeRoundedRect(px - 1, py - 1, this.ts + 2, this.ts + 2, Math.max(4, this.tr));
  }

  showPlacementHint(x: number, y: number, valid: boolean): void {
    const px = tileX(x, this.offsetX, this.ts, this.tg);
    const py = tileY(y, this.offsetY, this.ts, this.tg);
    this.overlayGraphics.fillStyle(valid ? UI.successGreen : UI.dangerRed, 0.22);
    this.overlayGraphics.fillRoundedRect(px + 2, py + 2, this.ts - 4, this.ts - 4, Math.max(4, this.tr - 2));
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.handleUpdate, this);
    this.hitZones.forEach((zone) => zone.destroy());
    for (const sprite of this.bgSprites) sprite.destroy();
    for (const visual of this.pieces.values()) {
      visual.container.destroy(true);
    }
    this.bgSprites.length = 0;
    this.pieces.clear();
    this.container.destroy(true);
  }
}
