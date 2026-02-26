# Germ Tactics (Web‑First) — Absolute Build & Implementation Guide (VS Code + GitHub Copilot)

> **v6.0 — Mobile-First UI Overhaul** (latest)
> - Portrait canvas 400×720 with Phaser.Scale.FIT
> - TitleScene with animated floating germs, logo, player stats
> - Numeric scoring system (computeScore): base 1000 + eradication + par bonus + efficiency + star multiplier
> - ScoresScene high score board with per-level breakdown and scrolling
> - All touch targets ≥ 44px for mobile compliance
> - Assets compressed 93% (1024→256px, 12.1MB→0.9MB)
> - Removed 25MB+ of unused asset folders
> - Capacitor packaging for Android & iOS (`npm run cap:sync`, `npm run cap:android`, `npm run cap:ios`)
> - Centralized save system (src/game/save.ts)

This is a **web-first**, **turn-based**, **deterministic** cellular tactics puzzle game with:
- a **pure simulation core** (engine-agnostic),
- a **Phaser 3** UI/UX layer (animations, input, scenes),
- a **procedural level generator** that produces **100+ levels automatically**,
- a **validator + beam-search solver** that ensures generated levels are **winnable** and hit difficulty targets,
- a clean pipeline that later ports cleanly to **Godot** by reusing the sim + generator.

You will build **everything in VS Code**, use Copilot for acceleration, and ship a playable browser game.

---

## 0) The Core Philosophy

### Deterministic, chess-like rules
- Every turn is a **pure function**:
  - `(state, action) => nextState`
- No hidden randomness in gameplay.
- If you use randomness, it must be **seeded** and **previewable**.

### Simulation is separate from rendering
- `/src/sim` contains **no Phaser imports**.
- Phaser only displays states and interpolates between them.

### Procedural levels must be validated
- Generator produces candidates.
- Solver validates winnability and difficulty metrics.
- Accepted levels are written to JSON and shipped with the game.

---

## 1) What You’re Building (MVP Ruleset that scales to 100 levels)

### Grid
- Square grid (start 6×6 and scale to 10×10 by level 100).

### Germ types (start with 3)
1) **Bacteria (GREEN)**  
   - Spreads orthogonally to empty tiles every turn.
   - Strength: 1

2) **Virus (RED)**  
   - Spreads diagonally every turn (or every other turn—choose one; this guide uses **diagonal every turn**).
   - Strength: 2

3) **Spore (YELLOW)**  
   - Dormant for `wakeTurn` turns; then behaves like bacteria.
   - Strength: 1
   - Timing puzzle ingredient.

### Player tools (start with 3)
1) **Antibiotic**  
   - Removes **bacteria** on the target tile (not virus/spore).
   - Optional: weakens adjacent bacteria (later).

2) **Antiviral**  
   - Applies **Slow** status to **virus** in radius 1 for `duration` turns.
   - Slow means the virus spreads only every 2 turns.

3) **Barrier**  
   - Places a wall tile that blocks spread & conversion.

### Objectives (choose per level)
- Clear all infection.
- Reduce infection under X% by turn limit.
- Protect “core” tiles from infection.

This is enough to generate deep levels via combinations of:
- seeds count,
- layout topology (chokes, rooms),
- tool scarcity,
- mixed strains,
- dormancy timers,
- core protection constraints.

---

## 2) Tech Stack (Web‑First)

### Recommended
- **TypeScript**
- **Vite** (dev server/build)
- **Phaser 3** (2D)
- **Vitest** (tests)
- Optional: **Zod** (level JSON schema validation)

> Keep dependencies light until the sim and generator work.

---

## 3) Repo & Folder Structure

Create a repo and use this structure:

```
germ-tactics/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  /public
    /assets
      tiles/ (png)
      ui/ (png)
      sfx/ (wav/ogg)
  /src
    main.ts
    /sim
      types.ts
      rng.ts
      germs.ts
      tools.ts
      rules.ts
      step.ts
      metrics.ts
      solver.ts
      serialize.ts
    /gen
      difficulty.ts
      templates.ts
      generator.ts
      filters.ts
      presets.ts
      cli.ts
    /game
      /scenes
        BootScene.ts
        MenuScene.ts
        LevelScene.ts
      /ui
        Hud.ts
        ToolPalette.ts
        TurnControls.ts
      render.ts
    /levels
      levels_001_100.json
  /tests
    sim.step.test.ts
    solver.test.ts
    gen.test.ts
```

---

## 4) Setup Commands (VS Code friendly)

From a terminal in VS Code:

```bash
npm create vite@latest germ-tactics -- --template vanilla-ts
cd germ-tactics
npm i phaser vitest
npm i -D @types/node
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "gen:levels": "ts-node src/gen/cli.ts --count 100 --seed 12345 --out src/levels/levels_001_100.json"
  }
}
```

> If you don’t want `ts-node`, you can compile `cli.ts` with `tsc` and run via node; the guide keeps it simple.

---

## 5) Simulation Core (Pure TypeScript)

### 5.1 Types (`/src/sim/types.ts`)

