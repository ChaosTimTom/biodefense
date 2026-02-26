"""
generate_backgrounds.py — Generate world background images via FLUX
====================================================================
Uses FLUX.1-schnell to create unique background art for each of
the 4 Bio Defence worlds.

Requirements:
    - NVIDIA GPU with 12+ GB VRAM
    - diffusers, torch, Pillow (in the venv)

Usage (from project root):
    python scripts/generate_backgrounds.py

    Or with the existing venv:
    "c:\Users\timmy\Desktop\Projects\archive\Immersive Video\.venv\Scripts\python.exe" scripts/generate_backgrounds.py

Output:
    assets/bg/world_1_petri.png
    assets/bg/world_2_blood.png
    assets/bg/world_3_tissue.png
    assets/bg/world_4_pandemic.png
"""

import os
import torch
from diffusers import FluxPipeline
from PIL import Image

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "assets", "bg")
OUTPUT_W = 400
OUTPUT_H = 720

# FLUX generates at multiples of 64; 512×896 is close to 400×720 aspect ratio
GEN_W = 512
GEN_H = 896

NUM_STEPS = 4          # schnell is optimized for 1-4 steps
GUIDANCE = 0.0         # schnell doesn't use CFG

SEED = 42              # Fixed seed for reproducibility

# ---------------------------------------------------------------------------
# World prompts
# ---------------------------------------------------------------------------

WORLDS = [
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
# Main
# ---------------------------------------------------------------------------

def main():
    os.makedirs(ASSETS_DIR, exist_ok=True)

    print("=" * 60)
    print("Bio Defence World Background Generator (FLUX.1-schnell)")
    print("=" * 60)

    print("\n🔧 Loading FLUX pipeline...")
    pipe = FluxPipeline.from_pretrained(
        "black-forest-labs/FLUX.1-schnell",
        torch_dtype=torch.bfloat16,
    )
    pipe.enable_model_cpu_offload()
    print("  ✓ Pipeline ready")

    generator = torch.Generator("cpu").manual_seed(SEED)

    for world in WORLDS:
        print(f"\n🎨 Generating World {world['id']}: {world['filename']}...")
        print(f"   Prompt: {world['prompt'][:80]}...")

        result = pipe(
            prompt=world["prompt"],
            width=GEN_W,
            height=GEN_H,
            num_inference_steps=NUM_STEPS,
            guidance_scale=GUIDANCE,
            generator=generator,
        )

        img = result.images[0]

        # Resize to exact game dimensions
        img = img.resize((OUTPUT_W, OUTPUT_H), Image.LANCZOS)

        # Apply a dark vignette overlay for game readability
        img = apply_vignette(img)

        path = os.path.join(ASSETS_DIR, world["filename"])
        img.save(path, quality=90)
        print(f"   ✓ Saved: {path} ({OUTPUT_W}×{OUTPUT_H})")

        # Reset generator for reproducibility per-world
        generator = torch.Generator("cpu").manual_seed(SEED + world["id"])

    print(f"\n✅ Generated {len(WORLDS)} world backgrounds")
    print(f"   Output directory: {ASSETS_DIR}")


def apply_vignette(img):
    """Apply a dark vignette to improve text readability over the background."""
    from PIL import ImageDraw, ImageFilter

    w, h = img.size
    vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(vignette)

    # Radial gradient: dark at edges, transparent at center
    cx, cy = w // 2, h // 2
    max_r = (cx ** 2 + cy ** 2) ** 0.5

    for i in range(40):
        r = max_r * (1 - i / 40)
        alpha = int(120 * (1 - i / 40) ** 2)
        x1, y1 = cx - r, cy - r
        x2, y2 = cx + r, cy + r
        draw.ellipse([x1, y1, x2, y2], fill=(0, 0, 0, alpha))

    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=30))

    # Composite
    img_rgba = img.convert("RGBA")
    result = Image.alpha_composite(img_rgba, vignette)
    return result.convert("RGB")


if __name__ == "__main__":
    main()
