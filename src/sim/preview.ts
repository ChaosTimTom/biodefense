// ═══════════════════════════════════════════════════
// src/sim/preview.ts — Preview helpers for UI
// Bio Defence v5.0: Directional Growth
//
// Computes the actual next-turn pathogen births by
// simulating one generation from a cloned state.
// ═══════════════════════════════════════════════════

import type { GameState, PathogenType, ToolId } from "./types";
import { cloneState, coords } from "./board";
import { applyAction, runGeneration } from "./step";

export interface PreviewBirth {
  x: number;
  y: number;
  type: PathogenType;
}

export interface PreviewPlacement {
  tool: ToolId;
  x: number;
  y: number;
}

/**
 * Returns actual pathogen births for the next generation.
 * Optional hypothetical placement lets the UI compare
 * "do nothing" against "place this tool here".
 */
export function previewSpreadTargets(
  state: GameState,
  placement?: PreviewPlacement,
): PreviewBirth[] {
  const base = cloneState(state);
  if (placement) {
    applyAction(base, {
      type: "place_tool",
      tool: placement.tool,
      x: placement.x,
      y: placement.y,
    });
  }

  const before = base.board.tiles.map((tile) => tile.kind);
  runGeneration(base.board);

  const { w, tiles } = base.board;
  const results: PreviewBirth[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (before[i] !== "empty") continue;
    if (tiles[i].kind !== "pathogen" || !tiles[i].pathogenType) continue;

    const [x, y] = coords(w, i);
    results.push({ x, y, type: tiles[i].pathogenType as PathogenType });
  }

  return results;
}