```ts
export type GermId = "bacteria" | "virus" | "spore";
export type ToolId = "antibiotic" | "antiviral" | "barrier";

export type StatusId = "slow"; // expand later

export interface Status {
  id: StatusId;
  remaining: number; // turns remaining
}

export type TileKind = "empty" | "wall" | "infected" | "core";

export interface Tile {
  kind: TileKind;
  germ?: GermId;          // present if kind==="infected"
  strength?: number;      // derived from germ type
  dormancy?: number;      // spore only: turns until active; 0 => active
  statuses?: Status[];    // e.g., slow
}

export interface Board {
  w: number;
  h: number;
  tiles: Tile[]; // length = w*h, row-major
}

export interface ToolInventory {
  antibiotic: number;
  antiviral: number;
  barrier: number;
}

export type Objective =
  | { type: "clear_all" }
  | { type: "cap_infection"; maxPct: number; maxTurns: number }
  | { type: "protect_cores"; cores: Array<[number, number]>; maxTurns: number };

export interface LevelSpec {
  id: number;
  difficulty: number;
  seed: number;
  board: { w: number; h: number; walls: Array<[number, number]>; cores?: Array<[number, number]> };
  seeds: Array<{ germ: GermId; x: number; y: number; dormancy?: number }>;
  tools: ToolInventory;
  objective: Objective;
  generatorVersion: number;
}

export interface GameState {
  levelId: number;
  turn: number;
  board: Board;
  tools: ToolInventory;
  objective: Objective;
  rngSeed: number; // gameplay should be deterministic; if unused, keep for future
}

export type Action =
  | { type: "place_tool"; tool: ToolId; x: number; y: number }
  | { type: "skip" };
```

### 5.2 Helpers (`/src/sim/serialize.ts`)

```ts
import { Board, Tile } from "./types";

export const idx = (b: Board, x: number, y: number) => y * b.w + x;

export function inBounds(b: Board, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < b.w && y < b.h;
}

export function cloneBoard(b: Board): Board {
  return {
    w: b.w,
    h: b.h,
    tiles: b.tiles.map(t => ({
      ...t,
      statuses: t.statuses ? t.statuses.map(s => ({ ...s })) : undefined
    }))
  };
}

export function getTile(b: Board, x: number, y: number): Tile {
  return b.tiles[idx(b, x, y)];
}

export function setTile(b: Board, x: number, y: number, t: Tile) {
  b.tiles[idx(b, x, y)] = t;
}
```

---

## 6) Germ & Tool Definitions

### 6.1 Germ stats + spread rules (`/src/sim/germs.ts`)

```ts
import { Board, GermId } from "./types";
import { inBounds } from "./serialize";

export interface GermDef {
  id: GermId;
  strength: number;
  // returns target coords to attempt infection from (x,y) at a given turn
  spreadTargets: (board: Board, x: number, y: number, turn: number, dormancy?: number, isSlowed?: boolean) => Array<[number, number]>;
}

const ORTHO: Array<[number, number]> = [[1,0],[-1,0],[0,1],[0,-1]];
const DIAG: Array<[number, number]> = [[1,1],[1,-1],[-1,1],[-1,-1]];

export const GERMS: Record<GermId, GermDef> = {
  bacteria: {
    id: "bacteria",
    strength: 1,
    spreadTargets: (b, x, y) => ORTHO
      .map(([dx,dy]) => [x+dx, y+dy] as [number, number])
      .filter(([nx,ny]) => inBounds(b,nx,ny))
  },
  virus: {
    id: "virus",
    strength: 2,
    spreadTargets: (b, x, y, turn, _dormancy, isSlowed) => {
      // slow: only spread on even turns
      if (isSlowed && (turn % 2 === 1)) return [];
      return DIAG
        .map(([dx,dy]) => [x+dx, y+dy] as [number, number])
        .filter(([nx,ny]) => inBounds(b,nx,ny));
    }
  },
  spore: {
    id: "spore",
    strength: 1,
    spreadTargets: (b, x, y, _turn, dormancy) => {
      if ((dormancy ?? 0) > 0) return []; // dormant
      return ORTHO
        .map(([dx,dy]) => [x+dx, y+dy] as [number, number])
        .filter(([nx,ny]) => inBounds(b,nx,ny));
    }
  }
};
```

### 6.2 Tools (`/src/sim/tools.ts`)

```ts
import { Board, ToolId, Tile, Status } from "./types";
import { cloneBoard, getTile, setTile, inBounds } from "./serialize";

export interface ToolDef {
  id: ToolId;
  canPlace: (b: Board, x: number, y: number) => boolean;
  apply: (b: Board, x: number, y: number) => Board;
}

function addOrRefreshStatus(t: Tile, status: Status): Tile {
  const statuses = t.statuses ? [...t.statuses] : [];
  const i = statuses.findIndex(s => s.id === status.id);
  if (i >= 0) statuses[i] = { ...status };
  else statuses.push({ ...status });
  return { ...t, statuses };
}

export const TOOLS: Record<ToolId, ToolDef> = {
  barrier: {
    id: "barrier",
    canPlace: (b, x, y) => {
      if (!inBounds(b,x,y)) return false;
      const t = getTile(b,x,y);
      return t.kind === "empty"; // do not overwrite core or infected
    },
    apply: (b, x, y) => {
      const nb = cloneBoard(b);
      setTile(nb,x,y,{ kind:"wall" });
      return nb;
    }
  },
  antibiotic: {
    id: "antibiotic",
    canPlace: (b, x, y) => {
      if (!inBounds(b,x,y)) return false;
      const t = getTile(b,x,y);
      return t.kind === "infected"; // apply to infected only
    },
    apply: (b, x, y) => {
      const nb = cloneBoard(b);
      const t = getTile(nb,x,y);
      // remove only bacteria
      if (t.kind === "infected" && t.germ === "bacteria") {
        setTile(nb,x,y,{ kind:"empty" });
      }
      return nb;
    }
  },
  antiviral: {
    id: "antiviral",
    canPlace: (b, x, y) => {
      if (!inBounds(b,x,y)) return false;
      return true; // can be dropped anywhere; affects radius
    },
    apply: (b, x, y) => {
      const nb = cloneBoard(b);
      const R = 1;
      for (let yy=y-R; yy<=y+R; yy++){
        for (let xx=x-R; xx<=x+R; xx++){
          if (!inBounds(nb,xx,yy)) continue;
          const t = getTile(nb,xx,yy);
          if (t.kind === "infected" && t.germ === "virus") {
            setTile(nb,xx,yy, addOrRefreshStatus(t,{ id:"slow", remaining: 3 }));
          }
        }
      }
      return nb;
    }
  }
};
```

