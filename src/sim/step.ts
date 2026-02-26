// ═══════════════════════════════════════════════════
// src/sim/step.ts — Turn engine (Directional Growth)
// Bio Defence v5.0: Chess-Piece Spread
//
// Each pathogen/medicine type spreads in a unique
// directional pattern (range-1, simultaneous):
//   Bacteria / Antibiotic  → Cardinal (Rook)
//   Virus   / Antiviral    → Knight L-jumps (Knight)
//   Fungus  / Antifungal   → Diagonal (Bishop)
//
// Each generation (simultaneous, from snapshot):
//   BIRTH: empty cell gains a pathogen/medicine if any
//     cell of that type has this cell in its growth dirs.
//     DEAD ZONE: if both pathogen and medicine want the
//     same cell, it stays empty.
//   SURVIVAL: a cell survives if ≥1 same-type ally is
//     visible in its growth pattern. Isolated cells die.
//     OVERWHELM: a pathogen also dies if ≥ OVERWHELM_THRESHOLD
//     countering-medicine cells are in its growth dirs.
//     SUFFOCATION: a pathogen also dies if it cannot produce
//     ANY new growth — every growth direction is either
//     blocked (wall/OOB/occupied) or would form a dead zone.
//     Medicine also dies when age ≥ MEDICINE_LIFESPAN.
// ═══════════════════════════════════════════════════

import type { Board, Tile, GameState, Action, PathogenType, MedicineType, LevelSpec } from "./types";
import {
  MEDICINE_LIFESPAN, GENS_PER_TURN,
  INFECTION_LOSE_PCT,
  PATHOGEN_GROWTH, MEDICINE_GROWTH,
  OVERWHELM_THRESHOLD, MAX_CHILDREN_PER_CELL,
  COUNTERED_BY,
  ALL_PATHOGEN_TYPES, ALL_MEDICINE_TYPES, ALL_TOOL_IDS,
} from "./constants";
import {
  coords, inBounds, idx, emptyTile, pathogenTile, medicineTile,
  cloneTile, infectionPct, getTile, setTile,
} from "./board";
import { canPlaceTool, applyTool } from "./tools";
import { checkObjective } from "./objectives";
import { computeStars } from "./metrics";

// ── Public API ───────────────────────────────────

/** Apply a player action in the current turn. Does NOT advance turn. */
export function applyAction(state: GameState, action: Action): boolean {
  if (state.isOver) return false;
  switch (action.type) {
    case "place_tool": {
      if (state.toolsUsedThisTurn >= state.toolsPerTurn) return false;
      if (!canPlaceTool(state, action.tool, action.x, action.y)) return false;
      applyTool(state, action.tool, action.x, action.y);
      state.toolsUsedThisTurn++;
      return true;
    }
    case "switch": {
      if (state.switchesUsedThisTurn >= state.switchesPerTurn) return false;
      const { fromX, fromY, toX, toY } = action;
      const from = getTile(state.board, fromX, fromY);
      const to = getTile(state.board, toX, toY);
      // Source must be a medicine or wall the player placed; target must be empty
      if (from.kind !== "medicine" && from.kind !== "wall") return false;
      if (to.kind !== "empty") return false;
      // Perform the swap
      setTile(state.board, toX, toY, from);
      setTile(state.board, fromX, fromY, to);
      state.switchesUsedThisTurn++;
      return true;
    }
    case "skip":
      return true;
  }
}

/**
 * Advance to the next turn. Runs GENS_PER_TURN generations
 * of directional growth, then evaluates win/lose.
 * Optionally applies toolGrant from the level spec.
 */
export function advanceTurn(state: GameState, spec?: LevelSpec): GameState {
  if (state.isOver) return state;

  state.turn++;
  state.toolsUsedThisTurn = 0;
  state.switchesUsedThisTurn = 0;
  // Per-turn tool grant (drip-feed tools each turn)
  if (spec?.toolGrant) {
    const g = spec.toolGrant;
    for (const k of ALL_TOOL_IDS) {
      state.tools[k] += g[k];
    }
  }

  for (let g = 0; g < GENS_PER_TURN; g++) {
    runGeneration(state.board);
  }

  phaseEvaluate(state);
  return state;
}

/** Full turn: apply actions then advance. Convenience wrapper. */
export function executeTurn(state: GameState, actions: Action[], spec?: LevelSpec): GameState {
  for (const a of actions) applyAction(state, a);
  return advanceTurn(state, spec);
}

