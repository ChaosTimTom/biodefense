# UI, Scenes & Visual System

> Scenes in `src/game/scenes/` · UI components in `src/game/ui/`  
> Visual config in `src/game/config.ts` (298 lines)  
> Texture/UI builders in `src/game/ui/UIFactory.ts` (627 lines)  
> Animations in `src/game/animation/tweens.ts` (158 lines)

---

## Scene Flow

```
              ┌──────────┐
              │ BootScene │  (asset loading)
              └─────┬─────┘
                    ↓
             ┌────────────┐
             │ TitleScene  │  (main menu)
             └──┬───┬───┬──┘
                │   │   │
      ┌─────────┘   │   └──────────┐
      ↓             ↓              ↓
┌───────────┐ ┌───────────┐  ┌────────────┐
│ MenuScene  │ │ScoresScene│  │ MenuScene   │
│ (world/   │ │           │  │(autoStart   │
│  level    │ └───────────┘  │ level 1 +   │
│  select)  │                │ show rules) │
└─────┬─────┘                └──────┬──────┘
      ↓                             ↓
┌────────────┐              ┌────────────┐
│ LevelScene │◄─────────────│ LevelScene │
│  (gameplay)│              │            │
└──┬──────┬──┘              └────────────┘
   │      │
   ↓      ↓
┌──────┐ ┌───────────┐
│ LOSE │ │  WinScene  │
│(over-│ │  (stars,   │
│ lay) │ │   score)   │
└──┬───┘ └──┬──┬──┬───┘
   │        │  │  └→ ScoresScene
   │        │  └→ Replay (same level)
   │        └→ Next Level → MenuScene → LevelScene
   └→ Retry / Menu
```

Scenes communicate via `this.scene.start("SceneName", data)`. The receiving scene picks up `data` in its `init(data)` method.

---

## BootScene

**Purpose:** Load all assets, wait for fonts, generate runtime textures.

### Preload Phase

1. **Canvas boot background** — generated gradient texture
2. **Font loading** — Orbitron (400/700/900) via Google Fonts stylesheet
3. **Progress bar** — Phaser's `load.on("progress")` updates a drawn rectangle
4. **Logo text** — "BIO DEFENCE" displayed during load

### Asset Loading

| Category | Files | Key Pattern |
|----------|-------|-------------|
| Tile PNGs | `tile_empty.png`, `tile_wall.png`, `tile_empty_w1..w4.png`, `tile_wall_w1..w4.png` | `tile_empty`, `tile_wall`, `tile_empty_w1`, etc. |
| Pathogen PNGs | `coccus.png`, `bacillus.png`, ... (9 files) | `coccus`, `bacillus`, etc. |
| Medicine PNGs | `penicillin.png`, `tetracycline.png`, ... (9 files) | `penicillin`, `tetracycline`, etc. |
| Background PNGs | `world_1_petri.png` ... `world_4_pandemic.png` | `world_bg_1` ... `world_bg_4` |
| Category PNGs | `bacteria.png`, `virus.png`, `fungus.png` | `bacteria`, `virus`, `fungus` |

### Create Phase

1. `genToolIcons(scene)` — draws canvas-based vector icons for all 10 tools (9 medicines + wall), each in normal and selected variants. Keys: `tool_penicillin`, `tool_penicillin_sel`, etc.
2. `genLockIcon(scene)` — draws a padlock icon for locked levels. Key: `lock_icon`.
3. Creates 1×1 white pixel texture (`pixel`) used for rectangles and bars.
4. Font-ready check → `fadeToScene("Title")`

---

## TitleScene

**Purpose:** Main entry screen with game stats and navigation.

### Visual Elements

