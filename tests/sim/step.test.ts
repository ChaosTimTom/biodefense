// ═══════════════════════════════════════════════════
// tests/sim/step.test.ts — Turn engine tests
// Bio Defence v5.0: Directional Growth (Chess-Piece)
//
// Bacteria / Antibiotic  → Cardinal (Rook)
// Virus   / Antiviral    → Knight L-jumps (Knight)
// Fungus  / Antifungal   → Diagonal (Bishop)
//
// Survival: ≥1 same-type ally in growth dirs → live.
// Dead zones where pathogen + medicine fronts collide.
// 1 generation per turn (GENS_PER_TURN = 1).
// ═══════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { applyAction, advanceTurn, executeTurn, runGeneration } from "@sim/step";
import {
  createGameState,
  getTile,
  setTile,
  emptyTile,
  pathogenTile,
  medicineTile,
  countPathogens,
  countMedicine,
  infectionPct,
} from "@sim/board";
import {
  MEDICINE_LIFESPAN,
  GENS_PER_TURN,
} from "@sim/constants";
import type { LevelSpec, GameState } from "@sim/types";

function mkSpec(overrides?: Partial<LevelSpec>): LevelSpec {
  return {
    id: 1,
    world: 1,
    title: "Test",
    hint: "",
    grid: { w: 9, h: 9 },
    walls: [],
    seeds: [],
    tools: { antibiotic: 10, antiviral: 10, antifungal: 10, wall: 10 },
    toolsPerTurn: 5,
    turnLimit: 20,
    objective: { type: "clear_all" },
    parTurns: 10,
    ...overrides,
  };
}

// ── applyAction ────────────────────────────────────

describe("applyAction", () => {
  it("places a tool and increments toolsUsedThisTurn", () => {
    const state = createGameState(mkSpec());
    const result = applyAction(state, { type: "place_tool", tool: "antibiotic", x: 0, y: 0 });
    expect(result).toBe(true);
    expect(state.toolsUsedThisTurn).toBe(1);
    expect(getTile(state.board, 0, 0).kind).toBe("medicine");
  });

  it("rejects when toolsPerTurn exhausted", () => {
    const state = createGameState(mkSpec({ toolsPerTurn: 1 }));
    applyAction(state, { type: "place_tool", tool: "antibiotic", x: 0, y: 0 });
    const result = applyAction(state, { type: "place_tool", tool: "antibiotic", x: 1, y: 0 });
    expect(result).toBe(false);
  });

  it("rejects when game is over", () => {
    const state = createGameState(mkSpec());
    state.isOver = true;
    const result = applyAction(state, { type: "place_tool", tool: "antibiotic", x: 0, y: 0 });
    expect(result).toBe(false);
  });

  it("skip always succeeds", () => {
    const state = createGameState(mkSpec());
    expect(applyAction(state, { type: "skip" })).toBe(true);
  });
});

// ── Bacteria Birth (Cardinal / Rook) ───────────────

describe("Bacteria Birth (cardinal)", () => {
  it("bacteria pair births into cardinal neighbors", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));

    runGeneration(state.board);
    // Each bacteria spreads into its cardinal dirs where empty
    // (4,4) spreads to (3,4),(4,3),(4,5) — (5,4) is occupied
    // (5,4) spreads to (6,4),(5,3),(5,5) — (4,4) is occupied
    expect(countPathogens(state.board)).toBeGreaterThan(2);

    // Verify cardinal neighbors are bacteria
    expect(getTile(state.board, 3, 4).kind).toBe("pathogen");
    expect(getTile(state.board, 6, 4).kind).toBe("pathogen");
    expect(getTile(state.board, 4, 3).kind).toBe("pathogen");
    expect(getTile(state.board, 5, 5).kind).toBe("pathogen");
  });

  it("bacteria does NOT spread diagonally", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));

    runGeneration(state.board);
    // (3,3) is diagonal to (4,4) — should NOT get bacteria
    expect(getTile(state.board, 3, 3).kind).toBe("empty");
    expect(getTile(state.board, 6, 5).kind).toBe("empty");
  });

  it("bacteria does NOT spread into walls", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));
    setTile(state.board, 3, 4, { kind: "wall", pathogenType: null, medicineType: null, age: 0 });

    runGeneration(state.board);
    expect(getTile(state.board, 3, 4).kind).toBe("wall");
  });

  it("empty cell with 0 bacteria neighbors does NOT birth", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));

    runGeneration(state.board);
    // (0,0) is far from any bacteria
    expect(getTile(state.board, 0, 0).kind).toBe("empty");
  });
});

