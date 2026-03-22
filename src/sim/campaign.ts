import type { LevelSpec, PathogenType } from "./types";
import { generateSeededLevel } from "./generator";
import { WORLD_1_BLUEPRINTS } from "./campaign/world1";
import { WORLD_1_LEVELS } from "./campaign/world1-levels";
import { WORLD_2_BLUEPRINTS } from "./campaign/world2";
import { WORLD_2_LEVELS } from "./campaign/world2-levels";
import { WORLD_3_BLUEPRINTS } from "./campaign/world3";
import { WORLD_3_LEVELS } from "./campaign/world3-levels";
import { WORLD_4_BLUEPRINTS } from "./campaign/world4";
import { WORLD_4_LEVELS } from "./campaign/world4-levels";
import type { CampaignBlueprint } from "./campaign/types";

export const CAMPAIGN_LEVELS_PER_WORLD = 50;
export const CAMPAIGN_WORLD_COUNT = 4;
export const CAMPAIGN_TOTAL_LEVELS = CAMPAIGN_LEVELS_PER_WORLD * CAMPAIGN_WORLD_COUNT;

const WORLD_NAMES: Record<number, string> = {
  1: "Petri Dish",
  2: "Bloodstream",
  3: "Tissue",
  4: "Pandemic",
};

const PATHOGEN_LABELS: Record<PathogenType, string> = {
  coccus: "Coccus",
  bacillus: "Bacillus",
  spirillum: "Spirillum",
  influenza: "Influenza",
  retrovirus: "Retrovirus",
  phage: "Phage",
  mold: "Mold",
  yeast: "Yeast",
  spore: "Spore",
};

const WORLD_BLUEPRINTS: Record<number, CampaignBlueprint[]> = {
  1: WORLD_1_BLUEPRINTS,
  2: WORLD_2_BLUEPRINTS,
  3: WORLD_3_BLUEPRINTS,
  4: WORLD_4_BLUEPRINTS,
};

const WORLD_AUTHORED_LEVELS: Partial<Record<number, LevelSpec[]>> = {
  1: WORLD_1_LEVELS,
  2: WORLD_2_LEVELS,
  3: WORLD_3_LEVELS,
  4: WORLD_4_LEVELS,
};

const WORLD_CACHE = new Map<number, LevelSpec[]>();

function buildBlueprints(worldId: number): CampaignBlueprint[] {
  return WORLD_BLUEPRINTS[worldId] ?? [];
}

function buildCampaignTitle(worldId: number, level: number, spec: LevelSpec): string {
  const explicit = buildBlueprints(worldId).find((item) => item.level === level)?.title;
  if (explicit) return explicit;
  if (level === 50 && spec.boss) return `Boss: ${spec.boss.name}`;
  if (level <= 3) return ["First Contact", "Containment Drill", "Cell Blockade"][level - 1] ?? `Level ${level}`;
  if (level <= 10) return `Opening Pressure ${level - 3}`;
  if (level <= 18) return `Split Response ${level - 10}`;
  if (level <= 24) return `Tactical Breach ${level - 18}`;
  if (level <= 35) return `Crisis Pattern ${level - 24}`;
  if (level <= 49) return `Endgame Surge ${level - 35}`;
  return `${WORLD_NAMES[worldId]} Finale`;
}

function buildCampaignHint(level: number, spec: LevelSpec): string {
  const localLevel = ((spec.id - 1) % CAMPAIGN_LEVELS_PER_WORLD) + 1;
  const explicit = buildBlueprints(spec.world).find((item) => item.level === localLevel)?.hint;
  if (explicit) return explicit;
  const types = [...new Set(spec.seeds.map((seed) => seed.type))];
  const typeText = types.map((type) => PATHOGEN_LABELS[type]).join(" + ");

  if (level <= 3) return `Tutorial pressure: learn ${typeText} movement and block the first spread line.`;
  if (level <= 10) return `Single-front puzzle. Read ${typeText} reach and stop the snowball before it starts.`;
  if (level <= 18) return `Two-front response. Stabilize the board before expanding your medicine net.`;
  if (level <= 24) return `Mixed outbreak: ${typeText}. Use dead-zones and walls to buy tempo.`;
  if (level <= 35) return `Mid-campaign pressure. Protect key lanes first, then collapse the infection pockets.`;
  if (level <= 49) return `Mastery test. Expect tighter budgets, wider fronts, and less room for wasted placements.`;
  return spec.boss ? spec.boss.subtitle : "Final containment push.";
}

