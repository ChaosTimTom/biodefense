# Bio Defence v5.0 — "Chess Pieces" Design Document

## 1. THE PROBLEM WITH v4.0

### What's wrong now
- **Grids are tiny** (3×3 to 4×4 interiors). No room for patterns to develop visually.
- **All spreading looks the same.** Life-rule thresholds (B[1,2]/S[1,2] vs B[1,3]/S[1,1]) are invisible to the player — both just look like "stuff oozing in cardinal directions."
- **Place-and-pray gameplay.** The player places 2 tools on turn 1, then watches 5 turns play out with no further interaction. Win or lose is decided by the initial placement.
- **No learning curve.** There's nothing to master. You can't build intuition about B[1,2]/S[1,2] neighbor counting across 3 simultaneous generations — it's computationally intractable for a human brain.
- **10 hand-crafted levels is absurdly shallow.** A mobile puzzle game needs 100+ levels minimum to be viable.
- **Every level is a box with stuff in it.** No corridors, no rooms, no interesting geometry.

### What must change
1. Growth patterns must be **geometric and visually distinct** — like chess pieces.
2. Grids must be **large enough** for patterns to be readable.
3. The player must **interact every turn**, not just turn 1.
4. Levels must be **procedurally generated** at scale (50 per world).
5. Each world must **teach new mechanics** with 3 intro levels, then ramp difficulty.

---

## 2. DIRECTIONAL GROWTH SYSTEM

### Core principle
Replace Life-like birth/survival rules with **deterministic directional spread**. Each germ/tool type has a fixed set of **relative offsets** it spreads into. No neighbor counting. No thresholds. Pure geometry.

### Growth Patterns

#### 🦠 Bacteria → "The Rook" (cardinal lines)
```
    · · ↑ · ·
    · · ↑ · ·
    ← ← B → →
    · · ↓ · ·
    · · ↓ · ·
```
- Spreads into **all cardinal cells up to range 2** per generation.
- Fills cells outward along the 4 axes. Hits walls/medicine and stops.
- Creates a **diamond/cross** pattern over time.
- **Predictable, readable, the first pattern players learn.**
- 💊 Antibiotic mirrors this exactly.

#### 🦠 Virus → "The Knight" (L-shaped leaps)
```
    · ↑ · ↑ ·
    ↑ · · · ↑
    · · V · ·
    ↑ · · · ↑
    · ↑ · ↑ ·
```
- Spreads into **8 knight-move offsets**: (±1,±2) and (±2,±1).
- **Leaps over adjacent walls and medicine** — cannot be blocked by simple adjacency.
- Creates a scattered, explosive pattern.
- Very dangerous: forces the player to think about landing squares 2+ cells away.
- 💉 Antiviral mirrors this exactly.

#### 🦠 Fungus → "The Bishop" (diagonal lines)
```
    ↗ · · · ↗
    · ↗ · ↗ ·
    · · F · ·
    · ↗ · ↗ ·
    ↗ · · · ↗
```
- Spreads into **all diagonal cells up to range 2** per generation.
- Creates a **checkerboard** pattern — literally cannot reach half the cells on the board.
- Relentless on its "color" but harmless to the other color.
- 🧬 Antifungal mirrors this exactly.

### Survival Rule (simplified)
- A cell **survives** if at least 1 cell in its growth pattern is a same-type ally.
- A cell **dies** if ALL growth directions are blocked (walls, board edge, or enemy).
- This replaces all Life-like S[min,max] threshold checks.
- **Completely readable**: the player can visually check "can this cell see a friend?"

### Dead Zone Mechanic (preserved)
- If a pathogen wants to spread into a cell AND a medicine wants to spread into the same cell → **cell stays empty** (dead zone).
- Dead zones are the core barrier mechanic.

### Medicine Pressure (updated)
- If a pathogen cell has **ALL** of its growth directions blocked (walls + medicine + edges), it **dies from containment**.
- This replaces the overcrowding pressure mechanic with something visually verifiable.
- The player's goal: block every escape route for every germ.

### Why This Works
| Old (v4.0) | New (v5.0) | Player experience |
|------------|------------|-------------------|
| B[1,2]/S[1,2] ortho | Cardinal range-2 ("Rook") | "I can see the cross expanding" |
| B[1,3]/S[1-1] ortho | Knight-move leaps | "It jumped over my wall!" |
| B[2,3]/S[1,3] Moore | Diagonal range-2 ("Bishop") | "It only covers half the board" |
| Opaque thresholds | Visual geometry | "I understand WHY I won/lost" |