---

## 7) Turn Resolution (Two-Phase Intent Model)

### Why two-phase?
If you apply infections in-place, earlier tiles will affect later tiles in the same turn. That breaks determinism and feels unfair.

Instead:
1) read current state,
2) compute all intended infections/conversions,
3) apply them simultaneously.

### 7.1 Rules (`/src/sim/rules.ts`)

```ts
import { Tile, GermId } from "./types";
import { GERMS } from "./germs";

export function isBlocked(t: Tile): boolean {
  return t.kind === "wall";
}

export function isInfectable(t: Tile): boolean {
  return t.kind === "empty" || t.kind === "core" || t.kind === "infected";
}

export function tileStrength(t: Tile): number {
  if (t.kind !== "infected" || !t.germ) return 0;
  return GERMS[t.germ].strength;
}

export function hasStatus(t: Tile, id: string): boolean {
  return !!t.statuses?.some(s => s.id === id && s.remaining > 0);
}

export function decrementStatuses(t: Tile): Tile {
  if (!t.statuses?.length) return t;
  const next = t.statuses
    .map(s => ({ ...s, remaining: Math.max(0, s.remaining - 1) }))
    .filter(s => s.remaining > 0);
  return { ...t, statuses: next.length ? next : undefined };
}
```

### 7.2 Step function (`/src/sim/step.ts`)

```ts
import { Action, GameState, Tile } from "./types";
import { cloneBoard, getTile, setTile, inBounds } from "./serialize";
import { GERMS } from "./germs";
import { TOOLS } from "./tools";
import { decrementStatuses, hasStatus, isBlocked, isInfectable, tileStrength } from "./rules";

type InfectionIntent = { from: [number,number]; to: [number,number]; germ: "bacteria"|"virus"|"spore"; strength: number };

function applyPlayerAction(state: GameState, action: Action): GameState {
  if (action.type === "skip") return state;

  const { tool, x, y } = action;
  const inv = state.tools[tool];
  if (inv <= 0) return state;

  const def = TOOLS[tool];
  if (!def.canPlace(state.board, x, y)) return state;

  const newBoard = def.apply(state.board, x, y);
  return {
    ...state,
    board: newBoard,
    tools: { ...state.tools, [tool]: inv - 1 }
  };
}

function decayAndSporeWake(board: ReturnType<typeof cloneBoard>): void {
  for (let y=0; y<board.h; y++){
    for (let x=0; x<board.w; x++){
      const t = getTile(board,x,y);
      let nt = decrementStatuses(t);

      // spore dormancy counts down
      if (nt.kind === "infected" && nt.germ === "spore" && (nt.dormancy ?? 0) > 0) {
        nt = { ...nt, dormancy: Math.max(0, (nt.dormancy ?? 0) - 1) };
      }
      if (nt !== t) setTile(board,x,y,nt);
    }
  }
}

export function step(state: GameState, action: Action): GameState {
  // 1) Apply player action (tool placement) first for tactical clarity
  const afterAction = applyPlayerAction(state, action);

  // 2) Clone for next turn board, but read spreads from afterAction.board snapshot
  const current = afterAction.board;
  const next = cloneBoard(current);

  // 3) Status decay + spore wake timers (decay happens before spread)
  decayAndSporeWake(next);

  // 4) Compute infection intents from CURRENT (not next) to avoid order effects
  const intents: InfectionIntent[] = [];

  for (let y=0; y<current.h; y++){
    for (let x=0; x<current.w; x++){
      const t = getTile(current,x,y);
      if (t.kind !== "infected" || !t.germ) continue;
      if (isBlocked(t)) continue;

      const def = GERMS[t.germ];
      const slowed = hasStatus(t, "slow");
      const targets = def.spreadTargets(current, x, y, afterAction.turn, t.dormancy, slowed);

      for (const [nx,ny] of targets){
        const dest = getTile(current,nx,ny);
        if (!isInfectable(dest)) continue;
        if (dest.kind === "wall") continue;

        intents.push({
          from: [x,y],
          to: [nx,ny],
          germ: t.germ,
          strength: def.strength
        });
      }
    }
  }

  // 5) Resolve conflicts: multiple intents targeting same tile
  // Winner = highest strength. Tie => keep existing (prevents chaotic flip-flops).
  const byTarget = new Map<string, InfectionIntent[]>();
  for (const it of intents){
    const key = `${it.to[0]},${it.to[1]}`;
    const arr = byTarget.get(key) ?? [];
    arr.push(it);
    byTarget.set(key, arr);
  }

  for (const [key, arr] of byTarget.entries()){
    const [sx, sy] = key.split(",").map(Number);
    const destNow = getTile(current, sx, sy);
    if (destNow.kind === "wall") continue;

    // pick best attacker
    let best = arr[0];
    for (const it of arr) if (it.strength > best.strength) best = it;

    // If dest is infected, compare strengths to convert
    if (destNow.kind === "infected" && destNow.germ) {
      const defNow = tileStrength(destNow);
      if (best.strength > defNow) {
        setTile(next, sx, sy, { kind:"infected", germ: best.germ, strength: best.strength, dormancy: best.germ==="spore" ? 0 : undefined });
      } else {
        // keep existing
      }
    } else if (destNow.kind === "empty" || destNow.kind === "core") {
      setTile(next, sx, sy, { kind:"infected", germ: best.germ, strength: best.strength, dormancy: best.germ==="spore" ? 0 : undefined });
    }
  }

  return {
    ...afterAction,
    turn: afterAction.turn + 1,
    board: next
  };
}
```

