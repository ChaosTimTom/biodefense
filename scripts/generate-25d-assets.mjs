import fs from "node:fs/promises";
import path from "node:path";
import { access } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "public", "assets", "rendered25d");
const MANIFEST_PATH = path.join(ROOT, "src", "game", "render25dAssets.ts");
const BLENDER_SCRIPT = path.join(ROOT, "scripts", "blender", "render_25d_assets.py");

const PATHOGENS = [
  "coccus",
  "bacillus",
  "spirillum",
  "influenza",
  "retrovirus",
  "phage",
  "mold",
  "yeast",
  "spore",
];

const MEDICINES = [
  "penicillin",
  "tetracycline",
  "streptomycin",
  "tamiflu",
  "zidovudine",
  "interferon",
  "fluconazole",
  "nystatin",
  "amphotericin",
];

const BLENDER_CANDIDATES = [
  process.env.BLENDER_PATH,
  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe",
  "C:\\Program Files\\Blender Foundation\\Blender\\blender.exe",
].filter(Boolean);

async function exists(filePath) {
  try {
    await access(filePath, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveBlenderPath() {
  for (const candidate of BLENDER_CANDIDATES) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  throw new Error("Blender executable was not found. Set BLENDER_PATH to continue.");
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

function assetPath(fileName) {
  return `assets/rendered25d/${fileName}`;
}

async function versionedAssetPath(fileName) {
  const fullPath = path.join(OUTPUT_DIR, fileName);
  const stats = await fs.stat(fullPath);
  return `${assetPath(fileName)}?v=${Math.floor(stats.mtimeMs)}`;
}

async function buildManifestSource() {
  const manifest = {
    pathogens: {},
    medicines: {},
    tiles: {
      perWorld: {},
    },
  };

  for (const pathogen of PATHOGENS) {
    const fileName = `pathogen_${pathogen}.png`;
    if (await exists(path.join(OUTPUT_DIR, fileName))) {
      manifest.pathogens[pathogen] = await versionedAssetPath(fileName);
    }
  }

  for (const medicine of MEDICINES) {
    const fileName = `medicine_${medicine}.png`;
    if (await exists(path.join(OUTPUT_DIR, fileName))) {
      manifest.medicines[medicine] = await versionedAssetPath(fileName);
    }
  }

  if (await exists(path.join(OUTPUT_DIR, "tile_empty.png"))) {
    manifest.tiles.empty = await versionedAssetPath("tile_empty.png");
  }
  if (await exists(path.join(OUTPUT_DIR, "tile_wall.png"))) {
    manifest.tiles.wall = await versionedAssetPath("tile_wall.png");
  }

  for (let world = 1; world <= 4; world += 1) {
    const emptyFile = `tile_empty_w${world}.png`;
    const wallFile = `tile_wall_w${world}.png`;
    const entry = {};
    if (await exists(path.join(OUTPUT_DIR, emptyFile))) {
      entry.empty = await versionedAssetPath(emptyFile);
    }
    if (await exists(path.join(OUTPUT_DIR, wallFile))) {
      entry.wall = await versionedAssetPath(wallFile);
    }
    if (Object.keys(entry).length > 0) {
      manifest.tiles.perWorld[world] = entry;
    }
  }

  return `export interface Render25dManifest {\n  pathogens: Partial<Record<string, string>>;\n  medicines: Partial<Record<string, string>>;\n  tiles: {\n    empty?: string;\n    wall?: string;\n    perWorld: Partial<Record<number, { empty?: string; wall?: string }>>;\n  };\n}\n\nexport const RENDER_25D_MANIFEST: Render25dManifest = ${JSON.stringify(manifest, null, 2)};\n`;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const blenderPath = await resolveBlenderPath();
  const extraArgs = process.argv.slice(2);
  await runCommand(blenderPath, [
    "--background",
    "--factory-startup",
    "--python",
    BLENDER_SCRIPT,
    "--",
    "--output",
    OUTPUT_DIR,
    "--size",
    "320",
    ...extraArgs,
  ]);

  const source = await buildManifestSource();
  await fs.writeFile(MANIFEST_PATH, source, "utf8");
  console.log(`2.5D manifest written to ${path.relative(ROOT, MANIFEST_PATH)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
