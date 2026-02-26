# Bio Defence — Refined Game Plan

## The Elevator Pitch

**Bio Defence** is a turn-based cellular tactics puzzle game where you're a microscopic immune commander placing limited interventions on a living tissue grid to contain, reverse, and eradicate escalating infections. Think **Into the Breach** meets **Candy Crush** inside a petri dish — calm, readable, deeply tactical, and endlessly replayable.

Every level is a solvable puzzle with a discoverable insight. Every mechanic interacts with every other. The difficulty ramp introduces one concept at a time then recombines them into increasingly devious scenarios — all procedurally generated and solver-validated so 100+ levels are produced by code, not by hand.

---

## What Changed From the Original Plan (and Why)

| Area | Original | Refined | Why |
|------|----------|---------|-----|
| Content depth | 3 germs, 3 tools | **7 germs, 8 tools, 6 env tiles** | 3+3 can't sustain 100 levels without repetition |
| Interactions | Strength-based conversion only | **Rock-paper-scissors affinity + chain reactions + combo bonuses** | Creates "aha" moments — the soul of a puzzle game |
| Evolution | Mentioned in brainstorm, absent from build guide | **Full mutation system**: overtreatment punishes, undertreatment escalates | This was the most exciting idea and it was dropped |
| Scoring | None | **3-star system** (turns, tools remaining, infection peak) | Drives replayability and lets casuals pass while rewarding mastery |
| Boss levels | Mentioned but undesigned | **Every 20th level is a boss** with phases and unique mechanics | Pacing — gives the player milestone moments |
| Environment | Flat grid only | **6 environmental tile types** that modify germ/tool behavior | Adds spatial reasoning without adding complexity for the player to manage |
| Sound design | Unaddressed | **Full audio direction** with adaptive layers | Sound is 40% of "game feel" — can't skip it |
| Tutorial | "1-2 line tooltips" | **Integrated tutorial through level design** — levels 1-5 are the tutorial | Show, don't tell |
| Templates | 4 layout templates | **8 templates + symmetry system + handcrafted seeds** | 4 templates for 100 levels = obvious repetition |
| Immune system | Absent | **Passive immune cells** that grow from player actions | Gives a "building" feel — you're not just removing, you're strengthening |
| Solver | Beam search, large action space | **Beam search + zone-of-interest pruning + puzzle signature scoring** | Original solver would be too slow above 8x8 grids |
| Difficulty curve | Linear ramp | **Wave pattern** with rest levels after hard ones | Candy Crush's secret — breathe, then challenge |

---

## 1. Core Identity

### The Feel
- **Calm but cerebral.** Soft ambient audio, clean visuals, no time pressure.
- **Chess-like clarity.** Every rule is visible. Every outcome is predictable. No hidden randomness.
- **"One more level" hook.** Short levels (30-90 seconds of thinking), satisfying clear animations, star chase.

### The Core Loop
```
Select Level → Survey the Board → Plan Your Moves → Place Tools (turn by turn)
    → Watch Spread Resolve → Adjust Strategy → Win/Lose → Star Rating → Next Level
```

### The Strategic Loop
```
Complete World → Unlock New Mechanic → Re-evaluate old strategies
    → Tackle harder combinations → Unlock next World
```

---

## 2. The Board

### Grid
- Square tiles (hex is a future consideration, not MVP)
- Sizes scale: **6×6** (early) → **7×7** (mid) → **8×8** (late) → **9×9** (endgame) → **10×10** (boss levels)
- Every tile is one of: **Empty, Wall, Infected, Core, Environmental**

### Camera / View
- Fixed top-down view, no scrolling needed
- Tile size adjusts to fit screen (responsive)
- Subtle parallax on background (petri dish / tissue texture)

---

## 3. Germ Types (7 Total, Introduced Gradually)

Each germ has: **spread pattern, speed, strength, special behavior, visual identity (shape + color + animation)**

### Tier 1 — Foundation (Levels 1-20)

#### 🟢 Bacteria (Green Dots)
- **Spread:** Orthogonal (up/down/left/right), 1 tile per turn
- **Strength:** 1
- **Special:** None — this is the "pawn"
- **Visual:** Soft pulsing green circles
- **Introduced:** Level 1

#### 🔴 Virus (Red Spikes)
- **Spread:** Diagonal, 1 tile per turn
- **Strength:** 2
- **Special:** Converts bacteria it touches (strength wins)
- **Visual:** Angular red shapes with sharp edges, faster pulse
- **Introduced:** Level 11

### Tier 2 — Timing & Territory (Levels 21-45)

#### 🟡 Spore (Yellow Rings)
- **Spread:** Dormant for N turns, then spreads orthogonally like bacteria
- **Strength:** 1
- **Special:** Shows a countdown timer on tile. Creates urgency without chaos.
- **Visual:** Concentric yellow rings that "fill in" as activation approaches
- **Introduced:** Level 21

#### 🟣 Fungus (Purple Tendrils)
- **Spread:** Slow — spreads 1 tile every **2 turns**, but in ALL 8 directions
- **Strength:** 1
- **Special:** Creates **mycelium links** — connected fungus tiles share damage resistance. If one fungus tile is adjacent to 2+ other fungus tiles, it takes 2 hits to kill instead of 1. This is the "you waited too long" mechanic.
- **Visual:** Purple with tendril connections drawn between adjacent fungus tiles
- **Introduced:** Level 36

### Tier 3 — Advanced Interactions (Levels 46-75)

#### 🟠 Parasite (Orange Arrows)
- **Spread:** Does NOT spread on its own. Instead, it **hijacks** — when an adjacent germ spreads, the parasite copies into that new tile instead of the original germ. It's a germ that rides other germs.
- **Strength:** 2
- **Special:** Immune to antibiotics (not alive in the traditional sense). Requires antiviral OR isolation via barriers.
- **Visual:** Orange with directional arrows pointing at adjacent infected tiles
- **Introduced:** Level 51

#### 🔵 Biofilm (Teal Shields)
- **Spread:** Spreads orthogonally every 2 turns
- **Strength:** 1 normally, but **3 when adjacent to another biofilm tile**
- **Special:** Cluster defense — biofilm is trivial alone but devastating in groups. Forces the player to break clusters early. This is the "snowball" germ.
- **Visual:** Teal with a translucent shield overlay that intensifies with more neighbors
- **Introduced:** Level 66

### Tier 4 — Endgame (Levels 76-100)

#### ⬛ Prion (Dark Red/Black Voids)
- **Spread:** Doesn't spread to empty tiles. Instead, **converts** any adjacent infected tile into a prion after 3 turns of contact. It's a germ that eats other germs and turns them into itself.
- **Strength:** 4
- **Special:** Cannot be killed by normal tools. Only removable by **CRISPR Patch** or by **letting it run out of food** (no adjacent infected tiles = it dies after 2 turns of starvation).
- **Visual:** Dark void with subtle red glow, particles being sucked inward
- **Introduced:** Level 81

### Germ Interaction Matrix

This is what creates the "aha" moments:

```
             Bacteria  Virus  Spore  Fungus  Parasite  Biofilm  Prion
Bacteria        -      loses    -     blocks    feeds    loses   consumed
Virus         wins       -    wins    blocks    feeds    loses   consumed
Spore           -      loses    -     blocks    feeds    loses   consumed
Fungus       blocks   blocks  blocks    -       immune   blocks  consumed
Parasite     hijacks  hijacks hijacks immune      -     hijacks  consumed
Biofilm       wins     wins   wins    blocks   hijacks    -      consumed
Prion        consumes consumes consumes consumes consumes consumes  -
```

Key interactions:
- **Virus beats Bacteria** (strength conversion)
- **Fungus blocks everything** except Prion (mycelium network is tough)
- **Parasite hijacks** any spreading germ (rides the wave)
- **Biofilm clusters** resist everything when grouped
- **Prion consumes everything** but starves without food
- **Bacteria and Spore are neutral** to each other (coexist)

This matrix means levels can create situations where you **use one germ against another**.

---

## 4. Player Tools (8 Total, Introduced Gradually)

Each tool has: **target requirement, effect, charges per level, visual feedback**

### Tier 1 — Direct Action (Available from start)

#### 💊 Antibiotic
- **Target:** Infected tile with bacteria, spore, or fungus
- **Effect:** Kills the germ on that tile instantly
- **Does NOT work on:** Virus, Parasite, Prion, or Biofilm clusters (strength 3+)
- **Charges:** 2-5 per level
- **Overtreatment risk:** If used 3+ times in a 3x3 area, triggers **Resistance Event** — surviving germs in that zone gain +1 strength permanently. This is the "don't spam antibiotics" mechanic from the brainstorm.
- **Introduced:** Level 1

#### 🧱 Barrier
- **Target:** Empty tile only
- **Effect:** Places a wall that blocks all spread and conversion
- **Permanent** for the level
- **Charges:** 1-3 per level
- **Introduced:** Level 1

### Tier 2 — Specialized Counters

#### 🧴 Antiviral
- **Target:** Any tile (area effect)
- **Effect:** Applies **Slow** to all virus tiles in radius 1 for 3 turns. Slowed viruses spread every 2nd turn instead of every turn.
- **Also affects Parasites** (slows their hijack)
- **Charges:** 1-3 per level
- **Introduced:** Level 11

#### 🛡 Immune Booster
- **Target:** Empty or Core tile
- **Effect:** Creates an **Immune Cell** on that tile. Immune cells are passive — they don't spread, but they **block infection** on that tile and **slowly push back**: after 3 turns, they clear 1 random adjacent infected tile (bacteria/spore only). Then the immune cell disappears.
- **This is the "building" mechanic** — you're not just removing threats, you're creating allies.
- **Charges:** 1-2 per level
- **Introduced:** Level 26

### Tier 3 — Area & Timing Tools

#### 🧬 CRISPR Patch
- **Target:** Any infected tile
- **Effect:** Prevents the germ from **mutating or evolving** for the rest of the level. Also the **only tool that kills Prions**.
- **Charges:** 1-2 per level (very precious)
- **Introduced:** Level 46

#### 🔥 Heat Lamp
- **Target:** Any tile (area effect)
- **Effect:** Applies **Weakened** to all germs in a 3×3 zone for 4 turns. Weakened germs have -1 strength (minimum 0). Strength-0 germs die at end of turn.
- **Powerful but temporary** — must be timed with other actions.
- **Charges:** 1-2 per level
- **Introduced:** Level 56

### Tier 4 — Endgame Precision Tools

#### 🚫 Quarantine Zone
- **Target:** Any tile (center of zone)
- **Effect:** Freezes a **3×3 area** for 3 turns — nothing spreads in or out. Existing germs and tools inside pause. After 3 turns, everything resumes.
- **Strategic use:** Delay a threat while you handle another, or trap a prion until it starves.
- **Charges:** 1 per level
- **Introduced:** Level 71

#### ⚡ Chain Reaction Catalyst
- **Target:** Any infected tile
- **Effect:** If the target germ is adjacent to a **different germ type**, both are destroyed, and the destruction chains to any adjacent germ that is adjacent to a different type. Creates satisfying chain clears.
- **This is the "candy crush special" moment** — set up the board, then trigger a cascade.
- **Charges:** 1 per level (the ultimate tool)
- **Introduced:** Level 86

### Tool Interaction Table

| Tool | Bacteria | Virus | Spore | Fungus | Parasite | Biofilm | Prion |
|------|----------|-------|-------|--------|----------|---------|-------|
| Antibiotic | ✅ Kills | ❌ | ✅ Kills | ✅ Kills (solo) | ❌ | ❌ if clustered | ❌ |
| Barrier | Blocks spread | Blocks spread | Blocks spread | Blocks spread | Blocks spread | Blocks spread | Blocks spread |
| Antiviral | ❌ | ✅ Slows | ❌ | ❌ | ✅ Slows | ❌ | ❌ |
| Immune Booster | ✅ Pushback | ❌ | ✅ Pushback | ❌ | ❌ | ❌ | ❌ |
| CRISPR Patch | Stops mutation | Stops mutation | Stops mutation | Stops mutation | Stops mutation | Stops mutation | ✅ **Kills** |
| Heat Lamp | Weakens | Weakens | Weakens | Weakens (breaks mycelium) | Weakens | Weakens (breaks clusters) | Weakens |
| Quarantine | Freezes | Freezes | Freezes (pauses timer) | Freezes | Freezes | Freezes | Freezes (starve timer still ticks) |
| Chain Catalyst | ✅ if mixed | ✅ if mixed | ✅ if mixed | ✅ if mixed | ✅ if mixed | ✅ if mixed | ✅ if mixed |

