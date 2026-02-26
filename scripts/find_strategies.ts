/**
 * v4.0 Strategy Finder — Barrier Puzzle
 *
 * Brute-force search for winning medicine placements.
 * Medicine = living wall + pressure source.
 * Pathogens die from overcrowding when confined by barriers.
 *
 * Run: npx tsx scripts/find_strategies.ts
 */
import { createGameState, countPathogens, countMedicine, infectionPct, getTile, countPlayable } from "../src/sim/board";
import { advanceTurn, applyAction, runGeneration } from "../src/sim/step";
import type { LevelSpec, ToolInventory, ToolId, GameState, Board } from "../src/sim/types";

const EMPTY_TOOLS: ToolInventory = {
  antibiotic: 0, antiviral: 0, antifungal: 0, wall: 0,
};

function mkSpec(
  p: Partial<LevelSpec> & Pick<LevelSpec, "id" | "grid" | "walls" | "seeds" | "tools">,
): LevelSpec {
  return {
    world: 1, title: `Level ${p.id}`, hint: "",
    objective: { type: "contain", maxPct: 50, maxTurns: 10 },
    parTurns: 4, toolsPerTurn: 2, turnLimit: 10, ...p,
  };
}

// ── Visualization ──────────────────────────────────

function showBoard(board: Board): void {
  const { w, h, tiles } = board;
  const legend: Record<string, string> = {
    bacteria: "B", virus: "V", fungus: "F",
    antibiotic: "a", antiviral: "v", antifungal: "f",
  };
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const t = tiles[y * w + x];
      if (t.kind === "wall") row += "█";
      else if (t.kind === "empty") row += "·";
      else if (t.kind === "pathogen") row += legend[t.pathogenType!] ?? "?";
      else if (t.kind === "medicine") row += legend[t.medicineType!] ?? "?";
    }
    console.log(`    ${row}`);
  }
}

function showBoardDetailed(board: Board): void {
  const { w, h, tiles } = board;
  const legend: Record<string, string> = {
    bacteria: "B", virus: "V", fungus: "F",
    antibiotic: "a", antiviral: "v", antifungal: "f",
  };
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const t = tiles[y * w + x];
      if (t.kind === "wall") row += " ██";
      else if (t.kind === "empty") row += "  ·";
      else {
        const ch = t.kind === "pathogen"
          ? legend[t.pathogenType!] ?? "?"
          : legend[t.medicineType!] ?? "?";
        row += ` ${ch}${t.age}`;
      }
    }
    console.log(`    ${row}`);
  }
}

// ── Combinatorics ──────────────────────────────────

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

// ── Get empty cells (optionally near pathogens) ────

function getEmptyCells(state: GameState, maxDist = Infinity): [number, number][] {
  const cells: [number, number][] = [];
  const { w, h, tiles } = state.board;

  // Find pathogen positions for distance filtering
  const pathogens: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y * w + x].kind === "pathogen") pathogens.push([x, y]);
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y * w + x].kind !== "empty") continue;
      if (maxDist < Infinity) {
        const minD = pathogens.reduce(
          (min, [px, py]) => Math.min(min, Math.abs(px - x) + Math.abs(py - y)),
          Infinity,
        );
        if (minD > maxDist) continue;
      }
      cells.push([x, y]);
    }
  }
  return cells;
}

// ── Brute-force solver (single-turn placement) ─────

interface Strategy {
  placements: [ToolId, number, number][];
}

