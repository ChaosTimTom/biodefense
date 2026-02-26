// ═══════════════════════════════════════════════════
// src/game/config.ts — Visual constants for Phaser rendering
// Bio Defence v3: Game of Life inspired cellular war
// Colors, sizes, layout helpers. NO Phaser imports here.
// ═══════════════════════════════════════════════════

import type { PathogenType, MedicineType, ToolId, TileKind } from "../sim/types";

// ── Grid Layout ──────────────────────────────────

export const TILE_SIZE = 56;      // desired max — computeLayout may shrink
export const TILE_GAP = 2;
export const TILE_RADIUS = 6;
export const GRID_PADDING = 16;

export function tileX(x: number, gridOffsetX: number, tileSize = TILE_SIZE, tileGap = TILE_GAP): number {
  return gridOffsetX + x * (tileSize + tileGap);
}

export function tileY(y: number, gridOffsetY: number, tileSize = TILE_SIZE, tileGap = TILE_GAP): number {
  return gridOffsetY + y * (tileSize + tileGap);
}

export function gridPixelWidth(cols: number, tileSize = TILE_SIZE, tileGap = TILE_GAP): number {
  return cols * tileSize + (cols - 1) * tileGap;
}

export function gridPixelHeight(rows: number, tileSize = TILE_SIZE, tileGap = TILE_GAP): number {
  return rows * tileSize + (rows - 1) * tileGap;
}

// ── Color Palette ────────────────────────────────

export const PATHOGEN_COLORS: Record<PathogenType, number> = {
  // Bacteria family (greens)
  coccus: 0x4caf50,      // green
  bacillus: 0x8bc34a,    // lime
  spirillum: 0x009688,   // teal
  // Virus family (reds)
  influenza: 0xf44336,   // red
  retrovirus: 0xc62828,  // crimson
  phage: 0xff5722,       // deep orange
  // Fungus family (purples)
  mold: 0x9c27b0,        // purple
  yeast: 0xce93d8,       // lavender
  spore: 0x4a148c,       // deep violet
};

export type PathogenShape =
  | "circle" | "diamond" | "branch"
  | "rod" | "spiral" | "spike"
  | "icosa" | "phage_t4" | "starburst";

export const PATHOGEN_SHAPES: Record<PathogenType, PathogenShape> = {
  coccus: "circle",
  bacillus: "rod",
  spirillum: "spiral",
  influenza: "spike",
  retrovirus: "icosa",
  phage: "phage_t4",
  mold: "branch",
  yeast: "diamond",
  spore: "starburst",
};

/** Seamless tile texture key for each pathogen type */
export const PATHOGEN_TEXTURES: Record<PathogenType, string> = {
  coccus: "coccus",
  bacillus: "bacillus",
  spirillum: "spirillum",
  influenza: "influenza",
  retrovirus: "retrovirus",
  phage: "phage",
  mold: "mold",
  yeast: "yeast",
  spore: "spore",
};

/** Seamless tile texture key for each medicine type */
export const MEDICINE_TEXTURES: Record<MedicineType, string> = {
  penicillin: "penicillin",
  tetracycline: "tetracycline",
  streptomycin: "streptomycin",
  tamiflu: "tamiflu",
  zidovudine: "zidovudine",
  interferon: "interferon",
  fluconazole: "fluconazole",
  nystatin: "nystatin",
  amphotericin: "amphotericin",
};

/** Background tile texture keyed by TileKind */
export const TILE_BG_TEXTURES: Partial<Record<TileKind, string>> = {
  empty: "tile_empty",
  wall:  "tile_wall",
};

