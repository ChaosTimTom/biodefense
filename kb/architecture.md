# Architecture & Project Structure

> Bio Defence — Turn-based cellular tactics puzzle game  
> **Stack:** TypeScript (strict) · Phaser 3.90 · Vite 7.3 · Vitest 4.x · Capacitor 8.1  
> **Canvas:** 400 × 720 portrait · `Phaser.Scale.FIT` + `CENTER_BOTH`  
> **Live:** [biodefence.theimmersivesaga.com](https://biodefence.theimmersivesaga.com/)

---

## Two-Layer Architecture

The codebase enforces a strict separation between **simulation** and **presentation**:

### Layer 1 — Simulation (`src/sim/`)

Pure TypeScript. **Zero Phaser imports.** Handles all game logic:

- Board state creation, mutation, cloning
- Turn engine (actions → generation → evaluation)
- Win/lose objective checking
- Procedural level generation (seeded PRNG)
- Star rating and numeric scoring
- Undo history stack
- Threat preview computation

Because the sim layer has no browser dependencies, the entire test suite (122 tests) runs in a plain Node environment via Vitest without any mocking.

### Layer 2 — Game (`src/game/`)

Phaser 3 rendering and user interaction. Depends on sim, never the reverse.

- 6 scenes manage navigation and screen flow
- 8 UI components handle rendering and player interaction
- All visual constants centralized in `config.ts`
- Canvas-generated textures at runtime via `UIFactory.ts`
- Tween library for animations via `animation/tweens.ts`

### Data Flow

```
User Input (click, keyboard)
    ↓
LevelScene (orchestrator)
    ↓
applyAction(state, action)     ← sim layer validates + applies
    ↓
advanceTurn(state, spec?)      ← increments turn, applies toolGrant
    ↓
runGeneration(board)           ← birth / survival / pruning (× GENS_PER_TURN)
    ↓
phaseEvaluate(state)           ← checks overrun, turn limit, objective
    ↓
Grid.render(board)             ← game layer re-renders visuals
    ↓
StatusBar.update(state)        ← infection bar, turn counter, objective hint
```

State is never mutated by the game layer directly — always through exported sim functions (`applyAction`, `advanceTurn`, `runGeneration`).

---

## Directory Tree

```
Bio Defence/
├── src/
│   ├── main.ts                          # Phaser boot, HiDPI text patch, game config
│   │
│   ├── sim/                             # ═══ SIMULATION LAYER (pure TS) ═══
│   │   ├── types.ts                     # Core type definitions (95 lines)
│   │   │                                  PathogenType, MedicineType, ToolId, Tile,
│   │   │                                  Board, LevelSpec, GameState, Action, Objective
│   │   ├── constants.ts                 # Game data tables (250 lines)
│   │   │                                  Growth patterns, counters, thresholds,
│   │   │                                  overwhelm values, animation timings
│   │   ├── board.ts                     # Board management (148 lines)
│   │   │                                  Tile factories, createBoard, createGameState,
│   │   │                                  coordinate helpers, counting, cloning
│   │   ├── step.ts                      # Turn engine (437 lines) — THE CORE
│   │   │                                  applyAction, advanceTurn, runGeneration,
│   │   │                                  phaseEvaluate, seededSelectN
│   │   ├── objectives.ts               # Win/lose evaluation (36 lines)
│   │   │                                  clear_all, survive, contain
│   │   ├── generator.ts                # Procedural generation (1136 lines)
│   │   │                                  mulberry32 PRNG, 11 templates, 4 world configs,
│   │   │                                  seed placement, simulation validation, dedup
│   │   ├── tools.ts                     # Tool placement (48 lines)
│   │   │                                  canPlaceTool, applyTool, getPlacementFailReason
│   │   ├── metrics.ts                   # Scoring (68 lines)
│   │   │                                  computeStars, computeScore
│   │   ├── preview.ts                   # Threat preview (55 lines)
│   │   │                                  previewSpreadTargets → [x,y][]
│   │   ├── history.ts                   # Undo stack (32 lines)
│   │   │                                  push, pop, canUndo, clear
│   │   └── index.ts                     # Barrel re-exports (15 lines)
│   │
│   └── game/                            # ═══ PRESENTATION LAYER (Phaser 3) ═══
│       ├── config.ts                    # Visual constants & layout (298 lines)
│       │                                  TILE_SIZE, colors, texture maps, display names,
│       │                                  computeLayout() → LayoutZones
│       ├── save.ts                      # Persistence (119 lines)
│       │                                  localStorage, versioned migration, derived stats
│       │
│       ├── scenes/
│       │   ├── BootScene.ts             # Asset loading, font wait, progress bar
│       │   ├── TitleScene.ts            # Title screen: stats, Play/Scores/Help
│       │   ├── MenuScene.ts             # World tabs + 5×5 paginated level grid
│       │   ├── LevelScene.ts            # Main gameplay (761 lines)
│       │   │                              State management, switch mode, animated
│       │   │                              generation stepping, keyboard shortcuts
│       │   ├── WinScene.ts              # Victory: stars + score + buttons
│       │   └── ScoresScene.ts           # High score board, per-world breakdown
│       │
│       ├── ui/
│       │   ├── Grid.ts                  # Board renderer (391 lines)
│       │   │                              Two-layer: tile bg + entity sprites,
│       │   │                              hit zones, world textures, fallback shapes
│       │   ├── ToolPalette.ts           # Horizontal tool buttons (251 lines)
│       │   │                              Dynamic visibility, selection state, tooltip
│       │   ├── TurnControls.ts          # Step/Undo/Reset buttons (164 lines)
│       │   ├── StatusBar.ts             # Turn + infection bar + objective (136 lines)
│       │   ├── PreviewOverlay.ts        # Ghost threat tiles (80 lines)
│       │   ├── StarDisplay.ts           # 3-star rating with animation (77 lines)
│       │   ├── RulesOverlay.ts          # How-to-Play modal (188 lines)
│       │   └── UIFactory.ts             # Texture gen + UI builders (627 lines)
│       │                                  genGradientTex, genBtnTex, genPanelTex,
│       │                                  addButton, fadeToScene, genToolIcons, etc.
│       │
│       └── animation/
│           └── tweens.ts                # Reusable tweens (158 lines)
│                                          spread, kill, toolPlace, burst, win, lose
│
├── public/
│   ├── CNAME                            # biodefence.theimmersivesaga.com
│   └── assets/
│       ├── tiles/                       # 10 PNGs: empty + wall × 5 world variants
│       ├── germs/                       # 24 PNGs: 9 pathogen + 9 medicine + extras
│       └── bg/                          # 4 PNGs: world background images
│
├── tests/sim/                           # 8 test files, 122 tests
│   ├── board.test.ts                    # 20 tests — board creation, helpers, cloning
│   ├── step.test.ts                     # 53 tests — generation, birth, survival, death
│   ├── solvability.test.ts             # 17 tests — all 200 levels valid, no dupes
│   ├── objectives.test.ts              # 7 tests — each objective type
│   ├── tools.test.ts                    # 9 tests — placement validation
│   ├── metrics.test.ts                  # 4 tests — stars, scoring
│   ├── history.test.ts                  # 6 tests — undo stack
│   └── preview.test.ts                  # 6 tests — threat prediction
│
├── scripts/                             # Build tools & diagnostics
│   ├── scan-levels.ts                   # Level quality scanner
│   ├── find_strategies.ts               # Strategy finder
│   ├── generate_flux_tiles.py           # FLUX AI tile generation
│   ├── generate_tiles.py               # Tile asset generation
│   ├── generate_sprites.py             # Germ sprite generation
│   ├── generate_backgrounds.py         # Background generation
│   ├── generate_ui_assets.py           # UI asset generation
│   └── compress_assets.py              # PNG compression
│
├── android/                             # Capacitor Android project
├── ios/                                 # Capacitor iOS project
│
├── index.html                           # Entry HTML (mobile-first viewport)
├── package.json                         # Dependencies + npm scripts
├── tsconfig.json                        # TypeScript strict config
├── vite.config.ts                       # Bundler (ES2020, dist/, path aliases)
├── vitest.config.ts                     # Test runner (node env)
├── capacitor.config.ts                  # Mobile (com.biodefence.app)
└── .github/workflows/deploy.yml         # CI/CD → GitHub Pages
```

---

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:

| Alias | Maps To | Usage |
|-------|---------|-------|
| `@sim/*` | `src/sim/*` | Import sim from game layer: `import { Board } from "@sim/types"` |
| `@game/*` | `src/game/*` | Cross-game imports: `import { TILE_SIZE } from "@game/config"` |
| `@gen/*` | `src/gen/*` | Generator utilities (if split in future) |

---

## Entry Point (`src/main.ts`)

The entry point does three things:

### 1. HiDPI Text Patch

Wraps `Phaser.GameObjects.GameObjectFactory.prototype.text` to call `setResolution(TEXT_DPR)` on every created text object. `TEXT_DPR` = `Math.ceil(Math.min(devicePixelRatio, 3))` — so on a 2× retina display, all text renders at 2× resolution for crisp display even though the canvas is 400×720.

### 2. Phaser Configuration

```typescript
{
  type: Phaser.AUTO,            // WebGL preferred, Canvas fallback
  width: 400, height: 720,     // Portrait mobile aspect
  backgroundColor: "#0a0a1a",  // Deep navy
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { keyboard: true, mouse: true, touch: true },
  render: { antialias: true, pixelArt: false },
  fps: { target: 60 },
  scene: [BootScene, TitleScene, MenuScene, LevelScene, WinScene, ScoresScene]
}
```

### 3. Scene Registration

Scenes registered in order. Phaser starts the first scene (BootScene) automatically.

---

## Module Dependencies

```
types.ts ← (no deps)
constants.ts ← types.ts
board.ts ← types.ts, constants.ts
objectives.ts ← types.ts
tools.ts ← types.ts, board.ts
metrics.ts ← types.ts
history.ts ← types.ts, board.ts
preview.ts ← types.ts, constants.ts, board.ts
step.ts ← types.ts, constants.ts, board.ts, objectives.ts, metrics.ts
generator.ts ← types.ts, constants.ts, board.ts, step.ts

config.ts ← types.ts (sim)
save.ts ← (no sim deps)
UIFactory.ts ← config.ts
tweens.ts ← (no deps)
Grid.ts ← types.ts, config.ts
ToolPalette.ts ← types.ts, config.ts
StatusBar.ts ← types.ts, config.ts
TurnControls.ts ← config.ts
PreviewOverlay.ts ← types.ts, config.ts
StarDisplay.ts ← config.ts
RulesOverlay.ts ← config.ts

BootScene ← config.ts, UIFactory.ts
TitleScene ← save.ts, config.ts, UIFactory.ts
MenuScene ← generator.ts, save.ts, config.ts, UIFactory.ts
LevelScene ← step.ts, board.ts, tools.ts, history.ts, preview.ts, metrics.ts,
              Grid.ts, ToolPalette.ts, StatusBar.ts, TurnControls.ts,
              PreviewOverlay.ts, StarDisplay.ts, RulesOverlay.ts, UIFactory.ts, tweens.ts
WinScene ← save.ts, metrics.ts, config.ts, UIFactory.ts, StarDisplay.ts, tweens.ts
ScoresScene ← save.ts, generator.ts, config.ts, UIFactory.ts
```

---

## Key Design Decisions

### Why two layers?

1. **Testability** — 122 tests run in Node without JSDOM, Phaser mocks, or a canvas polyfill.
2. **Determinism** — All sim logic is pure functions over plain data. No Phaser frame callbacks, no async. This makes the seeded PRNG guarantee reproducibility.
3. **Portability** — The sim layer can be reused for a server-side validator or alternate UI without carrying Phaser as a dependency.

### Why canvas-generated textures?

Most UI textures (buttons, panels, gradients, tool icons, lock icons) are drawn at runtime using Phaser's `CanvasTexture` API. This keeps the asset payload small for mobile and avoids resolution-dependent sprite sheets.

### Why row-major flat array for tiles?

`Board.tiles` is a 1D array of length `w × h`, indexed by `y * w + x`. This gives:
- O(1) tile lookup
- Cheap deep-copy (spread or `map` over the array)
- Simple serialization (flat structure, no nested arrays)
- Compatible with typed arrays if performance profiling ever demands it

### Why seeded PRNG instead of Math.random()?

All 200 levels are generated on-the-fly from deterministic seeds. This means:
- No level data shipped in the bundle — levels are computed at boot
- Every player sees identical layouts
- Bug reports can reproduce exact levels by seed
- The dedup system can compare fingerprints across worlds and salted retries

---

## State Management Patterns

### Scene Communication

Scenes pass data via `this.scene.start("SceneName", { data })`. The receiving scene picks it up in `init(data)`. No global event bus exists — all flow is explicit.

### Game State

`GameState` is a plain TypeScript object, not a class. There is no singleton. `LevelScene` holds the current state as a local variable, and passes it to sim functions which mutate it in-place. Undo is implemented by deep-cloning before each action (`cloneState`) and pushing to a stack.

### Generation Cache

The generator uses module-level mutable caches:
- `_worldGenCache: Map<number, LevelSpec[]>` — memoizes entire worlds
- `_globalLayoutFPs: Set<string>` — cross-world fingerprint dedup

These are initialized lazily (first access) and persist for the session. This prevents re-generating worlds each time MenuScene loads.