function bruteForce(
  spec: LevelSpec,
  opts: { maxDist?: number; maxResults?: number; verbose?: boolean } = {},
): { wins: Strategy[]; checked: number } {
  const { maxDist = Infinity, maxResults = 200, verbose = false } = opts;
  const baseCells = getEmptyCells(createGameState(spec), maxDist);

  // Get available tool types
  const availableTools: ToolId[] = [];
  for (const [tool, count] of Object.entries(spec.tools)) {
    if ((count as number) > 0) availableTools.push(tool as ToolId);
  }

  // Build placement options: (tool, x, y)
  const options: [ToolId, number, number][] = [];
  for (const [x, y] of baseCells) {
    for (const tool of availableTools) {
      options.push([tool, x, y]);
    }
  }

  if (verbose) {
    console.log(`  Options: ${options.length} (${baseCells.length} cells × ${availableTools.length} types)`);
  }

  const wins: Strategy[] = [];
  let checked = 0;

  for (const combo of combinations(options, spec.toolsPerTurn)) {
    // No duplicate cells
    const cellSet = new Set(combo.map(([_, x, y]) => `${x},${y}`));
    if (cellSet.size !== combo.length) continue;

    // Check tool availability
    const usage: Record<string, number> = {};
    let valid = true;
    for (const [tool] of combo) {
      usage[tool] = (usage[tool] || 0) + 1;
      if (usage[tool] > spec.tools[tool as ToolId]) { valid = false; break; }
    }
    if (!valid) continue;

    checked++;

    // Simulate
    const s = createGameState(spec);
    for (const [tool, x, y] of combo) {
      applyAction(s, { type: "place_tool", tool, x, y });
    }
    advanceTurn(s);
    while (!s.isOver && s.turn < spec.turnLimit) {
      advanceTurn(s);
    }

    if (s.result === "win") {
      wins.push({ placements: [...combo] });
      if (wins.length >= maxResults) break;
    }
  }

  return { wins, checked };
}

// ── Try a specific strategy with gen-by-gen viz ─────

function trySolve(
  spec: LevelSpec,
  strategy: Array<Array<[ToolId, number, number]>>,
  verbose = false,
): GameState {
  const state = createGameState(spec);
  if (verbose) {
    console.log(`  Initial: ${countPathogens(state.board)}P / ${countMedicine(state.board)}M / ${infectionPct(state.board).toFixed(1)}% (${countPlayable(state.board)} playable)`);
    showBoard(state.board);
  }
  for (let turn = 0; turn < strategy.length && !state.isOver; turn++) {
    for (const [tool, x, y] of strategy[turn]) {
      const ok = applyAction(state, { type: "place_tool", tool, x, y });
      if (!ok && verbose) console.log(`  ⚠️ FAILED to place ${tool} at (${x},${y}) turn ${turn + 1}`);
    }
    if (verbose) {
      console.log(`  -- After placement (turn ${turn + 1}):`);
      showBoard(state.board);
    }
    advanceTurn(state);
    if (verbose) {
      console.log(`  Turn ${turn + 1}: ${countPathogens(state.board)}P / ${countMedicine(state.board)}M / ${infectionPct(state.board).toFixed(1)}% ${state.result ?? ""}`);
      showBoard(state.board);
    }
  }
  while (!state.isOver && state.turn < spec.turnLimit) {
    advanceTurn(state);
    if (verbose) {
      console.log(`  Auto ${state.turn}: ${countPathogens(state.board)}P / ${countMedicine(state.board)}M / ${infectionPct(state.board).toFixed(1)}% ${state.result ?? ""}`);
    }
  }
  return state;
}

// ── Run gen-by-gen to visualize dynamics ─────────

function genByGen(
  spec: LevelSpec,
  placements: [ToolId, number, number][],
  numGens = 9,
): void {
  const state = createGameState(spec);
  for (const [tool, x, y] of placements) {
    applyAction(state, { type: "place_tool", tool, x, y });
  }
  console.log(`  Gen 0 (after placement): ${countPathogens(state.board)}P / ${countMedicine(state.board)}M`);
  showBoardDetailed(state.board);
  for (let g = 1; g <= numGens; g++) {
    runGeneration(state.board);
    console.log(`  Gen ${g}: ${countPathogens(state.board)}P / ${countMedicine(state.board)}M / ${infectionPct(state.board).toFixed(1)}%`);
    showBoardDetailed(state.board);
  }
}

// ═══════════════════════════════════════════════════
// LEVEL CANDIDATES — v4.0 "Dead Zone" Puzzle Designs
// ═══════════════════════════════════════════════════
// Design philosophy: open boards with narrow choke points.
// Contain check is now CONTINUOUS (every turn end).
// Dead zone = empty cells where both factions want to birth.
// Goal: only 1-10 winning placements per level.