---

## 3. GRID SIZES

### Current problem
Largest grid is 6×6 (4×4 interior = 16 cells). Knight moves need at least 5 cells in each dimension. Diagonal patterns need 6+ cells to show the checkerboard. Everything is cramped.

### New grid scale

| Level range | Grid size | Interior | Purpose |
|-------------|-----------|----------|---------|
| Tutorial (1-3) | 10×10 | 8×8 = 64 cells | Room to see cardinal spread |
| Early (4-12) | 12×12 | 10×10 = 100 cells | Patterns develop fully |
| Mid (13-24) | 14×14 | 12×12 = 144 cells | Interior walls, corridors |
| Boss 25 | 16×16 | 14×14 = 196 cells | Major challenge |
| Late (26-49) | 14×14 to 16×16 | 12×12 to 14×14 | Complex multi-type |
| Boss 50 | 20×18 | 18×16 = 288 cells | Ultimate challenge |

### UI scaling
- Grid cell size should scale down as grid grows (32px → 24px → 20px).
- Camera panning/zoom may be needed for boss grids.
- Tool palette stays fixed at screen edge.

---

## 4. TOOL ECONOMY — MAKING EVERY TURN MATTER

### Current problem
Player gets all tools upfront, places them on turn 1, then watches. There's no reason to act on turns 2-5.

### New system: Per-turn tool grants

**You don't get all your tools at the start.** Instead, you receive **a budget of tools each turn**.

| Mechanic | Description |
|----------|-------------|
| `toolsPerTurn` | How many tools the player receives each turn (added to inventory) |
| `toolBudget` | Total tools available across all turns (caps total spending) |
| `placementsPerTurn` | Max placements allowed in a single turn |

Example for a mid-game level:
- `toolsPerTurn: 2` (get 2 antibiotics each turn)
- `placementsPerTurn: 2`
- `turnLimit: 8`
- Total: up to 16 placements, but you MUST spread them across turns.

### Why this works
1. **Germs grow between your turns.** By turn 3, bacteria have pushed into new areas. Your turn-1 placements might be outflanked. You need to respond.
2. **Scouting turns.** Sometimes the optimal play is to place 1 tool, step, see how the germ reacts, then adjust.
3. **Escalation.** Early turns: contain the immediate threat. Mid turns: reinforce. Late turns: seal the last gap.
4. **Boss levels:** many turns, limited per-turn tools, germs approaching from multiple directions. Constant triage: "which front do I reinforce THIS turn?"

### Tool grant by level difficulty

| Phase | toolsPerTurn | placementsPerTurn | turnLimit | Feel |
|-------|-------------|-------------------|-----------|------|
| Tutorial | 2 | 2 | 5 | "Learn to pace yourself" |
| Early | 2-3 | 3 | 6-8 | "Two fronts to manage" |
| Mid | 2-3 | 3 | 8-10 | "Three fronts, choose wisely" |
| Boss 25 | 3 | 4 | 12 | "Constant pressure" |
| Late | 2-4 | 3-4 | 10-14 | "Every placement surgical" |
| Boss 50 | 4 | 5 | 16 | "Wartime general" |

### Drip-feed tool types
```
Turn 1: Get 2 antibiotics
Turn 2: Get 2 antibiotics
Turn 3: Get 1 antiviral (new threat introduced!)
Turn 4: Get 2 antivirals
...
```
Some levels could introduce new germ types on specific turns (dormant seeds that activate), requiring the player to shift strategy mid-level.

---

## 5. WORLD STRUCTURE

### World themes

Each world introduces **one major new mechanic** and uses the 50 levels to teach it, combine it with previous mechanics, and ultimately test mastery.

| World | Theme | New mechanic | Grid sizes |
|-------|-------|-------------|------------|
| 1: **Outbreak** | Bacteria only | Cardinal spread, blocking, dead zones | 10×10 → 14×14 |
| 2: **Pandemic** | +Virus | Knight-move spread, leap-blocking | 12×12 → 16×16 |
| 3: **Infestation** | +Fungus | Diagonal spread, checkerboard strategy | 12×12 → 16×16 |
| 4: **Convergence** | All 3 + mixed levels | Multi-type containment, tool switching | 14×14 → 18×18 |
| 5: **Mutation** | Mutating germs (change type mid-level) | Adaptive strategy | 14×14 → 20×18 |

### 50-level structure per world

