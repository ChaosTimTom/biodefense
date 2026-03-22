import type { LevelSpec } from "./types";
import { generateSeededLevel } from "./generator";

export interface EndlessRunState {
  runSeed: number;
  round: number;
  totalScore: number;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

function endlessWorldForRound(round: number): number {
  if (round <= 4) return 1;
  if (round <= 8) return 2;
  if (round <= 12) return 3;
  return 4;
}

function endlessProxyLevel(round: number): number {
  const scaled = 6 + round * 3;
  if (scaled === 25) return 26;
  return Math.min(49, scaled);
}

export function createEndlessRunState(seed = randomSeed()): EndlessRunState {
  return {
    runSeed: seed,
    round: 1,
    totalScore: 0,
  };
}

export function advanceEndlessRun(state: EndlessRunState, roundScore: number): EndlessRunState {
  return {
    ...state,
    round: state.round + 1,
    totalScore: state.totalScore + roundScore,
  };
}

export function generateEndlessLevel(state: EndlessRunState): LevelSpec {
  const world = endlessWorldForRound(state.round);
  const proxyLevel = endlessProxyLevel(state.round);
  const seed = state.runSeed + state.round * 104729 + world * 8191;
  const base = generateSeededLevel(world, proxyLevel, seed);

  const fasterTurnLimit = Math.max(4, Math.min(8, base.turnLimit - 1));
  const tighterPar = Math.max(3, Math.min(fasterTurnLimit, base.parTurns - 1));

  const objective = base.objective.type === "contain"
    ? {
        type: "contain" as const,
        maxPct: Math.max(12, Math.min(42, base.objective.maxPct - Math.min(6, Math.floor(state.round / 2)))),
        maxTurns: fasterTurnLimit,
      }
    : base.objective;

  return {
    ...base,
    id: 100000 + state.round,
    world,
    title: `Endless Round ${state.round}`,
    hint: `Procedural outbreak • Run score ${state.totalScore.toLocaleString()} • Lose once and the run ends`,
    objective,
    turnLimit: fasterTurnLimit,
    parTurns: tighterPar,
    boss: undefined,
  };
}