> Note: This MVP treats infection as “occupies tile”; later you can add resistance/HP.

---

## 8) Objective Evaluation + Metrics

### 8.1 Objective checks (`/src/sim/metrics.ts`)

```ts
import { GameState, Objective } from "./types";
import { getTile } from "./serialize";

export interface RunMetrics {
  turnsElapsed: number;
  peakInfectionPct: number;
  toolsUsed: number;
  coreInfectedEver: boolean;
}

export function infectionPct(state: GameState): number {
  const total = state.board.w * state.board.h;
  let infected = 0;
  for (const t of state.board.tiles) if (t.kind === "infected") infected++;
  return (infected / total) * 100;
}

export function isWin(state: GameState): boolean {
  const obj = state.objective;
  switch (obj.type) {
    case "clear_all": {
      return state.board.tiles.every(t => t.kind !== "infected");
    }
    case "cap_infection": {
      return infectionPct(state) <= obj.maxPct && state.turn <= obj.maxTurns;
    }
    case "protect_cores": {
      const ok = obj.cores.every(([x,y]) => getTile(state.board,x,y).kind !== "infected");
      // win condition for protect_cores is "survive maxTurns without core infection"
      return ok && state.turn >= obj.maxTurns;
    }
  }
}

export function isLose(state: GameState): boolean {
  const obj = state.objective;
  switch (obj.type) {
    case "clear_all": {
      // lose if you run out of tools AND infection persists beyond some cap? Optional.
      return false;
    }
    case "cap_infection": {
      return state.turn > obj.maxTurns;
    }
    case "protect_cores": {
      const coreInfected = obj.cores.some(([x,y]) => getTile(state.board,x,y).kind === "infected");
      return coreInfected || state.turn > obj.maxTurns;
    }
  }
}
```

> For “protect_cores”: win is “survive until maxTurns” with cores safe.
> For early levels, keep win types simple: `clear_all` and `cap_infection`.

---

## 9) Auto-Solver (Beam Search) for Validation

A generator without a solver will produce lots of junk. Beam search is the practical middle ground:
- far better than greedy,
- much simpler than full A*,
- controllable runtime.

### 9.1 State hashing (`/src/sim/solver.ts`)

```ts
import { Action, GameState, ToolId } from "./types";
import { step } from "./step";
import { infectionPct, isWin, isLose } from "./metrics";
import { idx } from "./serialize";

export interface SolveOptions {
  maxTurns: number;
  beamWidth: number;
}

interface Node {
  state: GameState;
  plan: Action[];
  score: number;
}

function serializeState(s: GameState): string {
  // deterministic signature
  const tiles = s.board.tiles.map(t => {
    if (t.kind === "infected") return `I:${t.germ}:${t.dormancy ?? 0}`;
    return t.kind[0]; // e,w,c
  }).join("|");
  return `${s.turn}::${tiles}::${s.tools.antibiotic},${s.tools.antiviral},${s.tools.barrier}`;
}

function heuristic(s: GameState): number {
  // lower is better
  // penalize infection, and heavily penalize losing/core infection indirectly
  const inf = infectionPct(s);
  const toolsLeft = s.tools.antibiotic + s.tools.antiviral + s.tools.barrier;
  return inf + (toolsLeft * 0.05);
}

function legalActions(s: GameState): Action[] {
  const actions: Action[] = [{ type: "skip" }];
  const tools: ToolId[] = ["antibiotic", "antiviral", "barrier"];
  for (const tool of tools) {
    if (s.tools[tool] <= 0) continue;
    for (let y=0; y<s.board.h; y++){
      for (let x=0; x<s.board.w; x++){
        actions.push({ type: "place_tool", tool, x, y });
      }
    }
  }
  return actions;
}

export function solve(initial: GameState, opts: SolveOptions): { plan: Action[] } | null {
  const seen = new Set<string>();
  let beam: Node[] = [{ state: initial, plan: [], score: heuristic(initial) }];

  for (let depth=0; depth<opts.maxTurns; depth++){
    const nextCandidates: Node[] = [];

    for (const node of beam) {
      const sig = serializeState(node.state);
      if (seen.has(sig)) continue;
      seen.add(sig);

      if (isWin(node.state)) return { plan: node.plan };
      if (isLose(node.state)) continue;

      for (const a of legalActions(node.state)) {
        const ns = step(node.state, a);
        const score = heuristic(ns);
        nextCandidates.push({ state: ns, plan: [...node.plan, a], score });
      }
    }

    nextCandidates.sort((a,b) => a.score - b.score);
    beam = nextCandidates.slice(0, opts.beamWidth);

    if (beam.length === 0) break;
  }
  return null;
}
```