// ── Fungus Birth (Diagonal / Bishop) ───────────────

describe("Fungus Birth (diagonal)", () => {
  it("fungus pair births into diagonal neighbors", () => {
    const state = createGameState(mkSpec());
    // Fungus spreads diagonally, so two fungus must be diagonal to each other
    // to have each other as allies
    setTile(state.board, 4, 4, pathogenTile("fungus"));
    setTile(state.board, 5, 5, pathogenTile("fungus"));

    runGeneration(state.board);
    // (4,4) spreads diag to (3,3),(5,3),(3,5),(5,5)→occupied
    // (5,5) spreads diag to (4,4)→occupied,(6,4),(4,6),(6,6)
    expect(getTile(state.board, 3, 3).kind).toBe("pathogen");
    expect(getTile(state.board, 6, 6).kind).toBe("pathogen");
  });

  it("fungus does NOT spread cardinally", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("fungus"));
    setTile(state.board, 5, 5, pathogenTile("fungus"));

    runGeneration(state.board);
    // (5,4) is cardinal to (4,4) and (5,5) — NOT in diagonal pattern
    expect(getTile(state.board, 5, 4).kind).toBe("empty");
    expect(getTile(state.board, 4, 5).kind).toBe("empty");
  });
});

// ── Virus Birth (Knight / L-jump) ──────────────────

describe("Virus Birth (knight)", () => {
  it("virus spreads by knight-move (L-shape)", () => {
    const state = createGameState(mkSpec());
    // Two viruses that are a knight-move apart
    setTile(state.board, 4, 4, pathogenTile("virus"));
    setTile(state.board, 5, 6, pathogenTile("virus")); // knight-move: +1,+2

    runGeneration(state.board);
    // (4,4) should spread to knight positions:
    // (5,6)→occupied, (5,2), (3,6), (3,2), (6,5), (6,3), (2,5), (2,3)
    expect(getTile(state.board, 6, 5).kind).toBe("pathogen");
    expect(getTile(state.board, 2, 3).kind).toBe("pathogen");
  });

  it("virus does NOT spread cardinally or diagonally", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("virus"));
    setTile(state.board, 5, 6, pathogenTile("virus"));

    runGeneration(state.board);
    // (5,4) is cardinal to (4,4) — NOT knight-move
    expect(getTile(state.board, 5, 4).kind).toBe("empty");
    // (5,5) is diagonal to (4,4) — NOT knight-move
    expect(getTile(state.board, 5, 5).kind).toBe("empty");
  });
});

// ── Medicine Birth (mirrors pathogen) ──────────────

describe("Medicine Birth (per-type)", () => {
  it("antibiotic pair grows cardinally (mirrors bacteria)", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, medicineTile("antibiotic"));
    setTile(state.board, 5, 4, medicineTile("antibiotic"));

    runGeneration(state.board);
    expect(countMedicine(state.board)).toBeGreaterThan(2);
    expect(getTile(state.board, 3, 4).kind).toBe("medicine");
    expect(getTile(state.board, 6, 4).kind).toBe("medicine");
  });

  it("antifungal pair grows diagonally (mirrors fungus)", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, medicineTile("antifungal"));
    setTile(state.board, 5, 5, medicineTile("antifungal"));

    runGeneration(state.board);
    expect(getTile(state.board, 3, 3).kind).toBe("medicine");
    expect(getTile(state.board, 6, 6).kind).toBe("medicine");
    // Should NOT spread cardinally
    expect(getTile(state.board, 5, 4).kind).toBe("empty");
  });

  it("antiviral pair grows by knight-move (mirrors virus)", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, medicineTile("antiviral"));
    setTile(state.board, 5, 6, medicineTile("antiviral")); // knight-move apart

    runGeneration(state.board);
    expect(getTile(state.board, 6, 5).kind).toBe("medicine");
  });

  it("same-type only: antibiotic does NOT help antiviral grow", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, medicineTile("antibiotic"));
    setTile(state.board, 5, 4, medicineTile("antiviral"));

    runGeneration(state.board);
    // (3,4) has antibiotic at (4,4) as cardinal parent → antibiotic births
    expect(getTile(state.board, 3, 4).kind).toBe("medicine");
    expect(getTile(state.board, 3, 4).medicineType).toBe("antibiotic");
    // But (4,4) is isolated (0 same-type antibiotic in cardinal dirs) → dies
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });
});

