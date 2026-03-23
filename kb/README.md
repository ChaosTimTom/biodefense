# Bio Defence — Knowledge Base

> **Version:** 1.0  
> **Game:** Bio Defence — a turn-based cellular-automaton puzzle game  
> **Stack:** TypeScript 5.9 · Phaser 3.90 · Vite 7.3 · Vitest 4 · Capacitor 8  
> **Live:** [biodefence.theimmersivesaga.com](https://biodefence.theimmersivesaga.com)

---

## Documents

| # | Document | Scope |
|---|----------|-------|
| 1 | [Architecture](architecture.md) | Project structure, two-layer (sim/game) design, directory tree, path aliases, module dependency graph, entry point, design decisions, state management |
| 2 | [Types & Data](types-and-data.md) | All TypeScript types, pathogen families (4 tiers), medicine types (4), growth directions, survival thresholds, core interfaces (Tile, Board, LevelSpec, GameState, Action, Objective), animation timings, visual data maps |
| 3 | [Game Logic](game-logic.md) | Turn lifecycle, action system (place_tool/switch/skip), generation engine (birth → survival → pruning), evaluation, objectives (clear_all/survive/contain), star rating, scoring formula, tool system, undo stack, preview overlay, board utilities |
| 4 | [UI & Scenes](ui-and-scenes.md) | All 6 scenes (Boot → Title → Menu → Level → Win → Scores), all 8 UI components (Grid, ToolPalette, StatusBar, TurnControls, PreviewOverlay, StarDisplay, RulesOverlay, UIFactory), animations & tweens, responsive layout, scene lifecycle |
| 5 | [World Design](world-design.md) | 4 worlds with germ tiers, template pools, grid ranges, star gates (0/30/90/150), difficulty tier table, progression design, star economy, germ introduction curve, template complexity curve, contain objectives, level titles & hints |
| 6 | [Level Generation](level-generation.md) | Full pipeline (PRNG, seed derivation, generateWorld, generateValidLevel), all 11 templates with ASCII diagrams, seed placement algorithm, growth BFS simulation, threshold derivation, cross-world dedup, fallback generator, post-processing |
| 7 | [Save System](save-system.md) | localStorage schema, SaveData interface (version 1), API (loadSave/saveSave/updateLevelResult/setPlayerName), best-of logic, derived stats (totalStars/totalScore/levelsCompleted/highestLevel), migration system, integration points |
| 8 | [Build & Deploy](build-and-deploy.md) | NPM scripts, Vite config, TypeScript config, Vitest config, GitHub Actions CI/CD workflow, custom domain, index.html, dependency table, Capacitor mobile config, asset pipeline |
| 9 | [Testing](testing.md) | Vitest framework, all 8 test files (122 tests), per-file coverage breakdown, solvability validation (200 levels), test patterns, running instructions, coverage philosophy |

---

## Quick Reference

### Run Locally
```bash
npm install
npm run dev        # → http://localhost:3000
```

### Test
```bash
npm test           # Single run (122 tests)
npm run test:watch # Watch mode
```

### Build & Deploy
```bash
npm run build      # → dist/
# Push to main → GitHub Actions deploys to Pages
```

### Key Architecture Rule

The codebase is split into two layers that must remain independent:

- **Simulation layer** (`src/sim/`) — Pure TypeScript, zero browser/Phaser imports. All game rules, generation, persistence.
- **Game layer** (`src/game/`) — Phaser scenes and UI. Imports from sim, never the reverse.

This separation enables: Node-based testing, headless simulation, and potential future server-side level validation.

---

## Contributing

When modifying game rules → edit `src/sim/`, add/update tests in `tests/sim/`.  
When modifying visuals → edit `src/game/`, test visually in browser.  
When adding levels → modify world configs in `src/sim/generation/worlds.ts`.  
When adding templates → add to `src/sim/generation/templates.ts`, update `allTemplates`.
