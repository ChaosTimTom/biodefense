# Procedural Level Generation

> Defined in `src/sim/generator.ts` (1136 lines) — the largest file in the codebase  
> Uses seeded PRNG for full determinism — same seed always produces the same level

---

## Overview

All 200 levels are generated on-the-fly from deterministic seeds. No level data is shipped in the bundle. Every level is **simulation-validated**: the generator proves that doing nothing results in a loss before accepting a level as valid.

### Key Properties

- **Deterministic** — mulberry32 seeded PRNG, no Math.random() calls
- **Simulation-validated** — every level verified losable without player input
- **Deduplication** — cross-world fingerprint system prevents duplicate layouts
- **Fallback-safe** — guaranteed-valid fallback generator if main pipeline exhausts attempts

---

## PRNG: mulberry32

```typescript
function mulberry32(seed: number): () => number
```

A 32-bit seeded PRNG that returns floats in [0, 1). Chosen for:
- Speed (single 32-bit state, 4 operations per call)
- Adequate distribution for games
- Full reproducibility from seed

### Seed Derivation

Each level's seed is computed as:

```
seed = worldNum × 100,000 + levelNum × 7,919 + salt × 131,071
```

Where:
- `worldNum` is 1–4
- `levelNum` is 1–50
- `salt` starts at 0, incrementing up to 10 during dedup retries
- The primes (7,919 and 131,071) spread seeds across the number space

The `rng` function returned by `mulberry32(seed)` is passed to all template and placement functions, ensuring the entire level is deterministic from its seed.

---

## Generation Pipeline

### Top-Level: `generateWorld(worldNum)`

```
1. Check _worldGenCache[worldNum] → return if cached
2. For each levelNum 1..50:
   a. Compute seed
   b. Call generateValidLevel(worldNum, levelNum, seed)
   c. Check fingerprint against _globalLayoutFPs
   d. If duplicate: retry with salt += 1 (up to 10 salts)
   e. Store fingerprint, push to results
3. Cache results in _worldGenCache[worldNum]
4. Return LevelSpec[]
```

Module-level caches ensure worlds are only generated once per session:
- `_worldGenCache: Map<number, LevelSpec[]>` — full world results
- `_globalLayoutFPs: Set<string>` — layout fingerprints from all worlds

### Core: `generateValidLevel(worldNum, levelNum, seed)`

Tries up to `MAX_ATTEMPTS = 50` to produce a valid level:

```
For attempt in 1..50:
  1. Create rng from seed + attempt offset
  2. tierParams(levelNum) → grid size, germ types, pair count, resources
  3. Pick world config → get germ tiers and template pool
  4. Select random template from pool → generate wall coordinates
  5. Compute layout fingerprint: "${w}x${h}:${sortedWalls}"
  6. Skip if fingerprint seen before (within this world)
  
  7. Post-process walls:
     a. If template produced ONLY border walls → inject random pillars (2-5)
     b. Check interior wall density ≤ MAX_INTERIOR_WALL_PCT (30%)
     c. Skip if too many interior walls
  
  8. placeSeedPairs() → place pathogen seed pairs in open areas
  9. Skip if placement failed (not enough reachable space)
  
  10. Derive tools from ACTUALLY placed seed types:
      - For each unique pathogen type placed → add its counter medicine
      - Add wall tool
      - Set initial counts and per-turn grants
  
  11. simulateNoAction(spec) → get {peakPct, result, finalPct}
  12. Validate:
      - peakPct ≥ minPeak (35% for long-range types, 25% for short-range)
      - (minPeak scaled down for small grids: ×0.75 if area < 100)
  13. Skip if peak too low (level wouldn't be threatening enough)
  
  14. Compute threshold:
      targetDifficulty = levelNum / 50 (0.0-1.0)
      rawThreshold = peakPct × (1 - targetDifficulty × 0.6)
      threshold = clamp(rawThreshold, 15, 60)
      Enforce MIN_MARGIN = 8: threshold = min(threshold, peakPct - 8)
  
  15. Re-simulate with real threshold → verify result is "lose"
  16. Skip if player would survive doing nothing
  
  17. Generate title and hint
  18. Return complete LevelSpec ✓

If all 50 attempts fail:
  → generateFallback(worldNum, levelNum, seed)
```