// ── Dead Zones (contested births) ──────────────────

describe("Dead Zones", () => {
  it("contested birth → dead zone (cell stays empty)", () => {
    const state = createGameState(mkSpec());
    // Bacteria pair east of (4,4), antibiotic pair west of (4,4)
    // (4,4) gets pathogen parent from left and medicine parent from right
    setTile(state.board, 3, 4, pathogenTile("bacteria"));
    setTile(state.board, 2, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, medicineTile("antibiotic"));
    setTile(state.board, 6, 4, medicineTile("antibiotic"));

    // (4,4) is cardinal to both bacteria(3,4) and antibiotic(5,4)
    // Both want it → dead zone
    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("medicine grows away from dead zone frontier", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 3, 4, pathogenTile("bacteria"));
    setTile(state.board, 2, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, medicineTile("antibiotic"));
    setTile(state.board, 6, 4, medicineTile("antibiotic"));

    runGeneration(state.board);
    // Antibiotic grows away from conflict → (7,4) should have medicine
    expect(getTile(state.board, 7, 4).kind).toBe("medicine");
    // Bacteria grows away → (1,4) should have pathogen
    expect(getTile(state.board, 1, 4).kind).toBe("pathogen");
  });

  it("fungus vs antifungal creates diagonal dead zones", () => {
    const state = createGameState(mkSpec());
    // Fungus pair and antifungal pair on collision course diagonally
    setTile(state.board, 2, 2, pathogenTile("fungus"));
    setTile(state.board, 3, 3, pathogenTile("fungus"));
    setTile(state.board, 5, 5, medicineTile("antifungal"));
    setTile(state.board, 6, 6, medicineTile("antifungal"));

    // (4,4) is diagonal to both (3,3) and (5,5) → dead zone
    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });
});

// ── Pathogen Survival ──────────────────────────────

describe("Pathogen Survival", () => {
  it("isolated bacteria (0 cardinal allies) dies", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("bacteria pair survives (each has 1 cardinal ally)", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("pathogen");
    expect(getTile(state.board, 5, 4).kind).toBe("pathogen");
  });

  it("isolated fungus (0 diagonal allies) dies", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("fungus"));

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("fungus diagonal pair survives", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("fungus"));
    setTile(state.board, 5, 5, pathogenTile("fungus"));

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("pathogen");
    expect(getTile(state.board, 5, 5).kind).toBe("pathogen");
  });

  it("fungus with only cardinal neighbor dies (wrong direction)", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("fungus"));
    setTile(state.board, 5, 4, pathogenTile("fungus")); // cardinal, not diagonal

    runGeneration(state.board);
    // Neither sees the other in its diagonal dirs → both die
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
    expect(getTile(state.board, 5, 4).kind).toBe("empty");
  });

  it("isolated virus (0 knight-move allies) dies", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("virus"));

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("virus knight-pair survives", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("virus"));
    setTile(state.board, 5, 6, pathogenTile("virus")); // knight-move: +1,+2

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("pathogen");
    expect(getTile(state.board, 5, 6).kind).toBe("pathogen");
  });
});

// ── Medicine Overwhelm ─────────────────────────────

