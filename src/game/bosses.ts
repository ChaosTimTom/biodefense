import type { BossNode, BossPhaseSpec, BossSpec, BossWaveSeed, LevelSpec, PathogenType } from "../sim/types";

function dedupeNodes(nodes: BossNode[]): BossNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const k = `${node.x},${node.y}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function dedupeSeeds(seeds: BossWaveSeed[]): BossWaveSeed[] {
  const seen = new Set<string>();
  return seeds.filter((seed) => {
    const k = `${seed.type}:${seed.x},${seed.y}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function clampNode(x: number, y: number, w: number, h: number): BossNode {
  return {
    x: Math.max(0, Math.min(w - 1, x)),
    y: Math.max(0, Math.min(h - 1, y)),
  };
}

function crossRing(cx: number, cy: number, radius: number, w: number, h: number): BossNode[] {
  return dedupeNodes([
    clampNode(cx - radius, cy, w, h),
    clampNode(cx + radius, cy, w, h),
    clampNode(cx, cy - radius, w, h),
    clampNode(cx, cy + radius, w, h),
  ]);
}

function diagonalRing(cx: number, cy: number, radius: number, w: number, h: number): BossNode[] {
  return dedupeNodes([
    clampNode(cx - radius, cy - radius, w, h),
    clampNode(cx + radius, cy - radius, w, h),
    clampNode(cx - radius, cy + radius, w, h),
    clampNode(cx + radius, cy + radius, w, h),
  ]);
}

function lineCells(cx: number, cy: number, radius: number, w: number, h: number): BossNode[] {
  return dedupeNodes([
    clampNode(cx - radius, cy, w, h),
    clampNode(cx - 1, cy, w, h),
    clampNode(cx, cy, w, h),
    clampNode(cx + 1, cy, w, h),
    clampNode(cx + radius, cy, w, h),
  ]);
}

function makeArenaWalls(cx: number, cy: number, w: number, h: number): BossNode[] {
  return dedupeNodes([
    clampNode(cx - 2, cy - 2, w, h),
    clampNode(cx - 1, cy - 2, w, h),
    clampNode(cx + 1, cy - 2, w, h),
    clampNode(cx + 2, cy - 2, w, h),
    clampNode(cx - 2, cy + 2, w, h),
    clampNode(cx - 1, cy + 2, w, h),
    clampNode(cx + 1, cy + 2, w, h),
    clampNode(cx + 2, cy + 2, w, h),
    clampNode(cx - 2, cy - 1, w, h),
    clampNode(cx - 2, cy + 1, w, h),
    clampNode(cx + 2, cy - 1, w, h),
    clampNode(cx + 2, cy + 1, w, h),
  ]);
}

function worldBossName(world: number): { name: string; subtitle: string; intro: string; victoryLine: string } {
  switch (world) {
    case 1:
      return {
        name: "Agar Hydra",
        subtitle: "Seal the relay pads to crack the petri shell.",
        intro: "The colony fused into a reactor-core organism. Seize every glowing relay in a phase to expose its heart.",
        victoryLine: "The dish stabilizes. The Hydra implodes into harmless residue.",
      };
    case 2:
      return {
        name: "Pulse Vector",
        subtitle: "Control the capillary relays before the surge hits.",
        intro: "A bloodstream super-vector is pulsing through the chamber. Lock each relay lane before it can reroute the outbreak.",
        victoryLine: "Pulse collapsed. Flow restored.",
      };
    case 3:
      return {
        name: "Mycelial Heart",
        subtitle: "Starve the fungal nerve net one chamber at a time.",
        intro: "The tissue core is acting like a living mycelial engine. Break every anchor cluster to sever the network.",
        victoryLine: "The tissue clears as the root-heart dries out.",
      };
    case 4:
    default:
      return {
        name: "Pandemic Crown",
        subtitle: "Shatter the quarantine relays across all fronts.",
        intro: "The outbreak has formed a command crown. Phase-lock every relay before the final cascade consumes the zone.",
        victoryLine: "Containment holds. The crown collapses into static ash.",
      };
  }
}

function pickWaveTypes(world: number, fallback: PathogenType[]): PathogenType[] {
  switch (world) {
    case 1:
      return ["coccus", "mold", "bacillus"];
    case 2:
      return ["influenza", "coccus", "retrovirus"];
    case 3:
      return ["yeast", "spirillum", "retrovirus"];
    case 4:
      return ["phage", "spore", "spirillum"];
    default:
      return fallback.slice(0, 3);
  }
}