```
L1-3:    TUTORIAL — One germ type, big grid, generous tools.
          "Here's how [bacteria/virus/fungus] spread. Try blocking them."
          Hints enabled. Fail state very hard to reach.

L4-10:   LEARNING — Single type, introduce interior walls.
          Corridors, rooms, choke points. Teach geometry reading.
          Tools given per turn (2/turn). Must play multiple turns.

L11-18:  INTERMEDIATE — Larger grids, tighter thresholds.
          Multiple germ clusters of same type.
          Player must triage: which cluster to contain first?

L19-24:  ADVANCED — Introduce second germ type (from previous world).
          Bacteria + virus together. Different tools needed for each.
          Per-turn tool drip forces tough choices.

L25:     ★ BOSS — 16×16+ grid, multiple germ types, many clusters.
          12+ turns, constant placement needed. Tests everything learned.
          Winning requires systemic understanding, not guessing.

L26-30:  RECOVERY — Easier levels, new map feature (e.g. teleporters, breakable walls).
          Palate cleanser after the boss.

L31-38:  MASTERY — Hardest non-boss content. Tight tool budgets.
          Must predict 3-4 turns ahead.
          Sparse solutions: only 1 in ~50 placements works per turn.

L39-49:  GAUNTLET — Every level adds a twist:
          - Time pressure (germ seeds activate on specific turns)
          - Fog of war (some cells hidden until germ reaches them)
          - Limited visibility (range-based reveal)
          - Mixed objectives (clear zone A, contain zone B)

L50:     ★★ FINAL BOSS — 20×18 grid, all available germ types.
          Every world mechanic combined.
          Requires ~16 turns of careful placement.
          3-star = clear all germs. 1-star = just survive.
```

---

## 6. PROCEDURAL LEVEL GENERATOR

### Why not hand-craft 250+ levels?

Hand-crafting is slow (took hours for 10 levels), error-prone, and doesn't scale. Instead: **procedurally generate level geometry, then validate with the brute-force solver.**

### Generator pipeline

```
┌─────────────────────────────────────────────────┐
│ 1. SELECT PARAMETERS (from difficulty curve)    │
│    → grid size, germ types, germ count,         │
│      tool budget, turn limit, threshold          │
├─────────────────────────────────────────────────┤
│ 2. GENERATE MAP GEOMETRY                        │
│    → choose template (box, L, corridors, maze)  │
│    → place interior walls                       │
│    → ensure connectivity                        │
├─────────────────────────────────────────────────┤
│ 3. PLACE GERM SEEDS                            │
│    → select positions based on difficulty        │
│    → corner = easy, center = hard, spread = hard│
│    → ensure seeds aren't immediately trapped     │
├─────────────────────────────────────────────────┤
│ 4. ASSIGN TOOLS                                │
│    → give matching types for each germ          │
│    → tool count = f(germ count, grid size)      │
│    → per-turn distribution                       │
├─────────────────────────────────────────────────┤
│ 5. VALIDATE WITH SOLVER                         │
│    → brute-force all turn-1 placements          │
│    → for each: simulate to find turn-2 options  │
│    → count total winning strategies              │
│    → REJECT if 0 wins (unsolvable)              │
│    → REJECT if >30% win rate (too easy)         │
│    → ACCEPT if 2-15% win rate (good puzzle)     │
├─────────────────────────────────────────────────┤
│ 6. RATE DIFFICULTY                              │
│    → win rate, minimum turns to win,            │
│      number of critical decisions                │
│    → place in difficulty curve                   │
└─────────────────────────────────────────────────┘
```

### Map templates

The generator picks from a library of templates and scales them to the target grid size:

#### Template: Open Box
```
████████████
█··········█
█··········█
█··········█
█··········█
████████████
```
Used for: tutorials, open-field levels. Tests raw pattern understanding.

#### Template: Corridors
```
████████████████
█···█····█·····█
█···█····█·····█
█···██··██·····█
█··············█
█···██··██·····█
█···█····█·····█
█···█····█·····█
████████████████
```
Used for: mid-game. Germs trapped in rooms, connected by passages. Block the corridors.

#### Template: Maze
```
████████████████
█·█···█···█····█
█·█·█·█·█·█·█·█
█···█···█···█··█
█·█████·███·██·█
█·····█···█····█
█████·███·█·████
█··············█
████████████████
```
Used for: advanced. Germs navigate maze paths. Player must predict which paths they'll take.

#### Template: Islands
```
████████████████
█····██████····█
█····██████····█
█····██████····█
█··············█
█··············█
█····██████····█
█····██████····█
████████████████
```
Used for: multi-cluster levels. Two or more isolated rooms with connecting passages.

