import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const OUTPUT_DIR = path.join(ROOT, "public", "assets", "generated");
const MANIFEST_PATH = path.join(ROOT, "src", "game", "generatedAssets.ts");

const MODEL = "gemini-2.5-flash-image";

const WORLD_PROMPTS = {
  1: "Premium mobile game background, sterile laboratory petri dish viewed through a microscope, luminous aqua and mint bioluminescence, soft glass reflections, dark navy shadows, cinematic depth, no text, portrait composition, polished indie mobile game art",
  2: "Premium mobile game background, bloodstream capillary chamber with flowing crimson plasma and glowing cellular shapes, dramatic red and cyan contrast, microscope atmosphere, no text, portrait composition, polished indie mobile game art",
  3: "Premium mobile game background, dense organic tissue membranes with violet bio-lights, layered translucent cells, mysterious medical sci-fi atmosphere, no text, portrait composition, polished indie mobile game art",
  4: "Premium mobile game background, quarantine outbreak zone with fiery orange-red biohazard glow, emergency containment glass, cinematic tension, no text, portrait composition, polished indie mobile game art",
};

const BOSS_PROMPTS = {
  w1_boss: "Portrait boss splash art for a premium mobile tactics game, giant agar hydra microorganism with glowing mint tentacle sacs and a glassy bioluminescent core, dark navy microscope background, no text, dramatic center composition",
  w2_boss: "Portrait boss splash art for a premium mobile tactics game, pulse vector bloodstream super-virus with glowing crimson shield membranes and capillary arcs, no text, dramatic center composition",
  w3_boss: "Portrait boss splash art for a premium mobile tactics game, mycelial heart organism with violet fungal roots and luminous tissue core, no text, dramatic center composition",
  w4_boss: "Portrait boss splash art for a premium mobile tactics game, pandemic crown apex pathogen with orange-red corona spikes and quarantine energy, no text, dramatic center composition",
};

const PATHOGEN_PROMPTS = {
  coccus: "Premium mobile game sprite sheet subject, single coccus bacteria cluster, glowing green bioluminescent spheres with polished highlights, centered, transparent or very dark clean background, no text, icon-ready",
  bacillus: "Premium mobile game sprite subject, single bacillus bacteria rod with luminous lime membrane and subtle internal detail, centered, transparent or very dark clean background, no text, icon-ready",
  spirillum: "Premium mobile game sprite subject, single spirillum microorganism with teal spiral body and neon glow, centered, transparent or very dark clean background, no text, icon-ready",
  influenza: "Premium mobile game sprite subject, single influenza virus, red spiky sphere with glossy mobile-game shading, centered, transparent or very dark clean background, no text, icon-ready",
  retrovirus: "Premium mobile game sprite subject, single retrovirus, crimson polyhedral virus with glowing facets, centered, transparent or very dark clean background, no text, icon-ready",
  phage: "Premium mobile game sprite subject, single bacteriophage with orange glassy head and leg appendages, centered, transparent or very dark clean background, no text, icon-ready",
  mold: "Premium mobile game sprite subject, single mold fungus cluster with purple branching hyphae and glow, centered, transparent or very dark clean background, no text, icon-ready",
  yeast: "Premium mobile game sprite subject, single yeast cell cluster with lavender budding ovals and gloss, centered, transparent or very dark clean background, no text, icon-ready",
  spore: "Premium mobile game sprite subject, single spore fungus burst with deep violet starburst form and energy halo, centered, transparent or very dark clean background, no text, icon-ready",
};

const MEDICINE_PROMPTS = {
  penicillin: "Premium mobile game sprite subject, futuristic penicillin medicine icon, cyan healing capsule and medical energy glow, centered, transparent or very dark clean background, no text, icon-ready",
  tetracycline: "Premium mobile game sprite subject, futuristic tetracycline medicine icon, bright cyan capsule with premium glow, centered, transparent or very dark clean background, no text, icon-ready",
  streptomycin: "Premium mobile game sprite subject, futuristic streptomycin tool icon, teal biotech vial or injector with healing glow, centered, transparent or very dark clean background, no text, icon-ready",
  tamiflu: "Premium mobile game sprite subject, futuristic tamiflu tool icon, lime antiviral capsule and shield energy, centered, transparent or very dark clean background, no text, icon-ready",
  zidovudine: "Premium mobile game sprite subject, futuristic zidovudine tool icon, lime green antiviral ampoule with digital rings, centered, transparent or very dark clean background, no text, icon-ready",
  interferon: "Premium mobile game sprite subject, futuristic interferon tool icon, yellow-green immune stimulator with bolt-like energy, centered, transparent or very dark clean background, no text, icon-ready",
  fluconazole: "Premium mobile game sprite subject, futuristic fluconazole tool icon, pink antifungal vial with elegant biotech glow, centered, transparent or very dark clean background, no text, icon-ready",
  nystatin: "Premium mobile game sprite subject, futuristic nystatin tool icon, magenta droplet medicine with glow halo, centered, transparent or very dark clean background, no text, icon-ready",
  amphotericin: "Premium mobile game sprite subject, futuristic amphotericin tool icon, violet antifungal ampoule with intense glow, centered, transparent or very dark clean background, no text, icon-ready",
};

