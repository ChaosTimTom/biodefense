import type { MedicineType, PathogenType, ToolId } from "../sim/types";

export type AudioCue =
  | "ui_tap"
  | "ui_toggle"
  | "tool_place"
  | "turn_step"
  | "spread"
  | "kill"
  | "win"
  | "lose";

export type HapticCue =
  | "soft"
  | "medium"
  | "success"
  | "warning";

export interface Theme {
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  colors: {
    bgTop: string;
    bgBottom: string;
    panel: string;
    panelBorder: string;
    panelEdge: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentSoft: string;
    gold: string;
    success: string;
    danger: string;
    shadow: string;
  };
  motion: {
    fast: number;
    medium: number;
    slow: number;
    ambient: number;
  };
}

export interface WorldTheme {
  id: number;
  name: string;
  tagline: string;
  accent: string;
  accentNumber: number;
  glow: string;
  top: string;
  bottom: string;
  card: string;
  border: string;
  particle: number[];
  titleGlyph: string;
}

export interface LayoutProfile {
  safeTop: number;
  safeBottom: number;
  contentWidth: number;
  compact: boolean;
}

export interface AssetManifest {
  backgrounds: Record<number, string>;
  pathogens: Record<PathogenType, string>;
  medicines: Record<MedicineType, string>;
  tiles: {
    empty: string;
    wall: string;
    perWorld: Record<number, { empty: string; wall: string }>;
  };
  icons: Record<ToolId | "lock", string>;
}

export interface HudState {
  levelTitle: string;
  objectiveText: string;
  turnLabel: string;
  infectionPct: number;
  actionsRemaining: number;
  actionsMax: number;
}

export interface PreviewComparisonState {
  blockedThreats: string[];
  addedThreats: string[];
}

export interface BoardRenderModel {
  rows: number;
  cols: number;
  world: number;
}

export interface RenderEvent {
  type: "birth" | "dead_zone" | "kill" | "preview" | "win" | "lose";
  x?: number;
  y?: number;
}

export const APP_THEME: Theme = {
  fonts: {
    display: "'Outfit', 'Avenir Next', 'Segoe UI', sans-serif",
    body: "'Plus Jakarta Sans', 'Segoe UI', 'Trebuchet MS', sans-serif",
    mono: "'Consolas', 'Menlo', monospace",
  },
  colors: {
    bgTop: "#09111d",
    bgBottom: "#040812",
    panel: "rgba(10, 22, 38, 0.76)",
    panelBorder: "rgba(255,255,255,0.08)",
    panelEdge: "rgba(0,229,255,0.24)",
    textPrimary: "#f4fbff",
    textSecondary: "#b8cad8",
    textMuted: "#70849a",
    accent: "#00e5ff",
    accentSoft: "rgba(0,229,255,0.18)",
    gold: "#ffd740",
    success: "#00e676",
    danger: "#ff5252",
    shadow: "rgba(1, 6, 14, 0.68)",
  },
  motion: {
    fast: 140,
    medium: 260,
    slow: 420,
    ambient: 2600,
  },
};

