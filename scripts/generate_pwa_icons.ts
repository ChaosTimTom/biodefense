/**
 * scripts/generate_pwa_icons.ts
 * Generates 192×192 and 512×512 PWA icons for Bio Defence.
 * Uses a simple canvas approach with node-canvas-like logic,
 * but since we may not have node-canvas, we'll generate SVG→PNG
 * via a small inline approach, or just create clean SVGs that
 * browsers can use directly.
 *
 * Run: npx tsx scripts/generate_pwa_icons.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICONS_DIR = path.resolve(__dirname, "../public/icons");
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

function generateSVG(size: number): string {
  const r = size / 2;
  const pad = size * 0.08;
  const inner = size - pad * 2;

  // Biohazard-inspired icon with green on dark background
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#141430"/>
      <stop offset="100%" stop-color="#0a0a1a"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00ff88" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#00ff88" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>

  <!-- Subtle glow -->
  <circle cx="${r}" cy="${r}" r="${r * 0.6}" fill="url(#glow)"/>

  <!-- Shield shape -->
  <path d="M ${r} ${pad + inner * 0.05}
           L ${pad + inner * 0.85} ${pad + inner * 0.2}
           Q ${pad + inner * 0.88} ${pad + inner * 0.55} ${r} ${pad + inner * 0.95}
           Q ${pad + inner * 0.12} ${pad + inner * 0.55} ${pad + inner * 0.15} ${pad + inner * 0.2}
           Z"
        fill="none" stroke="#00ff88" stroke-width="${size * 0.02}"
        stroke-linejoin="round" opacity="0.9"/>

  <!-- Inner shield fill -->
  <path d="M ${r} ${pad + inner * 0.1}
           L ${pad + inner * 0.82} ${pad + inner * 0.23}
           Q ${pad + inner * 0.84} ${pad + inner * 0.53} ${r} ${pad + inner * 0.9}
           Q ${pad + inner * 0.16} ${pad + inner * 0.53} ${pad + inner * 0.18} ${pad + inner * 0.23}
           Z"
        fill="#00ff8815"/>

  <!-- Cross / plus in center -->
  <rect x="${r - size * 0.04}" y="${r - size * 0.15}" width="${size * 0.08}" height="${size * 0.3}"
        rx="${size * 0.015}" fill="#00ff88" opacity="0.95"/>
  <rect x="${r - size * 0.15}" y="${r - size * 0.04}" width="${size * 0.3}" height="${size * 0.08}"
        rx="${size * 0.015}" fill="#00ff88" opacity="0.95"/>

  <!-- Small pathogen circles -->
  <circle cx="${r - size * 0.22}" cy="${r - size * 0.18}" r="${size * 0.035}"
          fill="#ff4466" opacity="0.8"/>
  <circle cx="${r + size * 0.24}" cy="${r - size * 0.12}" r="${size * 0.025}"
          fill="#ff6644" opacity="0.7"/>
  <circle cx="${r + size * 0.18}" cy="${r + size * 0.22}" r="${size * 0.03}"
          fill="#ff4466" opacity="0.75"/>
  <circle cx="${r - size * 0.2}" cy="${r + size * 0.2}" r="${size * 0.02}"
          fill="#ff6644" opacity="0.65"/>

  <!-- "BD" text -->
  <text x="${r}" y="${r + size * 0.32}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="900"
        font-size="${size * 0.1}" fill="#00ff88" opacity="0.6"
        letter-spacing="${size * 0.015}">BIO DEF</text>
</svg>`;
}

// Write SVG files (browsers support SVG icons, and we can convert to PNG later)
for (const size of [192, 512]) {
  const svg = generateSVG(size);
  const svgPath = path.join(ICONS_DIR, `icon-${size}.svg`);
  fs.writeFileSync(svgPath, svg, "utf-8");
  console.log(`✅ Created ${svgPath}`);
}

// Also create a simple favicon SVG
const faviconSvg = generateSVG(32);
fs.writeFileSync(path.join(ICONS_DIR, "favicon.svg"), faviconSvg, "utf-8");
console.log("✅ Created favicon.svg");

console.log("\n⚠️  SVG icons created. For full PWA support, convert to PNG:");
console.log("   You can use any online SVG-to-PNG converter, or install sharp/canvas.");
console.log("   For now, we'll also add SVG icon entries to the manifest as a fallback.");