const TILE_PROMPTS = {
  empty: "Premium mobile game tile texture, dark biotech glass board cell viewed from top-down, subtle neon rim, clean square tile, no text",
  wall: "Premium mobile game tile texture, reinforced quarantine wall cell viewed from top-down, metallic dark bio-lab material with hazard glow, clean square tile, no text",
  world_1_empty: "Premium mobile game top-down tile texture for petri dish world, sterile mint glass membrane tile, soft microscope glow, no text",
  world_1_wall: "Premium mobile game top-down wall tile for petri dish world, sterile lab barrier with mint quarantine accents, no text",
  world_2_empty: "Premium mobile game top-down tile texture for bloodstream world, deep crimson plasma tile with glossy depth, no text",
  world_2_wall: "Premium mobile game top-down wall tile for bloodstream world, capillary barrier tile with dark red reinforced membrane, no text",
  world_3_empty: "Premium mobile game top-down tile texture for tissue world, violet organic membrane tile with layered cell texture, no text",
  world_3_wall: "Premium mobile game top-down wall tile for tissue world, dense tissue barricade with purple bio-structure, no text",
  world_4_empty: "Premium mobile game top-down tile texture for pandemic world, orange-red quarantine zone tile with warning glow, no text",
  world_4_wall: "Premium mobile game top-down wall tile for pandemic world, hardened outbreak barricade with hazard highlights, no text",
};

function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

async function readKey() {
  const envText = await fs.readFile(ENV_PATH, "utf8");
  const env = parseEnv(envText);
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "PASTE_YOUR_KEY_HERE") {
    throw new Error("GEMINI_API_KEY is missing from .env.local");
  }
  return apiKey;
}

async function generateImage(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const part = candidate?.content?.parts?.find((item) => item.inlineData?.data);
  if (!part?.inlineData?.data) {
    throw new Error(`Gemini returned no image data for prompt: ${prompt}`);
  }

  return {
    mimeType: part.inlineData.mimeType || "image/png",
    data: part.inlineData.data,
  };
}

async function generateImageWithRetry(prompt, apiKey, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await generateImage(prompt, apiKey);
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${attempts} failed.`);
    }
  }
  throw lastError;
}

function extensionForMime(mimeType) {
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg")) return "jpg";
  return "png";
}

async function writeImage(fileBase, image) {
  const ext = extensionForMime(image.mimeType);
  const outPath = path.join(OUTPUT_DIR, `${fileBase}.${ext}`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, Buffer.from(image.data, "base64"));
  return `assets/generated/${fileBase}.${ext}`;
}

async function main() {
  const apiKey = await readKey();
  const manifest = {
    backgrounds: {},
    bossSplashes: {},
    pathogens: {},
    medicines: {},
    tiles: {
      perWorld: {},
    },
  };

  for (const [worldId, prompt] of Object.entries(WORLD_PROMPTS)) {
    console.log(`Generating world ${worldId} background...`);
    try {
      const image = await generateImageWithRetry(prompt, apiKey);
      manifest.backgrounds[worldId] = await writeImage(`world_${worldId}_generated`, image);
    } catch (error) {
      console.warn(`Skipping world ${worldId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  for (const [bossId, prompt] of Object.entries(BOSS_PROMPTS)) {
    console.log(`Generating ${bossId} splash...`);
    try {
      const image = await generateImageWithRetry(prompt, apiKey);
      manifest.bossSplashes[bossId] = await writeImage(`${bossId}_splash`, image);
    } catch (error) {
      console.warn(`Skipping ${bossId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  for (const [id, prompt] of Object.entries(PATHOGEN_PROMPTS)) {
    console.log(`Generating pathogen ${id}...`);
    try {
      const image = await generateImageWithRetry(prompt, apiKey);
      manifest.pathogens[id] = await writeImage(`pathogen_${id}`, image);
    } catch (error) {
      console.warn(`Skipping pathogen ${id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  for (const [id, prompt] of Object.entries(MEDICINE_PROMPTS)) {
    console.log(`Generating medicine ${id}...`);
    try {
      const image = await generateImageWithRetry(prompt, apiKey);
      manifest.medicines[id] = await writeImage(`medicine_${id}`, image);
    } catch (error) {
      console.warn(`Skipping medicine ${id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  for (const [id, prompt] of Object.entries(TILE_PROMPTS)) {
    console.log(`Generating tile ${id}...`);
    try {
      const image = await generateImageWithRetry(prompt, apiKey);
      const assetPath = await writeImage(`tile_${id}`, image);
      if (id === "empty" || id === "wall") {
        manifest.tiles[id] = assetPath;
      } else {
        const match = /^world_(\d+)_(empty|wall)$/.exec(id);
        if (match) {
          const worldId = Number(match[1]);
          const kind = match[2];
          manifest.tiles.perWorld[worldId] ??= {};
          manifest.tiles.perWorld[worldId][kind] = assetPath;
        }
      }
    } catch (error) {
      console.warn(`Skipping tile ${id}: ${error instanceof Error ? error.message : error}`);
    }
  }

  const source = `export interface GeneratedAssetManifest {\n  backgrounds: Partial<Record<number, string>>;\n  bossSplashes: Record<string, string>;\n  pathogens: Partial<Record<string, string>>;\n  medicines: Partial<Record<string, string>>;\n  tiles: {\n    empty?: string;\n    wall?: string;\n    perWorld: Partial<Record<number, { empty?: string; wall?: string }>>;\n  };\n}\n\nexport const GENERATED_ASSET_MANIFEST: GeneratedAssetManifest = ${JSON.stringify(manifest, null, 2)};\n`;
  await fs.writeFile(MANIFEST_PATH, source, "utf8");

  console.log("Generated assets complete.");
  console.log(`Manifest written to ${MANIFEST_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
