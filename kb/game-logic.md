# Game Logic

> Core turn engine defined in `src/sim/step.ts` (437 lines)  
> Supporting modules: `board.ts`, `objectives.ts`, `tools.ts`, `metrics.ts`, `history.ts`, `preview.ts`

---

## Turn Lifecycle

Each player turn follows this sequence:

```
Player places tools / switches / skips
    ↓
advanceTurn(state, spec?)
    ↓
1. Increment turn counter
2. Reset toolsUsedThisTurn = 0, switchesUsedThisTurn = 0
3. Apply toolGrant (per-turn tool refill from LevelSpec)
    ↓
4. Run GENS_PER_TURN (=1) generations
    ↓
5. phaseEvaluate(state) — check win/lose
```

---

## Actions (`applyAction`)

Players take actions **before** stepping the turn. Multiple actions can be taken per turn (up to `toolsPerTurn`).

### place_tool

```
Validation:
  - Target (x,y) is in bounds
  - Target tile is "empty"
  - Player has ≥1 charge of that tool
  - toolsUsedThisTurn < toolsPerTurn

Effect:
  - Wall → set tile to wallTile()
  - Medicine → set tile to medicineTile(type)
  - Decrement tool inventory count
  - Increment toolsUsedThisTurn
```

### switch

```
Validation:
  - switchesUsedThisTurn < switchesPerTurn (always 1)
  - Source tile is medicine or wall
  - Target tile is empty
  - Source ≠ target

Effect:
  - Swap the two tiles
  - Increment switchesUsedThisTurn
```

Switch allows repositioning already-placed medicine/walls. Crucial for adapting to growth that went in an unexpected direction.

### skip

Always valid. Does nothing. The player must manually step the turn after skipping or placing tools.

---

## Generation Engine (`runGeneration`)

Each generation is a **simultaneous update** — all tiles are evaluated against the current board, and the resulting new board is applied atomically. There are no cascading effects within a single generation.

### Phase 1: Deterministic Resolution

Every tile is evaluated and assigned a next-state:

#### Empty Tiles → Birth

For each empty cell, check ALL pathogen types and ALL medicine types for parents in their growth directions:

```
For each PathoGen type P:
  Does ANY cell in P's growth directions contain a live pathogen of type P?
  → If yes: P "wants" this cell

For each Medicine type M:
  Does ANY cell in M's growth directions contain a live medicine of type M?
  → If yes: M "wants" this cell

Resolution:
  - Only pathogen wants it → cell becomes pathogen
  - Only medicine wants it → cell becomes medicine
  - Both want it → cell stays EMPTY (Dead Zone)
  - Neither wants it → cell stays empty
```

If multiple pathogen types want the same cell, the **first match** in the types array wins. Same for medicine. This is deterministic because the type iteration order is fixed.

**Dead Zones** are the core mechanic: by placing medicine that mirrors a pathogen's growth pattern, the player creates contested cells that block pathogen expansion.

#### Living Tiles → Survival

**Medicine survival:**
- Dies if `age >= MEDICINE_LIFESPAN` (999 — effectively never)
- Dies if **isolated**: no same-type allies exist in any of its growth directions

**Pathogen survival:**
- Dies if **isolated**: no same-type allies exist in any growth direction
- Dies if **overwhelmed**: the number of counter-medicine cells in growth directions ≥ `OVERWHELM_THRESHOLD` for that type
- Dies if **suffocated**: for every growth direction, the target cell is either:
  - Out of bounds, OR
  - A wall, OR
  - Contested by medicine (would be a dead zone), OR
  - Occupied by medicine

  If ALL directions are blocked/contested → the pathogen cannot grow → it dies

**Survivors** increment their `age` by 1.

### Phase 2: Growth Pruning

After Phase 1 resolves all births, the system enforces `MAX_CHILDREN_PER_CELL`:

```
For each cell that existed at the START of this generation:
  Count how many new children (births) it parented
  If children > MAX_CHILDREN_PER_CELL:
    Use seededSelectN() to randomly keep only MAX_CHILDREN allowed
    Revert excess children back to empty
```

This applies independently for pathogen and medicine births.

**`seededSelectN()`** uses a deterministic LCG (Linear Congruential Generator) seeded from the parent cell's coordinates and current generation number. This ensures reproducible outcomes — same board state always produces the same pruning.

### Phase Application

After both phases complete, the computed `nextTiles` array replaces `board.tiles` in one atomic swap.

---

## Evaluation (`phaseEvaluate`)

Called after all generations in a turn complete:

```
1. Track peakInfectionPct = max(peakInfectionPct, current infectionPct)

2. OVERRUN CHECK:
   If infectionPct >= INFECTION_LOSE_PCT (50) → LOSE

3. TURN LIMIT CHECK:
   If turn >= turnLimit:
     → Evaluate objective at final state:
       contain: if pct < maxPct → WIN, else → LOSE
       clear_all: if pathogens == 0 → WIN, else → LOSE
       survive: → WIN (survived all turns)

4. MID-GAME OBJECTIVE CHECK:
   contain: if pct >= maxPct at any point → LOSE
            if pathogens == 0 → WIN (early clear)
   clear_all: if pathogens == 0 → WIN
   survive: (only checked at turn limit)

5. On WIN: compute stars via computeStars()
```

---

## Objective Types

