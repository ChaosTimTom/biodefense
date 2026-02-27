// ═══════════════════════════════════════════════════
// src/sim/generator.ts — Procedural Level Generator
// Bio Defence v6.0 — 4-World Simulation-Validated Levels
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

import type { LevelSpec, PathogenType } from "./types";
import { emptyInventory } from "./types";
import { PATHOGEN_GROWTH, COUNTERED_BY } from "./constants";
import { createGameState, getTile, infectionPct } from "./board";
import { advanceTurn, applyAction } from "./step";
import { canPlaceTool } from "./tools";

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

/** No walls — completely open board */
const tplOpen: TemplateFn = () => {
  return [];
};

/** Scattered pillars — 1×1 or 2×2 wall blocks, never blocking a full lane */
const tplPillars: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const count = 3 + Math.floor(rng() * 4); // 3-6 pillars
  for (let i = 0; i < count; i++) {
    const px = 1 + Math.floor(rng() * (w - 2));
    const py = 1 + Math.floor(rng() * (h - 2));
    const big = rng() < 0.4;
    walls.push([px, py]);
    if (big) {
      if (px + 1 < w) walls.push([px + 1, py]);
      if (py + 1 < h) walls.push([px, py + 1]);
      if (px + 1 < w && py + 1 < h) walls.push([px + 1, py + 1]);
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
    const x = 2 + Math.floor(rng() * (w - 4));
    // Create 2 gaps
    const gap1 = 1 + Math.floor(rng() * Math.floor((h - 2) / 2));
    const gap2 = gap1 + 3 + Math.floor(rng() * Math.max(1, h - gap1 - 4));
    for (let y = 0; y < h; y++) {
      if (Math.abs(y - gap1) <= 1 || Math.abs(y - gap2) <= 1) continue;
      walls.push([x, y]);
    }
  } else {
    const y = 2 + Math.floor(rng() * (h - 4));
    const gap1 = 1 + Math.floor(rng() * Math.floor((w - 2) / 2));
    const gap2 = gap1 + 3 + Math.floor(rng() * Math.max(1, w - gap1 - 4));
    for (let x = 0; x < w; x++) {
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
  for (let y = 0; y < h; y++) {
    if (Math.abs(y - vGap) <= 1) continue;
    if (y === cy) continue; // leave center open
    walls.push([cx, y]);
  }

  // Horizontal arm with gap
  const hGap = cx + (rng() < 0.5 ? -2 : 2);
  for (let x = 0; x < w; x++) {
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
      if (x <= 0 || x >= w - 1) continue;
      // 2-3 gaps of width 2
      const numGaps = 2 + Math.floor(rng() * 2);
      const gapYs: number[] = [];
      for (let g = 0; g < numGaps; g++) {
        gapYs.push(Math.floor((h * (g + 1)) / (numGaps + 1)));
      }
      for (let y = 0; y < h; y++) {
        if (gapYs.some((gy) => Math.abs(y - gy) <= 1)) continue;
        walls.push([x, y]);
      }
    } else {
      const y = Math.floor((h * (s + 1)) / (numStrips + 1));
      if (y <= 0 || y >= h - 1) continue;
      const numGaps = 2 + Math.floor(rng() * 2);
      const gapXs: number[] = [];
      for (let g = 0; g < numGaps; g++) {
        gapXs.push(Math.floor((w * (g + 1)) / (numGaps + 1)));
      }
      for (let x = 0; x < w; x++) {
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

/**
 * Gateway — two horizontal wall lines creating a corridor with offset doorways.
 * Creates 3 distinct zones that force the player to defend through chokepoints.
 */
const tplGateway: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const upperY = Math.max(1, Math.floor(h / 3));
  const lowerY = Math.min(h - 2, Math.floor(2 * h / 3));

  // Upper wall with 2 doorways
  const door1 = 1 + Math.floor(rng() * Math.max(1, Math.floor(w / 3) - 1));
  const door2 = Math.floor(2 * w / 3) + Math.floor(rng() * Math.max(1, Math.floor(w / 3) - 1));
  for (let x = 0; x < w; x++) {
    if (Math.abs(x - door1) <= 1 || Math.abs(x - door2) <= 1) continue;
    walls.push([x, upperY]);
  }

  // Lower wall with 2 offset doorways
  const door3 = Math.floor(w / 4) + Math.floor(rng() * Math.max(1, Math.floor(w / 4)));
  const door4 = Math.floor(w / 2) + Math.floor(rng() * Math.max(1, Math.floor(w / 4)));
  for (let x = 0; x < w; x++) {
    if (Math.abs(x - door3) <= 1 || Math.abs(x - door4) <= 1) continue;
    walls.push([x, lowerY]);
  }
  return walls;
};

/**
 * Island — central wall cluster creating a doughnut-shaped arena.
 * Forces wrap-around play: germs spread around the obstacle.
 */
const tplIsland: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  // Island radius scales with grid size: 1-3
  const rw = 1 + Math.floor(rng() * Math.min(3, Math.floor((w - 2) / 3)));
  const rh = 1 + Math.floor(rng() * Math.min(3, Math.floor((h - 2) / 3)));

  for (let dy = -rh; dy <= rh; dy++) {
    for (let dx = -rw; dx <= rw; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && x < w && y >= 0 && y < h) {
        walls.push([x, y]);
      }
    }
  }

  // Optional: add 1-2 small satellite pillars
  const numSat = Math.floor(rng() * 3); // 0-2
  for (let s = 0; s < numSat; s++) {
    const angle = rng() * Math.PI * 2;
    const dist = Math.max(rw, rh) + 2;
    const sx = cx + Math.round(Math.cos(angle) * dist);
    const sy = cy + Math.round(Math.sin(angle) * dist);
    if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
      walls.push([sx, sy]);
    }
  }
  return walls;
};

/**
 * AsymSplit — diagonal wall line creating asymmetric halves.
 * Unlike H/V symmetric templates, this forces unequal resource allocation.
 */
const tplAsymSplit: TemplateFn = (w, h, rng) => {
  const walls = tplOpen(w, h, rng);
  const flip = rng() < 0.5;
  const gapCount = 2 + Math.floor(rng() * 2); // 2-3 gaps
  const gapYs: number[] = [];
  for (let g = 0; g < gapCount; g++) {
    gapYs.push(Math.floor((h * (g + 1)) / (gapCount + 1)));
  }

  for (let y = 0; y < h; y++) {
    if (gapYs.some(gy => Math.abs(y - gy) <= 1)) continue;
    // Diagonal: x progresses from ~1/4 width to ~3/4 width as y increases
    const t = y / Math.max(1, h - 1);
    const rawX = Math.floor(t * (w - 1));
    const x = flip ? w - 1 - rawX : rawX;
    if (x >= 0 && x < w) {
      walls.push([x, y]);
      // Make the wall 2-thick for better visual read
      const x2 = flip ? x + 1 : x - 1;
      if (x2 >= 0 && x2 < w && rng() < 0.5) {
        walls.push([x2, y]);
      }
    }
  }
  return walls;
};

const TEMPLATES: TemplateFn[] = [
  tplOpen,       // 0
  tplPillars,    // 1
  tplDivider,    // 2
  tplCross,      // 3
  tplCorridors,  // 4
  tplLWall,      // 5
  tplVein,       // 6
  tplChamber,    // 7
  tplMaze,       // 8
  tplHoneycomb,  // 9
  tplCompound,   // 10
  tplGateway,    // 11
  tplIsland,     // 12
  tplAsymSplit,  // 13
];

// ── New templates (worlds 2-4) ───────────────────

/**
 * Vein — meandering wide channels like blood vessels.
 * Carves generously from a filled interior to create organic corridors.
 * Guarantees < 30% interior wall density by carving extra if needed.
 */
function tplVein(w: number, h: number, rng: () => number): [number, number][] {
  const walls = tplOpen(w, h, rng);
  const ws = new Set<string>();
  // Start with entire grid filled, then carve veins
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      ws.add(key(x, y));

  const totalCells = w * h;
  // Scale veins and width by grid size to ensure enough carving
  const numVeins = 3 + Math.floor(rng() * 3); // 3-5 veins
  for (let v = 0; v < numVeins; v++) {
    // Alternate starting from left/top edges
    let cx = v % 2 === 0 ? 0 : Math.floor(rng() * w);
    let cy = v % 2 === 0 ? Math.floor(rng() * h) : 0;
    // Wider veins for larger grids
    const veinWidth = Math.max(3, Math.floor(Math.min(w, h) / 3));
    const steps = w + h + 8;
    for (let s = 0; s < steps; s++) {
      const r = Math.floor(veinWidth / 2);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h)
            ws.delete(key(nx, ny));
        }
      }
      const dir = rng();
      if (v % 2 === 0) {
        cx += 1;
        if (dir < 0.3) cy = Math.max(0, cy - 1);
        else if (dir < 0.6) cy = Math.min(h - 1, cy + 1);
      } else {
        cy += 1;
        if (dir < 0.3) cx = Math.max(0, cx - 1);
        else if (dir < 0.6) cx = Math.min(w - 1, cx + 1);
      }
      if (cx >= w || cy >= h) break;
    }
  }

  // Safety: ensure we stay under 25% wall density by random carving
  const maxWalls = Math.floor(totalCells * 0.25);
  if (ws.size > maxWalls) {
    const wallArr = [...ws];
    shuffle(wallArr, rng);
    while (ws.size > maxWalls && wallArr.length > 0) {
      ws.delete(wallArr.pop()!);
    }
  }

  for (const k of ws) {
    const [sx, sy] = k.split(",").map(Number);
    walls.push([sx, sy]);
  }
  return walls;
}