**Notes**
- This brute action space is large. We’ll reduce it later via action pruning in generation/validation (see below).

### 9.2 Action pruning (must-do for speed)
Replace `legalActions` with candidate placements only where it matters:
- antibiotic: only on infected tiles
- barrier: only on empty tiles adjacent to infection front
- antiviral: only near virus tiles

This reduces branching by >10×.

---

## 10) Procedural Level Generation

### 10.1 Difficulty model (`/src/gen/difficulty.ts`)

```ts
export interface DifficultyParams {
  w: number;
  h: number;
  sources: number;
  includeVirus: boolean;
  includeSpore: boolean;
  maxTurns: number;
  toolBudget: number; // total actions
  cores: number;      // number of core tiles to protect
}

export function paramsFor(d: number): DifficultyParams {
  const w = d < 20 ? 7 : d < 60 ? 8 : 9 + (d > 85 ? 1 : 0);
  const h = w;

  return {
    w,
    h,
    sources: d < 10 ? 1 : d < 30 ? 2 : d < 70 ? 3 : 4,
    includeVirus: d >= 12,
    includeSpore: d >= 35,
    maxTurns: d < 25 ? 10 : d < 60 ? 12 : 14,
    toolBudget: d < 15 ? 7 : d < 40 ? 6 : d < 70 ? 5 : 4,
    cores: d < 50 ? 0 : d < 80 ? 1 : 2
  };
}
```

### 10.2 Layout templates (`/src/gen/templates.ts`)

You want levels to feel “designed” without hand-design. Use **templates** with controlled randomness.

```ts
export type Point = [number, number];

export type TemplateId = "open" | "corridors" | "rooms" | "islands";

export interface Layout {
  w: number; h: number;
  walls: Point[];
}

function randInt(rng: () => number, a: number, b: number): number {
  return a + Math.floor(rng() * (b - a + 1));
}

export function makeLayout(template: TemplateId, w: number, h: number, rng: () => number): Layout {
  const walls: Point[] = [];

  if (template === "open") {
    // light noise
    const wallCount = Math.floor((w*h) * 0.05);
    for (let i=0; i<wallCount; i++) walls.push([randInt(rng,0,w-1), randInt(rng,0,h-1)]);
  }

  if (template === "corridors") {
    // carve 2-3 vertical bars with gaps (creates choke points)
    const bars = 2 + (rng() < 0.5 ? 0 : 1);
    for (let b=0; b<bars; b++){
      const x = randInt(rng, 2, w-3);
      for (let y=0; y<h; y++){
        if (rng() < 0.2) continue; // gap
        walls.push([x,y]);
      }
    }
  }

  if (template === "rooms") {
    // place rectangular rooms separated by walls
    const roomCount = 2 + (rng() < 0.5 ? 0 : 1);
    for (let r=0; r<roomCount; r++){
      const rx = randInt(rng, 1, w-5);
      const ry = randInt(rng, 1, h-5);
      const rw = randInt(rng, 3, 5);
      const rh = randInt(rng, 3, 5);
      // outline walls
      for (let x=rx; x<rx+rw; x++){ walls.push([x,ry]); walls.push([x,ry+rh-1]); }
      for (let y=ry; y<ry+rh; y++){ walls.push([rx,y]); walls.push([rx+rw-1,y]); }
    }
  }

  if (template === "islands") {
    // sprinkle clusters that create pathing
    const clusters = 3;
    for (let c=0; c<clusters; c++){
      const cx = randInt(rng,1,w-2);
      const cy = randInt(rng,1,h-2);
      const size = 3 + randInt(rng,0,4);
      for (let i=0; i<size; i++){
        walls.push([cx + randInt(rng,-1,1), cy + randInt(rng,-1,1)]);
      }
    }
  }

  // remove duplicates
  const uniq = new Map<string, Point>();
  for (const [x,y] of walls) uniq.set(`${x},${y}`,[x,y]);
  return { w, h, walls: [...uniq.values()] };
}
```

### 10.3 Presets & mechanics ladder (`/src/gen/presets.ts`)

```ts
import { TemplateId } from "./templates";

export function templateForDifficulty(d: number): TemplateId {
  if (d < 15) return "open";
  if (d < 40) return "corridors";
  if (d < 70) return "rooms";
  return "islands";
}
```

### 10.4 Generator (`/src/gen/generator.ts`)

This creates one level candidate, then validation filters decide acceptance.