/**
 * Run a single generation (exposed for UI animation —
 * LevelScene can call this once per tick for visual stepping).
 *
 * Phase 1: Resolve all births & survival deterministically.
 * Phase 2: Growth pruning — each parent pathogen cell may only
 *   spawn up to MAX_CHILDREN_PER_CELL new cells. If a parent
 *   has more eligible children, a seeded-random subset is kept.
 *   A child that ANY parent keeps survives.
 */
export function runGeneration(board: Board): void {
  const { w, h, tiles } = board;

  // ── Phase 1: deterministic resolution ─────────
  const next: Tile[] = new Array(tiles.length);
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const [x, y] = coords(w, i);

    if (tile.kind === "wall") {
      next[i] = cloneTile(tile);
      continue;
    }

    if (tile.kind === "empty") {
      next[i] = resolveBirth(tiles, w, h, x, y);
      continue;
    }

    // Living cell (pathogen or medicine) — check survival
    next[i] = resolveSurvival(tiles, w, h, x, y, tile);
  }

  // ── Phase 2: growth pruning (pathogens only) ──
  // Find all newly born pathogen cells
  const born = new Set<number>();
  for (let i = 0; i < next.length; i++) {
    if (tiles[i].kind === "empty" && next[i].kind === "pathogen") {
      born.add(i);
    }
  }

  if (born.size > 0) {
    // For each existing parent pathogen, decide which children it keeps
    const kept = new Set<number>();

    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].kind !== "pathogen" || !tiles[i].pathogenType) continue;

      const ptype = tiles[i].pathogenType!;
      const dirs = PATHOGEN_GROWTH[ptype];
      const maxC = MAX_CHILDREN_PER_CELL[ptype];
      const [px, py] = coords(w, i);

      // Collect this parent's children (born cells in its growth dirs)
      const children: number[] = [];
      for (const [dx, dy] of dirs) {
        const nx = px + dx, ny = py + dy;
        if (!inBounds(w, h, nx, ny)) continue;
        const ni = idx(w, nx, ny);
        if (born.has(ni) && next[ni].pathogenType === ptype) {
          children.push(ni);
        }
      }

      if (children.length <= maxC) {
        // All children fit within the limit
        for (const c of children) kept.add(c);
      } else {
        // Randomly select maxC children using a deterministic seed
        const selected = seededSelectN(children, maxC,
          px * 7919 + py * 104729 + born.size * 31);
        for (const c of selected) kept.add(c);
      }
    }

    // Revert un-kept born pathogens to empty
    for (const bi of born) {
      if (!kept.has(bi)) {
        next[bi] = emptyTile();
      }
    }
  }

  board.tiles = next;
}

/**
 * Seeded deterministic selection of N items from an array.
 * Uses a linear congruential generator for fast, reproducible shuffling.
 */
