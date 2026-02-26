// ═══════════════════════════════════════════════════
// src/sim/types.ts — Core types
// Bio Defence v7.0: 9 Pathogens · 9 Medicines · 4 Worlds
// ═══════════════════════════════════════════════════

// ── Cell Types ───────────────────────────────────
export type PathogenType =
  | "coccus" | "bacillus" | "spirillum"          // bacteria family
  | "influenza" | "retrovirus" | "phage"          // virus family
  | "mold" | "yeast" | "spore";                   // fungus family

export type MedicineType =
  | "penicillin" | "tetracycline" | "streptomycin"  // anti-bacteria
  | "tamiflu" | "zidovudine" | "interferon"         // anti-virus
  | "fluconazole" | "nystatin" | "amphotericin";    // anti-fungus

// ── Tools the player can place ───────────────────
export type ToolId = MedicineType | "wall";

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
export type ToolInventory = Record<ToolId, number>;

/** Create a zeroed-out inventory with all tool slots at 0 */
export function emptyInventory(): ToolInventory {
  return {
    penicillin: 0, tetracycline: 0, streptomycin: 0,
    tamiflu: 0, zidovudine: 0, interferon: 0,
    fluconazole: 0, nystatin: 0, amphotericin: 0,
    wall: 0,
  };
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
  switchesPerTurn: number;
  switchesUsedThisTurn: number;
  turnLimit: number;
  peakInfectionPct: number;
  isOver: boolean;
  result: "playing" | "win" | "lose";
  stars: number;
}

// ── Player Actions ───────────────────────────────
export type Action =
  | { type: "place_tool"; tool: ToolId; x: number; y: number }
  | { type: "switch"; fromX: number; fromY: number; toX: number; toY: number }
  | { type: "skip" };