/**
 * L1: "Pinch Point"
 * Open 7×5 board with a one-cell-wide choke in the middle.
 * Bacteria left, must not cross to right side.
 *
 * ·······
 * ·BB·█··
 * ·····██
 * ····█··
 * ·······
 */
const L1 = mkSpec({
  id: 1, grid: { w: 7, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 6,
  objective: { type: "contain", maxPct: 35, maxTurns: 6 },
  walls: [[4,1],[5,2],[6,2],[4,3]],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L2: "Narrow Bridge"
 * Two open areas connected by a 1-cell bridge.
 *
 * ·····█···
 * ·BB··█···
 * ·····█···
 * ████·████
 * ·········
 */
const L2 = mkSpec({
  id: 2, grid: { w: 9, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 6,
  objective: { type: "contain", maxPct: 30, maxTurns: 6 },
  walls: [[5,0],[5,1],[5,2],[0,3],[1,3],[2,3],[3,3],[5,3],[6,3],[7,3],[8,3]],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L3: "Virus Sprint"
 * Virus (B1-3/S1-1) in a long corridor. Explodes fast.
 * Must use antiviral to create dead zone before virus reaches gap.
 *
 * ████████
 * █VV····█
 * ████·███
 * ·····███
 * ········
 */
const L3 = mkSpec({
  id: 3, grid: { w: 8, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 35, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],
    [0,1],[7,1],
    [0,2],[1,2],[2,2],[3,2],[5,2],[6,2],[7,2],
    [5,3],[6,3],[7,3],
  ],
  seeds: [{ type: "virus", x: 1, y: 1 }, { type: "virus", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antiviral: 2 },
});

/**
 * L4: "Type Test"
 * Bacteria with all 3 medicine types available.
 * Only antibiotic creates a stable barrier.
 * Board is open — wrong type = collapse = infection.
 *
 * ·········
 * ·BB······
 * ·········
 * ···█·████
 * ·········
 */
const L4 = mkSpec({
  id: 4, grid: { w: 9, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 6,
  objective: { type: "contain", maxPct: 30, maxTurns: 6 },
  walls: [[3,3],[5,3],[6,3],[7,3],[8,3]],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2, antiviral: 2, antifungal: 2 },
});

/**
 * L5: "Twin Gaps"
 * Room with 2 exits. Only 2 tools — can't seal both directly.
 * Must find positions where one pair's growth covers both gaps.
 *
 * █████████
 * █·BB····█
 * █·······█
 * ██·██·███
 * ·········
 */
const L5 = mkSpec({
  id: 5, grid: { w: 9, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 6,
  objective: { type: "contain", maxPct: 35, maxTurns: 6 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
    [0,1],[8,1],
    [0,2],[8,2],
    [0,3],[1,3],[3,3],[4,3],[6,3],[7,3],[8,3],
  ],
  seeds: [{ type: "bacteria", x: 2, y: 1 }, { type: "bacteria", x: 3, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L6: "Dual Threat"
 * Bacteria AND virus on the same open board.
 * Must pick correct medicine for each.
 *
 * ·········
 * ·BB···VV·
 * ·········
 * ···█·█···
 * ·········
 */
const L6 = mkSpec({
  id: 6, grid: { w: 9, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 6,
  objective: { type: "contain", maxPct: 30, maxTurns: 6 },
  walls: [[3,3],[5,3]],
  seeds: [
    { type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 },
    { type: "virus", x: 6, y: 1 }, { type: "virus", x: 7, y: 1 },
  ],
  tools: { ...EMPTY_TOOLS, antibiotic: 2, antiviral: 2 },
});

/**
 * L7: "Funnel"
 * Bacteria at top of a funnel shape. Narrows toward bottom.
 * Medicine must plug the funnel before bacteria fill it.
 *
 * ·······
 * ·BB···█
 * █·····█
 * ██···██
 * ███·███
 */
const L7 = mkSpec({
  id: 7, grid: { w: 7, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 35, maxTurns: 5 },
  walls: [[6,1],[0,2],[6,2],[0,3],[1,3],[5,3],[6,3],[0,4],[1,4],[2,4],[4,4],[5,4],[6,4]],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L8: "Wide Open"
 * Bacteria in center of open 7×7 board. No walls except border.
 * Must contain spread in ALL directions. Very tight.
 *
 * ·······
 * ·······
 * ···BB··
 * ·······
 * ·······
 */
const L8 = mkSpec({
  id: 8, grid: { w: 7, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 35, maxTurns: 5 },
  walls: [],
  seeds: [{ type: "bacteria", x: 3, y: 2 }, { type: "bacteria", x: 4, y: 2 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L9: "Maze Runner"
 * Complex maze with bacteria. Multiple paths.
 * Only specific placements block all paths.
 *
 * █████████
 * █BB·█···█
 * █···█···█
 * █·███·███
 * █·······█
 * █████████
 */
const L9 = mkSpec({
  id: 9, grid: { w: 9, h: 6 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 6,
  objective: { type: "contain", maxPct: 30, maxTurns: 6 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
    [0,1],[4,1],[8,1],
    [0,2],[4,2],[8,2],
    [0,3],[2,3],[3,3],[4,3],[6,3],[7,3],[8,3],
    [0,4],[8,4],
    [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L10: "Corridor Run"
 * Long narrow corridor. Bacteria at one end.
 * 1 tool per turn. Very few options.
 *
 * █████████████
 * █BB·········█
 * █████████████
 */
const L10 = mkSpec({
  id: 10, grid: { w: 13, h: 3 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 40, maxTurns: 5 },
  walls: [
    ...[...Array(13)].map((_, i) => [i, 0] as [number, number]),
    [0,1],[12,1],
    ...[...Array(13)].map((_, i) => [i, 2] as [number, number]),
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L11: "Bottleneck"
 * Open area that narrows to a 1-cell bottleneck, then opens again.
 *
 * ·····
 * ·BB··
 * █···█
 * ██·██
 * ·····
 * ·····
 */
const L11 = mkSpec({
  id: 11, grid: { w: 5, h: 6 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 35, maxTurns: 5 },
  walls: [[0,2],[4,2],[0,3],[1,3],[3,3],[4,3]],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L12: "Three Paths"
 * Room at top, three exits at bottom. 3 tools.
 *
 * █████████
 * █·BB····█
 * █·······█
 * █·██·██·█
 * █·······█
 * █████████
 */
const L12 = mkSpec({
  id: 12, grid: { w: 9, h: 6 }, toolsPerTurn: 3, parTurns: 2, turnLimit: 6,
  objective: { type: "contain", maxPct: 30, maxTurns: 6 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
    [0,1],[8,1],
    [0,2],[8,2],
    [0,3],[2,3],[3,3],[5,3],[6,3],[8,3],
    [0,4],[8,4],
    [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],
  ],
  seeds: [{ type: "bacteria", x: 2, y: 1 }, { type: "bacteria", x: 3, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 3 },
});

/**
 * L13: "Virus Maze"
 * Virus in a maze. Faster spread, more deadly.
 *
 * █████████
 * █VV·█···█
 * █···█···█
 * █·███···█
 * █·······█
 * █████████
 */
const L13 = mkSpec({
  id: 13, grid: { w: 9, h: 6 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 25, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
    [0,1],[4,1],[8,1],
    [0,2],[4,2],[8,2],
    [0,3],[2,3],[3,3],[4,3],[8,3],
    [0,4],[8,4],
    [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],
  ],
  seeds: [{ type: "virus", x: 1, y: 1 }, { type: "virus", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antiviral: 2 },
});

/**
 * L14: "Diamond"
 * Diamond-shaped board. Bacteria in center. Tight threshold.
 *
 * ··█··
 * ·····
 * ·BB··
 * ·····
 * ··█··
 */
const L14 = mkSpec({
  id: 14, grid: { w: 5, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 30, maxTurns: 5 },
  walls: [[2,0],[2,4]],
  seeds: [{ type: "bacteria", x: 1, y: 2 }, { type: "bacteria", x: 2, y: 2 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L15: "Asymmetric Escape"
 * Room with one narrow exit AND one wide exit.
 *
 * ████████
 * █·BB···█
 * █······█
 * ████·███
 * ··██·██·
 * ········
 */
const L15 = mkSpec({
  id: 15, grid: { w: 8, h: 6 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 35, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],
    [0,1],[7,1],
    [0,2],[7,2],
    [0,3],[1,3],[2,3],[3,3],[5,3],[6,3],[7,3],
    [2,4],[3,4],[5,4],[6,4],
  ],
  seeds: [{ type: "bacteria", x: 2, y: 1 }, { type: "bacteria", x: 3, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

// ═══ TIGHT SMALL LEVELS (precise puzzle design) ════

/**
 * L16: "Small Box"
 * 3×3 interior. Bacteria pair. Very tight threshold.
 *
 * █████
 * █BB·█
 * █···█
 * █···█
 * █████
 */
const L16 = mkSpec({
  id: 16, grid: { w: 5, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 35, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[4,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L17: "Small Box 40%"
 * Same as L16 but 40% threshold (slightly easier).
 */
const L17 = mkSpec({
  id: 17, grid: { w: 5, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 40, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[4,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L18: "Narrow Box"
 * 3×2 interior. Very few options.
 *
 * █████
 * █BB·█
 * █···█
 * █████
 */
const L18 = mkSpec({
  id: 18, grid: { w: 5, h: 4 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 40, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[1,3],[2,3],[3,3],[4,3],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L19: "Center Pair"
 * 4×3 interior. Bacteria centered. Multiple escape routes.
 *
 * ██████
 * █····█
 * █·BB·█
 * █····█
 * ██████
 */
const L19 = mkSpec({
  id: 19, grid: { w: 6, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 30, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [0,1],[5,1],
    [0,2],[5,2],
    [0,3],[5,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],
  ],
  seeds: [{ type: "bacteria", x: 2, y: 2 }, { type: "bacteria", x: 3, y: 2 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L20: "Off-Center"
 * 4×3 interior. Bacteria top-left. Asymmetric dead zone formation.
 *
 * ██████
 * █BB··█
 * █····█
 * █····█
 * ██████
 */
const L20 = mkSpec({
  id: 20, grid: { w: 6, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 30, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [0,1],[5,1],
    [0,2],[5,2],
    [0,3],[5,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L21: "4×4 Open Box"
 * Larger interior but very low threshold.
 *
 * ██████
 * █····█
 * █BB··█
 * █····█
 * █····█
 * ██████
 */
const L21 = mkSpec({
  id: 21, grid: { w: 6, h: 6 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 25, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [0,1],[5,1],
    [0,2],[5,2],
    [0,3],[5,3],
    [0,4],[5,4],
    [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 2 }, { type: "bacteria", x: 2, y: 2 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L22: "Split Bacteria"
 * Two separated bacteria (not pair). Both die from isolation unless they grow.
 * Unique dynamics.
 *
 * █████
 * █B·B█
 * █···█
 * █···█
 * █████
 */
const L22 = mkSpec({
  id: 22, grid: { w: 5, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 35, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[4,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 3, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L23: "Virus Box"
 * Virus pair (B1-3/S1-1) in 3×3 box. Very explosive.
 *
 * █████
 * █VV·█
 * █···█
 * █···█
 * █████
 */
const L23 = mkSpec({
  id: 23, grid: { w: 5, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 30, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[4,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],
  ],
  seeds: [{ type: "virus", x: 1, y: 1 }, { type: "virus", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antiviral: 2 },
});

/**
 * L24: "L-Shape Room"
 * L-shaped interior creates asymmetric growth.
 *
 * ██████
 * █BB·██
 * █···██
 * █····█
 * ██████
 */
const L24 = mkSpec({
  id: 24, grid: { w: 6, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 30, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [0,1],[4,1],[5,1],
    [0,2],[4,2],[5,2],
    [0,3],[5,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2 },
});

/**
 * L25: "1-tool precision"
 * Small box with ONLY 1 tool. Must find THE one position.
 *
 * █████
 * █BB·█
 * █···█
 * █████
 */
const L25 = mkSpec({
  id: 25, grid: { w: 5, h: 4 }, toolsPerTurn: 1, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 50, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[1,3],[2,3],[3,3],[4,3],
  ],
  seeds: [{ type: "bacteria", x: 1, y: 1 }, { type: "bacteria", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 1 },
});

/**
 * L26: "Type Match" — Same as L19 but with all 3 medicine types.
 * Only antibiotic works because it mirrors bacteria growth.
 *
 * ██████
 * █····█
 * █·BB·█
 * █····█
 * ██████
 */
const L26 = mkSpec({
  id: 26, grid: { w: 6, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 30, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],
    [0,1],[5,1],
    [0,2],[5,2],
    [0,3],[5,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],
  ],
  seeds: [{ type: "bacteria", x: 2, y: 2 }, { type: "bacteria", x: 3, y: 2 }],
  tools: { ...EMPTY_TOOLS, antibiotic: 2, antiviral: 2, antifungal: 2 },
});

/**
 * L27: "Virus Box 20%"
 * Virus in 3×3 box with very tight 20% threshold.
 *
 * █████
 * █VV·█
 * █···█
 * █···█
 * █████
 */
const L27 = mkSpec({
  id: 27, grid: { w: 5, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 20, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[4,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],
  ],
  seeds: [{ type: "virus", x: 1, y: 1 }, { type: "virus", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antiviral: 2 },
});

/**
 * L28: "Virus Box 25%"
 */
const L28 = mkSpec({
  id: 28, grid: { w: 5, h: 5 }, toolsPerTurn: 2, parTurns: 2, turnLimit: 5,
  objective: { type: "contain", maxPct: 25, maxTurns: 5 },
  walls: [
    [0,0],[1,0],[2,0],[3,0],[4,0],
    [0,1],[4,1],
    [0,2],[4,2],
    [0,3],[4,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],
  ],
  seeds: [{ type: "virus", x: 1, y: 1 }, { type: "virus", x: 2, y: 1 }],
  tools: { ...EMPTY_TOOLS, antiviral: 2 },
});

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

const CANDIDATES: Record<number, { spec: LevelSpec; label: string }> = {
  1:  { spec: L1,  label: "Pinch Point (bacteria, walls, 2 AB)" },
  2:  { spec: L2,  label: "Narrow Bridge (bacteria, 1-cell bridge, 2 AB)" },
  3:  { spec: L3,  label: "Virus Sprint (virus, corridor+gap, 2 AV)" },
  4:  { spec: L4,  label: "Type Test (bacteria, 3 med types)" },
  5:  { spec: L5,  label: "Twin Gaps (bacteria, 2 exits, 2 AB)" },
  6:  { spec: L6,  label: "Dual Threat (bact+virus, open, AB+AV)" },
  7:  { spec: L7,  label: "Funnel (bacteria, narrowing, 2 AB)" },
  8:  { spec: L8,  label: "Wide Open (bacteria, no walls, 2 AB)" },
  9:  { spec: L9,  label: "Maze Runner (bacteria, maze, 2 AB)" },
  10: { spec: L10, label: "Corridor Run (bacteria, long corridor, 2 AB)" },
  11: { spec: L11, label: "Bottleneck (bacteria, 1-cell neck, 2 AB)" },
  12: { spec: L12, label: "Three Paths (bacteria, 3 exits, 3 AB)" },
  13: { spec: L13, label: "Virus Maze (virus, maze, 2 AV)" },
  14: { spec: L14, label: "Diamond (bacteria, diamond shape, 2 AB)" },
  15: { spec: L15, label: "Asymmetric Escape (bacteria, mixed exits, 2 AB)" },
  16: { spec: L16, label: "Small Box 35% (bacteria, 3×3 interior, tight)" },
  17: { spec: L17, label: "Small Box 40% (bacteria, 3×3 interior)" },
  18: { spec: L18, label: "Narrow Box (bacteria, 3×2 interior)" },
  19: { spec: L19, label: "Center Pair (bacteria, 4×3, centered, 30%)" },
  20: { spec: L20, label: "Off-Center (bacteria, 4×3, corner, 30%)" },
  21: { spec: L21, label: "4×4 Open Box (bacteria, 25%)" },
  22: { spec: L22, label: "Split Bacteria (separated, 3×3, 35%)" },
  23: { spec: L23, label: "Virus Box (virus, 3×3, 30%)" },
  24: { spec: L24, label: "L-Shape Room (bacteria, asymmetric, 30%)" },
  25: { spec: L25, label: "1-tool precision (bacteria, 3×2, 1 AB)" },
  26: { spec: L26, label: "Type Match (bacteria, 4×3, all 3 types)" },
  27: { spec: L27, label: "Virus Box 20% (virus, 3×3, tight)" },
  28: { spec: L28, label: "Virus Box 25% (virus, 3×3)" },
};

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? "search";
  const levelId = args[1] ? parseInt(args[1]) : 0;

  if (mode === "viz" && levelId > 0) {
    const entry = CANDIDATES[levelId];
    if (!entry) { console.log("Unknown level"); return; }
    console.log(`\n=== Viz: L${levelId} "${entry.label}" ===\n`);
    const state = createGameState(entry.spec);
    console.log(`  Board: ${entry.spec.grid.w}×${entry.spec.grid.h}, ` +
      `Playable: ${countPlayable(state.board)}, ` +
      `Pathogens: ${countPathogens(state.board)}`);
    showBoard(state.board);
    console.log("\n  --- Natural expansion (no medicine) ---");
    genByGen(entry.spec, [], 9);
    return;
  }

  if (mode === "test" && levelId > 0) {
    const entry = CANDIDATES[levelId];
    if (!entry) { console.log("Unknown level"); return; }
    const stratJson = args[2];
    if (!stratJson) { console.log("Usage: test <level> '<json placements>'"); return; }
    const placements: [ToolId, number, number][] = JSON.parse(stratJson);
    console.log(`\n=== Test: L${levelId} "${entry.label}" ===`);
    console.log(`  Placements: ${placements.map(([t,x,y]) => `${t}@(${x},${y})`).join(", ")}`);
    genByGen(entry.spec, placements, 9);
    console.log("\n  --- Full simulation ---");
    const state = trySolve(entry.spec, [placements], true);
    console.log(`  Result: ${state.result}`);
    return;
  }

  // Default: brute-force search all candidates
  console.log("\n=== v4.0 Strategy Finder — Brute Force ===\n");

  const targetLevels = levelId > 0 ? [levelId] : Object.keys(CANDIDATES).map(Number);

  for (const id of targetLevels) {
    const entry = CANDIDATES[id];
    if (!entry) continue;

    console.log(`L${id}: "${entry.label}"`);
    const state = createGameState(entry.spec);
    console.log(`  Board: ${entry.spec.grid.w}×${entry.spec.grid.h}, ` +
      `Playable: ${countPlayable(state.board)}, ` +
      `Empty: ${getEmptyCells(state).length}, ` +
      `Tools/turn: ${entry.spec.toolsPerTurn}`);
    showBoard(state.board);

    const t0 = Date.now();
    const { wins, checked } = bruteForce(entry.spec, { maxDist: Infinity, maxResults: 500 });
    const elapsed = Date.now() - t0;

    console.log(`  Checked: ${checked} combos in ${elapsed}ms`);
    console.log(`  Wins: ${wins.length}${wins.length >= 50 ? "+" : ""}`);

    if (wins.length > 0 && wins.length <= 20) {
      for (const w of wins) {
        const labels = w.placements.map(([t,x,y]) => `${t}@(${x},${y})`).join(" + ");
        console.log(`    ✅ ${labels}`);
      }
    } else if (wins.length > 20) {
      for (const w of wins.slice(0, 5)) {
        const labels = w.placements.map(([t,x,y]) => `${t}@(${x},${y})`).join(" + ");
        console.log(`    ✅ ${labels}`);
      }
      console.log(`    ... and ${wins.length - 5} more`);
    }

    if (wins.length === 0) {
      console.log(`    ❌ No winning strategies found!`);
    }

    console.log();
  }
}

main().catch(console.error);