The asymmetry is the puzzle: **no single tool handles everything. You must combine.**

---

## 5. Environmental Tiles (6 Types)

Environmental tiles are pre-placed on the board. The player doesn't create them — they're part of the level layout. They modify how germs and tools behave in that area.

#### 💧 Moisture Zone (Blue tint)
- Bacteria spread **twice** from this tile (2 tiles orthogonally instead of 1)
- Viruses are unaffected
- **Introduced:** Level 16

#### 🌡 Hot Zone (Orange tint)
- All germs spread **half speed** here (every 2nd turn)
- Heat Lamp has **double duration** here
- **Introduced:** Level 31

#### 🧫 Nutrient Pool (Green tint)
- Germs on this tile gain **+1 strength** after 2 turns
- Spores activate **1 turn faster** here
- **Introduced:** Level 41

#### ❄ Cold Zone (Light blue tint)
- Tools have **+1 turn duration** here (slow lasts 4 instead of 3, etc.)
- Germs spread normally
- **Introduced:** Level 52

#### 🩸 Blood Vessel (Red tint, linear)
- A connected path of tiles. Germs can spread along the entire vessel in **1 turn** (like a highway)
- Critical to block with barriers
- **Introduced:** Level 62

#### ☣ Mutation Hotspot (Purple tint)
- Any germ sitting here for 3+ turns **evolves**: gains +1 strength and acquires the spread pattern of a random different germ type
- The "overtreatment" variant — these tiles punish slow play
- **Introduced:** Level 76

---

## 6. The Mutation / Evolution System

This was the best idea from the original brainstorm and it's now a core mechanic:

### How Mutation Works

Germs can mutate under these conditions:
1. **Survived a weak treatment** — if a germ is hit by a tool that doesn't kill it (e.g., antibiotic on a virus), it gains **Resistant** status (+1 strength permanently)
2. **Overtreatment zone** — 3+ antibiotics used in a 3×3 area triggers resistance in surviving nearby germs
3. **Mutation Hotspot** — environmental tile that forces evolution after 3 turns
4. **Time pressure** — in later levels, untreated germs gain +1 strength every N turns (configurable per level)

### What Mutation Does
- **+1 Strength** (harder to kill, wins more conversions)
- **Gains secondary spread** — bacteria that mutate might gain diagonal spread too
- **Visual change** — mutated germs have a glowing outline and slightly different shape

### Why This Matters for Gameplay
It creates a meta-puzzle: **"When do I intervene?"**
- Too early → waste tools, might trigger resistance
- Too late → infection spreads too far
- Wrong tool → strengthens the infection
- Right tool, right time → clean containment

This is what separates Bio Defence from a generic "click to clear" game.

---

## 7. Objective Types (8 Variants)

Not every level is "kill everything." Different objectives force different strategies.

| # | Objective | Description | Strategic Focus |
|---|-----------|-------------|----------------|
| 1 | **Clear All** | Remove every infected tile | Efficiency, tool conservation |
| 2 | **Containment** | Reduce infection below X% by turn T | Triage, prioritization |
| 3 | **Protect Cores** | Keep specific tiles uninfected for T turns | Defensive positioning |
| 4 | **Survive** | Keep total infection below Y% for T turns | Sustained pressure management |
| 5 | **Forced Evolution** | Let two germ types eliminate each other | Setup, indirect manipulation |
| 6 | **Chain Clear** | Clear X tiles in a single chain reaction | Board setup, catalyst timing |
| 7 | **Immune Victory** | Have immune cells clear 5+ tiles total | Booster placement, long game |
| 8 | **Starvation** | Isolate all prions until they die | Barrier placement, spatial reasoning |

Objectives are introduced one at a time, then combined in later levels (e.g., "Protect cores AND contain below 30%").

---

## 8. Scoring & Star System

Every level awards **1-3 stars** based on performance:

### Star Criteria
- ⭐ **1 Star:** Completed the objective (minimum pass)
- ⭐⭐ **2 Stars:** Completed within **par turns** (a target set per level by the generator)
- ⭐⭐⭐ **3 Stars:** Completed within par turns **AND** with **1+ unused tools remaining**

### Why Stars Matter
- Stars unlock bonus tools in later worlds (soft gate — you can always progress, but more stars = more options)
- Total star count unlocks cosmetic themes (petri dish skins, germ visual variants)
- Creates replayability: "I passed level 47 with 1 star, I bet I can 3-star it now that I understand fungus better"

### Par Calculation
The procedural generator sets par based on the solver's optimal solution length + 2 turns of margin.

---

## 9. World Structure & Difficulty Curve

### 5 Worlds, 20 Levels Each

#### World 1: "First Response" (Levels 1-20)
- **Theme:** Hospital lab, clean white-blue aesthetic
- **New Germs:** Bacteria (L1), Virus (L11)
- **New Tools:** Antibiotic (L1), Barrier (L1), Antiviral (L11)
- **New Env:** Moisture Zone (L16)
- **Objectives:** Clear All, Containment
- **Grid:** 6×6 to 7×7
- **Feel:** Tutorial → comfortable mastery
- **Boss L20:** "Patient Zero" — large grid, multiple bacteria clusters with one virus that converts everything if not contained. Teaches virus priority.

#### World 2: "Outbreak" (Levels 21-40)
- **Theme:** Field hospital, warm amber tones
- **New Germs:** Spore (L21), Fungus (L36)
- **New Tools:** Immune Booster (L26)
- **New Env:** Hot Zone (L31), Nutrient Pool (L41 preview at L40)
- **Objectives:** + Protect Cores, + Survive
- **Grid:** 7×7 to 8×8
- **Feel:** Timing becomes critical (spores), spatial reasoning deepens (fungus clusters)
- **Boss L40:** "The Bloom" — fungus network covering half the board. Must break mycelium links strategically before they become unkillable.

#### World 3: "Resistance" (Levels 41-60)
- **Theme:** Underground research bunker, dark greens and steel
- **New Germs:** Parasite (L51)
- **New Tools:** CRISPR Patch (L46), Heat Lamp (L56)
- **New Env:** Nutrient Pool (L41), Cold Zone (L52)
- **Objectives:** + Forced Evolution
- **Grid:** 8×8 to 9×9
- **Feel:** Everything interacts. Parasites hijacking viruses that are converting bacteria. Mutation pressure from nutrient pools. This is where the game becomes deeply tactical.
- **Mutation system fully active from L46.**
- **Boss L60:** "Arms Race" — germs actively mutate every 3 turns. Must use CRISPR patches strategically while containing with minimal tools. The "don't overtreat" puzzle at its peak.

#### World 4: "Containment Breach" (Levels 61-80)
- **Theme:** Bio-hazard facility, red warning lights, darker palette
- **New Germs:** Biofilm (L66)
- **New Tools:** Quarantine Zone (L71)
- **New Env:** Blood Vessel (L62), Mutation Hotspot (L76)
- **Objectives:** + Chain Clear, + Immune Victory
- **Grid:** 9×9 to 10×10
- **Feel:** Spatial complexity peaks. Blood vessels create "highways" for infection. Biofilm clusters require multi-step dismantling. Quarantine zones add temporal manipulation.
- **Boss L80:** "Lockdown" — multiple blood vessels connecting four infection clusters. Must quarantine, barrier, and time interventions across the entire board. Feels like managing a crisis.

#### World 5: "Endgame Protocol" (Levels 81-100)
- **Theme:** Abstract cellular void, black background with bioluminescent elements
- **New Germs:** Prion (L81)
- **New Tools:** Chain Reaction Catalyst (L86)
- **New Env:** All prior environments combined
- **Objectives:** + Starvation, all objectives can be combined
- **Grid:** 9×9 to 10×10
- **Feel:** Mastery. Every mechanic interacts. Prions that eat everything, parasites hijacking viruses on blood vessels, biofilm clusters in mutation hotspots. But the player now has the full toolkit.
- **Boss L100:** "The Last Stand" — 10×10 grid, every germ type, every environment type, a single CRISPR patch, a single Chain Catalyst, and 3 cores to protect. The ultimate puzzle.

### Difficulty Wave Pattern (Not Linear)

```
Difficulty
  ▲
  │     ╱╲        ╱╲        ╱╲         ╱╲         ╱╲
  │    ╱  ╲      ╱  ╲      ╱  ╲       ╱  ╲       ╱  ╲
  │   ╱    ╲    ╱    ╲    ╱    ╲     ╱    ╲     ╱    ╲
  │  ╱      ╲  ╱      ╲  ╱      ╲   ╱      ╲   ╱      ╲
  │ ╱   W1   ╲╱   W2   ╲╱   W3   ╲ ╱   W4   ╲ ╱   W5   ╲
  │╱          ╱         ╱          ╱          ╱           ╲
  └────────────────────────────────────────────────────────→ Level
   1    10    20    30    40    50    60    70    80    90   100
```

Within each world:
- **Levels 1-3** of each world: introduce the new mechanic gently (easy)
- **Levels 4-15:** ramp up combinations (medium → hard)
- **Levels 16-18:** peak difficulty for that world
- **Level 19:** rest level (satisfying clear with generous tools — the "breather")
- **Level 20:** boss level

This wave pattern is why Candy Crush is addictive — you never feel stuck for too long, and relief always comes.

---

## 10. Tutorial Design (Levels 1-5)

No text walls. The level IS the tutorial.

### Level 1: "One Dot"
- 6×6 grid, 1 bacteria in corner, 3 antibiotics
- Objective: Clear All
- The player can only click on green tiles. They figure out antibiotics kill bacteria.
- **Lesson:** Antibiotics kill bacteria by clicking on them.

### Level 2: "Two Dots"
- 6×6 grid, 2 bacteria spread apart, 2 antibiotics
- Player must click "End Turn" / "Step" to see bacteria spread, then use antibiotics
- **Lesson:** Germs spread each turn. You must act before they expand.

### Level 3: "The Preview"
- 6×6 grid, 3 bacteria in a line, 2 antibiotics + 1 barrier
- Next-turn preview is highlighted (ghost overlay showing where bacteria will spread next)
- Only way to win: place barrier to block one path, then kill the others
- **Lesson:** Preview overlay shows you the future. Barriers block spread. Plan ahead.

### Level 4: "Tough Choices"
- 6×6 grid, 4 bacteria sources, 3 antibiotics (not enough to kill all immediately)
- Must prioritize which to kill first based on spread patterns
- **Lesson:** You don't always have enough tools. Triage and timing matter.

### Level 5: "Containment"
- 7×7 grid, 2 bacteria clusters, objective is "Reduce below 20% by turn 8"
- Tools: 2 antibiotics, 2 barriers
- **Lesson:** Sometimes you don't need to kill everything — you need to contain it.

After level 5, the player understands: spread, tools, barriers, previews, objectives, and scarcity. Everything else builds on this.

---

## 11. Next-Turn Preview System (Critical UX Feature)

This is what makes the game chess-like instead of guessing:

### How It Works
- Before the player commits their action, the board shows **ghost overlays** on every tile that will be infected next turn
- Ghost tiles are semi-transparent versions of the germ color
- If a conversion will happen (virus eating bacteria), show a **flashing border** on the losing tile
- If a core tile is threatened, show a **red pulsing warning**

### Implementation
```
previewState = step(currentState, { type: "skip" })  // simulate doing nothing
diff = compare(currentState.board, previewState.board)
render ghost overlays for all tiles that changed
```

