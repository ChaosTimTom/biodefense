"""
generate_flux_tiles.py — Generate seamless Bio Defence tiles via FLUX
=====================================================================
Creates 256×256 seamless tileable PNGs for all 9 pathogens, 9 medicines,
tile_empty + tile_wall, and 4 world backgrounds using FLUX.1-schnell.

Each tile is generated at 512×512, mirrored into a 1024×1024 seamless
quad, then center-cropped back to 512×512 to guarantee perfect edge
tiling. Final output is 256×256.

Requirements:
    - NVIDIA GPU with 12+ GB VRAM
    - diffusers, torch, Pillow, accelerate (in the venv)

Usage (from project root):
    "<VENV_PYTHON>" scripts/generate_flux_tiles.py

Output:
    public/assets/germs/{pathogen}.png      (9 files)
    public/assets/germs/{medicine}.png      (9 files)
    public/assets/tiles/tile_empty.png      (1 file)
    public/assets/tiles/tile_wall.png       (1 file)
    public/assets/tiles/tile_empty_w{1-4}.png (4 files)
    public/assets/tiles/tile_wall_w{1-4}.png  (4 files)
    public/assets/bg/world_{1-4}_*.png      (4 files)
"""

import os
import gc
import torch
from diffusers import FluxPipeline
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "assets")

TILE_GEN = 512         # FLUX generation size
TILE_OUT = 256         # Final tile size
BG_GEN_W = 512         # Background generation width
BG_GEN_H = 896         # Background generation height (portrait)
BG_OUT_W = 400
BG_OUT_H = 720

NUM_STEPS = 4
GUIDANCE = 0.0
SEED = 2026

# ---------------------------------------------------------------------------
# Tile style prefix — keeps all tiles in a consistent art style
# ---------------------------------------------------------------------------

STYLE = (
    "seamless tileable pattern, top-down microscopy, "
    "cartoon scientific illustration, vibrant saturated colors, "
    "repeating organic texture that tiles infinitely, "
    "no borders no edges no frame, continuous pattern, "
    "game tile asset, clean bold shapes, "
)

# ---------------------------------------------------------------------------
# Pathogen tile prompts
# ---------------------------------------------------------------------------

PATHOGENS = {
    "coccus": {
        "prompt": (
            STYLE +
            "bright green spherical bacteria, clusters of round cocci, "
            "gram-positive staphylococcus colonies, juicy green spheres "
            "with shiny highlights, packed together, dark green background, "
            "cartoon microbiology, green color palette"
        ),
        "tint": (76, 175, 80),
    },
    "bacillus": {
        "prompt": (
            STYLE +
            "lime green rod-shaped bacteria, elongated capsule bacilli, "
            "scattered rod bacteria with rounded ends, parallel and crossing "
            "lime green rods, cartoon style, dark background, "
            "bacillus cereus illustration, lime green color palette"
        ),
        "tint": (139, 195, 74),
    },
    "spirillum": {
        "prompt": (
            STYLE +
            "teal spiral bacteria, corkscrew shaped spirillum, "
            "wavy S-curved microorganisms, helical bacteria swimming, "
            "teal and dark green, bioluminescent glow, "
            "spirochete illustration, teal aquamarine color palette"
        ),
        "tint": (0, 150, 136),
    },
    "influenza": {
        "prompt": (
            STYLE +
            "bright red influenza virus particles, spherical virions "
            "covered in hemagglutinin spike proteins, classic flu virus, "
            "red spiky spheres floating, crimson and scarlet, "
            "virology illustration, red color palette"
        ),
        "tint": (244, 67, 54),
    },
    "retrovirus": {
        "prompt": (
            STYLE +
            "dark crimson icosahedral retrovirus, geometric viral capsid, "
            "hexagonal lattice structure, HIV-like particle cross-section, "
            "dark red with internal RNA visible, deep crimson, "
            "virology diagram, dark red color palette"
        ),
        "tint": (198, 40, 40),
    },
    "phage": {
        "prompt": (
            STYLE +
            "deep orange bacteriophage T4, spider-like virus with "
            "hexagonal head and tail fibers, alien insect-like micro-robot, "
            "phage army marching, orange and dark amber, "
            "cartoon bacteriophage illustration, orange color palette"
        ),
        "tint": (255, 87, 34),
    },
    "mold": {
        "prompt": (
            STYLE +
            "purple branching mold hyphae, fungal network spreading, "
            "tree-like mycelium branches, fuzzy mold texture, "
            "aspergillus-like branching filaments, rich purple and violet, "
            "mycology illustration, purple color palette"
        ),
        "tint": (156, 39, 176),
    },
    "yeast": {
        "prompt": (
            STYLE +
            "lavender budding yeast cells, oval saccharomyces cerevisiae, "
            "chained oval cells budding and dividing, soft purple ovals "
            "with visible nuclei, gentle lavender and pink, "
            "microbiology illustration, lavender color palette"
        ),
        "tint": (206, 147, 216),
    },
    "spore": {
        "prompt": (
            STYLE +
            "deep violet explosive fungal spores, starburst radiating "
            "spore clouds, dark purple spore capsules bursting open, "
            "dandelion-like dispersal pattern, violent purple explosion, "
            "mycology illustration, deep violet indigo color palette"
        ),
        "tint": (74, 20, 140),
    },
}

