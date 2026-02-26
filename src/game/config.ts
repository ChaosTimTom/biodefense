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
  bacteria: 0x4caf50, // green — rod shaped
  virus: 0xf44336,    // red — spiky
  fungus: 0x9c27b0,   // purple — branching
};

export const PATHOGEN_SHAPES: Record<PathogenType, "circle" | "diamond" | "branch"> = {
  bacteria: "circle",
  virus: "diamond",
  fungus: "branch",
};

/** Seamless tile texture key for each pathogen type */
export const PATHOGEN_TEXTURES: Record<PathogenType, string> = {
  bacteria: "bacteria",
  virus: "virus",
  fungus: "fungus",
};

/** Seamless tile texture key for each medicine type */
export const MEDICINE_TEXTURES: Record<MedicineType, string> = {
  antibiotic: "antibacterial",
  antiviral: "antiviral",
  antifungal: "antifungal",
};

/** Background tile texture keyed by TileKind */
export const TILE_BG_TEXTURES: Partial<Record<TileKind, string>> = {
  empty: "tile_empty",
  wall:  "tile_wall",
};

export const PATHOGEN_NAMES: Record<PathogenType, string> = {
  bacteria: "Bacteria",
  virus: "Virus",
  fungus: "Fungus",
};

export const MEDICINE_COLORS: Record<MedicineType, number> = {
  antibiotic: 0x00e5ff, // cyan
  antiviral: 0x76ff03,  // lime green
  antifungal: 0xea80fc, // pink/magenta
};

export const MEDICINE_NAMES: Record<MedicineType, string> = {
  antibiotic: "Antibiotic",
  antiviral: "Antiviral",
  antifungal: "Antifungal",
};

export const TOOL_COLORS: Record<ToolId, number> = {
  antibiotic: 0x00e5ff,
  antiviral: 0x76ff03,
  antifungal: 0xea80fc,
  wall: 0x8d6e63,
};

export const TOOL_LABELS: Record<ToolId, string> = {
  antibiotic: "💊",
  antiviral: "💉",
  antifungal: "🧬",
  wall: "🧱",
};

/** Sprite texture keys for tool palette icons (normal + selected) */
export const TOOL_TEXTURES: Record<ToolId, { normal: string; selected: string }> = {
  antibiotic: { normal: "tool_antibiotic", selected: "tool_antibiotic_selected" },
  antiviral:  { normal: "tool_antiviral",  selected: "tool_antiviral_selected" },
  antifungal: { normal: "tool_antifungal", selected: "tool_antifungal_selected" },
  wall:       { normal: "tool_barrier",    selected: "tool_barrier_selected" },
};

export const TOOL_NAMES: Record<ToolId, string> = {
  antibiotic: "Antibiotic",
  antiviral: "Antiviral",
  antifungal: "Antifungal",
  wall: "Wall",
};

export const TOOL_DESCRIPTIONS: Record<ToolId, string> = {
  antibiotic: "Living medicine cell — kills bacteria on contact, spreads each turn",
  antiviral: "Living medicine cell — kills viruses on contact, spreads each turn",
  antifungal: "Living medicine cell — kills fungi on contact, spreads each turn",
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
  const headerH = 48;
  const statusH = 44;
  const paletteH = 56;
  const controlsH = 48;
  const bottomPad = 12;
  const bottomTotal = statusH + paletteH + controlsH + bottomPad + 12;

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
