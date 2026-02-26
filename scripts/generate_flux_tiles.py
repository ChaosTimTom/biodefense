"""
generate_flux_tiles.py — Generate Bio Defence tile assets via FLUX.1-schnell
============================================================================
Generates all game tile assets in the SAME SEM micrograph style as the
originals:  false-color scanning/transmission electron microscope imagery.

NO mirror tricks.  NO kaleidoscope.  Just raw FLUX output — the model does
a good job of filling the canvas edge-to-edge if prompted correctly.

Output (all under public/assets/):
    germs/{pathogen}.png      x 9   (1024x1024)
    germs/{medicine}.png      x 9   (1024x1024)
    tiles/tile_empty.png            (1024x1024)
    tiles/tile_wall.png             (1024x1024)
    tiles/tile_empty_w{1-4}.png x 4 (1024x1024)
    tiles/tile_wall_w{1-4}.png  x 4 (1024x1024)
    bg/world_{1-4}_*.png      x 4   (400x720)

Usage (from project root):
    "<VENV_PYTHON>" scripts/generate_flux_tiles.py
"""

import os
import gc
import time
import torch
from diffusers import FluxPipeline, FluxTransformer2DModel, GGUFQuantizationConfig
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "assets")

MODEL_ID = "black-forest-labs/FLUX.1-schnell"
MODEL_CACHE = r"c:\Users\timmy\Desktop\Projects\archive\Immersive Video\models"

GEN_SIZE = 512         # Generate at 512 (fast!) then upscale
OUTPUT_SIZE = 1024     # Final tile size after upscale
BG_GEN_W = 512         # Background gen width
BG_GEN_H = 896         # Background gen height (portrait)
BG_OUT_W = 400
BG_OUT_H = 720

NUM_STEPS = 4          # schnell: 1-4 steps
GUIDANCE = 0.0         # schnell doesn't use guidance
SEED_START = 42

# ---------------------------------------------------------------------------
# Style prefix -- SEM micrograph look matching the originals
# ---------------------------------------------------------------------------

STYLE = (
    "Seamless tileable texture photograph, fills entire frame edge to edge, "
    "continuous surface pattern that tiles infinitely in all directions, "
    "no borders no margins no gaps, no vignette, "
    "scanning electron microscope photograph, SEM micrograph, "
    "highly detailed scientific imagery, no text, no labels, no watermark"
)

# ---------------------------------------------------------------------------
# Pathogen tiles -- SEM-style, false-color, dense surface coverage
# ---------------------------------------------------------------------------

PATHOGENS = {
    "coccus": (
        "false-color SEM photograph of dense Staphylococcus aureus bacterial colony, "
        "tightly packed green-tinted cocci spheres in grape-like clusters, "
        "biofilm matrix visible between cells, realistic cell division, "
        "green colorized scanning electron micrograph"
    ),
    "bacillus": (
        "false-color SEM photograph of dense Bacillus cereus rod-shaped bacteria, "
        "tightly packed lime-green elongated capsule bacilli with rounded ends, "
        "parallel and crossing rod bacteria colony, realistic morphology, "
        "lime green colorized scanning electron micrograph"
    ),
    "spirillum": (
        "false-color SEM photograph of dense Spirillum bacteria colony, "
        "tightly packed teal-colored corkscrew spiral-shaped bacteria, "
        "helical and wavy S-curved microorganisms intertwined, "
        "teal colorized scanning electron micrograph"
    ),
    "influenza": (
        "false-color TEM photograph of dense influenza virus particles, "
        "tightly packed red-tinted spherical virions with hemagglutinin spikes, "
        "classic flu virus corona surface projections clearly visible, "
        "red colorized transmission electron micrograph"
    ),
    "retrovirus": (
        "false-color TEM photograph of dense HIV retrovirus particles, "
        "tightly packed dark crimson icosahedral viral capsids, "
        "hexagonal lattice structure with internal RNA visible, "
        "dark red colorized transmission electron micrograph"
    ),
    "phage": (
        "false-color TEM photograph of dense bacteriophage virus particles, "
        "tightly packed orange-tinted T4 phage with geometric heads and tail fibers, "
        "icosahedral capsids attached to tail structures visible, "
        "orange colorized transmission electron micrograph"
    ),
    "mold": (
        "false-color SEM photograph of dense Aspergillus mold mycelium, "
        "tightly packed purple branching hyphae filaments with conidiophore heads, "
        "spore chains and sporulating structures visible, "
        "dark purple colorized scanning electron micrograph"
    ),
    "yeast": (
        "false-color SEM photograph of dense Saccharomyces yeast colony, "
        "tightly packed lavender-pink oval budding yeast cells, "
        "bud scars and mother-daughter cell pairs visible, "
        "lavender pink colorized scanning electron micrograph"
    ),
    "spore": (
        "false-color SEM photograph of dense fungal spore mass, "
        "tightly packed deep violet round spores with thick walls, "
        "endospore cross-sections showing cortex layers visible, "
        "deep violet colorized scanning electron micrograph"
    ),
}