# ---------------------------------------------------------------------------
# Medicine tile prompts — each mirrors its pathogen but with treatment theme
# ---------------------------------------------------------------------------

MEDICINES = {
    "penicillin": {
        "prompt": (
            STYLE +
            "cyan blue penicillin antibiotic crystals and molecules, "
            "blue-green crystalline medicine pattern, medical cross symbols "
            "scattered among hexagonal molecular structures, "
            "pharmaceutical illustration, bright cyan blue color palette"
        ),
        "tint": (0, 229, 255),
    },
    "tetracycline": {
        "prompt": (
            STYLE +
            "bright cyan tetracycline pill capsules and molecules, "
            "elongated capsule-shaped tablets arranged in pattern, "
            "medical treatment texture, gel-cap pills scattered, "
            "pharmaceutical illustration, cyan turquoise color palette"
        ),
        "tint": (24, 255, 255),
    },
    "streptomycin": {
        "prompt": (
            STYLE +
            "teal green streptomycin injection serum, syringe needles "
            "and molecular chains, aminoglycoside antibiotic molecules, "
            "medical grid pattern, treatment illustration, "
            "pharmaceutical art, dark teal green color palette"
        ),
        "tint": (0, 191, 165),
    },
    "tamiflu": {
        "prompt": (
            STYLE +
            "lime green antiviral shield barriers, Tamiflu oseltamivir "
            "molecular structure, protective shield icons with virus "
            "blockers, bright neon lime green on dark, "
            "pharmaceutical defense illustration, lime green color palette"
        ),
        "tint": (118, 255, 3),
    },
    "zidovudine": {
        "prompt": (
            STYLE +
            "light lime green zidovudine AZT molecules, double helix "
            "DNA chains being repaired, reverse transcriptase inhibitor, "
            "molecular biology treatment, bright lime, "
            "pharmaceutical art, light green color palette"
        ),
        "tint": (178, 255, 89),
    },
    "interferon": {
        "prompt": (
            STYLE +
            "yellow-green interferon protein lightning bolts, immune "
            "system signaling cascades, electric spark patterns, "
            "cytokine storm visualization, bio-electric defense, "
            "immunology illustration, yellow-green color palette"
        ),
        "tint": (174, 234, 0),
    },
    "fluconazole": {
        "prompt": (
            STYLE +
            "pink fluconazole antifungal molecules, DNA helix patterns "
            "disrupting fungal cell walls, soft pink crystalline "
            "azole drug structure, medical pattern, "
            "pharmaceutical illustration, pink magenta color palette"
        ),
        "tint": (234, 128, 252),
    },
    "nystatin": {
        "prompt": (
            STYLE +
            "magenta nystatin droplets and molecules, liquid medicine "
            "drops forming rings, antifungal polyene structure, "
            "bright magenta raindrops on dark background, "
            "pharmaceutical art, magenta pink color palette"
        ),
        "tint": (224, 64, 251),
    },
    "amphotericin": {
        "prompt": (
            STYLE +
            "violet amphotericin biohazard treatment, triangular "
            "biohazard symbols mixed with molecular chains, "
            "powerful antifungal illustration, glowing violet, "
            "pharmaceutical defense art, deep violet purple color palette"
        ),
        "tint": (213, 0, 249),
    },
}

