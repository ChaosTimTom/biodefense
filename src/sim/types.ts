// ═══════════════════════════════════════════════════
// src/sim/types.ts — Core types
// Bio Defence v5.0: Directional growth chess-piece game
// ═══════════════════════════════════════════════════

// ── Cell Types ───────────────────────────────────
export type PathogenType = "bacteria" | "virus" | "fungus";
export type MedicineType = "antibiotic" | "antiviral" | "antifungal";

// ── Tools the player can place ───────────────────
export type ToolId = "antibiotic" | "antiviral" | "antifungal" | "wall";

// ── Tile ─────────────────────────────────────────
export type TileKind = "empty" | "wall" | "pathogen" | "medicine";

export interface Tile {
  kind: TileKind;
  pathogenType: PathogenType | null;
  medicineType: MedicineType | null;
  age: number; // turns since this cell was created (0 = just placed/born)
}

// ── Board ────────────────────────────────────────
export interface Board {
  w: number;
  h: number;
  tiles: Tile[]; // row-major: index = y * w + x
}

// ── Tool Inventory ───────────────────────────────
export interface ToolInventory {
  antibiotic: number;
  antiviral: number;
  antifungal: number;
  wall: number;
}

// ── Objectives ───────────────────────────────────
export type Objective =
  | { type: "clear_all" }
  | { type: "survive"; maxTurns: number }
  | { type: "contain"; maxPct: number; maxTurns: number };

// ── Level Specification ──────────────────────────
export interface LevelSpec {
  id: number;
  world: number;
  title: string;
  hint: string;
  grid: { w: number; h: number };
  walls: [number, number][];
  seeds: Array<{ type: PathogenType; x: number; y: number }>;
  tools: ToolInventory;
  /** Tools added to inventory at the start of each turn (after turn 0) */
  toolGrant?: ToolInventory;
  toolsPerTurn: number;
  turnLimit: number;
  objective: Objective;
  parTurns: number;
}

// ── Runtime Game State ───────────────────────────
export interface GameState {
  levelId: number;
  turn: number;
  board: Board;
  tools: ToolInventory;
  objective: Objective;
  toolsUsedThisTurn: number;
  toolsPerTurn: number;
  turnLimit: number;
  peakInfectionPct: number;
  isOver: boolean;
  result: "playing" | "win" | "lose";
  stars: number;
}

// ── Player Actions ───────────────────────────────
export type Action =
  | { type: "place_tool"; tool: ToolId; x: number; y: number }
  | { type: "skip" };
