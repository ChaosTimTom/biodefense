// ═══════════════════════════════════════════════════
// src/game/scenes/MenuScene.ts — World & level select
// Gradient bg, circular level buttons, styled tabs
// ═══════════════════════════════════════════════════

import Phaser from "phaser";
import type { LevelSpec } from "../../sim/types";
import { generateWorld } from "../../sim/generator";
import { loadSave, saveSave, totalStars as getStars, totalScore as getScore, type SaveData } from "../save";
import {
  UI_FONT, addWorldBackground, addBioParticles, addButton,
  genCircleTex, genPanelTex, genBtnTex, fadeIn, fadeToScene,
} from "../ui/UIFactory";

const WORLDS = [
  { id: 1, name: "Petri Dish",   color: 0x4caf50, starsNeeded: 0 },
  { id: 2, name: "Bloodstream",  color: 0xe53935, starsNeeded: 40 },
  { id: 3, name: "Tissue",       color: 0xab47bc, starsNeeded: 100 },
  { id: 4, name: "Pandemic",     color: 0xff6f00, starsNeeded: 180 },
];

/** Cache generated level specs per world (generated once, reused) */
const WORLD_LEVELS: Record<number, LevelSpec[]> = {};

function getWorldLevels(worldId: number): LevelSpec[] {
  if (!WORLD_LEVELS[worldId]) {
    WORLD_LEVELS[worldId] = generateWorld(worldId);
  }
  return WORLD_LEVELS[worldId];
}

