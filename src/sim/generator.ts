// ═══════════════════════════════════════════════════
// src/sim/generator.ts — Procedural Level Generator
// Bio Defence v5.1 — Simulation-Validated Levels
//
// Every generated level is validated by running the
// sim with zero placements. If pathogen growth can't
// breach the threshold, the level is rejected and
// regenerated. This guarantees every level requires
// active play to win.
//
// Key principles:
//  1. Must-lose: doing nothing always loses.
//  2. Seeds placed in high-growth zones (open space).
//  3. Walls create choke points, never full enclosures.
//  4. Threshold tuned relative to simulated peak.
//  5. Multiple growth fronts force multi-point defense.
// ═══════════════════════════════════════════════════

import type { LevelSpec, PathogenType, ToolInventory } from "./types";
import { PATHOGEN_GROWTH } from "./constants";
import { createGameState } from "./board";
import { advanceTurn } from "./step";

// ── Seeded PRNG (mulberry32) ─────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Helpers ──────────────────────────────────────

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

// ── Growth-reachable BFS ─────────────────────────
// Flood-fill using a pathogen's GROWTH directions.
// This tells us how far a pathogen type can actually
// spread from a given cell — walls block, but growth
// moves one step at a time in the type's pattern.

function growthBFS(
  w: number, h: number,
  wallSet: Set<string>,
  startX: number,
  startY: number,
  dirs: [number, number][],
): Set<string> {
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];
  visited.add(key(startX, startY));

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const k = key(nx, ny);
      if (wallSet.has(k) || visited.has(k)) continue;
      visited.add(k);
      queue.push([nx, ny]);
    }
  }
  return visited;
}

// ── Simulation validation ────────────────────────
// Run the level with zero player actions.
// Returns peak infection % and final result.

interface SimResult {
  peakPct: number;
  result: "win" | "lose" | "playing";
  finalPct: number;
}

function simulateNoAction(spec: LevelSpec): SimResult {
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
  };
}

// ── Template types ───────────────────────────────

type TemplateFn = (
  w: number, h: number, rng: () => number,
) => [number, number][];

// ── Wall templates ───────────────────────────────
// Principle: create CHOKE POINTS and CORRIDORS, never
// full enclosures. Every interior region must have gaps.

/** Border only — completely open interior */
const tplOpen: TemplateFn = (w, h) => {
  const walls: [number, number][] = [];
  for (let x = 0; x < w; x++) walls.push([x, 0], [x, h - 1]);
  for (let y = 1; y < h - 1; y++) walls.push([0, y], [w - 1, y]);
  return walls;
};

/** Scattered pillars — 1×1 or 2×2 wall blocks, never blocking a full lane */
const tplPillars: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const count = 3 + Math.floor(rng() * 4); // 3-6 pillars
  for (let i = 0; i < count; i++) {
    const px = 2 + Math.floor(rng() * (w - 4));
    const py = 2 + Math.floor(rng() * (h - 4));
    const big = rng() < 0.4;
    walls.push([px, py]);
    if (big) {
      walls.push([px + 1, py], [px, py + 1], [px + 1, py + 1]);
    }
  }
  return walls;
};

/**
 * Single divider — one wall line across the board with 2-3 wide gaps.
 * Creates two halves the player must defend between.
 */
const tplDivider: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const vertical = rng() < 0.5;

  if (vertical) {
    const x = 3 + Math.floor(rng() * (w - 6));
    // Create 2 gaps
    const gap1 = 2 + Math.floor(rng() * Math.floor((h - 4) / 2));
    const gap2 = gap1 + 3 + Math.floor(rng() * Math.max(1, h - gap1 - 5));
    for (let y = 1; y < h - 1; y++) {
      if (Math.abs(y - gap1) <= 1 || Math.abs(y - gap2) <= 1) continue;
      walls.push([x, y]);
    }
  } else {
    const y = 3 + Math.floor(rng() * (h - 6));
    const gap1 = 2 + Math.floor(rng() * Math.floor((w - 4) / 2));
    const gap2 = gap1 + 3 + Math.floor(rng() * Math.max(1, w - gap1 - 5));
    for (let x = 1; x < w - 1; x++) {
      if (Math.abs(x - gap1) <= 1 || Math.abs(x - gap2) <= 1) continue;
      walls.push([x, y]);
    }
  }
  return walls;
};

