# Bio Defence Expansion Plan
## 9 Pathogens · 9 Medicines · 4 Worlds · 200 Levels

---

## 1. The 9 Pathogens

Expand from 3 generic types to **9 distinct pathogens** grouped into 3 biological families.
Each has a **unique growth pattern** (directional offsets per generation) and a **dedicated medicine counter**.

### Bacteria Family (Orthogonal Spreaders)

| # | Pathogen | ID | Growth Pattern | Dirs | Range | Color |
|---|----------|----|---------------|------|-------|-------|
| 1 | **Coccus** | `coccus` | Cardinal ±1 (Rook step) | 4 | 1 | `#4CAF50` Green |
| 2 | **Bacillus** | `bacillus` | Cardinal ±2 (Cannon leap) | 4 | 2 | `#8BC34A` Lime |
| 3 | **Spirillum** | `spirillum` | Narrow Knight `[±1,±2]` | 4 | √5 | `#009688` Teal |

*Bacteria are the "learnable" family. Coccus is the tutorial germ (predictable cardinal spread). Bacillus introduces leaping (jumps 1 cell). Spirillum is a bacteria that moves like half a knight — a strategic curveball.*

### Virus Family (L-Shape Jumpers)

| # | Pathogen | ID | Growth Pattern | Dirs | Range | Color |
|---|----------|----|---------------|------|-------|-------|
| 4 | **Influenza** | `influenza` | Full Knight `[±1,±2][±2,±1]` | 8 | √5 | `#F44336` Red |
| 5 | **Retrovirus** | `retrovirus` | Wide Knight `[±2,±1]` | 4 | √5 | `#C62828` Crimson |
| 6 | **Phage** | `phage` | Camel `[±1,±3][±3,±1]` | 8 | √10 | `#FF5722` Deep Orange |

*Viruses jump over walls entirely. Influenza has 8 possible directions (classic knight). Retrovirus has only 4 (horizontal-biased L). Phage is the most dangerous — camel jumps reaching √10 ≈ 3.16 cells away.*

### Fungus Family (Diagonal Spreaders)

| # | Pathogen | ID | Growth Pattern | Dirs | Range | Color |
|---|----------|----|---------------|------|-------|-------|
| 7 | **Mold** | `mold` | Diagonal ±1 (Bishop step) | 4 | √2 | `#9C27B0` Purple |
| 8 | **Yeast** | `yeast` | Diagonal ±2 (Long diagonal) | 4 | 2√2 | `#CE93D8` Lavender |
| 9 | **Spore** | `spore` | Diagonal ±3 (Spore launch) | 4 | 3√2 | `#4A148C` Deep Violet |

*Fungi thread through gaps that stop bacteria. Mold is the basic diagonal. Yeast leaps 1 diagonal cell. Spore is the longest-range pathogen in the game — diagonal ±3, reaching 4.24 cells away. Late-game terror.*

---

## 2. Growth Pattern Offsets

```
COCCUS (Cardinal ±1)         BACILLUS (Cardinal ±2)       SPIRILLUM (Narrow Knight)
  . . . X . . .                . . . X . . .                . . . . . . .
  . . . X . . .                . . . . . . .                . . X . X . .
  . . . X . . .                . . . X . . .                . . . . . . .
  X X X ● X X X                X . X ● X . X                . . . ● . . .
  . . . X . . .                . . . X . . .                . . . . . . .
  . . . X . . .                . . . . . . .                . . X . X . .
  . . . X . . .                . . . X . . .                . . . . . . .

INFLUENZA (Full Knight)       RETROVIRUS (Wide Knight)      PHAGE (Camel)
  . . . . . . .                . . . . . . .                . X . . . X .
  . . X . X . .                . . . . . . .                . . . . . . .
  . X . . . X .                . X . . . X .                . . . . . . .
  . . . ● . . .                . . . ● . . .                X . . ● . . X
  . X . . . X .                . X . . . X .                . . . . . . .
  . . X . X . .                . . . . . . .                . . . . . . .
  . . . . . . .                . . . . . . .                . X . . . X .

MOLD (Diagonal ±1)            YEAST (Diagonal ±2)           SPORE (Diagonal ±3)
  . . . . . . .                . . . . . . .                X . . . . . X
  . . . . . . .                . . . . . . .                . . . . . . .
  . . X . X . .                . X . . . X .                . . . . . . .
  . . . ● . . .                . . . ● . . .                . . . ● . . .
  . . X . X . .                . X . . . X .                . . . . . . .
  . . . . . . .                . . . . . . .                . . . . . . .
  . . . . . . .                . . . . . . .                X . . . . . X
```

