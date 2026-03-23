# Bio Defence — Level Design Improvement Plan

> Analysis date: Feb 27 2026
> Scope: 200 procedurally generated levels (4 worlds × 50 levels)
> Based on: full code review of `generator.ts`, `step.ts`, `constants.ts`, `config.ts`, `main.ts`, all KB docs, and runtime scan of all 200 levels

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Mobile Grid Size Analysis](#2-mobile-grid-size-analysis)
3. [Problem Areas (Ranked by Impact)](#3-problem-areas-ranked-by-impact)
4. [How Difficulty Works Today](#4-how-difficulty-works-today)
5. [Rules for a "Good" Level](#5-rules-for-a-good-level)
6. [Improvement Plan](#6-improvement-plan)
7. [Appendix: Raw Data](#7-appendix-raw-data)

---

## 1. Current State Summary

### What's Working Well

| Metric | Result |
|--------|--------|
| Instant-win levels (player wins doing nothing) | **0 / 200** |
| Duplicate layouts across all 200 levels | **0** |
| Fallback levels (generator gave up) | **0** |
| Difficulty ramp smoothness | **No spikes > 15 margin between adjacent levels** |
| Open space ratio below 40% | **0 levels** |
| All levels validated as losable without play | **200 / 200** |

### World Summary

| Metric | W1 Petri Dish | W2 Bloodstream | W3 Tissue | W4 Pandemic |
|--------|:---:|:---:|:---:|:---:|
| Grid range | 8×8 – 15×15 | 10×10 – 17×17 | 10×10 – 17×17 | 12×12 – 19×19 |
| Avg grid area | 137 cells | 187 cells | 188 cells | 248 cells |
| Margin range | 7.5 – 25.9 | 8.1 – 26.7 | 7.6 – 25.3 | 7.9 – 25.3 |
| Avg margin | 17.1 | 18.9 | 16.7 | 16.2 |
| Open ratio | 43% – 71% | 51% – 74% | 54% – 77% | 58% – 78% |
| Avg peak infection | 58.9% | 64.5% | 55.8% | 54.3% |
| Avg threshold | 41.7% | 45.6% | 39.1% | 38.1% |
| Seed count range | 2 – 10 | 2 – 10 | 2 – 8 | 2 – 8 |
| Turn limit range | 6 – 16 | 6 – 16 | 6 – 16 | 6 – 16 |

### Scorecard

| Dimension | Grade | Notes |
|-----------|:---:|---|
| Mechanical validity | **A+** | 200/200 losable, 0 dupes, 0 fallbacks |
| Difficulty curve | **B+** | Smooth ramp, but flat spots within tiers |
| Layout variety | **C** | 58% Pillars dominance across all worlds |
| Cross-world balance | **C+** | W2 "intermediate" is harder than W4 "expert" |
| Strategic depth per level | **B** | Template-germ combos are unweighted |
| Winnability guarantee | **C** | No solver — unwinnable edge cases possible |
| Mobile playability | **B-** | Tiles shrink to 20px at 18×18 — below tap target |
| "Can get good at it" | **A-** | Chess-piece movement is learnable, dead zones are elegant |

---

## 2. Mobile Grid Size Analysis

### Rendering Pipeline

The game uses a **400 × 720 virtual canvas** with `Phaser.Scale.FIT` and `CENTER_BOTH`. On any device, the 400×720 canvas is scaled uniformly to fill the screen while maintaining aspect ratio.

The `computeLayout()` function allocates:
- **Header:** 80px (title, stars, back button)
- **Status bar:** 52px
- **Tool palette:** 56px
- **Turn controls:** 48px
- **Padding:** ~40px total
- **Grid area:** whatever remains ≈ **412px tall × 368px wide** (after 16px padding on each side)

Tile size is: `min(56, floor(412 / rows), floor(368 / cols))`

### Computed Tile Sizes Per Grid Dimension

| Grid | Tile Size (px) | Grid Pixel Size | Physical Size on Phone* | Tap Target | Verdict |
|------|:-:|:-:|:-:|:-:|---|
| **8×8** | 46 | 368×368 | 8.0mm | **Good** | Comfortable |
| **9×9** | 40 | 360×360 | 7.0mm | **Good** | Comfortable |
| **10×10** | 36 | 360×360 | 6.3mm | **OK** | Workable |
| **11×11** | 33 | 363×363 | 5.7mm | **OK** | Getting tight |
| **12×12** | 30 | 360×360 | 5.2mm | **Marginal** | Misplacement risk |
| **13×13** | 28 | 364×364 | 4.9mm | **Marginal** | Frustrating for fat fingers |
| **14×14** | 26 | 364×364 | 4.5mm | **Small** | Precision required |
| **15×15** | 24 | 360×360 | 4.2mm | **Small** | Frequent misplacement |
| **16×16** | 23 | 368×368 | 4.0mm | **Too small** | Below Apple/Google minimum |
| **17×17** | 21 | 357×357 | 3.7mm | **Too small** | Bad experience |
| **18×18** | 20 | 360×360 | 3.5mm | **Too small** | Unplayable without zoom |
| **19×19** | 19 | 361×361 | 3.3mm | **Too small** | Unplayable without zoom |

*\*Physical size assumes a typical 375pt iPhone (SE through 14) where 400 virtual pixels maps to ~69mm screen width. Formula: `tileSize / 400 × 69mm`.*

### Mobile Tap Target Standards

- **Apple HIG:** minimum 44×44pt (~7.7mm)
- **Google Material:** minimum 48×48dp (~7.5mm)
- **Practical minimum for games:** ~5mm (tolerates some misplacement)
- **Absolute floor for precision tile games:** ~4.5mm

### Impact on Current Worlds

| World | Grid Range | Tile Range | Mobile Impact |
|-------|:-:|:-:|---|
| **W1 Petri Dish** | 8×8 – 14×14 | 46px – 26px | Early levels great, late levels tight but manageable |
| **W2 Bloodstream** | 10×10 – 16×16 | 36px – 23px | Mid levels OK, endgame levels too small |
| **W3 Tissue** | 10×10 – 16×16 | 36px – 23px | Same issues as W2 |
| **W4 Pandemic** | 12×12 – 18×18 | 30px – 20px | Most levels are marginal or too small |

### Where Levels Currently Fall

| Tile Size Bucket | Level Count | % of All Levels | Mobile Quality |
|:-:|:-:|:-:|---|
| ≥ 36px (≤10×10) | ~38 | 19% | Great |
| 28–35px (11–13) | ~52 | 26% | Acceptable |
| 23–27px (14–16) | ~68 | 34% | Marginal to poor |
| ≤ 22px (17–19) | ~42 | 21% | Bad to unplayable |

**55% of all levels (110/200) have tiles at or below the marginal threshold for mobile.**

### Recommendation: Grid Size Caps

| World | Current Max | Recommended Max | Reason |
|-------|:-:|:-:|---|
| W1 | 14×14 (26px tile) | **12×12** (30px) | Intro world should be fully comfortable |
| W2 | 16×16 (23px tile) | **14×14** (26px) | Acceptable with some tight spots |
| W3 | 16×16 (23px tile) | **14×14** (26px) | Same as W2 |
| W4 | 18×18 (20px tile) | **16×16** (23px) | Expert world can push limits, but 18+ is unplayable |

Alternative: implement pinch-to-zoom for grids > 14×14 instead of capping sizes.

---

## 3. Problem Areas (Ranked by Impact)

### P1: Pillars Template Dominance (58% of all levels) — HIGH

**116 out of 200 levels use the Pillars template**, its injected-pillar variant, or very similar scattered-block layouts.

| World | Pillars % | Next Most Common |
|-------|:-:|---|
| W1 Petri Dish | **76%** (38/50) | Cross 12% |
| W2 Bloodstream | **52%** (26/50) | Corridors 18% |
| W3 Tissue | **74%** (37/50) | Corridors 16% |
| W4 Pandemic | **30%** (15/50) | Corridors 28% |

**Root cause:** Early tier template pools are `[Open(0), Pillars(1)]`. Open gets random pillars injected, so both become Pillars variants. Pools don't diversify until level 21+.

**Player impact:** Levels 1–20 in W1 and W3 look structurally identical — a border rectangle with scattered blocks. Players won't consciously register why, but the game feels "samey." This is the #1 threat to retention in the first hour.

### P2: World 2 "Intermediate" Is Harder Than World 4 "Expert" — HIGH

W2 Bloodstream has the highest average margins and peaks of any world:

| Metric | W2 Bloodstream | W4 Pandemic |
|--------|:-:|:-:|
| Avg peak infection | **64.5%** | 54.3% |
| Avg margin | **18.9** | 16.2 |
| Max margin | **26.7** | 25.3 |
| Levels in top-20 hardest | **13** | 3 |

Influenza's 8-direction full knight movement generates massive infection peaks. The threshold formula (`peak × (1 - difficulty × 0.6)`) translates high peaks into high margins, meaning W2 demands more aggressive suppression than the "expert" world.

**Root cause:** The threshold formula is proportional to peak, but peak is determined largely by germ type, not world ordering. Influenza (W2 flagship) naturally peaks higher than Phage (W4 flagship) despite Phage being the "hardest" germ.

### P3: 55% of Levels Below Mobile Tap Target — HIGH

See [Section 2](#2-mobile-grid-size-analysis). Over half of all levels have tiles at or below 27px virtual (4.5mm physical), which is the practical floor for precision tile placement on mobile.

### P4: Flat Difficulty Within Tiers — MEDIUM

`targetDifficulty` is constant within most tiers:

| Tier | Levels | Target Difficulty |
|------|:-:|:-:|
| Tutorial | 1–3 | 0.2 |
| Early | 4–10 | 0.3 |
| Mid | 11–20 | 0.4 |
| Advanced | 21–35 | 0.5 → 0.6 (only tier that ramps) |
| Endgame | 36–49 | 0.6 |
| Boss | 50 | 0.65 |

Level 4 and Level 10 within a world have the same `targetDifficulty`. Grid size and seed count increase, but the threshold formula treats them identically. Random variance from peaks smooths this somewhat, but there's no guaranteed "harder next level" within a tier.

### P5: No Template-Germ Interaction Awareness — MEDIUM

Templates and germ types are selected independently. Some combinations create brilliant gameplay; others are trivially boring:

| Great Combo | Why |
|---|---|
| Corridors + Influenza | Knight jumps leap barriers — forces precision medicine placement |
| Cross + multi-germ | Each quadrant can have a different threat — forces triage |
| Compound + Phage | Camel jumps cross narrow bridges — extreme difficulty |
| Honeycomb + diagonal germs | Honeycomb aligns with diagonal movement — resonant interaction |

| Wasted Combo | Why |
|---|---|
| Pillars + Coccus | No wall interaction, pure brute force placement |
| Pillars + Mold | Same — scattered blocks don't create decisions |
| Vein + short-range germs | Short germs can't traverse vein channels well, low threat |

### P6: 22 Levels Have Threshold > 50% — LOW-MEDIUM

Mostly early W1/W2 levels. A threshold of 55–60% means the player can let infection cover over half the board and still "contain" it. Combined with `INFECTION_LOSE_PCT = 50`, this creates confusing situations where the player is near 50% and unclear if they're losing or winning.

### P7: No Winnability Proof — LOW (Mitigated)

The generator proves every level is *losable* (doing nothing loses). It does NOT prove every level is *winnable* (optimal play wins). There's no solver.

**Mitigating factors:**
- Margin between peak and threshold gives room for suboptimal play
- Tool grants refill each turn (resources aren't finite)
- Switch mechanic allows correcting mistakes
- Undo system lets players replay turns
- No evidence from playtesting of unwinnable levels (but no proof either)

**Risk:** Long-range germ + Compound template + narrow bridge could theoretically trap germs beyond reachable medicine range.

---

## 4. How Difficulty Works Today

### The Core Formula

```
targetDifficulty = per-tier constant (0.2 – 0.65)
rawThreshold = peakPct × (1 - targetDifficulty × 0.6)
threshold = clamp(rawThreshold, 15, 60)
margin enforcement: threshold ≤ peakPct - 8  (MIN_MARGIN = 8)
```

**What the player experiences:**
- **Margin** = how many percentage points of infection the player must suppress compared to doing nothing
- Low margin (7–10) → player needs to block very little growth → easy
- High margin (20–27) → player must block a quarter of natural growth → hard

### Observed Difficulty Ramp

| Tier | Levels | Avg Margin | Avg Grid | Avg Seeds | Avg Threshold | Feel |
|------|:-:|:-:|:-:|:-:|:-:|---|
| Tutorial | 1–3 | 9.1 | 9×9 | 2 | 47% | "I can see where to place" |
| Early | 4–10 | 10.3 | 10×10 | 3 | 44% | "I'm getting the hang of this" |
| Mid | 11–20 | 13.8 | 12×12 | 4 | 40% | "Two threats — which first?" |
| Advanced | 21–35 | 20.2 | 14×14 | 5 | 37% | "I need a plan" |
| Endgame | 36–49 | 21.3 | 16×16 | 7 | 34% | "Every placement matters" |
| Boss | 50 | 23.3 | max×max | 9 | 35% | "Sustained execution" |

### What Makes a Level Feel Easy vs Hard

| Dimension | Easy | Hard |
|-----------|------|------|
| Grid size | Small (8–10) — trackable | Large (16+) — overwhelming |
| Germ count | 1 type — predictable | 3–4 types — must juggle counters |
| Seed pairs | 1 pair — single front | 4+ pairs — multi-front triage |
| Growth range | Short (1 cell) — easy to block | Long (2–3 cells) — jumps walls |
| Threshold | >45% — generous room | <30% — razor thin |
| Template | Open/Pillars — no wall decisions | Compound/Vein — bottleneck defense |
| Turns | 6–8 — quick game | 14–16 — sustained pressure |

---

## 5. Rules for a "Good" Level

### Rule 1: Must Be Losable (ALREADY MET)
Doing nothing must result in infection breaching the threshold. Validated by `simulateNoAction()`.

### Rule 2: Must Be Winnable (NOT VALIDATED)
An optimal player with the given tools, turn limit, and layout must be able to suppress infection below threshold. Currently unproven.

**Proposed validation:** Implement a greedy solver that tries obvious placements (medicine adjacent to seeds, walls at chokepoints). If the greedy solver can win, a human certainly can. If not, flag the level for review.

### Rule 3: Unique Layout (ALREADY MET)
No two levels share the same wall fingerprint. Validated by dedup system.

### Rule 4: Perceptual Uniqueness (PARTIALLY MET)
Two levels are "perceptually unique" if they differ on ≥2 of these 3 axes:
1. **Layout shape** (template type — not just wall positions)
2. **Germ type composition** (different movement families)
3. **Scale** (significantly different grid size)

Currently, L1–L10 in W1 often match on all three: Pillars + Coccus + small grid. They differ only in pillar positions — low perceptual uniqueness.

### Rule 5: Adequate Open Space (ALREADY MET)
≥ 40% of the board must be open (non-wall) cells. Interior wall density capped at 30%. All 200 levels pass.

### Rule 6: Growth Has Room
Pathogens need open corridors to grow through. The `growthBFS` check in seed placement ensures seeds are in reachable areas, but doesn't check that the board as a whole allows multi-turn growth paths.

**Proposed formula for minimum growth runway:**
```
minRunway = growthBFS(seed, germ, depth=turnLimit) / openCells
Target: ≥ 0.3 (germ can reach 30% of open cells within the turn limit)
```

### Rule 7: Decisions Per Turn ≥ 2
A good level should present the player with at least 2 meaningfully different placement options each turn. On a Pillars + single-germ layout, every open cell adjacent to infection is roughly equal — low decision density.

### Rule 8: Can't Win Too Quickly
If the player can eradicate all pathogens in ≤ 2 turns, the level feels trivial regardless of settings.

**Check:** `seedCount × overwhelmThreshold ≤ toolsPerTurn × 2` → level can potentially be solved in 2 turns. Fine for tutorials (L1-3), should be guarded against for L4+.

### Rule 9: Board Matches Mobile Tap Targets
Tile size after layout computation must be ≥ 23px virtual (4.0mm physical). Grids larger than 16×16 violate this on the current 400×720 canvas.

---

## 6. Improvement Plan

### Phase 1: Template Diversity (Highest Impact, Moderate Effort)

#### 1A. Expand Early Tier Template Pools

**Current W1 tiers:**
```
L1–10:  [Open(0), Pillars(1)]              → 2 options
L11–20: [Open(0), Pillars(1), Divider(2)]  → 3 options
```

**Proposed W1 tiers:**
```
L1–3:   [Open(0), Pillars(1)]              → 2 options (tutorial, keep simple)
L4–10:  [Open(0), Pillars(1), Divider(2)]  → 3 options
L11–20: [Pillars(1), Divider(2), Cross(3)] → 3 options (drop Open)
L21–35: [Divider(2), Cross(3), Corridors(4), L-Wall(5)]      → 4 options
L36–50: [Cross(3), Corridors(4), L-Wall(5), Chamber(7), Compound(10)] → 5 options
```

Apply similar changes to W3 Tissue (which also has 74% Pillars).

**Target:** Reduce Pillars prevalence from 58% to ≤ 25%.

#### 1B. Add Weighted Template Selection

Instead of uniform random from pool, weight templates by how recently they were used:

```typescript
// After picking a template, halve its weight for the next 3 levels
// This prevents runs of 5+ identical templates
templateWeights[lastUsed] *= 0.5;
```

#### 1C. Add 2–3 New Templates

Priority new templates for early/mid game variety:
- **Gateway** — single large room with 2-3 small alcoves connected by doorways (simpler than Chamber)
- **Island** — central wall cluster creating a doughnut-shaped arena (forces wrap-around play)  
- **Asymmetric Split** — diagonal wall line, not axis-aligned (currently all templates are H/V symmetric)

---

### Phase 2: Mobile Grid Size Adjustment (High Impact, Low Effort)

#### 2A. Cap Grid Sizes for Mobile

In `tierParams()`, cap grid dimensions based on world:

| World | Current gridRange | Proposed gridRange |
|-------|:-:|:-:|
| W1 | [8, 14] | **[8, 12]** |
| W2 | [10, 16] | **[10, 14]** |
| W3 | [10, 16] | **[10, 14]** |
| W4 | [12, 18] | **[12, 16]** |

This keeps the smallest tile at 23px (16×16 grid) — the absolute floor for mobile.

**Tradeoff:** Reduces the visual "escalation" of late-game boards. Compensate by increasing seed count, germ variety, and template complexity instead of raw grid size.

#### 2B. Alternative: Pinch-to-Zoom for Large Grids

If large grids are desired for spectacle/difficulty, add:
- Two-finger pinch-to-zoom on the grid area
- Drag-to-pan when zoomed in
- Auto-zoom-to-fit on turn end

This is a larger engineering effort but preserves the current grid ranges.

#### 2C. Consider Canvas Size Increase for Modern Phones

The current 400×720 canvas maps well to iPhone SE (375pt width) but wastes space on larger phones (iPhone 15 Pro Max at 430pt, Galaxy S24 at 412dp). A responsive canvas width of 400–460 based on device would gain 15–30px more tile space on flagship devices.

---

### Phase 3: Cross-World Balance (High Impact, Low Effort)

#### 3A. Normalize Difficulty by Actual Peak

The threshold formula currently treats all peaks equally. But W2 Influenza peaks at 64.5% while W4 Phage peaks at 54.3%, making W2 objectively harder despite being unlocked first.

**Option A: World-specific difficulty multiplier**
```typescript
const worldDiffScale: Record<number, number> = {
  1: 1.0,   // baseline
  2: 0.85,  // reduce W2 effective difficulty (high natural peaks)
  3: 1.0,   // W3 is balanced
  4: 1.1,   // boost W4 (lower natural peaks need tighter thresholds)
};
threshold = peak × (1 - targetDifficulty × 0.6 × worldDiffScale[world])
```

**Option B: Cap peak contribution**
```typescript
// Cap the peak used in threshold calculation to normalize across germ types
const effectivePeak = Math.min(peakPct, 55);
threshold = effectivePeak × (1 - targetDifficulty × 0.6);
```

**Option C: Use rank-based difficulty instead of absolute peak**
Within each world, sort levels by their simulated peak and assign thresholds based on rank order rather than raw peak value. This guarantees smooth difficulty regardless of germ type.

#### 3B. Ensure W4 Boss Is the Hardest Level in the Game

Currently W2 L50 (margin 26.7) is harder than W4 L50 (margin 20.0). The final boss of the game should be the ultimate challenge.

**Fix:** Set W4 Boss `targetDifficulty = 0.75` (currently 0.65) and guarantee ≥5 seed pairs.

---

### Phase 4: Smooth Difficulty Curve (Medium Impact, Low Effort)

#### 4A. Continuous targetDifficulty Function

Replace per-tier constants with a smooth function:

```typescript
function targetDifficulty(level: number): number {
  // Smooth curve from 0.15 (L1) to 0.70 (L50)
  // Slight ease-in: gentler ramp at start, steeper at end
  const t = (level - 1) / 49;  // 0.0 to 1.0
  return 0.15 + 0.55 * (t * t * 0.3 + t * 0.7);
}
```

This gives:
- L1: 0.15, L5: 0.21, L10: 0.28, L20: 0.38, L30: 0.48, L40: 0.57, L50: 0.70

Every level is slightly harder than the previous one — no flat spots.

#### 4B. Anti-Regression Guard

After generating all 50 levels, verify that margins increase monotonically (with ±3 jitter allowance). If L(N+1) has a lower margin than L(N) by more than 3, regenerate it with a lower threshold.

---

### Phase 5: Template-Germ Affinity (Medium Impact, Medium Effort)

#### 5A. Define Affinity Scores

```typescript
const TEMPLATE_GERM_AFFINITY: Record<number, Partial<Record<PathogenType, number>>> = {
  // Corridors (4) — great for knight-jumpers, bad for cardinal-only
  4: { influenza: 1.5, retrovirus: 1.3, coccus: 0.7 },
  // Cross (3) — great for multi-germ, neutral for single
  3: { /* +0.3 per additional germ type */ },
  // Compound (10) — great for long-range jumpers
  10: { phage: 1.5, spore: 1.3, bacillus: 1.2, coccus: 0.5 },
  // Honeycomb (9) — great for diagonal types
  9: { mold: 1.5, yeast: 1.4, spore: 1.3, coccus: 0.6 },
  // Vein (6) — bad for short-range (can't traverse), good for medium-range
  6: { influenza: 1.3, coccus: 0.5, mold: 0.5 },
};
```

Use affinity scores to weight template selection. High-affinity combos create interesting gameplay; low-affinity combos are avoided.

#### 5B. "Signature" Levels at Milestones

Hand-tune specific level slots (L10, L25, L50) to showcase the best template-germ combos for that world. These become memorable "set piece" moments.

---

### Phase 6: Threshold Cleanup (Low Impact, Low Effort)

#### 6A. Cap Threshold at 45%

No level should have a contain threshold above 45%. The current cap of 60 allows situations where infection can cover half the board and the player still "wins." Combined with the 50% instant-loss, this creates a 5% window that feels confusing, not strategic.

```typescript
// Change from:
let maxPct = Math.max(15, Math.min(60, Math.round(rawThreshold)));
// To:
let maxPct = Math.max(15, Math.min(45, Math.round(rawThreshold)));
```

#### 6B. Increase MIN_MARGIN for Early Levels

Currently all levels enforce MIN_MARGIN = 8. Early levels with generous thresholds barely challenge the player.

```typescript
const minMargin = level <= 10 ? 10 : level <= 20 ? 8 : 8;
```

---

### Phase 7: Winnability Validation (Low Impact, High Effort)

#### 7A. Greedy Solver

Implement a simple greedy solver that:
1. Each turn, places medicine adjacent to the highest-threat seed
2. Uses the switch mechanic if a placement was suboptimal
3. Runs for the full turn limit

If the greedy solver wins, the level is definitely winnable. If it doesn't, the level *might* still be winnable with better strategy, but flag it for review.

#### 7B. Monte Carlo Validation

Run 100 random-play simulations per level. If the infection peak under random medicine placement is sometimes below threshold, the level is almost certainly winnable with intelligent play.

---

## 7. Appendix: Raw Data

### Difficulty Ramp by Tier (Averaged Across All Worlds)

| Tier | Levels | Avg Margin | Avg Grid Area | Avg Seeds | Avg Threshold | Avg Peak |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| Tutorial (1–3) | 12 | 9.1 | ~100 | 2.0 | 47% | 49% |
| Early (4–10) | 28 | 10.3 | ~120 | 3.2 | 44% | 49% |
| Mid (11–20) | 40 | 13.8 | ~165 | 4.0 | 40% | 52% |
| Advanced (21–35) | 60 | 20.2 | ~230 | 5.1 | 37% | 63% |
| Endgame (36–49) | 56 | 21.3 | ~275 | 6.8 | 34% | 62% |
| Boss (50) | 4 | 23.3 | ~290 | 9.0 | 35% | 58% |

### Margin Distribution (All 200 Levels)

| Margin Range | Count | % |
|:-:|:-:|:-:|
| 7 – 10 | 28 | 14% |
| 10 – 15 | 47 | 24% |
| 15 – 20 | 56 | 28% |
| 20 – 25 | 55 | 28% |
| 25 – 27 | 14 | 7% |

### Template Usage (All 200 Levels)

| Template | Count | % | Notes |
|----------|:-:|:-:|---|
| Pillars (1) | 116 | **58%** | Includes Open+injected-pillars |
| Corridors (4) | 31 | 16% | Good variety template |
| Cross (3) | 23 | 12% | |
| Divider V (2) | 13 | 7% | |
| Compound (10) | 9 | 5% | Underused — one of the best templates |
| Divider H (2) | 5 | 3% | |
| Chamber (7) | 3 | 2% | Severely underused |
| Vein (6) | ~0 | 0% | Likely rejected due to wall density >30% |
| Maze (8) | ~0 | 0% | Likely rejected due to wall density >30% |
| Honeycomb (9) | ~0 | 0% | Likely rejected or pool-limited |
| L-Wall (5) | ~0 | 0% | Likely pool-limited |

**Critical finding:** Templates 6 (Vein), 7 (Chamber), 8 (Maze), 9 (Honeycomb) are nearly unused despite being implemented. They either get rejected by the wall density check or are in template pools that rarely get selected. **7 of 11 templates account for <5% of levels each.**

### 30 Easiest Levels (Smallest Margin)

| World | Level | Margin | Peak | Threshold | Grid | Seeds | Types |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| W1 | 3 | 7.5 | 62.5% | 55% | 8×8 | 2 | coccus |
| W1 | 2 | 7.5 | 54.5% | 47% | 8×8 | 2 | coccus |
| W3 | 8 | 7.6 | 41.6% | 34% | 11×11 | 2 | yeast |
| W3 | 4 | 7.7 | 41.7% | 34% | 10×10 | 4 | yeast |
| W3 | 9 | 7.7 | 42.7% | 35% | 12×12 | 4 | yeast |
| W3 | 1 | 7.8 | 46.8% | 39% | 10×10 | 2 | yeast |
| W3 | 3 | 7.8 | 46.8% | 39% | 10×10 | 2 | yeast |
| W4 | 7 | 7.9 | 42.9% | 35% | 13×13 | 4 | phage |
| W4 | 1 | 7.9 | 41.9% | 34% | 12×12 | 2 | phage |
| W4 | 3 | 7.9 | 41.9% | 34% | 12×12 | 2 | phage |

**Notable:** W3 and W4 early levels have the same margins as W1 tutorials. The "expert" worlds start just as easy as the beginner world.

### Levels With Threshold > 50%

22 levels, all concentrated in W1 L1–10 and W2 L1–15. Threshold range: 51–60%.

---

## Priority Matrix

| Phase | Impact | Effort | Priority |
|-------|:-:|:-:|:-:|
| **1. Template Diversity** | High | Medium | **P0 — Do First** |
| **2. Mobile Grid Caps** | High | Low | **P0 — Do First** |
| **3. Cross-World Balance** | High | Low | **P1 — Do Second** |
| **4. Smooth Difficulty** | Medium | Low | **P1 — Do Second** |
| **5. Template-Germ Affinity** | Medium | Medium | **P2 — Nice to Have** |
| **6. Threshold Cleanup** | Low | Low | **P2 — Nice to Have** |
| **7. Winnability Solver** | Low | High | **P3 — Future** |

---

*End of analysis. All data generated from runtime scan of the live generator output.*
