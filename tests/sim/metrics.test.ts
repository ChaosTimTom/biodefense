// ═══════════════════════════════════════════════════
// tests/sim/metrics.test.ts — Star computation
// Bio Defence v4.0
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { computeStars } from "@sim/metrics";
import { createGameState, pathogenTile, setTile } from "@sim/board";
import { emptyInventory } from "@sim/types";
import type { LevelSpec, GameState } from "@sim/types";

function mkSpec(overrides?: Partial<LevelSpec>): LevelSpec {
  return {
    id: 1,
    world: 1,
    title: "Test",
    hint: "",
    grid: { w: 3, h: 3 },
    walls: [],
    seeds: [],
    tools: emptyInventory(),
    toolsPerTurn: 1,
    turnLimit: 10,
    objective: { type: "contain", maxPct: 35, maxTurns: 10 },
    parTurns: 5,
    ...overrides,
  };
}

/** Create a won state with board cleared (no pathogens) */
function wonCleared(turn: number, turnLimit: number): GameState {
  const state = createGameState(mkSpec({ turnLimit }));
  state.turn = turn;
  state.result = "win";
  // board has no seeds → 0 pathogens already
  return state;
}

/** Create a won state with pathogens still alive */
function wonContained(turn: number, turnLimit: number): GameState {
  const state = createGameState(mkSpec({ turnLimit }));
  state.turn = turn;
  state.result = "win";
  // Place a pathogen so board is NOT cleared
  setTile(state.board, 1, 1, pathogenTile("coccus"));
  return state;
}

describe("computeStars", () => {
  // 3 stars: all pathogens dead AND turns remaining
  // 2 stars: all pathogens dead on final turn
  // 1 star:  survived (contained) but pathogens remain

  it("returns 0 when not a win", () => {
    const state = createGameState(mkSpec());
    state.result = "playing";
    expect(computeStars(state)).toBe(0);
  });

  it("returns 3 stars when all pathogens cleared early", () => {
    // Cleared with turns to spare
    expect(computeStars(wonCleared(3, 10))).toBe(3);
    expect(computeStars(wonCleared(9, 10))).toBe(3);
  });

  it("returns 2 stars when all pathogens cleared on final turn", () => {
    // Cleared but used all turns
    expect(computeStars(wonCleared(10, 10))).toBe(2);
  });

  it("returns 1 star when survived but pathogens remain", () => {
    // Contained but didn't eliminate everything
    expect(computeStars(wonContained(10, 10))).toBe(1);
    expect(computeStars(wonContained(5, 10))).toBe(1);
  });
});
