import Phaser from "phaser";
import { loadSave, updatePreferences } from "../save";
import { APP_THEME } from "../theme";
import { playCue, triggerHaptic } from "../feedback";
import { addButton, genPanelTex } from "./UIFactory";
import { getNextMusicUnlock, getSelectableTracks, refreshSceneMusic } from "../music";

export class SettingsOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible = false;
  private audioValue!: Phaser.GameObjects.Text;
  private hapticValue!: Phaser.GameObjects.Text;
  private musicModeValue!: Phaser.GameObjects.Text;
  private trackValue!: Phaser.GameObjects.Text;
  private musicHint!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(700).setVisible(false);
    this.build();
  }

  private build(): void {
    const { width: w, height: h } = this.scene.cameras.main;
    const panelW = Math.min(340, w - 28);
    const panelH = 388;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;

    const dim = this.scene.add.graphics();
    dim.fillStyle(0x01060f, 0.8);
    dim.fillRect(0, 0, w, h);
    dim.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    dim.on("pointerdown", () => this.hide());
    this.container.add(dim);

    genPanelTex(this.scene, "settings_panel", panelW, panelH, 22, "rgba(8,18,32,0.92)", "rgba(255,255,255,0.08)");
    this.container.add(this.scene.add.image(w / 2, py + panelH / 2, "settings_panel"));

    const title = this.scene.add.text(w / 2, py + 26, "SETTINGS", {
      fontSize: "22px",
      color: APP_THEME.colors.textPrimary,
      fontFamily: APP_THEME.fonts.display,
      fontStyle: "700",
      letterSpacing: 1,
    }).setOrigin(0.5, 0);
    this.container.add(title);

    const subtitle = this.scene.add.text(w / 2, py + 56, "Tune the feel of the lab.", {
      fontSize: "12px",
      color: APP_THEME.colors.textMuted,
      fontFamily: APP_THEME.fonts.body,
    }).setOrigin(0.5, 0);
    this.container.add(subtitle);

    const audioRow = this.createSettingRow(px + 24, py + 110, panelW - 48, "Audio");
    const hapticRow = this.createSettingRow(px + 24, py + 166, panelW - 48, "Haptics");
    const musicModeRow = this.createSettingRow(px + 24, py + 222, panelW - 48, "Music Mode");
    const trackRow = this.createSettingRow(px + 24, py + 278, panelW - 48, "Track");
    this.audioValue = audioRow.value;
    this.hapticValue = hapticRow.value;
    this.musicModeValue = musicModeRow.value;
    this.trackValue = trackRow.value;

    audioRow.zone.on("pointerdown", () => {
      const save = loadSave();
      updatePreferences({ audioEnabled: !save.preferences.audioEnabled });
      playCue("ui_toggle");
      this.refresh();
      refreshSceneMusic(this.scene);
    });

    hapticRow.zone.on("pointerdown", () => {
      const save = loadSave();
      const next = !save.preferences.hapticsEnabled;
      updatePreferences({ hapticsEnabled: next });
      if (next) triggerHaptic("soft");
      playCue("ui_toggle");
      this.refresh();
    });

    musicModeRow.zone.on("pointerdown", () => {
      const save = loadSave();
      updatePreferences({ musicMode: save.preferences.musicMode === "shuffle" ? "selected" : "shuffle" });
      playCue("ui_toggle");
      this.refresh();
      refreshSceneMusic(this.scene);
    });

    trackRow.zone.on("pointerdown", () => {
      const save = loadSave();
      const selectable = getSelectableTracks(save);
      if (selectable.length === 0) return;
      const current = selectable.findIndex((track) => track.id === save.preferences.selectedTrackId);
      const next = selectable[(current + 1 + selectable.length) % selectable.length] ?? selectable[0];
      updatePreferences({ selectedTrackId: next.id });
      playCue("ui_toggle");
      this.refresh();
      if (loadSave().preferences.musicMode === "selected") {
        refreshSceneMusic(this.scene);
      }
    });

    this.musicHint = this.scene.add.text(w / 2, py + 334, "", {
      fontSize: "11px",
      color: APP_THEME.colors.textMuted,
      fontFamily: APP_THEME.fonts.body,
      align: "center",
      wordWrap: { width: panelW - 56 },
      lineSpacing: 5,
    }).setOrigin(0.5, 0);

    this.container.add([
      audioRow.bg, audioRow.label, audioRow.value, audioRow.zone,
      hapticRow.bg, hapticRow.label, hapticRow.value, hapticRow.zone,
      musicModeRow.bg, musicModeRow.label, musicModeRow.value, musicModeRow.zone,
      trackRow.bg, trackRow.label, trackRow.value, trackRow.zone,
      this.musicHint,
    ]);

    const closeButton = addButton(this.scene, w / 2, py + panelH - 34, "Done", () => {
      this.hide();
    }, { style: "primary", w: 140, h: 44, fontSize: "14px", depth: 710 });
    this.container.add(closeButton);

    this.refresh();
  }

  private createSettingRow(x: number, y: number, width: number, label: string): {
    bg: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    value: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Rectangle;
  } {
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x112238, 0.86);
    bg.fillRoundedRect(x, y, width, 42, 14);
    bg.lineStyle(1, 0xffffff, 0.08);
    bg.strokeRoundedRect(x, y, width, 42, 14);

    const labelText = this.scene.add.text(x + 14, y + 10, label, {
      fontSize: "14px",
      color: APP_THEME.colors.textPrimary,
      fontFamily: APP_THEME.fonts.body,
      fontStyle: "600",
    });

    const valueText = this.scene.add.text(x + width - 14, y + 10, "", {
      fontSize: "13px",
      color: APP_THEME.colors.accent,
      fontFamily: APP_THEME.fonts.body,
      fontStyle: "700",
    }).setOrigin(1, 0);

    const zone = this.scene.add.rectangle(x + width / 2, y + 21, width, 42)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.001);

    return { bg, label: labelText, value: valueText, zone };
  }

  private refresh(): void {
    const save = loadSave();
    this.audioValue.setText(save.preferences.audioEnabled ? "ON" : "OFF");
    this.hapticValue.setText(save.preferences.hapticsEnabled ? "ON" : "OFF");
    this.musicModeValue.setText(save.preferences.musicMode === "shuffle" ? "SHUFFLE" : "SELECTED");

    const selected = getSelectableTracks(save).find((track) => track.id === save.preferences.selectedTrackId);
    this.trackValue.setText(selected ? selected.title : "Starter Mix");

    const nextUnlock = getNextMusicUnlock(save);
    const bossHint = "Boss stages use Boss Level automatically by default. Beat any boss once to unlock it for general play.";
    if (nextUnlock) {
      this.musicHint.setText(`${bossHint}\nNext unlock: ${nextUnlock.title} at ${nextUnlock.score.toLocaleString()} total score.`);
    } else {
      this.musicHint.setText(`${bossHint}\nAll score-based tracks unlocked.`);
    }
  }

  show(): void {
    this.refresh();
    this.visible = true;
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