---

## Wall Templates (11)

Each template receives `(w, h, rng)` and returns `[x, y][]` of wall coordinates. All templates include border walls (the perimeter rectangle).

### Template 0: `tplOpen`

**Completely open interior.** Only border walls.

```
████████
█      █
█      █
█      █
████████
```

Used in early-game worlds to teach pure growth mechanics without wall interference.

### Template 1: `tplPillars`

**3-6 scattered wall blocks** (1×1 or 2×2) in the interior.

```
████████████
█          █
█  ██      █
█  ██  █   █
█          █
█     ██   █
█     ██   █
████████████
```

Pillar count: `3 + floor(rng() × 4)`. Each pillar is 1×1 or 2×2 (50% chance each). Positions randomized, avoiding overlap and border adjacency.

### Template 2: `tplDivider`

**Single wall line** across the board (horizontal or vertical) with **2-3 gaps** of width 2.

```
████████████
█          █
█          █
█  ██ ████ █
█          █
█          █
████████████
```

Gap positions randomized. Creates two semi-connected regions.

### Template 3: `tplCross`

**"+" shape** creating 4 quadrants with 2-wide gaps at each arm.

```
████████████
█    ██    █
█    ██    █
█    ██    █
█          █
████  ██████
█          █
█    ██    █
█    ██    █
████████████
```

Quadrants force the player to manage 4 separate fronts.

### Template 4: `tplCorridors`

**1-2 wall strips** running the length of the board with 2-wide gaps, creating lanes.

```
████████████
█          █
█  ████ █  █
█          █
█          █
█  █ ████  █
█          █
████████████
```

Strip count: `1 + floor(rng() × 2)`. Creates linear channels — excellent for Bloodstream's "vein" theme.

### Template 5: `tplLWall`

**L-shaped wall** creating two connected regions. May be flipped horizontally/vertically.

```
████████████
█      █   █
█      █   █
█      █   █
█          █
█          █
████████████
```

4 flip variants: normal, H-flip, V-flip, both. The L creates an asymmetric layout that rewards reading growth direction.

### Template 6: `tplVein`

**Wide meandering channel** carved from a filled interior. Width 3-4 cells.

```
████████████
███    █████
███     ████
█████    ███
████      ██
███     ████
███    █████
████████████
```

Algorithm: starts with the entire interior filled with walls, then carves a meandering path from top to bottom (or left to right) with random lateral drift, maintaining width of 3-4 cells. Creates organic, blood-vessel-like layouts.

### Template 7: `tplChamber`

**3-4 rectangular rooms** connected by 2-wide doorways.

```
████████████
█████  █████
██       ███
██       ███
████  ██████
█████  █████
██       ███
██       ███
████████████
```

Room count: `3 + floor(rng() × 2)`. Room dimensions: random within [3×3, 5×5]. Doorway width: always 2 cells. Rooms are placed and then connected by carving 2-wide passages between them.

### Template 8: `tplMaze`

**Sparse pillar grid** every 3 cells with 35% placement chance.

```
████████████
█  █  █  █ █
█          █
█  █     █ █
█          █
█  █  █    █
█          █
████████████
```

Iterates `for (x=2; x<w-2; x+=3) for (y=2; y<h-2; y+=3)`: each position has 35% chance of becoming a wall. Creates a loose maze-like structure with many paths.

### Template 9: `tplHoneycomb`

**Hexagonal-ish repeating pattern** using offset columns.

```
████████████
█ █ █ █ █ █
█          █
██ █ █ █ ██
█          █
█ █ █ █ █ █
█          █
████████████
```

Alternating rows with walls at even/odd x positions, shifted by 1 between rows. Creates a cellular honeycomb pattern that interacts uniquely with diagonal movement types.

### Template 10: `tplCompound`

**2-4 large sub-regions** connected by narrow bridges (1-2 cells wide).

```
████████████
█████  █████
█████  █████
█          █
█          █
█████  █████
█████  █████
████████████
```