### Direction Arrays (for constants.ts)

```typescript
// BACTERIA
COCCUS:     [[1,0],[-1,0],[0,1],[0,-1]]                          // 4 dirs
BACILLUS:   [[2,0],[-2,0],[0,2],[0,-2]]                          // 4 dirs
SPIRILLUM:  [[1,2],[1,-2],[-1,2],[-1,-2]]                        // 4 dirs

// VIRUS
INFLUENZA:  [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]]  // 8 dirs
RETROVIRUS: [[2,1],[2,-1],[-2,1],[-2,-1]]                        // 4 dirs
PHAGE:      [[1,3],[1,-3],[-1,3],[-1,-3],[3,1],[3,-1],[-3,1],[-3,-1]]  // 8 dirs

// FUNGUS
MOLD:       [[1,1],[1,-1],[-1,1],[-1,-1]]                        // 4 dirs
YEAST:      [[2,2],[2,-2],[-2,2],[-2,-2]]                        // 4 dirs
SPORE:      [[3,3],[3,-3],[-3,3],[-3,-3]]                        // 4 dirs
```

### Key Pattern Relationships

| Pattern | Blocked by walls? | # of spread directions | Max reach | Difficulty |
|---------|:-:|:-:|:-:|:--|
| Coccus (Cardinal ±1) | ✅ Yes | 4 | 1.0 | ★☆☆ |
| Mold (Diagonal ±1) | ✅ Yes | 4 | 1.4 | ★☆☆ |
| Bacillus (Cardinal ±2) | ❌ Leaps 1 | 4 | 2.0 | ★★☆ |
| Yeast (Diagonal ±2) | ❌ Leaps 1 | 4 | 2.8 | ★★☆ |
| Spirillum (Narrow Knight) | ❌ L-jump | 4 | 2.2 | ★★☆ |
| Retrovirus (Wide Knight) | ❌ L-jump | 4 | 2.2 | ★★☆ |
| Influenza (Full Knight) | ❌ L-jump | 8 | 2.2 | ★★★ |
| Spore (Diagonal ±3) | ❌ Leaps 2 | 4 | 4.2 | ★★★ |
| Phage (Camel) | ❌ L-jump | 8 | 3.2 | ★★★ |

### Overwhelm Thresholds

A pathogen dies when ≥ N of its growth-direction neighbors are its counter-medicine:

| Directions | Threshold | Ratio |
|:----------:|:---------:|:-----:|
| 4 | 2 | 50% |
| 8 | 3 | 37.5% |

---

## 3. The 9 Medicine Tools

Each medicine mirrors its target pathogen's growth pattern — it spreads the same way, creating a "mirror match" dynamic.

| # | Medicine | ID | Counters | Growth Pattern | Color | Family Color |
|---|----------|----|----------|---------------|-------|:-----:|
| 1 | **Penicillin** | `penicillin` | Coccus | Cardinal ±1 | `#00E5FF` | Cyan |
| 2 | **Tetracycline** | `tetracycline` | Bacillus | Cardinal ±2 | `#18FFFF` | Cyan |
| 3 | **Streptomycin** | `streptomycin` | Spirillum | Narrow Knight | `#00BFA5` | Teal |
| 4 | **Tamiflu** | `tamiflu` | Influenza | Full Knight | `#76FF03` | Lime |
| 5 | **Zidovudine** | `zidovudine` | Retrovirus | Wide Knight | `#B2FF59` | Light Lime |
| 6 | **Interferon** | `interferon` | Phage | Camel | `#AEEA00` | Yellow-Green |
| 7 | **Fluconazole** | `fluconazole` | Mold | Diagonal ±1 | `#EA80FC` | Pink |
| 8 | **Nystatin** | `nystatin` | Yeast | Diagonal ±2 | `#E040FB` | Magenta |
| 9 | **Amphotericin** | `amphotericin` | Spore | Diagonal ±3 | `#D500F9` | Violet |

Plus **Wall** (`wall`) — quarantine barrier blocking all spread.