When the player hovers a tool over a tile:
```
previewWithTool = step(currentState, { type: "place_tool", tool, x, y })
show the improved outcome vs doing nothing
```

This gives the player **perfect information** — the puzzle is in the planning, not the guessing.

---

## 12. Animation & Visual Design

### Art Direction: "Clinical Bioluminescence"
- **Background:** Dark navy/charcoal with subtle grid lines (like a microscope view)
- **Tiles:** Soft rounded squares with slight glow
- **Germs:** Clean geometric shapes with distinct silhouettes (accessible even without color):
  - Bacteria: circles
  - Virus: diamonds/spikes
  - Spore: rings
  - Fungus: branching shapes
  - Parasite: arrows
  - Biofilm: hexagons
  - Prion: voids/holes
- **Tools:** Clean white/cyan icons
- **Environmental tiles:** Subtle background tint (not overlay — keeps germs readable)

### Core Animations (All Tween-Based)

| Event | Animation | Duration |
|-------|-----------|----------|
| Germ spreads | New tile scales from 0→1 with slight overshoot | 200ms |
| Germ converted | Flash white → new color, slight shake | 300ms |
| Germ killed (antibiotic) | Pop + particle burst outward | 250ms |
| Tool placed | Drop-in from above with subtle bounce | 150ms |
| Barrier placed | Solid fade-in with "lock" sound | 200ms |
| Immune cell pushback | Pulse ring expanding outward, cleared tile fades | 400ms |
| Chain reaction | Sequential pops with 50ms delay between each (domino effect) | 50ms × chain length |
| Mutation event | Germ glows bright, shakes, gains outline | 500ms |
| Core threatened | Red pulse ring, screen edge vignette | 300ms loop |
| Win | All germs dissolve outward, stars fly in | 1200ms |
| Lose | Board dims, red overlay, "outbreak" text | 800ms |

### Key Visual Principle
**Animate the transition, not the logic.**
```
currentState → compute nextState → animate from current to next over 300ms → set state = next
```
Never animate during computation. Always interpolate between known states.

### Colorblind Accessibility
Every germ type has:
- Unique **color**
- Unique **shape**
- Unique **animation pattern** (pulse rate, style)
- Optional: letter/symbol overlay toggle in settings

---

## 13. Sound Design

### Music
- **Ambient electronic** — soft pads, gentle arpeggios, no strong beat
- **Adaptive layers:** base layer always plays; tension layer fades in when infection > 50%; resolution layer plays on level clear
- Think: Monument Valley meets Pandemic board game soundtrack
- **Per-world variations:** same motifs, different instruments/keys

### SFX (Short, Satisfying, Non-Intrusive)

| Event | Sound Character |
|-------|----------------|
| Tool select | Soft click/chime |
| Tool place | Crisp "thock" |
| Antibiotic kill | Soft pop |
| Barrier place | Low solid thud |
| Germ spread | Subtle wet squelch (very quiet) |
| Conversion | Glass clink |
| Chain reaction | Ascending chime cascade |
| Mutation | Low rumble + high ping |
| Turn advance | Subtle clock tick |
| Win | Harmonic resolution chord |
| Lose | Low fade-out tone |
| Star earned | Bright ding (higher pitch per star) |

### Audio Priority
Sound is cheap to implement and accounts for ~40% of "game feel." Use royalty-free packs or AI-generated SFX. Don't skip this.

---

## 14. UI / UX Layout

### Level Screen Layout (Portrait-Friendly)

```
┌─────────────────────────────┐
│  ◀ Back    Level 37    ⚙    │  ← Header (level #, settings)
│         ★ ★ ☆              │  ← Star target display
├─────────────────────────────┤
│                             │
│    ┌───┬───┬───┬───┬───┐   │
│    │   │ 🟢│   │   │   │   │
│    ├───┼───┼───┼───┼───┤   │
│    │   │   │   │ 🔴│   │   │  ← Game Grid (centered)
│    ├───┼───┼───┼───┼───┤   │
│    │   │   │ ⬛│   │   │   │
│    ├───┼───┼───┼───┼───┤   │
│    │   │   │   │   │ 🟡│   │
│    └───┴───┴───┴───┴───┘   │
│                             │
│  Turn: 3/10   Inf: 23%     │  ← Status bar
├─────────────────────────────┤
│  [💊×3] [🧱×2] [🧴×1]     │  ← Tool palette (tap to select)
├─────────────────────────────┤
│  [↩ Undo] [▶ Step] [↻ Reset]│ ← Turn controls
└─────────────────────────────┘
```

### World Map / Level Select

```
┌─────────────────────────────┐
│    🧬 BIO DEFENCE           │
│                             │
│  World 1: First Response    │
│  ★★★ ★★★ ★★☆ ★☆☆ ···     │
│  [1] [2] [3] [4] [5]...    │
│                             │
│  World 2: Outbreak  🔒      │
│  (Unlock with 30 stars)     │
│                             │
│  World 3: Resistance 🔒     │
│  (Unlock with 75 stars)     │
└─────────────────────────────┘
```

### Key UX Features
- **Undo:** Full history stack (unlimited undo within a level). This is essential for tactical puzzle feel.
- **Next-turn preview:** Always visible as ghost overlay (toggle-able)
- **Tool preview on hover:** Shows what would happen if you placed the selected tool on the hovered tile
- **Infection % bar:** Visual bar at top that fills with red as infection grows
- **Objective reminder:** Always visible, highlights when close to win/lose

---

## 15. Procedural Level Generation (Refined)

### Architecture
```
DifficultyParams(level_number)
    → LayoutTemplate(picked by world + randomized)
        → PlacementRules(germs, cores, env tiles)
            → ToolBudget(calculated from required difficulty)
                → CandidateLevel
                    → Solver validates (beam search)
                        → PuzzleSignature scores "interestingness"
                            → Accept or reject
```

### 8 Layout Templates (Up from 4)

1. **Open Field** — minimal walls, pure spread management
2. **Corridors** — vertical bars with gaps (choke points)
3. **Rooms** — rectangular rooms with doorways
4. **Islands** — wall clusters creating navigation puzzles
5. **Symmetric** — mirror layout across center axis (feels "designed")
6. **Spiral** — walls forming a spiral path from edge to center (core at center)
7. **Maze-lite** — random walker creates winding paths
8. **Arena** — open center, walls around edges with entrances

### Puzzle Signature Scoring (New — This Is What Makes Generated Levels Feel Good)

A level passes generation only if it has a good "puzzle signature":

```
signatureScore = (
    decisionPoints    ×  3.0    // how many turns have multiple meaningful choices
  + toolVariety       ×  2.0    // does the solution use different tool types?
  + timingPressure    ×  2.5    // are there turns where waiting = losing?
  + spatialDistribution × 1.5   // are threats spread across the board?
  - bruteForceability  × 4.0    // can you win by just spamming one tool?
)
```

Levels with `signatureScore < threshold` are rejected even if solvable. This prevents "boring but technically valid" puzzles.

### How "Decision Points" Are Measured
Run the solver with beam width 1 (greedy) and beam width 100 (optimal). If the greedy solution is **significantly worse** than the optimal one (3+ more turns), the level has meaningful decisions. If greedy = optimal, the level is too obvious → reject.

### Tool Budget Calculation
Instead of fixed tool counts, the generator:
1. Solves the level with unlimited tools
2. Notes which tools the solver used and how many
3. Sets the budget to **solver's usage + 1-2 margin**
4. This guarantees the level is winnable but tight

---

## 16. Technical Architecture (Refined)

### Project Structure
```
bio-defence/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
│   └── assets/
│       ├── sprites/          # Germ shapes, tool icons, env tiles
│       ├── ui/               # Buttons, panels, star icons
│       └── audio/            # SFX + music layers
├── src/
│   ├── main.ts              # Phaser game init
│   ├── sim/                  # PURE LOGIC — zero Phaser imports
│   │   ├── types.ts          # All game types/interfaces
│   │   ├── constants.ts      # Germ stats, tool stats, env stats
│   │   ├── board.ts          # Board helpers (clone, get/set, bounds)
│   │   ├── germs.ts          # Spread patterns, conversion rules
│   │   ├── tools.ts          # Tool effects, placement validation
│   │   ├── environment.ts    # Environmental tile modifiers
│   │   ├── mutation.ts       # Mutation/evolution rules
│   │   ├── step.ts           # Two-phase turn resolution
│   │   ├── objectives.ts     # Win/lose evaluation
│   │   ├── metrics.ts        # Infection %, turn count, star calc
│   │   ├── preview.ts        # Next-turn preview computation
│   │   ├── history.ts        # Undo stack (state snapshots)
│   │   └── solver.ts         # Beam search + action pruning
│   ├── gen/                  # LEVEL GENERATION — runs offline
│   │   ├── difficulty.ts     # Difficulty → parameter curves
│   │   ├── templates.ts      # 8 layout templates
│   │   ├── placement.ts      # Germ, core, env tile placement
│   │   ├── budget.ts         # Tool budget calculation
│   │   ├── signature.ts      # Puzzle interestingness scoring
│   │   ├── generator.ts      # Main generation loop
│   │   ├── filters.ts        # Acceptance criteria
│   │   ├── rng.ts            # Seeded RNG (mulberry32)
│   │   └── cli.ts            # CLI: npm run gen:levels
│   ├── game/                 # PHASER RENDERING
│   │   ├── scenes/
│   │   │   ├── BootScene.ts  # Asset loading
│   │   │   ├── MenuScene.ts  # World/level select
│   │   │   ├── LevelScene.ts # Main gameplay
│   │   │   └── WinScene.ts   # Level complete + stars
│   │   ├── ui/
│   │   │   ├── Grid.ts       # Tile rendering + interaction
│   │   │   ├── ToolPalette.ts
│   │   │   ├── TurnControls.ts
│   │   │   ├── StatusBar.ts
│   │   │   ├── PreviewOverlay.ts
│   │   │   └── StarDisplay.ts
│   │   ├── animation/
│   │   │   ├── tweens.ts     # Reusable tween definitions
│   │   │   └── particles.ts  # Particle configs
│   │   └── audio/
│   │       └── AudioManager.ts
│   └── levels/
│       ├── levels_001_020.json  # World 1
│       ├── levels_021_040.json  # World 2
│       ├── levels_041_060.json  # World 3
│       ├── levels_061_080.json  # World 4
│       └── levels_081_100.json  # World 5
└── tests/
    ├── sim/
    │   ├── step.test.ts
    │   ├── germs.test.ts
    │   ├── tools.test.ts
    │   ├── mutation.test.ts
    │   └── objectives.test.ts
    ├── gen/
    │   ├── generator.test.ts
    │   └── signature.test.ts
    └── integration/
        └── solve-levels.test.ts
```

### Key Technical Decisions

1. **Sim is pure functions, no classes** — easier to test, serialize, and port
2. **Levels stored as JSON per world** — keeps file sizes manageable, easy to regenerate one world at a time
3. **Phaser only in `/game`** — everything else is portable
4. **CLI generator runs in Node** — not in the browser. Generation happens at build time.
5. **Undo uses state snapshots** — simple, reliable, memory is cheap for small grids

---

## 17. Build Order (Implementation Phases)

### Phase 1: Simulation Core (Days 1-4)
Build and test all of `/sim` with no Phaser:
1. `types.ts` — all interfaces
2. `constants.ts` — germ stats, tool stats
3. `board.ts` — helpers
4. `germs.ts` — spread logic for all 7 types
5. `tools.ts` — effect logic for all 8 types
6. `environment.ts` — env tile modifiers
7. `mutation.ts` — evolution rules
8. `step.ts` — two-phase resolution
9. `objectives.ts` — win/lose checks
10. `metrics.ts` — scoring
11. Run all tests. The sim must be bulletproof before anything else.

**Milestone:** You can run a full game in the terminal (print board states per turn).

