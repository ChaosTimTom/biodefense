/**
 * Diagnostic script: scan all 200 levels for instant-win problems.
 *
 * Run with:  npx tsx scripts/scan-levels.ts
 *
 * For each level, generates the spec then simulates with zero player
 * actions. Reports levels where the player wins by doing nothing.
 */

import { generateWorld, greedySolve, WORLD_CONFIGS } from "../src/sim/generator";
import { createGameState, getTile } from "../src/sim/board";
import { advanceTurn, applyAction } from "../src/sim/step";
import { COUNTERED_BY } from "../src/sim/constants";
import type { LevelSpec, PathogenType } from "../src/sim/types";

function simulateNoAction(spec: LevelSpec) {
  const state = createGameState(spec);
  let peak = 0;

  for (let t = 0; t < spec.turnLimit && !state.isOver; t++) {
    advanceTurn(state, spec);
    const pct = state.peakInfectionPct;
    if (pct > peak) peak = pct;
  }

  return {
    peakPct: peak,
    result: state.result === "playing" ? "playing" : state.result,
    finalPct: state.peakInfectionPct,
    isOver: state.isOver,
  };
}

/**
 * Check if placing a SINGLE medicine anywhere on player turn 1
 * (then doing nothing for all remaining turns) can win the level.
 * Returns the winning cell {x,y,tool} or null if no single-place win exists.
 */
function checkSinglePlaceWin(
  spec: LevelSpec,
): { x: number; y: number; tool: string } | null {
  // Only concern levels with contain objective
  if (spec.objective.type !== "contain") return null;

  // Collect unique pathogen types on the board
  const seedTypes = [...new Set(spec.seeds.map(s => s.type))] as PathogenType[];

  // For each medicine type the player has, try every empty cell
  for (const ptype of seedTypes) {
    const med = COUNTERED_BY[ptype];
    // Check the player actually has this medicine
    if (!spec.tools[med] || spec.tools[med] <= 0) continue;

    for (let y = 0; y < spec.grid.h; y++) {
      for (let x = 0; x < spec.grid.w; x++) {
        // Create fresh state for each attempt
        const state = createGameState(spec);
        const tile = getTile(state.board, x, y);
        if (tile.kind !== "empty") continue;

        // Place one medicine
        const ok = applyAction(state, { type: "place_tool", tool: med, x, y });
        if (!ok) continue;

        // Simulate remaining turns with no further actions
        for (let t = 0; t < spec.turnLimit && !state.isOver; t++) {
          advanceTurn(state, spec);
        }

        // Check if player won
        if (state.result === "win") {
          return { x, y, tool: med };
        }
      }
    }
  }
  return null;
}

const WORLD_NAMES = ["", "Petri Dish", "Bloodstream", "Tissue", "Pandemic"];

function getMaxPct(spec: LevelSpec): number {
  return spec.objective.type === "contain" ? spec.objective.maxPct : 0;
}

// ── Detect duplicate layouts ──
console.log("=== DUPLICATE LAYOUT DETECTION ===\n");

const layoutMap = new Map<string, { world: number; level: number; id: number; title: string }[]>();

for (let w = 1; w <= 4; w++) {
  const levels = generateWorld(w);
  for (const spec of levels) {
    const levelNum = spec.id - (w - 1) * 50;
    // Create a layout fingerprint from walls + grid size
    const wallStr = spec.walls.map(([x, y]) => `${x},${y}`).sort().join("|");
    const fp = `${spec.grid.w}x${spec.grid.h}:${wallStr}`;
    
    if (!layoutMap.has(fp)) layoutMap.set(fp, []);
    layoutMap.get(fp)!.push({ world: w, level: levelNum, id: spec.id, title: spec.title });
  }
}

let dupeCount = 0;
for (const [fp, entries] of layoutMap) {
  if (entries.length > 1) {
    dupeCount++;
    const gridPart = fp.split(":")[0];
    const wallCount = fp.split("|").length;
    console.log(`  DUPLICATE (${entries.length}x) grid=${gridPart} walls=${wallCount}:`);
    for (const e of entries) {
      console.log(`    W${e.world} L${String(e.level).padStart(2)} id=${e.id} "${e.title}"`);
    }
  }
}