### UI Short Names (for tool palette tooltips)

| Medicine | Short | Tooltip |
|----------|-------|---------|
| Penicillin | PEN | "Kills Coccus — spreads cardinally" |
| Tetracycline | TET | "Kills Bacillus — leaps 2 cells" |
| Streptomycin | STR | "Kills Spirillum — narrow L-jumps" |
| Tamiflu | TAM | "Kills Influenza — full knight jumps" |
| Zidovudine | ZDV | "Kills Retrovirus — wide L-jumps" |
| Interferon | IFN | "Kills Phage — camel jumps" |
| Fluconazole | FLC | "Kills Mold — spreads diagonally" |
| Nystatin | NYS | "Kills Yeast — long diagonal leaps" |
| Amphotericin | AMB | "Kills Spore — extreme diagonal range" |
| Wall | WALL | "Quarantine barrier — blocks all spread" |

---

## 4. The 4 Worlds

### World 1: "Petri Dish" 🧫

| Property | Value |
|----------|-------|
| **Color** | `#4CAF50` Green |
| **Grid sizes** | 8×8 → 14×14 |
| **Stars to unlock** | 0 (free) |
| **Germs** | Coccus, Mold, Bacillus |
| **Tools** | Penicillin, Fluconazole, Tetracycline, Wall |
| **Theme** | Clean laboratory, agar plate. Simple geometry. |

**Level Progression:**
- **L1-10:** Coccus only. Tutorial. Learn cardinal blocking with Penicillin.
- **L11-20:** + Mold. Diagonal threat layering. Two medicines to manage.
- **L21-35:** + Bacillus. Leaps over single walls — must build double barriers.
- **L36-50:** All 3. Escalating board size and seed counts. Boss at L50.

**Map Templates:** Open, Pillars, Divider (clean, geometric layouts)

**Background:** Pale green gradient, subtle grid pattern, glass petri dish aesthetic. Clean, clinical.

---

### World 2: "Bloodstream" 🩸

| Property | Value |
|----------|-------|
| **Color** | `#E53935` Red |
| **Grid sizes** | 10×10 → 16×16 |
| **Stars to unlock** | 40 |
| **Germs** | Influenza, Coccus, Retrovirus |
| **Tools** | Tamiflu, Penicillin, Zidovudine, Wall |
| **Theme** | Blood vessels, red corpuscles, flowing channels. |

**Level Progression:**
- **L1-10:** Influenza only. Learn knight-blocking — walls don't help!
- **L11-20:** + Coccus. Familiar friend from W1, but competing for tool slots.
- **L21-35:** + Retrovirus. Wide knight vs narrow knight — different blocking angles.
- **L36-50:** All 3. Two jump patterns + cardinal. Triage decisions.

**Map Templates:** Corridors, **Vein** (new), **Chamber** (new)

**Background:** Deep crimson gradient, flowing red/dark-red organic shapes. Capillary-like structures.

---

### World 3: "Tissue" 🔬

| Property | Value |
|----------|-------|
| **Color** | `#AB47BC` Purple |
| **Grid sizes** | 10×10 → 16×16 |
| **Stars to unlock** | 100 |
| **Germs** | Yeast, Spirillum, Retrovirus |
| **Tools** | Nystatin, Streptomycin, Zidovudine, Wall |
| **Theme** | Dense cellular tissue, organic membranes, maze-like. |

**Level Progression:**
- **L1-10:** Yeast only. Learn long diagonal leaps — diagonals that jump 1 cell.
- **L11-20:** + Spirillum. A bacteria with the narrow knight pattern! Cross-family surprise.
- **L21-35:** + Retrovirus. Three different L-shaped/leap patterns simultaneously.
- **L36-50:** All 3. Dense boards, tight thresholds, precision placement.

**Map Templates:** **Maze** (new), Cross, L-Wall, **Honeycomb** (new)

**Background:** Purple-violet gradient, cell-membrane patterns, dense organic textures.

---

### World 4: "Pandemic" ☣️

| Property | Value |
|----------|-------|
| **Color** | `#FF6F00` Orange |
| **Grid sizes** | 12×12 → 18×18 |
| **Stars to unlock** | 180 |
| **Germs** | Phage, Spore, Spirillum, Bacillus (4 germs!) |
| **Tools** | Interferon, Amphotericin, Streptomycin, Tetracycline, Wall (5 tools!) |
| **Theme** | Full outbreak. Hospital crisis. Maximum chaos. |

