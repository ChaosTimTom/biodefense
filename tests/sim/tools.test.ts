// ═══════════════════════════════════════════════════
// tests/sim/tools.test.ts — Tool placement tests
// Bio Defence v3
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { canPlaceTool, getPlacementFailReason, applyTool } from "@sim/tools";
import { createGameState, getTile } from "@sim/board";
import type { LevelSpec } from "@sim/types";

const mkSpec = (overrides?: Partial<LevelSpec>): LevelSpec => ({
  id: 1,
  world: 1,
  title: "Test",
  hint: "",
  grid: { w: 5, h: 5 },
  walls: [[0, 0]],
  seeds: [{ type: "bacteria", x: 2, y: 2 }],
  tools: { antibiotic: 2, antiviral: 1, antifungal: 1, wall: 2 },
  toolsPerTurn: 3,
  turnLimit: 10,
  objective: { type: "clear_all" },
  parTurns: 5,
  ...overrides,
});

describe("canPlaceTool / getPlacementFailReason", () => {
  it("allows medicine on empty tile", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "antibiotic", 1, 1)).toBe(true);
    expect(getPlacementFailReason(state, "antibiotic", 1, 1)).toBeNull();
  });

  it("allows wall on empty tile", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "wall", 1, 1)).toBe(true);
  });

  it("rejects placement on wall tile", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "antibiotic", 0, 0)).toBe(false);
    expect(getPlacementFailReason(state, "antibiotic", 0, 0)).toBe("Needs empty tile");
  });

  it("rejects placement on pathogen tile", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "antibiotic", 2, 2)).toBe(false);
    expect(getPlacementFailReason(state, "antibiotic", 2, 2)).toBe("Needs empty tile");
  });

  it("rejects out of bounds", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "antibiotic", -1, 0)).toBe(false);
    expect(canPlaceTool(state, "antibiotic", 5, 0)).toBe(false);
  });

  it("rejects when no charges left", () => {
    const state = createGameState(mkSpec({
      tools: { antibiotic: 0, antiviral: 0, antifungal: 0, wall: 0 },
    }));
    expect(canPlaceTool(state, "antibiotic", 1, 1)).toBe(false);
    expect(getPlacementFailReason(state, "antibiotic", 1, 1)).toBe("No charges left");
  });
});

describe("applyTool", () => {
  it("places antibiotic medicine cell", () => {
    const state = createGameState(mkSpec());
    applyTool(state, "antibiotic", 1, 1);
    const tile = getTile(state.board, 1, 1);
    expect(tile.kind).toBe("medicine");
    expect(tile.medicineType).toBe("antibiotic");
    expect(tile.age).toBe(0);
    expect(state.tools.antibiotic).toBe(1); // 2 → 1
  });

  it("places antiviral medicine cell", () => {
    const state = createGameState(mkSpec());
    applyTool(state, "antiviral", 1, 1);
    const tile = getTile(state.board, 1, 1);
    expect(tile.kind).toBe("medicine");
    expect(tile.medicineType).toBe("antiviral");
    expect(state.tools.antiviral).toBe(0); // 1 → 0
  });

  it("places wall tile", () => {
    const state = createGameState(mkSpec());
    applyTool(state, "wall", 1, 1);
    const tile = getTile(state.board, 1, 1);
    expect(tile.kind).toBe("wall");
    expect(state.tools.wall).toBe(1); // 2 → 1
  });
});
