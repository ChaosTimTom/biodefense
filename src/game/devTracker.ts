// ═══════════════════════════════════════════════════
// src/game/devTracker.ts — Dev-mode play session recorder
// Records every action, board state per turn, and outcome.
// Data can be exported as JSON for level design analysis.
//
// Only active when DEV_MODE is true (localhost / dev server).
// ═══════════════════════════════════════════════════

import type { GameState, LevelSpec, Action, ToolId } from "../sim/types";
import { infectionPct, countPathogens } from "../sim/board";

// ── Dev mode gate ────────────────────────────────
// Active on localhost / 127.0.0.1 / Vite dev server (port 3000)
export const DEV_MODE =
  typeof window !== "undefined" &&
  (location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.port === "3000");

// ── Types ────────────────────────────────────────

interface TurnSnapshot {
  turn: number;
  infectionPct: number;        // after generation
  pathogenCount: number;       // after generation
  toolsRemaining: Record<string, number>;
  actionsThisTurn: ActionRecord[];
}

interface ActionRecord {
  type: string;                // "place_tool" | "switch" | "undo"
  tool?: ToolId;
  x?: number;
  y?: number;
  fromX?: number; fromY?: number;
  toX?: number; toY?: number;
  timestamp: number;           // ms since session start
}

interface SessionLog {
  // Level info
  levelId: number;
  world: number;
  levelNum: number;
  title: string;
  gridW: number;
  gridH: number;
  seedCount: number;
  germTypes: string[];
  turnLimit: number;
  parTurns: number;
  objectiveType: string;
  objectiveMaxPct?: number;

  // Session timing
  startedAt: string;           // ISO timestamp
  endedAt: string;
  durationMs: number;

  // Outcome
  result: "win" | "lose" | "abandon";
  turnsUsed: number;
  finalInfectionPct: number;
  peakInfectionPct: number;
  stars: number;
  score: number;

  // Turn-by-turn data
  turns: TurnSnapshot[];

  // Aggregate stats
  totalActions: number;
  totalUndos: number;
  toolsPlaced: Record<string, number>;  // tool → count
  avgActionsPerTurn: number;
  thinkTimeMs: number[];                // time between turns
}

// ── The tracker singleton ────────────────────────

class DevTracker {
  private active = false;
  private sessionStart = 0;
  private lastTurnEnd = 0;
  private currentSession: Partial<SessionLog> = {};
  private currentTurnActions: ActionRecord[] = [];
  private thinkTimes: number[] = [];
  private undoCount = 0;
  private toolsPlacedMap: Record<string, number> = {};
  private allSessions: SessionLog[] = [];

  /** Start tracking a new level play session */
  startSession(spec: LevelSpec): void {
    if (!DEV_MODE) return;
    this.active = true;
    this.sessionStart = performance.now();
    this.lastTurnEnd = this.sessionStart;
    this.currentTurnActions = [];
    this.thinkTimes = [];
    this.undoCount = 0;
    this.toolsPlacedMap = {};

    const germTypes = [...new Set(spec.seeds.map(s => s.type))];

    this.currentSession = {
      levelId: spec.id,
      world: spec.world ?? Math.ceil(spec.id / 50),
      levelNum: ((spec.id - 1) % 50) + 1,
      title: spec.title,
      gridW: spec.grid.w,
      gridH: spec.grid.h,
      seedCount: spec.seeds.length,
      germTypes,
      turnLimit: spec.turnLimit,
      parTurns: spec.parTurns,
      objectiveType: spec.objective.type,
      objectiveMaxPct: spec.objective.type === "contain" ? spec.objective.maxPct : undefined,
      startedAt: new Date().toISOString(),
      turns: [],
      totalActions: 0,
      totalUndos: 0,
    };

    console.log(
      `%c[DevTracker] Session started: W${this.currentSession.world} L${this.currentSession.levelNum} "${spec.title}" (${spec.grid.w}×${spec.grid.h})`,
      "color: #00e5ff; font-weight: bold",
    );
  }

