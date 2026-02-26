// ═══════════════════════════════════════════════════
// src/sim/tools.ts — Tool placement
// Bio Defence v3: Place medicine cells or walls
// ═══════════════════════════════════════════════════

import type { GameState, ToolId, MedicineType } from "./types";
import { getTile, setTile, medicineTile, wallTile } from "./board";

export function canPlaceTool(
  state: GameState, tool: ToolId, x: number, y: number,
): boolean {
  return getPlacementFailReason(state, tool, x, y) === null;
}

export function getPlacementFailReason(
  state: GameState, tool: ToolId, x: number, y: number,
): string | null {
  const { board } = state;
  if (x < 0 || x >= board.w || y < 0 || y >= board.h) return "Out of bounds";
  if (state.tools[tool] <= 0) return "No charges left";

  const tile = getTile(board, x, y);

  if (tool === "wall") {
    if (tile.kind !== "empty") return "Needs empty tile";
    return null;
  }

  // Medicine tools: place on empty tiles only
  if (tile.kind !== "empty") return "Needs empty tile";
  return null;
}

export function applyTool(
  state: GameState, tool: ToolId, x: number, y: number,
): void {
  const { board } = state;

  if (tool === "wall") {
    setTile(board, x, y, wallTile());
  } else {
    // ToolId = MedicineType | "wall", so non-wall is a MedicineType
    setTile(board, x, y, medicineTile(tool as MedicineType));
  }

  state.tools[tool]--;
}
