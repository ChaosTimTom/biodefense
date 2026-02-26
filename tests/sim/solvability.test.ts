/**
 * Solvability tests — v5.1 (Simulation-Validated Levels)
 *
 * Verifies that the procedural level generator produces structurally
 * valid, playable levels for World 1. The core guarantee: every level
 * MUST lose without player intervention (doing nothing always loses).
 */
import { describe, it, expect } from "vitest";
import { generateWorld } from "@sim/generator";
import { createGameState } from "@sim/board";
import { advanceTurn, applyAction } from "@sim/step";
import {
  CARDINAL_DIRS,
  KNIGHT_DIRS,
  DIAGONAL_DIRS,
  PATHOGEN_GROWTH,
  COUNTERED_BY,
} from "@sim/constants";
import type { LevelSpec, PathogenType, GameState, ToolId } from "@sim/types";

// ── Helpers ─────────────────────────────────────────

/** Flood-fill reachable empty cells from a starting position */
function floodFill(
  w: number,
  h: number,
  wallSet: Set<string>,
  startX: number,
  startY: number,
): Set<string> {
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];
  const key = (x: number, y: number) => `${x},${y}`;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const k = key(x, y);
    if (visited.has(k)) continue;
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    if (wallSet.has(k)) continue;
    visited.add(k);
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return visited;
}

function wallSet(spec: LevelSpec): Set<string> {
  const s = new Set<string>();
  for (const [x, y] of spec.walls) s.add(`${x},${y}`);
  return s;
}

// ── Generate once (deterministic) ───────────────────

const world1 = generateWorld(1);

// ── Structural validity ─────────────────────────────

