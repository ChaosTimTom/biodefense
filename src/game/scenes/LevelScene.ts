// ═══════════════════════════════════════════════════
// src/game/scenes/LevelScene.ts — Main gameplay scene
// Bio Defence v3: Game of Life inspired cellular war
// Wires Grid, ToolPalette, TurnControls, StatusBar,
// PreviewOverlay, StarDisplay + simplified sim engine
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { GameState, LevelSpec, ToolId, Action, BossNode, BossPhaseSpec } from "../../sim/types";
import { createGameState, getTile, infectionPct, cloneState, emptyTile, pathogenTile, setTile } from "../../sim/board";
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
  gridPixelWidth,
  gridPixelHeight,
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
import { SettingsOverlay } from "../ui/SettingsOverlay";
import { OnboardingOverlay } from "../ui/OnboardingOverlay";
import { tweenWinBurst, tweenLoseShake } from "../animation/tweens";
import { playCue, triggerHaptic } from "../feedback";
import { refreshSceneMusic, syncSceneMusic } from "../music";
import { advanceEndlessRun, generateEndlessLevel, type EndlessRunState } from "../../sim/endless";
import { APP_THEME, getWorldTheme } from "../theme";
import { addButton, addWorldBackground, fadeIn, genPanelTex, getBossSplashKey } from "../ui/UIFactory";
import { devTracker, DEV_MODE } from "../devTracker";
import { loadSave, updateEndlessResult, updatePreferences } from "../save";

export class LevelScene extends Phaser.Scene {
  // State
  private gameState!: GameState;
  private history!: History;
  private levelSpec!: LevelSpec;
  private initialState!: GameState;
  private selectedTool: ToolId | null = null;

  // Switch mode
  private switchMode = false;
  private switchFrom: { x: number; y: number } | null = null;
  private pendingPlacement: { tool: ToolId; x: number; y: number } | null = null;

  // UI components
  private grid!: Grid;
  private toolPalette!: ToolPalette;
  private turnControls!: TurnControls;
  private statusBar!: StatusBar;
  private previewOverlay!: PreviewOverlay;
  private starDisplay!: StarDisplay;
  private rulesOverlay!: RulesOverlay;
  private settingsOverlay!: SettingsOverlay;
  private onboardingOverlay?: OnboardingOverlay;

  // Header
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private homeBtn!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private rulesBtn!: Phaser.GameObjects.Text;
  private settingsBtn!: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;

  // Flags
  private animating = false;
  private floatingHint?: Phaser.GameObjects.Text;
  private tooltipText?: Phaser.GameObjects.Text;
  private genBadge?: Phaser.GameObjects.Text;
  private bossRelayGraphics?: Phaser.GameObjects.Graphics;
  private layout!: LayoutZones;
  private endlessRun: EndlessRunState | null = null;

  constructor() {
    super({ key: "Level" });
  }

