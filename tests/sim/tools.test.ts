// ═══════════════════════════════════════════════════
// tests/sim/tools.test.ts — Tool placement tests
// Bio Defence v3
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { canPlaceTool, getPlacementFailReason, applyTool } from "@sim/tools";
import { createGameState, getTile } from "@sim/board";
import { emptyInventory } from "@sim/types";
import type { LevelSpec } from "@sim/types";

const mkSpec = (overrides?: Partial<LevelSpec>): LevelSpec => ({
  id: 1,
  world: 1,
  title: "Test",
  hint: "",
  grid: { w: 5, h: 5 },
  walls: [[0, 0]],
  seeds: [{ type: "coccus", x: 2, y: 2 }],
  tools: { ...emptyInventory(), penicillin: 2, tamiflu: 1, fluconazole: 1, wall: 2 },
  toolsPerTurn: 3,
  turnLimit: 10,
  objective: { type: "clear_all" },
  parTurns: 5,
  ...overrides,
});

describe("canPlaceTool / getPlacementFailReason", () => {
  it("allows medicine on empty tile", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "penicillin", 1, 1)).toBe(true);
    expect(getPlacementFailReason(state, "penicillin", 1, 1)).toBeNull();
  });

  it("allows wall on empty tile", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "wall", 1, 1)).toBe(true);
  });

  it("rejects placement on wall tile", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "penicillin", 0, 0)).toBe(false);
    expect(getPlacementFailReason(state, "penicillin", 0, 0)).toBe("Needs empty tile");
  });

  it("rejects placement on pathogen tile", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "penicillin", 2, 2)).toBe(false);
    expect(getPlacementFailReason(state, "penicillin", 2, 2)).toBe("Needs empty tile");
  });

  it("rejects out of bounds", () => {
    const state = createGameState(mkSpec());
    expect(canPlaceTool(state, "penicillin", -1, 0)).toBe(false);
    expect(canPlaceTool(state, "penicillin", 5, 0)).toBe(false);
  });

  it("rejects when no charges left", () => {
    const state = createGameState(mkSpec({
      tools: emptyInventory(),
    }));
    expect(canPlaceTool(state, "penicillin", 1, 1)).toBe(false);
    expect(getPlacementFailReason(state, "penicillin", 1, 1)).toBe("No charges left");
  });
});

describe("applyTool", () => {
  it("places penicillin medicine cell", () => {
    const state = createGameState(mkSpec());
    applyTool(state, "penicillin", 1, 1);
    const tile = getTile(state.board, 1, 1);
    expect(tile.kind).toBe("medicine");
    expect(tile.medicineType).toBe("penicillin");
    expect(tile.age).toBe(0);
    expect(state.tools.penicillin).toBe(1); // 2 → 1
  });

  it("places tamiflu medicine cell", () => {
    const state = createGameState(mkSpec());
    applyTool(state, "tamiflu", 1, 1);
    const tile = getTile(state.board, 1, 1);
    expect(tile.kind).toBe("medicine");
    expect(tile.medicineType).toBe("tamiflu");
    expect(state.tools.tamiflu).toBe(0); // 1 → 0
  });

  it("places wall tile", () => {
    const state = createGameState(mkSpec());
    applyTool(state, "wall", 1, 1);
    const tile = getTile(state.board, 1, 1);
    expect(tile.kind).toBe("wall");
    expect(state.tools.wall).toBe(1); // 2 → 1
  });
});
