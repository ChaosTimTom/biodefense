# Bio Defence — Full-Stack Vibe Coding Prompt for Google AI Studio

---

## PROJECT OVERVIEW

Build **Bio Defence** — a mobile-first, turn-based cellular tactics puzzle game. Think **Into the Breach** meets **Candy Crush** inside a petri dish. The player is a microscopic immune commander placing limited medicine tools on a living tissue grid to contain and eradicate escalating infections.

**Tech stack:** Single-page web app (HTML/CSS/JS or TypeScript). Use **HTML5 Canvas** for the game board and rendering. No game engine dependency (no Phaser, no Unity) — build the rendering directly with Canvas 2D context and requestAnimationFrame. Use modern CSS for UI chrome (menus, overlays, buttons). Ship as a standalone web app.

**Target:** Mobile-first portrait layout (works beautifully on phones, scales up to desktop). Touch-first input. PWA-capable.

---

## VISUAL IDENTITY — "Neon Bioluminescence"

The current version looks like a basic prototype. The new version should feel like a **premium indie mobile game**.

### Art Direction
- **Dark mode** — deep navy/charcoal background (#0a0a1a to #0d1b2a gradient)
- **Bioluminescent color scheme** — germs and tools glow with soft neon colors against the dark background
- **Glass morphism UI** — frosted glass panels with subtle blur backgrounds for menus, overlays, and toolbars
- **Micro-animations everywhere** — nothing is static. Germs pulse, tiles breathe, particles float
- **Depth via layering** — subtle parallax, floating ambient particles (like looking through a microscope)
- **Smooth rounded corners** — all UI elements have generous border-radius (12-16px)
- **Clean typography** — use a modern geometric sans-serif (Inter, Plus Jakarta Sans, or Outfit). Bold weights for headers, regular for body.

### Color Palette

**Background & UI:**
| Element | Color | Hex |
|---------|-------|-----|
| Deep background | Near-black blue | `#0a0a1a` |
| Panel background | Dark blue glass | `#0d1b2a` at 80% opacity |
| Primary accent | Electric cyan | `#00e5ff` |
| Secondary accent | Gold | `#ffd740` |
| Success | Bright green | `#00e676` |
| Danger / lose | Warm red | `#ff5252` |
| Text primary | White | `#ffffff` |
| Text secondary | Muted blue-grey | `#8899aa` |

**Pathogen Colors (warm/dangerous feeling):**
| Pathogen | Color | Hex | Shape |
|----------|-------|-----|-------|
| Coccus (basic bacteria) | Green | `#4caf50` | Circle cluster |
| Bacillus (leaping bacteria) | Lime | `#8bc34a` | Elongated rod |
| Spirillum (L-move bacteria) | Teal | `#009688` | Spiral |
| Influenza (full knight virus) | Red | `#f44336` | Spiky sphere |
| Retrovirus (wide knight virus) | Crimson | `#c62828` | Icosahedron |
| Phage (camel-jump virus) | Deep Orange | `#ff5722` | T4 phage shape |
| Mold (diagonal fungus) | Purple | `#9c27b0` | Branching hyphae |
| Yeast (long diagonal fungus) | Lavender | `#ce93d8` | Budding ovals |
| Spore (extreme range fungus) | Deep Violet | `#4a148c` | Starburst |

**Medicine Colors (cool/healing feeling):**
| Medicine | Counters | Color | Hex |
|----------|----------|-------|-----|
| Penicillin | Coccus | Cyan | `#00e5ff` |
| Tetracycline | Bacillus | Bright Cyan | `#18ffff` |
| Streptomycin | Spirillum | Teal | `#00bfa5` |
| Tamiflu | Influenza | Lime | `#76ff03` |
| Zidovudine | Retrovirus | Lime Green | `#b2ff59` |
| Interferon | Phage | Yellow-Green | `#aeea00` |
| Fluconazole | Mold | Pink | `#ea80fc` |
| Nystatin | Yeast | Magenta | `#e040fb` |
| Amphotericin | Spore | Violet | `#d500f9` |

---

## GAME MECHANICS — COMPLETE SPECIFICATION

### The Board

- **Square grid** of tiles, rendered in the center of the screen
- Grid sizes scale by world/difficulty: **8×8** (early) → **10×10** (mid) → **12×12** (late) → **14×14** (endgame) → **16×16** (boss)
- Each tile is one of: **Empty, Wall, Pathogen, Medicine**
- Tile minimum tap target: 30px on mobile (critical for playability)

### How Germs Spread — The "Chess Piece" System

This is the core mechanic. Each pathogen type spreads in a **fixed geometric pattern** (like chess pieces), not randomly. This makes the game deterministic and readable:

**Growth Pattern Offsets (relative to the pathogen's position):**

```
BACTERIA FAMILY (Orthogonal):
  Coccus:    [+1,0], [-1,0], [0,+1], [0,-1]           — Cardinal ±1 (Rook step)
  Bacillus:  [+2,0], [-2,0], [0,+2], [0,-2]           — Cardinal ±2 (leaps over 1 cell)
  Spirillum: [+1,+2], [+1,-2], [-1,+2], [-1,-2]       — Narrow Knight (L-shape)

VIRUS FAMILY (L-Shape Jumpers):
  Influenza:  [±1,±2] and [±2,±1] — all 8 positions   — Full Knight move
  Retrovirus: [+2,+1], [+2,-1], [-2,+1], [-2,-1]      — Wide Knight (4 positions)
  Phage:      [±1,±3] and [±3,±1] — all 8 positions    — Camel jump (extreme range)

FUNGUS FAMILY (Diagonal):
  Mold:  [+1,+1], [+1,-1], [-1,+1], [-1,-1]           — Diagonal ±1 (Bishop step)
  Yeast: [+2,+2], [+2,-2], [-2,+2], [-2,-2]           — Diagonal ±2 (leaps 1 diagonal)
  Spore: [+3,+3], [+3,-3], [-3,+3], [-3,-3]           — Diagonal ±3 (extreme range)
```

### Turn Resolution — Two-Phase Simultaneous System

Each turn resolves like this:

1. **Player Phase**: Player places medicine tools from their inventory onto empty tiles, then clicks "End Turn"
2. **Simulation Phase** (animated): All cells resolve simultaneously from a snapshot:
   - **Birth**: An empty tile becomes a pathogen if at least 1 pathogen of that type has this tile in its growth pattern (i.e., the empty tile is within reach of an existing pathogen)
   - **Dead Zone**: If BOTH a pathogen AND a medicine want to claim the same empty tile → tile stays empty (this is the core blocking mechanic)
   - **Survival**: A living cell survives if at least 1 same-type ally is visible in its growth directions
   - **Overwhelm Kill**: A pathogen dies if ≥N of its growth-direction neighbors are its counter-medicine (N=2 for 4-direction pathogens, N=3 for 8-direction pathogens)
   - **Containment Kill**: A pathogen dies if ALL of its growth directions are blocked (walls, edges, or enemy medicine)

### Medicine Tools

Each medicine mirrors its target pathogen's growth pattern. Medicines spread the same way pathogens do. The player places a medicine cell on an empty tile, and it propagates using the same geometry.

**Plus: Wall** — a universal quarantine barrier that blocks ALL spread and cannot be crossed.

### Tool Economy (Per-Turn Grants)

The player does NOT get all tools upfront. They receive a budget of tools each turn:
- `toolsPerTurn`: How many tools received each turn (added to inventory)
- `placementsPerTurn`: Max placements allowed in a single turn
- `turnLimit`: Total turns available

This forces the player to **interact every turn** — germs grow between your turns, and you must respond adaptively.

### Objectives (3 Types)

| Objective | Win Condition |
|-----------|--------------|
| **Clear All** | Remove every pathogen from the board |
| **Contain** | Keep infection ≤ X% by turn T |
| **Survive** | Reach turn T without infection exceeding the loss threshold |

Loss condition: infection reaches 50% of the board.

### Scoring & Stars

Every level awards 1-3 stars:
- ⭐ 1 Star: Completed the objective
- ⭐⭐ 2 Stars: Completed within par turns
- ⭐⭐⭐ 3 Stars: Completed within par turns AND with unused tools remaining

Score = base 1000 + bonuses for speed, efficiency, and infection control. Stars unlock later worlds.

---

## WORLD STRUCTURE — 4 WORLDS × 50 LEVELS = 200 LEVELS

### World 1: "Petri Dish" 🧫
- **Visual theme**: Clean laboratory, agar plate, pale green gradient, glass petri dish aesthetic
- **Grid sizes**: 8×8 → 14×14
- **Pathogens**: Coccus (L1-10), + Mold (L11-20), + Bacillus (L21-50)
- **Tools**: Penicillin, Fluconazole, Tetracycline, Wall
- **Stars to unlock**: 0 (always available)

### World 2: "Bloodstream" 🩸
- **Visual theme**: Blood vessels, red corpuscles, deep crimson gradient, capillary structures
- **Grid sizes**: 10×10 → 16×16
- **Pathogens**: Influenza (L1-10), + Coccus (L11-20), + Retrovirus (L21-50)
- **Tools**: Tamiflu, Penicillin, Zidovudine, Wall
- **Stars to unlock**: 40

### World 3: "Tissue" 🔬
- **Visual theme**: Dense cellular tissue, purple-violet gradient, organic membranes, maze-like
- **Grid sizes**: 10×10 → 16×16
- **Pathogens**: Yeast (L1-10), + Spirillum (L11-20), + Retrovirus (L21-50)
- **Tools**: Nystatin, Streptomycin, Zidovudine, Wall
- **Stars to unlock**: 100

### World 4: "Pandemic" ☣️
- **Visual theme**: Full outbreak, orange-red gradient, biohazard symbols, quarantine zone
- **Grid sizes**: 12×12 → 18×18
- **Pathogens**: Phage (L1-10), + Spore (L11-18), + Spirillum (L19-30), + Bacillus (L31-50)
- **Tools**: Interferon, Amphotericin, Streptomycin, Tetracycline, Wall
- **Stars to unlock**: 180

### Level Progression Per World
- **L1-3**: Tutorial — one germ type, generous tools, easy win
- **L4-10**: Learning — single type, interior walls, multiple turns required
- **L11-18**: Intermediate — introduce 2nd germ, tighter tool budgets
- **L19-24**: Advanced — complex combos, multiple fronts
- **L25-35**: Peak difficulty ramp
- **L36-49**: Endgame mastery with difficulty wave pattern (breathe, then challenge)
- **L50**: Boss level — largest grid, all world germs active, tight constraints

### Difficulty Wave Pattern
Within each world, difficulty follows a **wave, not a line** — hard levels are followed by easier "breather" levels. This is the Candy Crush retention secret.

---

## PROCEDURAL LEVEL GENERATION — CRITICAL SYSTEM

All 200 levels are procedurally generated, not hand-crafted. The generator must:

1. **Use seeded RNG** (Mulberry32 or similar) — same seed = same level always
2. **Pick a wall template** from 14 options based on world and difficulty tier
3. **Carve the wall layout** using the template (ensure no fully enclosed areas)
4. **Place pathogen seeds** in high-growth open zones (1-3 clusters)
5. **Assign tool inventory** scaled to difficulty
6. **Validate via simulation**: run the level with zero player actions — if pathogens can't reach the infection threshold, the level is trivially easy → regenerate
7. **Set the objective** based on level number

### 14 Wall Templates
1. **Open** — No interior walls
2. **Pillars** — Scattered 1×1 and 2×2 blocks (3-6 pillars)
3. **Divider** — Horizontal or vertical wall line with 2 gaps
4. **Cross** — Plus-shaped wall creating 4 quadrants
5. **Corridors** — 1-2 lane strips with gaps
6. **L-Wall** — L-shaped wall
7. **Vein** — Organic blood-vessel-like meandering channels
8. **Chamber** — 3-4 rectangular rooms connected by doorways
9. **Maze** — Dense wall network with narrow 1-2 cell passages
10. **Honeycomb** — Hexagonal-ish repeating wall pattern
11. **Compound** — Multiple sub-regions connected by narrow bridges
12. **Gateway** — Two parallel walls with offset doorways
13. **Island** — Central doughnut-shaped wall formation
14. **AsymSplit** — Diagonal asymmetric divide

### Template Selection by World
- **World 1**: Open, Pillars, Divider, Cross, Corridors
- **World 2**: Corridors, Vein, Chamber, Pillars, Gateway
- **World 3**: Maze, Cross, L-Wall, Honeycomb, Island
- **World 4**: All templates mixed, including Compound, AsymSplit

---

## SCREEN-BY-SCREEN UI SPECIFICATION

### Screen 1: Title Screen

```
┌─────────────────────────────────┐
│                                 │
│     (floating bio particles)    │
│                                 │
│          🧬                     │  ← Animated DNA emoji, gentle bob
│                                 │
│       BIO DEFENCE               │  ← Large title, electric cyan, subtle glow pulse
│   TACTICAL CELLULAR DEFENCE     │  ← Tagline, muted grey, smaller font
│                                 │
│     ★ 127  |  📊 43,500        │  ← Stats (if returning player): stars & score
│                                 │
│      ┌──────────────────┐       │
│      │     ▶  PLAY      │       │  ← Primary button: cyan gradient, rounded
│      └──────────────────┘       │
│      ┌──────────────────┐       │
│      │  🏆 HIGH SCORES  │       │  ← Secondary button: outlined
│      └──────────────────┘       │
│      ┌──────────────────┐       │
│      │    ?  HOW TO PLAY│       │  ← Tertiary button
│      └──────────────────┘       │
│                                 │
│          v6.0                   │  ← Version, tiny, bottom
└─────────────────────────────────┘
```

**Animations**: Floating ambient particles (small circles, slow drift), DNA emoji bobs up/down, title has subtle glow pulse (2s cycle), buttons have hover lift effect.

### Screen 2: World/Level Select

```
┌─────────────────────────────────┐
│  ◀ Back              ★ 127     │  ← Header with total star count
├─────────────────────────────────┤
│  [🧫 Petri] [🩸 Blood] [🔬] [☣]│ ← World tabs (colored, active has underline)
├─────────────────────────────────┤
│                                 │
│  World 1: Petri Dish            │  ← World name, themed color
│  ★ 87 / 150                    │  ← Star progress
│                                 │
│  ┌────┐ ┌────┐ ┌────┐          │
│  │ 1  │ │ 2  │ │ 3  │          │  ← Level buttons (3 per row)
│  │★★★ │ │★★☆ │ │★☆☆ │          │     Stars shown below number
│  └────┘ └────┘ └────┘          │
│  ┌────┐ ┌────┐ ┌────┐          │
│  │ 4  │ │ 5  │ │ 6  │          │
│  │★★★ │ │    │ │ 🔒 │          │     Locked levels show lock icon
│  └────┘ └────┘ └────┘          │
│  ... (scrollable)               │
│                                 │
└─────────────────────────────────┘
```

**Animations**: World tabs slide in from top. Level buttons pop in sequentially (stagger 30ms each). Locked levels are dimmed. Stars are gold (#ffd740).

### Screen 3: Gameplay (Main Level)

```
┌─────────────────────────────────┐
│  ◀     Level 37 — Petri    ⚙ ? │  ← Header: back, level info, settings, rules
│          ★ ★ ☆                 │  ← Star target
├─────────────────────────────────┤
│                                 │
│    ┌───┬───┬───┬───┬───┬───┐   │
│    │   │ 🟢│   │   │   │   │   │
│    ├───┼───┼───┼───┼───┼───┤   │
│    │   │   │░░░│   │ 🔴│   │   │  ← Grid: germs, walls (grey), empty, medicine
│    ├───┼───┼───┼───┼───┼───┤   │
│    │   │   │   │░░░│   │   │   │     Ghost overlays show next-turn preview
│    ├───┼───┼───┼───┼───┼───┤   │
│    │   │   │   │   │   │ 🟡│   │
│    └───┴───┴───┴───┴───┴───┘   │
│                                 │
│  Turn: 3/10     Inf: ████░ 23% │  ← Status: turn counter + infection bar
│  📋 Clear all pathogens        │  ← Objective text
├─────────────────────────────────┤
│  [💊×3] [🧱×2] [💉×1] [🛡×1]  │  ← Tool palette (horizontal, scrollable)
├─────────────────────────────────┤
│    [↩ UNDO]    [▶ END TURN]    │  ← Action buttons
└─────────────────────────────────┘
```

**Critical gameplay animations:**
| Event | Animation | Duration |
|-------|-----------|----------|
| Germ spreads | New tile scales from 0→1 with overshoot bounce | 200ms |
| Germ killed by overwhelm | Pop + particle burst outward | 250ms |
| Tool/medicine placed | Drop-in from above with bounce | 150ms |
| Wall placed | Solid fade-in | 200ms |
| Dead zone flash | Brief white flash on contested empty tile | 100ms |
| Win | All germs dissolve outward, confetti particles, stars fly in | 1200ms |
| Lose | Board dims, red overlay pulse, "OUTBREAK" text | 800ms |

**Next-Turn Preview System** (critical UX):
- Before committing, show **ghost overlays** (semi-transparent germ colors) on every tile that will be infected next turn
- When hovering a tool over a tile, show the improved outcome vs. doing nothing
- Ghost tiles are 30% opacity versions of the germ color
- This gives the player **perfect information** — the puzzle is planning, not guessing

### Screen 4: Victory Screen

```
┌─────────────────────────────────┐
│                                 │
│     ✨ LEVEL COMPLETE! ✨       │  ← Animated banner, confetti particles
│                                 │
│     Level 37 — Petri Dish       │
│                                 │
│         ★ ★ ☆                  │  ← Stars pop in one at a time (400ms stagger)
│                                 │
│     SCORE: 2,350               │  ← Counter animation from 0 → final
│     ⚡ Speed Bonus ×1.5        │
│                                 │
│      ┌──────────────────┐       │
│      │  ▶ NEXT LEVEL    │       │  ← Primary: cyan
│      └──────────────────┘       │
│      ┌──────────────────┐       │
│      │  ↻ RETRY         │       │  ← Get a better score
│      └──────────────────┘       │
│      ┌──────────────────┐       │
│      │  🏠 MENU         │       │  ← Back to level select
│      └──────────────────┘       │
│                                 │
└─────────────────────────────────┘
```

### Screen 5: High Scores

```
┌─────────────────────────────────┐
│  ◀ Back        HIGH SCORES      │
├─────────────────────────────────┤
│                                 │
│     TOTAL SCORE: 43,500        │  ← Large gold number
│     ★ 127 Stars | 43 Levels   │
│                                 │
├─────────────────────────────────┤
│  Level                  Score   │
│  ──────────────────────────────│
│  W1-L1  Petri Dish    ★★★ 2350│  ← Scrollable list
│  W1-L2  Petri Dish    ★★☆ 1800│
│  W1-L3  Petri Dish    ★☆☆  950│
│  ...                            │
└─────────────────────────────────┘
```

---

## RESPONSIVE DESIGN REQUIREMENTS

- **Primary target**: Portrait phone (375×667 to 430×932)
- **Virtual canvas**: 400×720 base, scale with CSS to fill viewport while maintaining aspect ratio
- **Touch targets**: Minimum 44px for buttons, minimum 30px for grid tiles
- **Grid scaling**: Tile size = `min(56, floor(availableHeight / rows), floor(availableWidth / cols))`
- **Safe areas**: Respect `env(safe-area-inset-*)` for notched phones
- **Desktop**: Center the game canvas at max 400px width (phone-like experience)

---

## SAVE SYSTEM

- **localStorage** key: `bio_defence_save`
- Save structure:
```json
{
  "version": 1,
  "stars": { "w1_l1": 3, "w1_l2": 2, ... },
  "scores": { "w1_l1": 2350, "w1_l2": 1800, ... },
  "playerName": "Player",
  "playerId": "uuid-v4"
}
```
- Auto-save after every level completion
- World unlock logic: sum all stars, compare to world threshold (0, 40, 100, 180)

---

## WHAT MAKES THIS GAME SPECIAL

1. **Deterministic chess-like tactics** — No randomness. Every germ has a fixed geometric spread pattern. The player can always predict exactly what will happen next turn.

2. **The "Dead Zone" blocking mechanic** — When a pathogen and a medicine both want to claim the same empty tile, neither gets it. This creates invisible walls of conflict that the player must strategically engineer.

3. **Mirror-match medicine** — Each medicine spreads using the EXACT same pattern as the pathogen it counters. To kill a knight-jumping virus, you need a knight-jumping medicine. Symmetry creates elegance.

4. **Per-turn tool economy** — You don't dump all your tools on turn 1. You get a budget each turn and must react to how the board evolves. Every turn is a meaningful decision.

5. **200 procedurally generated levels** — Real variety, not copy-paste. Seeded RNG ensures levels are deterministic but each one feels unique.

6. **"One more level" pacing** — Short levels (30-90 seconds of thinking), satisfying clear animations, star chase, wave difficulty pattern with breathers after hard levels.

---

## IMPLEMENTATION PRIORITIES

Build in this order:

1. **Core rendering** — Canvas grid, tile drawing, responsive layout
2. **Simulation engine** — Board state, pathogen spread, dead zones, overwhelm kills
3. **Player input** — Tool selection, grid placement, end turn, undo
4. **Level generation** — Seeded RNG, wall templates, pathogen seeding, validation
5. **Progression** — 4 worlds, 50 levels each, star gating, save/load
6. **Juice** — Animations, particles, transitions, screen shake, glow effects
7. **Menus** — Title, level select, victory, scores
8. **Polish** — Sound effects, haptic feedback, accessibility

---

## KEY DESIGN PRINCIPLES

- **Show, don't tell** — Levels 1-5 ARE the tutorial. No text walls.
- **Perfect information** — The next-turn preview shows exactly what will happen. No hidden state.
- **Calm but cerebral** — No time pressure, no frantically clicking. Soft visuals, ambient feel, deep thinking.
- **Chess-like clarity** — Every rule is visible. Every outcome is predictable.
- **Minimal UI, maximum board** — The grid is the star. UI chrome is minimal and semi-transparent.
- **Juice on every action** — Every tap, every spread, every kill has satisfying visual and audio feedback.

---

## THINGS THE CURRENT VERSION GETS WRONG (FIX THESE)

1. **Uses Phaser 3 game engine** — This adds huge bundle size for a tile-based game. Raw Canvas 2D is sufficient and much lighter.
2. **Prototype-quality visuals** — Functional but ugly. Needs glassmorphism, glow effects, proper shadows, polished buttons.
3. **No sound** — Sound is 40% of game feel. Add satisfying click, pop, chime sounds.
4. **Too many tiny tiles on mobile** — 55% of levels have tiles below the comfortable tap target. Cap grid sizes better or add pinch-to-zoom.
5. **Level select is cramped** — Needs bigger touch targets, smoother scrolling, world tab switching.
6. **No onboarding flow** — First level should be dead simple with implicit tutorial guidance.
7. **Animations are basic** — Needs particle effects, screen shake, chain-reaction cascades, victory confetti.
8. **No haptic feedback** — On mobile, add vibration on tool placement and turn resolution.

---

## SUMMARY

Build a beautiful, polished, mobile-first turn-based puzzle game where 9 types of germs spread across a grid in chess-piece patterns, and the player places 9 types of matching medicines to block and overwhelm them. 200 procedurally generated levels across 4 themed worlds. Glassmorphism dark UI with bioluminescent neon germ colors. Smooth animations, satisfying sound effects, and a "one more level" addictive loop. Every decision matters, every outcome is predictable, and the difficulty ramps in waves.
