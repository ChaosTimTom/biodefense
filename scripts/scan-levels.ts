/**
 * Diagnostic script: scan all 200 levels for instant-win problems.
 *
 * Run with:  npx tsx scripts/scan-levels.ts
 *
 * For each level, generates the spec then simulates with zero player
 * actions. Reports levels where the player wins by doing nothing.
 */

import { generateWorld } from "../src/sim/generator";
import { createGameState } from "../src/sim/board";
import { advanceTurn } from "../src/sim/step";
import type { LevelSpec } from "../src/sim/types";

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

const WORLD_NAMES = ["", "Petri Dish", "Bloodstream", "Tissue", "Pandemic"];

interface LevelDiag {
  world: number;
  levelNum: number;
  id: number;
  title: string;
  result: string;
  peakPct: number;
  finalPct: number;
  maxPct: number;
  margin: number; // peak - threshold  (how barely it loses)
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

    // Simulate with a generous threshold (95%) to measure TRUE peak,
    // just like the generator does. Then compare to the actual threshold.
    const unlimitedSpec = {
      ...spec,
      objective: { ...spec.objective, maxPct: 95 },
    };
    const simUnlimited = simulateNoAction(unlimitedSpec);

    // Also verify the level actually loses with its real threshold
    const simReal = simulateNoAction(spec);

    const truePeak = simUnlimited.peakPct;
    const margin = truePeak - spec.objective.maxPct;

    const diag: LevelDiag = {
      world: w,
      levelNum,
      id: spec.id,
      title: spec.title,
      result: simReal.result,
      peakPct: truePeak,
      finalPct: simUnlimited.finalPct,
      maxPct: spec.objective.maxPct,
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
  const flag = d.result !== "lose" ? "❌ INSTANT-WIN" : d.margin < 5 ? "⚠️  TRIVIAL" : "  ";
  console.log(
    `${flag} W${d.world} L${String(d.levelNum).padStart(2)} ` +
    `"${d.title.padEnd(22)}" ` +
    `peak=${d.peakPct.toFixed(1).padStart(5)}% thresh=${String(d.maxPct).padStart(2)}% ` +
    `margin=${d.margin.toFixed(1).padStart(5)} ` +
    `grid=${d.gridW}x${d.gridH} open=${d.openCells} ` +
    `seeds=${d.seedCount} turns=${d.turnLimit} ` +
    `types=[${d.seedTypes.join(",")}]`
  );
}

console.log(`\n${"=".repeat(60)}`);
console.log(`Total instant-win levels: ${totalBad} / 200`);
console.log(`Levels with margin < 5: ${allDiags.filter(d => d.margin < 5).length}`);
console.log(`Levels with margin < 10: ${allDiags.filter(d => d.margin < 10).length}`);
console.log(`Levels with margin < 15: ${allDiags.filter(d => d.margin < 15).length}`);
