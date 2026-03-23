# World & Level Design

> World configurations defined in `WORLD_CONFIGS` within `src/sim/generator.ts`  
> Difficulty tiers defined in `tierParams()` within `src/sim/generator.ts`

---

## Overview

Bio Defence has **4 worlds**, each with **50 levels**, totaling **200 levels**. Worlds are themed biologically and progressed through by earning stars. Each world introduces new pathogen types and wall templates at defined tier breakpoints.

All levels are **procedurally generated** from seeded PRNG — no hand-crafted level data exists. See [level-generation.md](level-generation.md) for the full generation pipeline.

---

## Worlds

### World 1 — Petri Dish

> *Introductory.* Simple bacteria on small grids with open layouts.

| Property | Value |
|----------|-------|
| Grid range | 8×8 to 14×14 |
| Stars to unlock | 0 (always available) |
| Objective | `contain` |

**Germ Tiers:**

| Levels | Germs Available | Templates Available |
|--------|----------------|-------------------|
| 1–10 | Coccus | Open (0), Pillars (1) |
| 11–20 | Coccus, Mold | Open (0), Pillars (1), Divider (2) |
| 21–35 | Coccus, Mold, Bacillus | Open (0), Pillars (1), Divider (2), Cross (3) |
| 36–50 | Coccus, Mold, Bacillus | Open (0), Pillars (1), Divider (2), Cross (3), Corridors (4), L-Wall (5) |

**Design Intent:** Teaches basic mechanics. Coccus (4-dir cardinal) is the simplest pathogen — easy to predict and block. Mold (4-dir diagonal) introduces the second movement family. Bacillus (8-dir cardinal) is the first long-range type. Templates start wide open and gradually add structure.

---

### World 2 — Bloodstream

> *Intermediate.* Viruses with L-shaped jumps on medium grids with channeled layouts.

| Property | Value |
|----------|-------|
| Grid range | 10×10 to 16×16 |
| Stars to unlock | 40 |
| Objective | `contain` |

**Germ Tiers:**

| Levels | Germs Available | Templates Available |
|--------|----------------|-------------------|
| 1–10 | Influenza | Corridors (4), Vein (6) |
| 11–20 | Influenza, Coccus | Corridors (4), Vein (6), Chamber (7) |
| 21–35 | Influenza, Coccus, Retrovirus | Corridors (4), Vein (6), Chamber (7), Cross (3) |
| 36–50 | Influenza, Coccus, Retrovirus | Corridors (4), L-Wall (5), Vein (6), Chamber (7), Cross (3) |

**Design Intent:** Influenza is a skill check — full knight movement (8 dirs, all fire). The channeled templates (Corridors, Vein, Chamber) create natural chokepoints that players must learn to exploit. Retrovirus adds wide knight + cardinal hybrid movement.

---

### World 3 — Tissue

> *Advanced.* Mixed diagonal types with open/structured layouts.

| Property | Value |
|----------|-------|
| Grid range | 10×10 to 16×16 |
| Stars to unlock | 100 |
| Objective | `contain` |

**Germ Tiers:**

| Levels | Germs Available | Templates Available |
|--------|----------------|-------------------|
| 1–10 | Yeast | Open (0), Pillars (1) |
| 11–20 | Yeast, Spirillum | Open (0), Pillars (1), Honeycomb (9) |
| 21–35 | Yeast, Spirillum, Retrovirus | Open (0), Pillars (1), L-Wall (5), Honeycomb (9) |
| 36–50 | Yeast, Spirillum, Retrovirus | Open (0), Pillars (1), Corridors (4), L-Wall (5), Honeycomb (9), Compound (10) |

**Design Intent:** Yeast (diagonal ±2 + ±1) creates unpredictable spread on open boards. Spirillum (narrow knight + diagonal) mixes families. The Honeycomb template creates repeating hexagonal-ish patterns that interact uniquely with diagonal movement. Late-game Compound template forces multi-front management.

---

### World 4 — Pandemic

> *Expert.* All pathogen families on large grids with complex layouts.

| Property | Value |
|----------|-------|
| Grid range | 12×12 to 18×18 |
| Stars to unlock | 180 |
| Objective | `contain` |

**Germ Tiers:**

| Levels | Germs Available | Templates Available |
|--------|----------------|-------------------|
| 1–10 | Phage | Compound (10), Corridors (4) |
| 11–20 | Phage, Spore | Compound (10), Corridors (4), Vein (6) |
| 21–35 | Phage, Spore, Spirillum | Compound (10), Corridors (4), Vein (6), Chamber (7), Maze (8) |
| 36–50 | Phage, Spore, Spirillum, Bacillus | ALL 11 templates |

**Design Intent:** Phage is the most dangerous type — 12 growth directions (Camel + diagonal), 8 children per turn, and only dies when 4+ counter-medicine surround it. The large grids (up to 18×18) make manual prediction nearly impossible. All 11 templates are available in the final tier, maximizing variety and unpredictability.

---

## Difficulty Tiers

Within each world, the 50 levels follow 6 difficulty tiers via `tierParams(levelNum)`:

### Tier Breakdown

