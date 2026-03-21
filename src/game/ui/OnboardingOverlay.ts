import Phaser from "phaser";
import { loadSave, updatePreferences } from "../save";
import { APP_THEME } from "../theme";
import { addButton, genPanelTex } from "./UIFactory";

const TUTORIAL_COPY: Record<number, { title: string; body: string }> = {
  1: {
    title: "Predict The Spread",
    body: "Every germ grows in a fixed pattern. Study the ghost preview before you commit your move.",
  },
  2: {
    title: "Build Dead Zones",
    body: "If medicine and infection both try to claim the same empty tile, neither gets it. Use that to wall off the outbreak.",
  },
  3: {
    title: "Pairs Survive",
    body: "Medicine needs an ally in its own pattern to keep propagating. Place with structure, not just panic.",
  },
};

export class OnboardingOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private levelId: number;

  constructor(scene: Phaser.Scene, levelId: number) {
    this.scene = scene;
    this.levelId = levelId;
    this.container = scene.add.container(0, 0).setDepth(650).setVisible(false);
    this.build();
  }

  shouldShow(): boolean {
    const save = loadSave();
    return this.levelId in TUTORIAL_COPY && !save.preferences.onboardingSeen.includes(this.levelId);
  }

  private build(): void {
    const copy = TUTORIAL_COPY[this.levelId];
    if (!copy) return;

    const { width: w, height: h } = this.scene.cameras.main;
    const panelW = Math.min(324, w - 32);
    const panelH = 220;
    const py = h - panelH - 24;

    const shade = this.scene.add.graphics();
    shade.fillStyle(0x020812, 0.58);
    shade.fillRect(0, 0, w, h);
    this.container.add(shade);

    genPanelTex(this.scene, `onboard_${this.levelId}`, panelW, panelH, 24, "rgba(9,18,31,0.94)", "rgba(125,247,191,0.16)");
    this.container.add(this.scene.add.image(w / 2, py + panelH / 2, `onboard_${this.levelId}`));

    this.container.add(this.scene.add.text(w / 2, py + 24, copy.title.toUpperCase(), {
      fontSize: "22px",
      color: APP_THEME.colors.textPrimary,
      fontFamily: APP_THEME.fonts.display,
      fontStyle: "700",
    }).setOrigin(0.5, 0));

    this.container.add(this.scene.add.text(w / 2, py + 74, copy.body, {
      fontSize: "14px",
      color: APP_THEME.colors.textSecondary,
      fontFamily: APP_THEME.fonts.body,
      align: "center",
      wordWrap: { width: panelW - 48 },
      lineSpacing: 8,
    }).setOrigin(0.5, 0));

    const btn = addButton(this.scene, w / 2, py + panelH - 34, "Got It", () => {
      const save = loadSave();
      updatePreferences({ onboardingSeen: [...new Set([...save.preferences.onboardingSeen, this.levelId])] });
      this.hide();
    }, { style: "primary", w: 150, h: 44, fontSize: "14px", depth: 660 });
    this.container.add(btn);
  }

  show(): void {
    if (!this.shouldShow()) return;
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