  /** Record a player action (placement, switch, etc.) */
  recordAction(action: Action): void {
    if (!this.active) return;

    const elapsed = performance.now() - this.sessionStart;
    const rec: ActionRecord = {
      type: action.type,
      timestamp: Math.round(elapsed),
    };

    if (action.type === "place_tool") {
      rec.tool = action.tool;
      rec.x = action.x;
      rec.y = action.y;
      this.toolsPlacedMap[action.tool] = (this.toolsPlacedMap[action.tool] ?? 0) + 1;
    } else if (action.type === "switch") {
      rec.fromX = action.fromX;
      rec.fromY = action.fromY;
      rec.toX = action.toX;
      rec.toY = action.toY;
    }

    this.currentTurnActions.push(rec);
    this.currentSession.totalActions = (this.currentSession.totalActions ?? 0) + 1;
  }

  /** Record an undo */
  recordUndo(): void {
    if (!this.active) return;
    this.undoCount++;
    this.currentSession.totalUndos = this.undoCount;

    const elapsed = performance.now() - this.sessionStart;
    this.currentTurnActions.push({
      type: "undo",
      timestamp: Math.round(elapsed),
    });
  }

  /** Snapshot the board state after a turn completes */
  recordTurnEnd(state: GameState): void {
    if (!this.active) return;

    const now = performance.now();
    const thinkTime = Math.round(now - this.lastTurnEnd);
    this.thinkTimes.push(thinkTime);
    this.lastTurnEnd = now;

    const snapshot: TurnSnapshot = {
      turn: state.turn,
      infectionPct: Math.round(infectionPct(state.board) * 10) / 10,
      pathogenCount: countPathogens(state.board),
      toolsRemaining: { ...state.tools },
      actionsThisTurn: [...this.currentTurnActions],
    };

    this.currentSession.turns = this.currentSession.turns ?? [];
    this.currentSession.turns.push(snapshot);
    this.currentTurnActions = [];
  }

  /** End the session (win, lose, or abandon) */
  endSession(
    result: "win" | "lose" | "abandon",
    state: GameState,
    stars: number,
    score: number,
  ): void {
    if (!this.active) return;
    this.active = false;

    const endTime = performance.now();
    const session: SessionLog = {
      ...(this.currentSession as SessionLog),
      endedAt: new Date().toISOString(),
      durationMs: Math.round(endTime - this.sessionStart),
      result,
      turnsUsed: state.turn,
      finalInfectionPct: Math.round(infectionPct(state.board) * 10) / 10,
      peakInfectionPct: Math.round(state.peakInfectionPct * 10) / 10,
      stars,
      score,
      toolsPlaced: { ...this.toolsPlacedMap },
      avgActionsPerTurn: state.turn > 0
        ? Math.round(((this.currentSession.totalActions ?? 0) / state.turn) * 10) / 10
        : 0,
      thinkTimeMs: this.thinkTimes,
    };

    this.allSessions.push(session);
    this._persistToStorage();
    this._syncToServer();

    const icon = result === "win" ? "✅" : result === "lose" ? "❌" : "🚪";
    console.log(
      `%c[DevTracker] ${icon} Session ended: ${result.toUpperCase()} — ` +
      `${state.turn} turns, ${session.finalInfectionPct}% infection, ` +
      `${stars}★ ${score}pts, ${session.durationMs / 1000}s`,
      "color: #ffd740; font-weight: bold",
    );
    console.log("[DevTracker] Full session:", session);
  }

  // ── Storage ──

  private _persistToStorage(): void {
    try {
      const existing = this._loadFromStorage();
      existing.push(this.allSessions[this.allSessions.length - 1]);
      localStorage.setItem("bio_defence_devlog", JSON.stringify(existing));
    } catch { /* localStorage full or unavailable */ }
  }