### Phase 2: Solver & Generator (Days 5-8)
1. `solver.ts` — beam search with pruned actions
2. Validate solver on 5 handcrafted test levels
3. `difficulty.ts` + `templates.ts` — parameter curves and layouts
4. `placement.ts` + `budget.ts` — germ/tool placement logic
5. `signature.ts` — interestingness scoring
6. `generator.ts` + `filters.ts` — main generation pipeline
7. `cli.ts` — `npm run gen:levels` produces 100 levels
8. Manual review: print 10 random levels, verify they look sane

**Milestone:** 100 validated levels in JSON files.

### Phase 3: Playable Game (Days 9-14)
1. Phaser setup (`main.ts`, `BootScene.ts`)
2. `Grid.ts` — render board from state
3. `ToolPalette.ts` — tool selection UI
4. `TurnControls.ts` — step, undo, reset
5. `LevelScene.ts` — wire it all together
6. `PreviewOverlay.ts` — ghost tiles for next turn
7. Basic rectangles + colors (no sprites yet)
8. Play through 20 levels, catch bugs

**Milestone:** Playable browser game with colored rectangles.

### Phase 4: Polish & Feel (Days 15-21)
1. Replace rectangles with sprites (geometric shapes)
2. Add all animations (tweens, particles)
3. Add sound effects
4. Add music (adaptive layers)
5. `MenuScene.ts` — world map / level select
6. `WinScene.ts` — star display, next level flow
7. `StatusBar.ts` — infection bar, turn counter
8. Colorblind mode toggle

**Milestone:** Looks and feels like a real game.

### Phase 5: Content Tuning (Days 22-28)
1. Play all 100 levels
2. Adjust difficulty curves in `difficulty.ts`
3. Re-generate levels that don't feel right
4. Add/tweak tutorial levels (handcraft 1-5 if needed)
5. Tune animation timing
6. Balance tool budgets
7. Test on mobile browsers (responsive)

**Milestone:** 100 polished, playtested levels ready to ship.

---

## 18. Adding "Next 100 Levels" Later

When you want levels 101-200:

1. **Add new germ/tool types** to `/sim` (optional — could also add new level templates, env tiles, or mixed objectives)
2. **Extend `difficulty.ts`** — add parameter curves for levels 101-200
3. **Add new templates** to `templates.ts` if desired
4. **Run:** `npm run gen:levels -- --start 101 --count 100 --seed 67890 --out src/levels/levels_101_200.json`
5. **Register** the new JSON in the game's level loader
6. Ship

The generator is the factory. You design the LEGO pieces (germs, tools, environments). The factory assembles puzzles from them forever.

---

## 19. Future Expansion Ideas (Post-Launch)

Once the base 100 levels ship, these features can be added incrementally:

### Gameplay Expansions
- **Daily Challenge** — procedurally generated level each day, shared leaderboard
- **Endless Mode** — survive as long as possible with escalating difficulty
- **Sandbox Mode** — paint any germ/tool setup and play it
- **Level Editor** — players create and share levels (export/import JSON)
- **New mechanic packs** — "Viral Mutations DLC" introduces 2 new germs + 2 new tools + 50 levels

### Meta Progression
- **Research Tree** — spend stars to unlock tool upgrades (antibiotic gains +1 range, etc.)
- **Loadout System** — choose which 3-4 tools to bring into a level (from your unlocked pool)
- **Achievements** — "Clear 10 levels without using barriers", etc.

### Multiplayer
- **PvP Infection vs Defense** — one player places germs, the other places tools. Async or real-time.
- **Co-op** — two players share a tool budget on the same board

### Platform
- **Mobile app** — wrap in Capacitor/Electron for app stores
- **Godot port** — reuse sim + level JSON, rebuild rendering in Godot
- **Steam** — native build via Electron or Godot

---

## 20. What Makes Bio Defence Special

Most puzzle games are about **pattern matching** (Candy Crush) or **spatial reasoning** (Tetris). Bio Defence is about **systemic thinking**:

- **Every tool has a counter-indication.** Antibiotics can trigger resistance. Antivirals only slow, not kill. Barriers are permanent — place wrong and you trap yourself.
- **Every germ type interacts with every other.** Parasites ride viruses. Prions eat everything. Biofilm clusters resist tools. The board is a living ecosystem.
- **Timing is a resource.** Spore countdowns, mutation timers, immune cell delays — when you act is as important as what you do.
- **The meta-puzzle is restraint.** The best move is often NOT to use a tool this turn. Overtreatment is punished. Patience is rewarded.

This is "a biological strategy engine disguised as a puzzle game" — exactly what was envisioned in the original brainstorm, now with the mechanical depth to deliver on that promise.

---

---

## 21. Exact TypeScript Type Definitions (All Data Structures)

These are the complete types that every file in the project imports from. No ambiguity — every field is documented.

```ts
// ═══════════════════════════════════════════════════
// src/sim/types.ts — THE SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════

// ── Identifiers ──────────────────────────────────
export type GermId =
  | "bacteria"
  | "virus"
  | "spore"
  | "fungus"
  | "parasite"
  | "biofilm"
  | "prion";

export type ToolId =
  | "antibiotic"
  | "antiviral"
  | "barrier"
  | "immune_booster"
  | "crispr_patch"
  | "heat_lamp"
  | "quarantine_zone"
  | "chain_catalyst";

export type EnvId =
  | "moisture"
  | "hot_zone"
  | "nutrient_pool"
  | "cold_zone"
  | "blood_vessel"
  | "mutation_hotspot";

export type StatusId =
  | "slow"           // virus/parasite: spread every 2nd turn
  | "weakened"       // -1 strength; die if strength reaches 0
  | "resistant"      // +1 strength permanently (from overtreatment/mutation)
  | "crispr_locked"  // cannot mutate for rest of level
  | "quarantined"    // frozen: no spread, no conversion, no timers tick
  | "immune";        // tile is an immune cell (blocks infection, pushback timer)

export type ObjectiveType =
  | "clear_all"
  | "containment"       // infection ≤ maxPct by maxTurns
  | "protect_cores"     // cores stay uninfected for maxTurns
  | "survive"           // infection stays below cap every turn for maxTurns
  | "forced_evolution"  // two specific germ types must eliminate each other
  | "chain_clear"       // clear X tiles in one chain catalyst activation
  | "immune_victory"    // immune cells clear N tiles total
  | "starvation";       // all prions must die from starvation

// ── Tile State ───────────────────────────────────
export interface Status {
  id: StatusId;
  remaining: number;    // turns left; -1 = permanent (resistant, crispr_locked)
  data?: number;        // generic payload (e.g., immune pushback timer countdown)
}

export interface Tile {
  // What kind of tile this is
  kind: "empty" | "wall" | "infected" | "core" | "immune_cell";

  // Environment modifier (null = plain tile). Walls never have env.
  env: EnvId | null;

  // Germ data (only present when kind === "infected")
  germ: GermId | null;
  strength: number;       // current effective strength (base + mutations - weakened)
  baseStrength: number;   // original strength before any modifiers
  dormancy: number;       // spore only: turns until active. 0 = active. -1 = N/A
  turnsOnTile: number;    // how many turns this germ has occupied this tile (for mutation hotspot, prion conversion)

  // Status effects
  statuses: Status[];

  // Tracking for overtreatment zone
  antibioticHitsNearby: number;  // count of antibiotic uses in this tile's 3×3 neighborhood this level

  // Prion-specific tracking (only relevant when a non-prion tile is adjacent to a prion)
  prionContactTurns: number;     // how many consecutive turns this tile has been adjacent to a prion. 0 = not adjacent.
  prionStarveCounter: number;    // prion tiles only: how many consecutive turns with 0 adjacent infected. 0 = has food.

  // Immune cell data (only when kind === "immune_cell")
  immuneTimer: number;    // turns until pushback activates. -1 = N/A
  immuneCleared: number;  // how many tiles this immune cell has cleared (for immune_victory objective)

  // Blood vessel connectivity
  vesselGroupId: number;  // -1 = not a vessel. Tiles with same vesselGroupId are connected.

  // Mutation tracking
  hasMutated: boolean;    // true if germ has already mutated (prevents double mutation from hotspot + time pressure in same turn)
  nutrientBonusApplied: boolean; // true if nutrient pool strength bonus was already applied
}

// ── Board ────────────────────────────────────────
export interface Board {
  w: number;
  h: number;
  tiles: Tile[];  // length = w × h, row-major: index = y * w + x
}

// ── Tool Inventory ───────────────────────────────
export interface ToolInventory {
  antibiotic: number;
  antiviral: number;
  barrier: number;
  immune_booster: number;
  crispr_patch: number;
  heat_lamp: number;
  quarantine_zone: number;
  chain_catalyst: number;
}

// ── Objective ────────────────────────────────────
export type Objective =
  | { type: "clear_all" }
  | { type: "containment"; maxPct: number; maxTurns: number }
  | { type: "protect_cores"; cores: [number, number][]; maxTurns: number }
  | { type: "survive"; maxPct: number; maxTurns: number }
  | { type: "forced_evolution"; germA: GermId; germB: GermId }
  | { type: "chain_clear"; minChainSize: number }
  | { type: "immune_victory"; minClearedTotal: number }
  | { type: "starvation" };

// ── Level Spec (JSON file format) ────────────────
export interface LevelSpec {
  id: number;                     // 1-100
  difficulty: number;             // 1-100
  world: number;                  // 1-5
  seed: number;                   // RNG seed for reproducibility
  generatorVersion: number;       // always increment when rules change

  grid: {
    w: number;
    h: number;
  };

  walls: [number, number][];      // [x,y] pairs

  cores: [number, number][];      // [x,y] pairs (empty array if none)

  envTiles: Array<{
    env: EnvId;
    positions: [number, number][];
    vesselGroupId?: number;       // only for blood_vessel tiles
  }>;

  seeds: Array<{
    germ: GermId;
    x: number;
    y: number;
    dormancy?: number;            // spore only
  }>;

  tools: ToolInventory;

  objective: Objective;

  parTurns: number;               // solver optimal + 2 margin (for 2-star threshold)

  // Mutation pressure config (per-level)
  mutation: {
    enabled: boolean;             // false for levels < 46
    timePressureTurns: number;    // 0 = disabled. e.g., 8 means untreated germs gain +1 str every 8 turns
  };

  boss: boolean;                  // true for levels 20, 40, 60, 80, 100

  title?: string;                 // optional display name (boss levels + tutorials)
}

// ── Game State (runtime) ─────────────────────────
export interface GameState {
  levelId: number;
  turn: number;
  board: Board;
  tools: ToolInventory;
  objective: Objective;
  seed: number;

  // Tracking
  totalAntibioticUses: number;        // for overtreatment tracking
  antibioticPositions: [number, number][];  // positions where antibiotics were used this level
  totalImmuneCleared: number;         // across all immune cells this level
  maxChainThisLevel: number;          // longest chain reaction triggered
  peakInfectionPct: number;           // highest infection % seen this run
  isOver: boolean;
  result: "playing" | "win" | "lose";
  stars: number;                      // 0 while playing, 1-3 on win
}

// ── Player Action ────────────────────────────────
export type Action =
  | { type: "place_tool"; tool: ToolId; x: number; y: number }
  | { type: "skip" };               // end turn without placing anything
```

---

## 22. Exact Numerical Constants (All Stats, Timers, Thresholds)