describe("Medicine Overwhelm", () => {
  it("bacteria pair dies when each has 2+ antibiotic cardinal neighbors", () => {
    // Layout (9x9):  antibiotics surround a 2-wide bacteria pair
    //   . A .
    //   A B A
    //   A B A
    //   . A .
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 3, medicineTile("antibiotic")); // above pair
    setTile(state.board, 3, 4, medicineTile("antibiotic")); // left of B1
    setTile(state.board, 5, 4, medicineTile("antibiotic")); // right of B1
    setTile(state.board, 3, 5, medicineTile("antibiotic")); // left of B2
    setTile(state.board, 5, 5, medicineTile("antibiotic")); // right of B2
    setTile(state.board, 4, 6, medicineTile("antibiotic")); // below pair
    setTile(state.board, 4, 4, pathogenTile("bacteria"));   // B1
    setTile(state.board, 4, 5, pathogenTile("bacteria"));   // B2

    runGeneration(state.board);
    // B1 cardinal: up=A, left=A, right=A, down=B2 → medPressure=3 ≥ 2 → dies
    // B2 cardinal: up=B1, left=A, right=A, down=A → medPressure=3 ≥ 2 → dies
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
    expect(getTile(state.board, 4, 5).kind).toBe("empty");
  });

  it("bacteria pair survives with only 1 antibiotic neighbor each", () => {
    // One antibiotic to the right of the pair — only 1 med neighbor each
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));
    setTile(state.board, 6, 4, medicineTile("antibiotic"));

    runGeneration(state.board);
    // Left B: med=0, ally=1 → survives
    // Right B: med=1 (right), ally=1 → 1 < 2 → survives
    expect(getTile(state.board, 4, 4).kind).toBe("pathogen");
    expect(getTile(state.board, 5, 4).kind).toBe("pathogen");
  });

  it("boxed-in 2x2 bacteria group all die from overwhelm", () => {
    //   A A A A
    //   A B B A
    //   A B B A
    //   A A A A
    const state = createGameState(mkSpec());
    // Border of antibiotics
    for (let x = 2; x <= 5; x++) {
      setTile(state.board, x, 2, medicineTile("antibiotic"));
      setTile(state.board, x, 5, medicineTile("antibiotic"));
    }
    for (let y = 3; y <= 4; y++) {
      setTile(state.board, 2, y, medicineTile("antibiotic"));
      setTile(state.board, 5, y, medicineTile("antibiotic"));
    }
    // 2x2 bacteria
    setTile(state.board, 3, 3, pathogenTile("bacteria"));
    setTile(state.board, 4, 3, pathogenTile("bacteria"));
    setTile(state.board, 3, 4, pathogenTile("bacteria"));
    setTile(state.board, 4, 4, pathogenTile("bacteria"));

    runGeneration(state.board);
    // Each bacteria has 2 med neighbors in cardinal dirs → overwhelmed
    expect(getTile(state.board, 3, 3).kind).toBe("empty");
    expect(getTile(state.board, 4, 3).kind).toBe("empty");
    expect(getTile(state.board, 3, 4).kind).toBe("empty");
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("fungus dies when 2+ antifungal diagonal neighbors", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("fungus"));
    setTile(state.board, 5, 5, pathogenTile("fungus")); // diagonal ally
    setTile(state.board, 3, 3, medicineTile("antifungal")); // diag of (4,4)
    setTile(state.board, 5, 3, medicineTile("antifungal")); // diag of (4,4)

    runGeneration(state.board);
    // (4,4): diag → (3,3)=AF, (5,5)=F(ally), (5,3)=AF, (3,5)=empty
    //   medPressure=2 ≥ 2 → dies
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("virus needs 3+ antiviral knight-neighbors to die", () => {
    // With only 2 antivirals at knight positions → survives
    const state1 = createGameState(mkSpec());
    setTile(state1.board, 4, 4, pathogenTile("virus"));
    setTile(state1.board, 5, 6, pathogenTile("virus")); // knight ally
    setTile(state1.board, 6, 5, medicineTile("antiviral")); // +2,+1
    setTile(state1.board, 6, 3, medicineTile("antiviral")); // +2,-1

    runGeneration(state1.board);
    // medPressure=2 < 3 → survives
    expect(getTile(state1.board, 4, 4).kind).toBe("pathogen");

    // With 3 antivirals at knight positions → dies
    const state2 = createGameState(mkSpec());
    setTile(state2.board, 4, 4, pathogenTile("virus"));
    setTile(state2.board, 5, 6, pathogenTile("virus")); // knight ally
    setTile(state2.board, 6, 5, medicineTile("antiviral")); // +2,+1
    setTile(state2.board, 6, 3, medicineTile("antiviral")); // +2,-1
    setTile(state2.board, 3, 6, medicineTile("antiviral")); // -1,+2

    runGeneration(state2.board);
    // medPressure=3 ≥ 3 → overwhelmed → dies
    expect(getTile(state2.board, 4, 4).kind).toBe("empty");
  });

  it("wrong medicine type does NOT trigger overwhelm", () => {
    // Surround bacteria with antivirals (wrong type for bacteria)
    // 2+ wrong-type meds in cardinal dirs → should NOT overwhelm
    // Leave one cardinal dir open so suffocation doesn't trigger either
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria")); // ally (right)
    setTile(state.board, 3, 4, medicineTile("antiviral")); // wrong type (left)
    setTile(state.board, 4, 3, medicineTile("antiviral")); // wrong type (up)
    // (4,5) is empty and antiviral knight-moves don't reach it → uncontested

    runGeneration(state.board);
    // Wrong medicine → medPressure=0, ally≥1, canGrow → survives
    expect(getTile(state.board, 4, 4).kind).toBe("pathogen");
  });
});