export function createBossSpec(spec: LevelSpec): BossSpec {
  const w = spec.grid.w;
  const h = spec.grid.h;
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const meta = worldBossName(spec.world);
  const waveTypes = pickWaveTypes(spec.world, spec.seeds.map((seed) => seed.type));

  const initialSeeds = dedupeSeeds([
    { type: waveTypes[0] ?? "coccus", x: Math.max(0, cx - 1), y: cy },
    { type: waveTypes[0] ?? "coccus", x: Math.min(w - 1, cx + 1), y: cy },
    { type: waveTypes[1] ?? waveTypes[0] ?? "coccus", x: cx, y: Math.max(0, cy - 1) },
    { type: waveTypes[1] ?? waveTypes[0] ?? "coccus", x: cx, y: Math.min(h - 1, cy + 1) },
  ]);

  const phases: BossPhaseSpec[] = [
    {
      label: "Shell Breach",
      instruction: "Occupy every cyan relay to crack the outer shell.",
      relays: crossRing(cx, cy, 3, w, h),
      purgeCells: lineCells(cx, cy, 2, w, h),
      reinforcements: dedupeSeeds([
        { type: waveTypes[1] ?? waveTypes[0] ?? "coccus", x: 1, y: 1 },
        { type: waveTypes[1] ?? waveTypes[0] ?? "coccus", x: w - 2, y: 1 },
      ]),
    },
    {
      label: "Membrane Collapse",
      instruction: "Hold the diagonal relays before the boss reroutes growth.",
      relays: diagonalRing(cx, cy, 3, w, h),
      purgeCells: dedupeNodes([
        clampNode(cx - 1, cy - 1, w, h),
        clampNode(cx + 1, cy - 1, w, h),
        clampNode(cx - 1, cy + 1, w, h),
        clampNode(cx + 1, cy + 1, w, h),
      ]),
      reinforcements: dedupeSeeds([
        { type: waveTypes[2] ?? waveTypes[0] ?? "coccus", x: 1, y: h - 2 },
        { type: waveTypes[2] ?? waveTypes[0] ?? "coccus", x: w - 2, y: h - 2 },
      ]),
    },
    {
      label: "Core Shutdown",
      instruction: "Seal the final relay ring to finish the organism.",
      relays: dedupeNodes([
        clampNode(cx - 3, cy - 1, w, h),
        clampNode(cx + 3, cy + 1, w, h),
        clampNode(cx - 1, cy + 3, w, h),
        clampNode(cx + 1, cy - 3, w, h),
      ]),
      purgeCells: dedupeNodes([
        clampNode(cx, cy, w, h),
        clampNode(cx - 1, cy, w, h),
        clampNode(cx + 1, cy, w, h),
        clampNode(cx, cy - 1, w, h),
        clampNode(cx, cy + 1, w, h),
      ]),
      reinforcements: [],
    },
  ];

  return {
    id: `w${spec.world}_boss`,
    name: meta.name,
    subtitle: meta.subtitle,
    intro: meta.intro,
    victoryLine: meta.victoryLine,
    arenaWalls: makeArenaWalls(cx, cy, w, h),
    initialSeeds,
    phases,
  };
}

export function decorateBossLevel(spec: LevelSpec): LevelSpec {
  const boss = createBossSpec(spec);
  const seeds = dedupeSeeds([
    ...spec.seeds,
    ...boss.initialSeeds,
  ]).map((seed) => ({ type: seed.type, x: seed.x, y: seed.y }));

  const seedKeys = new Set(seeds.map((seed) => `${seed.x},${seed.y}`));
  const wallKeys = new Set(spec.walls.map(([x, y]) => `${x},${y}`));
  const walls = [...spec.walls];
  for (const wall of boss.arenaWalls) {
    const key = `${wall.x},${wall.y}`;
    if (seedKeys.has(key) || wallKeys.has(key)) continue;
    wallKeys.add(key);
    walls.push([wall.x, wall.y]);
  }

  const boostedTools = { ...spec.tools };
  boostedTools.wall = Math.max(boostedTools.wall, 4);

  return {
    ...spec,
    title: `Boss: ${boss.name}`,
    hint: boss.subtitle,
    walls,
    seeds,
    tools: boostedTools,
    objective: { type: "clear_all" },
    boss,
  };
}