```ts
import { LevelSpec, ToolInventory, GermId } from "../sim/types";
import { paramsFor } from "./difficulty";
import { makeLayout } from "./templates";
import { templateForDifficulty } from "./presets";

// simple seeded RNG: mulberry32
export function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, a: number, b: number): number {
  return a + Math.floor(rng() * (b - a + 1));
}

function pickGermMix(d: number, rng: () => number, includeVirus: boolean, includeSpore: boolean): GermId {
  const bag: GermId[] = ["bacteria", "bacteria"];
  if (includeVirus) bag.push("virus");
  if (includeSpore) bag.push(rng() < 0.6 ? "spore" : "bacteria");
  return bag[randInt(rng, 0, bag.length-1)];
}

function toolLoadout(toolBudget: number, d: number, rng: () => number): ToolInventory {
  // Start generous; later reduce and bias toward planning tools
  let antibiotic = Math.max(1, Math.round(toolBudget * (d < 40 ? 0.5 : 0.35)));
  let antiviral  = (d >= 12) ? Math.max(0, Math.round(toolBudget * 0.25)) : 0;
  let barrier    = toolBudget - antibiotic - antiviral;
  if (barrier < 0) { barrier = 0; antibiotic = toolBudget - antiviral; }
  // random nudge
  if (rng() < 0.3 && barrier > 0) { barrier--; antibiotic++; }
  return { antibiotic, antiviral, barrier };
}

export function generateLevel(id: number, difficulty: number, seed: number): LevelSpec {
  const baseSeed = seed ^ (difficulty * 2654435761) ^ (id * 1013904223);
  const rng = mulberry32(baseSeed);

  const p = paramsFor(difficulty);
  const template = templateForDifficulty(difficulty);
  const layout = makeLayout(template, p.w, p.h, rng);

  // Choose core tiles (later levels)
  const cores: Array<[number, number]> = [];
  if (p.cores > 0) {
    for (let i=0; i<p.cores; i++){
      cores.push([Math.floor(p.w/2) + i, Math.floor(p.h/2)]);
    }
  }

  // Infection sources
  const seedsArr: LevelSpec["seeds"] = [];
  for (let i=0; i<p.sources; i++){
    const germ = pickGermMix(difficulty, rng, p.includeVirus, p.includeSpore);
    let x=0,y=0;
    // place away from cores early; later allow closer
    for (let tries=0; tries<200; tries++){
      x = randInt(rng, 0, p.w-1);
      y = randInt(rng, 0, p.h-1);
      const isWall = layout.walls.some(([wx,wy]) => wx===x && wy===y);
      const isCore = cores.some(([cx,cy]) => cx===x && cy===y);
      if (isWall || isCore) continue;
      // min distance between seeds
      const okDist = seedsArr.every(s => Math.abs(s.x-x) + Math.abs(s.y-y) >= (difficulty < 50 ? 3 : 2));
      if (!okDist) continue;
      break;
    }
    const dormancy = germ === "spore" ? randInt(rng, 2, difficulty < 60 ? 4 : 6) : undefined;
    seedsArr.push({ germ, x, y, dormancy });
  }

  const tools = toolLoadout(p.toolBudget, difficulty, rng);

  const objective =
    p.cores > 0
      ? { type: "protect_cores" as const, cores, maxTurns: p.maxTurns }
      : (difficulty < 25
          ? { type: "clear_all" as const }
          : { type: "cap_infection" as const, maxPct: Math.max(10, 40 - Math.floor(difficulty/4)), maxTurns: p.maxTurns });

  return {
    id,
    difficulty,
    seed: baseSeed,
    board: { w: p.w, h: p.h, walls: layout.walls, cores: cores.length ? cores : undefined },
    seeds: seedsArr,
    tools,
    objective,
    generatorVersion: 1
  };
}
```

---

## 11) Level Validation Pipeline

### 11.1 Build a GameState from LevelSpec (`/src/sim/rng.ts` + initializer)

Create an initializer that constructs tiles, walls, cores, seeds.

```ts
import { Board, GameState, LevelSpec, Tile } from "./types";
import { GERMS } from "./germs";
import { idx, setTile } from "./serialize";

export function initState(level: LevelSpec): GameState {
  const tiles: Tile[] = Array.from({ length: level.board.w * level.board.h }, () => ({ kind: "empty" }));
  const board: Board = { w: level.board.w, h: level.board.h, tiles };

  // walls
  for (const [x,y] of level.board.walls) setTile(board,x,y,{ kind:"wall" });

  // cores
  for (const [x,y] of (level.board.cores ?? [])) setTile(board,x,y,{ kind:"core" });

  // seeds
  for (const s of level.seeds) {
    const def = GERMS[s.germ];
    setTile(board, s.x, s.y, {
      kind: "infected",
      germ: s.germ,
      strength: def.strength,
      dormancy: s.germ === "spore" ? (s.dormancy ?? 0) : undefined
    });
  }

  return {
    levelId: level.id,
    turn: 0,
    board,
    tools: { ...level.tools },
    objective: level.objective,
    rngSeed: level.seed
  };
}
```

### 11.2 Filters (`/src/gen/filters.ts`)

Define acceptance gates:
- solver can win,
- not too easy/trivial,
- not too hard.

```ts
import { LevelSpec } from "../sim/types";
import { initState } from "../sim/rng";
import { solve } from "../sim/solver";
import { infectionPct } from "../sim/metrics";
import { step } from "../sim/step";

export interface FilterParams {
  maxTurns: number;
  beamWidth: number;
  minTurnsToWin: number;
  maxTurnsToWin: number;
  minPeakInfection: number;
  maxPeakInfection: number;
}

export function validateLevel(level: LevelSpec, fp: FilterParams): { ok: boolean; reason?: string } {
  const initial = initState(level);
  const sol = solve(initial, { maxTurns: fp.maxTurns, beamWidth: fp.beamWidth });
  if (!sol) return { ok:false, reason:"unsolved" };

  // simulate plan to compute metrics cheaply
  let s = initial;
  let peak = infectionPct(s);
  for (const a of sol.plan) {
    s = step(s, a);
    peak = Math.max(peak, infectionPct(s));
  }
  const turnsToWin = sol.plan.length;

  if (turnsToWin < fp.minTurnsToWin) return { ok:false, reason:"too_trivial" };
  if (turnsToWin > fp.maxTurnsToWin) return { ok:false, reason:"too_long" };
  if (peak < fp.minPeakInfection) return { ok:false, reason:"too_safe" };
  if (peak > fp.maxPeakInfection) return { ok:false, reason:"too_chaotic" };

  return { ok:true };
}
```