Sub-region count: `2 + floor(rng() × 3)`. Each region is a rectangular open zone. Bridges are the minimum-width connections. This is the hardest template — narrow bridges create severe bottlenecks where infection can jump between regions.

---

## Seed Placement (`placeSeedPairs`)

Seeds are placed as **pairs** so they survive the first generation's isolation check (a lone pathogen with no allies dies immediately).

### Algorithm

```
For each pair (1..numPairs):
  1. Choose germ type (round-robin from tier's pool)
  
  2. Score ALL open interior cells by growth reachability:
     growthBFS(board, x, y, germType, depth=4)
     Returns: number of cells reachable within 4 growth steps
  
  3. Sort candidates by reach score descending
  
  4. Pick first cell randomly from top 20% of scored candidates
  
  5. Find partner: check the germ's growth directions from
     the chosen cell. Pick the first valid direction where:
     - Target is in bounds
     - Target is empty
     - Target is not in an exclusion zone
  
  6. Place both pathogen tiles on the board
  
  7. Mark ±2 exclusion zone around both tiles
     (prevents pairs from stacking together)
```

### Growth BFS (`growthBFS`)

```typescript
function growthBFS(board: Board, startX: number, startY: number, 
                   germType: PathogenType, maxDepth: number): number
```

Flood-fill using the germ's specific growth directions (from `GROWTH_DIRS`). Returns the count of unique cells reachable within `maxDepth` steps. Used to ensure seeds are placed in areas with high growth potential — a seed placed in a corner with walls blocking all growth directions would be trivially contained.

### Top-20% Selection

Seeds prefer high-reach cells but not deterministically the highest. Taking randomly from the top 20% adds variety — same germ type on the same template will end up in different positions across levels.

### Exclusion Zone

After placing a pair, a ±2 Manhattan distance exclusion zone is applied. This prevents the next pair from being placed adjacent to existing seeds, ensuring each pair creates a distinct infection front.

---

## Simulation Validation

### `simulateNoAction(spec)`

Creates a game state from the spec and runs `advanceTurn` repeatedly with zero player actions until the game ends:

```typescript
function simulateNoAction(spec: LevelSpec): {
  peakPct: number;    // highest infection % observed
  result: string;     // "win" or "lose"  
  finalPct: number;   // infection % at game end
}
```

### Validation Criteria

A level is accepted only if:

1. **Peak infection is high enough:**
   - Long-range types (bacillus, spirillum, retrovirus, yeast, spore, phage): `minPeak = 35%`
   - Short-range only (coccus, influenza, mold): `minPeak = 25%`
   - Small grids (area < 100): minPeak ×= 0.75
   
2. **Player would lose without intervention:**
   - Re-simulate with the computed threshold → result must be "lose"
   - If the infection naturally stays below the threshold, the level is invalid (player wins for free)

### Threshold Derivation

```
targetDifficulty = levelNum / 50     (0.02 for L1, 1.0 for L50)
rawThreshold = peakPct × (1 - targetDifficulty × 0.6)
threshold = clamp(rawThreshold, 15, 60)

// Enforce minimum gap between peak and threshold:
if (threshold > peakPct - MIN_MARGIN):
    threshold = peakPct - MIN_MARGIN     (MIN_MARGIN = 8)
```

Example calculations:
- Level 5, peak 45% → `45 × (1 - 0.1 × 0.6)` = 42.3% → threshold 42%
- Level 25, peak 50% → `50 × (1 - 0.5 × 0.6)` = 35% → threshold 35%
- Level 50, peak 55% → `55 × (1 - 1.0 × 0.6)` = 22% → threshold 22%

---

## Deduplication System

### Layout Fingerprint

```
fingerprint = "${gridW}x${gridH}:${sortedWallCoordinates}"
```

Where wall coordinates are sorted numerically and joined. Two levels with identical grid size and wall positions produce the same fingerprint.

### Within-World Dedup

During `generateValidLevel`, a local set tracks fingerprints seen within the current generation attempt. Duplicate wall layouts within the same world are rejected immediately.

