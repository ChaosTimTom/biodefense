// ═══════════════════════════════════════════════════
// src/game/scenes/LevelScene.ts — Main gameplay scene
// Bio Defence v3: Game of Life inspired cellular war
// Wires Grid, ToolPalette, TurnControls, StatusBar,
// PreviewOverlay, StarDisplay + simplified sim engine
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { GameState, LevelSpec, ToolId, Action } from "../../sim/types";
import { createGameState, getTile, infectionPct, cloneState } from "../../sim/board";
import { applyAction, advanceTurn, runGeneration, phaseEvaluate } from "../../sim/step";
import { canPlaceTool, getPlacementFailReason } from "../../sim/tools";
import { computeStars, computeScore } from "../../sim/metrics";
import { MEDICINE_LIFESPAN, GENS_PER_TURN, ANIM } from "../../sim/constants";
import {
  createHistory,
  pushHistory,
  popHistory,
  canUndo,
  clearHistory,
  type History,
} from "../../sim/history";
import {
  computeLayout,
  UI,
  tileX,
  tileY,
  TILE_SIZE,
  TILE_GAP,
  PATHOGEN_NAMES,
  MEDICINE_NAMES,
  TOOL_NAMES,
} from "../config";
import type { LayoutZones } from "../config";
import { Grid } from "../ui/Grid";
import { ToolPalette } from "../ui/ToolPalette";
import { TurnControls } from "../ui/TurnControls";
import { StatusBar } from "../ui/StatusBar";
import { PreviewOverlay } from "../ui/PreviewOverlay";
import { StarDisplay } from "../ui/StarDisplay";
import { RulesOverlay } from "../ui/RulesOverlay";
import { tweenWinBurst, tweenLoseShake } from "../animation/tweens";
import { addBackground, fadeIn } from "../ui/UIFactory";

export class LevelScene extends Phaser.Scene {
  // State
  private gameState!: GameState;
  private history!: History;
  private levelSpec!: LevelSpec;
  private initialState!: GameState;
  private selectedTool: ToolId | null = null;

  // UI components
  private grid!: Grid;
  private toolPalette!: ToolPalette;
  private turnControls!: TurnControls;
  private statusBar!: StatusBar;
  private previewOverlay!: PreviewOverlay;
  private starDisplay!: StarDisplay;
  private rulesOverlay!: RulesOverlay;

  // Header
  private titleText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private rulesBtn!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  // Flags
  private animating = false;
  private floatingHint?: Phaser.GameObjects.Text;
  private tooltipText?: Phaser.GameObjects.Text;
  private genBadge?: Phaser.GameObjects.Text;
  private layout!: LayoutZones;

  constructor() {
    super({ key: "Level" });
  }

  init(data?: { levelSpec?: LevelSpec }): void {
    if (!data?.levelSpec) {
      this.scene.start("Menu");
      return;
    }
    this.levelSpec = data.levelSpec;
    this.animating = false;
    this.selectedTool = null;
  }

