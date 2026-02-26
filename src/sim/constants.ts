// ═══════════════════════════════════════════════════
// src/sim/constants.ts — All game constants
// Bio Defence v5.0: Directional Growth (Chess-Piece)
//
// Each pathogen/medicine type spreads in a unique
// directional pattern — like chess pieces:
//   Bacteria / Antibiotic  → Cardinal (Rook)
//   Virus   / Antiviral    → Knight L-jumps (Knight)
//   Fungus  / Antifungal   → Diagonal (Bishop)
//
// Survival: a cell lives if ≥1 same-type ally is
// visible in its growth pattern. Isolated cells die.
// Dead zones form where pathogen + medicine fronts
// both want to birth into the same empty cell.
// ═══════════════════════════════════════════════════

import type { MedicineType, PathogenType } from "./types";

// ── Directional growth patterns ──────────────────

/** Cardinal directions — Rook-like (bacteria / antibiotic) */
export const CARDINAL_DIRS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

/** Diagonal directions — Bishop-like (fungus / antifungal) */
export const DIAGONAL_DIRS: [number, number][] = [
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

/** Knight L-jump directions — Knight-like (virus / antiviral) */
export const KNIGHT_DIRS: [number, number][] = [
  [1, 2], [1, -2], [-1, 2], [-1, -2],
  [2, 1], [2, -1], [-2, 1], [-2, -1],
];

/** Backward-compat alias used by board.ts neighbor helpers */
export const ORTHO_DIRS = CARDINAL_DIRS;

/** Growth pattern lookup by pathogen type */
export const PATHOGEN_GROWTH: Record<PathogenType, [number, number][]> = {
  bacteria: CARDINAL_DIRS,
  virus: KNIGHT_DIRS,
  fungus: DIAGONAL_DIRS,
};

/** Growth pattern lookup by medicine type (mirrors its target) */
export const MEDICINE_GROWTH: Record<MedicineType, [number, number][]> = {
  antibiotic: CARDINAL_DIRS,
  antiviral: KNIGHT_DIRS,
  antifungal: DIAGONAL_DIRS,
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
 * - 4-dir types (bacteria, fungus):  2 of 4 → overwhelmed
 * - 8-dir type  (virus):             3 of 8 → overwhelmed
 */
export const OVERWHELM_THRESHOLD: Record<PathogenType, number> = {
  bacteria: 2,
  fungus: 2,
  virus: 3,
};

// ── Type relationships ───────────────────────────

/** Which medicine type counters which pathogen */
export const COUNTERS: Record<MedicineType, PathogenType> = {
  antibiotic: "bacteria",
  antiviral: "virus",
  antifungal: "fungus",
};

/** Reverse lookup: which medicine counters this pathogen? */
export const COUNTERED_BY: Record<PathogenType, MedicineType> = {
  bacteria: "antibiotic",
  virus: "antiviral",
  fungus: "antifungal",
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
