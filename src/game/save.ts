// ═══════════════════════════════════════════════════
// src/game/save.ts — Centralized save/load for progress
// Bio Defence v7.0: Stars, scores, player profile, persistence
// ═══════════════════════════════════════════════════

const SAVE_VERSION = 3;

export type MusicMode = "shuffle" | "selected";

export interface SavePreferences {
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  musicMode: MusicMode;
  selectedTrackId: string | null;
  onboardingSeen: number[];
  lastSelectedWorld: number;
  lastPlayedLevel: number | null;
}

export interface SaveData {
  version: number;
  stars: Record<number, number>;   // levelId → best stars (1-3)
  scores: Record<number, number>;  // levelId → best score
  playerName: string;              // display name (empty until set)
  playerId: string;                // stable UUID for this device
  preferences: SavePreferences;
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
    preferences: {
      audioEnabled: true,
      hapticsEnabled: true,
      musicMode: "shuffle",
      selectedTrackId: "glitch_in_the_petri_dish",
      onboardingSeen: [],
      lastSelectedWorld: 1,
      lastPlayedLevel: null,
    },
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
  if (raw.preferences && typeof raw.preferences === "object") {
    const prefs = raw.preferences as Record<string, unknown>;
    save.preferences = {
      audioEnabled: typeof prefs.audioEnabled === "boolean" ? prefs.audioEnabled : true,
      hapticsEnabled: typeof prefs.hapticsEnabled === "boolean" ? prefs.hapticsEnabled : true,
      musicMode: prefs.musicMode === "selected" ? "selected" : "shuffle",
      selectedTrackId: typeof prefs.selectedTrackId === "string" ? prefs.selectedTrackId : "glitch_in_the_petri_dish",
      onboardingSeen: Array.isArray(prefs.onboardingSeen) ? prefs.onboardingSeen.map(Number).filter(Number.isFinite) : [],
      lastSelectedWorld: typeof prefs.lastSelectedWorld === "number" ? prefs.lastSelectedWorld : 1,
      lastPlayedLevel: typeof prefs.lastPlayedLevel === "number" ? prefs.lastPlayedLevel : null,
    };
  }
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
          preferences: {
            audioEnabled: typeof (parsed.preferences as Record<string, unknown> | undefined)?.audioEnabled === "boolean"
              ? Boolean((parsed.preferences as Record<string, unknown>).audioEnabled)
              : true,
            hapticsEnabled: typeof (parsed.preferences as Record<string, unknown> | undefined)?.hapticsEnabled === "boolean"
              ? Boolean((parsed.preferences as Record<string, unknown>).hapticsEnabled)
              : true,
            musicMode: (parsed.preferences as Record<string, unknown> | undefined)?.musicMode === "selected"
              ? "selected"
              : "shuffle",
            selectedTrackId: typeof (parsed.preferences as Record<string, unknown> | undefined)?.selectedTrackId === "string"
              ? String((parsed.preferences as Record<string, unknown>).selectedTrackId)
              : "glitch_in_the_petri_dish",
            onboardingSeen: Array.isArray((parsed.preferences as Record<string, unknown> | undefined)?.onboardingSeen)
              ? ((parsed.preferences as Record<string, unknown>).onboardingSeen as unknown[]).map(Number).filter(Number.isFinite)
              : [],
            lastSelectedWorld: typeof (parsed.preferences as Record<string, unknown> | undefined)?.lastSelectedWorld === "number"
              ? Number((parsed.preferences as Record<string, unknown>).lastSelectedWorld)
              : 1,
            lastPlayedLevel: typeof (parsed.preferences as Record<string, unknown> | undefined)?.lastPlayedLevel === "number"
              ? Number((parsed.preferences as Record<string, unknown>).lastPlayedLevel)
              : null,
          },
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
  save.preferences.lastPlayedLevel = levelId;
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

export function updatePreferences(patch: Partial<SavePreferences>): SaveData {
  const save = loadSave();
  save.preferences = { ...save.preferences, ...patch };
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