function seededSelectN(items: number[], n: number, seed: number): number[] {
  const arr = [...items];
  let s = (seed >>> 0) || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = (s >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

// ── Growth direction helpers ─────────────────────

/** Get growth directions for a pathogen type */
function getPathogenDirs(ptype: PathogenType): [number, number][] {
  return PATHOGEN_GROWTH[ptype];
}

/** Get growth directions for a medicine type */
function getMedicineDirs(mtype: MedicineType): [number, number][] {
  return MEDICINE_GROWTH[mtype];
}

/**
 * Check if any cell of the given pathogen type in the snapshot
 * can grow into (x, y) — i.e. (x, y) is in some pathogen's
 * growth pattern. Since all patterns are symmetric, we just
 * check the same offsets around (x, y).
 */
function hasPathogenParent(
  tiles: Tile[], w: number, h: number,
  x: number, y: number, ptype: PathogenType,
): boolean {
  for (const [dx, dy] of getPathogenDirs(ptype)) {
    const nx = x + dx, ny = y + dy;
    if (!inBounds(w, h, nx, ny)) continue;
    const n = tiles[idx(w, nx, ny)];
    if (n.kind === "pathogen" && n.pathogenType === ptype) return true;
  }
  return false;
}

/**
 * Check if any cell of the given medicine type in the snapshot
 * can grow into (x, y).
 */
function hasMedicineParent(
  tiles: Tile[], w: number, h: number,
  x: number, y: number, mtype: MedicineType,
): boolean {
  for (const [dx, dy] of getMedicineDirs(mtype)) {
    const nx = x + dx, ny = y + dy;
    if (!inBounds(w, h, nx, ny)) continue;
    const n = tiles[idx(w, nx, ny)];
    if (n.kind === "medicine" && n.medicineType === mtype) return true;
  }
  return false;
}

// ── Birth resolution for empty cells ─────────────

function resolveBirth(
  tiles: Tile[], w: number, h: number, x: number, y: number,
): Tile {
  // Check which pathogen types want to grow here
  let pathWants: PathogenType | null = null;
  for (const ptype of ALL_PATHOGEN_TYPES) {
    if (hasPathogenParent(tiles, w, h, x, y, ptype)) {
      pathWants = ptype;
      break; // first match wins (multi-type conflicts → first found)
    }
  }

  // Check which medicine types want to grow here
  let medWants: MedicineType | null = null;
  for (const mtype of ALL_MEDICINE_TYPES) {
    if (hasMedicineParent(tiles, w, h, x, y, mtype)) {
      medWants = mtype;
      break;
    }
  }

  // Dead zone: both pathogen and medicine want this cell → stays empty
  if (pathWants !== null && medWants !== null) {
    return emptyTile();
  }

  if (pathWants !== null) return pathogenTile(pathWants);
  if (medWants !== null) return medicineTile(medWants);
  return emptyTile();
}

// ── Survival resolution for living cells ─────────

function resolveSurvival(
  tiles: Tile[], w: number, h: number,
  x: number, y: number, tile: Tile,
): Tile {
  // ── Medicine survival ──
  if (tile.kind === "medicine") {
    if (tile.age >= MEDICINE_LIFESPAN) return emptyTile();

    const mtype = tile.medicineType!;
    const dirs = getMedicineDirs(mtype);
    let allyCount = 0;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(w, h, nx, ny)) continue;
      const n = tiles[idx(w, nx, ny)];
      if (n.kind === "medicine" && n.medicineType === mtype) allyCount++;
    }
    // Isolated medicine dies
    if (allyCount === 0) return emptyTile();

    const survived = cloneTile(tile);
    survived.age++;
    return survived;
  }

  // ── Pathogen survival ──
  const ptype = tile.pathogenType!;
  const dirs = getPathogenDirs(ptype);
  const counterMed = COUNTERED_BY[ptype];
  let allyCount = 0;
  let medPressure = 0;
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (!inBounds(w, h, nx, ny)) continue;
    const n = tiles[idx(w, nx, ny)];
    if (n.kind === "pathogen" && n.pathogenType === ptype) allyCount++;
    if (n.kind === "medicine" && n.medicineType === counterMed) medPressure++;
  }
  // Isolated pathogen dies
  if (allyCount === 0) return emptyTile();
  // Overwhelmed by medicine — too much pressure kills
  if (medPressure >= OVERWHELM_THRESHOLD[ptype]) return emptyTile();

  // Suffocation: pathogen that can't produce any new growth dies.
  // Check if at least one growth direction leads to an empty cell
  // that is NOT contested by medicine (i.e. not a dead zone).
  let canGrow = false;
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (!inBounds(w, h, nx, ny)) continue;
    const neighbor = tiles[idx(w, nx, ny)];
    if (neighbor.kind !== "empty") continue;
    // Check if any medicine would contest this cell
    let contested = false;
    for (const mt of ALL_MEDICINE_TYPES) {
      if (hasMedicineParent(tiles, w, h, nx, ny, mt)) {
        contested = true;
        break;
      }
    }
    if (!contested) {
      canGrow = true;
      break;
    }
  }
  if (!canGrow) return emptyTile();

  const survived = cloneTile(tile);
  survived.age++;
  return survived;
}

// ── Evaluate ─────────────────────────────────────

/**
 * Evaluate win/lose conditions after all generations have run.
 * Exported so the UI can call it after animated per-gen stepping.
 */
export function phaseEvaluate(state: GameState): void {
  const pct = infectionPct(state.board);
  if (pct > state.peakInfectionPct) state.peakInfectionPct = pct;

  // Check overrun
  if (pct >= INFECTION_LOSE_PCT) {
    state.isOver = true;
    state.result = "lose";
    return;
  }

  // Check turn limit
  if (state.turnLimit > 0 && state.turn >= state.turnLimit) {
    const objResult = checkObjective(state);
    if (objResult !== "win") {
      state.isOver = true;
      state.result = "lose";
      return;
    }
  }

  // Check objective (win or lose, e.g. contain threshold breach)
  const objResult = checkObjective(state);
  if (objResult === "lose") {
    state.isOver = true;
    state.result = "lose";
    return;
  }
  if (objResult === "win") {
    state.isOver = true;
    state.result = "win";
    state.stars = computeStars(state);
  }
}