describe("Generator structural validity (World 1)", () => {
  it("generates exactly 50 levels", () => {
    expect(world1).toHaveLength(50);
  });

  it("each level has a unique sequential id", () => {
    const ids = world1.map((l) => l.id);
    expect(ids).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("each level has required fields", () => {
    for (const spec of world1) {
      expect(spec.world).toBe(1);
      expect(spec.grid.w).toBeGreaterThanOrEqual(8);
      expect(spec.grid.h).toBeGreaterThanOrEqual(8);
      expect(spec.seeds.length).toBeGreaterThanOrEqual(2);
      expect(spec.title).toBeTruthy();
      expect(spec.objective.type).toBe("contain");
      if (spec.objective.type === "contain") {
        expect(spec.objective.maxPct).toBeGreaterThanOrEqual(10);
        expect(spec.objective.maxPct).toBeLessThanOrEqual(60);
      }
      expect(spec.turnLimit).toBeGreaterThanOrEqual(3);
    }
  });

  it("all seeds are placed on non-wall cells within bounds", () => {
    for (const spec of world1) {
      const ws = wallSet(spec);
      for (const seed of spec.seeds) {
        expect(seed.x).toBeGreaterThanOrEqual(0);
        expect(seed.x).toBeLessThan(spec.grid.w);
        expect(seed.y).toBeGreaterThanOrEqual(0);
        expect(seed.y).toBeLessThan(spec.grid.h);
        expect(ws.has(`${seed.x},${seed.y}`)).toBe(false);
      }
    }
  });

  it("no two seeds share the same position", () => {
    for (const spec of world1) {
      const positions = new Set<string>();
      for (const seed of spec.seeds) {
        const key = `${seed.x},${seed.y}`;
        expect(positions.has(key)).toBe(false);
        positions.add(key);
      }
    }
  });

  it("tools are provided for every pathogen type in each level", () => {
    for (const spec of world1) {
      const types = new Set(spec.seeds.map((s) => s.type));
      for (const t of types) {
        expect(spec.tools[COUNTERED_BY[t]]).toBeGreaterThan(0);
      }
    }
  });

  it("each seed pair has growth-reachable space via its pathogen type", () => {
    for (const spec of world1) {
      const ws = wallSet(spec);
      for (const seed of spec.seeds) {
        const dirs = PATHOGEN_GROWTH[seed.type];
        // Verify at least one growth-direction neighbor is not a wall
        let hasOpen = false;
        for (const [dx, dy] of dirs) {
          const nx = seed.x + dx, ny = seed.y + dy;
          if (nx < 0 || nx >= spec.grid.w || ny < 0 || ny >= spec.grid.h) continue;
          if (!ws.has(`${nx},${ny}`)) { hasOpen = true; break; }
        }
        expect(
          hasOpen,
          `Seed at (${seed.x},${seed.y}) type=${seed.type} has no open growth neighbor`,
        ).toBe(true);
      }
    }
  });
});

// ── Determinism ─────────────────────────────────────

describe("Generator determinism", () => {
  it("generateWorld(1) returns identical levels on repeated calls", () => {
    const world1b = generateWorld(1);
    expect(world1b).toHaveLength(world1.length);
    for (let i = 0; i < world1.length; i++) {
      expect(world1b[i].id).toBe(world1[i].id);
      expect(world1b[i].title).toBe(world1[i].title);
      expect(world1b[i].grid).toEqual(world1[i].grid);
      expect(world1b[i].walls).toEqual(world1[i].walls);
      expect(world1b[i].seeds).toEqual(world1[i].seeds);
      expect(world1b[i].tools).toEqual(world1[i].tools);
      expect(world1b[i].objective).toEqual(world1[i].objective);
    }
  });

  it("different worlds produce different levels", () => {
    const world2 = generateWorld(2);
    // Different world seeds must produce different level content
    const l1w1 = world1[0];
    const l1w2 = world2[0];
    // Compare full serialization — seeds, walls, or tools must differ
    expect(JSON.stringify(l1w1)).not.toBe(JSON.stringify(l1w2));
  });
});

// ── Difficulty progression ──────────────────────────

describe("Difficulty progression (World 1)", () => {
  it("grid size generally increases over 50 levels", () => {
    const firstFive = world1.slice(0, 5);
    const lastFive = world1.slice(45, 50);
    const avgAreaFirst =
      firstFive.reduce((s, l) => s + l.grid.w * l.grid.h, 0) / firstFive.length;
    const avgAreaLast =
      lastFive.reduce((s, l) => s + l.grid.w * l.grid.h, 0) / lastFive.length;
    expect(avgAreaLast).toBeGreaterThan(avgAreaFirst);
  });

  it("later levels have more seed pairs or pathogen types", () => {
    const earlySeeds = world1[0].seeds.length;
    const lateSeeds = world1[49].seeds.length;
    const earlyTypes = new Set(world1[0].seeds.map((s) => s.type)).size;
    const lateTypes = new Set(world1[49].seeds.map((s) => s.type)).size;
    expect(lateSeeds >= earlySeeds || lateTypes >= earlyTypes).toBe(true);
  });

  it("level 50 (boss) is among the largest grids", () => {
    const bossArea = world1[49].grid.w * world1[49].grid.h;
    const areas = world1.map((l) => l.grid.w * l.grid.h);
    const maxArea = Math.max(...areas);
    // Boss should be at least 80% of the max grid area
    expect(bossArea).toBeGreaterThanOrEqual(maxArea * 0.8);
  });
});

// ── Simulation sanity ───────────────────────────────

describe("Simulation sanity on generated levels", () => {
  it("EVERY level loses without player intervention (must-lose guarantee)", () => {
    for (let i = 0; i < world1.length; i++) {
      const spec = world1[i];
      const state = createGameState(spec);
      for (let t = 0; t < spec.turnLimit && !state.isOver; t++) {
        advanceTurn(state, spec);
      }
      expect(
        state.result,
        `Level ${i + 1} "${spec.title}" should lose without intervention`,
      ).toBe("lose");
    }
  });

  it("L1: no placements → pathogens grow and game ends", () => {
    const spec = world1[0];
    const state = createGameState(spec);
    for (let i = 0; i < spec.turnLimit && !state.isOver; i++) {
      advanceTurn(state, spec);
    }
    expect(state.result).not.toBe("win");
  });

  it("L50 (boss): game state initializes without error", () => {
    const spec = world1[49];
    const state = createGameState(spec);
    expect(state.board.h).toBe(spec.grid.h);
    expect(state.board.w).toBe(spec.grid.w);
    expect(state.board.tiles.length).toBe(spec.grid.w * spec.grid.h);
    expect(state.turn).toBe(0);
    expect(state.isOver).toBe(false);
  });

  it("first 5 levels create valid game states", () => {
    for (let i = 0; i < 5; i++) {
      const spec = world1[i];
      const state = createGameState(spec);
      // Seeds should be placed on the board
      for (const seed of spec.seeds) {
        const cell = state.board.tiles[seed.y * spec.grid.w + seed.x];
        expect(cell.kind).toBe("pathogen");
        expect(cell.pathogenType).toBe(seed.type);
      }
    }
  });

  it("a level can be advanced multiple turns without crashing", () => {
    const spec = world1[4]; // Level 5
    const state = createGameState(spec);
    // Place some valid medicine if possible
    for (let turn = 0; turn < 3 && !state.isOver; turn++) {
      advanceTurn(state, spec);
    }
    // Just verify it didn't throw
    expect(state.turn).toBeGreaterThanOrEqual(1);
  });
});