# ---------------------------------------------------------------------------
# World tile prompts (empty + wall)
# ---------------------------------------------------------------------------

WORLD_TILES = {
    1: {
        "name": "petri",
        "empty": (
            STYLE +
            "dark green translucent agar gel surface, petri dish culture "
            "medium, subtle gel texture with tiny bubbles, sterile "
            "laboratory surface, minimal dark green, very subtle"
        ),
        "wall": (
            STYLE +
            "thick glass petri dish rim, frosted glass barrier, "
            "laboratory glassware edge, translucent gray-green glass "
            "with beveled edges, industrial lab equipment"
        ),
        "empty_tint": (26, 40, 30),
        "wall_tint": (58, 68, 52),
    },
    2: {
        "name": "blood",
        "empty": (
            STYLE +
            "dark red blood plasma, inside a blood vessel, subtle "
            "red blood cell shadows, deep crimson flowing liquid, "
            "capillary interior, very dark red, minimal"
        ),
        "wall": (
            STYLE +
            "blood vessel wall, artery endothelial lining, thick "
            "organic tissue barrier, layered red-brown vessel wall, "
            "vascular anatomy, meaty organic texture"
        ),
        "empty_tint": (40, 20, 22),
        "wall_tint": (72, 32, 35),
    },
    3: {
        "name": "tissue",
        "empty": (
            STYLE +
            "dark purple cellular matrix, tissue cross-section, "
            "extracellular fluid between cells, histology slide "
            "background, very dark violet, subtle honeycomb, minimal"
        ),
        "wall": (
            STYLE +
            "dense connective tissue membrane, collagen fiber wall, "
            "thick purple-gray tissue barrier, basement membrane, "
            "histology stain, fibrous organic wall"
        ),
        "empty_tint": (32, 22, 40),
        "wall_tint": (58, 38, 68),
    },
    4: {
        "name": "pandemic",
        "empty": (
            STYLE +
            "dark amber quarantine floor, industrial containment "
            "zone surface, subtle hazmat-orange glow on dark steel, "
            "BSL-4 facility floor panel, very dark, minimal"
        ),
        "wall": (
            STYLE +
            "orange industrial metal barrier, hazmat containment wall, "
            "steel plate with warning markings, industrial rivets, "
            "quarantine zone blockade, orange and dark metal"
        ),
        "empty_tint": (40, 30, 18),
        "wall_tint": (72, 58, 32),
    },
}

# ---------------------------------------------------------------------------
# World background prompts
# ---------------------------------------------------------------------------

