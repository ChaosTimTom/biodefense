# Testing

> Framework: Vitest 4.x · Environment: Node (no browser)  
> Location: `tests/sim/` · 8 files · 122 tests  
> Run: `npm test` (single) or `npm run test:watch` (watch mode)

---

## Overview

All tests target the **simulation layer** (`src/sim/`). Because the sim has zero Phaser imports, tests run in plain Node without JSDOM, Canvas polyfills, or any browser mocking. This makes the suite fast and reliable.

The game/presentation layer (`src/game/`) is not unit-tested — it's verified visually during development and via the comprehensive sim test coverage that validates all game logic.

---

## Test Files

### `board.test.ts` — 20 tests

Board creation, tile factories, coordinate helpers, counting, and cloning.

**Coverage areas:**
- `emptyTile()`, `wallTile()`, `pathogenTile()`, `medicineTile()` — produce correct kind/type/age
- `createBoard(spec)` — places walls and seeds at specified coordinates
- `createGameState(spec)` — initializes full state with correct defaults
- `idx(w, x, y)` / `coords(w, i)` — row-major coordinate conversion roundtrips
- `inBounds(w, h, x, y)` — boundary checks (inclusive valid, edges, out-of-bounds)
- `countPathogens()`, `countMedicine()`, `countPlayable()` — correct tile counting
- `infectionPct()` — percentage calculation (including edge case: no playable tiles)
- `cloneTile()`, `cloneBoard()`, `cloneState()` — deep independence (modify clone, verify original unchanged)

### `step.test.ts` — 53 tests

The largest test file. Covers the entire turn engine.

**Coverage areas:**

*Actions:*
- `applyAction` with `place_tool` — valid placement, invalid placement (occupied cell, no charges, out of bounds, tools-per-turn limit)
- `applyAction` with `switch` — valid swap (medicine↔empty, wall↔empty), invalid (medicine↔medicine, switch limit)
- `applyAction` with `skip` — always succeeds
- Action order independence within a turn

*Generation — Birth:*
- Pathogen growth into empty cells from single parent
- Medicine growth into empty cells from single parent
- **Dead zone creation** — pathogen and medicine both want same cell → stays empty
- Multi-type priority — first match wins when multiple types contest
- Growth respects wall blocking
- Birth at board edges (boundary cells)

*Generation — Survival:*
- **Isolation death** — lone pathogen with no allies in growth dirs dies
- **Isolation death (medicine)** — lone medicine with no allies dies
- **Overwhelm death** — pathogen surrounded by enough counter-medicine dies
- Overwhelm thresholds differ by type (2/3/4)
- **Suffocation death** — pathogen with all growth dirs blocked dies
- Suffocation checks contested cells (dead zones count as blocked)
- Survival with at least one open growth direction

*Generation — Pruning:*
- `MAX_CHILDREN_PER_CELL` enforcement — excess children removed
- Pruning is deterministic (same state → same children kept)
- Children kept by ANY parent survive (shared child between two parents)

*Turn advancement:*
- `advanceTurn` increments turn counter
- `advanceTurn` resets `toolsUsedThisTurn` and `switchesUsedThisTurn`
- `advanceTurn` applies `toolGrant` (per-turn refill)
- `advanceTurn` runs correct number of generations (GENS_PER_TURN)
- `phaseEvaluate` detects overrun (≥50%)
- `phaseEvaluate` detects contain win
- `phaseEvaluate` detects contain loss (threshold breach)
- Turn limit triggers final evaluation

### `solvability.test.ts` — 17 tests

Validates the procedural generation system across all 200 levels.

**Coverage areas:**
- All 4 worlds generate exactly 50 levels each
- Every level has a valid `contain` objective
- **Zero fallback levels** — main generator succeeds for all 200
- **Zero duplicate layouts** — cross-world fingerprint dedup confirmed
- Wall density within bounds for every level
- Seed placement successful for every level
- Threshold values within expected ranges
- `simulateNoAction()` confirms every level would be lost without intervention
- Grid dimensions within world config bounds

This is the most important test file — it proves the generation system is robust and all 200 levels are valid.

### `objectives.test.ts` — 7 tests

