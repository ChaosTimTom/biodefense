// ═══════════════════════════════════════════════════
// tests/sim/board.test.ts — Board tests
// Bio Defence v3
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  emptyTile,
  wallTile,
  pathogenTile,
  medicineTile,
  createBoard,
  createGameState,
  idx,
  coords,
  inBounds,
  getTile,
  setTile,
  cloneTile,
  cloneBoard,
  cloneState,
  countPathogens,
  countMedicine,
  countPlayable,
  infectionPct,
  getNeighbors,
  countAdjacentOfKind,
} from "@sim/board";
import { emptyInventory } from "@sim/types";
import type { LevelSpec } from "@sim/types";

const basicSpec: LevelSpec = {
  id: 1,
  world: 1,
  title: "Test",
  hint: "",
  grid: { w: 3, h: 3 },
  walls: [[0, 0]],
  seeds: [{ type: "coccus", x: 1, y: 1 }],
  tools: { ...emptyInventory(), penicillin: 1 },
  toolsPerTurn: 1,
  turnLimit: 10,
  objective: { type: "clear_all" },
  parTurns: 5,
};

describe("Tile factories", () => {
  it("emptyTile", () => {
    const t = emptyTile();
    expect(t.kind).toBe("empty");
    expect(t.pathogenType).toBeNull();
    expect(t.medicineType).toBeNull();
    expect(t.age).toBe(0);
  });

  it("wallTile", () => {
    const t = wallTile();
    expect(t.kind).toBe("wall");
  });

  it("pathogenTile", () => {
    const t = pathogenTile("influenza");
    expect(t.kind).toBe("pathogen");
    expect(t.pathogenType).toBe("influenza");
    expect(t.medicineType).toBeNull();
    expect(t.age).toBe(0);
  });

  it("medicineTile", () => {
    const t = medicineTile("penicillin");
    expect(t.kind).toBe("medicine");
    expect(t.medicineType).toBe("penicillin");
    expect(t.pathogenType).toBeNull();
    expect(t.age).toBe(0);
  });
});

describe("createBoard", () => {
  it("creates board with correct dimensions", () => {
    const board = createBoard(basicSpec);
    expect(board.w).toBe(3);
    expect(board.h).toBe(3);
    expect(board.tiles).toHaveLength(9);
  });

  it("places walls and pathogens", () => {
    const board = createBoard(basicSpec);
    expect(getTile(board, 0, 0).kind).toBe("wall");
    expect(getTile(board, 1, 1).kind).toBe("pathogen");
    expect(getTile(board, 1, 1).pathogenType).toBe("coccus");
    expect(getTile(board, 2, 0).kind).toBe("empty");
  });
});

describe("createGameState", () => {
  it("initializes all state fields", () => {
    const state = createGameState(basicSpec);
    expect(state.levelId).toBe(1);
    expect(state.turn).toBe(0);
    expect(state.tools.penicillin).toBe(1);
    expect(state.toolsUsedThisTurn).toBe(0);
    expect(state.peakInfectionPct).toBe(0);
    expect(state.isOver).toBe(false);
    expect(state.result).toBe("playing");
    expect(state.stars).toBe(0);
  });
});

describe("Coordinate helpers", () => {
  it("idx and coords are inverse", () => {
    expect(idx(5, 3, 2)).toBe(13);
    expect(coords(5, 13)).toEqual([3, 2]);
  });

  it("inBounds", () => {
    expect(inBounds(3, 3, 0, 0)).toBe(true);
    expect(inBounds(3, 3, 2, 2)).toBe(true);
    expect(inBounds(3, 3, -1, 0)).toBe(false);
    expect(inBounds(3, 3, 3, 0)).toBe(false);
  });
});

describe("get/set/clone", () => {
  it("getTile and setTile", () => {
    const board = createBoard(basicSpec);
    setTile(board, 2, 2, wallTile());
    expect(getTile(board, 2, 2).kind).toBe("wall");
  });

  it("cloneTile creates independent copy", () => {
    const t = pathogenTile("coccus");
    const t2 = cloneTile(t);
    t2.age = 5;
    expect(t.age).toBe(0);
  });

  it("cloneBoard creates deep copy", () => {
    const board = createBoard(basicSpec);
    const copy = cloneBoard(board);
    setTile(copy, 1, 1, emptyTile());
    expect(getTile(board, 1, 1).kind).toBe("pathogen");
    expect(getTile(copy, 1, 1).kind).toBe("empty");
  });

  it("cloneState creates deep copy", () => {
    const state = createGameState(basicSpec);
    const copy = cloneState(state);
    copy.turn = 99;
    copy.tools.penicillin = 0;
    expect(state.turn).toBe(0);
    expect(state.tools.penicillin).toBe(1);
  });
});

describe("Counting", () => {
  it("countPathogens", () => {
    const board = createBoard(basicSpec);
    expect(countPathogens(board)).toBe(1);
  });

  it("countMedicine", () => {
    const board = createBoard(basicSpec);
    expect(countMedicine(board)).toBe(0);
    setTile(board, 2, 2, medicineTile("penicillin"));
    expect(countMedicine(board)).toBe(1);
  });

  it("countPlayable excludes walls", () => {
    const board = createBoard(basicSpec);
    expect(countPlayable(board)).toBe(8); // 9 total - 1 wall
  });

  it("infectionPct", () => {
    const board = createBoard(basicSpec);
    // 1 pathogen out of 8 playable = 12.5%
    expect(infectionPct(board)).toBeCloseTo(12.5);
  });
});

describe("Neighbor helpers", () => {
  it("getNeighbors returns ortho neighbors", () => {
    const board = createBoard(basicSpec);
    const nbrs = getNeighbors(board, 1, 1);
    expect(nbrs).toHaveLength(4);
    const positions = nbrs.map(n => `${n.x},${n.y}`).sort();
    expect(positions).toEqual(["0,1", "1,0", "1,2", "2,1"]);
  });

  it("getNeighbors handles corners", () => {
    const board = createBoard(basicSpec);
    const nbrs = getNeighbors(board, 0, 0);
    expect(nbrs).toHaveLength(2);
  });

  it("countAdjacentOfKind", () => {
    const board = createBoard(basicSpec);
    // (1,1) is pathogen, its neighbors are (0,1), (2,1), (1,0), (1,2) — all empty
    // Neighbors of (1,1): (0,1)=empty, (2,1)=empty, (1,0)=empty, (1,2)=empty
    expect(countAdjacentOfKind(board, 1, 1, "empty")).toBe(4);
    expect(countAdjacentOfKind(board, 1, 1, "wall")).toBe(0); // wall at 0,0 is diagonal, not ortho
    expect(countAdjacentOfKind(board, 1, 0, "wall")).toBe(1); // (0,0) IS adjacent to (1,0)
  });
});