WORLD_BACKGROUNDS = [
    {
        "id": 1,
        "filename": "world_1_petri.png",
        "prompt": (
            "Microscopy photograph of an agar plate in a petri dish, "
            "translucent green gel surface, subtle bacterial colony spots, "
            "glass rim visible at edges, sterile laboratory lighting, "
            "clinical scientific aesthetic, soft green glow, "
            "top-down view, portrait orientation, dark background, "
            "microbiological culture plate, clean minimalist"
        ),
    },
    {
        "id": 2,
        "filename": "world_2_blood.png",
        "prompt": (
            "Microscopy photograph inside a blood vessel, "
            "red blood cells floating in plasma, capillary walls visible, "
            "deep crimson and dark red tones, flowing organic texture, "
            "endothelial lining, biological depth of field, "
            "arterial cross-section, portrait orientation, "
            "hematology microscope view, dark vignette edges, "
            "dramatic red lighting, medical imaging aesthetic"
        ),
    },
    {
        "id": 3,
        "filename": "world_3_tissue.png",
        "prompt": (
            "Microscopy photograph of human tissue cross-section, "
            "dense cellular matrix, purple and violet H&E stain, "
            "cell membranes visible, extracellular matrix fibers, "
            "histology slide, connective tissue, nuclei visible as dark dots, "
            "organic honeycomb-like structure, portrait orientation, "
            "pathology laboratory, purple-lavender color palette, "
            "fluorescence microscopy aesthetic, dark background"
        ),
    },
    {
        "id": 4,
        "filename": "world_4_pandemic.png",
        "prompt": (
            "Biohazard quarantine zone, orange warning lights, "
            "containment facility corridor, hazmat atmosphere, "
            "decontamination chamber, caution tape, emergency lighting, "
            "orange and amber glow on dark surfaces, "
            "CDC laboratory lockdown, portrait orientation, "
            "dramatic chiaroscuro, biosafety level 4, "
            "apocalyptic medical facility, dark industrial aesthetic"
        ),
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_seamless(img):
    """
    Mirror a square image into a 2×2 grid, then center-crop back
    to the original size. This guarantees perfect seamless tiling.
    """
    w, h = img.size
    # Create 2×2 mirror grid
    canvas = Image.new("RGB", (w * 2, h * 2))

    # Top-left: original
    canvas.paste(img, (0, 0))
    # Top-right: horizontal flip
    canvas.paste(img.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    # Bottom-left: vertical flip
    canvas.paste(img.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
    # Bottom-right: both flips
    canvas.paste(img.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM), (w, h))

    # Center crop to original size
    cx, cy = w, h
    return canvas.crop((cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2))


def apply_color_tint(img, tint_rgb, strength=0.35):
    """Apply a color tint overlay to keep tiles on-brand."""
    tint_layer = Image.new("RGB", img.size, tint_rgb)
    return Image.blend(img, tint_layer, strength)


def darken_image(img, factor=0.7):
    """Darken the image to work as game tiles on dark background."""
    enhancer = ImageEnhance.Brightness(img)
    return enhancer.enhance(factor)


def increase_contrast(img, factor=1.3):
    """Boost contrast for readability at small tile sizes."""
    enhancer = ImageEnhance.Contrast(img)
    return enhancer.enhance(factor)


def apply_vignette(img):
    """Dark vignette for background images."""
    w, h = img.size
    vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(vignette)
    cx, cy = w // 2, h // 2
    max_r = (cx ** 2 + cy ** 2) ** 0.5
    for i in range(40):
        r = max_r * (1 - i / 40)
        alpha = int(120 * (1 - i / 40) ** 2)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 0, 0, alpha))
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=30))
    img_rgba = img.convert("RGBA")
    result = Image.alpha_composite(img_rgba, vignette)
    return result.convert("RGB")


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

def generate_tile(pipe, prompt, tint_rgb, seed, dark_factor=0.8):
    """Generate a single seamless tile."""
    generator = torch.Generator("cpu").manual_seed(seed)
    result = pipe(
        prompt=prompt,
        width=TILE_GEN,
        height=TILE_GEN,
        num_inference_steps=NUM_STEPS,
        guidance_scale=GUIDANCE,
        generator=generator,
    )
    img = result.images[0]

    # Make seamless
    img = make_seamless(img)

    # Apply color tint to keep on-brand
    img = apply_color_tint(img, tint_rgb, strength=0.3)

    # Darken for game readability
    img = darken_image(img, dark_factor)

    # Boost contrast
    img = increase_contrast(img, 1.2)

    # Resize to final
    img = img.resize((TILE_OUT, TILE_OUT), Image.LANCZOS)

    return img


