// ═══════════════════════════════════════════════════
// src/sim/metrics.ts — Star rating + numeric scoring
// Bio Defence v6.0
// ═══════════════════════════════════════════════════

import type { GameState } from "./types";
import { countPathogens } from "./board";

/**
 * Compute star rating (1-3) for a won level.
 * ★★★ = all pathogens eliminated before turns run out
 * ★★  = all pathogens eliminated on the final turn
 * ★   = survived (contained) but pathogens remain
 */
export function computeStars(state: GameState): number {
  if (state.result !== "win") return 0;

  const cleared = countPathogens(state.board) === 0;
  const limit = state.turnLimit > 0 ? state.turnLimit : Infinity;

  if (cleared && state.turn < limit) return 3;
  if (cleared) return 2;
  return 1;
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
 *
 * Returns 0 for a loss.
 */
export function computeScore(state: GameState): number {
  if (state.result !== "win") return 0;

  const stars = computeStars(state);
  const cleared = countPathogens(state.board) === 0;
  const limit = state.turnLimit > 0 ? state.turnLimit : state.turn;

  // Base clear points
  let score = 1000;

  // Eradication bonus
  if (cleared) score += 500;

  // Par bonus — reward finishing under par
  const turnsSaved = limit - state.turn;
  if (turnsSaved > 0) score += turnsSaved * 100;

  // Efficiency bonus — unused tools
  const toolsLeft =
    state.tools.antibiotic +
    state.tools.antiviral +
    state.tools.antifungal +
    state.tools.wall;
  score += toolsLeft * 50;

  // Low infection bonus — reward keeping infection low
  const infBonus = Math.max(0, Math.round((50 - state.peakInfectionPct) * 10));
  score += infBonus;

  // Star multiplier
  const multiplier = stars === 3 ? 1.5 : stars === 2 ? 1.2 : 1.0;
  score = Math.round(score * multiplier);

  return score;
}
