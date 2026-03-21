// ═══════════════════════════════════════════════════
// tests/sim/metrics.test.ts — Star computation
// Bio Defence v4.0
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { computeStars, computeScore } from "@sim/metrics";
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
function wonCleared(
  turn: number,
  turnLimit: number,
  parTurns = 5,
  tools = { ...emptyInventory(), penicillin: 1 },
): GameState {
  const state = createGameState(mkSpec({ turnLimit, parTurns, tools }));
  state.turn = turn;
  state.result = "win";
  // board has no seeds → 0 pathogens already
  return state;
}

/** Create a won state with pathogens still alive */
function wonContained(
  turn: number,
  turnLimit: number,
  parTurns = 5,
  tools = emptyInventory(),
): GameState {
  const state = createGameState(mkSpec({ turnLimit, parTurns, tools }));
  state.turn = turn;
  state.result = "win";
  // Place a pathogen so board is NOT cleared
  setTile(state.board, 1, 1, pathogenTile("coccus"));
  return state;
}

describe("computeStars", () => {
  // 3 stars: completed within par and with unused tools left
  // 2 stars: completed within par
  // 1 star: objective complete but over par

  it("returns 0 when not a win", () => {
    const state = createGameState(mkSpec());
    state.result = "playing";
    expect(computeStars(state)).toBe(0);
  });

  it("returns 3 stars when the level is won within par and tools remain", () => {
    expect(computeStars(wonCleared(3, 10, 5, { ...emptyInventory(), penicillin: 2 }))).toBe(3);
  });

  it("returns 2 stars when the level is won within par but no tools remain", () => {
    expect(computeStars(wonCleared(5, 10, 5, emptyInventory()))).toBe(2);
  });

  it("returns 1 star when the level is won over par", () => {
    expect(computeStars(wonContained(8, 10, 5, { ...emptyInventory(), penicillin: 3 }))).toBe(1);
  });

  it("computeScore uses par turns rather than turn limit for bonuses", () => {
    const fast = wonCleared(4, 12, 6, { ...emptyInventory(), penicillin: 2 });
    const slow = wonCleared(7, 12, 6, { ...emptyInventory(), penicillin: 2 });
    expect(computeScore(fast)).toBeGreaterThan(computeScore(slow));
  });
});
