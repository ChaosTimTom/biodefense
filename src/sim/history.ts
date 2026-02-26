// ═══════════════════════════════════════════════════
// src/sim/history.ts — Undo / history stack
// Bio Defence v3
// ═══════════════════════════════════════════════════

import type { GameState } from "./types";
import { cloneState } from "./board";

export interface History {
  stack: GameState[];
}

export function createHistory(): History {
  return { stack: [] };
}

export function pushHistory(history: History, state: GameState): void {
  history.stack.push(cloneState(state));
}

export function popHistory(history: History): GameState | null {
  return history.stack.pop() ?? null;
}

export function canUndo(history: History): boolean {
  return history.stack.length > 0;
}

export function clearHistory(history: History): void {
  history.stack.length = 0;
}