export const WORLD_THEMES: Record<number, WorldTheme> = {
  1: {
    id: 1,
    name: "Petri Dish",
    tagline: "Sterile glass. Precise control.",
    accent: "#7df7bf",
    accentNumber: 0x7df7bf,
    glow: "rgba(125,247,191,0.28)",
    top: "#08161a",
    bottom: "#0d2c26",
    card: "rgba(10, 34, 29, 0.78)",
    border: "rgba(125,247,191,0.22)",
    particle: [0x7df7bf, 0x00e5ff, 0xc4ffe5],
    titleGlyph: "🧫",
  },
  2: {
    id: 2,
    name: "Bloodstream",
    tagline: "Flow control under pressure.",
    accent: "#ff7a7a",
    accentNumber: 0xff7a7a,
    glow: "rgba(255,122,122,0.28)",
    top: "#1b060d",
    bottom: "#4f0f1f",
    card: "rgba(45, 9, 18, 0.8)",
    border: "rgba(255,122,122,0.24)",
    particle: [0xff7a7a, 0xff9d80, 0xffc6c6],
    titleGlyph: "🩸",
  },
  3: {
    id: 3,
    name: "Tissue",
    tagline: "Dense membranes. Smart routes.",
    accent: "#c88cff",
    accentNumber: 0xc88cff,
    glow: "rgba(200,140,255,0.28)",
    top: "#12081e",
    bottom: "#2e1145",
    card: "rgba(26, 13, 42, 0.8)",
    border: "rgba(200,140,255,0.24)",
    particle: [0xc88cff, 0x9f7aea, 0xe9d5ff],
    titleGlyph: "🔬",
  },
  4: {
    id: 4,
    name: "Pandemic",
    tagline: "Hot zones. Last defenses.",
    accent: "#ffb347",
    accentNumber: 0xffb347,
    glow: "rgba(255,179,71,0.3)",
    top: "#1b0b06",
    bottom: "#45200f",
    card: "rgba(42, 20, 10, 0.82)",
    border: "rgba(255,179,71,0.24)",
    particle: [0xffb347, 0xff7043, 0xffd180],
    titleGlyph: "☣",
  },
};

export const ASSET_MANIFEST: AssetManifest = {
  backgrounds: {
    1: "assets/bg/world_1_petri.png",
    2: "assets/bg/world_2_blood.png",
    3: "assets/bg/world_3_tissue.png",
    4: "assets/bg/world_4_pandemic.png",
  },
  pathogens: {
    coccus: "assets/germs/coccus.png",
    bacillus: "assets/germs/bacillus.png",
    spirillum: "assets/germs/spirillum.png",
    influenza: "assets/germs/influenza.png",
    retrovirus: "assets/germs/retrovirus.png",
    phage: "assets/germs/phage.png",
    mold: "assets/germs/mold.png",
    yeast: "assets/germs/yeast.png",
    spore: "assets/germs/spore.png",
  },
  medicines: {
    penicillin: "assets/germs/penicillin.png",
    tetracycline: "assets/germs/tetracycline.png",
    streptomycin: "assets/germs/streptomycin.png",
    tamiflu: "assets/germs/tamiflu.png",
    zidovudine: "assets/germs/zidovudine.png",
    interferon: "assets/germs/interferon.png",
    fluconazole: "assets/germs/fluconazole.png",
    nystatin: "assets/germs/nystatin.png",
    amphotericin: "assets/germs/amphotericin.png",
  },
  tiles: {
    empty: "assets/tiles/tile_empty.png",
    wall: "assets/tiles/tile_wall.png",
    perWorld: {
      1: { empty: "assets/tiles/tile_empty_w1.png", wall: "assets/tiles/tile_wall_w1.png" },
      2: { empty: "assets/tiles/tile_empty_w2.png", wall: "assets/tiles/tile_wall_w2.png" },
      3: { empty: "assets/tiles/tile_empty_w3.png", wall: "assets/tiles/tile_wall_w3.png" },
      4: { empty: "assets/tiles/tile_empty_w4.png", wall: "assets/tiles/tile_wall_w4.png" },
    },
  },
  icons: {
    penicillin: "icon_penicillin",
    tetracycline: "icon_tetracycline",
    streptomycin: "icon_streptomycin",
    tamiflu: "icon_tamiflu",
    zidovudine: "icon_zidovudine",
    interferon: "icon_interferon",
    fluconazole: "icon_fluconazole",
    nystatin: "icon_nystatin",
    amphotericin: "icon_amphotericin",
    wall: "icon_wall",
    lock: "icon_lock",
  },
};

export function getWorldTheme(worldId: number): WorldTheme {
  return WORLD_THEMES[worldId] ?? WORLD_THEMES[1];
}