```ts
// ═══════════════════════════════════════════════════
// src/sim/constants.ts — EVERY MAGIC NUMBER IN ONE PLACE
// ═══════════════════════════════════════════════════

import { GermId, ToolId, EnvId } from "./types";

// ── Germ Base Stats ──────────────────────────────
export const GERM_STATS: Record<GermId, {
  baseStrength: number;
  spreadDirections: "ortho" | "diag" | "all8" | "none" | "hijack" | "convert_adjacent";
  spreadFrequency: number;         // spread every N turns (1=every turn, 2=every other)
  defaultDormancy: number;         // spore only; -1 for others
  myceliumThreshold: number;       // fungus only: adjacent fungus count to gain +1 hit
  biofilmClusterStrength: number;  // biofilm: strength when adjacent to another biofilm
  prionConvertTurns: number;       // prion: turns of contact before converting adjacent infected
  prionStarveTurns: number;        // prion: turns without adjacent infected before dying
}> = {
  bacteria: {
    baseStrength: 1,
    spreadDirections: "ortho",
    spreadFrequency: 1,
    defaultDormancy: -1,
    myceliumThreshold: -1,
    biofilmClusterStrength: -1,
    prionConvertTurns: -1,
    prionStarveTurns: -1,
  },
  virus: {
    baseStrength: 2,
    spreadDirections: "diag",
    spreadFrequency: 1,
    defaultDormancy: -1,
    myceliumThreshold: -1,
    biofilmClusterStrength: -1,
    prionConvertTurns: -1,
    prionStarveTurns: -1,
  },
  spore: {
    baseStrength: 1,
    spreadDirections: "ortho",    // after waking
    spreadFrequency: 1,           // after waking
    defaultDormancy: 3,           // generator overrides this per level (2-6)
    myceliumThreshold: -1,
    biofilmClusterStrength: -1,
    prionConvertTurns: -1,
    prionStarveTurns: -1,
  },
  fungus: {
    baseStrength: 1,
    spreadDirections: "all8",
    spreadFrequency: 2,           // spreads every 2 turns
    defaultDormancy: -1,
    myceliumThreshold: 2,         // adjacent fungus count >= 2 means +1 hit to kill
    biofilmClusterStrength: -1,
    prionConvertTurns: -1,
    prionStarveTurns: -1,
  },
  parasite: {
    baseStrength: 2,
    spreadDirections: "hijack",   // special: doesn't spread on its own
    spreadFrequency: 1,           // hijacks every turn an adjacent germ spreads
    defaultDormancy: -1,
    myceliumThreshold: -1,
    biofilmClusterStrength: -1,
    prionConvertTurns: -1,
    prionStarveTurns: -1,
  },
  biofilm: {
    baseStrength: 1,
    spreadDirections: "ortho",
    spreadFrequency: 2,           // spreads every 2 turns
    defaultDormancy: -1,
    myceliumThreshold: -1,
    biofilmClusterStrength: 3,    // strength when adjacent to another biofilm
    prionConvertTurns: -1,
    prionStarveTurns: -1,
  },
  prion: {
    baseStrength: 4,
    spreadDirections: "convert_adjacent",  // doesn't spread to empty; converts infected neighbors
    spreadFrequency: 1,
    defaultDormancy: -1,
    myceliumThreshold: -1,
    biofilmClusterStrength: -1,
    prionConvertTurns: 3,         // contacts infected neighbor for 3 turns → converts it
    prionStarveTurns: 2,          // no adjacent infected for 2 turns → prion dies
  },
};

// ── Tool Constants ───────────────────────────────
export const TOOL_CONSTANTS = {
  antibiotic: {
    killsGerms: ["bacteria", "spore", "fungus"] as GermId[], // fungus only if solo (not mycelium'd)
    overtreatmentRadius: 1,          // 3×3 area = radius 1 from center
    overtreatmentThreshold: 3,       // 3+ uses in the 3×3 → resistance event
    resistanceStrengthBonus: 1,      // +1 strength to survivors
  },
  antiviral: {
    affectsGerms: ["virus", "parasite"] as GermId[],
    radius: 1,                       // affects tiles within Manhattan distance 1 (3×3)
    slowDuration: 3,                 // turns
  },
  barrier: {
    // no special constants — places a wall
  },
  immune_booster: {
    placeOn: ["empty", "core"] as string[],  // tile kinds it can be placed on
    pushbackDelay: 3,                // turns before immune cell clears an adjacent tile
    pushbackTargets: ["bacteria", "spore"] as GermId[],  // which germs it can clear
    pushbackCount: 1,                // clears 1 adjacent tile then disappears
  },
  crispr_patch: {
    placeOn: ["infected"] as string[],
    killsGerms: ["prion"] as GermId[],         // instant kill for prions
    preventsOnAll: true,                        // prevents mutation for any germ type
  },
  heat_lamp: {
    radius: 1,                       // 3×3 area
    weakenedDuration: 4,             // turns
    strengthReduction: 1,            // -1 strength per turn of weakened
    killAtStrength: 0,               // germs at 0 strength die at end of turn
  },
  quarantine_zone: {
    radius: 1,                       // 3×3 area
    duration: 3,                     // turns everything is frozen
    prionStarveStillTicks: true,     // prion starvation timer keeps counting inside quarantine
  },
  chain_catalyst: {
    requiresMixedAdjacent: true,     // target must be adjacent to a DIFFERENT germ type
    chainDelay: 50,                  // ms between chain pops (animation only, logic is instant)
  },
};

// ── Environment Constants ────────────────────────
export const ENV_CONSTANTS: Record<EnvId, {
  description: string;
  spreadMultiplier: number;         // 1.0 = normal, 2.0 = double
  spreadFrequencyOverride: number;  // 0 = no override, N = spread every N turns instead
  strengthBonus: number;            // added after N turns on tile
  strengthBonusTurns: number;       // turns on tile before bonus applies
  toolDurationBonus: number;        // extra turns for tool effects
  dormancyReduction: number;        // spore wakes up N turns faster
  mutationTurns: number;            // 0 = no mutation; N = mutate after N turns on this tile
}> = {
  moisture: {
    description: "Bacteria spread distance doubles",
    spreadMultiplier: 2.0,          // bacteria spread 2 tiles instead of 1
    spreadFrequencyOverride: 0,
    strengthBonus: 0,
    strengthBonusTurns: 0,
    toolDurationBonus: 0,
    dormancyReduction: 0,
    mutationTurns: 0,
  },
  hot_zone: {
    description: "All germs spread half speed; heat lamp lasts 2× longer",
    spreadMultiplier: 1.0,
    spreadFrequencyOverride: 2,     // everything spreads every 2 turns here
    strengthBonus: 0,
    strengthBonusTurns: 0,
    toolDurationBonus: 4,           // heat lamp: 4+4=8 turns here
    dormancyReduction: 0,
    mutationTurns: 0,
  },
  nutrient_pool: {
    description: "Germs gain +1 strength after 2 turns; spores wake 1 turn faster",
    spreadMultiplier: 1.0,
    spreadFrequencyOverride: 0,
    strengthBonus: 1,
    strengthBonusTurns: 2,
    toolDurationBonus: 0,
    dormancyReduction: 1,
    mutationTurns: 0,
  },
  cold_zone: {
    description: "Tool status effects last 1 extra turn",
    spreadMultiplier: 1.0,
    spreadFrequencyOverride: 0,
    strengthBonus: 0,
    strengthBonusTurns: 0,
    toolDurationBonus: 1,           // slow 3→4, weakened 4→5, quarantine 3→4
    dormancyReduction: 0,
    mutationTurns: 0,
  },
  blood_vessel: {
    description: "Germs spread along entire connected vessel in 1 turn",
    spreadMultiplier: 1.0,          // normal per-tile, but vessel connectivity handles the "highway"
    spreadFrequencyOverride: 0,
    strengthBonus: 0,
    strengthBonusTurns: 0,
    toolDurationBonus: 0,
    dormancyReduction: 0,
    mutationTurns: 0,
  },
  mutation_hotspot: {
    description: "Germ evolves after 3 turns: +1 strength + gains random secondary spread",
    spreadMultiplier: 1.0,
    spreadFrequencyOverride: 0,
    strengthBonus: 0,               // mutation handles this, not direct strength bonus
    strengthBonusTurns: 0,
    toolDurationBonus: 0,
    dormancyReduction: 0,
    mutationTurns: 3,
  },
};

// ── Spread Direction Vectors ─────────────────────
export const ORTHO_DIRS: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
export const DIAG_DIRS: [number, number][] = [[1,1],[1,-1],[-1,1],[-1,-1]];
export const ALL8_DIRS: [number, number][] = [...ORTHO_DIRS, ...DIAG_DIRS];

// ── Scoring Constants ────────────────────────────
export const STAR_THRESHOLDS = {
  // 1 star: just win
  // 2 stars: win within parTurns
  // 3 stars: win within parTurns AND have >= 1 unused tool remaining
  parMargin: 2,  // par = solverOptimal + this value
};

// ── World Unlock Requirements ────────────────────
export const WORLD_UNLOCK_STARS: Record<number, number> = {
  1: 0,    // always available
  2: 30,   // 30 stars from World 1 (out of 60 possible)
  3: 75,   // 75 total stars
  4: 130,  // 130 total stars
  5: 200,  // 200 total stars
};

// ── Animation Timing (ms) ────────────────────────
export const ANIM = {
  germSpread: 200,
  germConvert: 300,
  germKill: 250,
  toolPlace: 150,
  barrierPlace: 200,
  immunePushback: 400,
  chainPopDelay: 50,    // between each chain link
  mutationEvent: 500,
  coreThreat: 300,      // loop duration
  winSequence: 1200,
  loseSequence: 800,
  turnTransition: 100,  // brief pause between turns
  previewFadeIn: 120,
};

// ── Difficulty Curve Parameters ──────────────────
// These are the exact formulas the generator uses.
export function difficultyParams(level: number) {
  const d = level;  // alias for readability

  // Grid size
  const w =
    d <= 10 ? 6 :
    d <= 20 ? 7 :
    d <= 40 ? 7 + (d > 30 ? 1 : 0) :
    d <= 60 ? 8 + (d > 55 ? 1 : 0) :
    d <= 80 ? 9 :
    d <= 95 ? 9 + (d > 90 ? 1 : 0) :
    10;  // boss levels & late endgame
  const h = w;

  // Infection sources
  const sources =
    d <= 5 ? 1 :
    d <= 15 ? 2 :
    d <= 35 ? 2 + (d > 25 ? 1 : 0) :
    d <= 60 ? 3 :
    d <= 80 ? 3 + (d > 70 ? 1 : 0) :
    4;

  // Which germ types are unlocked at this level
  const germsUnlocked: GermId[] = ["bacteria"];
  if (d >= 11) germsUnlocked.push("virus");
  if (d >= 21) germsUnlocked.push("spore");
  if (d >= 36) germsUnlocked.push("fungus");
  if (d >= 51) germsUnlocked.push("parasite");
  if (d >= 66) germsUnlocked.push("biofilm");
  if (d >= 81) germsUnlocked.push("prion");

  // Which tools are unlocked
  const toolsUnlocked: ToolId[] = ["antibiotic", "barrier"];
  if (d >= 11) toolsUnlocked.push("antiviral");
  if (d >= 26) toolsUnlocked.push("immune_booster");
  if (d >= 46) toolsUnlocked.push("crispr_patch");
  if (d >= 56) toolsUnlocked.push("heat_lamp");
  if (d >= 71) toolsUnlocked.push("quarantine_zone");
  if (d >= 86) toolsUnlocked.push("chain_catalyst");

  // Which env tiles are unlocked
  const envsUnlocked: EnvId[] = [];
  if (d >= 16) envsUnlocked.push("moisture");
  if (d >= 31) envsUnlocked.push("hot_zone");
  if (d >= 41) envsUnlocked.push("nutrient_pool");
  if (d >= 52) envsUnlocked.push("cold_zone");
  if (d >= 62) envsUnlocked.push("blood_vessel");
  if (d >= 76) envsUnlocked.push("mutation_hotspot");

  // Max turns for objectives
  const maxTurns =
    d <= 15 ? 10 :
    d <= 30 ? 12 :
    d <= 55 ? 14 :
    d <= 80 ? 16 :
    18;

  // Total tool charges (across all tool types combined)
  const totalToolBudget =
    d <= 10 ? 7 :
    d <= 25 ? 6 :
    d <= 45 ? 6 :
    d <= 65 ? 5 :
    d <= 85 ? 5 :
    4;

  // Env tile count on the board
  const envTileCount =
    d <= 15 ? 0 :
    d <= 30 ? 2 :
    d <= 50 ? 3 :
    d <= 70 ? 4 :
    5;

  // Core tiles to protect (0 means no protect objective)
  const coreCount =
    d < 25 ? 0 :
    d < 50 ? (d > 40 ? 1 : 0) :
    d < 75 ? 1 :
    d < 90 ? 2 :
    3;

  // Mutation
  const mutationEnabled = d >= 46;
  const mutationTimePressure = d >= 60 ? Math.max(6, 12 - Math.floor((d - 60) / 10)) : 0;
  // Level 60: every 12 turns. Level 70: every 11. Level 80: every 10. Level 90: every 9. Level 100: every 8.

  // Wall density (% of total tiles that are walls)
  const wallDensityPct =
    d <= 10 ? 3 :
    d <= 30 ? 8 :
    d <= 50 ? 12 :
    d <= 70 ? 15 :
    12;  // late game: slightly less walls, more env tiles instead

  // Boss level flag
  const isBoss = d % 20 === 0;

  // Breather level flag (level 19, 39, 59, 79, 99 of each world)
  const isBreather = (d % 20 === 19) || (d === 99);

  return {
    w, h, sources, germsUnlocked, toolsUnlocked, envsUnlocked,
    maxTurns, totalToolBudget, envTileCount, coreCount,
    mutationEnabled, mutationTimePressure,
    wallDensityPct, isBoss, isBreather,
  };
}
```