// ── Suffocation ────────────────────────────────────

describe("Suffocation", () => {
  it("bacteria pair trapped by dead zones dies", () => {
    // B at (3,4)+(4,4), antibiotic wall at (6,4)+(7,4)+(8,4)
    // Medicine creates dead zones at (5,4), and the bacteria
    // are hemmed in on other sides by more medicine.
    // Specifically: surround the pair so every empty neighbor is a dead zone.
    const state = createGameState(mkSpec());
    // Bacteria pair
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));
    // Antibiotics forming a tight perimeter — 2 cells away so dead zones fill the gaps
    // Left column: antibiotics at (2,3),(2,4),(2,5)
    setTile(state.board, 2, 3, medicineTile("antibiotic"));
    setTile(state.board, 2, 4, medicineTile("antibiotic"));
    setTile(state.board, 2, 5, medicineTile("antibiotic"));
    // Right column: antibiotics at (7,3),(7,4),(7,5)
    setTile(state.board, 7, 3, medicineTile("antibiotic"));
    setTile(state.board, 7, 4, medicineTile("antibiotic"));
    setTile(state.board, 7, 5, medicineTile("antibiotic"));
    // Top row: antibiotics at (3,2),(4,2),(5,2),(6,2)
    setTile(state.board, 3, 2, medicineTile("antibiotic"));
    setTile(state.board, 4, 2, medicineTile("antibiotic"));
    setTile(state.board, 5, 2, medicineTile("antibiotic"));
    setTile(state.board, 6, 2, medicineTile("antibiotic"));
    // Bottom row: antibiotics at (3,6),(4,6),(5,6),(6,6)
    setTile(state.board, 3, 6, medicineTile("antibiotic"));
    setTile(state.board, 4, 6, medicineTile("antibiotic"));
    setTile(state.board, 5, 6, medicineTile("antibiotic"));
    setTile(state.board, 6, 6, medicineTile("antibiotic"));

    // Now check that bacteria at (4,4) can't grow:
    // (3,4) empty but antibiotic at (2,4) wants to grow into (3,4) → dead zone
    // (4,3) empty but antibiotic at (4,2) wants to grow into (4,3) → dead zone
    // (4,5) empty but antibiotic at (4,6) wants to grow into (4,5) → dead zone
    // (5,4) = bacteria (ally)
    // So (4,4) has 1 ally, 0 viable growth → suffocates

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
    expect(getTile(state.board, 5, 4).kind).toBe("empty");
  });

  it("bacteria with at least one uncontested empty neighbor survives", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));
    // Only one side has medicine
    setTile(state.board, 2, 4, medicineTile("antibiotic"));
    setTile(state.board, 2, 5, medicineTile("antibiotic"));

    runGeneration(state.board);
    // (4,4) can still grow up (4,3) and down (4,5) uncontested
    expect(getTile(state.board, 4, 4).kind).toBe("pathogen");
    expect(getTile(state.board, 5, 4).kind).toBe("pathogen");
  });

  it("bacteria in corner with all dirs wall/OOB/bacteria suffocates", () => {
    // Bacteria packed into a corner: every cardinal dir is wall, OOB, or bacteria
    const state = createGameState(mkSpec({
      walls: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]],
    }));
    setTile(state.board, 1, 1, pathogenTile("bacteria"));
    setTile(state.board, 2, 1, pathogenTile("bacteria"));
    // (1,1): up=(1,0)wall, left=(0,1)wall, down=(1,2)empty, right=(2,1)B
    // (1,2) is empty and uncontested → canGrow=true → survives
    runGeneration(state.board);
    expect(getTile(state.board, 1, 1).kind).toBe("pathogen");

    // Now block the remaining empty direction too
    setTile(state.board, 1, 2, pathogenTile("bacteria"));
    // Give (1,2) an ally so it doesn't die from isolation
    setTile(state.board, 1, 3, pathogenTile("bacteria"));

    // After gen: (1,1) cardinal = wall, wall, B, B → 0 empty → suffocates
    runGeneration(state.board);
    expect(getTile(state.board, 1, 1).kind).toBe("empty");
  });

  it("interior cell of a large bacteria blob suffocates", () => {
    // 3x3 bacteria block — center cell has no empty neighbors
    const state = createGameState(mkSpec());
    for (let dx = 0; dx < 3; dx++) {
      for (let dy = 0; dy < 3; dy++) {
        setTile(state.board, 3 + dx, 3 + dy, pathogenTile("bacteria"));
      }
    }

    runGeneration(state.board);
    // Center (4,4): all 4 cardinal = bacteria → suffocates
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
    // Edge (3,4): left(2,4)=empty(uncontested) → survives
    expect(getTile(state.board, 3, 4).kind).toBe("pathogen");
  });
});

