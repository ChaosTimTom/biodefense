# Type System & Game Data

> All types defined in `src/sim/types.ts` (95 lines)  
> All constants defined in `src/sim/constants.ts` (250 lines)

---

## Pathogen Types

9 pathogens organized into 3 biological families, each with a distinct movement style:

### Bacteria Family — Orthogonal (Rook-like)

| Type | Growth Directions | Total Dirs | Children/Turn |
|------|-------------------|-----------|---------------|
| **Coccus** | Cardinal ±1: `[±1,0] [0,±1]` | 4 | 4 (all fire) |
| **Bacillus** | Cardinal ±2 + Cardinal ±1: `[±2,0] [0,±2] [±1,0] [0,±1]` | 8 | 4 (random of 8) |
| **Spirillum** | Narrow Knight + Diagonal ±1: `[±1,±2] [±1,±1]` | 8 | 4 (random of 8) |

### Virus Family — L-Shape Jumps (Knight-like)

| Type | Growth Directions | Total Dirs | Children/Turn |
|------|-------------------|-----------|---------------|
| **Influenza** | Full Knight: `[±1,±2] [±2,±1]` | 8 | 8 (all fire) |
| **Retrovirus** | Wide Knight + Cardinal ±1: `[±2,±1] [±1,0] [0,±1]` | 8 | 4 (random of 8) |
| **Phage** | Camel + Diagonal ±1: `[±1,±3] [±3,±1] [±1,±1]` | 12 | 8 (random of 12) |

### Fungus Family — Diagonal (Bishop-like)

| Type | Growth Directions | Total Dirs | Children/Turn |
|------|-------------------|-----------|---------------|
| **Mold** | Diagonal ±1: `[±1,±1]` | 4 | 4 (all fire) |
| **Yeast** | Diagonal ±2 + Diagonal ±1: `[±2,±2] [±1,±1]` | 8 | 4 (random of 8) |
| **Spore** | Diagonal ±3 + Diagonal ±1: `[±3,±3] [±1,±1]` | 8 | 4 (random of 8) |

### Long-Range vs Short-Range

"Long-range" types have reach beyond 1 cell. They get their primary (long) offsets **plus** shorter intermediate ones, making them more mobile but also easier to stop (higher overwhelm thresholds, more directions to contest).

| Category | Types | Reach |
|----------|-------|-------|
| Short-range (1 cell) | Coccus, Influenza, Mold | Immediate neighbors only |
| Long-range (2+ cells) | Bacillus, Spirillum, Retrovirus, Yeast, Spore | Skip over cells |
| Extreme range (3 cells) | Phage | Camel jump [±1,±3] |

---

## Medicine Types

Each pathogen has exactly one counter-medicine that **uses the same growth pattern**:

| Pathogen | Counter Medicine | Pattern Shared |
|----------|-----------------|---------------|
| Coccus | **Penicillin** | Cardinal ±1 (4 dirs) |
| Bacillus | **Tetracycline** | Cardinal ±2 + ±1 (8 dirs) |
| Spirillum | **Streptomycin** | Narrow Knight + Diagonal ±1 (8 dirs) |
| Influenza | **Tamiflu** | Full Knight (8 dirs) |
| Retrovirus | **Zidovudine** | Wide Knight + Cardinal ±1 (8 dirs) |
| Phage | **Interferon** | Camel + Diagonal ±1 (12 dirs) |
| Mold | **Fluconazole** | Diagonal ±1 (4 dirs) |
| Yeast | **Nystatin** | Diagonal ±2 + ±1 (8 dirs) |
| Spore | **Amphotericin** | Diagonal ±3 + ±1 (8 dirs) |

The `COUNTERS` map connects each medicine to the pathogen it kills. The `COUNTERED_BY` inverse map connects each pathogen to its counter-medicine. Both are exported from `constants.ts`.

---

## Growth Direction Constants

Raw offset arrays in `constants.ts`:

```
CARDINAL_1     = [[-1,0],[1,0],[0,-1],[0,1]]                    (4 dirs)
CARDINAL_2     = [[-2,0],[2,0],[0,-2],[0,2]]                    (4 dirs)
NARROW_KNIGHT  = [[-1,-2],[-1,2],[1,-2],[1,2]]                  (4 dirs)
FULL_KNIGHT    = [[-1,-2],[-1,2],[1,-2],[1,2],[-2,-1],[-2,1],[2,-1],[2,1]] (8 dirs)
WIDE_KNIGHT    = [[-2,-1],[-2,1],[2,-1],[2,1]]                  (4 dirs)
CAMEL          = [[-1,-3],[-1,3],[1,-3],[1,3],[-3,-1],[-3,1],[3,-1],[3,1]] (8 dirs)
DIAGONAL_1     = [[-1,-1],[-1,1],[1,-1],[1,1]]                  (4 dirs)
DIAGONAL_2     = [[-2,-2],[-2,2],[2,-2],[2,2]]                  (4 dirs)
DIAGONAL_3     = [[-3,-3],[-3,3],[3,-3],[3,3]]                  (4 dirs)
```

The `GROWTH_DIRS` map combines these for each type:

```
coccus      = CARDINAL_1                                         (4)
bacillus    = CARDINAL_2 + CARDINAL_1                            (8)
spirillum   = NARROW_KNIGHT + DIAGONAL_1                         (8)
influenza   = FULL_KNIGHT                                        (8)
retrovirus  = WIDE_KNIGHT + CARDINAL_1                           (8)
phage       = CAMEL + DIAGONAL_1                                 (12)
mold        = DIAGONAL_1                                         (4)
yeast       = DIAGONAL_2 + DIAGONAL_1                            (8)
spore       = DIAGONAL_3 + DIAGONAL_1                            (8)
```

Medicine types use the **exact same `GROWTH_DIRS`** as their counter pathogen via `MED_GROWTH_DIRS`.

---

## Key Thresholds

### MAX_CHILDREN_PER_CELL

Caps how many new tiles each parent cell can spawn per generation. Excess children are pruned via seeded random selection.

| Cap | Types |
|-----|-------|
| 4 | Coccus, Bacillus, Spirillum, Retrovirus, Mold, Yeast, Spore |
| 8 | Influenza, Phage |

Medicine has identical caps via `MAX_CHILDREN_PER_MED_CELL`.

### OVERWHELM_THRESHOLD

A pathogen dies when this many counter-medicine cells exist in its growth neighborhood:

| Dirs | Threshold | Types |
|------|-----------|-------|
| 4-dir | **2** | Coccus, Mold |
| 8-dir | **3** | Bacillus, Spirillum, Influenza, Retrovirus, Yeast, Spore |
| 12-dir | **4** | Phage |

### Other Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MEDICINE_LIFESPAN` | 999 | Turns before medicine expires (effectively permanent) |
| `GENS_PER_TURN` | 1 | Generation steps executed per player turn |
| `INFECTION_LOSE_PCT` | 50 | Board infection % that triggers instant loss |

---

## Core Types

### Tile

```typescript
type TileKind = "empty" | "wall" | "pathogen" | "medicine";

interface Tile {
  kind: TileKind;
  pathogenType: PathogenType | null;   // set when kind === "pathogen"
  medicineType: MedicineType | null;   // set when kind === "medicine"
  age: number;                          // generations since placement
}
```

Tile factories in `board.ts`: `emptyTile()`, `wallTile()`, `pathogenTile(type)`, `medicineTile(type)`.

### Board

```typescript
interface Board {
  w: number;     // width in columns
  h: number;     // height in rows
  tiles: Tile[]; // row-major: index = y * w + x
}
```

Grids range from 8×8 (World 1 tutorial) to 18×18 (World 4 boss).

### ToolId & ToolInventory

```typescript
type ToolId = MedicineType | "wall";                    // 10 tool types total
type ToolInventory = Record<ToolId, number>;             // count per tool
```

Players place medicine or walls. Each tool has a finite charge count. `toolGrant` (optional per-turn refill) adds charges each turn.

### LevelSpec

The complete definition needed to play a level:

```typescript
interface LevelSpec {
  id: number;                      // global ID: (world-1)*50 + levelNum
  world: number;                   // 1-4
  title: string;                   // display name ("Viral Cascade")
  hint: string;                    // strategy hint text
  grid: { w: number; h: number }; // board dimensions
  walls: [number, number][];      // wall coordinates [x, y]
  seeds: Array<{ type: PathogenType; x: number; y: number }>; // initial germs
  tools: ToolInventory;           // starting tool charges
  toolGrant?: ToolInventory;      // per-turn tool refill
  toolsPerTurn: number;           // max placements per turn
  turnLimit: number;              // total turns available
  objective: Objective;           // win condition
  parTurns: number;               // "par" for 3-star bonus
}
```

### GameState

The mutable runtime state during gameplay:

```typescript
interface GameState {
  levelId: number;
  turn: number;
  board: Board;
  tools: ToolInventory;
  objective: Objective;
  toolsUsedThisTurn: number;
  toolsPerTurn: number;
  switchesPerTurn: number;        // always 1
  switchesUsedThisTurn: number;
  turnLimit: number;
  peakInfectionPct: number;       // highest % seen during play
  isOver: boolean;
  result: "playing" | "win" | "lose";
  stars: number;                  // 0-3, set on win
}
```

Created via `createGameState(spec: LevelSpec)` in `board.ts`.

### Action

Player actions applied via `applyAction(state, action)`:

```typescript
type Action =
  | { type: "place_tool"; tool: ToolId; x: number; y: number }
  | { type: "switch"; fromX: number; fromY: number; toX: number; toY: number }
  | { type: "skip" };
```

- **place_tool**: puts medicine/wall on an empty cell (costs 1 action, limited by `toolsPerTurn`)
- **switch**: swaps a medicine or wall with an adjacent empty cell (1 per turn, separate from actions)
- **skip**: does nothing (always valid)

### Objective

Three distinct win conditions:

```typescript
type Objective =
  | { type: "clear_all" }
  | { type: "survive"; maxTurns: number }
  | { type: "contain"; maxPct: number; maxTurns: number };
```

All procedurally generated levels use **`contain`**. The others exist for potential hand-crafted or special levels.

---

## Animation Timing Constants

```typescript
const ANIM = {
  spread:         200,    // ms — pathogen/medicine birth animation
  kill:           250,    // ms — entity death (shrink + fade)
  toolPlace:      150,    // ms — tool placement flash
  burst:          400,    // ms — expanding ring effect
  genTick:        300,    // ms — delay between generation steps
  winSequence:   1200,    // ms — victory sequence duration
  loseSequence:   800,    // ms — defeat shake duration
  turnTransition: 100     // ms — turn counter transition
};
```

Used by `LevelScene` to pace animated generation stepping and by `tweens.ts` for tween durations.

---

## Visual Data Maps

Defined in `src/game/config.ts`:

### Color Palettes

Colors are hex numbers (e.g., `0x00ff88`) used for procedural shape fallbacks and UI tinting:

- `PATHOGEN_COLORS` — 9 entries, grouped by family: greens (bacteria), reds (virus), purples (fungus)
- `MEDICINE_COLORS` — 9 entries: cyans, limes, pinks
- `TOOL_COLORS` — 10 entries (9 medicines + wall gray)

### Texture Key Maps

Map each type to its PNG asset key loaded in BootScene:

- `PATHOGEN_TEXTURES`: e.g., `"coccus"` → `"coccus"` (matches filename sans extension)
- `MEDICINE_TEXTURES`: e.g., `"penicillin"` → `"penicillin"`
- `TILE_BG_TEXTURES`: e.g., `"empty"` → `"tile_empty"`, `"wall"` → `"tile_wall"`
- `TOOL_TEXTURES`: e.g., `"penicillin"` → `"tool_penicillin"` (canvas-generated)

### Display Names & Labels

- `PATHOGEN_NAMES`: full names ("Coccus", "Bacillus", etc.)
- `MEDICINE_NAMES`: full names ("Penicillin", "Tetracycline", etc.)
- `TOOL_LABELS`: 3-char abbreviations ("PEN", "TET", "STR", etc.) for tight UI
- `TOOL_DESCRIPTIONS`: one-line descriptions used in ToolPalette tooltips

### Procedural Shape Map

`PATHOGEN_SHAPES` assigns each pathogen a fallback shape drawn when PNG sprites are unavailable:

| Shape | Types |
|-------|-------|
| `circle` | Coccus |
| `rod` | Bacillus |
| `spiral` | Spirillum |
| `spike` | Influenza |
| `icosa` | Retrovirus |
| `phage_t4` | Phage |
| `diamond` | Mold |
| `branch` | Yeast |
| `starburst` | Spore |

---

## UI Color Constants

```typescript
const UI = {
  bgDark:      0x0a0a1a,   // deep navy (main background)
  bgPanel:     0x1a1a2e,   // panel backgrounds
  textPrimary: 0xffffff,   // main text
  textMuted:   0x8888aa,   // secondary text
  accentCyan:  0x00d4ff,   // primary action color
  accentGold:  0xffd700,   // stars, rewards
  dangerRed:   0xff4444,   // infection bar high, reset button
  successGreen:0x44ff44,   // clear confirmation
  warningAmber:0xffaa00,   // medium infection bar
};
```