/**
 * Chamber — 3-4 rectangular rooms connected by 2-wide doorways.
 */
function tplChamber(w: number, h: number, rng: () => number): [number, number][] {
  const walls = tplOpen(w, h, rng);
  const numRooms = 3 + Math.floor(rng() * 2);
  const roomCols = numRooms <= 3 ? numRooms : Math.ceil(numRooms / 2);
  const roomRows = numRooms <= 3 ? 1 : 2;

  for (let ry = 0; ry < roomRows; ry++) {
    for (let rx = 0; rx < roomCols; rx++) {
      const roomIdx = ry * roomCols + rx;
      if (roomIdx >= numRooms) break;
      // Room boundaries
      const x1 = Math.floor((w * rx) / roomCols);
      const x2 = Math.floor((w * (rx + 1)) / roomCols) - 1;
      const y1 = Math.floor((h * ry) / roomRows);
      const y2 = Math.floor((h * (ry + 1)) / roomRows) - 1;

      // Right wall (with doorway)
      if (rx < roomCols - 1) {
        const doorY = y1 + 1 + Math.floor(rng() * Math.max(1, y2 - y1 - 2));
        for (let y = y1; y <= y2; y++) {
          if (Math.abs(y - doorY) <= 1) continue;
          if (x2 >= 0 && x2 < w) walls.push([x2, y]);
        }
      }
      // Bottom wall (with doorway)
      if (ry < roomRows - 1) {
        const doorX = x1 + 1 + Math.floor(rng() * Math.max(1, x2 - x1 - 2));
        for (let x = x1; x <= x2; x++) {
          if (Math.abs(x - doorX) <= 1) continue;
          if (y2 >= 0 && y2 < h) walls.push([x, y2]);
        }
      }
    }
  }
  return walls;
}

/**
 * Maze — sparse wall pillars creating a maze-like feel with wide passages.
 * Uses every-third-cell spacing and lower placement chance for breathing room.
 */
