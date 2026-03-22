import { beforeEach, describe, expect, it } from "vitest";

import {
  loadSave,
  saveSave,
  totalScore,
  totalStars,
  updateEndlessResult,
  updateLevelResult,
  updatePreferences,
} from "@game/save";

class LocalStorageMock {
  private store = new Map<string, string>();

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  get length(): number {
    return this.store.size;
  }
}

describe("save persistence", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: new LocalStorageMock(),
      configurable: true,
      writable: true,
    });
  });

  it("creates a fresh save when storage is empty", () => {
    const save = loadSave();
    expect(save.version).toBe(4);
    expect(save.playerId).toBeTruthy();
    expect(totalStars(save)).toBe(0);
    expect(totalScore(save)).toBe(0);
    expect(save.preferences.lastSelectedWorld).toBe(1);
  });

  it("persists best level results and last played level", () => {
    updateLevelResult(7, 2, 1200);
    updateLevelResult(7, 1, 800);
    updateLevelResult(7, 3, 1100);

    const save = loadSave();
    expect(save.stars[7]).toBe(3);
    expect(save.scores[7]).toBe(1200);
    expect(save.preferences.lastPlayedLevel).toBe(7);
  });

  it("persists endless highs and preferences", () => {
    updateEndlessResult(9000, 8);
    updateEndlessResult(8500, 6);
    updatePreferences({
      audioEnabled: false,
      musicMode: "selected",
      selectedTrackId: "boss_level",
    });

    const save = loadSave();
    expect(save.endlessHighScore).toBe(9000);
    expect(save.endlessBestRound).toBe(8);
    expect(save.preferences.audioEnabled).toBe(false);
    expect(save.preferences.musicMode).toBe("selected");
    expect(save.preferences.selectedTrackId).toBe("boss_level");
  });

  it("migrates older saves into the current format", () => {
    saveSave({
      version: 1,
      stars: { 1: 2 },
      scores: { 1: 1500 },
      playerName: "Tester",
      playerId: "abc-123",
      endlessHighScore: 0,
      endlessBestRound: 0,
      preferences: {
        audioEnabled: true,
        hapticsEnabled: false,
        musicMode: "shuffle",
        selectedTrackId: null,
        onboardingSeen: [1, 2],
        lastSelectedWorld: 2,
        lastPlayedLevel: 1,
      },
    });

    const save = loadSave();
    expect(save.version).toBe(4);
    expect(save.stars[1]).toBe(2);
    expect(save.scores[1]).toBe(1500);
    expect(save.preferences.hapticsEnabled).toBe(false);
    expect(save.preferences.lastSelectedWorld).toBe(2);
  });
});