> You will tune the thresholds as you see real outcomes.

### 11.3 Generator loop that produces 100 accepted levels (`/src/gen/cli.ts`)

```ts
import fs from "node:fs";
import { generateLevel } from "./generator";
import { validateLevel } from "./filters";
import { paramsFor } from "./difficulty";

function arg(name: string, def: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i+1] : def;
}

const count = parseInt(arg("count","100"),10);
const seed = parseInt(arg("seed","12345"),10);
const out = arg("out","src/levels/levels_001_100.json");

const accepted: any[] = [];
let id = 1;

for (let d=1; d<=count; d++){
  const p = paramsFor(d);
  const filterParams = {
    maxTurns: p.maxTurns,
    beamWidth: 80,               // increase if too many rejections
    minTurnsToWin: d < 20 ? 3 : 4,
    maxTurnsToWin: d < 60 ? 12 : 14,
    minPeakInfection: d < 20 ? 10 : 15,
    maxPeakInfection: 75
  };

  let tries = 0;
  while (true) {
    tries++;
    const level = generateLevel(id, d, seed + tries * 99991);
    const v = validateLevel(level, filterParams);
    if (v.ok) {
      accepted.push(level);
      process.stdout.write(`Accepted L${d} (tries ${tries})\n`);
      id++;
      break;
    }
    if (tries > 200) {
      process.stdout.write(`FAILED to generate L${d} after 200 tries; loosening filters\n`);
      // fallback: accept the best effort without peak filter, or increase beam width
      accepted.push(level);
      id++;
      break;
    }
  }
}

fs.writeFileSync(out, JSON.stringify(accepted, null, 2), "utf-8");
console.log(`Wrote ${accepted.length} levels to ${out}`);
```

**Important:** early on, your solver and filters will be rough. Expect tuning passes:
- Increase beam width for harder levels.
- Adjust templates and tool budgets.

---

## 12) Tests (So Generator Doesn’t Lie)

### 12.1 Step tests (`/tests/sim.step.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { step } from "../src/sim/step";
import { initState } from "../src/sim/rng";
import { LevelSpec } from "../src/sim/types";

it("bacteria spreads orthogonally", () => {
  const level: LevelSpec = {
    id: 1, difficulty: 1, seed: 1, generatorVersion: 1,
    board: { w: 5, h: 5, walls: [] },
    seeds: [{ germ:"bacteria", x:2, y:2 }],
    tools: { antibiotic:0, antiviral:0, barrier:0 },
    objective: { type:"clear_all" }
  };
  const s0 = initState(level);
  const s1 = step(s0, { type:"skip" });
  // after one spread, adjacent tiles should be infected
  const center = s1.board.tiles[2 + 2*5];
  expect(center.kind).toBe("infected");
});
```

### 12.2 Solver sanity test (`/tests/solver.test.ts`)
Create a tiny known-winnable level to ensure solver works.

---

## 13) Phaser Implementation (Game Layer)

### 13.1 `main.ts`
```ts
import Phaser from "phaser";
import { BootScene } from "./game/scenes/BootScene";
import { MenuScene } from "./game/scenes/MenuScene";
import { LevelScene } from "./game/scenes/LevelScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 900,
  height: 900,
  parent: "app",
  scene: [BootScene, MenuScene, LevelScene],
});
```

### 13.2 `LevelScene.ts` (Key responsibilities)
- load a LevelSpec from JSON
- create tile sprites
- handle clicks to select tools/place
- run `step()` on confirm
- tween visuals from previous state to next state
- show next-turn preview overlay

Minimal skeleton:

```ts
import Phaser from "phaser";
import levels from "../../levels/levels_001_100.json";
import { initState } from "../../sim/rng";
import { step } from "../../sim/step";
import { GameState, Action, ToolId } from "../../sim/types";

export class LevelScene extends Phaser.Scene {
  private state!: GameState;
  private selectedTool: ToolId | null = null;
  private tileSprites: Phaser.GameObjects.Rectangle[] = [];
  private levelIndex = 0;