function tplMaze(w: number, h: number, rng: () => number): [number, number][] {
  const walls = tplOpen(w, h, rng);
  // Wider spacing (every 3 cells) and lower chance → sparser maze
  const cellW = 3, cellH = 3;
  for (let cy = 1; cy < h - 1; cy += cellH) {
    for (let cx = 1; cx < w - 1; cx += cellW) {
      // Place wall in one of the two possible positions (lower probability)
      if (rng() < 0.35) {
        const wy = cy + 1;
        if (wy < h) walls.push([cx, wy]);
      }
      if (rng() < 0.35) {
        const wx = cx + 1;
        if (wx < w) walls.push([wx, cy]);
      }
    }
  }
  return walls;
}

/**
 * Honeycomb — hexagonal-ish pattern: walls form a repeating cellular pattern.
 */
function tplHoneycomb(w: number, h: number, rng: () => number): [number, number][] {
  const walls = tplOpen(w, h, rng);
  const cellSize = 3 + Math.floor(rng() * 2); // 3-4

  for (let cy = cellSize; cy < h; cy += cellSize) {
    const offset = (Math.floor(cy / cellSize) % 2) * Math.floor(cellSize / 2);
    for (let cx = cellSize + offset; cx < w; cx += cellSize) {
      // Place a small wall cluster
      walls.push([cx, cy]);
      if (cx + 1 < w && rng() < 0.6) walls.push([cx + 1, cy]);
      if (cy + 1 < h && rng() < 0.6) walls.push([cx, cy + 1]);
    }
  }
  return walls;
}

/**
 * Compound — 2-4 large sub-regions connected by narrow bridges.
 */
function tplCompound(w: number, h: number, rng: () => number): [number, number][] {
  const walls = tplOpen(w, h, rng);
  const numRegions = 2 + Math.floor(rng() * 3); // 2-4

  if (numRegions <= 2) {
    // Vertical split — single wall with wider bridge
    const splitX = Math.floor(w / 2);
    const bridgeY = Math.floor(h / 2) + Math.floor(rng() * 4) - 2;
    for (let y = 0; y < h; y++) {
      if (Math.abs(y - bridgeY) <= 1) continue;
      walls.push([splitX, y]);
    }
  } else {
    // Quad split — single-thickness walls with wider bridges
    const splitX = Math.floor(w / 2);
    const splitY = Math.floor(h / 2);
    const bridgeH = splitY + Math.floor(rng() * 3) - 1;
    const bridgeV = splitX + Math.floor(rng() * 3) - 1;

    for (let y = 0; y < h; y++) {
      if (Math.abs(y - bridgeH) <= 1) continue;
      walls.push([splitX, y]);
    }
    for (let x = 0; x < w; x++) {
      if (Math.abs(x - bridgeV) <= 1) continue;
      walls.push([x, splitY]);
    }
  }
  return walls;
}

// ── World configurations ─────────────────────────

interface WorldConfig {
  name: string;
  /** Germ progression tiers: [L1-3, L4-10, L11-20, L21-35, L36-50] */
  germs: PathogenType[][];
  /** Template pool per tier (indices into TEMPLATES) — 5 tiers */
  templates: number[][];
  /** [min, max] grid dimension */
  gridRange: [number, number];
  starsNeeded: number;
}

export const WORLD_CONFIGS: Record<number, WorldConfig> = {
  1: {
    name: "Petri Dish",
    germs: [
      ["coccus"],
      ["coccus"],
      ["coccus", "mold"],
      ["coccus", "mold", "bacillus"],
      ["coccus", "mold", "bacillus"],
    ],
    // L1-3: simple intro; L4-10: add Divider+Island; L11-20: drop Open, add Cross+Gateway;
    // L21-35: structural variety; L36-50: full spectrum
    templates: [
      [0, 1],                   // tutorial
      [0, 1, 2, 12],            // early — add Divider, Island
      [1, 2, 3, 11],            // mid — drop Open, add Cross, Gateway
      [2, 3, 4, 5, 13],         // advanced — Divider, Cross, Corridors, L-Wall, AsymSplit
      [3, 4, 5, 7, 10, 11],     // endgame — Cross, Corridors, L-Wall, Chamber, Compound, Gateway
    ],
    gridRange: [8, 12],
    starsNeeded: 0,
  },
  2: {
    name: "Bloodstream",
    germs: [
      ["influenza"],
      ["influenza"],
      ["influenza", "coccus"],
      ["influenza", "coccus", "retrovirus"],
      ["influenza", "coccus", "retrovirus"],
    ],
    // Vein-themed with corridors; expand gradually
    templates: [
      [4, 11],                  // tutorial — Corridors, Gateway
      [4, 11, 12, 6],           // early — add Island, Vein
      [4, 3, 11, 7],            // mid — Corridors, Cross, Gateway, Chamber
      [4, 7, 3, 13, 10],        // advanced — add AsymSplit, Compound
      [4, 5, 7, 10, 3, 13, 6],  // endgame — full variety incl Vein
    ],
    gridRange: [10, 14],
    starsNeeded: 40,
  },
  3: {
    name: "Tissue",
    germs: [
      ["yeast"],
      ["yeast"],
      ["yeast", "spirillum"],
      ["yeast", "spirillum", "retrovirus"],
      ["yeast", "spirillum", "retrovirus"],
    ],
    // Honeycomb-themed for diagonal germs; diversified progression
    templates: [
      [0, 12],                  // tutorial — Open, Island
      [0, 1, 9, 12],            // early — add Honeycomb, Island
      [9, 1, 11, 13],           // mid — Honeycomb, Pillars, Gateway, AsymSplit
      [9, 5, 3, 13, 4],         // advanced — Honeycomb, L-Wall, Cross, AsymSplit, Corridors
      [9, 4, 5, 10, 7, 11],     // endgame — full variety
    ],
    gridRange: [10, 14],
    starsNeeded: 100,
  },
  4: {
    name: "Pandemic",
    germs: [
      ["phage"],
      ["phage"],
      ["phage", "spore"],
      ["phage", "spore", "spirillum"],
      ["phage", "spore", "spirillum", "bacillus"],
    ],
    // Most complex templates from the start
    templates: [
      [10, 4],                  // tutorial — Compound, Corridors
      [10, 4, 12, 11],          // early — add Island, Gateway
      [10, 4, 6, 7, 13],        // mid — add Vein, Chamber, AsymSplit
      [10, 4, 6, 7, 8, 3, 13],  // advanced — add Maze, Cross
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], // endgame — all templates
    ],
    gridRange: [12, 16],
    starsNeeded: 180,
  },
};

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

