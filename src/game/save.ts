// ═══════════════════════════════════════════════════
// src/game/save.ts — Centralized save/load for progress
// Bio Defence v7.0: Stars, scores, player profile, persistence
// ═══════════════════════════════════════════════════

const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  stars: Record<number, number>;   // levelId → best stars (1-3)
  scores: Record<number, number>;  // levelId → best score
  playerName: string;              // display name (empty until set)
  playerId: string;                // stable UUID for this device
}

const SAVE_KEY = "bio_defence_save";

function generateId(): string {
  // Simple UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function freshSave(): SaveData {
  return {
    version: SAVE_VERSION,
    stars: {},
    scores: {},
    playerName: "",
    playerId: generateId(),
  };
}

/** Migrate older save formats to current version */
function migrate(raw: Record<string, unknown>): SaveData {
  const save = freshSave();
  // v0 (no version field): had stars + scores only
  if (raw.stars && typeof raw.stars === "object") {
    save.stars = raw.stars as Record<number, number>;
  }
  if (raw.scores && typeof raw.scores === "object") {
    save.scores = raw.scores as Record<number, number>;
  }
  // v1 fields
  if (typeof raw.playerName === "string") save.playerName = raw.playerName;
  if (typeof raw.playerId === "string") save.playerId = raw.playerId;
  save.version = SAVE_VERSION;
  return save;
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if ((parsed.version as number) === SAVE_VERSION) {
        return {
          version: SAVE_VERSION,
          stars: (parsed.stars ?? {}) as Record<number, number>,
          scores: (parsed.scores ?? {}) as Record<number, number>,
          playerName: (parsed.playerName as string) ?? "",
          playerId: (parsed.playerId as string) || generateId(),
        };
      }
      // Old format → migrate
      return migrate(parsed);
    }
  } catch { /* ignore corrupt data */ }
  return freshSave();
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

/** Update the player's display name */
export function setPlayerName(name: string): SaveData {
  const save = loadSave();
  save.playerName = name.trim().substring(0, 20);
  saveSave(save);
  return save;
}

// ── Derived stats helpers ──

export function totalStars(save: SaveData): number {
  return Object.values(save.stars).reduce((a, b) => a + b, 0);
}

export function totalScore(save: SaveData): number {
  return Object.values(save.scores).reduce((a, b) => a + b, 0);
}

export function levelsCompleted(save: SaveData): number {
  return Object.keys(save.stars).length;
}

export function highestLevel(save: SaveData): number {
  const ids = Object.keys(save.stars).map(Number);
  return ids.length ? Math.max(...ids) : 0;
}

export function bestLevelScore(save: SaveData): { levelId: number; score: number } | null {
  let best: { levelId: number; score: number } | null = null;
  for (const [id, score] of Object.entries(save.scores)) {
    if (!best || score > best.score) {
      best = { levelId: Number(id), score };
    }
  }
  return best;
}
