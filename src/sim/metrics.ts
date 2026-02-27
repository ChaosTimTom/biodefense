// ═══════════════════════════════════════════════════
// src/sim/metrics.ts — Star rating + numeric scoring
// Bio Defence v6.1
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
 * Speed multiplier — rewards finishing with turns to spare.
 *
 * turnsUsedRatio = turnsUsed / turnLimit   (0→1)
 *   ratio ≤ 0.25  →  ×3.0  "Lightning"
 *   ratio ≤ 0.50  →  ×2.0  "Swift"
 *   ratio ≤ 0.75  →  ×1.5  "Quick"
 *   ratio <  1.00  →  ×1.2  "Steady"
 *   ratio =  1.00  →  ×1.0  (used all turns)
 *
 * Returns { mult, label } for display on the win screen.
 */
export function speedMultiplier(
  turnsUsed: number,
  turnLimit: number,
): { mult: number; label: string } {
  if (turnLimit <= 0) return { mult: 1.0, label: "" }; // no limit → no bonus
  const ratio = turnsUsed / turnLimit;
  if (ratio <= 0.25) return { mult: 3.0, label: "⚡ Lightning ×3" };
  if (ratio <= 0.50) return { mult: 2.0, label: "🏃 Swift ×2" };
  if (ratio <= 0.75) return { mult: 1.5, label: "💨 Quick ×1.5" };
  if (ratio < 1.00)  return { mult: 1.2, label: "🎯 Steady ×1.2" };
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
  const limit = state.turnLimit > 0 ? state.turnLimit : state.turn;

  // Base clear points
  let score = 1000;

  // Eradication bonus
  if (cleared) score += 500;

  // Par bonus — reward finishing under par
  const turnsSaved = limit - state.turn;
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
  const { mult: speedMult } = speedMultiplier(state.turn, state.turnLimit);
  score = Math.round(score * speedMult);

  return score;
}