**Level Progression:**
- **L1-10:** Phage only. Learn extreme-range camel jumps on large boards.
- **L11-18:** + Spore. Diagonal ±3 — the longest-range pathogen in the game.
- **L19-30:** + Spirillum. Three leap patterns from three different families.
- **L31-50:** + Bacillus. Four germs, five tools. Ultimate test of mastery.

**Map Templates:** All templates mixed including **Compound** (new)

**Background:** Orange-red gradient, biohazard symbols, quarantine zone aesthetic.

---

## 5. New Map Templates

Add 5 new templates to the existing 6 (total 11):

### Vein (World 2)
Long narrow meandering channels like blood vessels. 2-3 winding corridors of width 2-3 cells with occasional wider chambers. Viruses can jump across the vessel walls.

### Chamber (World 2)
3-4 rectangular rooms connected by 2-wide doorways. Creates distinct battle zones that kn ight-jumping viruses can breach.

### Maze (World 3)
Dense wall network creating narrow 1-2 cell wide passages. Many dead ends and loops. Diagonal/L-jumping germs thread through while cardinal-based tools struggle.

### Honeycomb (World 3)
Regular hexagonal-ish pattern: walls form a repeating cellular pattern with 2-3 wide hex cells. Creates a tissue-like feel.

### Compound (World 4)
2-4 large sub-regions (different sizes) connected by narrow bridges. Each region can have different germ pressure. Forces the player to decide which zone to sacrifice.

---

## 6. Star Gating

| World | Stars Needed | Expected Progress |
|:-----:|:-----------:|:-----------------|
| 1 | 0 | Start of game |
| 2 | 40 | ~14 levels 3-starred in W1 |
| 3 | 100 | Solid play through W1 + W2 |
| 4 | 180 | Good play through 3 worlds |

Max possible stars per world: 50 levels × 3 stars = 150
Total possible: 600 stars across 4 worlds.

---

## 7. Asset Manifest

### Germ Tile Sprites (9 files)

| File | Description | Size | Visual |
|------|-------------|------|--------|
| `assets/germs/coccus.png` | Round bacteria cluster | 256×256 | Green grape-like spheres |
| `assets/germs/bacillus.png` | Rod-shaped bacteria | 256×256 | Lime rods/capsules |
| `assets/germs/spirillum.png` | Spiral bacteria | 256×256 | Teal corkscrew shape |
| `assets/germs/influenza.png` | Spike-ball virus | 256×256 | Red sphere with surface spikes |
| `assets/germs/retrovirus.png` | Geometric virus | 256×256 | Crimson icosahedral shape |
| `assets/germs/phage.png` | Bacteriophage | 256×256 | Deep orange T4 phage (head+tail) |
| `assets/germs/mold.png` | Branching hyphae | 256×256 | Purple branching tree |
| `assets/germs/yeast.png` | Budding cells | 256×256 | Lavender budding ovals |
| `assets/germs/spore.png` | Explosive starburst | 256×256 | Deep violet radiating spore |

### Medicine Tile Sprites (9 files)

| File | Description | Size |
|------|-------------|------|
| `assets/germs/penicillin.png` | Cyan glow + medical cross | 256×256 |
| `assets/germs/tetracycline.png` | Cyan glow + medical cross | 256×256 |
| `assets/germs/streptomycin.png` | Teal glow + medical cross | 256×256 |
| `assets/germs/tamiflu.png` | Lime glow + medical cross | 256×256 |
| `assets/germs/zidovudine.png` | Light lime glow + medical cross | 256×256 |
| `assets/germs/interferon.png` | Yellow-green glow + medical cross | 256×256 |
| `assets/germs/fluconazole.png` | Pink glow + medical cross | 256×256 |
| `assets/germs/nystatin.png` | Magenta glow + medical cross | 256×256 |
| `assets/germs/amphotericin.png` | Violet glow + medical cross | 256×256 |

### World Tile Variants (8 files)

