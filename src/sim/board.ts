// ═══════════════════════════════════════════════════
// src/sim/board.ts — Board creation and helpers
// Bio Defence v3: Simple tiles, no diffusion layers
// ═══════════════════════════════════════════════════

import type {
  Board, Tile, TileKind, PathogenType, MedicineType,
  LevelSpec, GameState,
} from "./types";
import { ORTHO_DIRS } from "./constants";

// ── Tile factories ───────────────────────────────

export function emptyTile(): Tile {
  return { kind: "empty", pathogenType: null, medicineType: null, age: 0 };
}

export function wallTile(): Tile {
  return { kind: "wall", pathogenType: null, medicineType: null, age: 0 };
}

export function pathogenTile(type: PathogenType): Tile {
  return { kind: "pathogen", pathogenType: type, medicineType: null, age: 0 };
}

export function medicineTile(type: MedicineType): Tile {
  return { kind: "medicine", pathogenType: null, medicineType: type, age: 0 };
}

// ── Board creation ───────────────────────────────

export function createBoard(spec: LevelSpec): Board {
  const { w, h } = spec.grid;
  const tiles = new Array<Tile>(w * h);
  for (let i = 0; i < tiles.length; i++) tiles[i] = emptyTile();
  for (const [x, y] of spec.walls) tiles[y * w + x] = wallTile();
  for (const seed of spec.seeds) tiles[seed.y * w + seed.x] = pathogenTile(seed.type);
  return { w, h, tiles };
}

export function createGameState(spec: LevelSpec): GameState {
  return {
    levelId: spec.id,
    turn: 0,
    board: createBoard(spec),
    tools: { ...spec.tools },
    objective: spec.objective,
    toolsUsedThisTurn: 0,
    toolsPerTurn: spec.toolsPerTurn,
    turnLimit: spec.turnLimit,
    peakInfectionPct: 0,
    isOver: false,
    result: "playing",
    stars: 0,
  };
}

// ── Coordinate helpers ───────────────────────────

export function idx(w: number, x: number, y: number): number {
  return y * w + x;
}

export function coords(w: number, i: number): [number, number] {
  return [i % w, Math.floor(i / w)];
}

export function inBounds(w: number, h: number, x: number, y: number): boolean {
  return x >= 0 && x < w && y >= 0 && y < h;
}

// ── Get / Set ────────────────────────────────────

export function getTile(board: Board, x: number, y: number): Tile {
  return board.tiles[idx(board.w, x, y)];
}

export function setTile(board: Board, x: number, y: number, tile: Tile): void {
  board.tiles[idx(board.w, x, y)] = tile;
}

// ── Clone ────────────────────────────────────────

export function cloneTile(t: Tile): Tile {
  return { ...t };
}

export function cloneBoard(b: Board): Board {
  return { w: b.w, h: b.h, tiles: b.tiles.map(cloneTile) };
}

export function cloneState(s: GameState): GameState {
  return { ...s, board: cloneBoard(s.board), tools: { ...s.tools } };
}

// ── Counting ─────────────────────────────────────

export function countPathogens(board: Board): number {
  let n = 0;
  for (const t of board.tiles) if (t.kind === "pathogen") n++;
  return n;
}

export function countMedicine(board: Board): number {
  let n = 0;
  for (const t of board.tiles) if (t.kind === "medicine") n++;
  return n;
}

export function countPlayable(board: Board): number {
  let n = 0;
  for (const t of board.tiles) if (t.kind !== "wall") n++;
  return n;
}

export function infectionPct(board: Board): number {
  const p = countPlayable(board);
  return p === 0 ? 0 : (countPathogens(board) / p) * 100;
}

// ── Neighbor helpers ─────────────────────────────

export function getNeighbors(
  board: Board, x: number, y: number,
): { x: number; y: number; tile: Tile }[] {
  const results: { x: number; y: number; tile: Tile }[] = [];
  for (const [dx, dy] of ORTHO_DIRS) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(board.w, board.h, nx, ny)) {
      results.push({ x: nx, y: ny, tile: getTile(board, nx, ny) });
    }
  }
  return results;
}

export function countAdjacentOfKind(
  board: Board, x: number, y: number, kind: TileKind,
): number {
  let count = 0;
  for (const [dx, dy] of ORTHO_DIRS) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(board.w, board.h, nx, ny) && getTile(board, nx, ny).kind === kind) count++;
  }
  return count;
}
