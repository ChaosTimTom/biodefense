// ═══════════════════════════════════════════════════
// src/game/ui/UIFactory.ts — Modern UI construction utilities
// Gradient textures, styled buttons, panels, stars, transitions
// ═══════════════════════════════════════════════════

import Phaser from "phaser";

export const UI_FONT = "'Orbitron', sans-serif";

// ── Canvas Helpers ───────────────────────────────

function rrPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Texture Generators ───────────────────────────

export function genGradientTex(
  scene: Phaser.Scene, key: string, w: number, h: number,
  stops: [number, string][], direction: "v" | "h" | "radial" = "v",
): void {
  if (scene.textures.exists(key)) return;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const grd = direction === "radial"
    ? ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7)
    : direction === "h"
      ? ctx.createLinearGradient(0, 0, w, 0)
      : ctx.createLinearGradient(0, 0, 0, h);
  for (const [p, col] of stops) grd.addColorStop(p, col);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  scene.textures.addCanvas(key, c);
}

export function genBtnTex(
  scene: Phaser.Scene, key: string, w: number, h: number, r: number,
  topCol: string, botCol: string, borderCol: string, borderW = 1.5,
): void {
  if (scene.textures.exists(key)) return;
  const pad = 6;
  const c = document.createElement("canvas");
  c.width = w + pad * 2; c.height = h + pad * 2;
  const ctx = c.getContext("2d")!;
  // Drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  rrPath(ctx, pad, pad, w, h, r);
  const grd = ctx.createLinearGradient(pad, pad, pad, pad + h);
  grd.addColorStop(0, topCol);
  grd.addColorStop(1, botCol);
  ctx.fillStyle = grd;
  ctx.fill();
  // Border
  ctx.shadowColor = "transparent";
  rrPath(ctx, pad, pad, w, h, r);
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = borderW;
  ctx.stroke();
  // Top highlight
  ctx.save();
  rrPath(ctx, pad + 1, pad + 1, w - 2, h * 0.4, Math.max(1, r - 1));
  ctx.clip();
  const hl = ctx.createLinearGradient(0, pad, 0, pad + h * 0.4);
  hl.addColorStop(0, "rgba(255,255,255,0.10)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.fillRect(pad, pad, w, h * 0.4);
  ctx.restore();
  scene.textures.addCanvas(key, c);
}

export function genPanelTex(
  scene: Phaser.Scene, key: string, w: number, h: number, r: number,
  bgCol = "rgba(22,22,43,0.92)", borderCol = "rgba(0,229,255,0.15)",
): void {
  if (scene.textures.exists(key)) return;
  const pad = 8;
  const c = document.createElement("canvas");
  c.width = w + pad * 2; c.height = h + pad * 2;
  const ctx = c.getContext("2d")!;
  // Shadow
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  rrPath(ctx, pad, pad, w, h, r);
  ctx.fillStyle = bgCol;
  ctx.fill();
  // Border
  ctx.shadowColor = "transparent";
  rrPath(ctx, pad, pad, w, h, r);
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  scene.textures.addCanvas(key, c);
}

export function genCircleTex(
  scene: Phaser.Scene, key: string, diam: number,
  topCol: string, botCol: string, borderCol: string,
): void {
  if (scene.textures.exists(key)) return;
  const pad = 4;
  const c = document.createElement("canvas");
  c.width = diam + pad * 2; c.height = diam + pad * 2;
  const ctx = c.getContext("2d")!;
  const rad = diam / 2;
  // Shadow
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(rad + pad, rad + pad, rad, 0, Math.PI * 2);
  ctx.closePath();
  const grd = ctx.createLinearGradient(pad, pad, pad, pad + diam);
  grd.addColorStop(0, topCol);
  grd.addColorStop(1, botCol);
  ctx.fillStyle = grd;
  ctx.fill();
  // Border
  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.arc(rad + pad, rad + pad, rad - 1, 0, Math.PI * 2);
  ctx.closePath();
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  scene.textures.addCanvas(key, c);
}

export function genVignette(scene: Phaser.Scene, w: number, h: number): void {
  const key = "vignette";
  if (scene.textures.exists(key)) return;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.8);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  scene.textures.addCanvas(key, c);
}

