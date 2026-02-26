// ═══════════════════════════════════════════════════
// src/sim/objectives.ts — Win condition evaluation
// Bio Defence v3
// ═══════════════════════════════════════════════════

import type { GameState } from "./types";
import { countPathogens, infectionPct } from "./board";

export type ObjectiveResult = "playing" | "win" | "lose";

export function checkObjective(state: GameState): ObjectiveResult {
  const obj = state.objective;

  switch (obj.type) {
    case "clear_all": {
      return countPathogens(state.board) === 0 ? "win" : "playing";
    }
    case "survive": {
      if (state.turn >= obj.maxTurns) return "win";
      return "playing";
    }
    case "contain": {
      const pct = infectionPct(state.board);
      if (pct >= obj.maxPct) return "lose";
      // Early win: all pathogens eliminated — no way to exceed threshold
      if (countPathogens(state.board) === 0) return "win";
      if (state.turn >= obj.maxTurns) return "win";
      return "playing";
    }
    default:
      return "playing";
  }
}