// ── Phase 4A: Smooth continuous difficulty function ──
// Replaces per-tier constants with a smooth curve.
// Returns 0.15 (L1) → 0.70 (L50) with slight ease-in.
function continuousDifficulty(level: number): number {
  const t = (level - 1) / 49; // 0.0 to 1.0
  return 0.15 + 0.55 * (t * t * 0.3 + t * 0.7);
}

// ── Phase 3A: World-specific difficulty multiplier ──
// Normalizes cross-world balance: W2 gets relief (high natural peaks),
// W4 gets tightened (lower natural peaks must still feel expert).
const WORLD_DIFF_SCALE: Record<number, number> = {
  1: 1.0,   // baseline
  2: 0.85,  // reduce W2 effective difficulty (Influenza peaks very high)
  3: 1.0,   // W3 is balanced
  4: 1.1,   // boost W4 (Phage peaks lower, needs tighter thresholds)
};

function tierParams(level: number, rng: () => number, worldNum: number = 1): TierParams {
  const wc = WORLD_CONFIGS[worldNum] ?? WORLD_CONFIGS[1];
  const [gridMin, gridMax] = wc.gridRange;

  // 5-tier index: L1-3=0, L4-10=1, L11-20=2, L21-35=3, L36-50=4
  const tierIdx = level <= 3 ? 0 : level <= 10 ? 1 : level <= 20 ? 2 : level <= 35 ? 3 : 4;
  const germs = wc.germs[tierIdx];
  const templates = wc.templates[tierIdx];

  // Continuous difficulty for every level (Phase 4A)
  const baseDiff = continuousDifficulty(level);

  // ── Tutorial (1-3): small boards, 1 pair, easiest germ ──
  if (level <= 3) {
    return {
      gridW: gridMin, gridH: gridMin,
      pairCount: 1,
      germTypes: [germs[0]],
      toolsPerTurn: 3, turnLimit: 6, parTurns: 4,
      templates: [templates[0]],
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: baseDiff,
    };
  }
  // ── Early (4-10): medium boards, 1-2 pairs ──
  if (level <= 10) {
    const t = (level - 4) / 6;
    const gs = Math.round(gridMin + t * 2);
    return {
      gridW: gs, gridH: gs,
      pairCount: 1 + Math.floor(rng() * 2),
      germTypes: germs.slice(0, 1),
      toolsPerTurn: 3, turnLimit: 8, parTurns: 5,
      templates,
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: baseDiff,
    };
  }
  // ── Mid (11-20): add second germ if available ──
  if (level <= 20) {
    const t = (level - 11) / 9;
    const gs = Math.round(gridMin + 1 + t * 2);
    return {
      gridW: gs, gridH: gs,
      pairCount: 2,
      germTypes: germs.slice(0, Math.min(2, germs.length)),
      toolsPerTurn: 3, turnLimit: 10, parTurns: 6,
      templates,
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: baseDiff,
    };
  }
  // ── Advanced (21-35): full tier germs, bigger boards ──
  if (level <= 35) {
    const t = (level - 21) / 14;
    const gs = Math.round(gridMin + 2 + t * (gridMax - gridMin - 2));
    return {
      gridW: Math.min(gridMax, gs + Math.floor(rng() * 2)),
      gridH: Math.min(gridMax, gs + Math.floor(rng() * 2)),
      pairCount: 2 + Math.floor(rng() * 2),
      germTypes: germs,
      toolsPerTurn: 3, turnLimit: 12, parTurns: 8,
      templates,
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: baseDiff,
    };
  }
  // ── Endgame (36-49): big boards, all tier germs ──
  if (level <= 49) {
    const t = (level - 36) / 13;
    const gs = Math.round(gridMax - 2 + t * 2);
    return {
      gridW: Math.min(gridMax, gs + Math.floor(rng() * 2)),
      gridH: Math.min(gridMax, gs + Math.floor(rng() * 2)),
      pairCount: 3 + Math.floor(rng() * 2),
      germTypes: germs,
      toolsPerTurn: germs.length >= 4 ? 4 : 3,
      turnLimit: 14, parTurns: 10,
      templates,
      initialTools: 4, grantPerTurn: 1,
      targetDifficulty: baseDiff,
    };
  }
  // ── Boss (50): max board, all germs, extra resources ──
  // Phase 3B: W4 boss gets 0.75 difficulty (hardest in game)
  const bossDiff = worldNum === 4 ? 0.75 : baseDiff;
  return {
    gridW: gridMax, gridH: gridMax,
    pairCount: Math.max(5, 4 + Math.floor(rng() * 2)),
    germTypes: germs,
    toolsPerTurn: germs.length >= 4 ? 4 : 3,
    turnLimit: 16, parTurns: 12,
    templates: [templates[0], templates[Math.min(1, templates.length - 1)]],
    initialTools: 6, grantPerTurn: 2,
    targetDifficulty: bossDiff,
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
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
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
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
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

const PATHOGEN_HINT_NAMES: Record<PathogenType, string> = {
  coccus: "Coccus", bacillus: "Bacillus", spirillum: "Spirillum",
  influenza: "Influenza", retrovirus: "Retrovirus", phage: "Phage",
  mold: "Mold", yeast: "Yeast", spore: "Spore",
};

function generateHint(types: PathogenType[], levelNum: number): string {
  if (levelNum <= 3) {
    const name = PATHOGEN_HINT_NAMES[types[0]] ?? "pathogens";
    return `Place medicine to block ${name} growth. Match the spread pattern!`;
  }
  if (types.length === 1) {
    const t = types[0];
    if (t === "coccus") return "Coccus spreads cardinally — block up/down/left/right.";
    if (t === "mold") return "Mold creeps diagonally — place Fluconazole on diagonal paths.";
    if (t === "bacillus") return "Bacillus leaps 2 cells cardinally! Single walls won't stop it.";
    if (t === "influenza") return "Influenza jumps in knight L-shapes — walls can't contain it!";
    if (t === "yeast") return "Yeast leaps diagonally — long-range diagonal threat.";
    if (t === "phage") return "Phage uses camel jumps — extreme range in L-shapes!";
    if (t === "spore") return "Spore fires diagonal ±3 — the longest-range pathogen!";
    if (t === "retrovirus") return "Retrovirus uses wide knight jumps — horizontal L-shapes.";
    if (t === "spirillum") return "Spirillum moves in narrow knight L-jumps — tricky angles!";
  }
  if (types.length >= 3) return "Multiple pathogen families! Prioritize the fastest spreader.";
  return "Different germs need different medicines — match the right counter!";
}

// ── Main generator ───────────────────────────────

const LEVELS_PER_WORLD = 50;
const MAX_ATTEMPTS = 50;

// Phase 6B: Level-dependent minimum margin
function minMarginForLevel(level: number): number {
  return level <= 10 ? 10 : 8;
}

// Maximum wall density (fraction of total grid cells).
const MAX_WALL_PCT = 0.30;

// ── Phase 5: Template-Germ Affinity ──────────────
// Scores > 1.0 = great combo (boost selection probability)
// Scores < 1.0 = boring combo (reduce selection probability)
// Absent entries = neutral (1.0)
const TEMPLATE_GERM_AFFINITY: Record<number, Partial<Record<PathogenType, number>>> = {
  // Corridors (4) — knight-jumpers leap barriers; cardinal-only germs are boring
  4:  { influenza: 1.5, retrovirus: 1.3, phage: 1.2, coccus: 0.7, mold: 0.7 },
  // Cross (3) — great for multi-germ (different quadrants = triage)
  3:  {},
  // Compound (10) — narrow bridges; long-range germs cross them brilliantly
  10: { phage: 1.5, spore: 1.3, bacillus: 1.2, coccus: 0.5, mold: 0.6 },
  // Honeycomb (9) — aligns with diagonal movement patterns
  9:  { mold: 1.5, yeast: 1.4, spore: 1.3, coccus: 0.6 },
  // Vein (6) — medium/long-range germs navigate channels well
  6:  { influenza: 1.3, spirillum: 1.2, coccus: 0.5, mold: 0.5 },
  // Gateway (11) — doorways force chokepoint defense; good for all
  11: { influenza: 1.2, phage: 1.2 },
  // Island (12) — wrap-around play; diagonal germs go around easily
  12: { mold: 1.3, yeast: 1.3, coccus: 1.1 },
  // AsymSplit (13) — asymmetric halves; multi-germ is interesting
  13: { spirillum: 1.2, retrovirus: 1.2 },
  // L-Wall (5) — L-shape creates interesting corner play
  5:  { bacillus: 1.2, influenza: 1.1 },
  // Chamber (7) — rooms with doorways; all germs play well
  7:  { phage: 1.2, spore: 1.2 },
};

// Compute affinity weight for a template + germ combo
function getAffinityWeight(tplIdx: number, germTypes: PathogenType[]): number {
  const affinities = TEMPLATE_GERM_AFFINITY[tplIdx];
  if (!affinities) return 1.0;
  let total = 0;
  let count = 0;
  for (const germ of germTypes) {
    total += affinities[germ] ?? 1.0;
    count++;
  }
  // Cross (3) gets a bonus per additional germ type
  if (tplIdx === 3 && germTypes.length > 1) {
    total += 0.3 * (germTypes.length - 1);
    count++;
  }
  return count > 0 ? total / count : 1.0;
}

/**
 * Generate all 50 levels for a world. Each level is
 * simulation-validated: doing nothing MUST result in
 * losing (infection exceeds threshold).
 *
 * Phase 1B: Template weight tracking prevents runs of same template.
 * Phase 4B: Anti-regression guard ensures margins increase monotonically.
 */
// Module-level caches for deterministic generation and cross-world dedup.
const _worldGenCache = new Map<number, LevelSpec[]>();
const _globalLayoutFPs = new Set<string>();

export function generateWorld(worldNum: number): LevelSpec[] {
  // Return cached result for deterministic repeated calls
  if (_worldGenCache.has(worldNum)) return _worldGenCache.get(worldNum)!;

  const baseSeed = worldNum * 100_000;
  const levels: LevelSpec[] = [];

  // Phase 1B: Track template usage weights — recently used templates get lower weight
  const templateWeights = new Map<number, number>();
  // Initialize all template weights to 1.0
  for (let t = 0; t < TEMPLATES.length; t++) templateWeights.set(t, 1.0);

  for (let i = 1; i <= LEVELS_PER_WORLD; i++) {
    // Try with increasing salt offsets to avoid duplicates within AND across worlds
    let level: LevelSpec | null = null;
    for (let salt = 0; salt < 10; salt++) {
      const candidate = generateValidLevel(
        worldNum, i, baseSeed + i * 7919 + salt * 131_071,
        templateWeights,
      );
      const fp = candidate.walls.map(([x, y]) => `${x},${y}`).sort().join("|");
      const fpKey = `${candidate.grid.w}x${candidate.grid.h}:${fp}`;
      if (!_globalLayoutFPs.has(fpKey)) {
        _globalLayoutFPs.add(fpKey);
        level = candidate;
        break;
      }
    }
    // If all 10 salts produced duplicates, accept the last one anyway
    if (!level) {
      level = generateValidLevel(worldNum, i, baseSeed + i * 7919 + 999, templateWeights);
    }
    levels.push(level);

    // Phase 1B: Update template weights — detect which template was used
    // and halve its weight; gradually restore all weights over 3 levels
    const usedWallCount = level.walls.length;
    const gridArea = level.grid.w * level.grid.h;
    // Restore all weights toward 1.0
    for (const [t, w] of templateWeights) {
      templateWeights.set(t, Math.min(1.0, w + 0.33));
    }
    // We can't easily detect which template was used from the output,
    // so we track it via a side-channel in generateValidLevel (see _lastUsedTemplate)
    if (_lastUsedTemplate >= 0) {
      templateWeights.set(_lastUsedTemplate, Math.max(0.2, (templateWeights.get(_lastUsedTemplate) ?? 1) * 0.5));
    }
  }

  // ── Phase 4B: Anti-regression guard ──
  // Ensure margins increase roughly monotonically (±3 jitter allowed).
  // If L(N+1) margin < L(N) margin - 3, tighten L(N+1)'s threshold.
  let prevMargin = 0;
  for (let i = 0; i < levels.length; i++) {
    const spec = levels[i];
    const sim = simulateNoAction(spec);
    const margin = sim.peakPct - (spec.objective as { maxPct: number }).maxPct;

    if (i > 0 && margin < prevMargin - 3) {
      // Tighten threshold to enforce at least (prevMargin - 3) margin
      const targetMargin = prevMargin - 3;
      const newMaxPct = Math.max(10, Math.round(sim.peakPct - targetMargin));
      (spec.objective as { maxPct: number; maxTurns: number; type: string }).maxPct = newMaxPct;
      // Verify it still loses
      const verify = simulateNoAction(spec);
      if (verify.result !== "lose") {
        // Revert if it doesn't lose
        (spec.objective as { maxPct: number; maxTurns: number; type: string }).maxPct =
          Math.max(10, Math.round(sim.peakPct - margin));
      }
    }
    const finalMargin = sim.peakPct - (spec.objective as { maxPct: number }).maxPct;
    prevMargin = finalMargin;
  }

  _worldGenCache.set(worldNum, levels);
  return levels;
}

// Side-channel for template tracking (Phase 1B)
let _lastUsedTemplate = -1;

function generateValidLevel(
  worldNum: number,
  levelNum: number,
  baseSeed: number,
  templateWeights?: Map<number, number>,
): LevelSpec {
  const worldDiffScale = WORLD_DIFF_SCALE[worldNum] ?? 1.0;

  // Try multiple attempts with different sub-seeds
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = mulberry32(baseSeed + attempt * 1301);
    const params = tierParams(levelNum, rng, worldNum);
    const { gridW, gridH } = params;

    // ── Phase 1B + 5: Weighted template selection with affinity ──
    let tplIdx: number;
    if (params.templates.length === 1) {
      tplIdx = params.templates[0];
    } else {
      // Build combined weights: recency × affinity
      const pool = params.templates;
      const weights: number[] = pool.map(t => {
        const recencyW = templateWeights?.get(t) ?? 1.0;
        const affinityW = getAffinityWeight(t, params.germTypes);
        return recencyW * affinityW;
      });
      // Weighted random selection
      const totalW = weights.reduce((a, b) => a + b, 0);
      let roll = rng() * totalW;
      let chosen = pool.length - 1;
      for (let p = 0; p < pool.length; p++) {
        roll -= weights[p];
        if (roll <= 0) { chosen = p; break; }
      }
      tplIdx = pool[chosen];
    }
    _lastUsedTemplate = tplIdx;
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

    // Reject boards that are too wall-heavy — pathogens need room to spread.

    // If the template produced zero walls, add random pillars for variety.
    // This prevents multiple levels with the same grid size from looking identical
    // when the Open template is selected.
    if (walls.length === 0) {
      const numExtra = 2 + Math.floor(rng() * 4); // 2-5 pillars
      for (let ep = 0; ep < numExtra; ep++) {
        const px = 1 + Math.floor(rng() * Math.max(1, gridW - 2));
        const py = 1 + Math.floor(rng() * Math.max(1, gridH - 2));
        const k = key(px, py);
        if (!ws.has(k)) {
          ws.add(k);
          walls.push([px, py]);
        }
      }
    }

    const totalCells = gridW * gridH;
    if (totalCells > 0 && walls.length / totalCells > MAX_WALL_PCT) continue;

    // Place seed pairs in open areas
    const seeds = placeSeedPairs(
      gridW, gridH, ws,
      params.pairCount, params.germTypes, rng,
    );

    if (seeds.length < 2) continue; // need at least one pair

    // Build tool inventory from ACTUALLY placed seed types
    const placedTypes = [...new Set(seeds.map(s => s.type))] as PathogenType[];
    const tools = emptyInventory();
    const toolGrant = emptyInventory();
    const perType = Math.ceil(params.initialTools / placedTypes.length);
    const perGrant = Math.max(1, Math.ceil(params.grantPerTurn / placedTypes.length));

    for (const germ of placedTypes) {
      const med = COUNTERED_BY[germ];
      tools[med] = perType;
      toolGrant[med] = perGrant;
    }
    tools.wall = 2 + Math.floor(rng() * 2);

    const title = generateTitle(levelNum, rng);
    const hint = generateHint(placedTypes, levelNum);

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

    // If peak infection is too low, this map can't challenge the player.
    // Long-range movers need higher minimum. Scale down for small grids
    // since there are fewer cells to infect.
    const isLongRange = params.germTypes.some(g =>
      ["yeast", "spore", "spirillum", "phage", "retrovirus", "bacillus"].includes(g)
    );
    const baseMinPeak = isLongRange ? 35 : 25;
    // Scale: full minPeak at 12x12+, half at 8x8
    const gridScale = Math.min(1, Math.max(0.5, (Math.min(gridW, gridH) - 6) / 6));
    const minPeak = baseMinPeak * gridScale;
    if (sim.peakPct < minPeak) continue; // pathogen barely grows — bad level

    // Set threshold relative to simulated peak:
    // Phase 3A: Apply world difficulty scale to normalize cross-world balance.
    // Phase 6A: Cap threshold at 45 (was 60) to avoid confusion with INFECTION_LOSE_PCT=50.
    const rawThreshold =
      sim.peakPct * (1 - params.targetDifficulty * 0.6 * worldDiffScale);
    let maxPct = Math.max(15, Math.min(45, Math.round(rawThreshold)));

    // Phase 6B: Level-dependent minimum margin
    const margin = minMarginForLevel(levelNum);
    if (sim.peakPct - maxPct < margin) {
      maxPct = Math.max(10, Math.round(sim.peakPct - margin));
    }

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

    // ── Single-place win guard (skip for tutorial L1-3) ──
    // Reject layouts where placing ONE medicine and doing nothing else
    // lets the player win. Check cells adjacent to seeds first (most
    // likely to be exploitable), then widen if needed.
    if (levelNum > 3) {
      let singlePlaceWins = false;

      // Collect unique pathogen types and their counter-medicines
      const placedTypes = [...new Set(seeds.map(s => s.type))] as PathogenType[];

      // Build candidate cells: all empty cells within distance 3 of any seed
      const nearbyCells: { x: number; y: number }[] = [];
      const nearbySet = new Set<string>();
      for (const seed of seeds) {
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const cx = seed.x + dx, cy = seed.y + dy;
            if (cx < 0 || cx >= gridW || cy < 0 || cy >= gridH) continue;
            const ck = key(cx, cy);
            if (nearbySet.has(ck) || ws.has(ck)) continue;
            // Skip cells occupied by seeds
            if (seeds.some(s => s.x === cx && s.y === cy)) continue;
            nearbySet.add(ck);
            nearbyCells.push({ x: cx, y: cy });
          }
        }
      }

      for (const ptype of placedTypes) {
        if (singlePlaceWins) break;
        const med = COUNTERED_BY[ptype];
        if (!finalSpec.tools[med] || finalSpec.tools[med] <= 0) continue;

        for (const cell of nearbyCells) {
          const testState = createGameState(finalSpec);
          const tile = getTile(testState.board, cell.x, cell.y);
          if (tile.kind !== "empty") continue;

          const ok = applyAction(testState, {
            type: "place_tool", tool: med, x: cell.x, y: cell.y,
          });
          if (!ok) continue;

          // Simulate remaining turns with no actions
          for (let t = 0; t < params.turnLimit && !testState.isOver; t++) {
            advanceTurn(testState, finalSpec);
          }

          if (testState.result === "win") {
            singlePlaceWins = true;
            break;
          }
        }
      }

      if (singlePlaceWins) continue; // reject — try another attempt
    }

    return finalSpec;
  }

  // ── Fallback: guaranteed-valid open arena ──
  _lastUsedTemplate = 0; // Open template for fallback
  return generateFallback(worldNum, levelNum, baseSeed);
}

