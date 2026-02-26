#!/usr/bin/env python3
"""
generate_tiles.py — Batch-generate seamless tileable game textures via FLUX.1-schnell.

One tile per asset type, full-coverage edge-to-edge with infinite seamless edges.
Uses sequential CPU offload to fit in 16GB VRAM.

Usage:
  cd "c:/Users/timmy/Desktop/Projects/Bio Defence"
  & "c:/Users/timmy/Desktop/Projects/archive/Immersive Video/.venv/Scripts/python.exe" scripts/generate_tiles.py [--force]
"""

import sys
import time
import torch
from pathlib import Path
from diffusers import FluxPipeline
from PIL import Image

# ── Configuration ────────────────────────────────────────────────

MODEL_ID = "black-forest-labs/FLUX.1-schnell"
MODEL_CACHE = r"c:\Users\timmy\Desktop\Projects\archive\Immersive Video\models"
ASSETS_DIR = Path(r"c:\Users\timmy\Desktop\Projects\Bio Defence\public\assets")
GEN_SIZE = 1024        # FLUX native resolution
OUTPUT_SIZE = 1024     # no upscale needed

NUM_STEPS = 4          # schnell: 1-4 steps
GUIDANCE_SCALE = 0.0   # schnell doesn't use guidance

# Style preamble for seamless tileable textures
STYLE = (
    "Seamless tileable texture photograph, fills entire frame edge to edge, "
    "continuous surface pattern that tiles infinitely in all directions, "
    "no borders no margins no gaps, no vignette, "
    "scanning electron microscope photograph, SEM micrograph, "
    "highly detailed scientific imagery, no text, no labels, no watermark"
)

# ── Cleanup old files ────────────────────────────────────────────

CLEANUP_GLOBS = [
    "germs/bacteria_*.png",
    "germs/virus_*.png",
    "germs/fungus_*.png",
    "germs/antibacterial*.png",
    "germs/antiviral*.png",
    "germs/antifungal*.png",
    "tiles/tile_empty*.png",
    "tiles/tile_wall*.png",
    "tiles/tile_core*.png",
    "tiles/tile_immune_cell*.png",
]

# ── Tile definitions — ONE per type ──────────────────────────────
# (subfolder, filename, prompt_detail)

TILES: list[tuple[str, str, str]] = [
    # ═══ Pathogens ═══
    ("germs", "bacteria.png",
     "false-color SEM photograph of dense Staphylococcus aureus bacterial colony, "
     "tightly packed green-tinted cocci spheres in grape-like clusters, "
     "biofilm matrix visible between cells, realistic cell division, "
     "green colorized scanning electron micrograph"),

    ("germs", "virus.png",
     "false-color SEM photograph of dense SARS coronavirus particles, "
     "tightly packed red-tinted spherical virions with prominent spike proteins, "
     "corona surface projections clearly visible, realistic viral morphology, "
     "red colorized transmission electron micrograph"),

    ("germs", "fungus.png",
     "false-color SEM photograph of dense Aspergillus fungal mycelium network, "
     "tangled purple-tinted branching hyphae filaments with conidiophore heads, "
     "spore chains visible, realistic fungal morphology, "
     "purple colorized scanning electron micrograph"),

    # ═══ Medicines ═══
    ("germs", "antibacterial.png",
     "false-color fluorescence microscopy of antibiotic drug molecules "
     "diffusing through agar medium, glowing cyan-blue crystalline structures, "
     "zone of inhibition texture, translucent blue pharmaceutical gel, "
     "cyan-tinted scientific fluorescence photograph"),

    ("germs", "antiviral.png",
     "false-color fluorescence microscopy of antiviral drug compound, "
     "glowing bright green molecular structures dispersed in solution, "
     "luminescent green pharmaceutical crystals in liquid medium, "
     "green-tinted scientific fluorescence photograph"),

    ("germs", "antifungal.png",
     "false-color fluorescence microscopy of antifungal drug compound, "
     "glowing magenta-pink molecular structures dispersed in solution, "
     "luminescent pink pharmaceutical crystals in liquid medium, "
     "magenta-tinted scientific fluorescence photograph"),

    # ═══ Board tiles ═══
    ("tiles", "tile_empty.png",
     "dark SEM photograph of smooth epithelial tissue surface, "
     "very dark navy blue tinted cell membrane landscape, "
     "subtle hexagonal cell boundaries barely visible, nearly black, "
     "dark blue-tinted scanning electron micrograph of skin tissue"),

    ("tiles", "tile_wall.png",
     "SEM photograph of dense calcified bone tissue cross-section, "
     "grey-brown mineralized collagen matrix with lacunae spaces, "
     "thick cortical bone surface texture, hard biological barrier, "
     "grey-tinted scanning electron micrograph of compact bone"),
]