# ---------------------------------------------------------------------------
# Medicine tiles -- fluorescence microscopy, glowing drug compounds
# ---------------------------------------------------------------------------

MEDICINES = {
    "penicillin": (
        "false-color fluorescence microscopy of penicillin antibiotic molecules "
        "diffusing through agar medium, glowing bright cyan crystalline structures, "
        "zone of inhibition texture, translucent blue pharmaceutical gel, "
        "bright cyan fluorescence photograph"
    ),
    "tetracycline": (
        "false-color fluorescence microscopy of tetracycline antibiotic compound, "
        "glowing turquoise molecular ring structures in solution, "
        "luminescent cyan-green tetracycline crystals in liquid medium, "
        "turquoise fluorescence photograph"
    ),
    "streptomycin": (
        "false-color fluorescence microscopy of streptomycin antibiotic, "
        "glowing dark teal aminoglycoside structures diffusing through gel, "
        "translucent teal pharmaceutical compound in agar, "
        "dark teal fluorescence photograph"
    ),
    "tamiflu": (
        "false-color fluorescence microscopy of oseltamivir antiviral drug, "
        "glowing lime green neuraminidase inhibitor molecules in solution, "
        "luminescent green pharmaceutical crystals dispersed, "
        "lime green fluorescence photograph"
    ),
    "zidovudine": (
        "false-color fluorescence microscopy of zidovudine AZT antiviral, "
        "glowing light green nucleoside analog structures in plasma, "
        "luminescent green-yellow pharmaceutical compound, "
        "light green fluorescence photograph"
    ),
    "interferon": (
        "false-color fluorescence microscopy of interferon protein molecules, "
        "glowing yellow-green cytokine structures radiating signal, "
        "luminescent chartreuse protein fibers in cellular medium, "
        "yellow green fluorescence photograph"
    ),
    "fluconazole": (
        "false-color fluorescence microscopy of fluconazole antifungal, "
        "glowing magenta-pink azole ring structures in solution, "
        "luminescent magenta pharmaceutical compound dispersed, "
        "magenta pink fluorescence photograph"
    ),
    "nystatin": (
        "false-color fluorescence microscopy of nystatin antifungal compound, "
        "glowing hot pink polyene macrolide structures in membrane, "
        "luminescent pink antifungal molecules binding to ergosterol, "
        "hot pink fluorescence photograph"
    ),
    "amphotericin": (
        "false-color fluorescence microscopy of amphotericin B antifungal, "
        "glowing deep violet polyene structures forming pores in membrane, "
        "luminescent purple-violet pharmaceutical compound, "
        "deep violet fluorescence photograph"
    ),
}

# ---------------------------------------------------------------------------
# Board tiles -- tissue surfaces
# ---------------------------------------------------------------------------

DEFAULT_TILES = {
    "tile_empty": (
        "dark SEM photograph of smooth epithelial tissue surface, "
        "very dark navy blue tinted cell membrane landscape, "
        "subtle hexagonal cell boundaries barely visible, nearly black, "
        "dark blue-tinted scanning electron micrograph of skin tissue"
    ),
    "tile_wall": (
        "SEM photograph of dense calcified bone tissue cross-section, "
        "grey-brown mineralized collagen matrix with lacunae spaces, "
        "thick cortical bone surface texture, hard biological barrier, "
        "grey-tinted scanning electron micrograph of compact bone"
    ),
}

# ---------------------------------------------------------------------------
# World-specific board tiles
# ---------------------------------------------------------------------------