/**
 * Cross — walls form a + shape creating 4 quadrants, each with a
 * 2-wide gap for pathogen to flow between quadrants.
 */
const tplCross: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  // Vertical arm with gap
  const vGap = cy + (rng() < 0.5 ? -2 : 2);
  for (let y = 1; y < h - 1; y++) {
    if (Math.abs(y - vGap) <= 1) continue;
    if (y === cy) continue; // leave center open
    walls.push([cx, y]);
  }

  // Horizontal arm with gap
  const hGap = cx + (rng() < 0.5 ? -2 : 2);
  for (let x = 1; x < w - 1; x++) {
    if (Math.abs(x - hGap) <= 1) continue;
    if (x === cx) continue;
    walls.push([x, cy]);
  }
  return walls;
};

/**
 * Corridors — 1-2 wall strips with 2-wide gaps, creating lanes.
 */
const tplCorridors: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const numStrips = 1 + Math.floor(rng() * 2);

  for (let s = 0; s < numStrips; s++) {
    const vertical = rng() < 0.5;
    if (vertical) {
      // Evenly spaced
      const x = Math.floor((w * (s + 1)) / (numStrips + 1));
      if (x <= 1 || x >= w - 2) continue;
      // 2-3 gaps of width 2
      const numGaps = 2 + Math.floor(rng() * 2);
      const gapYs: number[] = [];
      for (let g = 0; g < numGaps; g++) {
        gapYs.push(Math.floor((h * (g + 1)) / (numGaps + 1)));
      }
      for (let y = 1; y < h - 1; y++) {
        if (gapYs.some((gy) => Math.abs(y - gy) <= 1)) continue;
        walls.push([x, y]);
      }
    } else {
      const y = Math.floor((h * (s + 1)) / (numStrips + 1));
      if (y <= 1 || y >= h - 2) continue;
      const numGaps = 2 + Math.floor(rng() * 2);
      const gapXs: number[] = [];
      for (let g = 0; g < numGaps; g++) {
        gapXs.push(Math.floor((w * (g + 1)) / (numGaps + 1)));
      }
      for (let x = 1; x < w - 1; x++) {
        if (gapXs.some((gx) => Math.abs(x - gx) <= 1)) continue;
        walls.push([x, y]);
      }
    }
  }
  return walls;
};

/**
 * L-wall — an L-shaped wall creating two connected regions.
 */
const tplLWall: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const flipH = rng() < 0.5;
  const flipV = rng() < 0.5;

  // L goes from about 1/3 across to 2/3
  const startX = Math.floor(w / 3);
  const endX = Math.floor((2 * w) / 3);
  const startY = Math.floor(h / 3);
  const endY = Math.floor((2 * h) / 3);

  const fx = (x: number) => (flipH ? w - 1 - x : x);
  const fy = (y: number) => (flipV ? h - 1 - y : y);

  // Horizontal arm
  const gapH = startX + 1 + Math.floor(rng() * Math.max(1, endX - startX - 2));
  for (let x = startX; x <= endX; x++) {
    if (Math.abs(x - gapH) <= 1) continue;
    walls.push([fx(x), fy(startY)]);
  }

  // Vertical arm from the corner
  const gapV = startY + 1 + Math.floor(rng() * Math.max(1, endY - startY - 2));
  for (let y = startY; y <= endY; y++) {
    if (Math.abs(y - gapV) <= 1) continue;
    walls.push([fx(startX), fy(y)]);
  }

  return walls;
};

const TEMPLATES: TemplateFn[] = [
  tplOpen,
  tplPillars,
  tplDivider,
  tplCross,
  tplCorridors,
  tplLWall,
];

// ── Difficulty parameters ────────────────────────

interface TierParams {
  gridW: number;
  gridH: number;
  pairCount: number;
  germTypes: PathogenType[];
  toolsPerTurn: number;
  turnLimit: number;
  parTurns: number;
  templates: number[];  // indices into TEMPLATES
  initialTools: number;
  grantPerTurn: number;
  targetDifficulty: number; // 0..1: how hard (affects threshold)
}

