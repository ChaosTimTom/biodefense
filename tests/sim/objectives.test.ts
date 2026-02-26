// ═══════════════════════════════════════════════════
// tests/sim/objectives.test.ts — Objective evaluation
// Bio Defence v3
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { checkObjective } from "@sim/objectives";
import { createGameState, setTile, emptyTile, pathogenTile } from "@sim/board";
import { emptyInventory } from "@sim/types";
import type { LevelSpec } from "@sim/types";

function mkSpec(overrides?: Partial<LevelSpec>): LevelSpec {
  return {
    id: 1,
    world: 1,
    title: "Test",
    hint: "",
    grid: { w: 3, h: 3 },
    walls: [],
    seeds: [],
    tools: { ...emptyInventory(), penicillin: 1 },
    toolsPerTurn: 1,
    turnLimit: 10,
    objective: { type: "clear_all" },
    parTurns: 5,
    ...overrides,
  };
}

describe("checkObjective", () => {
  describe("clear_all", () => {
    it("returns 'win' when no pathogens remain", () => {
      const state = createGameState(mkSpec());
      expect(checkObjective(state)).toBe("win");
    });

    it("returns 'playing' when pathogens exist", () => {
      const state = createGameState(mkSpec({
        seeds: [{ type: "coccus", x: 1, y: 1 }],
      }));
      expect(checkObjective(state)).toBe("playing");
    });
  });

  describe("survive", () => {
    it("returns 'playing' before maxTurns", () => {
      const state = createGameState(mkSpec({
        objective: { type: "survive", maxTurns: 5 },
      }));
      state.turn = 3;
      expect(checkObjective(state)).toBe("playing");
    });

    it("returns 'win' at maxTurns", () => {
      const state = createGameState(mkSpec({
        objective: { type: "survive", maxTurns: 5 },
      }));
      state.turn = 5;
      expect(checkObjective(state)).toBe("win");
    });
  });

  describe("contain", () => {
    it("returns 'playing' when below maxPct and before maxTurns", () => {
      const state = createGameState(mkSpec({
        objective: { type: "contain", maxPct: 50, maxTurns: 10 },
        seeds: [{ type: "coccus", x: 1, y: 1 }],
      }));
      state.turn = 3;
      expect(checkObjective(state)).toBe("playing");
    });

    it("returns 'lose' when infection >= maxPct", () => {
      const state = createGameState(mkSpec({
        objective: { type: "contain", maxPct: 30, maxTurns: 10 },
        seeds: [
          { type: "coccus", x: 0, y: 0 },
          { type: "coccus", x: 1, y: 0 },
          { type: "coccus", x: 2, y: 0 },
        ],
      }));
      // 3/9 = 33.3% > 30%
      expect(checkObjective(state)).toBe("lose");
    });

    it("returns 'win' at maxTurns when contained", () => {
      const state = createGameState(mkSpec({
        objective: { type: "contain", maxPct: 50, maxTurns: 5 },
        seeds: [{ type: "coccus", x: 1, y: 1 }],
      }));
      state.turn = 5;
      expect(checkObjective(state)).toBe("win");
    });
  });
});
