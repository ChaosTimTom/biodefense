"""
Asset compression script for Bio Defence.
Resizes tile textures from 1024px to 256px and optimizes PNGs.
Run: python scripts/compress_assets.py
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Installing Pillow...")
    os.system(f"{sys.executable} -m pip install Pillow")
    from PIL import Image

# Project root
ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

# Only compress the files we actually load in the game
TARGETS = {
    "germs/bacteria.png": 256,
    "germs/virus.png": 256,
    "germs/fungus.png": 256,
    "germs/antibacterial.png": 256,
    "germs/antiviral.png": 256,
    "germs/antifungal.png": 256,
    "tiles/tile_empty.png": 256,
    "tiles/tile_wall.png": 256,
}


def compress_asset(rel_path: str, target_size: int) -> None:
    src = ASSETS / rel_path
    if not src.exists():
        print(f"  SKIP (not found): {rel_path}")
        return

    img = Image.open(src)
    original_size = src.stat().st_size
    w, h = img.size

    if w <= target_size and h <= target_size:
        print(f"  SKIP (already {w}x{h}): {rel_path}")
        return

    # Resize with high-quality Lanczos filter
    img = img.resize((target_size, target_size), Image.LANCZOS)

    # Save with optimization
    img.save(src, "PNG", optimize=True)

    new_size = src.stat().st_size
    ratio = (1 - new_size / original_size) * 100
    print(f"  {rel_path}: {w}x{h} -> {target_size}x{target_size} | {original_size//1024}KB -> {new_size//1024}KB ({ratio:.0f}% smaller)")


def main() -> None:
    print("Bio Defence Asset Compression")
    print("=" * 40)

    total_before = 0
    total_after = 0

    for rel_path, size in TARGETS.items():
        src = ASSETS / rel_path
        if src.exists():
            total_before += src.stat().st_size

        compress_asset(rel_path, size)

        if src.exists():
            total_after += src.stat().st_size

    print()
    print(f"Before: {total_before // 1024}KB")
    print(f"After:  {total_after // 1024}KB")
    print(f"Saved:  {(total_before - total_after) // 1024}KB ({((1 - total_after / total_before) * 100):.0f}%)")


if __name__ == "__main__":
    main()