- **Background:** Gradient texture from UIFactory + bio-particle emitters (floating circles)
- **Floating DNA icon:** "🧬" text with a bobbing tween (y oscillation)
- **Title:** "BIO DEFENCE" in Orbitron 900, gold (#FFD700), with slow alpha pulse tween
- **Tagline:** "TACTICAL CELLULAR DEFENCE" in smaller muted text
- **Stats panel** (only shown if levels completed):
  - Total stars (with ★ icon)
  - Total score
  - Levels completed count

### Buttons

| Button | Style | Target |
|--------|-------|--------|
| **PLAY** | Primary (cyan) | MenuScene |
| **HIGH SCORES** | Secondary (gray) | ScoresScene |
| **HOW TO PLAY** | Gold | MenuScene `{ autoStartLevel: 1 }` (starts level 1 with rules overlay) |

---

## MenuScene

**Purpose:** World selection and level picking. **341 lines.**

### World Tabs

4 horizontal tabs across the top, one per world. Each shows:
- World name + ★ icon
- Locked state if player hasn't earned enough total stars

Star thresholds:

| World | Stars Needed |
|-------|-------------|
| 1 — Petri Dish | 0 |
| 2 — Bloodstream | 40 |
| 3 — Tissue | 100 |
| 4 — Pandemic | 180 |

### Level Grid

5 columns × 5 rows = 25 levels per page, 2 pages per world (50 levels).

Each level cell is a circular button:
- **Gold circle** — 3 stars earned (mastered)
- **Blue circle** — unlocked, has been attempted or is available
- **Dark circle + lock** — locked (previous level not yet cleared)

Below each circle:
- 1-3 star icons (filled/empty)
- Best score (if completed)

### Level Unlock Logic

- Level 1 is always unlocked (if world is unlocked)
- Level N+1 unlocks when level N has ≥ 1 star
- Levels within a locked world are all inaccessible

### Page Navigation

Previous / Next arrows appear when the world has more than 25 levels (always, since each world has 50).

### Launch

Clicking an unlocked level: `this.scene.start("Level", { levelSpec: generatedSpec })`.

---

## LevelScene (Main Gameplay)

**Purpose:** Core gameplay. **761 lines.** The largest and most complex scene.

### Layout

Computed by `computeLayout(400, 720, gridCols, gridRows)` → `LayoutZones`:

```
┌─────────────────────────┐ y=0
│       Header (80px)     │   Level title, stars, back button
├─────────────────────────┤
│                         │
│       Grid Area         │   Responsive tile grid
│       (dynamic height)  │   Sized to fit available space
│                         │
├─────────────────────────┤
│    Status Bar (52px)    │   Turn counter, infection bar, objective
├─────────────────────────┤
│   Tool Palette (56px)   │   Horizontal tool buttons
├─────────────────────────┤
│   Turn Controls (48px)  │   Undo / Step / Reset
└─────────────────────────┘ y=720
```

`TILE_SIZE` starts at 56 and shrinks as needed to fit larger grids (up to 18×18).

### State Variables

```typescript
private gameState: GameState;
private history: History;
private levelSpec: LevelSpec;
private initialState: GameState;     // for reset
private selectedTool: ToolId | null;
private switchMode: boolean;
private switchSource: {x,y} | null;
private previewVisible: boolean;
private animating: boolean;          // locks input during generation animation
```

### Tool Placement Flow

1. Player selects a tool from the ToolPalette (or clicks an already-selected tool to deselect)
2. Grid cells show placement hints (green = valid, red = invalid)
3. Player clicks a valid empty cell → `applyAction(state, { type: "place_tool", ... })`
4. Grid re-renders, StatusBar updates
5. If tool depleted → auto-deselect and cycle to next available
6. Floating hint text appears briefly ("Placed Penicillin!")

### Switch Mode Flow

1. Player presses S key or clicks Switch button → `switchMode = true`
2. Status text updates to "Select medicine or wall to move"
3. Player clicks a cell with medicine or wall → `switchSource` set, cell highlighted cyan
4. Status text updates to "Select empty cell to swap with"
5. Player clicks an empty cell → `applyAction(state, { type: "switch", ... })`
6. Switch mode exits automatically after one swap

### Animated Turn Stepping

When the player clicks Step (or presses Space):

```
1. pushHistory(history, cloneState(state))
2. state.turn++; reset counters; apply toolGrant
3. animateGenerations(genIndex = 0):
   a. Show "Gen {n}/{total}" badge text
   b. runGeneration(state.board)
   c. Grid.render(state.board) with tweened sprites
   d. Flash overlay (brief white alpha pulse)
   e. After ANIM.genTick ms → animateGenerations(genIndex + 1)
4. After all gens: phaseEvaluate(state)
5. checkGameEnd():
   - Win: tweenWinBurst() → show stars → transition to WinScene
   - Lose: tweenLoseShake() → show Game Over overlay
```

During animation, `animating = true` locks all player input.

### Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| **Space** | Step (advance turn) | Anytime not animating |
| **Z** | Undo last turn | When history exists |
| **R** | Reset level | Always |
| **P** | Toggle preview overlay | Always |
| **S** | Toggle switch mode | When switches available |
| **ESC** | Cancel switch mode / deselect tool | When in switch or tool selected |
| **H** | Toggle rules overlay | Always |

### Game Over Overlay

On loss: dark semi-transparent overlay with:
- "Infection Won" header
- **Retry** button → reset and replay
- **Menu** button → back to MenuScene

---

## WinScene

**Purpose:** Celebrate victory, save progress, offer navigation.

### Data Received

```typescript
{ levelSpec, stars, score, turnsUsed, toolsRemaining, peakInfectionPct }
```

### Sequence

1. Call `updateLevelResult(levelId, stars, score)` to persist best
2. "LEVEL COMPLETE!" banner text
3. Animated star display — stars pop in sequentially (scale tween with 300ms stagger)
4. Score counter — tweens from 0 → final score over 1200ms (Cubic.easeOut)
5. Stats panel: "Turns: X/Y" + par bonus text
6. Star-based message:
   - 3★ → "PERFECT! All germs eliminated!"
   - 2★ → "Great work! Cleared on the final turn!"
   - 1★ → "Good job! Area contained."

### Buttons

| Button | Style | Action |
|--------|-------|--------|
| **Next Level** | Primary | Start next level (generates next spec) |
| **Replay** | Secondary | Replay same level |
| **High Scores** | Gold | ScoresScene |
| **Menu** | Secondary | MenuScene |

---

## ScoresScene

**Purpose:** Detailed score breakdown. **344 lines.**

### Layout

- **Hero score** — Large gold total score at top
- **Stat cards row** — 3 cards: Total ★, Levels completed, Highest level reached
- **Best level highlight** — "Best: Level X" with score
- **Per-world breakdown** — Table with world name, levels completed (N/50), world total score
- **Scrollable level list** — Every completed level with star rating and individual score
- **Back button** → TitleScene

---

## UI Components

### Grid (`Grid.ts`, 391 lines)

Two-layer rendering inside a `Phaser.GameObjects.Container`:

**Layer 1 — Tile Backgrounds (`tileGraphics`):**
- World-themed tile PNGs: `tile_empty_w{worldId}`, `tile_wall_w{worldId}`
- Falls back to `tile_empty` / `tile_wall` if themed texture missing
- Falls back to filled rectangle with `TILE_BG` fallback colors if PNG missing

**Layer 2 — Entity Sprites (`entityLayer`):**
- Pathogen/medicine PNGs sized to `tileSize × 0.75` (slightly inset)
- Falls back to procedural shapes if PNG missing:
  - `circle` — filled arc
  - `rod` — rounded rectangle (tall aspect)
  - `spiral` — Archimedean spiral with arc segments
  - `spike` — pointed star with spikes
  - `diamond` — rotated rectangle
  - `branch` — branching tree lines
  - `starburst` — radial lines from center
  - `icosa` — icosahedral outline
  - `phage_t4` — T4 bacteriophage shape (head + tail + legs)

**Hit Zones:**
Invisible `Phaser.GameObjects.Rectangle` per cell, sized to `tileSize`, handling:
- `pointerdown` → placement or selection
- `pointerover` → highlight / placement hint
- `pointerout` → clear highlight

**Re-render cycle:** `render(board)` destroys all bg sprites and entity sprites, then redraws from scratch. Efficient because Phaser object creation is fast at these grid sizes (max 18×18 = 324 cells).

### ToolPalette (`ToolPalette.ts`, 251 lines)

Horizontal row of tool buttons:
- **Button size:** 56×48 with 6px gap, 8px corner radius
- **Dynamic visibility:** Only shows tools with `count > 0`
- **Selection state:** Cyan outline + glow background + swapped to `_sel` texture variant
- **Depleted state:** 30% alpha, not interactive
- **Count text:** Number below the icon, updates on `render(tools)`
- **Tooltip:** On hover, shows tool name and description as floating text

Auto-repositions when tool visibility changes (tools appearing/disappearing based on inventory).

### StatusBar (`StatusBar.ts`, 136 lines)

Three-row fixed layout:

**Row 1 — Turn & Actions:**
- Left: "Turn X / Y" (current turn vs limit)
- Right: "2/3 actions" or "▶ Step" (when all actions used)

**Row 2 — Infection Bar:**
- Full-width colored bar, fills proportional to infection %
- Color gradient: green (#44ff44) → yellow (#ffaa00) at 25% → red (#ff4444) at 60%
- Numeric percentage text overlaid

**Row 3 — Objective Hint:**
- Context-specific text: "Keep infection below 35% for 12 turns"
- Updates on state change

### TurnControls (`TurnControls.ts`, 164 lines)

Three 80×44 buttons in a centered row:

| Button | Color | Icon | Action |
|--------|-------|------|--------|
| ↩ Undo | Muted gray | Arrow sprite / "↩" text | `popHistory → restore state` |
| ▶ Step | Cyan | Play sprite / "▶" text | `advanceTurn` |
| ⟳ Reset | Red | Reset sprite / "⟳" text | `restore initialState` |

- Undo disabled (dimmed) when history is empty
- All disabled during animation
- Hover: darken background

### PreviewOverlay (`PreviewOverlay.ts`, 80 lines)

Semi-transparent red ghost tiles over empty cells where pathogens would birth next turn:
- Uses `previewSpreadTargets(state)` from sim layer
- Each threatened cell gets a red rectangle at ~30% alpha
- Small "!" warning dot in corner of each threat cell
- Toggleable via P key or Preview button
- Updates after every state change

### StarDisplay (`StarDisplay.ts`, 77 lines)

3-star rating display using `Phaser.GameObjects.Graphics`:
- 5-pointed star polygons drawn via `drawStar()` utility
- Empty state: dark gray outline, 50% alpha
- Filled state: gold (#FFD700) fill + brighter halo
- Animation: sequential pop-in with scale bounce, 300ms between each star

### RulesOverlay (`RulesOverlay.ts`, 188 lines)

Full-screen darkened modal:
- Semi-transparent black background (0.85 alpha)
- Scrollable text content covering:
  - Game goal (contain infection)
  - Growth patterns explanation (chess-piece metaphor)
  - Dead zone mechanic
  - Death types (isolation, overwhelm, suffocation)
  - Tool placement and type matching
  - Strategy tips
  - Keyboard controls
- "Got it!" dismiss button
- **Auto-shows** on first play (tracked via `localStorage` key `bio_defence_rules_seen`)
- Toggleable via H key afterwards

---

## UIFactory (`UIFactory.ts`, 627 lines)

Centralized texture generation and high-level UI builders:

### Texture Generators

| Function | Creates |
|----------|---------|
| `genGradientTex(scene, key, w, h, stops)` | Vertical gradient CanvasTexture |
| `genBtnTex(scene, key, w, h, color, radius)` | Rounded rectangle button background |
| `genPanelTex(scene, key, w, h, color, alpha)` | Semi-transparent panel background |
| `genCircleTex(scene, key, r, color)` | Filled circle texture |
| `genVignette(scene, key, w, h)` | Dark-edged vignette overlay |

### Button Builder

```typescript
addButton(scene, x, y, label, callback, options?)
```

Options include: `width`, `height`, `style` (primary/gold/danger/secondary/success), `fontSize`, `fontFamily`, `textColor`.

5 button styles with predefined colors:
- **primary:** Cyan (#00D4FF background)
- **gold:** Gold (#FFD700)
- **danger:** Red (#FF4444)
- **secondary:** Gray (#444466)
- **success:** Green (#44FF44)

Returns the button group (background image + text + interactive zone).

### Background Builders

- `addBackground(scene, variant?)` — gradient background texture
- `addWorldBackground(scene, worldId)` — loads world-themed PNG (`world_bg_1` etc.) + dark vignette overlay
- `addBioParticles(scene, count?)` — floating semi-transparent circle emitters for ambient motion

### Tool Icon Generator

`genToolIcons(scene)` draws canvas-based vector icons for each tool:
- Each medicine gets a unique symbol (crosses, pills, syringes, hexagons, stars, etc.)
- Wall tool gets a brick pattern
- Two variants per tool: normal + selected (selected has cyan tint/glow)
- Generated as `CanvasTexture` objects

### Other Utilities

- `fadeIn(scene, duration?)` — alpha tween from 0→1 on a full-screen overlay
- `fadeToScene(scene, target, data?)` — fade out → start next scene
- `drawStar(gfx, cx, cy, outerR, innerR, color, alpha, outlineColor?)` — 5-pointed star polygon
- `genLockIcon(scene)` — padlock icon for locked menu items

---

## Animation Tweens (`tweens.ts`, 158 lines)

Reusable tween functions, all taking a `scene` and target(s):

| Tween | Duration | Visual Effect | Used For |
|-------|----------|---------------|----------|
| `tweenSpread(scene, sprite)` | 200ms | Scale 0→1 with overshoot bounce | New birth tiles appearing |
| `tweenKill(scene, sprite)` | 250ms | Shrink + fade to 0, then destroy | Tile death (isolation, overwhelm, etc.) |
| `tweenToolPlace(scene, sprite)` | 150ms | Brief brightness flash pulse | Medicine/wall placement confirmation |
| `tweenVirusBurst(scene, x, y)` | 400ms | Expanding ring emanating from point | Pathogen elimination by medicine |
| `tweenWinBurst(scene)` | 1200ms | Particle emitter shower of sparkle circles | Victory celebration |
| `tweenLoseShake(scene)` | 800ms | Camera horizontal shake | Defeat/overrun feedback |

All tweens are fire-and-forget (they clean up after completion). Used by `LevelScene` during animated generation stepping and game-end sequences.

---

## Responsive Layout (`computeLayout`)

```typescript
function computeLayout(canvasW: number, canvasH: number, gridCols: number, gridRows: number): LayoutZones
```

Computes pixel positions and sizes for every UI zone given canvas dimensions and grid size:

```typescript
interface LayoutZones {
  tileSize: number;          // actual tile pixel size (≤ 56, shrinks for large grids)
  gridX: number;             // grid container X offset (centered)
  gridY: number;             // grid container Y offset (below header)
  gridW: number;             // grid pixel width
  gridH: number;             // grid pixel height
  statusY: number;           // status bar Y
  paletteY: number;          // tool palette Y
  controlsY: number;         // turn controls Y
  headerH: number;           // 80px
  statusH: number;           // 52px
  paletteH: number;          // 56px
  controlsH: number;         // 48px
}
```

Fixed zone heights:
- Header: 80px (title, back button, star count)
- StatusBar: 52px
- ToolPalette: 56px
- TurnControls: 48px
- **Grid: remaining vertical space**, tile size auto-computed to fit

Grid centering: `gridX = (canvasW - gridW) / 2` for horizontal centering. Vertical position starts after header. `GRID_PADDING = 16` margins on all sides.