// ── Medicine Survival ──────────────────────────────

describe("Medicine Survival", () => {
  it("isolated antibiotic (0 cardinal allies) dies", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, medicineTile("antibiotic"));

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("antibiotic pair survives", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, medicineTile("antibiotic"));
    setTile(state.board, 5, 4, medicineTile("antibiotic"));

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("medicine");
    expect(getTile(state.board, 5, 4).kind).toBe("medicine");
  });

  it("medicine expires after MEDICINE_LIFESPAN generations", () => {
    const state = createGameState(mkSpec());
    const med = medicineTile("antibiotic");
    med.age = MEDICINE_LIFESPAN;
    setTile(state.board, 4, 4, med);

    const buddy = medicineTile("antibiotic");
    buddy.age = 1;
    setTile(state.board, 5, 4, buddy);

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("medicine at LIFESPAN-1 with ally survives", () => {
    const state = createGameState(mkSpec());
    const med = medicineTile("antibiotic");
    med.age = MEDICINE_LIFESPAN - 1;
    setTile(state.board, 4, 4, med);

    const buddy = medicineTile("antibiotic");
    buddy.age = 1;
    setTile(state.board, 5, 4, buddy);

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("medicine");
  });

  it("antifungal with only cardinal ally dies (wrong direction)", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, medicineTile("antifungal"));
    setTile(state.board, 5, 4, medicineTile("antifungal")); // cardinal, not diagonal

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("empty");
  });

  it("antifungal diagonal pair survives", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, medicineTile("antifungal"));
    setTile(state.board, 5, 5, medicineTile("antifungal"));

    runGeneration(state.board);
    expect(getTile(state.board, 4, 4).kind).toBe("medicine");
  });
});

// ── Multi-generation turns ─────────────────────────

describe("Multi-generation turns", () => {
  it("advanceTurn runs GENS_PER_TURN generations", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));

    advanceTurn(state);
    // With 1 gen/turn, bacteria pair grows into cardinal neighbors
    expect(countPathogens(state.board)).toBeGreaterThan(2);
    expect(state.turn).toBe(1);
  });

  it("turn counter increments by 1 per advanceTurn", () => {
    const state = createGameState(mkSpec({
      grid: { w: 15, h: 15 },
      seeds: [
        { type: "bacteria", x: 7, y: 7 },
        { type: "bacteria", x: 8, y: 7 },
      ],
    }));
    expect(state.turn).toBe(0);
    advanceTurn(state);
    expect(state.turn).toBe(1);
    advanceTurn(state);
    expect(state.turn).toBe(2);
  });

  it("toolsUsedThisTurn resets each turn", () => {
    const state = createGameState(mkSpec());
    applyAction(state, { type: "place_tool", tool: "wall", x: 0, y: 0 });
    expect(state.toolsUsedThisTurn).toBe(1);
    advanceTurn(state);
    expect(state.toolsUsedThisTurn).toBe(0);
  });
});

// ── Tool Grant Per Turn ────────────────────────────

describe("Tool Grant Per Turn", () => {
  it("advanceTurn applies toolGrant from spec", () => {
    const spec = mkSpec({
      tools: { antibiotic: 2, antiviral: 0, antifungal: 0, wall: 0 },
      toolGrant: { antibiotic: 1, antiviral: 0, antifungal: 0, wall: 0 },
      // Need pathogens so the game doesn't end immediately
      seeds: [
        { type: "bacteria", x: 0, y: 0 },
        { type: "bacteria", x: 1, y: 0 },
      ],
    });
    const state = createGameState(spec);
    expect(state.tools.antibiotic).toBe(2); // initial

    advanceTurn(state, spec);
    expect(state.tools.antibiotic).toBe(3); // 2 + 1 grant
    advanceTurn(state, spec);
    expect(state.tools.antibiotic).toBe(4); // 3 + 1 grant
  });

  it("no grant without spec parameter", () => {
    const spec = mkSpec({
      tools: { antibiotic: 2, antiviral: 0, antifungal: 0, wall: 0 },
      toolGrant: { antibiotic: 1, antiviral: 0, antifungal: 0, wall: 0 },
    });
    const state = createGameState(spec);
    advanceTurn(state); // no spec → no grant
    expect(state.tools.antibiotic).toBe(2);
  });
});