if (dupeCount === 0) {
  console.log("  No duplicate layouts found!");
} else {
  console.log(`\n  ${dupeCount} duplicate layout groups found.`);
}

// ── Check how many levels use fallback ──
console.log("\n=== FALLBACK DETECTION ===\n");

// Fallback levels have very few walls (< 3 non-trivial walls)
let fallbackCount = 0;
for (let w = 1; w <= 4; w++) {
  const levels = generateWorld(w);
  for (const spec of levels) {
    const levelNum = spec.id - (w - 1) * 50;
    const { w: gw, h: gh } = spec.grid;
    
    // A fallback-like level has very few walls (practically empty)
    if (spec.walls.length <= 2) {
      fallbackCount++;
      console.log(`  FALLBACK W${w} L${String(levelNum).padStart(2)} id=${spec.id} "${spec.title}" grid=${gw}x${gh} walls=${spec.walls.length}`);
    }
  }
}
console.log(`\n  ${fallbackCount} near-empty levels total.`);

console.log("\n" + "=".repeat(60));

interface LevelDiag {
  world: number;
  levelNum: number;
  id: number;
  title: string;
  objType: string;  // contain | clear_all | survive
  result: string;
  peakPct: number;
  finalPct: number;
  maxPct: number;
  margin: number; // peak - threshold  (how barely it loses; N/A for clear_all)
  gridW: number;
  gridH: number;
  totalCells: number;
  wallCount: number;
  openCells: number;
  seedCount: number;
  turnLimit: number;
  seedTypes: string[];
}

const allDiags: LevelDiag[] = [];
let totalBad = 0;

for (let w = 1; w <= 4; w++) {
  const levels = generateWorld(w);
  console.log(`\n=== World ${w}: ${WORLD_NAMES[w]} (${levels.length} levels) ===`);

  let worldBad = 0;
  for (const spec of levels) {
    const levelNum = spec.id - (w - 1) * 50;
    const totalCells = spec.grid.w * spec.grid.h;
    const openCells = totalCells - spec.walls.length;
    const seedTypes = [...new Set(spec.seeds.map(s => s.type))];

    const objType = spec.objective.type;

    // For "contain" levels: simulate with generous threshold (95%) to
    // measure TRUE peak, then compare to the actual threshold.
    // For "clear_all" levels: margin concept doesn't apply — just verify
    // that doing nothing loses (pathogens remain when turns expire).
    let truePeak = 0;
    let finalPctUnlimited = 0;
    let specMaxPct = getMaxPct(spec);
    let margin = 0;

    if (objType === "contain") {
      const unlimitedSpec = {
        ...spec,
        objective: { type: "contain" as const, maxPct: 95, maxTurns: spec.turnLimit },
      };
      const simUnlimited = simulateNoAction(unlimitedSpec);
      truePeak = simUnlimited.peakPct;
      finalPctUnlimited = simUnlimited.finalPct;
      margin = truePeak - specMaxPct;
    } else {
      // clear_all / survive — just run real sim
      const simPeak = simulateNoAction({
        ...spec,
        objective: { type: "contain" as const, maxPct: 95, maxTurns: spec.turnLimit },
      });
      truePeak = simPeak.peakPct;
      finalPctUnlimited = simPeak.finalPct;
      margin = -1; // N/A sentinel
    }

    // Verify the level actually loses with its real objective
    const simReal = simulateNoAction(spec);

    const diag: LevelDiag = {
      world: w,
      levelNum,
      id: spec.id,
      title: spec.title,
      objType,
      result: simReal.result,
      peakPct: truePeak,
      finalPct: finalPctUnlimited,
      maxPct: specMaxPct,
      margin,
      gridW: spec.grid.w,
      gridH: spec.grid.h,
      totalCells,
      wallCount: spec.walls.length,
      openCells,
      seedCount: spec.seeds.length,
      turnLimit: spec.turnLimit,
      seedTypes,
    };
    allDiags.push(diag);

    if (simReal.result !== "lose") {
      worldBad++;
      totalBad++;
    }
  }

  if (worldBad === 0) {
    console.log("  ✅ All levels validated — doing nothing always loses.");
  } else {
    console.log(`  ⚠️  ${worldBad} instant-win levels found!`);
  }
}

// Sort by margin (ascending) — levels that BARELY lose are the easiest
const sorted = [...allDiags].sort((a, b) => a.margin - b.margin);