### `contain` (used by all generated levels)

```typescript
{ type: "contain", maxPct: number, maxTurns: number }
```

- **Lose:** infection % reaches or exceeds `maxPct` at any point
- **Win (early):** all pathogens eliminated before turn limit
- **Win (endure):** survive `maxTurns` turns with infection below `maxPct`

The `maxPct` threshold is derived during generation from the level's "no-action peak" infection minus a margin. Typical range: 15–60%.

### `clear_all`

```typescript
{ type: "clear_all" }
```

- **Win:** pathogen count drops to 0
- **Lose:** turn limit reached with pathogens remaining, OR overrun

### `survive`

```typescript
{ type: "survive", maxTurns: number }
```

- **Win:** reach turn `maxTurns`
- **Lose:** overrun (50%+) before reaching the limit

---

## Star Rating

Computed on win by `computeStars()` in `metrics.ts`:

| Stars | Condition |
|-------|-----------|
| **3** ★★★ | All pathogens eliminated AND turn < turnLimit (cleared early) |
| **2** ★★☆ | All pathogens eliminated AND turn == turnLimit (cleared on final turn) |
| **1** ★☆☆ | Survived/contained but pathogens still alive |

### Scoring Formula

`computeScore()` returns a numeric score on win:

```
Base:         1000                                    (always)
Eradication:  + 500                                   (if all pathogens cleared)
Par bonus:    + 100 × max(0, turnLimit - turn - 1)    (turns saved under par)
Efficiency:   + 50 × total remaining tool charges      (unused tools)
Infection:    + max(0, (50 - peakInfectionPct)) × 10   (lower peak = more points)

Score × Star multiplier:
  3★ → × 1.5
  2★ → × 1.2
  1★ → × 1.0
```

Both heroes (total score across all levels) and per-level scores are tracked in save data.

---

## Tool System

### Placement (`tools.ts`)

- `canPlaceTool(state, tool, x, y)` → boolean
- `getPlacementFailReason(state, tool, x, y)` → string | null (human-readable)
- `applyTool(state, tool, x, y)` → mutates board + decrements inventory

Validation checks (in order):
1. `(x, y)` must be in bounds
2. Tool must have ≥1 charge remaining
3. Target tile must be `"empty"`

Walls block growth in all directions (any germ check against a wall cell returns false). Medicine spreads using its pathogen's growth directions and creates dead zones where it contests pathogen growth.

### Tool Grants

Some levels have `toolGrant` — a `ToolInventory` that is added to the player's charges at the start of each turn (inside `advanceTurn`). This replenishes resources on hard levels where initial tools alone aren't enough.

### Switch Mechanic

1 switch allowed per turn. Lets the player swap a placed medicine or wall with an empty cell. Useful for:
- Correcting a misplacement
- Moving medicine to follow a shifting infection front
- Repositioning a wall to open/close a corridor

---

## Undo System (`history.ts`)

Simple stack of deep-cloned `GameState` objects:

```typescript
interface History { stack: GameState[] }

createHistory()                → empty history
pushHistory(h, state)          → deep-clone state, push to stack
popHistory(h): GameState|null  → pop and return last state
canUndo(h): boolean            → stack.length > 0
clearHistory(h)                → empty the stack
```

`LevelScene` pushes to history before each `advanceTurn()`. Undo pops the last state and replaces the current state entirely.

---

## Threat Preview (`preview.ts`)

`previewSpreadTargets(state)` returns `[x, y][]` — coordinates of empty cells where pathogen birth would occur in the next generation:

```
For each empty cell:
  For each pathogen type:
    Check if any cell in that type's growth directions contains a live pathogen
    → If yes and NO medicine also claims it → add to threat list
```

Used by `PreviewOverlay` to show semi-transparent red ghost tiles over threatened cells, helping players plan placements. Toggled with P key.

---

## Board Utilities (`board.ts`)

### Tile Factories

```typescript
emptyTile()            → { kind: "empty", pathogenType: null, medicineType: null, age: 0 }
wallTile()             → { kind: "wall", ... }
pathogenTile(type)     → { kind: "pathogen", pathogenType: type, ... , age: 0 }
medicineTile(type)     → { kind: "medicine", ..., medicineType: type, age: 0 }
```

### Coordinate System

Board tiles stored in a flat 1D array, row-major order:

```
Index = y * boardWidth + x
```

Helper functions:
- `idx(w, x, y)` → flat index
- `coords(w, i)` → `[x, y]` from flat index
- `inBounds(w, h, x, y)` → boolean

### Counting

- `countPathogens(board)` → total pathogen tiles
- `countMedicine(board)` → total medicine tiles
- `countPlayable(board)` → non-wall tiles (empty + pathogen + medicine)
- `infectionPct(board)` → `pathogens / playable × 100`

### Cloning

- `cloneTile(tile)` → shallow copy (tiles are flat objects)
- `cloneBoard(board)` → new tiles array with cloned tiles
- `cloneState(state)` → deep copy of entire GameState (board + tool inventory)

Deep cloning is used by the undo system to snapshot state before each turn.

### Neighbor Helpers

- `getNeighbors(board, x, y)` → orthogonal neighbor tiles (up to 4)
- `countAdjacentOfKind(board, x, y, kind)` → count of matching neighbors

These are used for isolation checks and general board analysis, separate from the growth-direction system.
