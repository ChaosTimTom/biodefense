// ═══════════════════════════════════════════════════
// tests/sim/preview.test.ts — Spread preview
// Bio Defence v3.1: Life-like birth preview
// Shows empty cells where pathogens qualify for birth
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { previewSpreadTargets } from "@sim/preview";
import { createGameState, pathogenTile, setTile, wallTile } from "@sim/board";
import { emptyInventory } from "@sim/types";
import type { LevelSpec } from "@sim/types";

function mkSpec(overrides?: Partial<LevelSpec>): LevelSpec {
  return {
    id: 1,
    world: 1,
    title: "Test",
    hint: "",
    grid: { w: 5, h: 5 },
    walls: [],
    seeds: [],
    tools: emptyInventory(),
    toolsPerTurn: 1,
    turnLimit: 10,
    objective: { type: "clear_all" },
    parTurns: 5,
    ...overrides,
  };
}

describe("previewSpreadTargets", () => {
  it("returns empty array for board with no pathogens", () => {
    const state = createGameState(mkSpec());
    const targets = previewSpreadTargets(state);
    expect(targets).toHaveLength(0);
  });

  it("shows empty cells where coccus pair can birth (B1-2 ortho)", () => {
    const state = createGameState(mkSpec());
    // Coccus pair at (2,2) and (3,2)
    setTile(state.board, 2, 2, pathogenTile("coccus"));
    setTile(state.board, 3, 2, pathogenTile("coccus"));

    const targets = previewSpreadTargets(state);
    // Adjacent empties with 1-2 coccus ortho neighbors should be flagged
    // (1,2), (4,2), (2,1), (2,3), (3,1), (3,3) all have 1 coccus neighbor
    expect(targets.length).toBeGreaterThan(0);
  });

  it("does NOT flag cells with 0 pathogen neighbors", () => {
    const state = createGameState(mkSpec());
    // Single coccus at (0,0) — with B1-2, adjacent cells WILL qualify
    setTile(state.board, 0, 0, pathogenTile("coccus"));

    const targets = previewSpreadTargets(state);
    // (0,0) has ortho neighbors (1,0) and (0,1) — both get 1 coccus neighbor → flagged
    // But (4,4) far away → not flagged
    const hasFarCell = targets.some(([x, y]) => x === 4 && y === 4);
    expect(hasFarCell).toBe(false);
  });

  it("does not include wall tiles as targets", () => {
    const state = createGameState(mkSpec());
    // Coccus pair with wall blocking one direction
    setTile(state.board, 1, 2, pathogenTile("coccus"));
    setTile(state.board, 2, 2, pathogenTile("coccus"));
    setTile(state.board, 3, 2, wallTile());

    const targets = previewSpreadTargets(state);
    const hasWallPos = targets.some(([x, y]) => x === 3 && y === 2);
    expect(hasWallPos).toBe(false);
  });

  it("flags influenza adjacent empties (B1-3 = very aggressive)", () => {
    const state = createGameState(mkSpec());
    // Single influenza at center — with B1-3, ANY adjacent empty is enough
    setTile(state.board, 2, 2, pathogenTile("influenza"));

    const targets = previewSpreadTargets(state);
    // Influenza B1-3: adjacent empties with 1 influenza neighbor → flagged
    expect(targets.length).toBeGreaterThan(0);
  });

  it("mold uses diagonal growth for threat preview", () => {
    const state = createGameState(mkSpec());
    // Two mold cells diagonally adjacent
    setTile(state.board, 2, 2, pathogenTile("mold"));
    setTile(state.board, 3, 3, pathogenTile("mold"));

    const targets = previewSpreadTargets(state);
    // v5.0: Mold grows diagonally. (1,1) is diagonal from (2,2) → flagged.
    // (2,3) is orthogonal from (2,2) and orthogonal from (3,3) → NOT flagged.
    expect(targets.length).toBeGreaterThan(0);
    const has11 = targets.some(([x, y]) => x === 1 && y === 1);
    expect(has11).toBe(true);
    const has23 = targets.some(([x, y]) => x === 2 && y === 3);
    expect(has23).toBe(false);
  });
});