---

## 23. Exact Turn Resolution Rules (Step-by-Step Algorithm)

This is the complete turn resolution. No ambiguity — every edge case is specified.

### Phase 0: Player Action
1. If action is `place_tool`: validate placement, apply tool effect, decrement inventory.
2. If action is `skip`: do nothing.

### Phase 1: Status Decay & Timers (Before Spread)
For every tile on the board:
1. Decrement all status `remaining` counters by 1.
2. Remove statuses where `remaining` reaches 0 (except `remaining === -1` which means permanent).
3. Decrement `dormancy` for spores by 1 (if > 0). If tile is on a nutrient pool, decrement by `1 + dormancyReduction`.
4. Increment `turnsOnTile` by 1 for all infected tiles.

### Phase 2: Mutation Checks (After Timers, Before Spread)
For every infected tile:
1. **Mutation Hotspot check:** If tile has `env === "mutation_hotspot"` AND `turnsOnTile >= ENV_CONSTANTS.mutation_hotspot.mutationTurns` AND germ does NOT have `crispr_locked` status → MUTATE.
2. **Time-pressure check:** If `level.mutation.timePressureTurns > 0` AND `turnsOnTile % level.mutation.timePressureTurns === 0` AND `turnsOnTile > 0` AND germ does NOT have `crispr_locked` → MUTATE.
3. **Nutrient pool check:** If tile has `env === "nutrient_pool"` AND `turnsOnTile >= ENV_CONSTANTS.nutrient_pool.strengthBonusTurns` AND bonus not already applied → apply `+strengthBonus` to germ. (Only once per germ occupancy.)

**MUTATE means:**
- `strength += 1`
- `baseStrength += 1`
- If germ spread is `"ortho"`, it gains `"diag"` as secondary (both directions now).
- If germ spread is `"diag"`, it gains `"ortho"` as secondary.
- If germ spread is `"all8"` or other, no spread change.
- Add visual "mutated" flag for rendering (glowing outline).

### Phase 3: Prion Conversion (Before Normal Spread)
For every prion tile:
1. Check all 4 orthogonal neighbors.
2. For each neighbor that is infected (non-prion) with `turnsOnTile` of contact ≥ `prionConvertTurns` (3):
   - Convert that neighbor to a prion with `strength = GERM_STATS.prion.baseStrength`, `turnsOnTile = 0`.
3. Track turns of contact: if a prion was adjacent to an infected tile last turn too, that counts. Use a separate `prionContactTurns` counter on the *neighbor* tile (or derive from adjacency history).

**Simplification for implementation:** Add a `prionContactTurns` field to the Tile interface (default 0). Each turn a tile is adjacent to a prion AND the tile is infected (non-prion), increment by 1. When it reaches `prionConvertTurns`, convert. Reset to 0 if the prion moves away or the tile becomes non-infected.

### Phase 4: Prion Starvation Check
For every prion tile:
1. Count adjacent infected (non-prion) neighbors.
2. If count === 0, increment a `prionStarveTurns` counter on the prion tile.
3. If `prionStarveTurns` counter reaches `GERM_STATS.prion.prionStarveTurns` (2), the prion dies (tile becomes empty).
4. If count > 0, reset `prionStarveTurns` counter to 0.

**Note:** Quarantine freezes do NOT pause prion starvation timers (per `quarantine_zone.prionStarveStillTicks`). This means quarantining a prion with no food around it is a valid kill strategy.

### Phase 5: Immune Cell Pushback
For every tile with `kind === "immune_cell"`:
1. Decrement `immuneTimer` by 1.
2. If `immuneTimer` reaches 0:
   - Find all orthogonal neighbors that are infected with a germ in `TOOL_CONSTANTS.immune_booster.pushbackTargets` (bacteria, spore).
   - If any found, pick the one with lowest strength (tie: pick first in reading order top-left).
   - Clear that tile (set to empty, keep env).
   - Increment `totalImmuneCleared` on the GameState.
   - Set this immune cell tile to `kind = "empty"` (immune cell is consumed).

### Phase 6: Compute Spread Intents (Read from CURRENT State)
For every infected tile, compute where it wants to spread. **Do NOT apply yet.**

```
intents: Array<{ fromX, fromY, toX, toY, germ, strength }>
```

Rules per germ:
1. **Bacteria:** Spread to each orthogonal neighbor if target is empty/core/infected-weaker. If on moisture env, spread up to 2 tiles in each orthogonal direction (skip if blocked by wall/immune_cell).
2. **Virus:** Spread to each diagonal neighbor. If slowed, only spread on even turns.
3. **Spore:** If `dormancy > 0`, no spread. If `dormancy <= 0` (awake), spread orthogonally like bacteria.
4. **Fungus:** Spread in all 8 directions, but only on even turns (`state.turn % 2 === 0`). If on hot_zone (spreadFrequencyOverride=2), fungus NEVER spreads (2×2=every 4 turns — use `Math.max` of frequencies).
5. **Parasite:** Does NOT generate its own spread intents. Instead, in a sub-step after all other intents are computed, for each intent that targets a tile adjacent to a parasite, the parasite "hijacks": the intent's germ is replaced with "parasite" and strength with parasite's strength. (If multiple intents are hijackable, each one is hijacked independently.)
6. **Biofilm:** Spread orthogonally every 2 turns. Compute effective strength: if adjacent to 1+ other biofilm tiles, strength = `biofilmClusterStrength` (3). Otherwise strength = `baseStrength` (1).
7. **Prion:** Does NOT generate normal spread intents. Prion "spread" is handled in Phase 3 (conversion).

**Blood vessel special rule:** If an infected tile is on a blood vessel (`vesselGroupId >= 0`), AND it generates spread intents, ALSO generate intents targeting every other tile in the same vessel group that is empty/core/infected-weaker. This makes vessels act as highways.

**Quarantine check:** Tiles with `quarantined` status do not generate spread intents and cannot be targeted by spread intents.

### Phase 7: Resolve Spread Conflicts (Simultaneous)
Group all intents by target tile `[toX, toY]`.

For each target:
1. Find the intent with highest `strength`. Ties: first in iteration order wins (deterministic because we iterate top-left to bottom-right).
2. If target is empty or core: infect with winner's germ and strength.
3. If target is already infected:
   - If winner's strength > target's current strength: convert tile to winner's germ.
   - If winner's strength <= target's strength: no change (defender holds).
4. New infections get `turnsOnTile = 0`, `dormancy = -1` (or 0 for spore offspring — awake immediately since parent was awake).

### Phase 8: Overtreatment Check
(This runs AFTER spread, so the consequences are felt next turn.)

For each tile:
1. If `antibioticHitsNearby >= TOOL_CONSTANTS.antibiotic.overtreatmentThreshold` (3):
   - Find all infected tiles in the same 3×3 zone as the center of the overtreatment.
   - For each, if it doesn't have `resistant` status, add `resistant` status (`remaining: -1`) and `strength += resistanceStrengthBonus` (1).
   - Reset the antibiotic hit counter for the zone (prevent retriggering same zone).

### Phase 9: Check Win/Lose
1. Evaluate objective conditions (see Section 7 for each type).
2. If win: compute stars based on turns and tools remaining.
3. If lose: set `result = "lose"`.
4. Update `peakInfectionPct`.

---

## 24. Exact Chain Reaction Algorithm

The Chain Catalyst is the game's most complex single mechanic. Here's exactly how it works:

1. Player places Chain Catalyst on target tile `(x, y)`.
2. **Validation:** Target must be infected. At least one orthogonal or diagonal neighbor must be infected with a DIFFERENT germ type. If not, placement is invalid.
3. **Initial pop:** Target tile is cleared (set to empty, keep env). Add to `clearedSet`.
4. **Chain propagation (BFS):**
   ```
   queue = [all neighbors of (x,y) that are infected with a different germ than the target]
   while queue is not empty:
     tile = queue.dequeue()
     if tile is in clearedSet: skip
     clear tile → empty
     add to clearedSet
     for each neighbor of tile:
       if neighbor is infected AND neighbor.germ !== tile.germ (the one just cleared):
         queue.enqueue(neighbor)
   ```
5. **Result:** All tiles in `clearedSet` are cleared. The chain continues as long as adjacent tiles have DIFFERENT germ types from each other. A monoculture stops the chain.
6. **Animation:** Each pop happens with `chainPopDelay` ms between them (visual only — logic resolves instantly).
7. Update `maxChainThisLevel = Math.max(maxChainThisLevel, clearedSet.size)`.

### Why This Creates Great Puzzles
To maximize a chain, the player needs the board to have an alternating pattern of germ types. This means sometimes you WANT germs to spread and diversify before triggering the catalyst. Restraint → setup → payoff.

---

## 25. Save System

### What Gets Saved
- `playerProgress`: which levels are completed, stars per level, total stars
- `settings`: sound volume, music volume, colorblind mode, preview toggle
- `currentLevel`: if the player is mid-level, save the full GameState + action history

### Storage
- **Web:** `localStorage` with key `"bio-defence-save"`
- **Format:** JSON, gzipped if over 100KB (levels JSON is not saved — it ships with the app)

### Save Schema
```ts
interface SaveData {
  version: number;                    // save format version (increment on breaking changes)
  levels: Record<number, {            // keyed by level id
    completed: boolean;
    bestStars: number;                // 0-3
    bestTurns: number;                // fewest turns to win
  }>;
  totalStars: number;                 // cached sum
  unlockedWorlds: number[];           // [1, 2, 3, ...]
  settings: {
    sfxVolume: number;                // 0.0 - 1.0
    musicVolume: number;              // 0.0 - 1.0
    colorblindMode: boolean;
    showPreview: boolean;
  };
  currentRun?: {                      // null if not mid-level
    levelId: number;
    stateSnapshot: string;            // JSON-serialized GameState
    actionHistory: Action[];
  };
}
```

### Save Triggers
- Auto-save on: level complete, settings change, mid-level every 5 actions
- Load on: app start

---

## 26. Responsive Layout Specification

### Target Resolutions
- **Desktop:** 1920×1080, 1366×768, 1280×720
- **Tablet:** 1024×768 (landscape), 768×1024 (portrait)
- **Mobile:** 390×844 (iPhone 14), 360×800 (Android mid-range)

### Layout Rules