#### Template: Arena (Boss)
```
████████████████████
█··················█
█··················█
█·····████████·····█
█·····█······█·····█
█·····█······█·····█
█·····████··██·····█
█··················█
█··················█
█·····██··██·······█
█·····█····█·······█
█·····█····█·······█
█·····██████·······█
█··················█
████████████████████
```
Used for: bosses. Large open area with structures. Multiple germ sources.

#### Template: Asymmetric (L, T, Z shapes)
Generate by combining 2-3 rectangular rooms at different offsets with connecting corridors.

### Seed placement strategies

| Difficulty | Placement | Why |
|-----------|-----------|-----|
| Easy | Corner of room, 1-2 germs | Few escape directions |
| Medium | Center of room, 2-3 germs | Cardinal/diagonal access in all directions |
| Hard | Multiple rooms, 3-5 germs | Must triage, can't contain everything at once |
| Boss | Scattered across map, 6-10+ germs | Sustained multi-front containment |

### Connectivity validation
After generating walls, flood-fill from each germ seed to ensure all playable cells are reachable. Reject maps with disconnected regions (unless intentional for island templates).

---

## 7. DIFFICULTY CURVE

### Difficulty parameters by level number

```
Level  Grid     Germs  Types  Tools/Turn  Turns  Threshold  Win%Target
─────  ─────    ─────  ─────  ──────────  ─────  ─────────  ─────────
1-3    10×10    1-2    1      3           5      40%        60-80%
4-10   12×12    2-3    1      2-3         6      35%        30-50%
11-18  14×14    3-4    1      2-3         8      30%        15-30%
19-24  14×14    4-5    2      2-3         8      25%        8-15%
25     16×16    6-8    2      3           12     25%        3-8%
26-30  12×12    2-3    1-2    3           6      35%        30-50%
31-38  14×14    4-5    2-3    2           10     20%        5-12%
39-49  16×16    5-7    2-3    2-3         12     20%        2-8%
50     20×18    8-12   3      4           16     15%        1-3%
```

### Multi-turn win rate
"Win rate" above means: of all possible FIRST-turn placements, what % lead to a line of play that can win. The actual per-turn branching makes the strategy tree much deeper, which is exactly what creates the "playing every turn" feel.

---

## 8. OBJECTIVE TYPES (EXPANDED)

The current "contain" objective is fine but gets repetitive over 50 levels.

| Objective | Description | Strategy |
|-----------|-------------|----------|
| **contain** | Keep infection < X% for Y turns | Current mechanic, core objective |
| **eliminate** | Kill ALL germs before turn limit | Must fully surround and squeeze |
| **protect** | Keep specific cells germ-free | Defensive — ward an area |
| **quarantine** | Don't let germs cross a boundary line | Build a wall across the map |
| **survive** | Endure a germ onslaught for X turns | Delay tactics, no need to kill |
| **triage** | Contain zone A AND eliminate zone B | Multi-objective, forces splitting focus |

Mix these across the 50 levels for variety.

---

## 9. DORMANT SEEDS & MID-LEVEL EVENTS

### Dormant germs
Some germ seeds are marked **dormant** — they sit inactive on the board and activate on a specific turn.

```
Turn 1-3:  Fight bacteria in the north room
Turn 4:    ⚠ "VIRUS OUTBREAK!" — dormant virus seeds in south room activate
Turn 4-8:  Now fight bacteria + virus simultaneously
```

This creates **mid-level gear shifts** and forces the player to plan ahead ("I need to save my antivirals for turn 4") while still placing antibiotics every turn.

### Implementation
```typescript
interface DormantSeed {
  type: PathogenType;
  x: number;
  y: number;
  activateTurn: number;  // which turn this seed wakes up
}
```
Generator places 0-3 dormant seeds in later levels. Always visible on the board (grayed out) so the player can prepare.

---

## 10. CHANGES REQUIRED

### New files
| File | Purpose |
|------|---------|
| `src/sim/growth.ts` | Directional growth patterns (replaces Life-rule logic in step.ts) |
| `src/sim/generator.ts` | Procedural level generator |
| `src/sim/templates.ts` | Map template library |
| `src/sim/validator.ts` | Brute-force solver for generated levels |
| `scripts/gen_world.ts` | CLI to generate & validate a 50-level world |