| File | Description |
|------|-------------|
| `assets/tiles/tile_empty_w1.png` | Green-tinted agar plate |
| `assets/tiles/tile_empty_w2.png` | Red-tinted plasma |
| `assets/tiles/tile_empty_w3.png` | Purple-tinted cellular |
| `assets/tiles/tile_empty_w4.png` | Orange-tinted hazmat |
| `assets/tiles/tile_wall_w1.png` | Glass petri dish rim |
| `assets/tiles/tile_wall_w2.png` | Blood vessel wall |
| `assets/tiles/tile_wall_w3.png` | Dense membrane |
| `assets/tiles/tile_wall_w4.png` | Metal quarantine barrier |

### World Background Images (4 files)

| File | Description |
|------|-------------|
| `assets/bg/world_1_petri.png` | Green lab gradient, 720×400 |
| `assets/bg/world_2_blood.png` | Red capillary gradient, 720×400 |
| `assets/bg/world_3_tissue.png` | Purple organic gradient, 720×400 |
| `assets/bg/world_4_pandemic.png` | Orange crisis gradient, 720×400 |

### Tool Palette Icons (generated at runtime in UIFactory.ts)

10 medicine icons + wall icon, drawn on canvas at 3× scale:
- Penicillin, Tetracycline, Streptomycin (cyan family)
- Tamiflu, Zidovudine, Interferon (lime family)
- Fluconazole, Nystatin, Amphotericin (pink family)
- Wall (brown)

**Total new asset files: 30** (9 germs + 9 medicines + 8 world tiles + 4 backgrounds)

---

## 8. Code Changes Required

### 8.1. `src/sim/types.ts`

```typescript
// BEFORE:
export type PathogenType = "bacteria" | "virus" | "fungus";
export type MedicineType = "antibiotic" | "antiviral" | "antifungal";
export type ToolId = "antibiotic" | "antiviral" | "antifungal" | "wall";
export interface ToolInventory {
  antibiotic: number; antiviral: number; antifungal: number; wall: number;
}

// AFTER:
export type PathogenType =
  | "coccus" | "bacillus" | "spirillum"           // bacteria family
  | "influenza" | "retrovirus" | "phage"           // virus family
  | "mold" | "yeast" | "spore";                    // fungus family

export type MedicineType =
  | "penicillin" | "tetracycline" | "streptomycin"  // anti-bacteria
  | "tamiflu" | "zidovudine" | "interferon"         // anti-virus
  | "fluconazole" | "nystatin" | "amphotericin";    // anti-fungus

export type ToolId = MedicineType | "wall";

// Dynamic inventory (replaces fixed interface)
export type ToolInventory = Record<ToolId, number>;
```

**Add helper:**
```typescript
export function emptyInventory(): ToolInventory {
  return {
    penicillin: 0, tetracycline: 0, streptomycin: 0,
    tamiflu: 0, zidovudine: 0, interferon: 0,
    fluconazole: 0, nystatin: 0, amphotericin: 0,
    wall: 0,
  };
}
```

### 8.2. `src/sim/constants.ts`

Add all 9 growth patterns + 9 medicine patterns + counter mappings:

```typescript
export const ALL_PATHOGEN_TYPES: PathogenType[] = [
  "coccus","bacillus","spirillum",
  "influenza","retrovirus","phage",
  "mold","yeast","spore",
];

export const ALL_MEDICINE_TYPES: MedicineType[] = [
  "penicillin","tetracycline","streptomycin",
  "tamiflu","zidovudine","interferon",
  "fluconazole","nystatin","amphotericin",
];

export const ALL_TOOL_IDS: ToolId[] = [...ALL_MEDICINE_TYPES, "wall"];

// Growth patterns
export const CARDINAL_1: [number,number][] = [[1,0],[-1,0],[0,1],[0,-1]];
export const CARDINAL_2: [number,number][] = [[2,0],[-2,0],[0,2],[0,-2]];
export const NARROW_KNIGHT: [number,number][] = [[1,2],[1,-2],[-1,2],[-1,-2]];
export const FULL_KNIGHT: [number,number][] = [
  [1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]
];
export const WIDE_KNIGHT: [number,number][] = [[2,1],[2,-1],[-2,1],[-2,-1]];
export const CAMEL: [number,number][] = [
  [1,3],[1,-3],[-1,3],[-1,-3],[3,1],[3,-1],[-3,1],[-3,-1]
];
export const DIAGONAL_1: [number,number][] = [[1,1],[1,-1],[-1,1],[-1,-1]];
export const DIAGONAL_2: [number,number][] = [[2,2],[2,-2],[-2,2],[-2,-2]];
export const DIAGONAL_3: [number,number][] = [[3,3],[3,-3],[-3,3],[-3,-3]];

export const PATHOGEN_GROWTH: Record<PathogenType, [number,number][]> = {
  coccus: CARDINAL_1,
  bacillus: CARDINAL_2,
  spirillum: NARROW_KNIGHT,
  influenza: FULL_KNIGHT,
  retrovirus: WIDE_KNIGHT,
  phage: CAMEL,
  mold: DIAGONAL_1,
  yeast: DIAGONAL_2,
  spore: DIAGONAL_3,
};

export const MEDICINE_GROWTH: Record<MedicineType, [number,number][]> = {
  penicillin: CARDINAL_1,
  tetracycline: CARDINAL_2,
  streptomycin: NARROW_KNIGHT,
  tamiflu: FULL_KNIGHT,
  zidovudine: WIDE_KNIGHT,
  interferon: CAMEL,
  fluconazole: DIAGONAL_1,
  nystatin: DIAGONAL_2,
  amphotericin: DIAGONAL_3,
};

export const COUNTERED_BY: Record<PathogenType, MedicineType> = {
  coccus: "penicillin",
  bacillus: "tetracycline",
  spirillum: "streptomycin",
  influenza: "tamiflu",
  retrovirus: "zidovudine",
  phage: "interferon",
  mold: "fluconazole",
  yeast: "nystatin",
  spore: "amphotericin",
};

export const COUNTERS: Record<MedicineType, PathogenType> = {
  penicillin: "coccus",
  tetracycline: "bacillus",
  streptomycin: "spirillum",
  tamiflu: "influenza",
  zidovudine: "retrovirus",
  interferon: "phage",
  fluconazole: "mold",
  nystatin: "yeast",
  amphotericin: "spore",
};

export const OVERWHELM_THRESHOLD: Record<PathogenType, number> = {
  coccus: 2, bacillus: 2, spirillum: 2,     // 4-dir → 2
  influenza: 3, phage: 3,                    // 8-dir → 3
  retrovirus: 2, mold: 2, yeast: 2, spore: 2, // 4-dir → 2
};
```

### 8.3. `src/sim/step.ts`

Replace hardcoded type arrays with constants:

```typescript
// BEFORE:
const pathTypes: PathogenType[] = ["bacteria", "virus", "fungus"];
const medTypes: MedicineType[] = ["antibiotic", "antiviral", "antifungal"];

// AFTER:
import { ALL_PATHOGEN_TYPES, ALL_MEDICINE_TYPES } from "./constants";
// Then use ALL_PATHOGEN_TYPES and ALL_MEDICINE_TYPES in resolveBirth()
```

**Performance note:** Iterating 9 types instead of 3 in birth resolution. On a 16×16 grid (256 tiles), that's 256 × 9 = 2,304 checks per type category per generation. Still fast — well under 1ms.

### 8.4. `src/sim/tools.ts`

Replace the `TOOL_TO_MEDICINE` partial map with the identity mapping (since ToolId = MedicineType | "wall"):

```typescript
export function applyTool(state: GameState, tool: ToolId, x: number, y: number): void {
  if (tool === "wall") {
    setTile(state.board, x, y, wallTile());
  } else {
    setTile(state.board, x, y, medicineTile(tool as MedicineType));
  }
  state.tools[tool]--;
}
```

### 8.5. `src/sim/generator.ts`

The biggest change. Replace the single `tierParams()` function with a **world-aware** `worldTierParams(worldNum, levelNum, rng)`:

```typescript
interface WorldConfig {
  name: string;
  germs: PathogenType[][];  // progression tiers: [L1-10 germs, L11-20, L21-35, L36-50]
  templates: number[][];     // template pool per tier
  gridRange: [number, number]; // min/max grid size
  starsNeeded: number;
}

const WORLD_CONFIGS: Record<number, WorldConfig> = {
  1: {
    name: "Petri Dish",
    germs: [["coccus"], ["coccus","mold"], ["coccus","mold","bacillus"], ["coccus","mold","bacillus"]],
    templates: [[0,1], [0,1,2], [0,1,2,3], [0,1,2,3,4,5]],
    gridRange: [8, 14],
    starsNeeded: 0,
  },
  2: {
    name: "Bloodstream",
    germs: [["influenza"], ["influenza","coccus"], ["influenza","coccus","retrovirus"], ["influenza","coccus","retrovirus"]],
    templates: [[4,6], [4,6,7], [4,6,7,3], [4,5,6,7,3]],
    gridRange: [10, 16],
    starsNeeded: 40,
  },
  // ... etc
};
```