**Tile size calculation:**
```ts
const GRID_AREA_PCT = 0.60;  // grid takes 60% of screen height
const HEADER_HEIGHT = 60;     // px
const STATUS_HEIGHT = 40;     // px
const TOOL_PALETTE_HEIGHT = 70; // px
const CONTROLS_HEIGHT = 50;   // px
const PADDING = 16;           // px

const availableHeight = screenHeight - HEADER_HEIGHT - STATUS_HEIGHT
                       - TOOL_PALETTE_HEIGHT - CONTROLS_HEIGHT - (PADDING * 4);
const availableWidth = screenWidth - (PADDING * 2);

const tileSize = Math.min(
  Math.floor(availableHeight / gridH),
  Math.floor(availableWidth / gridW),
  90  // max tile size cap
);
const minTileSize = 40;  // never go smaller than this
const finalTileSize = Math.max(tileSize, minTileSize);
```

**Breakpoints:**
- `width >= 900px`: Desktop layout — grid centered, tools to the side optionally
- `600px <= width < 900px`: Tablet — portrait layout as shown in wireframe
- `width < 600px`: Mobile — everything stacks vertically, tiles shrink to fit

**Touch targets:** All buttons and tool palette items must be at minimum **44×44px** (Apple HIG / Material Design).

---

## 27. Exact Level JSON Schema (What Ships)

Example of a complete level in JSON:

```json
{
  "id": 37,
  "difficulty": 37,
  "world": 2,
  "seed": 894721,
  "generatorVersion": 1,
  "grid": { "w": 8, "h": 8 },
  "walls": [[1,2],[1,3],[1,4],[5,1],[5,2]],
  "cores": [[4,4]],
  "envTiles": [
    {
      "env": "hot_zone",
      "positions": [[2,6],[3,6],[2,7]]
    },
    {
      "env": "moisture",
      "positions": [[6,0],[7,0]]
    }
  ],
  "seeds": [
    { "germ": "bacteria", "x": 0, "y": 0 },
    { "germ": "virus", "x": 7, "y": 7 },
    { "germ": "spore", "x": 3, "y": 1, "dormancy": 3 }
  ],
  "tools": {
    "antibiotic": 2,
    "antiviral": 1,
    "barrier": 2,
    "immune_booster": 1,
    "crispr_patch": 0,
    "heat_lamp": 0,
    "quarantine_zone": 0,
    "chain_catalyst": 0
  },
  "objective": {
    "type": "protect_cores",
    "cores": [[4,4]],
    "maxTurns": 12
  },
  "parTurns": 8,
  "mutation": {
    "enabled": false,
    "timePressureTurns": 0
  },
  "boss": false,
  "title": null
}
```

---

## 28. Solver Action Pruning (Exact Rules)

To keep the beam search fast, only generate these candidate actions:

| Tool | Valid Placement Tiles |
|------|----------------------|
| antibiotic | Only infected tiles where `germ` is in `killsGerms` list AND (for fungus) tile has < `myceliumThreshold` adjacent fungus |
| antiviral | Only tiles within radius 2 of any virus or parasite tile |
| barrier | Only empty tiles that are orthogonally adjacent to at least 1 infected tile OR on a blood vessel |
| immune_booster | Only empty or core tiles that are orthogonally adjacent to at least 1 bacteria or spore tile |
| crispr_patch | Only infected tiles (any germ) OR tiles adjacent to mutation hotspots |
| heat_lamp | Only tiles where the 3×3 area contains at least 2 infected tiles |
| quarantine_zone | Only tiles where the 3×3 area contains at least 2 infected tiles OR at least 1 prion |
| chain_catalyst | Only infected tiles adjacent to a different germ type |
| skip | Always available |

This reduces branching factor from `(w×h×8)` to roughly `10-30` actions per turn for typical boards.

---

## 29. Generator Acceptance Filters (Exact Thresholds)

| Level Range | Min Turns to Win | Max Turns to Win | Min Peak Infection % | Max Peak Infection % | Min Signature Score | Max Solver Beam Width |
|-------------|-----------------|-----------------|---------------------|---------------------|--------------------|-----------------------|
| 1-10        | 2               | 8               | 5                   | 45                  | 3.0                | 50                    |
| 11-20       | 3               | 10              | 10                  | 55                  | 5.0                | 80                    |
| 21-40       | 4               | 12              | 15                  | 65                  | 8.0                | 100                   |
| 41-60       | 5               | 14              | 15                  | 70                  | 10.0               | 120                   |
| 61-80       | 5               | 16              | 20                  | 75                  | 12.0               | 150                   |
| 81-100      | 6               | 18              | 20                  | 80                  | 14.0               | 200                   |
| Boss levels | 8               | 20              | 30                  | 85                  | 18.0               | 250                   |
| Breathers   | 2               | 6               | 5                   | 30                  | 2.0                | 50                    |

If a level fails 300 attempts: loosen `minSignatureScore` by 20% and retry 100 more. If still failing: log a warning and accept the best candidate found.

---

## 30. Exact Germ Visual Specifications

Every germ must be distinguishable by **color + shape + animation** independently (for colorblind accessibility).

| Germ | Color (Hex) | Shape | Idle Animation | Mutated Variant |
|------|-------------|-------|----------------|-----------------|
| Bacteria | `#33CC66` (green) | **Circle** — solid filled circle with soft edge | Gentle pulse: scale 1.0↔1.05, 1200ms loop | Adds thick glowing green outline + slight spikes on edge |
| Virus | `#FF4444` (red) | **Diamond/spike** — rotated square with 4 pointed extensions | Fast pulse: scale 1.0↔1.08, 600ms loop + 15° rotation oscillation | Adds red glow + extra spike points (4→8 points) |
| Spore | `#FFCC33` (yellow) | **Concentric rings** — 3 nested circles getting more opaque as dormancy decreases | Ring fill animation: outer ring filled (dormancy=3), middle (2), inner (1), solid (0=awake) | Adds golden glow + ring rotation |
| Fungus | `#9944CC` (purple) | **Branching shape** — Y-shaped or asterisk with rounded ends | Slow undulation: branches sway ±5° offset, 2000ms loop | Branches thicken + purple glow intensifies |
| Parasite | `#FF8800` (orange) | **Arrow/chevron** — pointing toward strongest adjacent germ | Arrow rotates to point at nearest infected neighbor, updated each turn | Arrow doubles (two chevrons) + orange pulse |
| Biofilm | `#33BBBB` (teal) | **Hexagon** with internal honeycomb pattern | Shield shimmer: translucent overlay brightness oscillates. Adjacent biofilm: connection lines drawn between them | Hexagon becomes double-walled + brighter shimmer |
| Prion | `#440000`→`#110000` (dark red-black) | **Void/hole** — dark circle with inward particle suction | Particles spiral inward continuously. Subtle red glow pulses outward 1800ms loop | Void grows larger within tile + particle speed increases |

### Status Effect Visual Overlays

| Status | Visual |
|--------|--------|
| Slow | Blue snowflake icon in top-right corner of tile + tile brightness reduced 20% |
| Weakened | Yellow down-arrow icon in top-right + tile opacity reduced to 70% |
| Resistant | Red up-arrow icon in top-right + red outline on tile |
| CRISPR Locked | Small DNA helix icon in top-right + cyan border on tile |
| Quarantined | Entire 3×3 zone has a semi-transparent blue grid overlay + "frozen" frost texture on edges |
| Immune | White/cyan glow + shield icon + countdown number displayed on tile |

---

## 31. Exact Tile Rendering Specifications

### Base Tile
- **Size:** Calculated per Section 26
- **Default empty tile:** `#1A1A2E` (very dark navy) with 1px `#2A2A4E` border
- **Border radius:** 4px (slightly rounded)
- **Gap between tiles:** 2px

### Tile Kind Colors (Background)

| Kind | Background Color | Border Color |
|------|-----------------|--------------|
| Empty | `#1A1A2E` | `#2A2A4E` |
| Wall | `#3A3A5A` | `#4A4A6A` (subtle block texture overlay) |
| Core | `#1A2A4E` | `#3399FF` (bright blue border, 2px) |
| Immune Cell | `#1A3A3A` | `#33DDDD` (cyan border, 2px, pulsing) |
| Infected | Dim version of germ color at 15% opacity over `#1A1A2E` | Germ color at 40% opacity |

### Environment Tile Tints (Applied UNDER germ sprite)

| Env | Tint | Extra Visual |
|-----|------|-------------|
| Moisture | `rgba(51, 153, 255, 0.12)` | Subtle water droplet pattern |
| Hot Zone | `rgba(255, 153, 51, 0.12)` | Faint heat shimmer (wavy lines) |
| Nutrient Pool | `rgba(51, 204, 102, 0.12)` | Small bubbles pattern |
| Cold Zone | `rgba(153, 204, 255, 0.12)` | Frost crystal pattern on corners |
| Blood Vessel | `rgba(255, 51, 51, 0.15)` | Red line connecting to adjacent vessel tiles |
| Mutation Hotspot | `rgba(153, 51, 255, 0.15)` | Radioactive trefoil watermark |

---

## 32. Complete Asset List (Every Image You Need to Create)

All sprites should be created at **128×128px** for the source file, exported as PNG with transparency. Phaser will scale them down to tile size at runtime. Use a consistent art style: clean geometric shapes, slight glow/bevel, dark background friendly.

### 32.1 — Germ Sprites (42 images)

Each germ needs: **default, mutated, dormant (spore only), and each status overlay variant.**

For simplicity, build germs as base shape + overlay composites at runtime. You only need to create:

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 1 | `germ_bacteria.png` | Green circle, soft edge, slight inner highlight | 128×128 |
| 2 | `germ_bacteria_mutated.png` | Green circle + thick glowing outline + small spike protrusions | 128×128 |
| 3 | `germ_virus.png` | Red diamond/rotated square with 4 pointed spike extensions | 128×128 |
| 4 | `germ_virus_mutated.png` | Red diamond with 8 spike points + red glow | 128×128 |
| 5 | `germ_spore_dormant3.png` | 3 concentric yellow rings, only outermost filled | 128×128 |
| 6 | `germ_spore_dormant2.png` | 3 rings, outer 2 filled | 128×128 |
| 7 | `germ_spore_dormant1.png` | 3 rings, all partially filled | 128×128 |
| 8 | `germ_spore_awake.png` | Solid yellow circle (all rings merged) | 128×128 |
| 9 | `germ_spore_mutated.png` | Golden solid circle + glow + ring rotation marks | 128×128 |
| 10 | `germ_fungus.png` | Purple Y-shape / asterisk with rounded branch ends | 128×128 |
| 11 | `germ_fungus_mutated.png` | Thicker branches + intensified purple glow | 128×128 |
| 12 | `germ_fungus_link.png` | Thin purple tendril line (64×8px, tileable horizontally/vertically/diagonally between adjacent fungus tiles) | 64×8 |
| 13 | `germ_parasite.png` | Orange arrow/chevron shape pointing right (rotated at runtime) | 128×128 |
| 14 | `germ_parasite_mutated.png` | Double chevron (two nested arrows) + orange pulse glow | 128×128 |
| 15 | `germ_biofilm.png` | Teal hexagon with internal honeycomb pattern | 128×128 |
| 16 | `germ_biofilm_mutated.png` | Double-walled hexagon + brighter honeycomb | 128×128 |
| 17 | `germ_biofilm_shield.png` | Translucent teal shield overlay (drawn on top of biofilm when clustered, opacity scales with neighbor count) | 128×128 |
| 18 | `germ_biofilm_link.png` | Teal connection line between adjacent biofilm tiles (64×8px) | 64×8 |
| 19 | `germ_prion.png` | Dark void circle with subtle dark red inner glow | 128×128 |
| 20 | `germ_prion_mutated.png` | Larger void + more intense red glow | 128×128 |
| 21 | `germ_prion_particle.png` | Tiny red dot (4×4px) used for inward-spiraling particle effect | 4×4 |

### 32.2 — Status Effect Overlays (6 images)

