// ═══════════════════════════════════════════════════
// src/sim/preview.ts — Preview helpers for UI
// Bio Defence v5.0: Directional Growth
//
// Shows empty cells where pathogens WILL BIRTH next
// generation — any empty cell that has a pathogen
// parent in its growth-direction pattern.
// ═══════════════════════════════════════════════════

import type { GameState, PathogenType } from "./types";
import { coords, inBounds, idx } from "./board";
import { PATHOGEN_GROWTH } from "./constants";

/**
 * Returns coordinates of empty cells where at least one
 * pathogen type can grow into next generation.
 * Used to show threat highlights so the player can plan.
 */
export function previewSpreadTargets(state: GameState): [number, number][] {
  const { w, h, tiles } = state.board;
  const results: [number, number][] = [];

  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].kind !== "empty") continue;
    const [x, y] = coords(w, i);

    if (wouldBirthPathogen(tiles, w, h, x, y)) {
      results.push([x, y]);
    }
  }

  return results;
}

/** Check if any pathogen type has a parent that can grow into (x, y). */
function wouldBirthPathogen(
  tiles: import("./types").Tile[], w: number, h: number,
  x: number, y: number,
): boolean {
  const pathTypes: PathogenType[] = ["bacteria", "virus", "fungus"];

  for (const ptype of pathTypes) {
    const dirs = PATHOGEN_GROWTH[ptype];
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(w, h, nx, ny)) continue;
      const n = tiles[idx(w, nx, ny)];
      if (n.kind === "pathogen" && n.pathogenType === ptype) return true;
    }
  }

  return false;
}