WORLD_TILES = {
    1: {
        "empty": (
            "dark SEM photograph of nutrient agar surface in a petri dish, "
            "very dark green-tinted smooth gel surface, barely visible colony dots, "
            "almost black with faint green bacterial film, "
            "dark green scanning electron micrograph of agar plate"
        ),
        "wall": (
            "SEM photograph of glass petri dish rim cross-section, "
            "translucent grey-green borosilicate glass edge texture, "
            "smooth curved laboratory glass surface, "
            "grey-green scanning electron micrograph of glass"
        ),
    },
    2: {
        "empty": (
            "dark SEM photograph of blood vessel endothelial lining, "
            "very dark red-tinted smooth vascular surface, "
            "barely visible endothelial cell junctions, nearly black, "
            "dark red scanning electron micrograph of blood vessel interior"
        ),
        "wall": (
            "SEM photograph of arterial wall cross-section, "
            "layered pink-red smooth muscle and connective tissue, "
            "thick elastic lamina visible in vessel wall, "
            "red-tinted scanning electron micrograph of artery wall"
        ),
    },
    3: {
        "empty": (
            "dark SEM photograph of connective tissue extracellular matrix, "
            "very dark purple-tinted collagen fiber network, "
            "barely visible fibrous scaffold structure, nearly black, "
            "dark purple scanning electron micrograph of tissue matrix"
        ),
        "wall": (
            "SEM photograph of dense cartilage tissue cross-section, "
            "purple-grey chondrocyte lacunae in collagen matrix, "
            "thick perichondrium barrier surface, "
            "purple-grey scanning electron micrograph of cartilage"
        ),
    },
    4: {
        "empty": (
            "dark SEM photograph of lung alveolar epithelium surface, "
            "very dark orange-tinted thin pneumocyte membrane, "
            "barely visible alveolar cell borders, nearly black, "
            "dark orange scanning electron micrograph of lung tissue"
        ),
        "wall": (
            "SEM photograph of fibrotic scar tissue cross-section, "
            "orange-brown dense collagen deposits and fibroblasts, "
            "thick fibrous barrier from chronic inflammation, "
            "orange-brown scanning electron micrograph of fibrosis"
        ),
    },
}

# ---------------------------------------------------------------------------
# World background images
# ---------------------------------------------------------------------------

WORLD_BACKGROUNDS = [
    {
        "id": 1,
        "filename": "world_1_petri.png",
        "prompt": (
            "top-down photograph of a petri dish on dark laboratory bench, "
            "circular glass dish with green-tinted nutrient agar medium, "
            "faint bacterial colonies forming, backlit from below, "
            "scientific laboratory dark moody lighting, portrait orientation, "
            "dark green and black color palette, cinematic"
        ),
    },
    {
        "id": 2,
        "filename": "world_2_blood.png",
        "prompt": (
            "dark artistic photograph of flowing blood stream through a vein, "
            "deep red plasma with scattered red blood cells and white blood cells, "
            "dark crimson flowing liquid in vessel, blood cells in motion, "
            "dramatic dark moody lighting, portrait orientation, "
            "dark red and black color palette, cinematic"
        ),
    },
    {
        "id": 3,
        "filename": "world_3_tissue.png",
        "prompt": (
            "dark SEM photograph of human tissue cross-section landscape, "
            "purple-tinted connective tissue with visible collagen fibers, "
            "cells embedded in extracellular matrix, deep tissue layers, "
            "dramatic dark moody lighting, portrait orientation, "
            "dark purple and black color palette, cinematic"
        ),
    },
    {
        "id": 4,
        "filename": "world_4_pandemic.png",
        "prompt": (
            "dark artistic photograph of a global disease outbreak visualization, "
            "orange viral particles spreading across dark cityscape silhouette, "
            "pandemic biohazard atmosphere, bio-threat warning scene, "
            "dramatic dark moody lighting, portrait orientation, "
            "dark orange and black color palette, cinematic"
        ),
    },
]


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def load_pipeline():
    """Load FLUX.1-schnell with Q4_K_S GGUF quantized transformer (~6.5GB).
    
    The quantized transformer fits easily on 16GB VRAM alongside the VAE
    and text encoders, so we can load everything on GPU for maximum speed.
    Expected: ~15-30s per 512x512 tile with 4 steps.
    """
    print(f"\n{'=' * 60}")
    print(f"Loading {MODEL_ID} with Q4_K_S GGUF quantization...")
    print(f"{'=' * 60}\n")

    # Load quantized transformer (~6.5GB instead of 12GB)
    print("  Loading Q4_K_S quantized transformer...", flush=True)
    gguf_config = GGUFQuantizationConfig(compute_dtype=torch.bfloat16)
    transformer = FluxTransformer2DModel.from_single_file(
        "https://huggingface.co/city96/FLUX.1-schnell-gguf/blob/main/flux1-schnell-Q4_K_S.gguf",
        quantization_config=gguf_config,
        torch_dtype=torch.bfloat16,
        cache_dir=MODEL_CACHE,
    )
    print("  ✓ Transformer loaded")

    # Load full pipeline with quantized transformer
    print("  Loading pipeline...", flush=True)
    pipe = FluxPipeline.from_pretrained(
        MODEL_ID,
        transformer=transformer,
        torch_dtype=torch.bfloat16,
        cache_dir=MODEL_CACHE,
    )
    pipe.enable_model_cpu_offload()
    print("  ✓ Pipeline ready")

    vram_gb = torch.cuda.memory_allocated() / 1024**3
    print(f"  VRAM used: {vram_gb:.1f} GB\n")
    return pipe