function getLevelSpec(levelId: number): LevelSpec | undefined {
  for (const world of WORLDS) {
    const levels = getWorldLevels(world.id);
    const found = levels.find(l => l.id === levelId);
    if (found) return found;
  }
  return undefined;
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
    this.autoStartLevel = data?.autoStartLevel ?? null;
    if (data?.updatedStars) {
      const { levelId, stars } = data.updatedStars;
      const prev = this.save.stars[levelId] ?? 0;
      if (stars > prev) {
        this.save.stars[levelId] = stars;
      }
    }
    if (data?.updatedScore) {
      const { levelId, score } = data.updatedScore;
      const prev = this.save.scores[levelId] ?? 0;
      if (score > prev) {
        this.save.scores[levelId] = score;
      }
    }
    saveSave(this.save);
  }

  create(): void {
    if (this.autoStartLevel != null) {
      const id = this.autoStartLevel;
      this.autoStartLevel = null;
      this.startLevel(id);
      return;
    }

    const { width: w, height: h } = this.cameras.main;
    fadeIn(this);

    // ── Background ──
    addWorldBackground(this, this.selectedWorld);
    addBioParticles(this, 8);

    // ── Header panel ──
    genPanelTex(this, "menu_header", w - 16, 44, 10, "rgba(13,21,37,0.85)", "rgba(0,229,255,0.1)");
    this.add.image(w / 2, 30, "menu_header").setDepth(2);

    // Back button
    const backText = this.add
      .text(32, 30, "←", {
        fontSize: "18px",
        color: "#aaaacc",
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.add.rectangle(32, 30, 50, 44)
      .setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(3)
      .on("pointerdown", () => fadeToScene(this, "Title"))
      .on("pointerover", () => backText.setColor("#00e5ff"))
      .on("pointerout", () => backText.setColor("#aaaacc"));

    // Title
    this.add
      .text(w / 2, 23, "SELECT LEVEL", {
        fontSize: "15px",
        color: "#00e5ff",
        fontFamily: UI_FONT,
        fontStyle: "bold",
        shadow: { offsetX: 0, offsetY: 1, color: "#001122", blur: 3, fill: true },
      })
      .setOrigin(0.5)
      .setDepth(3);

    // Stars + Score
    const totalStars = getStars(this.save);
    const totalScore = getScore(this.save);

    this.add
      .text(w - 16, 23, `★ ${totalStars}`, {
        fontSize: "11px",
        color: "#ffd740",
        fontFamily: UI_FONT,
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5)
      .setDepth(3);

    this.add
      .text(w - 16, 38, `${totalScore.toLocaleString()} pts`, {
        fontSize: "9px",
        color: "#667799",
        fontFamily: UI_FONT,
      })
      .setOrigin(1, 0.5)
      .setDepth(3);

    // ── World Tabs ──
    const tabY = 62;
    const tabW = (w - 32) / WORLDS.length;
    const tabH = 36;

    WORLDS.forEach((world, i) => {
      const tx = 16 + i * tabW;
      const centerX = tx + tabW / 2 - 2;
      const unlocked = totalStars >= world.starsNeeded;
      const selected = world.id === this.selectedWorld;
      const colorStr = `#${world.color.toString(16).padStart(6, "0")}`;

      if (selected) {
        const tabKey = `tab_${world.id}`;
        genBtnTex(
          this, tabKey, tabW - 4, tabH, 8,
          `${colorStr}33`, `${colorStr}11`, `${colorStr}88`,
        );
        this.add.image(centerX, tabY + tabH / 2, tabKey).setDepth(2);
      }

      this.add
        .text(centerX, tabY + tabH / 2, unlocked ? world.name : "Locked", {
          fontSize: "11px",
          color: unlocked ? colorStr : "#444466",
          fontFamily: UI_FONT,
          fontStyle: selected ? "bold" : "normal",
        })
        .setOrigin(0.5)
        .setDepth(3);

      if (unlocked) {
        this.add.rectangle(centerX, tabY + tabH / 2, tabW - 4, tabH)
          .setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(3)
          .on("pointerdown", () => {
            this.selectedWorld = world.id;
            this.scene.restart();
          });
      }
    });

    // ── Level Grid ──
    this.renderLevelGrid(w, h);
  }

  private renderLevelGrid(w: number, _h: number): void {
    const startY = 124;
    const cols = 5;
    const diam = 46;
    const gap = 10;
    const gridW = cols * (diam + gap) - gap;
    const startX = (w - gridW) / 2 + diam / 2;

    const levels = getWorldLevels(this.selectedWorld);
    const perPage = 25;
    const totalPages = Math.ceil(levels.length / perPage);
    const pageStart = this.page * perPage;
    const pageEnd = Math.min(pageStart + perPage, levels.length);

    // Pre-generate circle textures
    genCircleTex(this, "lvl_unlocked", diam, "#1a3a5c", "#0d2238", "rgba(0,229,255,0.3)");
    genCircleTex(this, "lvl_locked", diam, "#151525", "#0d0d1a", "rgba(100,100,140,0.15)");
    genCircleTex(this, "lvl_gold", diam, "#3a3010", "#1e1a08", "rgba(255,215,64,0.5)");

    for (let idx = pageStart; idx < pageEnd; idx++) {
      const level = levels[idx];
      const levelId = level.id;
      const i = idx - pageStart;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (diam + gap);
      const cy = startY + row * (diam + gap + 14);

      const earned = this.save.stars[levelId] ?? 0;
      const score = this.save.scores[levelId] ?? 0;
      const unlocked = this.isLevelUnlocked(levelId);

      // Circle background
      const texKey = !unlocked ? "lvl_locked" : earned === 3 ? "lvl_gold" : "lvl_unlocked";
      this.add.image(cx, cy, texKey).setDepth(2);

      // Level number or lock icon
      if (unlocked) {
        this.add
          .text(cx, cy - 1, `${idx + 1}`, {
            fontSize: "14px",
            color: "#ffffff",
            fontFamily: UI_FONT,
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(3);
      } else if (this.textures.exists("icon_lock")) {
        this.add.image(cx, cy - 1, "icon_lock").setDisplaySize(16, 16).setDepth(3);
      } else {
        this.add
          .text(cx, cy - 1, "X", {
            fontSize: "11px",
            color: "#444466",
            fontFamily: UI_FONT,
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(3);
      }

      // Stars (small dots below circle)
      if (earned > 0) {
        const dotR = 3;
        const dotGap = 8;
        const dotsX = cx - dotGap;
        const dotsY = cy + diam / 2 + 6;
        const gfx = this.add.graphics().setDepth(3);
        for (let s = 0; s < 3; s++) {
          const dx = dotsX + s * dotGap;
          if (s < earned) {
            gfx.fillStyle(0xffd740, 1);
            gfx.fillCircle(dx, dotsY, dotR);
          } else {
            gfx.fillStyle(0x333355, 0.6);
            gfx.fillCircle(dx, dotsY, dotR);
          }
        }
      }

      // Score below dots
      if (score > 0) {
        this.add
          .text(cx, cy + diam / 2 + 16, `${score}`, {
            fontSize: "7px",
            color: "#5577aa",
            fontFamily: UI_FONT,
          })
          .setOrigin(0.5)
          .setDepth(3);
      }

      // Interactive zone
      if (unlocked) {
        const zone = this.add
          .rectangle(cx, cy, diam + 8, diam + 8)
          .setInteractive({ useHandCursor: true }).setAlpha(0.001).setDepth(4);
        zone.on("pointerdown", () => this.startLevel(levelId));
      }
    }

    // ── Page navigation ──
    if (totalPages > 1) {
      const navY = startY + 5 * (diam + gap + 14) + 10;

      if (this.page > 0) {
        addButton(this, w / 2 - 70, navY, "◄", () => {
          this.page--;
          this.scene.restart();
        }, { w: 48, h: 36, r: 8, style: "secondary", fontSize: "14px" });
      }

      this.add
        .text(w / 2, navY, `${this.page + 1} / ${totalPages}`, {
          fontSize: "11px",
          color: "#667799",
          fontFamily: UI_FONT,
        })
        .setOrigin(0.5)
        .setDepth(5);

      if (this.page < totalPages - 1) {
        addButton(this, w / 2 + 70, navY, "►", () => {
          this.page++;
          this.scene.restart();
        }, { w: 48, h: 36, r: 8, style: "secondary", fontSize: "14px" });
      }
    }
  }

  private isLevelUnlocked(levelId: number): boolean {
    if (levelId <= 1) return true;

    // First level of each world is unlocked if the world is star-gated open
    const ts = getStars(this.save);
    for (const world of WORLDS) {
      const firstId = (world.id - 1) * 50 + 1;
      if (levelId === firstId && ts >= world.starsNeeded) return true;
    }

    const prevStars = this.save.stars[levelId - 1] ?? 0;
    return prevStars > 0;
  }

  private startLevel(levelId: number): void {
    const spec = getLevelSpec(levelId);
    if (spec) {
      fadeToScene(this, "Level", { levelSpec: spec });
    }
  }
}