  init(data?: { levelSpec?: LevelSpec; endlessRun?: EndlessRunState }): void {
    this.endlessRun = data?.endlessRun ?? null;
    if (!data?.levelSpec) {
      this.scene.start("Menu");
      return;
    }
    this.levelSpec = data.levelSpec;
    this.animating = false;
    this.selectedTool = null;
    this.pendingPlacement = null;
    this.switchMode = false;
    this.switchFrom = null;
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

    // Dev tracking
    devTracker.startSession(spec);

    const worldTheme = getWorldTheme(spec.world ?? 1);
    const headerShellH = layout.headerH - layout.profile.safeTop;
    const headerCenterY = layout.profile.safeTop + headerShellH / 2;
    const headerTitleY = layout.profile.safeTop + (layout.profile.compact ? 8 : 10);
    const headerSubtitleY = headerTitleY + (layout.profile.compact ? 18 : 20);
    const headerHintY = headerSubtitleY + (layout.profile.compact ? 16 : 18);
    const showHintText = layout.showHintText || Boolean(spec.boss);
    const headerTitleSize = layout.profile.compact ? "16px" : "18px";
    const headerSubtitleSize = layout.profile.compact ? "10px" : "11px";
    const headerHintSize = layout.profile.compact ? "9px" : "10px";
    const leftIconY = layout.profile.safeTop + 4;
    const homeX = 56;
    const muteX = w - 84;

    // ── Background ──
    addWorldBackground(this, spec.world ?? 1);
    syncSceneMusic(this);
    fadeIn(this, 250);

    // ── Header ──
    genPanelTex(
      this,
      "level_header_shell",
      w - 16,
      headerShellH,
      layout.profile.compact ? 20 : 22,
      "rgba(8,18,31,0.84)",
      "rgba(255,255,255,0.08)",
    );
    this.add.image(w / 2, headerCenterY, "level_header_shell").setDepth(2);

    this.backBtn = this.add
      .text(12, layout.profile.safeTop + 4, "←", {
        fontSize: "18px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: APP_THEME.fonts.body,
        fontStyle: "bold",
      })
      .setDepth(3);

    this.add.rectangle(24, headerCenterY, 48, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001)
      .on("pointerdown", () => {
        playCue("ui_tap");
        devTracker.endSession("abandon", this.gameState, 0, 0);
        this.scene.start("Menu");
      })
      .on("pointerover", () => this.backBtn.setColor(worldTheme.accent))
      .on("pointerout", () => this.backBtn.setColor(APP_THEME.colors.textSecondary));

    this.homeBtn = this.add
      .text(homeX, leftIconY, "⌂", {
        fontSize: "18px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: APP_THEME.fonts.body,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.add.rectangle(homeX, headerCenterY, 44, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001)
      .on("pointerdown", () => this.goHome())
      .on("pointerover", () => this.homeBtn.setColor(worldTheme.accent))
      .on("pointerout", () => this.homeBtn.setColor(APP_THEME.colors.textSecondary));

    this.titleText = this.add
      .text(w / 2, headerTitleY, spec.title || `Level ${spec.id}`, {
        fontSize: headerTitleSize,
        color: APP_THEME.colors.textPrimary,
        fontFamily: APP_THEME.fonts.display,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.subtitleText = this.add
      .text(w / 2, headerSubtitleY, `${worldTheme.titleGlyph} ${worldTheme.name}  •  Level ${spec.id}`, {
        fontSize: headerSubtitleSize,
        color: worldTheme.accent,
        fontFamily: APP_THEME.fonts.body,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    if (this.endlessRun) {
      this.titleText.setText(`Endless Round ${this.endlessRun.round}`);
      this.subtitleText.setText(`${worldTheme.titleGlyph} ${worldTheme.name}  •  Run ${this.endlessRun.totalScore.toLocaleString()} score`);
    }

    // ── Star Display ──
    this.starDisplay = new StarDisplay(this, w - 164, headerTitleY + 4);

    // ── Rules "?" Button ──
    this.rulesBtn = this.add
      .text(w - 20, layout.profile.safeTop + 4, "?", {
        fontSize: "13px",
        color: worldTheme.accent,
        fontFamily: APP_THEME.fonts.body,
        fontStyle: "bold",
        backgroundColor: "#102131",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(1, 0);
    this.rulesBtn.setDepth(3);

    this.add.rectangle(w - 24, headerCenterY, 44, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001)
      .on("pointerdown", () => this.rulesOverlay.toggle());

    this.settingsBtn = this.add
      .text(w - 52, layout.profile.safeTop + 4, "⚙", {
        fontSize: "15px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: APP_THEME.fonts.body,
      })
      .setOrigin(1, 0)
      .setDepth(3);

    this.add.rectangle(w - 56, headerCenterY, 44, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001)
      .on("pointerdown", () => this.settingsOverlay.toggle())
      .on("pointerover", () => this.settingsBtn.setColor(worldTheme.accent))
      .on("pointerout", () => this.settingsBtn.setColor(APP_THEME.colors.textSecondary));

    this.muteBtn = this.add
      .text(muteX, leftIconY, "", {
        fontSize: "15px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: APP_THEME.fonts.body,
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(3);

    this.add.rectangle(muteX - 4, headerCenterY, 44, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001)
      .on("pointerdown", () => this.toggleMute())
      .on("pointerover", () => this.muteBtn.setColor(worldTheme.accent))
      .on("pointerout", () => this.updateMuteBtnVisual());

    // ── Level Hint ──
    const hintMsg = spec.hint || "";
    if (showHintText) {
      this.hintText = this.add
      .text(w / 2, headerHintY, hintMsg, {
        fontSize: headerHintSize,
        color: APP_THEME.colors.textMuted,
        fontFamily: APP_THEME.fonts.body,
        wordWrap: { width: w - 60 },
        lineSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setDepth(3);
    }

    const boardWidth = layout.boardWidth;
    const boardHeight = layout.boardHeight;
    const boardShellKey = `level_board_shell_${boardWidth}x${boardHeight}`;
    genPanelTex(
      this,
      boardShellKey,
      boardWidth + 14,
      boardHeight + 14,
      Math.max(18, layout.tileSize * 0.26),
      "rgba(6,14,24,0.44)",
      "rgba(255,255,255,0.05)",
    );
    this.add
      .image(w / 2, layout.gridOffsetY + boardHeight / 2, boardShellKey)
      .setDepth(1.5)
      .setAlpha(0.92);

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
      spec.world ?? 1,
    );

    // ── Status Bar ──
    this.statusBar = new StatusBar(this, 16, layout.statusBarY, w - 32, {
      compact: layout.profile.compact,
    });
    this.updateStatusBar();

    // ── Tool Palette ──
    this.toolPalette = new ToolPalette(this, w / 2, layout.toolPaletteY, {
      onSelectTool: (tool) => {
        if (this.switchMode && tool !== null) this.exitSwitchMode();
        this.selectedTool = tool;
        this.pendingPlacement = null;
        this.refreshPreview();
      },
    }, {
      compact: layout.profile.compact,
    });
    this.toolPalette.build(this.gameState.tools);

    // ── Turn Controls ──
    this.turnControls = new TurnControls(this, w / 2, layout.controlsY, {
      onStep: () => this.doStep(),
      onUndo: () => this.doUndo(),
      onReset: () => this.doReset(),
      onSwitch: () => this.toggleSwitchMode(),
    }, {
      compact: layout.profile.compact,
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
      if (this.switchMode) {
        this.exitSwitchMode();
      } else {
        this.toolPalette.selectTool(null);
        this.selectedTool = null;
        this.pendingPlacement = null;
        this.refreshPreview();
      }
    });
    this.input.keyboard?.on("keydown-S", () => this.toggleSwitchMode());

    // Initial render
    this.renderAll();

    // ── Rules Overlay (must be last for z-order) ──
    this.rulesOverlay = new RulesOverlay(this);
    this.settingsOverlay = new SettingsOverlay(this);
    this.onboardingOverlay = new OnboardingOverlay(this, spec.id);
    if (this.onboardingOverlay.shouldShow()) {
      this.time.delayedCall(180, () => this.onboardingOverlay?.show());
    } else if (RulesOverlay.shouldAutoShow()) {
      this.rulesOverlay.show();
    }
    this.input.keyboard?.on("keydown-H", () => this.rulesOverlay.toggle());

    if (this.levelSpec.boss) {
      this.time.delayedCall(240, () => this.showBossIntro());
    }

    // ── Dev mode indicator ──
    if (DEV_MODE) {
      this.add
        .text(w - 4, h - 4, "DEV", {
          fontSize: "8px",
          color: "#ff4444",
          fontFamily: "'Orbitron', sans-serif",
          fontStyle: "bold",
          backgroundColor: "#00000066",
          padding: { x: 3, y: 1 },
        })
        .setOrigin(1, 1)
        .setDepth(999)
        .setAlpha(0.6);

      // Ctrl+E = export dev logs
      this.input.keyboard?.on("keydown-E", (e: KeyboardEvent) => {
        if (e.ctrlKey) devTracker.exportJSON();
      });
    }
  }

  // ── State Mutation & Actions ───────────────────

  private toggleSwitchMode(): void {
    if (this.animating || this.gameState.isOver) return;
    if (this.switchMode) {
      this.exitSwitchMode();
    } else {
      this.enterSwitchMode();
    }
  }

  private enterSwitchMode(): void {
    if (this.gameState.switchesUsedThisTurn >= this.gameState.switchesPerTurn) {
      return; // no switches left
    }
    this.switchMode = true;
    this.switchFrom = null;
    this.pendingPlacement = null;
    playCue("ui_toggle");
    triggerHaptic("soft");
    // Deselect any tool
    this.toolPalette.selectTool(null);
    this.selectedTool = null;
    this.updateSwitchBtnVisual();
  }

  private exitSwitchMode(): void {
    this.switchMode = false;
    this.switchFrom = null;
    this.updateSwitchBtnVisual();
    this.renderAll();
  }

  private updateSwitchBtnVisual(): void {
    const remaining = Math.max(0, this.gameState.switchesPerTurn - this.gameState.switchesUsedThisTurn);
    this.turnControls.setSwitchState(this.switchMode, remaining);
  }

  private updateMuteBtnVisual(): void {
    if (!this.muteBtn) return;
    const enabled = loadSave().preferences.audioEnabled;
    this.muteBtn.setText(enabled ? "🔊" : "🔇");
    this.muteBtn.setColor(enabled ? APP_THEME.colors.textSecondary : APP_THEME.colors.danger);
  }

  private toggleMute(): void {
    const save = loadSave();
    const enabled = !save.preferences.audioEnabled;
    updatePreferences({ audioEnabled: enabled });
    refreshSceneMusic(this);
    if (enabled) {
      playCue("ui_toggle");
    }
    triggerHaptic("soft");
    this.updateMuteBtnVisual();
  }

  private goHome(): void {
    playCue("ui_tap");
    devTracker.endSession("abandon", this.gameState, 0, 0);
    this.scene.start("Title");
  }

  private handleTileClick(x: number, y: number): void {
    if (this.animating || this.gameState.isOver) return;

    // ── Switch mode: two-click flow ──
    if (this.switchMode) {
      if (!this.switchFrom) {
        // First click: select source (must be medicine or wall)
        const tile = getTile(this.gameState.board, x, y);
        if (tile.kind !== "medicine" && tile.kind !== "wall") {
          this.showFloatingHint(x, y, "Select a medicine or wall");
          return;
        }
        this.switchFrom = { x, y };
        this.renderAll();
        return;
      } else {
        // Second click: select target (must be empty)
        const tile = getTile(this.gameState.board, x, y);
        if (tile.kind !== "empty") {
          this.showFloatingHint(x, y, "Must be an empty cell");
          return;
        }
        pushHistory(this.history, this.gameState);
        const action: Action = {
          type: "switch",
          fromX: this.switchFrom.x, fromY: this.switchFrom.y,
          toX: x, toY: y,
        };
        applyAction(this.gameState, action);
        devTracker.recordAction(action);
        playCue("ui_toggle");
        triggerHaptic("medium");
        this.exitSwitchMode();
        this.turnControls.setUndoEnabled(canUndo(this.history));
        this.pendingPlacement = null;
        this.renderAll();
        return;
      }
    }

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

    if (this.layout.precisionPlacement) {
      const pending = this.pendingPlacement;
      if (!pending || pending.tool !== this.selectedTool || pending.x !== x || pending.y !== y) {
        this.pendingPlacement = { tool: this.selectedTool, x, y };
        playCue("ui_toggle");
        triggerHaptic("soft");
        this.showFloatingHint(x, y, "Tap again to place");
        this.renderAll();
        return;
      }
    }

    pushHistory(this.history, this.gameState);

    const action: Action = { type: "place_tool", tool: this.selectedTool, x, y };
    applyAction(this.gameState, action);
    devTracker.recordAction(action);
    playCue("tool_place");
    triggerHaptic("soft");
    this.pendingPlacement = null;

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

    if (this.selectedTool && !this.layout.precisionPlacement) {
      const valid = canPlaceTool(this.gameState, this.selectedTool, x, y);
      this.grid.render(this.gameState.board);
      this.grid.showPlacementHint(x, y, valid);
      if (valid && this.gameState.toolsUsedThisTurn < this.gameState.toolsPerTurn) {
        this.previewOverlay.showPreview(this.gameState, {
          tool: this.selectedTool,
          x,
          y,
        });
      } else {
        this.refreshPreview();
      }
    }
  }

  private handleTileOut(): void {
    if (this.animating) return;
    this.hideTooltip();
    this.renderAll();
  }

  private doStep(): void {
    if (this.animating || this.gameState.isOver) return;

    pushHistory(this.history, this.gameState);
    playCue("turn_step");
    triggerHaptic("medium");

    // Animate each generation individually so the player
    // can watch the germs grow, fight, and convert.
    this.animating = true;
    this.turnControls.setEnabled(false);

    this.gameState.turn++;
    this.gameState.toolsUsedThisTurn = 0;
    this.gameState.switchesUsedThisTurn = 0;
    this.pendingPlacement = null;
    if (this.switchMode) this.exitSwitchMode();

    // Per-turn tool grant (v5.0 drip-feed)
    if (this.levelSpec.toolGrant) {
      const g = this.levelSpec.toolGrant;
      for (const k of Object.keys(g) as Array<keyof typeof g>) {
        this.gameState.tools[k] += g[k];
      }
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

      if (this.levelSpec.boss) {
        if (this.gameState.result === "win" && !this.gameState.bossDefeated) {
          this.gameState.isOver = false;
          this.gameState.result = "playing";
          this.gameState.stars = 0;
        }
        if (this.gameState.result !== "lose") {
          this.resolveBossPhase();
        }
      }

      // Record turn-end snapshot for dev tracking
      devTracker.recordTurnEnd(this.gameState);

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
    playCue("spread");

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
          color: APP_THEME.colors.gold,
          fontFamily: APP_THEME.fonts.body,
          fontStyle: "bold",
          backgroundColor: "#102131dd",
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

    devTracker.recordUndo();
    playCue("ui_tap");
    this.gameState = prev;
    this.pendingPlacement = null;
    this.toolPalette.updateCounts(this.gameState.tools);
    this.turnControls.setUndoEnabled(canUndo(this.history));
    this.renderAll();
  }

  private doReset(): void {
    if (this.animating) return;
    playCue("ui_tap");
    clearHistory(this.history);
    this.gameState = cloneState(this.initialState);
    this.pendingPlacement = null;

    this.toolPalette.updateCounts(this.gameState.tools);
    this.toolPalette.selectTool(null);
    this.selectedTool = null;
    if (this.switchMode) this.exitSwitchMode();
    this.turnControls.setUndoEnabled(false);
    this.starDisplay.setStars(0);
    this.renderAll();
  }

  // ── Rendering ──────────────────────────────────

  private renderAll(): void {
    this.grid.render(this.gameState.board);
    this.renderBossMarkers();
    if (this.switchFrom) {
      this.grid.highlightTile(this.switchFrom.x, this.switchFrom.y, 0x00e5ff);
    }
    if (this.pendingPlacement && this.selectedTool === this.pendingPlacement.tool) {
      const valid = canPlaceTool(this.gameState, this.pendingPlacement.tool, this.pendingPlacement.x, this.pendingPlacement.y);
      this.grid.showPlacementHint(this.pendingPlacement.x, this.pendingPlacement.y, valid);
      this.grid.highlightTile(
        this.pendingPlacement.x,
        this.pendingPlacement.y,
        valid ? 0x00e5ff : 0xff5252,
      );
    }
    this.updateStatusBar();
    this.updateActionsIndicator();
    this.refreshPreview();
    this.updateSwitchBtnVisual();
    this.updateMuteBtnVisual();
    this.updateBossHint();
  }

  private updateActionsIndicator(): void {
    const used = this.gameState.toolsUsedThisTurn;
    const max = this.gameState.toolsPerTurn;
    const remaining = max - used;
    const switchesRemaining = Math.max(0, this.gameState.switchesPerTurn - this.gameState.switchesUsedThisTurn);
    this.statusBar.setActions(remaining, max, switchesRemaining);
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
    if (this.pendingPlacement && this.selectedTool === this.pendingPlacement.tool) {
      this.previewOverlay.showPreview(this.gameState, this.pendingPlacement);
      return;
    }
    this.previewOverlay.showPreview(this.gameState);
  }

  private getObjectiveHint(): string {
    if (this.levelSpec.boss && !this.gameState.bossDefeated) {
      const phase = this.getCurrentBossPhase();
      if (phase) {
        const locked = phase.relays.filter((node) => this.isRelayOccupied(node)).length;
        return `${phase.label}: ${locked}/${phase.relays.length} relays sealed`;
      }
      return "Finish the boss encounter";
    }

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
        color: APP_THEME.colors.danger,
        fontFamily: APP_THEME.fonts.body,
        backgroundColor: "#152131",
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
          color: APP_THEME.colors.textPrimary,
          fontFamily: APP_THEME.fonts.body,
          backgroundColor: "#102131ee",
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

        devTracker.endSession("win", this.gameState, stars, score);

        tweenWinBurst(this, w / 2, h / 2, () => {
          if (this.endlessRun) {
            const nextRun = advanceEndlessRun(this.endlessRun, score);
            const nextSpec = generateEndlessLevel(nextRun);
            this.showBossBanner(`ROUND ${this.endlessRun.round} CLEARED`, `+${score.toLocaleString()} score • total ${nextRun.totalScore.toLocaleString()}`);
            this.time.delayedCall(1500, () => {
              this.scene.restart({
                levelSpec: nextSpec,
                endlessRun: nextRun,
              });
            });
          } else {
            this.starDisplay.animateStars(stars);
            this.time.delayedCall(1800, () => {
              this.scene.start("Win", {
                levelSpec: this.levelSpec,
                stars,
                turns: this.gameState.turn,
                score,
              });
            });
          }
        });
      } else {
        devTracker.endSession("lose", this.gameState, 0, 0);
        playCue("lose");
        triggerHaptic("warning");
        tweenLoseShake(this, this.cameras.main, () => {
          this.showGameOverOverlay();
        });
      }
    }
  }

  private showGameOverOverlay(): void {
    const { width: w, height: h } = this.cameras.main;
    const endlessFinalScore = this.endlessRun?.totalScore ?? 0;
    const endlessFinalRound = this.endlessRun ? Math.max(0, this.endlessRun.round - 1) : 0;
    const endlessBest = this.endlessRun ? updateEndlessResult(endlessFinalScore, endlessFinalRound) : null;

    const overlay = this.add.graphics().setDepth(400);
    overlay.fillStyle(0x01050d, 0.82);
    overlay.fillRect(0, 0, w, h);

    genPanelTex(this, "lose_panel", w - 34, 240, 26, "rgba(20,10,15,0.92)", "rgba(255,82,82,0.18)");
    this.add.image(w / 2, h / 2, "lose_panel").setDepth(401);

    this.add
      .text(w / 2, h / 2 - 74, this.endlessRun ? "RUN OVER" : "OUTBREAK", {
        fontSize: "30px",
        color: APP_THEME.colors.danger,
        fontFamily: APP_THEME.fonts.display,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(402);

    this.add
      .text(w / 2, h / 2 - 36, this.endlessRun
        ? `You reached round ${this.endlessRun.round}.\nThe lab fell with ${endlessFinalScore.toLocaleString()} points banked.`
        : "Infection breached the containment threshold.", {
        fontSize: "13px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: APP_THEME.fonts.body,
        align: "center",
        lineSpacing: 5,
      })
      .setOrigin(0.5)
      .setDepth(402);

    if (this.endlessRun && endlessBest) {
      this.add
        .text(w / 2, h / 2 + 2, `Best endless: ${endlessBest.endlessHighScore.toLocaleString()} • round ${endlessBest.endlessBestRound}`, {
          fontSize: "12px",
          color: APP_THEME.colors.gold,
          fontFamily: APP_THEME.fonts.body,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(402);
    }

    addButton(this, w / 2, h / 2 + 28, "Retry Level", () => {
      if (this.endlessRun) {
        const freshRun: EndlessRunState = {
          runSeed: Math.floor(Math.random() * 0x7fffffff),
          round: 1,
          totalScore: 0,
        };
        this.scene.restart({
          levelSpec: generateEndlessLevel(freshRun),
          endlessRun: freshRun,
        });
      } else {
        this.scene.restart({ levelSpec: this.levelSpec });
      }
    }, { style: "primary", w: 186, h: 48, fontSize: "14px", depth: 402 });

    addButton(this, w / 2, h / 2 + 90, "Back To Map", () => {
      this.scene.start(this.endlessRun ? "Title" : "Menu");
    }, { style: "secondary", w: 186, h: 44, fontSize: "13px", depth: 402 });
  }

  // ── Cleanup ────────────────────────────────────

  shutdown(): void {
    this.tooltipText = undefined;
    this.switchMode = false;
    this.switchFrom = null;
    this.grid?.destroy();
    this.toolPalette?.destroy();
    this.turnControls?.destroy();
    this.statusBar?.destroy();
    this.previewOverlay?.destroy();
    this.starDisplay?.destroy();
    this.rulesOverlay?.destroy();
    this.settingsOverlay?.destroy();
    this.onboardingOverlay?.destroy();
    this.genBadge?.destroy();
    this.bossRelayGraphics?.destroy();
  }

  private getCurrentBossPhase(): BossPhaseSpec | null {
    const boss = this.levelSpec.boss;
    if (!boss || this.gameState.bossDefeated) return null;
    return boss.phases[this.gameState.bossPhase] ?? null;
  }

  private updateBossHint(): void {
    if (!this.hintText) {
      return;
    }
    if (!this.levelSpec.boss) {
      this.hintText.setText(this.levelSpec.hint || "");
      return;
    }

    if (this.gameState.bossDefeated) {
      this.hintText.setText(this.levelSpec.boss.victoryLine);
      return;
    }

    const phase = this.getCurrentBossPhase();
    if (!phase) {
      this.hintText.setText(this.levelSpec.boss.subtitle);
      return;
    }

    const locked = phase.relays.filter((node) => this.isRelayOccupied(node)).length;
    this.hintText.setText(`BOSS PHASE ${this.gameState.bossPhase + 1}/${this.levelSpec.boss.phases.length} • ${phase.instruction} (${locked}/${phase.relays.length})`);
  }

  private isRelayOccupied(node: BossNode): boolean {
    const tile = getTile(this.gameState.board, node.x, node.y);
    return tile.kind === "medicine" || tile.kind === "wall";
  }

  private renderBossMarkers(): void {
    if (!this.levelSpec.boss) {
      this.bossRelayGraphics?.clear();
      return;
    }

    if (!this.bossRelayGraphics) {
      this.bossRelayGraphics = this.add.graphics().setDepth(96);
    }

    const phase = this.getCurrentBossPhase();
    this.bossRelayGraphics.clear();
    if (!phase) return;

    const theme = getWorldTheme(this.levelSpec.world ?? 1);
    for (const node of phase.relays) {
      const cx = tileX(node.x, this.layout.gridOffsetX, this.layout.tileSize, this.layout.tileGap) + this.layout.tileSize / 2;
      const cy = tileY(node.y, this.layout.gridOffsetY, this.layout.tileSize, this.layout.tileGap) + this.layout.tileSize / 2;
      const occupied = this.isRelayOccupied(node);
      const radius = Math.max(8, this.layout.tileSize * 0.34);

      this.bossRelayGraphics.lineStyle(occupied ? 3 : 2, occupied ? 0x00e676 : theme.accentNumber, occupied ? 0.95 : 0.8);
      this.bossRelayGraphics.fillStyle(occupied ? 0x00e676 : theme.accentNumber, occupied ? 0.18 : 0.1);
      this.bossRelayGraphics.fillCircle(cx, cy, radius);
      this.bossRelayGraphics.strokeCircle(cx, cy, radius);
      this.bossRelayGraphics.lineStyle(2, occupied ? 0x00e676 : 0xffffff, occupied ? 0.8 : 0.55);
      this.bossRelayGraphics.beginPath();
      this.bossRelayGraphics.moveTo(cx - radius * 0.55, cy);
      this.bossRelayGraphics.lineTo(cx + radius * 0.55, cy);
      this.bossRelayGraphics.moveTo(cx, cy - radius * 0.55);
      this.bossRelayGraphics.lineTo(cx, cy + radius * 0.55);
      this.bossRelayGraphics.strokePath();
    }
  }

  private resolveBossPhase(): void {
    const boss = this.levelSpec.boss;
    const phase = this.getCurrentBossPhase();
    if (!boss || !phase) return;

    const locked = phase.relays.every((node) => this.isRelayOccupied(node));
    if (!locked) return;

    this.consumeRelayNodes(phase.relays);
    this.purgeBossCells(phase.purgeCells);

    if (phase.reinforcements.length > 0) {
      this.spawnBossWave(phase.reinforcements);
    }

    this.gameState.bossPhase += 1;

    if (this.gameState.bossPhase >= boss.phases.length) {
      this.gameState.bossDefeated = true;
      this.clearRemainingPathogens();
      this.gameState.isOver = true;
      this.gameState.result = "win";
      playCue("win");
      triggerHaptic("success");
      this.showBossBanner("CORE SHUTDOWN", boss.victoryLine);
      return;
    }

    const nextPhase = this.getCurrentBossPhase();
    playCue("kill");
    triggerHaptic("success");
    this.showBossBanner(`PHASE CLEARED • ${phase.label.toUpperCase()}`, nextPhase?.instruction ?? boss.subtitle);
  }

  private consumeRelayNodes(nodes: BossNode[]): void {
    for (const node of nodes) {
      setTile(this.gameState.board, node.x, node.y, emptyTile());
    }
  }

  private purgeBossCells(nodes: BossNode[]): void {
    for (const node of nodes) {
      const tile = getTile(this.gameState.board, node.x, node.y);
      if (tile.kind !== "wall") {
        setTile(this.gameState.board, node.x, node.y, emptyTile());
      }
    }
  }

  private spawnBossWave(seeds: BossPhaseSpec["reinforcements"]): void {
    for (const seed of seeds) {
      const tile = getTile(this.gameState.board, seed.x, seed.y);
      if (tile.kind === "wall") continue;
      setTile(this.gameState.board, seed.x, seed.y, pathogenTile(seed.type));
    }
  }

  private clearRemainingPathogens(): void {
    const { w, h } = this.gameState.board;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = getTile(this.gameState.board, x, y);
        if (tile.kind === "pathogen") {
          setTile(this.gameState.board, x, y, emptyTile());
        }
      }
    }
  }

  private showBossBanner(title: string, subtitle: string): void {
    const { width: w } = this.cameras.main;
    const wrap = this.add.container(w / 2, 118).setDepth(320);

    genPanelTex(this, "boss_phase_banner", 260, 62, 18, "rgba(14,16,28,0.92)", "rgba(0,229,255,0.18)");
    wrap.add(this.add.image(0, 0, "boss_phase_banner"));
    wrap.add(this.add.text(0, -12, title, {
      fontSize: "14px",
      color: APP_THEME.colors.gold,
      fontFamily: APP_THEME.fonts.display,
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5));
    wrap.add(this.add.text(0, 12, subtitle, {
      fontSize: "10px",
      color: APP_THEME.colors.textSecondary,
      fontFamily: APP_THEME.fonts.body,
      align: "center",
      wordWrap: { width: 220 },
    }).setOrigin(0.5));

    this.tweens.add({
      targets: wrap,
      y: 106,
      alpha: { from: 0, to: 1 },
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.time.delayedCall(1400, () => {
          this.tweens.add({
            targets: wrap,
            y: 90,
            alpha: 0,
            duration: 220,
            ease: "Quad.easeIn",
            onComplete: () => wrap.destroy(),
          });
        });
      },
    });
  }

  private showBossIntro(): void {
    const boss = this.levelSpec.boss;
    if (!boss) return;

    this.animating = true;
    this.turnControls.setEnabled(false);

    const { width: w, height: h } = this.cameras.main;
    const overlay = this.add.container(0, 0).setDepth(500);
    const blocker = this.add.rectangle(0, 0, w, h, 0x01050d, 0.82).setOrigin(0).setInteractive();
    overlay.add(blocker);

    genPanelTex(this, "boss_intro_panel", w - 34, 330, 28, "rgba(10,14,24,0.94)", "rgba(255,82,82,0.22)");
    overlay.add(this.add.image(w / 2, h / 2, "boss_intro_panel"));

    const splashKey = getBossSplashKey(this, boss.id);
    if (splashKey) {
      overlay.add(this.add.image(w / 2, h / 2 - 78, splashKey).setDisplaySize(220, 110).setAlpha(0.92));
    } else {
      overlay.add(this.add.circle(w / 2, h / 2 - 78, 54, getWorldTheme(this.levelSpec.world).accentNumber, 0.22));
    }

    overlay.add(this.add.text(w / 2, h / 2 - 148, "BOSS ENCOUNTER", {
      fontSize: "14px",
      color: APP_THEME.colors.danger,
      fontFamily: APP_THEME.fonts.body,
      fontStyle: "bold",
      letterSpacing: 1.2,
    }).setOrigin(0.5));

    overlay.add(this.add.text(w / 2, h / 2 - 24, boss.name, {
      fontSize: "28px",
      color: APP_THEME.colors.textPrimary,
      fontFamily: APP_THEME.fonts.display,
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5));

    overlay.add(this.add.text(w / 2, h / 2 + 12, boss.intro, {
      fontSize: "12px",
      color: APP_THEME.colors.textSecondary,
      fontFamily: APP_THEME.fonts.body,
      align: "center",
      wordWrap: { width: w - 92 },
      lineSpacing: 4,
    }).setOrigin(0.5, 0));

    const phase = this.getCurrentBossPhase();
    if (phase) {
      overlay.add(this.add.text(w / 2, h / 2 + 88, `Phase 1: ${phase.label}\n${phase.instruction}`, {
        fontSize: "11px",
        color: APP_THEME.colors.gold,
        fontFamily: APP_THEME.fonts.body,
        align: "center",
        lineSpacing: 4,
        wordWrap: { width: w - 100 },
      }).setOrigin(0.5));
    }

    const startBtn = addButton(this, w / 2, h / 2 + 138, "Begin Containment", () => {
      overlay.destroy();
      this.animating = false;
      this.turnControls.setEnabled(true);
      this.showBossBanner(boss.name.toUpperCase(), boss.subtitle);
    }, { style: "danger", w: 210, h: 48, fontSize: "14px", depth: 501 });
    overlay.add(startBtn);
  }
}