### 8.6. `src/game/config.ts`

Expand all Record types to cover 9 pathogens, 9 medicines, 10 tools.

### 8.7. `src/game/scenes/BootScene.ts`

Load all 30 new asset files:
```typescript
// 9 germ sprites
for (const g of ALL_PATHOGEN_TYPES) {
  this.load.image(g, `assets/germs/${g}.png`);
}
// 9 medicine sprites
for (const m of ALL_MEDICINE_TYPES) {
  this.load.image(m, `assets/germs/${m}.png`);
}
// World-specific tiles (loaded based on current world)
```

### 8.8. `src/game/scenes/MenuScene.ts`

Expand WORLDS:
```typescript
const WORLDS = [
  { id: 1, name: "Petri Dish", color: 0x4caf50, starsNeeded: 0 },
  { id: 2, name: "Bloodstream", color: 0xe53935, starsNeeded: 40 },
  { id: 3, name: "Tissue",     color: 0xab47bc, starsNeeded: 100 },
  { id: 4, name: "Pandemic",   color: 0xff6f00, starsNeeded: 180 },
];
```

### 8.9. `src/game/ui/UIFactory.ts`

Expand `genToolIcons()` to draw all 10 tool icons with distinct per-medicine visual:
- Bacteria-family medicines: cyan medical cross variants
- Virus-family medicines: lime shield/spike variants
- Fungus-family medicines: pink organic variants

### 8.10. `src/game/ui/Grid.ts`

Update `PATHOGEN_TEXTURES`, `MEDICINE_TEXTURES`, and procedural fallback shapes for all 9 types.

---

## 9. Testing Plan

### Update existing tests:
- `solvability.test.ts` — update typeToTool maps, verify all 4 worlds generate valid levels
- `step.test.ts` — add growth pattern tests for all 9 pathogens
- `board.test.ts` — update tile creation tests

### New tests:
- **Pattern coverage:** Verify each pathogen's offsets match its direction array
- **Counter relationships:** For each pathogen, verify the correct medicine kills it
- **World generation:** Each world uses only its designated germs
- **Inventory:** ToolInventory initializes with 0 for all 10 entries
- **Cross-family play:** Spirillum (bacteria with L-pattern) is countered by Streptomycin (not Tamiflu)

---

## 10. Future Expansion Slots

With 9 germs and C(9,3)=84 possible 3-germ combos, we have room for **dozens more worlds**:

| Future World | Possible Germ Combo | Theme Idea |
|:---:|:---|:---|
| 5 | Spore + Influenza + Bacillus | "Mutation" — extreme range |
| 6 | Phage + Mold + Coccus | "Ecosystem" — all ranges |
| 7 | Yeast + Influenza + Spirillum | "Neural" — brain tissue |
| 8 | Spore + Phage + Retrovirus | "Extinction" — all leapers |

Could also add new germ families (10th+ germ types):
- **Prion** — king pattern (all 8 adjacent)
- **Parasite** — moves 1 cell per turn in a fixed direction (worm-like)
- **Biofilm** — doesn't spread, but makes adjacent pathogens immune to medicine

---

## 11. Migration Strategy

### Phase 1: Types + Constants (no visual changes)
1. Update types.ts, constants.ts
2. Change step.ts to use dynamic arrays
3. Update tools.ts
4. Fix all tests → ensure 122/122 still pass with renamed types

### Phase 2: Generator (worlds diverge)
1. Refactor generator.ts with world-aware tierParams
2. Add 5 new map templates
3. Update solvability tests for 4 worlds

### Phase 3: Assets
1. Run sprite generation script → 30 new PNGs
2. Run FLUX script → 4 world backgrounds
3. Update BootScene.ts to load new assets

### Phase 4: UI
1. Expand config.ts lookup tables
2. Update Grid.ts rendering
3. Expand UIFactory.ts tool icons
4. Update MenuScene.ts with 4 worlds
5. Full visual playtest

---

*Generated: Feb 2026 · Bio Defence Expansion Plan v1.0*