// ── Evaluate ────────────────────────────────────────

describe("Evaluate", () => {
  it("wins when all pathogens cleared (clear_all)", () => {
    const state = createGameState(mkSpec());
    // No pathogens on board → clear_all wins immediately
    advanceTurn(state);
    expect(state.isOver).toBe(true);
    expect(state.result).toBe("win");
    expect(state.stars).toBeGreaterThan(0);
  });

  it("loses when infection exceeds threshold", () => {
    const state = createGameState(mkSpec({
      grid: { w: 4, h: 4 },
      seeds: [
        { type: "bacteria", x: 0, y: 0 },
        { type: "bacteria", x: 1, y: 0 },
        { type: "bacteria", x: 2, y: 0 },
        { type: "bacteria", x: 3, y: 0 },
        { type: "bacteria", x: 0, y: 1 },
        { type: "bacteria", x: 1, y: 1 },
        { type: "bacteria", x: 2, y: 1 },
        { type: "bacteria", x: 3, y: 1 },
        { type: "bacteria", x: 0, y: 2 },
      ],
    }));
    advanceTurn(state);
    expect(state.isOver).toBe(true);
    expect(state.result).toBe("lose");
  });
});

// ── executeTurn convenience ────────────────────────

describe("executeTurn", () => {
  it("applies actions then advances", () => {
    const state = createGameState(mkSpec());
    executeTurn(state, [
      { type: "place_tool", tool: "wall", x: 0, y: 0 },
    ]);
    expect(state.turn).toBe(1);
    expect(getTile(state.board, 0, 0).kind).toBe("wall");
  });
});

// ── Walls ──────────────────────────────────────────

describe("Walls", () => {
  it("walls block pathogen birth at that position", () => {
    const state = createGameState(mkSpec());
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 5, 4, pathogenTile("bacteria"));
    setTile(state.board, 6, 4, { kind: "wall", pathogenType: null, medicineType: null, age: 0 });

    runGeneration(state.board);
    expect(getTile(state.board, 6, 4).kind).toBe("wall");
  });
});

// ── Integration: dead zone containment ─────────────

describe("Integration: dead zone containment", () => {
  it("antibiotic barrier blocks bacteria spread via dead zones", () => {
    // Bacteria pair at (3,4)+(4,4), antibiotic pair at (6,4)+(7,4)
    // After gen: bacteria spread left, antibiotic spread left
    // (5,4) gets bacteria from (4,4) AND medicine from (6,4) → dead zone
    const state = createGameState(mkSpec());
    setTile(state.board, 3, 4, pathogenTile("bacteria"));
    setTile(state.board, 4, 4, pathogenTile("bacteria"));
    setTile(state.board, 6, 4, medicineTile("antibiotic"));
    setTile(state.board, 7, 4, medicineTile("antibiotic"));

    runGeneration(state.board);
    // (5,4) is contested
    expect(getTile(state.board, 5, 4).kind).toBe("empty");
    // bacteria grew left
    expect(getTile(state.board, 2, 4).kind).toBe("pathogen");
    // medicine grew right
    expect(getTile(state.board, 8, 4).kind).toBe("medicine");
  });

  it("over multiple turns, bacteria expand in diamond pattern", () => {
    const state = createGameState(mkSpec({
      grid: { w: 11, h: 11 },
    }));
    setTile(state.board, 5, 5, pathogenTile("bacteria"));
    setTile(state.board, 6, 5, pathogenTile("bacteria"));

    // Turn 1: cardinal spread
    runGeneration(state.board);
    expect(getTile(state.board, 4, 5).kind).toBe("pathogen");
    expect(getTile(state.board, 7, 5).kind).toBe("pathogen");

    // Turn 2: secondary spread creates wider diamond
    runGeneration(state.board);
    expect(getTile(state.board, 3, 5).kind).toBe("pathogen");
    expect(getTile(state.board, 8, 5).kind).toBe("pathogen");
  });
});