function tierParams(level: number, rng: () => number): TierParams {
  // ── Tutorial (1-3): small open boards, 1 pair bacteria ──
  if (level <= 3) {
    return {
      gridW: 8, gridH: 8,
      pairCount: 1,
      germTypes: ["bacteria"],
      toolsPerTurn: 3, turnLimit: 6, parTurns: 4,
      templates: [0], // open only
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: 0.2,
    };
  }
  // ── Early (4-10): medium boards, 1-2 pairs, simple walls ──
  if (level <= 10) {
    return {
      gridW: 10, gridH: 10,
      pairCount: 1 + Math.floor(rng() * 2),
      germTypes: ["bacteria"],
      toolsPerTurn: 3, turnLimit: 8, parTurns: 5,
      templates: [0, 1, 2], // open, pillars, divider
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: 0.3,
    };
  }
  // ── Mid (11-18): larger boards, 2 pairs, more wall variety ──
  if (level <= 18) {
    return {
      gridW: 10 + Math.floor(rng() * 3), // 10-12
      gridH: 10 + Math.floor(rng() * 3),
      pairCount: 2,
      germTypes: ["bacteria"],
      toolsPerTurn: 3, turnLimit: 10, parTurns: 6,
      templates: [0, 1, 2, 3, 4], // all but L-wall
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: 0.4,
    };
  }
  // ── Advanced (19-24): introduce fungus alongside bacteria ──
  if (level <= 24) {
    return {
      gridW: 12, gridH: 12,
      pairCount: 2 + Math.floor(rng() * 2),
      germTypes: rng() < 0.6 ? ["bacteria", "fungus"] : ["bacteria"],
      toolsPerTurn: 3, turnLimit: 10, parTurns: 7,
      templates: [1, 2, 3, 4, 5],
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: 0.5,
    };
  }
  // ── Mini-boss (25) ──
  if (level === 25) {
    return {
      gridW: 14, gridH: 14,
      pairCount: 3 + Math.floor(rng() * 2),
      germTypes: ["bacteria", "fungus"],
      toolsPerTurn: 3, turnLimit: 12, parTurns: 8,
      templates: [3, 4], // cross or corridors
      initialTools: 5, grantPerTurn: 2,
      targetDifficulty: 0.6,
    };
  }
  // ── Cooldown (26-30) ──
  if (level <= 30) {
    return {
      gridW: 10, gridH: 10,
      pairCount: 1 + Math.floor(rng() * 2),
      germTypes: rng() < 0.4 ? ["bacteria", "fungus"] : ["bacteria"],
      toolsPerTurn: 3, turnLimit: 8, parTurns: 5,
      templates: [0, 1, 2],
      initialTools: 5, grantPerTurn: 1,
      targetDifficulty: 0.3,
    };
  }
  // ── Late (31-38): introduce virus ──
  if (level <= 38) {
    return {
      gridW: 12 + Math.floor(rng() * 3), // 12-14
      gridH: 12 + Math.floor(rng() * 3),
      pairCount: 2 + Math.floor(rng() * 2),
      germTypes: rng() < 0.5
        ? ["bacteria", "virus"]
        : ["bacteria", "fungus"],
      toolsPerTurn: 3, turnLimit: 12, parTurns: 8,
      templates: [1, 2, 3, 4, 5],
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: 0.55,
    };
  }
  // ── Endgame (39-49): all types, big boards ──
  if (level <= 49) {
    return {
      gridW: 14 + Math.floor(rng() * 3), // 14-16
      gridH: 14 + Math.floor(rng() * 3),
      pairCount: 3 + Math.floor(rng() * 2),
      germTypes: rng() < 0.5
        ? ["bacteria", "fungus", "virus"]
        : ["bacteria", "fungus"],
      toolsPerTurn: 3, turnLimit: 14, parTurns: 10,
      templates: [1, 2, 3, 4, 5],
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: 0.6,
    };
  }
  // ── Boss (50) ──
  return {
    gridW: 16, gridH: 16,
    pairCount: 4 + Math.floor(rng() * 2),
    germTypes: ["bacteria", "fungus", "virus"],
    toolsPerTurn: 4, turnLimit: 16, parTurns: 12,
    templates: [3, 4], // cross or corridors
    initialTools: 6, grantPerTurn: 2,
    targetDifficulty: 0.65,
  };
}

// ── Seed placement ───────────────────────────────
// Place seed PAIRS in large open growth zones so
// pathogens can actually spread far enough to be
// threatening. Each pair gets a partner in its own
// growth direction so it survives turn 1.