Small icons drawn in the top-right corner of a tile when active.

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 22 | `status_slow.png` | Blue snowflake icon | 32×32 |
| 23 | `status_weakened.png` | Yellow downward arrow icon | 32×32 |
| 24 | `status_resistant.png` | Red upward arrow icon | 32×32 |
| 25 | `status_crispr.png` | Cyan double-helix / DNA strand icon | 32×32 |
| 26 | `status_quarantine.png` | Blue grid/cage overlay (covers entire 3×3 zone — this one is 384×384 for a 3-tile span, or use a 9-patch) | 384×384 |
| 27 | `status_immune_timer.png` | White shield with number placeholder (number rendered by code) | 32×32 |

### 32.3 — Tool Icons (8 images + 8 selected variants)

Used in the tool palette UI. Need a default state and a "selected/active" state (brighter, slight glow).

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 28 | `tool_antibiotic.png` | Pill capsule icon (white/cyan) | 64×64 |
| 29 | `tool_antibiotic_selected.png` | Same pill + cyan glow border | 64×64 |
| 30 | `tool_antiviral.png` | Bottle/syringe icon (white/blue) | 64×64 |
| 31 | `tool_antiviral_selected.png` | Same + blue glow | 64×64 |
| 32 | `tool_barrier.png` | Brick/wall block icon (gray) | 64×64 |
| 33 | `tool_barrier_selected.png` | Same + white glow | 64×64 |
| 34 | `tool_immune_booster.png` | Shield with plus/cross icon (white/cyan) | 64×64 |
| 35 | `tool_immune_booster_selected.png` | Same + cyan glow | 64×64 |
| 36 | `tool_crispr_patch.png` | DNA scissors icon (cyan/white) | 64×64 |
| 37 | `tool_crispr_patch_selected.png` | Same + cyan glow | 64×64 |
| 38 | `tool_heat_lamp.png` | Heat/flame icon (orange/red gradient) | 64×64 |
| 39 | `tool_heat_lamp_selected.png` | Same + orange glow | 64×64 |
| 40 | `tool_quarantine_zone.png` | Circle with cross-out / biohazard cage icon (blue) | 64×64 |
| 41 | `tool_quarantine_zone_selected.png` | Same + blue glow | 64×64 |
| 42 | `tool_chain_catalyst.png` | Lightning bolt / explosion icon (yellow/white) | 64×64 |
| 43 | `tool_chain_catalyst_selected.png` | Same + yellow glow | 64×64 |

### 32.4 — Environment Tile Textures (6 images)

Subtle tile-sized textures overlaid on tiles with environmental modifiers. Must be semi-transparent so germs remain readable on top.

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 44 | `env_moisture.png` | Subtle blue water droplets / ripple pattern, ~12% opacity | 128×128 |
| 45 | `env_hot_zone.png` | Faint orange heat shimmer / wavy lines, ~12% opacity | 128×128 |
| 46 | `env_nutrient_pool.png` | Small green bubbles pattern, ~12% opacity | 128×128 |
| 47 | `env_cold_zone.png` | Light blue frost crystals on corners, ~12% opacity | 128×128 |
| 48 | `env_blood_vessel.png` | Red-tinted tile + vein-like lines toward edges (will be rotated to connect to adjacent vessel tiles), ~15% opacity | 128×128 |
| 49 | `env_mutation_hotspot.png` | Faint purple radioactive trefoil watermark, ~15% opacity | 128×128 |

### 32.5 — Board Tiles (4 images)

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 50 | `tile_empty.png` | Dark navy square (`#1A1A2E`) with subtle grid texture, 1px lighter border | 128×128 |
| 51 | `tile_wall.png` | Dark gray (`#3A3A5A`) with subtle rocky/block texture | 128×128 |
| 52 | `tile_core.png` | Dark blue (`#1A2A4E`) with bright blue border + subtle pulsing heart/cell icon in center | 128×128 |
| 53 | `tile_immune_cell.png` | Dark teal (`#1A3A3A`) with cyan shield icon in center + cyan pulsing border | 128×128 |

### 32.6 — UI Elements (28 images)

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 54 | `ui_star_empty.png` | Empty star outline (gray) | 48×48 |
| 55 | `ui_star_filled.png` | Filled golden star | 48×48 |
| 56 | `ui_star_fly.png` | Star with glow trail (used in win animation) | 64×64 |
| 57 | `ui_btn_step.png` | Play/step triangle icon (white) | 48×48 |
| 58 | `ui_btn_step_hover.png` | Same + cyan tint | 48×48 |
| 59 | `ui_btn_undo.png` | Curved back-arrow icon (white) | 48×48 |
| 60 | `ui_btn_undo_hover.png` | Same + cyan tint | 48×48 |
| 61 | `ui_btn_reset.png` | Circular refresh arrow icon (white) | 48×48 |
| 62 | `ui_btn_reset_hover.png` | Same + cyan tint | 48×48 |
| 63 | `ui_btn_back.png` | Left-pointing arrow (white) for back to menu | 48×48 |
| 64 | `ui_btn_settings.png` | Gear/cog icon (white) | 48×48 |
| 65 | `ui_btn_next_level.png` | Right arrow in circle (white/cyan) for "next level" after win | 64×64 |
| 66 | `ui_btn_retry.png` | Retry circular arrow (white) for lose screen | 64×64 |
| 67 | `ui_infection_bar_bg.png` | Horizontal bar background (dark gray, rounded ends) | 256×24 |
| 68 | `ui_infection_bar_fill.png` | Horizontal bar fill (red gradient, rounded left end) — stretched by code | 256×24 |
| 69 | `ui_infection_bar_fill_warning.png` | Same but orange-yellow (shown when > 60%) | 256×24 |
| 70 | `ui_infection_bar_fill_critical.png` | Same but bright red + pulse (shown when > 80%) | 256×24 |
| 71 | `ui_tool_charge_pip.png` | Small filled circle (white) to show remaining charges | 12×12 |
| 72 | `ui_tool_charge_pip_empty.png` | Small hollow circle (gray) for used charges | 12×12 |
| 73 | `ui_level_node_locked.png` | Level select: gray circle with lock icon | 64×64 |
| 74 | `ui_level_node_unlocked.png` | Level select: dark circle with level number placeholder | 64×64 |
| 75 | `ui_level_node_completed.png` | Level select: circle with checkmark, colored by world theme | 64×64 |
| 76 | `ui_level_node_boss.png` | Level select: larger hexagonal node for boss levels | 80×80 |
| 77 | `ui_world_lock.png` | Lock icon for locked worlds on level select | 64×64 |
| 78 | `ui_turn_indicator.png` | Small clock/turn icon shown next to "Turn: X/Y" | 24×24 |
| 79 | `ui_objective_icon_clear.png` | Broom/sweep icon (for clear_all objective) | 32×32 |
| 80 | `ui_objective_icon_contain.png` | Shrinking circle icon (for containment) | 32×32 |
| 81 | `ui_objective_icon_protect.png` | Shield icon (for protect_cores) | 32×32 |

### 32.7 — Preview & Effect Overlays (6 images)

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 82 | `preview_spread_ghost.png` | Semi-transparent white circle with dashed border (placed on tiles where infection WILL spread next turn) | 128×128 |
| 83 | `preview_threat_core.png` | Red pulsing ring (placed on core tiles that are threatened next turn) | 128×128 |
| 84 | `preview_conversion.png` | Flashing border frame (placed on tiles that will be converted next turn) | 128×128 |
| 85 | `effect_kill_particle.png` | Small bright circle (white/cyan) used in pop/burst particle system on germ kill | 8×8 |
| 86 | `effect_chain_ring.png` | Expanding ring (white) for chain reaction visual | 128×128 |
| 87 | `effect_mutation_glow.png` | Pulsing bright overlay (yellowish) for mutation event | 128×128 |

### 32.8 — Backgrounds (5 images)

One per world. These are full-screen backgrounds behind the grid.

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 88 | `bg_world1.png` | Hospital lab: clean white-blue, petri dish grid texture, soft lighting | 1920×1080 |
| 89 | `bg_world2.png` | Field hospital: warm amber tones, slightly worn texture, cloth/tent feel | 1920×1080 |
| 90 | `bg_world3.png` | Underground bunker: dark greens and steel, metallic texture, dim lighting | 1920×1080 |
| 91 | `bg_world4.png` | Biohazard facility: dark with red warning stripe accents, hazmat aesthetic | 1920×1080 |
| 92 | `bg_world5.png` | Abstract cellular void: pure black with faint bioluminescent speckles | 1920×1080 |

### 32.9 — Logo & Screens (4 images)

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 93 | `logo_bio_defence.png` | Game logo: "BIO DEFENCE" text with DNA/cell visual motif (transparent bg) | 512×256 |
| 94 | `screen_title_bg.png` | Title screen background: dark with floating cell/germ silhouettes | 1920×1080 |
| 95 | `screen_win.png` | Win overlay: semi-transparent dark backdrop for star display | 800×600 |
| 96 | `screen_lose.png` | Lose overlay: semi-transparent red-tinted dark backdrop | 800×600 |

### 32.10 — Colorblind Mode Alternate Germ Sprites (7 images)

When colorblind mode is on, germs use **high-contrast patterns** in addition to shapes. These replace the default germ sprites.

| # | Filename | Description | Size |
|---|----------|-------------|------|
| 97 | `germ_bacteria_cb.png` | Circle with horizontal stripes | 128×128 |
| 98 | `germ_virus_cb.png` | Diamond with crosshatch pattern | 128×128 |
| 99 | `germ_spore_cb.png` | Rings with dot fill pattern | 128×128 |
| 100 | `germ_fungus_cb.png` | Asterisk with checkerboard fills | 128×128 |
| 101 | `germ_parasite_cb.png` | Arrow with diagonal stripe fill | 128×128 |
| 102 | `germ_biofilm_cb.png` | Hexagon with dense dot fill | 128×128 |
| 103 | `germ_prion_cb.png` | Void circle with concentric ring pattern | 128×128 |

---

## Total Asset Count Summary

| Category | Count |
|----------|-------|
| Germ sprites (default + mutated + variants) | 21 |
| Status effect overlays | 6 |
| Tool icons (default + selected) | 16 |
| Environment tile textures | 6 |
| Board tiles | 4 |
| UI elements | 28 |
| Preview & effect overlays | 6 |
| Backgrounds | 5 |
| Logo & screens | 4 |
| Colorblind alternate germ sprites | 7 |
| **TOTAL IMAGES** | **103** |

### Asset Production Notes
- All sprites with transparency (PNG-32).
- Source files at listed sizes; Phaser handles scaling.
- Clean geometric style — no hand-drawn or organic textures. Think vector art rendered to raster.
- Consistent glow/bevel style across all elements.
- Backgrounds can be generated or sourced from stock; they sit behind the grid at low opacity.
- Particle images (21, 85) are tiny — can be a simple radial gradient circle.
- Tool icons should be instantly recognizable at 40×40px display size.
- Colorblind sprites only needed before launch if you want accessibility from day one (recommended). Otherwise, add post-Phase 4.

---

## Summary: The Game at a Glance

| Attribute | Value |
|-----------|-------|
| **Genre** | Turn-based cellular tactics puzzle |
| **Platform** | Web-first (browser), future mobile/Steam/Godot |
| **Engine** | Phaser 3 (TypeScript, Vite, VS Code) |
| **Controls** | Click/tap to select tool, click/tap to place |
| **Session length** | 1-3 minutes per level |
| **Content** | 100 levels across 5 worlds (procedurally generated + solver-validated) |
| **Germs** | 7 types with unique spread patterns and interactions |
| **Tools** | 8 types with asymmetric effectiveness |
| **Environments** | 6 tile modifiers that alter germ/tool behavior |
| **Objectives** | 8 variant types, combined in later levels |
| **Scoring** | 3-star system per level |
| **Key mechanic** | Mutation/resistance — overtreatment backfires |
| **Visual style** | Clinical bioluminescence (dark bg, glowing elements, geometric shapes) |
| **Audio** | Adaptive ambient electronic + satisfying tactical SFX |
| **Replayability** | Star chase, daily challenge, endless mode (future) |
| **Expandability** | Add germs/tools/envs → regenerate 100 new levels with one command |
| **Total art assets** | 103 images |