### Cross-World Dedup

`_globalLayoutFPs` is a module-level `Set<string>` that accumulates fingerprints from all generated worlds. Within `generateWorld`, each level's fingerprint is checked against this global set.

If a duplicate is found, the level is regenerated with `salt += 1` (up to 10 retries), which changes the PRNG seed and produces a different template/wall arrangement.

### Effectiveness

The solvability test suite validates: **0 duplicates across all 200 levels.**

---

## Fallback Generator (`generateFallback`)

If all 50 attempts in `generateValidLevel` fail (extremely rare — the test suite verifies 0 fallbacks needed), a guaranteed-valid open arena is produced:

```
1. Compute seed positions first:
   - Place near board center using simple offset rules
   - Each pair along a different cardinal direction from center

2. Build border walls (full perimeter rectangle)

3. Scatter 3-8 interior pillars:
   - Count scales with grid area: floor(area / 30) clamped to [3, 8]
   - Random positions, avoiding:
     - Seed cells and their immediate neighbors
     - Other pillars
   - Each pillar is 1×1

4. Derive tools from actually-placed seed types

5. simulateNoAction() → get peak
   threshold = peak × 0.5, clamped to [15, 50]
   Enforce MIN_MARGIN = 8
```

The fallback always succeeds because:
- Seeds are in open space with guaranteed growth paths
- Threshold is set at half the peak (generous margin)
- No complex template layouts to cause issues

---

## Title & Hint Generation

### Titles

Random `${Adjective} ${Noun}` combination:

**20 Adjectives:** Viral, Toxic, Silent, Rapid, Dormant, Volatile, Infectious, Resistant, Mutant, Chronic, Acute, Lethal, Benign, Feral, Phantom, Rogue, Terminal, Primal, Veiled, Parasitic

**20 Nouns:** Cascade, Outbreak, Bloom, Drift, Surge, Nexus, Core, Strain, Vector, Cluster, Breach, Front, Wave, Cell, Colony, Zone, Pulse, Swarm, Hive, Maze

**Special overrides:**
- Level 25 of any world → "Patient Zero"
- Level 50 of any world → "Total Outbreak"

### Hints

Generated by `generateHint(levelNum, germTypes)`:

- **Levels 1-3:** Tutorial-style ("Place medicine adjacent to germs to create dead zones that block spread")
- **Single germ type:** Type-specific strategy hints referencing the growth pattern
- **Multi-germ levels (21+):** Prioritization advice ("Multiple pathogen types active — triage the fastest spreader and contain it first")

---

## Post-Processing: Border Pillar Injection

When a template produces only border walls (like `tplOpen`), the generator injects random interior pillars to add visual variety and tactical interest:

```
if (all walls are on the border):
    pillarCount = 2 + floor(rng() × 4)  // 2-5 pillars
    for each pillar:
        pick random interior position
        skip if already a wall, seed, or seed-adjacent
        place 1×1 wall
```

This prevents completely empty boards in the early game while keeping them mostly open.

---

## Interior Wall Density Check

```
MAX_INTERIOR_WALL_PCT = 0.30  (30%)
```

After template wall generation, the ratio of interior walls to total interior cells is checked. If > 30%, the level attempt is rejected. This prevents overly cramped boards where pathogens can't spread and the game becomes trivially easy.

Interior walls = total walls - border walls. Interior cells = (w-2) × (h-2).

---

## Performance Considerations

### Generation Cost

Each world (50 levels) generates in ~50-100ms on modern hardware. The simulation validation (`simulateNoAction`) is the most expensive part — running the full turn engine for each candidate level.

### Caching

- `_worldGenCache` prevents re-generation when MenuScene is revisited
- `_globalLayoutFPs` persists for session lifetime, ensuring cross-world dedup even if worlds are generated in different orders

### Why Generate At Runtime?

1. **Zero level storage** — no JSON, no asset bundles, no level editor exports
2. **Guaranteed variety** — 200 unique validated levels from algorithmic seeds
3. **Reproducibility** — identical across all devices and sessions
4. **Easy expansion** — adding World 5 is just another config entry