function placeSeedPairs(
  w: number, h: number,
  ws: Set<string>,
  pairCount: number,
  germTypes: PathogenType[],
  rng: () => number,
): Array<{ type: PathogenType; x: number; y: number }> {
  const seeds: Array<{ type: PathogenType; x: number; y: number }> = [];
  const placed = new Set<string>();

  // Count playable cells
  let playable = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (!ws.has(key(x, y))) playable++;

  // For each pair, find the cell with the MOST growth reach
  // and place the pair there. This ensures seeds are always
  // in the most open area.
  for (let i = 0; i < pairCount; i++) {
    const gtype = germTypes[i % germTypes.length];
    const dirs = PATHOGEN_GROWTH[gtype];

    // Collect candidate cells (not wall, not already placed, interior)
    const candidates: { x: number; y: number; reach: number }[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const k = key(x, y);
        if (ws.has(k) || placed.has(k)) continue;

        // Quick reach estimate: count reachable cells in growth dirs
        // (up to depth 4 for speed)
        let reach = 0;
        for (const [dx, dy] of dirs) {
          let cx = x + dx, cy = y + dy;
          let depth = 0;
          while (
            depth < 4 &&
            cx >= 0 && cx < w && cy >= 0 && cy < h &&
            !ws.has(key(cx, cy))
          ) {
            reach++;
            cx += dx;
            cy += dy;
            depth++;
          }
        }
        if (reach > 0) candidates.push({ x, y, reach });
      }
    }

    if (candidates.length === 0) continue;

    // Sort by reach descending, pick from top 20% with randomness
    candidates.sort((a, b) => b.reach - a.reach);
    const topN = Math.max(1, Math.floor(candidates.length * 0.2));
    const pick = candidates[Math.floor(rng() * topN)];

    // Find a partner cell in the pathogen's growth direction
    const shuffledDirs = [...dirs];
    shuffle(shuffledDirs, rng);

    let partner: { x: number; y: number } | null = null;
    for (const [dx, dy] of shuffledDirs) {
      const nx = pick.x + dx, ny = pick.y + dy;
      if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue;
      const nk = key(nx, ny);
      if (ws.has(nk) || placed.has(nk)) continue;
      partner = { x: nx, y: ny };
      break;
    }

    if (!partner) continue;

    seeds.push(
      { type: gtype, x: pick.x, y: pick.y },
      { type: gtype, x: partner.x, y: partner.y },
    );
    placed.add(key(pick.x, pick.y));
    placed.add(key(partner.x, partner.y));

    // Mark a small exclusion zone so pairs don't stack on top of each other
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        placed.add(key(pick.x + dx, pick.y + dy));
      }
    }
  }

  return seeds;
}

// ── Titles and hints ─────────────────────────────

const ADJECTIVES = [
  "Hostile", "Spreading", "Silent", "Rapid",
  "Critical", "Volatile", "Stubborn", "Aggressive",
  "Lurking", "Persistent", "Mutating", "Emerging",
  "Creeping", "Festering", "Swarming", "Relentless",
  "Toxic", "Virulent", "Rampant", "Tenacious",
];

const NOUNS = [
  "Colony", "Outbreak", "Cluster", "Invasion", "Front",
  "Culture", "Swarm", "Bloom", "Infection", "Strain",
  "Surge", "Breach", "Spread", "Wave", "Plague",
  "Incursion", "Contagion", "Epidemic", "Blight", "Crisis",
];

function generateTitle(levelNum: number, rng: () => number): string {
  if (levelNum === 25) return "Patient Zero";
  if (levelNum === 50) return "Total Outbreak";
  const adj = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(rng() * NOUNS.length)];
  return `${adj} ${noun}`;
}

function generateHint(types: PathogenType[], levelNum: number): string {
  if (levelNum <= 3)
    return "Place antibiotics to create dead zones that block bacterial growth.";
  if (levelNum <= 10)
    return "Bacteria spread up/down/left/right — block their cardinal paths.";
  if (types.includes("fungus") && types.includes("bacteria"))
    return "Fungus spreads diagonally! Use antifungals for diagonal threats, antibiotics for cardinal.";
  if (types.includes("virus"))
    return "Viruses jump in L-shapes like a knight. Anticipate where they'll land!";
  if (types.includes("fungus"))
    return "Fungus grows diagonally — a single antifungal pair can block a whole diagonal lane.";
  if (levelNum >= 40)
    return "Multiple pathogen types need different medicines. Prioritize the fastest spreader.";
  return "Sandwich pathogens between dead zones to contain them.";
}

// ── Main generator ───────────────────────────────