// ── Button Styles ────────────────────────────────

export type ButtonStyle = "primary" | "gold" | "danger" | "secondary" | "success";

const BTN_STYLES: Record<ButtonStyle, { top: string; bot: string; border: string; font: string }> = {
  primary:   { top: "#1a3a5c", bot: "#0d2238", border: "rgba(0,229,255,0.35)", font: "#00e5ff" },
  gold:      { top: "#4a3a10", bot: "#2a1e08", border: "rgba(255,215,64,0.35)", font: "#ffd740" },
  danger:    { top: "#4a1a1a", bot: "#2a0d0d", border: "rgba(255,68,68,0.35)", font: "#ff6666" },
  secondary: { top: "#2a2a40", bot: "#1a1a2a", border: "rgba(170,170,204,0.25)", font: "#aaaacc" },
  success:   { top: "#1a3a20", bot: "#0d2210", border: "rgba(76,175,80,0.35)", font: "#66bb6a" },
};

export function getButtonStyle(style: ButtonStyle) {
  return BTN_STYLES[style];
}

// ── High-Level Builders ──────────────────────────

/** Add gradient background + vignette to any scene */
export function addBackground(scene: Phaser.Scene, variant: "dark" | "title" | "win" = "dark"): void {
  const { width: w, height: h } = scene.cameras.main;
  const bgKey = `bg_${variant}`;
  const stops: [number, string][] = variant === "title"
    ? [[0, "#0d1b2a"], [0.5, "#142840"], [1, "#0a1628"]]
    : variant === "win"
      ? [[0, "#0d1b2a"], [0.5, "#1a2d40"], [1, "#0d1520"]]
      : [[0, "#0a0e1a"], [0.5, "#0d1525"], [1, "#080c16"]];
  genGradientTex(scene, bgKey, w, h, stops);
  scene.add.image(w / 2, h / 2, bgKey).setDepth(0);
  genVignette(scene, w, h);
  scene.add.image(w / 2, h / 2, "vignette").setDepth(0).setAlpha(0.6);
}

/** Floating bio-particle decorations */
export function addBioParticles(scene: Phaser.Scene, count = 15): void {
  const { width: w, height: h } = scene.cameras.main;
  const colors = [0x00e5ff, 0x4caf50, 0xf44336, 0x9c27b0, 0x76ff03, 0xea80fc];
  for (let i = 0; i < count; i++) {
    const size = 3 + Math.random() * 12;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const gfx = scene.add.graphics().setDepth(1);
    gfx.fillStyle(color, 0.4);
    gfx.fillCircle(0, 0, size);
    gfx.fillStyle(color, 0.12);
    gfx.fillCircle(0, 0, size * 2);
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    gfx.setPosition(sx, sy).setAlpha(0.08 + Math.random() * 0.12);
    scene.tweens.add({
      targets: gfx,
      x: sx + (Math.random() - 0.5) * 100,
      y: sy + (Math.random() - 0.5) * 100,
      alpha: { from: gfx.alpha, to: gfx.alpha * 0.4 },
      duration: 5000 + Math.random() * 5000,
      yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }
}

/** Styled gradient button with press/hover animations */
export interface BtnOpts {
  w?: number; h?: number; r?: number;
  style?: ButtonStyle;
  fontSize?: string;
  icon?: string;
  depth?: number;
}

export function addButton(
  scene: Phaser.Scene, x: number, y: number, label: string,
  callback: () => void, opts: BtnOpts = {},
): Phaser.GameObjects.Container {
  const w = opts.w ?? 220;
  const h = opts.h ?? 52;
  const r = opts.r ?? 12;
  const depth = opts.depth ?? 10;
  const styleName = opts.style ?? "primary";
  const st = BTN_STYLES[styleName];
  const key = `btn_${styleName}_${w}x${h}`;
  genBtnTex(scene, key, w, h, r, st.top, st.bot, st.border);

  const cont = scene.add.container(x, y).setDepth(depth);
  cont.add(scene.add.image(0, 0, key));

  const displayText = opts.icon ? `${opts.icon}  ${label}` : label;
  cont.add(scene.add.text(0, 0, displayText, {
    fontSize: opts.fontSize ?? "15px",
    color: st.font,
    fontFamily: UI_FONT,
    fontStyle: "bold",
  }).setOrigin(0.5));

  const zone = scene.add.rectangle(0, 0, w + 12, h + 12)
    .setInteractive({ useHandCursor: true }).setAlpha(0.001);
  cont.add(zone);

  zone.on("pointerdown", () => {
    cont.setScale(0.95);
    scene.time.delayedCall(120, () => { cont.setScale(1); callback(); });
  });
  zone.on("pointerover", () => cont.setScale(1.03));
  zone.on("pointerout", () => cont.setScale(1));

  return cont;
}

/** Draw a 5-pointed star polygon */
export function drawStar(
  gfx: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  outerR: number, innerR: number,
  fillColor: number, alpha = 1,
  strokeColor?: number,
): void {
  const pts = 5;
  const step = Math.PI / pts;
  gfx.fillStyle(fillColor, alpha);
  gfx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const rad = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const px = cx + rad * Math.cos(angle);
    const py = cy + rad * Math.sin(angle);
    if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
  }
  gfx.closePath();
  gfx.fillPath();
  if (strokeColor !== undefined) {
    gfx.lineStyle(1.5, strokeColor, 0.8);
    gfx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const rad = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      const px = cx + rad * Math.cos(angle);
      const py = cy + rad * Math.sin(angle);
      if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
    }
    gfx.closePath();
    gfx.strokePath();
  }
}