  create(): void {
    const { width: w, height: h } = this.cameras.main;
    const spec = this.levelSpec;
    const layout = computeLayout(w, h, spec.grid.w, spec.grid.h);
    this.layout = layout;

    // Init game state
    this.gameState = createGameState(spec);
    this.initialState = cloneState(this.gameState);
    this.history = createHistory();

    // ── Background ──
    addBackground(this, "dark");
    fadeIn(this, 250);

    // ── Header ──
    this.backBtn = this.add
      .text(12, 10, "←", {
        fontSize: "18px",
        color: "#aaaacc",
        fontFamily: "'Orbitron', sans-serif",
      });

    this.add.rectangle(24, 22, 48, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001)
      .on("pointerdown", () => this.scene.start("Menu"));

    this.titleText = this.add
      .text(w / 2, 10, spec.title || `Level ${spec.id}`, {
        fontSize: "15px",
        color: "#ffffff",
        fontFamily: "'Orbitron', sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    // ── Star Display ──
    this.starDisplay = new StarDisplay(this, w - 80, 10);

    // ── Rules "?" Button ──
    this.rulesBtn = this.add
      .text(w - 14, 10, "?", {
        fontSize: "14px",
        color: "#00e5ff",
        fontFamily: "'Orbitron', sans-serif",
        fontStyle: "bold",
        backgroundColor: "#16162b",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(1, 0);

    this.add.rectangle(w - 22, 22, 48, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001)
      .on("pointerdown", () => this.rulesOverlay.toggle());

    // ── Level Hint ──
    const hintMsg = spec.hint || "";
    this.hintText = this.add
      .text(w / 2, 30, hintMsg, {
        fontSize: "10px",
        color: "#88aadd",
        fontFamily: "'Orbitron', sans-serif",
        wordWrap: { width: w - 80 },
      })
      .setOrigin(0.5, 0);

    // ── Grid ──
    this.grid = new Grid(
      this,
      spec.grid.w,
      spec.grid.h,
      layout.gridOffsetX,
      layout.gridOffsetY,
      {
        onTileClick: (x, y) => this.handleTileClick(x, y),
        onTileHover: (x, y) => this.handleTileHover(x, y),
        onTileOut: () => this.handleTileOut(),
      },
      layout.tileSize,
      layout.tileGap,
      layout.tileRadius,
    );

    // ── Status Bar ──
    this.statusBar = new StatusBar(this, 16, layout.statusBarY, w - 32);
    this.updateStatusBar();

    // ── Tool Palette ──
    this.toolPalette = new ToolPalette(this, w / 2, layout.toolPaletteY, {
      onSelectTool: (tool) => {
        this.selectedTool = tool;
        this.refreshPreview();
      },
    });
    this.toolPalette.build(this.gameState.tools);

    // ── Turn Controls ──
    this.turnControls = new TurnControls(this, w / 2, layout.controlsY, {
      onStep: () => this.doStep(),
      onUndo: () => this.doUndo(),
      onReset: () => this.doReset(),
    });
    this.turnControls.setUndoEnabled(false);

    // ── Preview Overlay ──
    this.previewOverlay = new PreviewOverlay(
      this,
      layout.gridOffsetX,
      layout.gridOffsetY,
      layout.tileSize,
      layout.tileGap,
    );

    // ── Keyboard shortcuts ──
    this.input.keyboard?.on("keydown-SPACE", () => this.doStep());
    this.input.keyboard?.on("keydown-Z", () => this.doUndo());
    this.input.keyboard?.on("keydown-R", () => this.doReset());
    this.input.keyboard?.on("keydown-P", () => this.previewOverlay.toggleVisible());
    this.input.keyboard?.on("keydown-ESC", () => {
      this.toolPalette.selectTool(null);
      this.selectedTool = null;
    });

    // Initial render
    this.renderAll();

    // ── Rules Overlay (must be last for z-order) ──
    this.rulesOverlay = new RulesOverlay(this);
    if (RulesOverlay.shouldAutoShow()) {
      this.rulesOverlay.show();
    }
    this.input.keyboard?.on("keydown-H", () => this.rulesOverlay.toggle());
  }

  // ── State Mutation & Actions ───────────────────

  private handleTileClick(x: number, y: number): void {
    if (this.animating || this.gameState.isOver) return;
    if (!this.selectedTool) return;

    if (this.gameState.toolsUsedThisTurn >= this.gameState.toolsPerTurn) {
      this.showFloatingHint(x, y, "Click Step first!");
      return;
    }

    const failReason = getPlacementFailReason(this.gameState, this.selectedTool, x, y);
    if (failReason) {
      this.showFloatingHint(x, y, failReason);
      return;
    }

    pushHistory(this.history, this.gameState);

    const action: Action = { type: "place_tool", tool: this.selectedTool, x, y };
    applyAction(this.gameState, action);

    this.toolPalette.updateCounts(this.gameState.tools);
    this.turnControls.setUndoEnabled(canUndo(this.history));
    this.renderAll();
    this.checkGameEnd();
  }

  private handleTileHover(x: number, y: number): void {
    if (this.animating || this.gameState.isOver) return;

    const tile = getTile(this.gameState.board, x, y);
    let info = "";

    switch (tile.kind) {
      case "pathogen":
        if (tile.pathogenType) {
          const name = PATHOGEN_NAMES[tile.pathogenType];
          info = `${name} (age ${tile.age})`;
        }
        break;
      case "medicine":
        if (tile.medicineType) {
          const name = MEDICINE_NAMES[tile.medicineType];
          const remaining = MEDICINE_LIFESPAN - tile.age;
          info = `${name} (${remaining} turns left)`;
        }
        break;
      case "wall":
        info = "Wall / Quarantine";
        break;
      case "empty":
        info = "Empty";
        break;
    }

    if (info) {
      this.showTooltip(info);
    } else {
      this.hideTooltip();
    }

    if (this.selectedTool) {
      const valid = canPlaceTool(this.gameState, this.selectedTool, x, y);
      this.grid.render(this.gameState.board);
      this.grid.showPlacementHint(x, y, valid);
    }
  }

  private handleTileOut(): void {
    if (this.animating) return;
    this.hideTooltip();
    this.grid.render(this.gameState.board);
    this.refreshPreview();
  }

  private doStep(): void {
    if (this.animating || this.gameState.isOver) return;

    pushHistory(this.history, this.gameState);

    // Animate each generation individually so the player
    // can watch the germs grow, fight, and convert.
    this.animating = true;
    this.turnControls.setEnabled(false);

    this.gameState.turn++;
    this.gameState.toolsUsedThisTurn = 0;

    // Per-turn tool grant (v5.0 drip-feed)
    if (this.levelSpec.toolGrant) {
      const g = this.levelSpec.toolGrant;
      this.gameState.tools.antibiotic += g.antibiotic;
      this.gameState.tools.antiviral += g.antiviral;
      this.gameState.tools.antifungal += g.antifungal;
      this.gameState.tools.wall += g.wall;
    }

    this.animateGenerations(0);
  }

  /**
   * Recursively animate one generation at a time.
   * Shows "Gen 1/3", "Gen 2/3", "Gen 3/3" badge, re-renders
   * the grid after each, then evaluates win/lose at the end.
   */
  private animateGenerations(genIndex: number): void {
    const total = GENS_PER_TURN;

    if (genIndex >= total) {
      // All generations done — evaluate and finish
      this.genBadge?.destroy();
      this.genBadge = undefined;

      phaseEvaluate(this.gameState);

      this.animating = false;
      this.turnControls.setEnabled(true);
      this.toolPalette.updateCounts(this.gameState.tools);
      this.turnControls.setUndoEnabled(canUndo(this.history));
      this.renderAll();
      this.checkGameEnd();
      return;
    }

    // Show generation badge
    this.showGenBadge(genIndex + 1, total);

    // Run one generation of the simulation
    runGeneration(this.gameState.board);

    // Re-render the grid to show changes
    this.grid.render(this.gameState.board);
    this.updateStatusBar();

    // Flash the grid briefly to highlight the change
    this.flashGrid();

    // Wait, then proceed to next generation
    this.time.delayedCall(ANIM.genTick, () => {
      this.animateGenerations(genIndex + 1);
    });
  }

  /** Show a pulsing "Gen X / N" badge in the center-top area */
  private showGenBadge(current: number, total: number): void {
    const { width: w } = this.cameras.main;

    if (!this.genBadge) {
      this.genBadge = this.add
        .text(w / 2, 60, "", {
          fontSize: "13px",
          color: "#ffcc44",
          fontFamily: "'Orbitron', sans-serif",
          fontStyle: "bold",
          backgroundColor: "#1a1a2ecc",
          padding: { x: 10, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(150);
    }

    this.genBadge.setText(`⚡ Gen ${current} / ${total}`);

    // Pulse effect
    this.tweens.add({
      targets: this.genBadge,
      scaleX: { from: 1.15, to: 1 },
      scaleY: { from: 1.15, to: 1 },
      duration: 180,
      ease: "Quad.easeOut",
    });
  }

  /** Brief white flash over the grid to visually mark a generation tick */
  private flashGrid(): void {
    const { tileSize, tileGap, gridOffsetX, gridOffsetY } = this.layout;
    const spec = this.levelSpec;
    const gw = spec.grid.w * (tileSize + tileGap) - tileGap;
    const gh = spec.grid.h * (tileSize + tileGap) - tileGap;

    const flash = this.add.graphics();
    flash.fillStyle(0xffffff, 0.12);
    flash.fillRoundedRect(gridOffsetX - 2, gridOffsetY - 2, gw + 4, gh + 4, 6);
    flash.setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 250,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private doUndo(): void {
    if (this.animating) return;
    const prev = popHistory(this.history);
    if (!prev) return;

    this.gameState = prev;
    this.toolPalette.updateCounts(this.gameState.tools);
    this.turnControls.setUndoEnabled(canUndo(this.history));
    this.renderAll();
  }

  private doReset(): void {
    if (this.animating) return;
    clearHistory(this.history);
    this.gameState = cloneState(this.initialState);

    this.toolPalette.updateCounts(this.gameState.tools);
    this.toolPalette.selectTool(null);
    this.selectedTool = null;
    this.turnControls.setUndoEnabled(false);
    this.starDisplay.setStars(0);
    this.renderAll();
  }

  // ── Rendering ──────────────────────────────────

  private renderAll(): void {
    this.grid.render(this.gameState.board);
    this.updateStatusBar();
    this.updateActionsIndicator();
    this.refreshPreview();
  }

  private updateActionsIndicator(): void {
    const used = this.gameState.toolsUsedThisTurn;
    const max = this.gameState.toolsPerTurn;
    const remaining = max - used;
    this.statusBar.setActions(remaining, max);
  }

  private updateStatusBar(): void {
    const pct = infectionPct(this.gameState.board);
    let maxTurns: number | undefined;
    const obj = this.gameState.objective;
    if (obj.type === "survive") {
      maxTurns = obj.maxTurns;
    } else if (obj.type === "contain") {
      maxTurns = obj.maxTurns;
    }
    if (this.gameState.turnLimit > 0) {
      maxTurns = this.gameState.turnLimit;
    }
    this.statusBar.update(this.gameState.turn, pct, maxTurns);
    this.statusBar.setObjectiveHint(this.getObjectiveHint());
  }

  private refreshPreview(): void {
    if (this.gameState.isOver) {
      this.previewOverlay.clear();
      return;
    }
    this.previewOverlay.showPreview(this.gameState);
  }

  private getObjectiveHint(): string {
    const obj = this.gameState.objective;
    switch (obj.type) {
      case "clear_all":
        return "Eliminate all pathogens";
      case "survive":
        return `Survive ${obj.maxTurns} turns`;
      case "contain":
        return `Keep infection below ${obj.maxPct}% for ${obj.maxTurns} turns`;
      default:
        return "";
    }
  }

  // ── Floating Feedback & Tooltip ─────────────────

  private showFloatingHint(gx: number, gy: number, msg: string): void {
    this.floatingHint?.destroy();

    const { tileSize, tileGap, gridOffsetX, gridOffsetY } = this.layout;
    const px = tileX(gx, gridOffsetX, tileSize, tileGap) + tileSize / 2;
    const py = tileY(gy, gridOffsetY, tileSize, tileGap) - 8;

    this.floatingHint = this.add
      .text(px, py, msg, {
        fontSize: "11px",
        color: "#ff8888",
        fontFamily: "'Orbitron', sans-serif",
        backgroundColor: "#1a1a2ecc",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(200);

    this.tweens.add({
      targets: this.floatingHint,
      y: py - 20,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.floatingHint?.destroy();
        this.floatingHint = undefined;
      },
    });
  }

  private showTooltip(msg: string): void {
    if (!this.scene.isActive()) return;
    if (!this.tooltipText || !this.tooltipText.scene) {
      this.tooltipText = this.add
        .text(0, 0, "", {
          fontSize: "11px",
          color: "#ffffff",
          fontFamily: "'Orbitron', sans-serif",
          backgroundColor: "#22224488",
          padding: { x: 6, y: 4 },
        })
        .setDepth(300)
        .setAlpha(0);
    }
    this.tooltipText.setText(msg);
    this.tooltipText.setAlpha(1);
    const ptr = this.input.activePointer;
    this.tooltipText.setPosition(ptr.x + 14, ptr.y - 24);
  }

  private hideTooltip(): void {
    this.tooltipText?.setAlpha(0);
  }

  // ── Win/Lose Check ─────────────────────────────

  private checkGameEnd(): void {
    if (this.gameState.isOver) {
      this.animating = true;
      this.turnControls.setEnabled(false);

      const { width: w, height: h } = this.cameras.main;

      if (this.gameState.result === "win") {
        const stars = computeStars(this.gameState);
        const score = computeScore(this.gameState);
        this.gameState = { ...this.gameState, stars };

        tweenWinBurst(this, w / 2, h / 2, () => {
          this.starDisplay.animateStars(stars);
          this.time.delayedCall(1800, () => {
            this.scene.start("Win", {
              levelSpec: this.levelSpec,
              stars,
              turns: this.gameState.turn,
              score,
            });
          });
        });
      } else {
        tweenLoseShake(this, this.cameras.main, () => {
          this.showGameOverOverlay();
        });
      }
    }
  }

  private showGameOverOverlay(): void {
    const { width: w, height: h } = this.cameras.main;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, w, h);

    this.add
      .text(w / 2, h / 2 - 40, "💀 Infection Won", {
        fontSize: "28px",
        color: "#ff4444",
        fontFamily: "'Orbitron', sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const retryBtn = this.add
      .text(w / 2, h / 2 + 30, "[ Retry ]", {
        fontSize: "18px",
        color: "#00e5ff",
        fontFamily: "'Orbitron', sans-serif",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const retryZone = this.add.rectangle(w / 2, h / 2 + 30, 160, 48)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);
    retryZone.on("pointerdown", () => {
      this.scene.restart({ levelSpec: this.levelSpec });
    });

    const menuBtn = this.add
      .text(w / 2, h / 2 + 70, "[ Menu ]", {
        fontSize: "14px",
        color: "#aaaacc",
        fontFamily: "'Orbitron', sans-serif",
      })
      .setOrigin(0.5);

    const menuZone = this.add.rectangle(w / 2, h / 2 + 70, 140, 48)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001);
    menuZone.on("pointerdown", () => {
      this.scene.start("Menu");
    });
  }

  // ── Cleanup ────────────────────────────────────

  shutdown(): void {
    this.tooltipText = undefined;
    this.grid?.destroy();
    this.toolPalette?.destroy();
    this.turnControls?.destroy();
    this.statusBar?.destroy();
    this.previewOverlay?.destroy();
    this.starDisplay?.destroy();
    this.rulesOverlay?.destroy();
    this.genBadge?.destroy();
  }
}
