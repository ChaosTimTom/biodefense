#!/usr/bin/env python3
"""
generate_ui_assets.py — Generate missing UI assets via FLUX.1-schnell + rembg.

These are ICONS and BUTTONS (transparent background sprites), not seamless tiles.
Uses rembg for background removal on icon assets.

Usage:
  cd "c:/Users/timmy/Desktop/Projects/Bio Defence"
  & "c:/Users/timmy/Desktop/Projects/archive/Immersive Video/.venv/Scripts/python.exe" scripts/generate_ui_assets.py [--force]
"""

import sys
import time
import torch
from pathlib import Path
from diffusers import FluxPipeline
from PIL import Image
from rembg import remove as remove_bg

# ── Configuration ────────────────────────────────────────────────

MODEL_ID = "black-forest-labs/FLUX.1-schnell"
MODEL_CACHE = r"c:\Users\timmy\Desktop\Projects\archive\Immersive Video\models"
ASSETS_DIR = Path(r"c:\Users\timmy\Desktop\Projects\Bio Defence\assets")
GEN_SIZE = 1024
OUTPUT_SIZE = 512      # icons are smaller

NUM_STEPS = 4
GUIDANCE_SCALE = 0.0

# Icon style preamble
ICON_STYLE = (
    "Single centered object on plain white background, clean studio lighting, "
    "highly detailed 3D render, game icon style, no text, no watermark, "
    "professional game asset"
)

# Button style preamble - these keep their backgrounds
BUTTON_STYLE = (
    "Modern sci-fi game UI button, glossy dark panel with glowing edge, "
    "clean minimalist design, highly detailed, no text, no watermark"
)

# ── Asset definitions ────────────────────────────────────────────
# (subfolder, filename, prompt_detail, remove_background)

ASSETS: list[tuple[str, str, str, bool]] = [
    # ═══ Missing tool icons ═══
    ("tools", "tool_antifungal.png",
     "single glass vial of glowing magenta-pink antifungal medicine, "
     "luminescent pink liquid in laboratory flask, medical pharmaceutical icon, "
     "centered on plain white background",
     True),

    ("tools", "tool_antifungal_selected.png",
     "single glass vial of bright glowing magenta-pink antifungal medicine, "
     "luminescent pink liquid in laboratory flask, medical pharmaceutical icon, "
     "bright glowing cyan highlight border aura, centered on plain white background",
     True),

    # ═══ Missing UI buttons ═══
    ("ui", "ui_btn_reset.png",
     "single circular refresh reset icon, curved arrow forming a circle, "
     "orange-red metallic glossy game button, sci-fi medical theme, "
     "centered on plain white background",
     True),

    ("ui", "ui_btn_reset_hover.png",
     "single circular refresh reset icon, curved arrow forming a circle, "
     "bright glowing orange-red metallic game button with glowing edge, "
     "sci-fi medical theme, centered on plain white background",
     True),

    ("ui", "ui_btn_undo_hover.png",
     "single curved undo arrow icon pointing left, "
     "bright glowing silver-blue metallic game button with glowing edge, "
     "sci-fi medical theme, centered on plain white background",
     True),
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


def generate_asset(pipe, prompt_detail: str, out_path: Path, remove_background: bool) -> Path:
    """Generate one icon/button asset."""
    full_prompt = f"{ICON_STYLE}, {prompt_detail}"
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

    # Resize to output size
    if image.size[0] != OUTPUT_SIZE:
        image = image.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
        print(f"  Resized to {OUTPUT_SIZE}x{OUTPUT_SIZE}")

    # Remove background if requested
    if remove_background:
        print("  Removing background...")
        image = image.convert("RGBA")
        image = remove_bg(image)
        print("  Background removed")
    else:
        if image.mode != "RGB":
            image = image.convert("RGB")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(out_path, "PNG")
    size_kb = out_path.stat().st_size / 1024
    print(f"  Saved: {out_path.name} ({size_kb:.0f} KB)")
    return out_path


def main() -> None:
    force = "--force" in sys.argv

    # ── Determine what to generate ────────────────────────────
    to_generate: list[tuple[str, str, str, bool, Path]] = []
    for subfolder, filename, prompt, rmbg in ASSETS:
        out_dir = ASSETS_DIR / subfolder
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / filename

        if out_path.exists() and not force:
            print(f"  SKIP (exists): {subfolder}/{filename}")
        else:
            to_generate.append((subfolder, filename, prompt, rmbg, out_path))

    if not to_generate:
        print("\nAll assets already exist! Use --force to regenerate.")
        return

    print(f"\nWill generate {len(to_generate)} asset(s):")
    for sub, fn, _, _, _ in to_generate:
        print(f"  - {sub}/{fn}")
    print()

    # ── Load model ────────────────────────────────────────────
    pipe = load_pipeline()

    # ── Generate assets ───────────────────────────────────────
    generated: list[Path] = []
    t_start = time.time()

    for i, (sub, fn, prompt, rmbg, out_path) in enumerate(to_generate):
        print(f"[{i+1}/{len(to_generate)}] {sub}/{fn}")
        try:
            path = generate_asset(pipe, prompt, out_path, rmbg)
            generated.append(path)
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            continue

    # ── Summary ───────────────────────────────────────────────
    total_time = time.time() - t_start
    print(f"\n{'='*60}")
    print(f"DONE! Generated {len(generated)}/{len(to_generate)} assets "
          f"in {total_time:.1f}s")
    for p in generated:
        print(f"  {p.name}")
    print(f"{'='*60}")

    del pipe
    torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