| Tier | Levels | Grid Size | Seed Pairs | Tools/Turn | Turn Limit | Par Turns | Germ Pool | Tool Grants |
|------|--------|-----------|------------|-----------|------------|-----------|-----------|-------------|
| **Tutorial** | 1–3 | min × min | 1 | 3 | 6 | 4 | Tier 1 only | Initial: 4, Grant: 1/turn |
| **Early** | 4–10 | min + scaled | 1–2 | 3 | 8 | 5 | Tier 1 | Initial: 4, Grant: 1/turn |
| **Mid** | 11–20 | min + 2 + scaled | 2 | 3 | 10 | 6 | Tier 1+2 | Initial: 5, Grant: 1/turn |
| **Advanced** | 21–35 | mid + scaled | 2–3 | 3 | 12 | 8 | All tiers | Initial: 5, Grant: 1-2/turn |
| **Endgame** | 36–49 | max - 2 + scaled | 3–4 | 3–4 | 14 | 10 | All tiers | Initial: 6, Grant: 1-2/turn |
| **Boss** | 50 | max × max | 4–5 | 3–4 | 16 | 12 | All tiers | Initial: 6, Grant: 2/turn |

### Grid Scaling

Grid dimensions are interpolated within tier range:

```
gridW = minW + floor((maxW - minW) * (tierProgress))
gridH = minH + floor((maxH - minH) * (tierProgress))
```

Where `tierProgress` is 0.0–1.0 based on position within the tier's level range.

Example for World 1:
- Level 1 (tutorial): 8×8
- Level 10 (early): ~10×10
- Level 25 (advanced): ~12×12
- Level 50 (boss): 14×14

### Seed Pairs

Each "pair" = 2 pathogen tiles of the same type placed in growth-reachable positions:
- Tutorial: 1 pair (2 tiles) — minimal threat, teaches fundamentals
- Boss: 4-5 pairs (8-10 tiles) — multiple fronts, overwhelming without strategy

### Tools Per Turn

Most levels: 3 placements per turn. Endgame/boss levels may allow 3-4.

### Tool Grants

Per-turn refill of tool charges via `toolGrant`:
- Tutorial/early: 1 tool per turn
- Advanced+: 1-2 tools per turn
- Boss: 2 tools per turn

These come from the actual germ types present. If a level has Coccus and Mold, grants refill Penicillin and Fluconazole.

---

## Progression Design

### Star Economy

Stars are the key progression currency:

| Source | Max Stars |
|--------|-----------|
| 50 levels × 3★ per world | 150 per world |
| 4 worlds | 600 total possible |

Star thresholds were chosen so players must master about 1/3 of the previous world to unlock the next:
- World 2 needs 40★ (27% of W1's 150)
- World 3 needs 100★ (~44% of W1+W2's 300)
- World 4 needs 180★ (~40% of W1+W2+W3's 450)

### Germ Introduction Curve

Each world introduces its germ pool gradually:
1. **Levels 1-10:** Single flagship germ → learn its movement
2. **Levels 11-20:** Add a second germ → learn to juggle two patterns
3. **Levels 21-35:** Full pool → multi-front tactical decisions
4. **Levels 36-50:** Same pool but bigger boards and harder layouts

### Template Complexity Curve

Templates progress from open/simple to constrained/complex:
- **Open/Pillars** — unrestricted space, learn pure growth mechanics
- **Divider/Corridors** — linear channels, learn chokepoint defense
- **Cross/L-Wall** — multi-region boards, learn area denial
- **Vein/Chamber** — organic layouts with doorways, learn bottleneck control
- **Maze/Honeycomb** — repeating patterns, require systematic coverage
- **Compound** — multi-region with narrow bridges, hardest to defend

---

## Contain Objective Details

All generated levels use `contain`:

```typescript
{ type: "contain", maxPct: threshold, maxTurns: turnLimit }
```

The `threshold` (maxPct) is derived per-level during generation:

1. Run `simulateNoAction()` → get peak infection % with zero player intervention
2. `rawThreshold = peak × (1 - targetDifficulty × 0.6)`
3. Clamp to [15, 60]
4. Enforce `MIN_MARGIN = 8` gap: `threshold ≤ peak - 8`
5. Verify: re-simulate with real threshold → must result in loss

This ensures every level is:
- **Losable** if the player does nothing (validated by simulation)
- **Winnable** with good play (margin between peak and threshold gives room)
- **Appropriately difficult** (harder levels have tighter margins)

Typical threshold ranges:
- Tutorial: 45-60% (generous)
- Mid: 30-45%
- Endgame: 15-35% (tight)

---

## Level Titles & Hints

### Title Generation

Random `${Adjective} ${Noun}` from curated word pools:

**Adjectives (20):** Viral, Toxic, Silent, Rapid, Dormant, Volatile, Infectious, Resistant, Mutant, Chronic, Acute, Lethal, Benign, Feral, Phantom, Rogue, Terminal, Primal, Veiled, Parasitic

**Nouns (20):** Cascade, Outbreak, Bloom, Drift, Surge, Nexus, Core, Strain, Vector, Cluster, Breach, Front, Wave, Cell, Colony, Zone, Pulse, Swarm, Hive, Maze

**Special cases:**
- Level 25 → "Patient Zero"
- Level 50 → "Total Outbreak"

### Hint Generation

Context-sensitive strategy hints:
- **Levels 1-3 (tutorial):** Generic introductory tips ("Place medicine to create dead zones")
- **Single-germ levels:** Type-specific strategy ("Coccus spreads in cardinal directions — block horizontally and vertically")
- **Multi-germ levels (21+):** Prioritization advice ("Multiple germ types detected — triage the fastest spreader first")