/**
 * Fallback level: open board with scattered pillars for variety.
 * Uses the seed to place random interior obstacles so fallback levels
 * with the same grid size don't look identical.
 */
function generateFallback(
  worldNum: number,
  levelNum: number,
  baseSeed: number,
): LevelSpec {
  const rng = mulberry32(baseSeed + 999_999);
  const params = tierParams(levelNum, rng, worldNum);
  const { gridW, gridH } = params;

  // ── Step 1: Compute seed positions FIRST so we can avoid them with pillars ──
  const cx = Math.floor(gridW / 2);
  const cy = Math.floor(gridH / 2);

  const seeds: Array<{ type: PathogenType; x: number; y: number }> = [];
  const seedKeys = new Set<string>();

  for (let i = 0; i < params.pairCount; i++) {
    const gtype = params.germTypes[i % params.germTypes.length];
    const dirs = PATHOGEN_GROWTH[gtype];
    const ox = (i % 3) * 3 - 3;
    const oy = Math.floor(i / 3) * 3 - 1;
    const sx = Math.max(0, Math.min(gridW - 1, cx + ox));
    const sy = Math.max(0, Math.min(gridH - 1, cy + oy));
    const k1 = key(sx, sy);

    if (seedKeys.has(k1)) continue;
    seedKeys.add(k1);
    seeds.push({ type: gtype, x: sx, y: sy });

    for (const [dx, dy] of dirs) {
      const nx = sx + dx, ny = sy + dy;
      if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
      const k2 = key(nx, ny);
      if (seedKeys.has(k2)) continue;
      seedKeys.add(k2);
      seeds.push({ type: gtype, x: nx, y: ny });
      break;
    }
  }

  // ── Step 2: Random pillars for visual variety ──
  // Build list of ALL valid cells (not seed, not adjacent to seed)
  const walls: [number, number][] = [];
  const ws = new Set<string>();

  const blocked = new Set<string>();
  for (const sk of seedKeys) {
    blocked.add(sk);
    // Also block cells adjacent to each seed so growth isn't immediately walled
    const [sx, sy] = sk.split(",").map(Number);
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      blocked.add(key(sx + dx, sy + dy));
    }
  }

  const candidates: [number, number][] = [];
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const k = key(x, y);
      if (!blocked.has(k)) candidates.push([x, y]);
    }
  }

  // Fisher-Yates shuffle candidates using rng
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Place 3-8 pillar cells (scaled by grid area)
  const totalArea = gridW * gridH;
  const minPillars = 3;
  const maxPillars = Math.min(candidates.length, Math.max(4, Math.floor(totalArea * 0.08)));
  const numPillars = Math.min(candidates.length, minPillars + Math.floor(rng() * (maxPillars - minPillars + 1)));

  for (let p = 0; p < numPillars; p++) {
    const [px, py] = candidates[p];
    const k = key(px, py);
    ws.add(k);
    walls.push([px, py]);
  }

  // Build tools from ACTUALLY placed seed types
  const placedTypes = [...new Set(seeds.map(s => s.type))] as PathogenType[];
  const tools = emptyInventory();
  const toolGrant = emptyInventory();
  const perType = Math.ceil(params.initialTools / placedTypes.length);
  const perGrant = Math.max(1, Math.ceil(params.grantPerTurn / placedTypes.length));
  for (const germ of placedTypes) {
    const med = COUNTERED_BY[germ];
    tools[med] = perType;
    toolGrant[med] = perGrant;
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
  let maxPct = Math.max(15, Math.min(45, Math.round(sim.peakPct * 0.5)));

  // Enforce level-dependent minimum margin in fallback too
  const fbMargin = minMarginForLevel(levelNum);
  if (sim.peakPct - maxPct < fbMargin) {
    maxPct = Math.max(10, Math.round(sim.peakPct - fbMargin));
  }

  const finalSpec: LevelSpec = {
    ...prelimSpec,
    objective: { type: "contain", maxPct, maxTurns: params.turnLimit },
  };

  // Verify fallback actually loses with no action
  const verify = simulateNoAction(finalSpec);
  if (verify.result !== "lose") {
    // Force threshold down further
    finalSpec.objective = {
      type: "contain",
      maxPct: Math.max(10, Math.round(sim.peakPct * 0.3)),
      maxTurns: params.turnLimit,
    };
  }

  return finalSpec;
}