### Modified files
| File | Changes |
|------|---------|
| `constants.ts` | Remove all birth/survive thresholds. Add growth direction arrays. |
| `step.ts` | Replace `resolveBirth()` and `resolveSurvival()` with directional spread. Remove neighbor counting. |
| `types.ts` | Add `DormantSeed`, `toolsPerTurn` grant system, new objective types. |
| `objectives.ts` | Add protect, quarantine, triage objective types. |
| `MenuScene.ts` | Replace 10 hand-crafted levels with world selection + generated levels. |
| `RulesOverlay.ts` | Rewrite for directional growth explanations. |
| `tests/sim/step.test.ts` | Complete rewrite for directional mechanics. |
| `tests/sim/solvability.test.ts` | Rewrite with generated level validation. |

### Removed constants
- `BACTERIA_BIRTH`, `BACTERIA_SURVIVE` (all Life-rule threshold pairs)
- `ANTIBIOTIC_BIRTH`, `ANTIBIOTIC_SURVIVE` (all medicine threshold pairs)
- `STAR_THRESHOLDS` (already removed)
- `GRACE_AGE` (no longer needed — deterministic growth has no edge cases)

### New constants
```typescript
// Direction offsets for each growth pattern
export const CARDINAL_DIRS: [number, number][] = [
  [1,0], [-1,0], [0,1], [0,-1],
  [2,0], [-2,0], [0,2], [0,-2],  // range 2
];

export const KNIGHT_DIRS: [number, number][] = [
  [1,2], [1,-2], [-1,2], [-1,-2],
  [2,1], [2,-1], [-2,1], [-2,-1],
];

export const DIAGONAL_DIRS: [number, number][] = [
  [1,1], [1,-1], [-1,1], [-1,-1],
  [2,2], [2,-2], [-2,2], [-2,-2],  // range 2
];

// Pathogen → growth pattern
export const PATHOGEN_GROWTH: Record<PathogenType, [number,number][]> = {
  bacteria: CARDINAL_DIRS,
  virus: KNIGHT_DIRS,
  fungus: DIAGONAL_DIRS,
};

// Medicine mirrors its target
export const MEDICINE_GROWTH: Record<MedicineType, [number,number][]> = {
  antibiotic: CARDINAL_DIRS,
  antiviral: KNIGHT_DIRS,
  antifungal: DIAGONAL_DIRS,
};
```

---

## 11. MIGRATION PLAN

### Phase 1: Core engine (directional growth)
1. Rewrite `constants.ts` with directional patterns
2. Rewrite `step.ts` — `resolveBirth()` uses direction offsets, `resolveSurvival()` checks "can see a friend"
3. Rewrite `step.test.ts` — verify each pattern spreads correctly
4. Verify build

### Phase 2: Tool economy
1. Add per-turn tool grant to `types.ts` (`toolGrant` field on LevelSpec)
2. Update `step.ts` `advanceTurn()` to grant tools each turn
3. Test tool economy in isolation

### Phase 3: Map templates & generator
1. Build `templates.ts` — box, corridors, maze, islands, arena
2. Build `generator.ts` — parameter selection, geometry, seeds, tools
3. Build `validator.ts` — multi-turn brute-force solver
4. Build `gen_world.ts` CLI

### Phase 4: World system
1. Update `MenuScene.ts` — world selection screen
2. Generate World 1 (bacteria only, 50 levels)
3. Store generated levels (JSON or embedded)
4. Validate all 50 levels have solutions

### Phase 5: Additional content
1. Generate Worlds 2-4
2. Add dormant seeds
3. Add new objective types
4. Polish hints/titles per world theme

---

## 12. OPEN QUESTIONS

1. **Range-2 spread vs range-1 per generation?**
   Range-2 means bacteria fills 8 cells per gen (cardinal ×2). On a 10×10 grid that's aggressive. Could do range-1 per gen (4 cells) and let range-2 emerge naturally over 2 generations. Slower but more readable for the player.

2. **Knight-move virus: too chaotic on small grids?**
   Alternative: "cannon" pattern — jumps exactly 2 cells cardinal (skips 1). Simpler to predict, still leaps barriers. Could use knight for later worlds only.

3. **Tile reveals: should we show growth direction arrows?**
   A visual indicator on each germ/tool showing its spread pattern would massively help readability. Each bacteria cell shows faint cardinal arrows. Each virus cell shows faint L-arrows. This is a UI enhancement, not a mechanic change.

4. **Level storage: embedded or JSON files?**
   50 levels × 5 worlds = 250 level specs. Could embed in code (current approach) or load from JSON. JSON is cleaner for generated levels.

5. **Should range-2 spread require line of sight?**
   If bacteria spreads range-2 cardinal, does a wall at range-1 block the range-2 cell? Probably yes — makes walls meaningful and adds a "line of sight" mechanic the player can exploit.
