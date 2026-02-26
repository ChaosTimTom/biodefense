// ═══════════════════════════════════════════════════
// src/game/save.ts — Centralized save/load for progress
// Bio Defence v6.0: Stars + numeric scores
// ═══════════════════════════════════════════════════

export interface SaveData {
  stars: Record<number, number>;
  scores: Record<number, number>;
}

const SAVE_KEY = "bio_defence_save";

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        stars: parsed.stars ?? {},
        scores: parsed.scores ?? {},
      };
    }
  } catch { /* ignore corrupt data */ }
  return { stars: {}, scores: {} };
}

export function saveSave(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

/** Update a single level's stars + score, keeping best */
export function updateLevelResult(
  levelId: number,
  stars: number,
  score: number,
): SaveData {
  const save = loadSave();
  const prevStars = save.stars[levelId] ?? 0;
  const prevScore = save.scores[levelId] ?? 0;
  if (stars > prevStars) save.stars[levelId] = stars;
  if (score > prevScore) save.scores[levelId] = score;
  saveSave(save);
  return save;
}