export const PATHOGEN_NAMES: Record<PathogenType, string> = {
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

export const MEDICINE_COLORS: Record<MedicineType, number> = {
  // Anti-bacteria (cyan family)
  penicillin: 0x00e5ff,
  tetracycline: 0x18ffff,
  streptomycin: 0x00bfa5,
  // Anti-virus (lime family)
  tamiflu: 0x76ff03,
  zidovudine: 0xb2ff59,
  interferon: 0xaeea00,
  // Anti-fungus (pink family)
  fluconazole: 0xea80fc,
  nystatin: 0xe040fb,
  amphotericin: 0xd500f9,
};

export const MEDICINE_NAMES: Record<MedicineType, string> = {
  penicillin: "Penicillin",
  tetracycline: "Tetracycline",
  streptomycin: "Streptomycin",
  tamiflu: "Tamiflu",
  zidovudine: "Zidovudine",
  interferon: "Interferon",
  fluconazole: "Fluconazole",
  nystatin: "Nystatin",
  amphotericin: "Amphotericin",
};

export const TOOL_COLORS: Record<ToolId, number> = {
  penicillin: 0x00e5ff,
  tetracycline: 0x18ffff,
  streptomycin: 0x00bfa5,
  tamiflu: 0x76ff03,
  zidovudine: 0xb2ff59,
  interferon: 0xaeea00,
  fluconazole: 0xea80fc,
  nystatin: 0xe040fb,
  amphotericin: 0xd500f9,
  wall: 0x8d6e63,
};

export const TOOL_LABELS: Record<ToolId, string> = {
  penicillin: "PEN",
  tetracycline: "TET",
  streptomycin: "STR",
  tamiflu: "TAM",
  zidovudine: "ZDV",
  interferon: "IFN",
  fluconazole: "FLC",
  nystatin: "NYS",
  amphotericin: "AMB",
  wall: "WALL",
};

/** Sprite texture keys for tool palette icons (normal + selected) */
export const TOOL_TEXTURES: Record<ToolId, { normal: string; selected: string }> = {
  penicillin:   { normal: "icon_penicillin",   selected: "icon_penicillin_sel" },
  tetracycline: { normal: "icon_tetracycline", selected: "icon_tetracycline_sel" },
  streptomycin: { normal: "icon_streptomycin", selected: "icon_streptomycin_sel" },
  tamiflu:      { normal: "icon_tamiflu",       selected: "icon_tamiflu_sel" },
  zidovudine:   { normal: "icon_zidovudine",   selected: "icon_zidovudine_sel" },
  interferon:   { normal: "icon_interferon",   selected: "icon_interferon_sel" },
  fluconazole:  { normal: "icon_fluconazole",  selected: "icon_fluconazole_sel" },
  nystatin:     { normal: "icon_nystatin",     selected: "icon_nystatin_sel" },
  amphotericin: { normal: "icon_amphotericin", selected: "icon_amphotericin_sel" },
  wall:         { normal: "icon_wall",         selected: "icon_wall_sel" },
};

export const TOOL_NAMES: Record<ToolId, string> = {
  penicillin: "Penicillin",
  tetracycline: "Tetracycline",
  streptomycin: "Streptomycin",
  tamiflu: "Tamiflu",
  zidovudine: "Zidovudine",
  interferon: "Interferon",
  fluconazole: "Fluconazole",
  nystatin: "Nystatin",
  amphotericin: "Amphotericin",
  wall: "Wall",
};

export const TOOL_DESCRIPTIONS: Record<ToolId, string> = {
  penicillin: "Kills Coccus — spreads cardinally",
  tetracycline: "Kills Bacillus — leaps 2 cells",
  streptomycin: "Kills Spirillum — narrow L-jumps",
  tamiflu: "Kills Influenza — full knight jumps",
  zidovudine: "Kills Retrovirus — wide L-jumps",
  interferon: "Kills Phage — camel jumps",
  fluconazole: "Kills Mold — spreads diagonally",
  nystatin: "Kills Yeast — long diagonal leaps",
  amphotericin: "Kills Spore — extreme diagonal range",
  wall: "Quarantine barrier — blocks all spread",
};

export const TILE_BG: Record<TileKind, number> = {
  empty: 0x1a1a2e,
  wall: 0x3a3a5c,
  pathogen: 0x1a1a2e,  // pathogen color drawn on top
  medicine: 0x0d2d3e,  // dark blue tint for medicine
};

// ── UI Colors ────────────────────────────────────

export const UI = {
  bgDark: 0x0a0a1a,
  bgPanel: 0x16162b,
  textPrimary: 0xffffff,
  textSecondary: 0xaaaacc,
  textMuted: 0x666688,
  accentCyan: 0x00e5ff,
  accentGold: 0xffd740,
  dangerRed: 0xff4444,
  successGreen: 0x4caf50,
  previewGhost: 0xffffff,
  previewAlpha: 0.2,
  hoverTint: 0xffffff,
  selectedOutline: 0x00e5ff,
  starFilled: 0xffd740,
  starEmpty: 0x444466,
};

// ── Layout Zones ─────────────────────────────────

export interface LayoutZones {
  canvasW: number;
  canvasH: number;
  headerH: number;
  gridOffsetX: number;
  gridOffsetY: number;
  statusBarY: number;
  toolPaletteY: number;
  controlsY: number;
  tileSize: number;
  tileGap: number;
  tileRadius: number;
}

export function computeLayout(
  canvasW: number,
  canvasH: number,
  gridCols: number,
  gridRows: number,
): LayoutZones {
  const headerH = 80;
  const statusH = 52;
  const paletteH = 56;
  const controlsH = 48;
  const bottomPad = 8;
  const bottomTotal = statusH + paletteH + controlsH + bottomPad + 8;

  const availH = canvasH - headerH - bottomTotal - GRID_PADDING * 2;
  const availW = canvasW - GRID_PADDING * 2;

  // Compute the largest tile size that fits both axes
  const tileGap = TILE_GAP;
  const maxTileH = Math.floor((availH - (gridRows - 1) * tileGap) / gridRows);
  const maxTileW = Math.floor((availW - (gridCols - 1) * tileGap) / gridCols);
  const tileSize = Math.min(TILE_SIZE, maxTileH, maxTileW);
  const tileRadius = Math.round(TILE_RADIUS * (tileSize / TILE_SIZE));

  const gw = gridPixelWidth(gridCols, tileSize, tileGap);
  const gh = gridPixelHeight(gridRows, tileSize, tileGap);

  const gridOffsetX = Math.round((canvasW - gw) / 2);
  const gridOffsetY = Math.round(headerH + (availH - gh) / 2 + GRID_PADDING);

  const statusBarY = gridOffsetY + gh + 8;
  const toolPaletteY = statusBarY + statusH + 6;
  const controlsY = toolPaletteY + paletteH + 6;

  return {
    canvasW,
    canvasH,
    headerH,
    gridOffsetX,
    gridOffsetY,
    statusBarY,
    toolPaletteY,
    controlsY,
    tileSize,
    tileGap,
    tileRadius,
  };
}
