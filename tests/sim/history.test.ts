// ═══════════════════════════════════════════════════
// tests/sim/history.test.ts — Undo history
// Bio Defence v3
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { createHistory, pushHistory, popHistory, canUndo, clearHistory } from "@sim/history";
import { createGameState, emptyTile } from "@sim/board";
import { emptyInventory } from "@sim/types";
import type { LevelSpec, GameState } from "@sim/types";

function mkSpec(): LevelSpec {
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
  };
}

describe("History", () => {
  it("createHistory returns empty stack", () => {
    const h = createHistory();
    expect(h.stack).toEqual([]);
    expect(canUndo(h)).toBe(false);
  });

  it("pushHistory adds snapshot", () => {
    const h = createHistory();
    const state = createGameState(mkSpec());
    pushHistory(h, state);
    expect(h.stack.length).toBe(1);
    expect(canUndo(h)).toBe(true);
  });

  it("popHistory restores last snapshot", () => {
    const h = createHistory();
    const state = createGameState(mkSpec());
    state.turn = 0;
    pushHistory(h, state);
    state.turn = 1;
    pushHistory(h, state);

    const restored = popHistory(h);
    expect(restored).not.toBeNull();
    expect(restored!.turn).toBe(1);
    expect(h.stack.length).toBe(1);
  });

  it("popHistory returns null when empty", () => {
    const h = createHistory();
    expect(popHistory(h)).toBeNull();
  });

  it("clearHistory empties the stack", () => {
    const h = createHistory();
    const state = createGameState(mkSpec());
    pushHistory(h, state);
    pushHistory(h, state);
    clearHistory(h);
    expect(h.stack.length).toBe(0);
    expect(canUndo(h)).toBe(false);
  });

  it("push creates independent clone (mutation isolation)", () => {
    const h = createHistory();
    const state = createGameState(mkSpec());
    pushHistory(h, state);
    // mutate original
    state.turn = 99;
    const restored = popHistory(h);
    expect(restored!.turn).toBe(0);
  });
});
