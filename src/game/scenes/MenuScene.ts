// ═══════════════════════════════════════════════════
// src/game/scenes/MenuScene.ts — Premium world / level select
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { LevelSpec } from "../../sim/types";
import { getCampaignLevel, getCampaignWorldLevels } from "../../sim/campaign";
import {
  loadSave,
  saveSave,
  totalStars as getStars,
  totalScore as getScore,
  type SaveData,
  updatePreferences,
} from "../save";
import { syncSceneMusic } from "../music";
import { APP_THEME, getWorldTheme } from "../theme";
import {
  UI_FONT,
  UI_DISPLAY_FONT,
  addBioParticles,
  addButton,
  addWorldBackground,
  fadeIn,
  fadeToScene,
  genPanelTex,
} from "../ui/UIFactory";

const WORLDS = [
  { id: 1, name: "Petri Dish", starsNeeded: 0 },
  { id: 2, name: "Bloodstream", starsNeeded: 40 },
  { id: 3, name: "Tissue", starsNeeded: 100 },
  { id: 4, name: "Pandemic", starsNeeded: 180 },
];

function getWorldIdForLevel(levelId: number): number | null {
  if (levelId < 1) return null;
  const worldId = Math.floor((levelId - 1) / 50) + 1;
  return WORLDS.some((world) => world.id === worldId) ? worldId : null;
}

function highestUnlockedWorldId(save: SaveData): number {
  const stars = getStars(save);
  let worldId = 1;
  for (const world of WORLDS) {
    if (stars >= world.starsNeeded) worldId = world.id;
  }
  return worldId;
}

function getWorldLevels(worldId: number): LevelSpec[] {
  return getCampaignWorldLevels(worldId);
}

export class MenuScene extends Phaser.Scene {
  private save!: SaveData;
  private selectedWorld = 1;
  private page = 0;
  private autoStartLevel: number | null = null;

  constructor() {
    super({ key: "Menu" });
  }

  init(data?: {
    updatedStars?: { levelId: number; stars: number };
    updatedScore?: { levelId: number; score: number };
    autoStartLevel?: number;
  }): void {
    this.save = loadSave();
    this.selectedWorld = Math.min(
      highestUnlockedWorldId(this.save),
      Math.max(1, this.save.preferences.lastSelectedWorld || 1),
    );
    this.autoStartLevel = data?.autoStartLevel ?? null;

    if (data?.updatedStars) {
      const { levelId, stars } = data.updatedStars;
      const prev = this.save.stars[levelId] ?? 0;
      if (stars > prev) this.save.stars[levelId] = stars;
    }

    if (data?.updatedScore) {
      const { levelId, score } = data.updatedScore;
      const prev = this.save.scores[levelId] ?? 0;
      if (score > prev) this.save.scores[levelId] = score;
    }

    saveSave(this.save);

    const targetWorld = this.autoStartLevel == null ? null : getWorldIdForLevel(this.autoStartLevel);
    if (targetWorld !== null && targetWorld <= highestUnlockedWorldId(this.save)) {
      this.selectedWorld = targetWorld;
    }
  }