# ── Pipeline ─────────────────────────────────────────────────────

def load_pipeline():
    """Load FLUX.1-schnell with sequential CPU offload for 16GB VRAM."""
    print(f"\n{'='*60}")
    print(f"Loading {MODEL_ID}...")
    print(f"Cache: {MODEL_CACHE}")
    print(f"{'='*60}\n")

    pipe = FluxPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16,
        cache_dir=MODEL_CACHE,
    )
    pipe.enable_sequential_cpu_offload()

    print("Pipeline loaded with CPU offload!\n")
    return pipe


def generate_tile(pipe, prompt_detail: str, out_path: Path) -> Path:
    """Generate one seamless tile, upscale to OUTPUT_SIZE, save as RGB PNG."""
    full_prompt = f"{STYLE}, {prompt_detail}"
    print(f"  Prompt: {full_prompt[:120]}...")

    t0 = time.time()
    result = pipe(
        prompt=full_prompt,
        width=GEN_SIZE,
        height=GEN_SIZE,
        num_inference_steps=NUM_STEPS,
        guidance_scale=GUIDANCE_SCALE,
    )
    image: Image.Image = result.images[0]
    elapsed = time.time() - t0
    print(f"  Generated {GEN_SIZE}x{GEN_SIZE} in {elapsed:.1f}s")

    if image.mode != "RGB":
        image = image.convert("RGB")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(out_path, "PNG")
    size_kb = out_path.stat().st_size / 1024
    print(f"  Saved: {out_path.name} ({size_kb:.0f} KB)")
    return out_path


def main() -> None:
    force = "--force" in sys.argv

    # ── Clean up old variant files ────────────────────────────
    import glob
    print("Cleaning up old files...")
    for pattern in CLEANUP_GLOBS:
        for old_path in glob.glob(str(ASSETS_DIR / pattern)):
            p = Path(old_path)
            p.unlink()
            print(f"  Deleted: {p.relative_to(ASSETS_DIR)}")

    # ── Determine what to generate ────────────────────────────
    to_generate: list[tuple[str, str, str, Path]] = []
    for subfolder, filename, prompt in TILES:
        out_dir = ASSETS_DIR / subfolder
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / filename

        if out_path.exists() and not force:
            print(f"  SKIP (exists): {subfolder}/{filename}")
        else:
            to_generate.append((subfolder, filename, prompt, out_path))

    if not to_generate:
        print("\nAll tiles already exist! Use --force to regenerate.")
        return

    print(f"\nWill generate {len(to_generate)} tile(s):")
    for sub, fn, _, _ in to_generate:
        print(f"  - {sub}/{fn}")
    print()

    # ── Load model ────────────────────────────────────────────
    pipe = load_pipeline()

    # ── Generate tiles ────────────────────────────────────────
    generated: list[Path] = []
    t_start = time.time()

    for i, (sub, fn, prompt, out_path) in enumerate(to_generate):
        print(f"[{i+1}/{len(to_generate)}] {sub}/{fn}")
        try:
            path = generate_tile(pipe, prompt, out_path)
            generated.append(path)
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            continue

    # ── Summary ───────────────────────────────────────────────
    total_time = time.time() - t_start
    print(f"\n{'='*60}")
    print(f"DONE! Generated {len(generated)}/{len(to_generate)} tiles "
          f"in {total_time:.1f}s")
    for p in generated:
        print(f"  {p.name}")
    print(f"{'='*60}")

    del pipe
    torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