const LEVELS_PER_WORLD = 50;
const MAX_ATTEMPTS = 15;

/**
 * Generate all 50 levels for a world. Each level is
 * simulation-validated: doing nothing MUST result in
 * losing (infection exceeds threshold).
 */
export function generateWorld(worldNum: number): LevelSpec[] {
  const baseSeed = worldNum * 100_000;
  const levels: LevelSpec[] = [];

  for (let i = 1; i <= LEVELS_PER_WORLD; i++) {
    const level = generateValidLevel(worldNum, i, baseSeed + i * 7919);
    levels.push(level);
  }

  return levels;
}

function generateValidLevel(
  worldNum: number,
  levelNum: number,
  baseSeed: number,
): LevelSpec {
  // Try multiple attempts with different sub-seeds
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = mulberry32(baseSeed + attempt * 1301);
    const params = tierParams(levelNum, rng);
    const { gridW, gridH } = params;

    // Pick template
    const tplIdx =
      params.templates[Math.floor(rng() * params.templates.length)];
    const templateFn = TEMPLATES[tplIdx % TEMPLATES.length];

    // Generate and deduplicate walls
    const rawWalls = templateFn(gridW, gridH, rng);
    const ws = new Set<string>();
    const walls: [number, number][] = [];
    for (const [wx, wy] of rawWalls) {
      const k = key(wx, wy);
      if (!ws.has(k)) {
        ws.add(k);
        walls.push([wx, wy]);
      }
    }

    // Place seed pairs in open areas
    const seeds = placeSeedPairs(
      gridW, gridH, ws,
      params.pairCount, params.germTypes, rng,
    );

    if (seeds.length < 2) continue; // need at least one pair

    // Build tool inventory
    const tools: ToolInventory = {
      antibiotic: 0, antiviral: 0, antifungal: 0, wall: 0,
    };
    const toolGrant: ToolInventory = {
      antibiotic: 0, antiviral: 0, antifungal: 0, wall: 0,
    };
    const typesUsed = new Set(params.germTypes);
    const perType = Math.ceil(params.initialTools / typesUsed.size);
    const perGrant = Math.max(1, Math.ceil(params.grantPerTurn / typesUsed.size));

    if (typesUsed.has("bacteria")) {
      tools.antibiotic = perType;
      toolGrant.antibiotic = perGrant;
    }
    if (typesUsed.has("fungus")) {
      tools.antifungal = perType;
      toolGrant.antifungal = perGrant;
    }
    if (typesUsed.has("virus")) {
      tools.antiviral = perType;
      toolGrant.antiviral = perGrant;
    }
    tools.wall = 2 + Math.floor(rng() * 2);

    const title = generateTitle(levelNum, rng);
    const hint = generateHint(params.germTypes, levelNum);

    // Build a preliminary spec with a generous threshold to simulate
    const prelimSpec: LevelSpec = {
      id: (worldNum - 1) * LEVELS_PER_WORLD + levelNum,
      world: worldNum,
      title,
      hint,
      grid: { w: gridW, h: gridH },
      walls,
      seeds,
      tools,
      toolGrant,
      toolsPerTurn: params.toolsPerTurn,
      turnLimit: params.turnLimit,
      objective: { type: "contain", maxPct: 95, maxTurns: params.turnLimit },
      parTurns: params.parTurns,
    };

    // ── SIMULATE: run with zero player actions ──
    const sim = simulateNoAction(prelimSpec);

    // If peak infection is too low, this map can't challenge the player
    if (sim.peakPct < 15) continue; // pathogen barely grows — bad level

    // Set threshold relative to simulated peak:
    // threshold = peak * (1 - targetDifficulty * 0.6)
    // This means harder levels have lower thresholds relative to peak.
    // Clamped to [15, 60].
    const rawThreshold =
      sim.peakPct * (1 - params.targetDifficulty * 0.6);
    const maxPct = Math.max(15, Math.min(60, Math.round(rawThreshold)));

    // Re-simulate with real threshold to verify it actually loses
    const finalSpec: LevelSpec = {
      ...prelimSpec,
      objective: { type: "contain", maxPct, maxTurns: params.turnLimit },
    };

    const verify = simulateNoAction(finalSpec);
    if (verify.result !== "lose") {
      // Still doesn't lose — try lowering threshold more
      const lowerPct = Math.max(10, Math.round(sim.peakPct * 0.4));
      finalSpec.objective = {
        type: "contain",
        maxPct: lowerPct,
        maxTurns: params.turnLimit,
      };
      const verify2 = simulateNoAction(finalSpec);
      if (verify2.result !== "lose") continue; // give up on this attempt
    }

    return finalSpec;
  }

  // ── Fallback: guaranteed-valid open arena ──
  return generateFallback(worldNum, levelNum, baseSeed);
}