  private _loadFromStorage(): SessionLog[] {
    try {
      const raw = localStorage.getItem("bio_defence_devlog");
      if (raw) return JSON.parse(raw) as SessionLog[];
    } catch { /* corrupt data */ }
    return [];
  }

  // ── Server sync (auto-saves to Vite dev server file) ──

  private async _syncToServer(): Promise<void> {
    try {
      const sessions = this._loadFromStorage();
      if (sessions.length === 0) return;
      await fetch("/__devlog-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessions, null, 2),
      });
      console.log(`%c[DevTracker] Synced ${sessions.length} sessions to server.`, "color: #76ff03");
    } catch { /* server not available */ }
  }

  // ── Export / Analysis ──

  /** Get all recorded sessions (current run + persisted) */
  getAllSessions(): SessionLog[] {
    return this._loadFromStorage();
  }

  /** Export all dev logs as a downloadable JSON file */
  exportJSON(): void {
    const sessions = this.getAllSessions();
    if (sessions.length === 0) {
      console.warn("[DevTracker] No sessions to export.");
      return;
    }

    const blob = new Blob(
      [JSON.stringify(sessions, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biodefence_devlog_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`%c[DevTracker] Exported ${sessions.length} sessions.`, "color: #00e5ff");
  }

  /** Print a summary table to the console */
  printSummary(): void {
    const sessions = this.getAllSessions();
    if (sessions.length === 0) {
      console.log("[DevTracker] No sessions recorded yet.");
      return;
    }

    console.log(`%c[DevTracker] ${sessions.length} sessions recorded:`, "color: #00e5ff; font-weight: bold");
    console.table(
      sessions.map(s => ({
        level: `W${s.world} L${s.levelNum}`,
        title: s.title,
        result: s.result,
        turns: `${s.turnsUsed}/${s.turnLimit}`,
        stars: s.stars,
        score: s.score,
        peak: `${s.peakInfectionPct}%`,
        actions: s.totalActions,
        undos: s.totalUndos,
        duration: `${(s.durationMs / 1000).toFixed(1)}s`,
      })),
    );

    // Per-level aggregates
    const byLevel = new Map<number, SessionLog[]>();
    for (const s of sessions) {
      const arr = byLevel.get(s.levelId) ?? [];
      arr.push(s);
      byLevel.set(s.levelId, arr);
    }

    console.log("\n%c[DevTracker] Per-level breakdown:", "color: #ffd740");
    for (const [id, runs] of byLevel) {
      const wins = runs.filter(r => r.result === "win").length;
      const losses = runs.filter(r => r.result === "lose").length;
      const avgTurns = runs.reduce((a, r) => a + r.turnsUsed, 0) / runs.length;
      const bestScore = Math.max(...runs.map(r => r.score));
      const first = runs[0];
      console.log(
        `  W${first.world} L${first.levelNum} "${first.title}": ` +
        `${runs.length} attempts (${wins}W/${losses}L), ` +
        `avg ${avgTurns.toFixed(1)} turns, best ${bestScore}pts`,
      );
    }
  }

  /** Clear all stored dev logs */
  clearLogs(): void {
    localStorage.removeItem("bio_defence_devlog");
    this.allSessions = [];
    console.log("[DevTracker] All logs cleared.");
  }
}

// ── Singleton export ──
export const devTracker = new DevTracker();

// ── Expose to browser console for easy access ──
if (DEV_MODE && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>)["devTracker"] = devTracker;
  console.log(
    "%c[Bio Defence] Dev mode active! Available console commands:\n" +
    "  devTracker.printSummary()  — show play session stats\n" +
    "  devTracker.exportJSON()    — download all logs as JSON\n" +
    "  devTracker.clearLogs()     — wipe stored logs",
    "color: #00e5ff; font-size: 12px",
  );
  // Sync any existing localStorage data to server on load
  (devTracker as any)._syncToServer();
}