console.log(`\n${"=".repeat(60)}`);
console.log("EASIEST LEVELS (smallest margin between peak and threshold):");
console.log("(margin = peakPct - maxPct; lower = easier to win)\n");

for (const d of sorted.slice(0, 30)) {
  const flag = d.result !== "lose" ? "❌ INSTANT-WIN" : d.margin >= 0 && d.margin < 5 ? "⚠️  TRIVIAL" : "  ";
  const marginStr = d.margin < 0 ? "  N/A" : d.margin.toFixed(1).padStart(5);
  const threshStr = d.objType === "contain" ? `thresh=${String(d.maxPct).padStart(2)}%` : `obj=${d.objType}`;
  console.log(
    `${flag} W${d.world} L${String(d.levelNum).padStart(2)} ` +
    `[${d.objType.padEnd(9)}] ` +
    `"${d.title.padEnd(22)}" ` +
    `peak=${d.peakPct.toFixed(1).padStart(5)}% ${threshStr} ` +
    `margin=${marginStr} ` +
    `grid=${d.gridW}x${d.gridH} open=${d.openCells} ` +
    `seeds=${d.seedCount} turns=${d.turnLimit} ` +
    `types=[${d.seedTypes.join(",")}]`
  );
}

console.log(`\n${"=".repeat(60)}`);
console.log(`Total instant-win levels: ${totalBad} / 200`);
const containLevels = allDiags.filter(d => d.objType === "contain");
const clearAllLevels = allDiags.filter(d => d.objType === "clear_all");
console.log(`Contain levels with margin < 5: ${containLevels.filter(d => d.margin < 5).length}`);
console.log(`Contain levels with margin < 10: ${containLevels.filter(d => d.margin < 10).length}`);
console.log(`Contain levels with margin < 15: ${containLevels.filter(d => d.margin < 15).length}`);
if (clearAllLevels.length > 0) {
  console.log(`Clear-all levels: ${clearAllLevels.length}`);
}

// ── Template distribution ──
console.log(`\n${"=".repeat(60)}`);
console.log("TEMPLATE DISTRIBUTION (by world):\n");

const TPL_NAMES = [
  "Open(0)", "Pillars(1)", "Divider(2)", "Cross(3)", "Corridors(4)",
  "L-Wall(5)", "Vein(6)", "Chamber(7)", "Maze(8)", "Honeycomb(9)",
  "Compound(10)", "Gateway(11)", "Island(12)", "AsymSplit(13)",
];

// We can't directly detect which template was used from the spec,
// but we can analyze structural properties. For a rough count,
// we can re-generate and track.
// Instead, let's show the template POOL sizes per world.
for (let w = 1; w <= 4; w++) {
  const wc = WORLD_CONFIGS[w];
  console.log(`  W${w} ${wc.name}:`);
  console.log(`    Grid range: ${wc.gridRange[0]}–${wc.gridRange[1]}`);
  for (let tier = 0; tier < wc.templates.length; tier++) {
    const tierName = tier === 0 ? "Tutorial" : tier === 1 ? "Early" : tier === 2 ? "Mid" : tier === 3 ? "Advanced" : "Endgame";
    const poolNames = wc.templates[tier].map(t => TPL_NAMES[t] || `?${t}`).join(", ");
    console.log(`    ${tierName}: [${poolNames}]`);
  }
}

// ── Greedy solver winnability check ──
console.log(`\n${"=".repeat(60)}`);
console.log("WINNABILITY SOLVER (greedy strategy):\n");

let solverWins = 0;
let solverFails = 0;
const failedLevels: { world: number; level: number; finalPct: number; threshold: number }[] = [];

for (let w = 1; w <= 4; w++) {
  const levels = generateWorld(w);
  let worldWins = 0;
  for (const spec of levels) {
    const levelNum = spec.id - (w - 1) * 50;
    const result = greedySolve(spec);
    if (result.won) {
      worldWins++;
      solverWins++;
    } else {
      solverFails++;
      failedLevels.push({
        world: w,
        level: levelNum,
        finalPct: result.finalPct,
        threshold: getMaxPct(spec),
      });
    }
  }
  console.log(`  W${w} ${WORLD_CONFIGS[w].name}: ${worldWins}/50 winnable by greedy solver`);
}