function recentSimilarityPenalty(spec: LevelSpec, recent: LevelSpec[]): number {
  const currentTypes = [...new Set(spec.seeds.map((seed) => seed.type))].sort().join("|");
  const currentArea = spec.grid.w * spec.grid.h;
  const currentWallBucket = Math.round(spec.walls.length / 4);

  let penalty = 0;
  for (const prev of recent) {
    const prevTypes = [...new Set(prev.seeds.map((seed) => seed.type))].sort().join("|");
    if (prev.grid.w === spec.grid.w && prev.grid.h === spec.grid.h) penalty += 2;
    if (prev.objective.type === spec.objective.type) penalty += 0.8;
    if (prevTypes === currentTypes) penalty += 1.4;
    if (Math.abs(prev.walls.length / 4 - currentWallBucket) < 1) penalty += 0.7;
    if (Math.abs(prev.grid.w * prev.grid.h - currentArea) <= 8) penalty += 0.6;
  }
  return penalty;
}

function candidateScore(
  blueprint: CampaignBlueprint,
  spec: LevelSpec,
  recent: LevelSpec[],
): number {
  let score = 0;

  if (blueprint.objective === "either" || spec.objective.type === blueprint.objective) {
    score += blueprint.objective === "either" ? 1 : 3;
  } else {
    score -= 4;
  }

  const typeCount = new Set(spec.seeds.map((seed) => seed.type)).size;
  if (blueprint.level <= 10) {
    score += typeCount === 1 ? 2.5 : -2;
  } else if (blueprint.level <= 20) {
    score += typeCount >= 1 ? 1 : 0;
  } else {
    score += typeCount >= 2 ? 1.5 : -0.5;
  }

  const area = spec.grid.w * spec.grid.h;
  const targetArea =
    blueprint.level <= 10 ? 80 :
    blueprint.level <= 20 ? 100 :
    blueprint.level <= 35 ? 132 :
    160;
  score -= Math.abs(area - targetArea) / 14;

  score -= recentSimilarityPenalty(spec, recent);

  if (blueprint.level === 50 && spec.boss) score += 10;

  return score;
}

function curateLevel(worldId: number, blueprint: CampaignBlueprint, recent: LevelSpec[]): LevelSpec {
  let bestSpec: LevelSpec | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  const candidateCount = blueprint.level <= 10 ? 4 : 6;

  for (let i = 0; i < candidateCount; i++) {
    const spec = generateSeededLevel(worldId, blueprint.recipeLevel, blueprint.seed + i * 9_973);
    const score = candidateScore(blueprint, spec, recent);
    if (score > bestScore || bestSpec == null) {
      bestScore = score;
      bestSpec = spec;
    }
  }

  const finalSpec = bestSpec!;
  return {
    ...finalSpec,
    id: (worldId - 1) * CAMPAIGN_LEVELS_PER_WORLD + blueprint.level,
    title: buildCampaignTitle(worldId, blueprint.level, finalSpec),
    hint: buildCampaignHint(blueprint.level, finalSpec),
  };
}

function buildWorld(worldId: number): LevelSpec[] {
  const authored = WORLD_AUTHORED_LEVELS[worldId];
  if (authored) return authored;

  const blueprints = buildBlueprints(worldId);
  const levels: LevelSpec[] = [];

  for (const blueprint of blueprints) {
    const recent = levels.slice(Math.max(0, levels.length - 4));
    levels.push(curateLevel(worldId, blueprint, recent));
  }

  return levels;
}

export function getCampaignWorldLevels(worldId: number): LevelSpec[] {
  if (!WORLD_CACHE.has(worldId)) {
    WORLD_CACHE.set(worldId, buildWorld(worldId));
  }
  return WORLD_CACHE.get(worldId) ?? [];
}

export function getCampaignLevel(levelId: number): LevelSpec | undefined {
  const worldId = Math.floor((levelId - 1) / CAMPAIGN_LEVELS_PER_WORLD) + 1;
  const levels = getCampaignWorldLevels(worldId);
  return levels.find((level) => level.id === levelId);
}