  create(): void {
    if (this.autoStartLevel != null) {
      const target = this.autoStartLevel;
      this.autoStartLevel = null;
      if (this.startLevel(target)) return;
    }

    const { width: w, height: h } = this.cameras.main;
    const worldTheme = getWorldTheme(this.selectedWorld);
    const totalStars = getStars(this.save);
    const totalScore = getScore(this.save);
    const levels = getWorldLevels(this.selectedWorld);
    const unlockedWorld = totalStars >= WORLDS[this.selectedWorld - 1].starsNeeded;
    const completedCount = levels.filter((level) => (this.save.stars[level.id] ?? 0) > 0).length;
    const worldStars = levels.reduce((sum, level) => sum + (this.save.stars[level.id] ?? 0), 0);

    fadeIn(this, 360);
    syncSceneMusic(this);
    addWorldBackground(this, this.selectedWorld);
    addBioParticles(this, 14, this.selectedWorld);

    genPanelTex(this, "menu_top_shell", w - 18, 52, 18, APP_THEME.colors.panel, APP_THEME.colors.panelBorder);
    this.add.image(w / 2, 34, "menu_top_shell").setDepth(2);

    const backText = this.add
      .text(28, 34, "←", {
        fontSize: "20px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add.rectangle(28, 34, 44, 44)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001)
      .setDepth(4)
      .on("pointerover", () => backText.setColor(worldTheme.accent))
      .on("pointerout", () => backText.setColor(APP_THEME.colors.textSecondary))
      .on("pointerdown", () => fadeToScene(this, "Title"));

    this.add
      .text(w / 2, 22, "CAMPAIGN MAP", {
        fontSize: "15px",
        color: APP_THEME.colors.textPrimary,
        fontFamily: UI_DISPLAY_FONT,
        fontStyle: "bold",
        letterSpacing: 1.2,
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.add
      .text(w / 2, 40, "Choose a world, then push the frontline.", {
        fontSize: "10px",
        color: APP_THEME.colors.textMuted,
        fontFamily: UI_FONT,
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.add
      .text(w - 18, 23, `★ ${totalStars}`, {
        fontSize: "12px",
        color: APP_THEME.colors.gold,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(3);

    this.add
      .text(w - 18, 39, totalScore.toLocaleString(), {
        fontSize: "10px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
      })
      .setOrigin(1, 0)
      .setDepth(3);

    this.renderTabs(w, totalStars);

    genPanelTex(this, "menu_world_hero", w - 24, 118, 24, worldTheme.card, worldTheme.border);
    this.add.image(w / 2, 132, "menu_world_hero").setDepth(2);

    this.add
      .text(30, 92, worldTheme.titleGlyph, { fontSize: "28px" })
      .setOrigin(0, 0)
      .setDepth(3);

    this.add
      .text(68, 90, worldTheme.name.toUpperCase(), {
        fontSize: "22px",
        color: worldTheme.accent,
        fontFamily: UI_DISPLAY_FONT,
        fontStyle: "bold",
      })
      .setDepth(3);

    this.add
      .text(68, 118, worldTheme.tagline, {
        fontSize: "12px",
        color: APP_THEME.colors.textSecondary,
        fontFamily: UI_FONT,
      })
      .setDepth(3);

    this.add
      .text(30, 156, unlockedWorld
        ? `${completedCount}/50 levels cleared  •  ${worldStars} world stars`
        : `Locked until ${WORLDS[this.selectedWorld - 1].starsNeeded} total stars`, {
        fontSize: "11px",
        color: unlockedWorld ? APP_THEME.colors.textPrimary : APP_THEME.colors.gold,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setDepth(3);

    this.add
      .text(w - 28, 156, unlockedWorld ? "OPEN" : "LOCKED", {
        fontSize: "11px",
        color: unlockedWorld ? worldTheme.accent : APP_THEME.colors.gold,
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(3);

    this.renderLevelCards(w, h, levels, unlockedWorld);
  }

  private renderTabs(width: number, totalStars: number): void {
    const tabY = 210;
    const tabW = 86;
    const gap = 6;
    const totalW = tabW * WORLDS.length + gap * (WORLDS.length - 1);
    const startX = (width - totalW) / 2;

    WORLDS.forEach((world, index) => {
      const theme = getWorldTheme(world.id);
      const unlocked = totalStars >= world.starsNeeded;
      const selected = world.id === this.selectedWorld;
      const key = `menu_tab_${world.id}_${selected ? "on" : "off"}_${unlocked ? "open" : "locked"}`;
      genPanelTex(
        this,
        key,
        tabW,
        52,
        16,
        selected ? theme.card : "rgba(10,18,32,0.72)",
        selected ? theme.border : "rgba(255,255,255,0.06)",
      );

      const cx = startX + index * (tabW + gap) + tabW / 2;
      this.add.image(cx, tabY, key).setDepth(2);

      this.add
        .text(cx, tabY - 8, theme.titleGlyph, { fontSize: "18px" })
        .setOrigin(0.5)
        .setDepth(3);

      this.add
        .text(cx, tabY + 10, unlocked ? world.name.split(" ")[0] : `${world.starsNeeded}★`, {
          fontSize: "10px",
          color: unlocked ? (selected ? theme.accent : APP_THEME.colors.textSecondary) : APP_THEME.colors.gold,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);

      if (!unlocked) return;

      this.add.rectangle(cx, tabY, tabW, 52)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.001)
        .setDepth(4)
        .on("pointerdown", () => {
          this.selectedWorld = world.id;
          this.page = 0;
          updatePreferences({ lastSelectedWorld: world.id });
          this.scene.restart();
        });
    });
  }

  private renderLevelCards(width: number, height: number, levels: LevelSpec[], worldUnlocked: boolean): void {
    const perPage = 12;
    const totalPages = Math.ceil(levels.length / perPage);
    const pageStart = this.page * perPage;
    const visible = levels.slice(pageStart, pageStart + perPage);

    const cardW = 84;
    const cardH = 92;
    const cols = 4;
    const gapX = 8;
    const gapY = 10;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = (width - totalW) / 2;
    const startY = 252;

    visible.forEach((level, index) => {
      const localLevel = ((level.id - 1) % 50) + 1;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const earned = this.save.stars[level.id] ?? 0;
      const score = this.save.scores[level.id] ?? 0;
      const unlocked = worldUnlocked && this.isLevelUnlocked(level.id);
      const boss = localLevel === 50;
      const theme = getWorldTheme(this.selectedWorld);
      const key = `level_card_${this.selectedWorld}_${unlocked ? "open" : "locked"}_${boss ? "boss" : "std"}_${earned}`;

      genPanelTex(
        this,
        key,
        cardW,
        cardH,
        18,
        unlocked
          ? earned === 3
            ? "rgba(56,43,13,0.88)"
            : boss
              ? theme.card
              : "rgba(8,18,31,0.84)"
          : "rgba(10,14,24,0.76)",
        unlocked
          ? earned === 3
            ? "rgba(255,215,64,0.28)"
            : boss
              ? theme.border
              : "rgba(255,255,255,0.08)"
          : "rgba(255,255,255,0.04)",
      );

      this.add.image(x + cardW / 2, y + cardH / 2, key).setDepth(2);

      this.add
        .text(x + 12, y + 12, boss ? "BOSS" : `L${localLevel}`, {
          fontSize: "10px",
          color: unlocked ? theme.accent : APP_THEME.colors.textMuted,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setDepth(3);

      this.add
        .text(x + cardW / 2, y + 42, unlocked ? `${localLevel}` : "🔒", {
          fontSize: unlocked ? "26px" : "20px",
          color: unlocked ? APP_THEME.colors.textPrimary : APP_THEME.colors.textMuted,
          fontFamily: UI_DISPLAY_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);

      const starText = `${"★".repeat(earned)}${"☆".repeat(3 - earned)}`;
      this.add
        .text(x + cardW / 2, y + 66, unlocked ? starText : "LOCKED", {
          fontSize: "11px",
          color: unlocked ? APP_THEME.colors.gold : APP_THEME.colors.textMuted,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);

      this.add
        .text(x + cardW / 2, y + 78, score > 0 ? score.toLocaleString() : boss ? "Boss node" : "Uncleared", {
          fontSize: "9px",
          color: score > 0 ? APP_THEME.colors.textSecondary : APP_THEME.colors.textMuted,
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5)
        .setDepth(3);

      if (!unlocked) return;

      this.add.rectangle(x + cardW / 2, y + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.001)
        .setDepth(4)
        .on("pointerdown", () => this.startLevel(level.id));
    });

    if (totalPages > 1) {
      const navY = height - 34;
      addButton(this, width / 2 - 98, navY, "Prev", () => {
        this.page = Math.max(0, this.page - 1);
        this.scene.restart();
      }, { style: "secondary", w: 92, h: 42, fontSize: "12px" });

      this.add
        .text(width / 2, navY - 8, `Page ${this.page + 1} / ${totalPages}`, {
          fontSize: "11px",
          color: APP_THEME.colors.textSecondary,
          fontFamily: UI_FONT,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3);

      addButton(this, width / 2 + 98, navY, "Next", () => {
        this.page = Math.min(totalPages - 1, this.page + 1);
        this.scene.restart();
      }, { style: "secondary", w: 92, h: 42, fontSize: "12px" });
    }
  }

  private isLevelUnlocked(levelId: number): boolean {
    if (levelId <= 1) return true;

    const totalStars = getStars(this.save);
    for (const world of WORLDS) {
      const firstId = (world.id - 1) * 50 + 1;
      if (levelId === firstId && totalStars >= world.starsNeeded) return true;
    }

    return (this.save.stars[levelId - 1] ?? 0) > 0;
  }

  private startLevel(levelId: number): boolean {
    if (!this.isLevelUnlocked(levelId)) return false;

    const spec = getCampaignLevel(levelId);
    if (!spec) return false;

    updatePreferences({
      lastSelectedWorld: getWorldIdForLevel(levelId) ?? this.selectedWorld,
      lastPlayedLevel: levelId,
    });
    fadeToScene(this, "Level", { levelSpec: spec });
    return true;
  }
}