# ---------------------------------------------------------------------------
# Generation helpers
# ---------------------------------------------------------------------------

def generate_tile(pipe, prompt_detail, seed):
    """Generate a single tile -- raw FLUX output, no post-processing tricks."""
    full_prompt = f"{STYLE}, {prompt_detail}"
    generator = torch.Generator("cpu").manual_seed(seed)

    t0 = time.time()

    result = pipe(
        prompt=full_prompt,
        width=GEN_SIZE,
        height=GEN_SIZE,
        num_inference_steps=NUM_STEPS,
        guidance_scale=GUIDANCE,
        generator=generator,
    )
    img = result.images[0]
    elapsed = time.time() - t0

    if img.mode != "RGB":
        img = img.convert("RGB")

    # Resize to output if different from gen size
    if GEN_SIZE != OUTPUT_SIZE:
        img = img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)

    print(f"    ({elapsed:.1f}s)")
    return img


def generate_background(pipe, prompt, seed):
    """Generate a world background image."""
    generator = torch.Generator("cpu").manual_seed(seed)

    t0 = time.time()

    result = pipe(
        prompt=prompt,
        width=BG_GEN_W,
        height=BG_GEN_H,
        num_inference_steps=NUM_STEPS,
        guidance_scale=GUIDANCE,
        generator=generator,
    )
    img = result.images[0]
    elapsed = time.time() - t0

    if img.mode != "RGB":
        img = img.convert("RGB")

    img = img.resize((BG_OUT_W, BG_OUT_H), Image.LANCZOS)

    # Apply vignette
    img = apply_vignette(img)

    print(f"    ({elapsed:.1f}s)")
    return img


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
    print("Bio Defence FLUX Tile Generator -- SEM Style")
    print("=" * 60)

    print("\nLoading FLUX.1-schnell pipeline...")
    pipe = load_pipeline()

    seed = SEED_START
    total = 0

    # -- Pathogens --
    print(f"\nGenerating {len(PATHOGENS)} pathogen tiles...")
    for name, prompt in PATHOGENS.items():
        print(f"  -> {name}...", end="", flush=True)
        img = generate_tile(pipe, prompt, seed)
        path = os.path.join(germs_dir, f"{name}.png")
        img.save(path, "PNG")
        print(f"    saved {path}")
        seed += 1
        total += 1
        gc.collect()

    # -- Medicines --
    print(f"\nGenerating {len(MEDICINES)} medicine tiles...")
    for name, prompt in MEDICINES.items():
        print(f"  -> {name}...", end="", flush=True)
        img = generate_tile(pipe, prompt, seed)
        path = os.path.join(germs_dir, f"{name}.png")
        img.save(path, "PNG")
        print(f"    saved {path}")
        seed += 1
        total += 1
        gc.collect()

    # -- Default board tiles --
    print(f"\nGenerating default tiles...")
    for name, prompt in DEFAULT_TILES.items():
        print(f"  -> {name}...", end="", flush=True)
        img = generate_tile(pipe, prompt, seed)
        path = os.path.join(tiles_dir, f"{name}.png")
        img.save(path, "PNG")
        print(f"    saved {path}")
        seed += 1
        total += 1
        gc.collect()

    # -- World-specific tiles --
    print(f"\nGenerating world-specific tiles...")
    for w_id, tiles in WORLD_TILES.items():
        for kind in ("empty", "wall"):
            print(f"  -> World {w_id} {kind}...", end="", flush=True)
            img = generate_tile(pipe, tiles[kind], seed)
            path = os.path.join(tiles_dir, f"tile_{kind}_w{w_id}.png")
            img.save(path, "PNG")
            print(f"    saved {path}")
            seed += 1
            total += 1
            gc.collect()

    # -- World backgrounds --
    print(f"\nGenerating world background images...")
    for world in WORLD_BACKGROUNDS:
        fn = world["filename"]
        print(f"  -> World {world['id']}: {fn}...", end="", flush=True)
        img = generate_background(pipe, world["prompt"], seed)
        path = os.path.join(bg_dir, fn)
        img.save(path, "PNG")
        print(f"    saved {path}")
        seed += 1
        total += 1
        gc.collect()

    print(f"\nDone! Generated {total} assets -> {ASSETS_DIR}")


if __name__ == "__main__":
    main()
