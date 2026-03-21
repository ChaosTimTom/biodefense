// ═══════════════════════════════════════════════════
// src/sim/metrics.ts — Star rating + numeric scoring
// Bio Defence v6.1
// ═══════════════════════════════════════════════════

import type { GameState } from "./types";
import { countPathogens } from "./board";

/**
 * Compute star rating (1-3) for a won level.
 * ★★★ = completed within par and with unused tools remaining
 * ★★  = completed within par
 * ★   = completed the objective
 */
export function computeStars(state: GameState): number {
  if (state.result !== "win") return 0;

  const withinPar = state.parTurns > 0 ? state.turn <= state.parTurns : true;
  const toolsLeft = Object.values(state.tools).reduce((a, b) => a + b, 0);

  if (withinPar && toolsLeft > 0) return 3;
  if (withinPar) return 2;
  return 1;
}

/**
 * Speed multiplier — rewards finishing with turns to spare.
 *
 * turnsUsedRatio = turnsUsed / turnLimit   (0→1)
 *   ratio ≤ 0.25  →  ×2.0  "Lightning"
 *   ratio ≤ 0.50  →  ×1.6  "Swift"
 *   ratio ≤ 0.75  →  ×1.3  "Quick"
 *   ratio <  1.00  →  ×1.1  "Steady"
 *   ratio =  1.00  →  ×1.0  (used all turns)
 *
 * Compressed from the original ×3 max to ×2 max so hard-fought
 * wins on tight levels don't feel punishing compared to easy ones.
 *
 * Returns { mult, label } for display on the win screen.
 */
export function speedMultiplier(
  turnsUsed: number,
  paceTarget: number,
): { mult: number; label: string } {
  if (paceTarget <= 0) return { mult: 1.0, label: "" };
  const ratio = turnsUsed / paceTarget;
  if (ratio <= 0.25) return { mult: 2.0, label: "⚡ Lightning ×2" };
  if (ratio <= 0.50) return { mult: 1.6, label: "🏃 Swift ×1.6" };
  if (ratio <= 0.75) return { mult: 1.3, label: "💨 Quick ×1.3" };
  if (ratio < 1.00)  return { mult: 1.1, label: "🎯 Steady ×1.1" };
  return { mult: 1.0, label: "" };
}

/**
 * Compute a numeric score for a completed level.
 *
 * Breakdown:
 * - Base clear:        1000 pts (always awarded on win)
 * - Eradication bonus:  500 pts (all pathogens eliminated)
 * - Par bonus:          100 × turns saved under par
 * - Efficiency bonus:    50 × tools remaining in inventory
 * - Infection bonus:     (50 - peakInfection%) × 10 (capped at 0)
 * - Star multiplier:    3★ = 1.5×, 2★ = 1.2×, 1★ = 1.0×
 * - Speed multiplier:   up to ×3 for finishing fast
 *
 * Returns 0 for a loss.
 */
export function computeScore(state: GameState): number {
  if (state.result !== "win") return 0;

  const stars = computeStars(state);
  const cleared = countPathogens(state.board) === 0;
  const parTurns = state.parTurns > 0 ? state.parTurns : state.turn;

  // Base clear points
  let score = 1000;

  // Eradication bonus
  if (cleared) score += 500;

  // Par bonus — reward finishing under par
  const turnsSaved = parTurns - state.turn;
  if (turnsSaved > 0) score += turnsSaved * 100;

  // Efficiency bonus — unused tools
  const toolsLeft = Object.values(state.tools).reduce((a, b) => a + b, 0);
  score += toolsLeft * 50;

  // Low infection bonus — reward keeping infection low
  const infBonus = Math.max(0, Math.round((50 - state.peakInfectionPct) * 10));
  score += infBonus;

  // Star multiplier
  const starMult = stars === 3 ? 1.5 : stars === 2 ? 1.2 : 1.0;
  score = Math.round(score * starMult);

  // Speed multiplier — the big reward for finishing fast
  const { mult: speedMult } = speedMultiplier(state.turn, parTurns);
  score = Math.round(score * speedMult);

  return score;
}
