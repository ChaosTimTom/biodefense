# Save System & Persistence

> Defined in `src/game/save.ts` (119 lines)  
> Storage: `localStorage` key `"bio_defence_save"`

---

## Overview

Player progress is persisted in the browser's `localStorage` as a JSON-serialized object. The system tracks per-level stars and scores, a display name, and a stable device ID. A versioned migration system handles schema changes.

---

## Data Schema

### Version 1 (Current)

```typescript
interface SaveData {
  version: 1;
  stars: Record<number, number>;    // levelId → best stars (1-3)
  scores: Record<number, number>;   // levelId → best score
  playerName: string;               // display name, max 20 chars
  playerId: string;                 // UUID v4, generated on first save
}
```

**Level IDs** are global integers: `(worldNum - 1) * 50 + levelNum`. So World 1 Level 1 = 1, World 2 Level 1 = 51, World 4 Level 50 = 200.

### Default State

A fresh player gets:

```typescript
{
  version: 1,
  stars: {},
  scores: {},
  playerName: "",
  playerId: crypto.randomUUID()   // or uuid v4 fallback
}
```

---

## API

### Core Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `loadSave()` | `→ SaveData` | Load from localStorage, validate, migrate if needed. Returns default state if no save exists or data is corrupt. |
| `saveSave(data)` | `(SaveData) → void` | Serialize and write to localStorage. |
| `updateLevelResult(id, stars, score)` | `(number, number, number) → void` | Load save, update if new stars/score is higher than existing, persist. |
| `setPlayerName(name)` | `(string) → void` | Set display name (truncated to 20 chars), persist. |

### `updateLevelResult` — Best-Of Logic

```typescript
function updateLevelResult(levelId: number, stars: number, score: number): void {
  const save = loadSave();
  const prevStars = save.stars[levelId] ?? 0;
  const prevScore = save.scores[levelId] ?? 0;
  save.stars[levelId] = Math.max(prevStars, stars);   // keep higher stars
  save.scores[levelId] = Math.max(prevScore, score);  // keep higher score
  saveSave(save);
}
```

Stars and scores are tracked independently — a player might get 3★ on one run and a higher score on another with only 2★. Both bests are kept.

### Derived Stats

Helper functions that compute aggregates from save data:

| Function | Returns | Used By |
|----------|---------|---------|
| `totalStars(save)` | Sum of all star values | MenuScene (world unlock), TitleScene, ScoresScene |
| `totalScore(save)` | Sum of all scores | TitleScene hero stat, ScoresScene |
| `levelsCompleted(save)` | Count of entries in `stars` | TitleScene, ScoresScene |
| `highestLevel(save)` | Max level ID with ≥1 star | ScoresScene |
| `bestLevelScore(save)` | `{ levelId, score }` for highest individual score | ScoresScene highlight |

---

## Migration System

### Purpose

When the schema changes, existing saves must be upgraded. The `migrate(raw)` function handles this.

### Version 0 → Version 1

Version 0 saves (from early development) had no `version` field and potentially missing `playerName`/`playerId`:

```typescript
function migrate(raw: any): SaveData {
  if (!raw.version || raw.version < 1) {
    return {
      version: 1,
      stars: raw.stars ?? {},
      scores: raw.scores ?? {},
      playerName: raw.playerName ?? "",
      playerId: raw.playerId ?? generateUUID()
    };
  }
  return raw as SaveData;
}
```

### Adding Future Versions

To add a v2 migration:
1. Add a `version: 2` branch to `migrate()`
2. Transform v1 data to v2 schema
3. Update the `SaveData` interface
4. Bump `SAVE_VERSION` constant

---

## Storage Details

### Key

```
localStorage key: "bio_defence_save"
```

### Read Flow

```
loadSave():
  1. localStorage.getItem("bio_defence_save")
  2. If null → return default SaveData
  3. JSON.parse()
  4. If parse fails → return default SaveData
  5. migrate(parsed) → ensure current schema
  6. Return SaveData
```

### Write Flow

```
saveSave(data):
  1. JSON.stringify(data)
  2. localStorage.setItem("bio_defence_save", json)
```

### Error Handling

- Corrupt JSON → fresh save (no crash)
- Missing fields → migration adds defaults
- localStorage unavailable (incognito/full) → operations silently fail (game still playable, just no persistence)

---

## Integration Points

| Component | Usage |
|-----------|-------|
| **TitleScene** | `loadSave()` → show stats panel (stars, score, levels) |
| **MenuScene** | `totalStars(save)` → world unlock check; per-level stars/scores → button states |
| **LevelScene** | No direct save reads during gameplay |
| **WinScene** | `updateLevelResult()` → persist stars + score on victory |
| **ScoresScene** | Full save data read for comprehensive breakdown |

### Rules Overlay Persistence

Separate from the save system, the RulesOverlay uses its own `localStorage` flag:

```
localStorage key: "bio_defence_rules_seen"
Value: "true" (after first dismissal)
```

This prevents the How-to-Play overlay from auto-showing on every game start.

---

## Data Size

Worst case (all 200 levels completed): ~200 entries in stars + 200 entries in scores + name + id = roughly **2-4 KB** of JSON. Well within localStorage limits (typically 5-10 MB).