/** Smooth fade transition to another scene */
export function fadeToScene(
  scene: Phaser.Scene, target: string, data?: object, duration = 300,
): void {
  scene.cameras.main.fadeOut(duration, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(target, data);
  });
}

/** Fade in on scene enter */
export function fadeIn(scene: Phaser.Scene, duration = 300): void {
  scene.cameras.main.fadeIn(duration, 0, 0, 0);
}

// ── Tool & Lock Icons (canvas-drawn, DPR-independent) ──

const ICON_RENDER_SCALE = 3; // generate at 3× for crisp display at any DPR

export function genToolIcons(scene: Phaser.Scene): void {
  const size = 24;
  const S = size * ICON_RENDER_SCALE;
  const half = S / 2;
  const sc = ICON_RENDER_SCALE;

  interface IconDef {
    key: string;
    draw: (ctx: CanvasRenderingContext2D) => void;
  }

  const icons: IconDef[] = [
    {
      key: "icon_antibiotic",
      draw: (ctx) => {
        // Medical cross / plus
        const arm = S * 0.18;
        const len = S * 0.32;
        ctx.fillStyle = "#00e5ff";
        ctx.shadowColor = "rgba(0,229,255,0.6)";
        ctx.shadowBlur = 4 * sc;
        // Vertical bar
        ctx.beginPath();
        ctx.roundRect(half - arm, half - len, arm * 2, len * 2, 3 * sc);
        ctx.fill();
        // Horizontal bar
        ctx.beginPath();
        ctx.roundRect(half - len, half - arm, len * 2, arm * 2, 3 * sc);
        ctx.fill();
      },
    },
    {
      key: "icon_antiviral",
      draw: (ctx) => {
        // Shield shape
        ctx.fillStyle = "#76ff03";
        ctx.shadowColor = "rgba(118,255,3,0.5)";
        ctx.shadowBlur = 4 * sc;
        ctx.beginPath();
        ctx.moveTo(half, S * 0.08);
        ctx.lineTo(S * 0.85, S * 0.28);
        ctx.quadraticCurveTo(S * 0.82, S * 0.65, half, S * 0.92);
        ctx.quadraticCurveTo(S * 0.18, S * 0.65, S * 0.15, S * 0.28);
        ctx.closePath();
        ctx.fill();
        // Inner checkmark
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#0d2210";
        ctx.lineWidth = 2.5 * sc;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(S * 0.3, half * 1.02);
        ctx.lineTo(S * 0.44, S * 0.64);
        ctx.lineTo(S * 0.7, S * 0.36);
        ctx.stroke();
      },
    },
    {
      key: "icon_antifungal",
      draw: (ctx) => {
        // DNA double helix
        ctx.lineWidth = 2.5 * sc;
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(234,128,252,0.5)";
        ctx.shadowBlur = 3 * sc;
        const steps = 24;
        const amp = S * 0.24;
        // Strand 1
        ctx.strokeStyle = "#ea80fc";
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const y = S * 0.08 + t * S * 0.84;
          const x = half + Math.sin(t * Math.PI * 2.5) * amp;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Strand 2
        ctx.strokeStyle = "#ce93d8";
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const y = S * 0.08 + t * S * 0.84;
          const x = half - Math.sin(t * Math.PI * 2.5) * amp;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Cross rungs
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(234,128,252,0.3)";
        ctx.lineWidth = 1.5 * sc;
        for (let r = 0; r < 5; r++) {
          const t = (r + 0.5) / 5;
          const y = S * 0.08 + t * S * 0.84;
          const dx = Math.sin(t * Math.PI * 2.5) * amp;
          ctx.beginPath();
          ctx.moveTo(half + dx * 0.6, y);
          ctx.lineTo(half - dx * 0.6, y);
          ctx.stroke();
        }
      },
    },
    {
      key: "icon_wall",
      draw: (ctx) => {
        // Brick pattern
        ctx.fillStyle = "#8d6e63";
        ctx.shadowColor = "rgba(141,110,99,0.5)";
        ctx.shadowBlur = 2 * sc;
        const bw = S * 0.34;
        const bh = S * 0.18;
        const g = S * 0.05;
        const rr = 2 * sc;
        // Row 1 (2 bricks)
        ctx.beginPath(); ctx.roundRect(S * 0.12, S * 0.14, bw, bh, rr); ctx.fill();
        ctx.beginPath(); ctx.roundRect(S * 0.12 + bw + g, S * 0.14, bw, bh, rr); ctx.fill();
        // Row 2 (offset)
        ctx.fillStyle = "#795548";
        ctx.beginPath(); ctx.roundRect(S * 0.28, S * 0.14 + bh + g, bw, bh, rr); ctx.fill();
        ctx.beginPath(); ctx.roundRect(S * 0.28 + bw + g, S * 0.14 + bh + g, bw, bh, rr); ctx.fill();
        // Row 3
        ctx.fillStyle = "#8d6e63";
        ctx.beginPath(); ctx.roundRect(S * 0.12, S * 0.14 + (bh + g) * 2, bw, bh, rr); ctx.fill();
        ctx.beginPath(); ctx.roundRect(S * 0.12 + bw + g, S * 0.14 + (bh + g) * 2, bw, bh, rr); ctx.fill();
      },
    },
  ];

  for (const icon of icons) {
    if (scene.textures.exists(icon.key)) continue;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const ctx = c.getContext("2d")!;
    icon.draw(ctx);
    scene.textures.addCanvas(icon.key, c);
  }
}

export function genLockIcon(scene: Phaser.Scene): void {
  const key = "icon_lock";
  if (scene.textures.exists(key)) return;
  const size = 20;
  const S = size * ICON_RENDER_SCALE;
  const half = S / 2;
  const sc = ICON_RENDER_SCALE;

  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;

  ctx.strokeStyle = "#555577";
  ctx.fillStyle = "#555577";
  ctx.shadowColor = "rgba(85,85,119,0.3)";
  ctx.shadowBlur = 2 * sc;

  // Shackle (arc on top)
  ctx.lineWidth = 2.5 * sc;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(half, S * 0.35, S * 0.18, Math.PI, 0);
  ctx.stroke();

  // Body (rounded rectangle)
  ctx.beginPath();
  ctx.roundRect(S * 0.22, S * 0.38, S * 0.56, S * 0.46, 3 * sc);
  ctx.fill();

  // Keyhole
  ctx.fillStyle = "#1a1a2e";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(half, S * 0.54, S * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(half - S * 0.03, S * 0.55, S * 0.06, S * 0.14);

  scene.textures.addCanvas(key, c);
}

/** Icon display size in game pixels */
export const ICON_DISPLAY_SIZE = 24;
export const LOCK_DISPLAY_SIZE = 16;