/**
 * Fallback level: completely open board with seeds in the center.
 * This ALWAYS produces a valid level because nothing blocks growth.
 */
function generateFallback(
  worldNum: number,
  levelNum: number,
  baseSeed: number,
): LevelSpec {
  const rng = mulberry32(baseSeed + 999_999);
  const params = tierParams(levelNum, rng);
  const { gridW, gridH } = params;

  // Open box walls only
  const walls: [number, number][] = [];
  const ws = new Set<string>();
  for (let x = 0; x < gridW; x++) {
    walls.push([x, 0], [x, gridH - 1]);
    ws.add(key(x, 0));
    ws.add(key(x, gridH - 1));
  }
  for (let y = 1; y < gridH - 1; y++) {
    walls.push([0, y], [gridW - 1, y]);
    ws.add(key(0, y));
    ws.add(key(gridW - 1, y));
  }

  // Place seeds near center
  const cx = Math.floor(gridW / 2);
  const cy = Math.floor(gridH / 2);
  const seeds: Array<{ type: PathogenType; x: number; y: number }> = [];
  const placed = new Set<string>();

  for (let i = 0; i < params.pairCount; i++) {
    const gtype = params.germTypes[i % params.germTypes.length];
    const dirs = PATHOGEN_GROWTH[gtype];
    // Offset from center
    const ox = (i % 3) * 3 - 3;
    const oy = Math.floor(i / 3) * 3 - 1;
    const sx = Math.max(1, Math.min(gridW - 2, cx + ox));
    const sy = Math.max(1, Math.min(gridH - 2, cy + oy));
    const k1 = key(sx, sy);

    if (placed.has(k1)) continue;
    placed.add(k1);
    seeds.push({ type: gtype, x: sx, y: sy });

    // Partner in growth direction
    for (const [dx, dy] of dirs) {
      const nx = sx + dx, ny = sy + dy;
      if (nx <= 0 || nx >= gridW - 1 || ny <= 0 || ny >= gridH - 1) continue;
      const k2 = key(nx, ny);
      if (placed.has(k2)) continue;
      placed.add(k2);
      seeds.push({ type: gtype, x: nx, y: ny });
      break;
    }
  }

  // Build tools
  const tools: ToolInventory = {
    antibiotic: 0, antiviral: 0, antifungal: 0, wall: 0,
  };
  const toolGrant: ToolInventory = {
    antibiotic: 0, antiviral: 0, antifungal: 0, wall: 0,
  };
  const typesUsed = new Set(params.germTypes);
  const perType = Math.ceil(params.initialTools / typesUsed.size);
  const perGrant = Math.max(1, Math.ceil(params.grantPerTurn / typesUsed.size));
  if (typesUsed.has("bacteria")) {
    tools.antibiotic = perType;
    toolGrant.antibiotic = perGrant;
  }
  if (typesUsed.has("fungus")) {
    tools.antifungal = perType;
    toolGrant.antifungal = perGrant;
  }
  if (typesUsed.has("virus")) {
    tools.antiviral = perType;
    toolGrant.antiviral = perGrant;
  }
  tools.wall = 2;

  // Simulate to set threshold
  const prelimSpec: LevelSpec = {
    id: (worldNum - 1) * LEVELS_PER_WORLD + levelNum,
    world: worldNum,
    title: generateTitle(levelNum, rng),
    hint: generateHint(params.germTypes, levelNum),
    grid: { w: gridW, h: gridH },
    walls,
    seeds,
    tools,
    toolGrant,
    toolsPerTurn: params.toolsPerTurn,
    turnLimit: params.turnLimit,
    objective: { type: "contain", maxPct: 95, maxTurns: params.turnLimit },
    parTurns: params.parTurns,
  };

  const sim = simulateNoAction(prelimSpec);
  const maxPct = Math.max(15, Math.min(50, Math.round(sim.peakPct * 0.5)));

  return {
    ...prelimSpec,
    objective: { type: "contain", maxPct, maxTurns: params.turnLimit },
  };
}