def generate_background(pipe, prompt, seed):
    """Generate a world background image."""
    generator = torch.Generator("cpu").manual_seed(seed)
    result = pipe(
        prompt=prompt,
        width=BG_GEN_W,
        height=BG_GEN_H,
        num_inference_steps=NUM_STEPS,
        guidance_scale=GUIDANCE,
        generator=generator,
    )
    img = result.images[0]
    img = img.resize((BG_OUT_W, BG_OUT_H), Image.LANCZOS)
    img = apply_vignette(img)
    return img


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    germs_dir = os.path.join(ASSETS_DIR, "germs")
    tiles_dir = os.path.join(ASSETS_DIR, "tiles")
    bg_dir = os.path.join(ASSETS_DIR, "bg")
    os.makedirs(germs_dir, exist_ok=True)
    os.makedirs(tiles_dir, exist_ok=True)
    os.makedirs(bg_dir, exist_ok=True)

    print("=" * 60)
    print("Bio Defence FLUX Tile Generator")
    print("=" * 60)

    print("\n🔧 Loading FLUX.1-schnell pipeline...")
    pipe = FluxPipeline.from_pretrained(
        "black-forest-labs/FLUX.1-schnell",
        torch_dtype=torch.bfloat16,
    )
    pipe.enable_model_cpu_offload()
    print("  ✓ Pipeline ready")

    seed = SEED

    # ── Pathogen tiles ──
    print(f"\n🦠 Generating {len(PATHOGENS)} pathogen tiles...")
    for name, cfg in PATHOGENS.items():
        print(f"  → {name}...")
        img = generate_tile(pipe, cfg["prompt"], cfg["tint"], seed, dark_factor=0.85)
        path = os.path.join(germs_dir, f"{name}.png")
        img.save(path)
        print(f"    ✓ {path}")
        seed += 1

    # ── Medicine tiles ──
    print(f"\n💊 Generating {len(MEDICINES)} medicine tiles...")
    for name, cfg in MEDICINES.items():
        print(f"  → {name}...")
        img = generate_tile(pipe, cfg["prompt"], cfg["tint"], seed, dark_factor=0.75)
        path = os.path.join(germs_dir, f"{name}.png")
        img.save(path)
        print(f"    ✓ {path}")
        seed += 1

    # ── Default empty + wall tiles ──
    print("\n🏗️  Generating default empty + wall tiles...")
    for kind in ["empty", "wall"]:
        prompt = (
            STYLE +
            ("dark charcoal game board surface, subtle grid texture, "
             "very dark blue-black, minimal, almost solid dark color"
             if kind == "empty" else
             "dark gray stone barrier wall, solid heavy brick, "
             "industrial quarantine wall, dark gray with subtle texture")
        )
        tint = (26, 26, 46) if kind == "empty" else (58, 58, 92)
        img = generate_tile(pipe, prompt, tint, seed, dark_factor=0.6)
        path = os.path.join(tiles_dir, f"tile_{kind}.png")
        img.save(path)
        print(f"  ✓ {path}")
        seed += 1

    # ── World-specific tiles ──
    print("\n🌍 Generating world-specific tiles...")
    for w_id, w_cfg in WORLD_TILES.items():
        for kind in ["empty", "wall"]:
            print(f"  → World {w_id} {kind}...")
            prompt = w_cfg[kind]
            tint = w_cfg[f"{kind}_tint"]
            dark = 0.55 if kind == "empty" else 0.65
            img = generate_tile(pipe, prompt, tint, seed, dark_factor=dark)
            path = os.path.join(tiles_dir, f"tile_{kind}_w{w_id}.png")
            img.save(path)
            print(f"    ✓ {path}")
            seed += 1

    # ── World backgrounds ──
    print("\n🎨 Generating world background images...")
    for world in WORLD_BACKGROUNDS:
        print(f"  → World {world['id']}: {world['filename']}...")
        img = generate_background(pipe, world["prompt"], seed)
        path = os.path.join(bg_dir, world["filename"])
        img.save(path, quality=90)
        print(f"    ✓ {path}")
        seed += 1

    # Cleanup
    del pipe
    gc.collect()
    torch.cuda.empty_cache()

    total = len(PATHOGENS) + len(MEDICINES) + 2 + len(WORLD_TILES) * 2 + len(WORLD_BACKGROUNDS)
    print(f"\n✅ Generated {total} assets total")
    print(f"   Output: {ASSETS_DIR}")


if __name__ == "__main__":
    main()