Win/lose condition evaluation for all three objective types.

**Coverage areas:**
- `clear_all`: pathogens = 0 → win; pathogens > 0 at limit → lose
- `survive`: reach maxTurns → win; overrun before → lose
- `contain`: below threshold at maxTurns → win; exceed threshold → lose; early clear → win
- Edge case: exactly at threshold (≥ maxPct means lose)

### `tools.test.ts` — 9 tests

Tool placement validation and application.

**Coverage areas:**
- `canPlaceTool` — valid empty cell with charges → true
- `canPlaceTool` — occupied cell → false
- `canPlaceTool` — no charges remaining → false
- `canPlaceTool` — out of bounds → false
- `applyTool` — wall placement creates wall tile
- `applyTool` — medicine placement creates medicine tile with correct type
- `applyTool` — decrements tool count in inventory
- `getPlacementFailReason` — returns appropriate message per failure type
- Tool placement respects `toolsPerTurn` limit

### `metrics.test.ts` — 4 tests

Star rating and scoring.

**Coverage areas:**
- 3★ — cleared early (before turn limit)
- 2★ — cleared on final turn
- 1★ — survived but pathogens remain
- Score formula components: base + eradication + par bonus + efficiency + infection bonus, multiplied by star factor

### `history.test.ts` — 6 tests

Undo stack operations.

**Coverage areas:**
- `createHistory()` — empty stack
- `pushHistory` — state is deep-cloned (modifying original doesn't affect stored)
- `popHistory` — returns last pushed state, removes from stack
- `popHistory` on empty stack → null
- `canUndo` — true when stack non-empty, false when empty
- `clearHistory` — empties the stack

### `preview.test.ts` — 6 tests

Threat preview computation.

**Coverage areas:**
- Single pathogen → returns correct growth targets
- Multiple pathogens → union of all targets
- Doesn't include contested cells (would-be dead zones)
- Respects walls (no targets behind walls)
- Empty board → no targets
- Pathogen with no open growth dirs → no targets

---

## Running Tests

```bash
# Single run (CI/CD uses this)
npm test

# Watch mode (development)
npm run test:watch

# Run specific file
npx vitest run tests/sim/step.test.ts

# Run with verbose output
npx vitest run --reporter verbose
```

---

## Test Patterns

### Common Setup

Most tests create a minimal `LevelSpec` and `GameState` directly:

```typescript
const spec: LevelSpec = {
  id: 1, world: 1, title: "Test", hint: "",
  grid: { w: 5, h: 5 },
  walls: [[0,0], [1,0], ...],  // border walls
  seeds: [{ type: "coccus", x: 2, y: 2 }],
  tools: { penicillin: 5, wall: 3, ... },
  toolsPerTurn: 3,
  turnLimit: 10,
  objective: { type: "contain", maxPct: 50, maxTurns: 10 },
  parTurns: 6
};
const state = createGameState(spec);
```

### Determinism Verification

Several step tests verify that running `runGeneration` twice on identical boards produces identical results. This validates the seeded random pruning.

### Deep Clone Verification

History and board tests verify independence by:
1. Push state / clone board
2. Mutate the original
3. Assert the clone is unchanged

---

## Coverage Philosophy

The sim layer has near-100% logical coverage. Key design decisions tested:

| Decision | Verified By |
|----------|-------------|
| Dead zones block both sides | `step.test.ts` — birth with contest |
| Isolation kills lone cells | `step.test.ts` — single pathogen with no allies |
| Overwhelm uses correct thresholds | `step.test.ts` — per-type threshold checks |
| Suffocation includes dead zones | `step.test.ts` — all dirs contested |
| Pruning is deterministic | `step.test.ts` — same state same result |
| All 200 levels are valid | `solvability.test.ts` — comprehensive |
| No duplicate layouts | `solvability.test.ts` — fingerprint check |
| Scoring matches formula | `metrics.test.ts` — component breakdown |
| Undo preserves full state | `history.test.ts` — deep clone verification |

The game layer is left deliberately untested — UI rendering rarely has bugs that unit tests would catch, and the sim coverage guarantees all logical correctness.
