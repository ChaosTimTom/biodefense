// ═══════════════════════════════════════════════════
// src/sim/constants.ts — All game constants
// Bio Defence v6.0: 9 Pathogens · 9 Medicines · 4 Worlds
//
// Each pathogen/medicine type spreads in a unique
// directional pattern — like chess pieces:
//
// Bacteria family (orthogonal):
//   Coccus / Penicillin       → Cardinal ±1 (Rook step)
//   Bacillus / Tetracycline   → Cardinal ±2 (Cannon leap)
//   Spirillum / Streptomycin  → Narrow Knight [±1,±2]
//
// Virus family (L-shape jumpers):
//   Influenza / Tamiflu       → Full Knight [±1,±2][±2,±1]
//   Retrovirus / Zidovudine   → Wide Knight [±2,±1]
//   Phage / Interferon        → Camel [±1,±3][±3,±1]
//
// Fungus family (diagonal):
//   Mold / Fluconazole        → Diagonal ±1 (Bishop step)
//   Yeast / Nystatin          → Diagonal ±2 (Long diagonal)
//   Spore / Amphotericin      → Diagonal ±3 (Spore launch)
// ═══════════════════════════════════════════════════

import type { MedicineType, PathogenType, ToolId } from "./types";

// ── Enumeration arrays ───────────────────────────

export const ALL_PATHOGEN_TYPES: PathogenType[] = [
  "coccus", "bacillus", "spirillum",
  "influenza", "retrovirus", "phage",
  "mold", "yeast", "spore",
];

export const ALL_MEDICINE_TYPES: MedicineType[] = [
  "penicillin", "tetracycline", "streptomycin",
  "tamiflu", "zidovudine", "interferon",
  "fluconazole", "nystatin", "amphotericin",
];

export const ALL_TOOL_IDS: ToolId[] = [...ALL_MEDICINE_TYPES, "wall"];

// ── Directional growth patterns ──────────────────

/** Cardinal ±1 — Rook step (Coccus / Penicillin) */
export const CARDINAL_1: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

/** Cardinal ±2 — Cannon leap (Bacillus / Tetracycline) */
export const CARDINAL_2: [number, number][] = [
  [2, 0], [-2, 0], [0, 2], [0, -2],
];

/** Narrow Knight [±1,±2] — (Spirillum / Streptomycin) */
export const NARROW_KNIGHT: [number, number][] = [
  [1, 2], [1, -2], [-1, 2], [-1, -2],
];

/** Full Knight [±1,±2][±2,±1] — 8 dirs (Influenza / Tamiflu) */
export const FULL_KNIGHT: [number, number][] = [
  [1, 2], [1, -2], [-1, 2], [-1, -2],
  [2, 1], [2, -1], [-2, 1], [-2, -1],
];

/** Wide Knight [±2,±1] — (Retrovirus / Zidovudine) */
export const WIDE_KNIGHT: [number, number][] = [
  [2, 1], [2, -1], [-2, 1], [-2, -1],
];

/** Camel [±1,±3][±3,±1] — 8 dirs (Phage / Interferon) */
export const CAMEL: [number, number][] = [
  [1, 3], [1, -3], [-1, 3], [-1, -3],
  [3, 1], [3, -1], [-3, 1], [-3, -1],
];

/** Diagonal ±1 — Bishop step (Mold / Fluconazole) */
export const DIAGONAL_1: [number, number][] = [
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** Diagonal ±2 — Long diagonal (Yeast / Nystatin) */
export const DIAGONAL_2: [number, number][] = [
  [2, 2], [2, -2], [-2, 2], [-2, -2],
];

/** Diagonal ±3 — Spore launch (Spore / Amphotericin) */
export const DIAGONAL_3: [number, number][] = [
  [3, 3], [3, -3], [-3, 3], [-3, -3],
];

/** Backward-compat alias used by board.ts neighbor helpers */
export const ORTHO_DIRS = CARDINAL_1;

// Legacy aliases for transition (used in old tests / imports)
export const CARDINAL_DIRS = CARDINAL_1;
export const DIAGONAL_DIRS = DIAGONAL_1;
export const KNIGHT_DIRS = FULL_KNIGHT;

/** Growth pattern lookup by pathogen type */
export const PATHOGEN_GROWTH: Record<PathogenType, [number, number][]> = {
  coccus: CARDINAL_1,
  bacillus: CARDINAL_2,
  spirillum: NARROW_KNIGHT,
  influenza: FULL_KNIGHT,
  retrovirus: WIDE_KNIGHT,
  phage: CAMEL,
  mold: DIAGONAL_1,
  yeast: DIAGONAL_2,
  spore: DIAGONAL_3,
};

/** Growth pattern lookup by medicine type (mirrors its target) */
export const MEDICINE_GROWTH: Record<MedicineType, [number, number][]> = {
  penicillin: CARDINAL_1,
  tetracycline: CARDINAL_2,
  streptomycin: NARROW_KNIGHT,
  tamiflu: FULL_KNIGHT,
  zidovudine: WIDE_KNIGHT,
  interferon: CAMEL,
  fluconazole: DIAGONAL_1,
  nystatin: DIAGONAL_2,
  amphotericin: DIAGONAL_3,
};

// ── Timing ───────────────────────────────────────

/** How many gens a medicine cell lives before expiring (999 ≈ permanent) */
export const MEDICINE_LIFESPAN = 999;

/** Number of simultaneous generations per player turn */
export const GENS_PER_TURN = 1;

/** Board overrun threshold — lose when infection reaches this % */
export const INFECTION_LOSE_PCT = 50;

/**
 * Medicine overwhelm threshold.
 * If a pathogen has ≥ this many countering-medicine cells
 * in its growth directions, it dies regardless of allies.
 * - 4-dir types:  2 of 4 → overwhelmed
 * - 8-dir types:  3 of 8 → overwhelmed
 */
export const OVERWHELM_THRESHOLD: Record<PathogenType, number> = {
  coccus: 2, bacillus: 2, spirillum: 2,      // 4-dir → 2
  influenza: 3, phage: 3,                     // 8-dir → 3
  retrovirus: 2, mold: 2, yeast: 2, spore: 2, // 4-dir → 2
};

// ── Type relationships ───────────────────────────

/** Which medicine type counters which pathogen */
export const COUNTERS: Record<MedicineType, PathogenType> = {
  penicillin: "coccus",
  tetracycline: "bacillus",
  streptomycin: "spirillum",
  tamiflu: "influenza",
  zidovudine: "retrovirus",
  interferon: "phage",
  fluconazole: "mold",
  nystatin: "yeast",
  amphotericin: "spore",
};

/** Reverse lookup: which medicine counters this pathogen? */
export const COUNTERED_BY: Record<PathogenType, MedicineType> = {
  coccus: "penicillin",
  bacillus: "tetracycline",
  spirillum: "streptomycin",
  influenza: "tamiflu",
  retrovirus: "zidovudine",
  phage: "interferon",
  mold: "fluconazole",
  yeast: "nystatin",
  spore: "amphotericin",
};

// ── Star rating ──────────────────────────────────
// Computed in metrics.ts:
// 3★ = all pathogens cleared before turn limit
// 2★ = all pathogens cleared on final turn
// 1★ = survived (contained) but pathogens remain

/** Animation timing (ms) */
export const ANIM = {
  spread: 200,
  kill: 250,
  toolPlace: 150,
  burst: 400,
  genTick: 300,
  winSequence: 1200,
  loseSequence: 800,
  turnTransition: 100,
};