console.log(`\n  Total: ${solverWins}/200 winnable by greedy solver`);
if (failedLevels.length > 0 && failedLevels.length <= 30) {
  console.log(`\n  Failed levels (solver couldn't win):`);
  for (const f of failedLevels) {
    console.log(`    W${f.world} L${String(f.level).padStart(2)} — final ${f.finalPct.toFixed(1)}% vs threshold ${f.threshold}%`);
  }
}
if (failedLevels.length > 30) {
  console.log(`\n  ${failedLevels.length} failed levels (too many to list — showing first 15):`);
  for (const f of failedLevels.slice(0, 15)) {
    console.log(`    W${f.world} L${String(f.level).padStart(2)} — final ${f.finalPct.toFixed(1)}% vs threshold ${f.threshold}%`);
  }
}

// ── Grid size distribution ──
console.log(`\n${"=".repeat(60)}`);
console.log("GRID SIZE DISTRIBUTION:\n");
const gridBuckets: Record<string, number> = {};
for (const d of allDiags) {
  const bucket = `${d.gridW}x${d.gridH}`;
  gridBuckets[bucket] = (gridBuckets[bucket] || 0) + 1;
}
const sortedBuckets = Object.entries(gridBuckets).sort((a, b) => {
  const [aw, ah] = a[0].split("x").map(Number);
  const [bw, bh] = b[0].split("x").map(Number);
  return aw * ah - bw * bh;
});
for (const [bucket, count] of sortedBuckets) {
  const [gw, gh] = bucket.split("x").map(Number);
  const tileSize = Math.min(56, Math.floor(412 / gh), Math.floor(368 / gw));
  const bar = "█".repeat(count);
  console.log(`  ${bucket.padStart(5)}: ${String(count).padStart(3)} levels (tile=${tileSize}px) ${bar}`);
}

// ── Threshold distribution ──
console.log(`\n${"=".repeat(60)}`);
console.log("THRESHOLD DISTRIBUTION (contain levels only):\n");
const threshBuckets = { "≤20%": 0, "21-30%": 0, "31-40%": 0, "41-45%": 0, ">45%": 0 };
for (const d of allDiags) {
  if (d.objType !== "contain") continue;
  if (d.maxPct <= 20) threshBuckets["≤20%"]++;
  else if (d.maxPct <= 30) threshBuckets["21-30%"]++;
  else if (d.maxPct <= 40) threshBuckets["31-40%"]++;
  else if (d.maxPct <= 45) threshBuckets["41-45%"]++;
  else threshBuckets[">45%"]++;
}
for (const [range, count] of Object.entries(threshBuckets)) {
  console.log(`  ${range.padStart(7)}: ${count}`);
}

// ── Objective type distribution ──
console.log(`\n${"=".repeat(60)}`);
console.log("OBJECTIVE TYPE DISTRIBUTION:\n");
const objBuckets: Record<string, number> = {};
for (const d of allDiags) {
  objBuckets[d.objType] = (objBuckets[d.objType] || 0) + 1;
}
for (const [objType, count] of Object.entries(objBuckets)) {
  console.log(`  ${objType.padStart(10)}: ${count}`);
}

// ── Single-place instant win check ──
console.log(`\n${"=".repeat(60)}`);
console.log("SINGLE-PLACE WIN CHECK (L4+ only):\n");
console.log("  Testing if placing ONE medicine and doing nothing else can win...");

let singlePlaceWins = 0;
for (let w = 1; w <= 4; w++) {
  const levels = generateWorld(w);
  for (const spec of levels) {
    const levelNum = spec.id - (w - 1) * 50;
    if (levelNum <= 3) continue; // tutorials are expected to be trivial

    const win = checkSinglePlaceWin(spec);
    if (win) {
      singlePlaceWins++;
      console.log(
        `  ❌ W${w} L${String(levelNum).padStart(2)} — placing ${win.tool} at (${win.x},${win.y}) wins!`
      );
    }
  }
}

if (singlePlaceWins === 0) {
  console.log("  ✅ No single-place wins found (L4+). All levels require real strategy.");
} else {
  console.log(`\n  ⚠️  ${singlePlaceWins} levels can be won with a single placement!`);
}

console.log(`\n${"=".repeat(60)}`);
console.log("SCAN COMPLETE.\n");