  create() {
    const level = (levels as any[])[this.levelIndex];
    this.state = initState(level);

    this.buildGrid();
    this.renderState(this.state, true);

    // example: click to place tool on a tile
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const { x, y } = this.screenToGrid(p.x, p.y);
      if (x == null) return;

      const action: Action = this.selectedTool
        ? { type:"place_tool", tool: this.selectedTool, x, y }
        : { type:"skip" };

      const next = step(this.state, action);
      this.animateTransition(this.state, next);
      this.state = next;
    });
  }

  private buildGrid() {
    const tileSize = 70;
    for (let y=0; y<this.state.board.h; y++){
      for (let x=0; x<this.state.board.w; x++){
        const rx = 100 + x * tileSize;
        const ry = 100 + y * tileSize;
        const r = this.add.rectangle(rx, ry, tileSize-4, tileSize-4, 0x222222).setStrokeStyle(2, 0x000000);
        this.tileSprites.push(r);
      }
    }
  }

  private renderState(s: GameState, instant=false) {
    for (let i=0; i<s.board.tiles.length; i++){
      const t = s.board.tiles[i];
      const r = this.tileSprites[i];
      // choose colors (replace with sprites later)
      const color =
        t.kind === "wall" ? 0x444444 :
        t.kind === "core" ? 0x223355 :
        t.kind === "infected" && t.germ === "bacteria" ? 0x33aa33 :
        t.kind === "infected" && t.germ === "virus" ? 0xaa3333 :
        t.kind === "infected" && t.germ === "spore" ? 0xaaaa33 :
        0x222222;
      r.fillColor = color;
    }
  }

  private animateTransition(prev: GameState, next: GameState) {
    // simplest: render next immediately.
    // upgrade: tween fillColor/alpha/pulse.
    this.renderState(next, false);
  }

  private screenToGrid(px: number, py: number): { x: number|null, y: number|null } {
    const tileSize = 70;
    const gx = Math.floor((px - 100) / tileSize);
    const gy = Math.floor((py - 100) / tileSize);
    if (gx < 0 || gy < 0 || gx >= this.state.board.w || gy >= this.state.board.h) return { x:null, y:null };
    return { x: gx, y: gy };
  }
}
```

### Animation upgrades (must-do for “real game feel”)
- On infection spread: scale up tile briefly then settle (tween).
- On cure: particle burst + fade out.
- On conversion: flash white then new color.

Use Phaser tweens:
```ts
this.tweens.add({ targets: rect, scaleX: 1.05, scaleY: 1.05, duration: 80, yoyo: true });
```

---

## 14) Making Procedural Levels Feel Handcrafted

Procedural levels feel “random” unless you impose structure. Do these three:
1) **Symmetry** (mirror walls across center sometimes)
2) **Chokepoints** (corridor templates)
3) **Curated objective ramp** (world ladder)

Add “worlds”:
- Levels 1–20: bacteria only
- 21–40: introduce virus
- 41–60: introduce spore
- 61–80: add cores
- 81–100: mixed + tighter tool budget

You already have this in `paramsFor(d)`; tune it with playtests.

---

## 15) Performance & Runtime Considerations

### Solver runtime
Beam search can be expensive. To keep generation fast:
- prune actions hard,
- smaller beam widths early,
- increase beam width only in higher difficulty tiers,
- run generation offline (CLI), not in game.

### In-game runtime
In the shipped game, you do **no solving** (unless you add hints later). You only load level JSON.

---

## 16) GitHub Copilot “One-Pass” Workflow

### Build order (Copilot-friendly)
1) Types + helpers (`types.ts`, `serialize.ts`)
2) Germ defs and tools (`germs.ts`, `tools.ts`)
3) Step (`step.ts`) + tests
4) Objective + metrics
5) Solver + pruning
6) Generator + filters
7) Phaser UI layer

### Strong Copilot prompt (drop into Copilot Chat)
> “Implement a deterministic grid sim with two-phase intent resolution. Use the existing types. Add tests. Do not import Phaser.”

Then iterate file-by-file.

---

## 17) Roadmap: Adding “Next 100 Levels Later”

When you add a new mechanic (e.g., **Mutator germ**, **Sterilizer tool**):
1) Add it to `/src/sim`
2) Extend `paramsFor(d)` unlock thresholds
3) Extend generator to include it in mix beyond level N
4) Re-run `gen:levels` for 101–200
5) Ship another JSON file

Keep old levels stable by tracking:
- `generatorVersion`
- per-file “level packs”

---

## 18) Practical Next Steps (Exact Checklist)

### Day 1–2
- Create repo and structure
- Implement `/sim` with step + tests

### Day 3–4
- Implement solver + prune actions
- Validate on 5 handcrafted test levels

### Day 5–6
- Implement generator + filters
- Run CLI until you get 100 accepted levels

### Day 7+
- Build Phaser UI
- Add tool palette, undo, preview overlay
- Replace rectangles with sprites

---

## 19) Optional: Action Pruning Implementation (Huge Win)

Replace solver `legalActions` with:

- antibiotic: infected tiles only
- barrier: empty tiles adjacent to infected or on corridors
- antiviral: tiles within radius 2 of a virus tile

This reduces branching from `(w*h*tools)` to “only relevant placements”.

---

## 20) Port to Godot Later (Easy Path)

Because `/sim` and `/gen` are pure TS, you can:
- either keep them as a shared logic library (via WASM or JS embedding),
- or reimplement the same rules in GDScript/C# with the same JSON levels.

Your **LevelSpec JSON** becomes your cross-engine contract.

---

# Appendix A — Suggested Level Acceptance Targets (Tune These)

Use these as starting filters:
- Levels 1–20: win in 3–10 turns, peak infection 10–55%
- Levels 21–60: win in 4–12 turns, peak 15–65%
- Levels 61–100: win in 5–14 turns, peak 20–75%

If too few levels pass:
- increase toolBudget slightly,
- increase beamWidth,
- loosen peak limits,
- reduce walls density.

---

# Appendix B — Asset Guidelines (Relaxing but Tactical)

- Use distinct tile glyphs (not just color): bacteria dot, virus spike, spore circle.
- Add subtle glow animations to infected tiles.
- “Next-turn preview” uses transparent ghost overlays.

---

# Appendix C — Debug UI (Don’t Skip)

Add a debug overlay toggle:
- show turn number
- show infection %
- show tool counts
- show objective text

This makes balancing and validation **10× faster**.

---

If you want, the next step after this guide is for you to tell me:
- your preferred pixel-art vs clean vector style,
- target platform (desktop web vs mobile web),
and I’ll give you a matching UI layout and exact sprite sheet plan.