// ═══════════════════════════════════════════════════
// Phase 7: Greedy Winnability Solver
// ═══════════════════════════════════════════════════

interface SolverResult {
  won: boolean;
  finalPct: number;
  peakPct: number;
  turnsUsed: number;
}

/**
 * Run a greedy solver on a level spec. Each turn:
 * 1. Identify all pathogen cells.
 * 2. For each pathogen, score adjacent empty cells by how many
 *    pathogen growth directions they block.
 * 3. Place the matching counter-medicine on the highest-scoring cells.
 * 4. Advance the turn.
 */
export function greedySolve(spec: LevelSpec): SolverResult {
  const state = createGameState(spec);
  let peak = 0;

  for (let t = 0; t < spec.turnLimit && !state.isOver; t++) {
    // Refresh tools from grant (advanceTurn handles this, but we need
    // to place BEFORE advancing, so tools are already in state)

    // Score all empty cells by pathogen threat they can block
    const { board } = state;
    const candidates: { x: number; y: number; tool: string; score: number }[] = [];

    for (let y = 0; y < board.h; y++) {
      for (let x = 0; x < board.w; x++) {
        const tile = getTile(board, x, y);
        if (tile.kind !== "empty") continue;

        // Check each medicine type we have
        for (const germ of Object.keys(PATHOGEN_GROWTH) as PathogenType[]) {
          const med = COUNTERED_BY[germ];
          if ((state.tools[med] ?? 0) <= 0) continue;
          if (!canPlaceTool(state, med, x, y)) continue;

          // Score: how many pathogen cells of this germ type are in growth range
          const dirs = PATHOGEN_GROWTH[germ];
          let score = 0;
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= board.w || ny < 0 || ny >= board.h) continue;
            const neighbor = getTile(board, nx, ny);
            if (neighbor.kind === "pathogen" && neighbor.pathogenType === germ) {
              score += 2; // Directly blocking growth
            }
          }
          // Also check if this cell is IN a pathogen's growth path
          for (const [dx, dy] of dirs) {
            const nx = x - dx, ny = y - dy; // reverse: pathogen at nx,ny grows TO x,y
            if (nx < 0 || nx >= board.w || ny < 0 || ny >= board.h) continue;
            const neighbor = getTile(board, nx, ny);
            if (neighbor.kind === "pathogen" && neighbor.pathogenType === germ) {
              score += 3; // Blocking this cell from being born as pathogen
            }
          }

          if (score > 0) {
            candidates.push({ x, y, tool: med, score });
          }
        }
      }
    }

    // Sort by score descending and place up to toolsPerTurn
    candidates.sort((a, b) => b.score - a.score);
    let placed = 0;
    const usedCells = new Set<string>();
    for (const cand of candidates) {
      if (placed >= state.toolsPerTurn) break;
      const ck = `${cand.x},${cand.y}`;
      if (usedCells.has(ck)) continue;
      if ((state.tools[cand.tool as keyof typeof state.tools] ?? 0) <= 0) continue;

      const success = applyAction(state, {
        type: "place_tool",
        tool: cand.tool as any,
        x: cand.x,
        y: cand.y,
      });
      if (success) {
        placed++;
        usedCells.add(ck);
      }
    }

    // Advance the turn (runs growth simulation)
    advanceTurn(state, spec);
    const pct = infectionPct(state.board);
    if (pct > peak) peak = pct;
  }

  return {
    won: state.result === "win" || state.result === "playing",
    finalPct: infectionPct(state.board),
    peakPct: peak,
    turnsUsed: state.turn,
  };
}
