"""
generate_sprites.py — Generate all Bio Defence tile sprites
============================================================
Creates 256×256 PNG sprites for all 9 pathogens, 9 medicines,
and 8 world-specific tile variants.

Requirements:
    pip install Pillow

Usage:
    python scripts/generate_sprites.py

Output:
    assets/germs/{pathogen}.png         (9 files)
    assets/germs/{medicine}.png         (9 files)
    assets/tiles/tile_empty_w{1-4}.png  (4 files)
    assets/tiles/tile_wall_w{1-4}.png   (4 files)
"""

from PIL import Image, ImageDraw, ImageFilter
import math
import os

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SIZE = 512          # Draw at 2× for anti-aliasing
OUT_SIZE = 256      # Final sprite size
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "assets")

# -- Pathogen Colors (RGB) --
COLORS = {
    # Bacteria family
    "coccus":     (76, 175, 80),     # #4CAF50  Green
    "bacillus":   (139, 195, 74),    # #8BC34A  Lime
    "spirillum":  (0, 150, 136),     # #009688  Teal
    # Virus family
    "influenza":  (244, 67, 54),     # #F44336  Red
    "retrovirus": (198, 40, 40),     # #C62828  Crimson
    "phage":      (255, 87, 34),     # #FF5722  Deep Orange
    # Fungus family
    "mold":       (156, 39, 176),    # #9C27B0  Purple
    "yeast":      (206, 147, 216),   # #CE93D8  Lavender
    "spore":      (74, 20, 140),     # #4A148C  Deep Violet
}

# -- Medicine Colors (RGB) --
MED_COLORS = {
    "penicillin":    (0, 229, 255),    # Cyan
    "tetracycline":  (24, 255, 255),   # Bright Cyan
    "streptomycin":  (0, 191, 165),    # Teal
    "tamiflu":       (118, 255, 3),    # Lime
    "zidovudine":    (178, 255, 89),   # Light Lime
    "interferon":    (174, 234, 0),    # Yellow-Green
    "fluconazole":   (234, 128, 252),  # Pink
    "nystatin":      (224, 64, 251),   # Magenta
    "amphotericin":  (213, 0, 249),    # Violet
}

# Medicine → Pathogen mapping (for visual base shape)
MED_TO_PATH = {
    "penicillin":   "coccus",
    "tetracycline": "bacillus",
    "streptomycin": "spirillum",
    "tamiflu":      "influenza",
    "zidovudine":   "retrovirus",
    "interferon":   "phage",
    "fluconazole":  "mold",
    "nystatin":     "yeast",
    "amphotericin": "spore",
}

# World themes
WORLD_THEMES = {
    1: {"name": "Petri Dish", "empty": (26, 40, 30),   "wall": (58, 68, 52), "accent": (76, 175, 80)},
    2: {"name": "Bloodstream","empty": (40, 20, 22),    "wall": (72, 32, 35), "accent": (229, 57, 53)},
    3: {"name": "Tissue",     "empty": (32, 22, 40),    "wall": (58, 38, 68), "accent": (171, 71, 188)},
    4: {"name": "Pandemic",   "empty": (40, 30, 18),    "wall": (72, 58, 32), "accent": (255, 111, 0)},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def new_canvas(size=SIZE):
    """Create a transparent RGBA canvas."""
    return Image.new("RGBA", (size, size), (0, 0, 0, 0))


def finalize(img):
    """Downscale from 2× to final size with anti-aliasing."""
    return img.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


def lighten(color, amount=0.3):
    """Lighten an RGB color."""
    r, g, b = color
    return (
        min(255, int(r + (255 - r) * amount)),
        min(255, int(g + (255 - g) * amount)),
        min(255, int(b + (255 - b) * amount)),
    )


def darken(color, amount=0.3):
    """Darken an RGB color."""
    r, g, b = color
    return (
        max(0, int(r * (1 - amount))),
        max(0, int(g * (1 - amount))),
        max(0, int(b * (1 - amount))),
    )


def with_alpha(color, alpha):
    """Add alpha to an RGB tuple."""
    return color + (alpha,)


def draw_glow(img, cx, cy, radius, color, alpha=80):
    """Draw a soft glow behind a shape."""
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for i in range(5):
        r = radius + i * 8
        a = max(5, alpha - i * 15)
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=with_alpha(color, a))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=12))
    img.paste(Image.alpha_composite(Image.new("RGBA", img.size, (0, 0, 0, 0)), glow), (0, 0), glow)


# ---------------------------------------------------------------------------
# Pathogen Drawers
# ---------------------------------------------------------------------------

def draw_coccus(img, color):
    """Round bacteria — cluster of overlapping spheres."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 60, color, 60)
    d = ImageDraw.Draw(img)

    positions = [
        (cx - 40, cy - 35, 72),
        (cx + 35, cy - 25, 65),
        (cx - 20, cy + 30, 68),
        (cx + 25, cy + 35, 62),
        (cx + 5, cy - 5, 78),
    ]
    for x, y, r in positions:
        # Dark outline
        d.ellipse([x - r - 4, y - r - 4, x + r + 4, y + r + 4],
                  fill=with_alpha(darken(color, 0.4), 200))
        # Main sphere
        d.ellipse([x - r, y - r, x + r, y + r],
                  fill=with_alpha(color, 220))
        # Highlight
        d.ellipse([x - r * 0.4, y - r * 0.5, x + r * 0.1, y - r * 0.1],
                  fill=with_alpha(lighten(color, 0.5), 120))


def draw_bacillus(img, color):
    """Rod-shaped bacteria — elongated capsules."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 70, color, 50)
    d = ImageDraw.Draw(img)

    rods = [
        (cx - 60, cy - 40, cx + 80, cy + 10, -15),
        (cx - 30, cy + 20, cx + 90, cy + 70, 10),
        (cx - 70, cy + 10, cx + 30, cy + 55, -5),
    ]
    for x1, y1, x2, y2, _ in rods:
        # Rounded rectangle (rod shape)
        d.rounded_rectangle([x1 - 4, y1 - 4, x2 + 4, y2 + 4],
                            radius=30,
                            fill=with_alpha(darken(color, 0.3), 200))
        d.rounded_rectangle([x1, y1, x2, y2],
                            radius=28,
                            fill=with_alpha(color, 230))
        # Highlight stripe
        d.rounded_rectangle([x1 + 8, y1 + 5, x2 - 8, y1 + 15],
                            radius=8,
                            fill=with_alpha(lighten(color, 0.4), 100))


def draw_spirillum(img, color):
    """Spiral/corkscrew bacteria — wavy S-curve."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 80, color, 50)
    d = ImageDraw.Draw(img)

    # Draw a thick sinusoidal curve
    points = []
    for i in range(100):
        t = i / 100
        x = cx - 160 + t * 320
        y = cy + math.sin(t * math.pi * 3) * 80
        points.append((x, y))

    # Draw thick line segments
    width = 36
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        d.line([(x1, y1), (x2, y2)], fill=with_alpha(darken(color, 0.3), 200), width=width + 6)
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        d.line([(x1, y1), (x2, y2)], fill=with_alpha(color, 230), width=width)
    # Highlight along top of wave
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        d.line([(x1, y1 - 8), (x2, y2 - 8)], fill=with_alpha(lighten(color, 0.4), 90), width=8)


def draw_influenza(img, color):
    """Flu virus — sphere with spike protrusions."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 80, color, 60)
    d = ImageDraw.Draw(img)

    body_r = 90

    # Spikes around the perimeter
    num_spikes = 14
    for i in range(num_spikes):
        angle = (2 * math.pi * i) / num_spikes
        sx = cx + math.cos(angle) * (body_r + 30)
        sy = cy + math.sin(angle) * (body_r + 30)
        tip_x = cx + math.cos(angle) * (body_r + 65)
        tip_y = cy + math.sin(angle) * (body_r + 65)

        # Spike stem
        d.line([(sx, sy), (tip_x, tip_y)],
               fill=with_alpha(darken(color, 0.2), 220), width=10)
        # Spike ball
        d.ellipse([tip_x - 14, tip_y - 14, tip_x + 14, tip_y + 14],
                  fill=with_alpha(lighten(color, 0.2), 220))

    # Main body
    d.ellipse([cx - body_r - 3, cy - body_r - 3, cx + body_r + 3, cy + body_r + 3],
              fill=with_alpha(darken(color, 0.3), 220))
    d.ellipse([cx - body_r, cy - body_r, cx + body_r, cy + body_r],
              fill=with_alpha(color, 240))
    # Highlight
    d.ellipse([cx - body_r * 0.5, cy - body_r * 0.6, cx + body_r * 0.1, cy - body_r * 0.1],
              fill=with_alpha(lighten(color, 0.5), 100))


def draw_retrovirus(img, color):
    """Geometric icosahedral virus — hexagonal shape."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 80, color, 60)
    d = ImageDraw.Draw(img)

    r = 110
    # Outer hexagon
    hex_pts = [(cx + r * math.cos(math.pi / 3 * i - math.pi / 6),
                cy + r * math.sin(math.pi / 3 * i - math.pi / 6))
               for i in range(6)]
    d.polygon(hex_pts, fill=with_alpha(darken(color, 0.3), 220),
              outline=with_alpha(darken(color, 0.5), 200), width=4)
    # Inner filled hexagon
    inner_r = r * 0.85
    inner_pts = [(cx + inner_r * math.cos(math.pi / 3 * i - math.pi / 6),
                  cy + inner_r * math.sin(math.pi / 3 * i - math.pi / 6))
                 for i in range(6)]
    d.polygon(inner_pts, fill=with_alpha(color, 230))

    # Internal triangulation lines (icosahedral feel)
    for i in range(6):
        d.line([(cx, cy), inner_pts[i]],
               fill=with_alpha(darken(color, 0.15), 140), width=3)
    # Center dot
    d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18],
              fill=with_alpha(lighten(color, 0.3), 200))
    # Highlight on upper-left face
    d.polygon([inner_pts[4], inner_pts[5], (cx, cy)],
              fill=with_alpha(lighten(color, 0.3), 80))


def draw_phage(img, color):
    """Bacteriophage (T4) — hexagonal head + tail + legs."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 80, color, 50)
    d = ImageDraw.Draw(img)

    head_cy = cy - 70
    head_r = 70

    # Head (hexagonal)
    head_pts = [(cx + head_r * math.cos(math.pi / 3 * i - math.pi / 2),
                 head_cy + head_r * math.sin(math.pi / 3 * i - math.pi / 2))
                for i in range(6)]
    d.polygon(head_pts, fill=with_alpha(darken(color, 0.2), 220),
              outline=with_alpha(darken(color, 0.5), 200), width=4)
    d.polygon(head_pts, fill=with_alpha(color, 220))

    # Tail stem
    tail_top = head_cy + head_r - 10
    tail_bottom = cy + 120
    d.rectangle([cx - 12, tail_top, cx + 12, tail_bottom],
                fill=with_alpha(darken(color, 0.15), 220))

    # Base plate
    d.ellipse([cx - 35, tail_bottom - 12, cx + 35, tail_bottom + 12],
              fill=with_alpha(color, 200))

    # Tail fibers (6 legs)
    for i, angle in enumerate([-60, -30, -10, 10, 30, 60]):
        rad = math.radians(angle)
        leg_len = 80
        ex = cx + math.sin(rad) * leg_len
        ey = tail_bottom + math.cos(rad) * leg_len * 0.6
        d.line([(cx, tail_bottom), (ex, ey)],
               fill=with_alpha(darken(color, 0.1), 200), width=5)
        # Foot
        d.ellipse([ex - 6, ey - 6, ex + 6, ey + 6],
                  fill=with_alpha(lighten(color, 0.2), 200))

    # Head highlight
    d.ellipse([cx - 25, head_cy - 30, cx + 5, head_cy + 5],
              fill=with_alpha(lighten(color, 0.4), 80))


def draw_mold(img, color):
    """Branching hyphae — tree-like fungal network."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 70, color, 50)
    d = ImageDraw.Draw(img)

    # Draw branching structure recursively
    branches = []

    def add_branch(x, y, angle, length, width, depth):
        if depth <= 0 or length < 15:
            return
        ex = x + math.cos(angle) * length
        ey = y + math.sin(angle) * length
        branches.append((x, y, ex, ey, width, depth))
        # Fork into 2-3 branches
        spread = 0.6
        add_branch(ex, ey, angle - spread, length * 0.65, width * 0.7, depth - 1)
        add_branch(ex, ey, angle + spread, length * 0.65, width * 0.7, depth - 1)
        if depth > 2:
            add_branch(ex, ey, angle, length * 0.5, width * 0.6, depth - 1)

    # Start with 3-4 main trunks from center
    for angle_deg in [30, 120, 210, 310]:
        angle = math.radians(angle_deg)
        add_branch(cx, cy, angle, 110, 16, 5)

    # Draw dark outline pass then color pass
    for x1, y1, x2, y2, w, dep in branches:
        d.line([(x1, y1), (x2, y2)],
               fill=with_alpha(darken(color, 0.4), 180), width=int(w) + 4)
    for x1, y1, x2, y2, w, dep in branches:
        d.line([(x1, y1), (x2, y2)],
               fill=with_alpha(color, 200 + dep * 5), width=max(2, int(w)))
    # Tips: small circles at branch ends
    for x1, y1, x2, y2, w, dep in branches:
        if dep == 1:
            d.ellipse([x2 - 8, y2 - 8, x2 + 8, y2 + 8],
                      fill=with_alpha(lighten(color, 0.3), 180))
    # Center mass
    d.ellipse([cx - 20, cy - 20, cx + 20, cy + 20],
              fill=with_alpha(color, 240))


def draw_yeast(img, color):
    """Budding yeast cells — connected ovals."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 70, color, 50)
    d = ImageDraw.Draw(img)

    cells = [
        (cx - 50, cy - 20, 75, 95),   # Main cell (wider oval)
        (cx + 55, cy - 30, 55, 70),   # Bud 1
        (cx - 20, cy + 60, 50, 60),   # Bud 2
        (cx + 30, cy + 50, 40, 50),   # Small bud
    ]
    for x, y, rx, ry in cells:
        # Outline
        d.ellipse([x - rx - 3, y - ry - 3, x + rx + 3, y + ry + 3],
                  fill=with_alpha(darken(color, 0.35), 200))
        # Body
        d.ellipse([x - rx, y - ry, x + rx, y + ry],
                  fill=with_alpha(color, 220))
        # Nucleus (dark spot)
        d.ellipse([x - rx * 0.25, y - ry * 0.2, x + rx * 0.25, y + ry * 0.3],
                  fill=with_alpha(darken(color, 0.25), 150))
        # Highlight
        d.ellipse([x - rx * 0.5, y - ry * 0.6, x - rx * 0.1, y - ry * 0.2],
                  fill=with_alpha(lighten(color, 0.45), 100))


def draw_spore(img, color):
    """Explosive spore — starburst radiating outward."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    draw_glow(img, cx, cy, 100, color, 70)
    d = ImageDraw.Draw(img)

    # Radiating lines with dots
    num_rays = 12
    for i in range(num_rays):
        angle = (2 * math.pi * i) / num_rays + 0.15
        inner_r = 35
        outer_r = 140 + (i % 3) * 30  # Varying lengths

        ix = cx + math.cos(angle) * inner_r
        iy = cy + math.sin(angle) * inner_r
        ox = cx + math.cos(angle) * outer_r
        oy = cy + math.sin(angle) * outer_r

        # Ray line
        d.line([(ix, iy), (ox, oy)],
               fill=with_alpha(color, 180), width=6)
        # Tip dot
        dot_r = 10 + (i % 2) * 5
        d.ellipse([ox - dot_r, oy - dot_r, ox + dot_r, oy + dot_r],
                  fill=with_alpha(lighten(color, 0.3), 200))

    # Central mass (dark core with bright ring)
    d.ellipse([cx - 45, cy - 45, cx + 45, cy + 45],
              fill=with_alpha(darken(color, 0.3), 230))
    d.ellipse([cx - 35, cy - 35, cx + 35, cy + 35],
              fill=with_alpha(color, 240))
    d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18],
              fill=with_alpha(lighten(color, 0.4), 200))


# ---------------------------------------------------------------------------
# Pathogen drawer dispatch
# ---------------------------------------------------------------------------

PATHOGEN_DRAWERS = {
    "coccus":     draw_coccus,
    "bacillus":   draw_bacillus,
    "spirillum":  draw_spirillum,
    "influenza":  draw_influenza,
    "retrovirus": draw_retrovirus,
    "phage":      draw_phage,
    "mold":       draw_mold,
    "yeast":      draw_yeast,
    "spore":      draw_spore,
}


# ---------------------------------------------------------------------------
# Medicine overlay
# ---------------------------------------------------------------------------

def draw_medicine_cross(img, color):
    """Draw a medical cross overlay in the center."""
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    arm_w = 22
    arm_h = 60

    # White cross with colored outline
    outline_c = with_alpha(color, 200)
    d.rounded_rectangle([cx - arm_w - 3, cy - arm_h - 3, cx + arm_w + 3, cy + arm_h + 3],
                        radius=6, fill=outline_c)
    d.rounded_rectangle([cx - arm_h - 3, cy - arm_w - 3, cx + arm_h + 3, cy + arm_w + 3],
                        radius=6, fill=outline_c)
    # White inner cross
    d.rounded_rectangle([cx - arm_w, cy - arm_h, cx + arm_w, cy + arm_h],
                        radius=4, fill=(255, 255, 255, 220))
    d.rounded_rectangle([cx - arm_h, cy - arm_w, cx + arm_h, cy + arm_w],
                        radius=4, fill=(255, 255, 255, 220))


def generate_medicine(pathogen_name, med_name, med_color):
    """Generate a medicine sprite: ghosted pathogen shape + medical cross."""
    img = new_canvas()

    # Draw pathogen shape at reduced opacity
    base_color = COLORS[pathogen_name]
    # Shift toward medicine color
    blended = (
        (base_color[0] + med_color[0]) // 2,
        (base_color[1] + med_color[1]) // 2,
        (base_color[2] + med_color[2]) // 2,
    )

    PATHOGEN_DRAWERS[pathogen_name](img, blended)

    # Overlay with semi-transparent medicine tint
    tint = Image.new("RGBA", (SIZE, SIZE), with_alpha(med_color, 60))
    img = Image.alpha_composite(img, tint)

    # Draw medical cross on top
    draw_medicine_cross(img, med_color)

    return finalize(img)


# ---------------------------------------------------------------------------
# World tile generators
# ---------------------------------------------------------------------------

def generate_empty_tile(world_num):
    """Generate world-specific empty tile."""
    theme = WORLD_THEMES[world_num]
    img = new_canvas()
    d = ImageDraw.Draw(img)

    base = theme["empty"]
    accent = theme["accent"]

    # Fill with base color
    d.rectangle([0, 0, SIZE, SIZE], fill=with_alpha(base, 255))

    # Subtle inner border / groove
    margin = 12
    d.rectangle([margin, margin, SIZE - margin, SIZE - margin],
                outline=with_alpha(lighten(base, 0.15), 80), width=2)

    # World-specific pattern
    if world_num == 1:
        # Petri dish: subtle circular agar pattern
        for i in range(3):
            r = 60 + i * 50
            d.ellipse([SIZE // 2 - r, SIZE // 2 - r, SIZE // 2 + r, SIZE // 2 + r],
                      outline=with_alpha(accent, 15), width=1)
    elif world_num == 2:
        # Bloodstream: subtle flowing lines
        for y_off in range(-1, 3):
            pts = [(x, SIZE // 4 + y_off * 150 + int(20 * math.sin(x / 60)))
                   for x in range(0, SIZE + 20, 20)]
            d.line(pts, fill=with_alpha(accent, 12), width=2)
    elif world_num == 3:
        # Tissue: hexagonal cell pattern
        for row in range(4):
            for col in range(4):
                cx = col * 140 + (row % 2) * 70
                cy = row * 140
                hex_r = 60
                pts = [(cx + hex_r * math.cos(math.pi / 3 * i),
                        cy + hex_r * math.sin(math.pi / 3 * i)) for i in range(6)]
                d.polygon(pts, outline=with_alpha(accent, 15), width=1)
    elif world_num == 4:
        # Pandemic: warning stripe hints
        d.line([(0, 0), (SIZE, SIZE)], fill=with_alpha(accent, 8), width=3)
        d.line([(SIZE, 0), (0, SIZE)], fill=with_alpha(accent, 8), width=3)

    # Subtle noise grain
    import random
    random.seed(world_num * 1000)
    for _ in range(400):
        x = random.randint(0, SIZE - 1)
        y = random.randint(0, SIZE - 1)
        v = random.randint(-8, 8)
        c = tuple(max(0, min(255, base[i] + v)) for i in range(3))
        d.point((x, y), fill=with_alpha(c, 60))

    return finalize(img)


def generate_wall_tile(world_num):
    """Generate world-specific wall tile."""
    theme = WORLD_THEMES[world_num]
    img = new_canvas()
    d = ImageDraw.Draw(img)

    base = theme["wall"]
    accent = theme["accent"]

    # Fill with wall base color
    d.rectangle([0, 0, SIZE, SIZE], fill=with_alpha(base, 255))

    if world_num == 1:
        # Glass rim: beveled edge effect
        d.rectangle([8, 8, SIZE - 8, SIZE - 8],
                    fill=with_alpha(lighten(base, 0.12), 255))
        d.rectangle([16, 16, SIZE - 16, SIZE - 16],
                    fill=with_alpha(base, 255))
        # Highlight edge
        d.line([(8, 8), (SIZE - 8, 8)], fill=with_alpha(lighten(base, 0.3), 150), width=3)
        d.line([(8, 8), (8, SIZE - 8)], fill=with_alpha(lighten(base, 0.2), 120), width=3)
    elif world_num == 2:
        # Vessel wall: organic curved texture
        for i in range(5):
            y = 50 + i * 100
            pts = [(x, y + int(15 * math.sin(x / 40 + i))) for x in range(0, SIZE + 10, 10)]
            d.line(pts, fill=with_alpha(darken(base, 0.2), 100), width=4)
        d.rectangle([4, 4, SIZE - 4, SIZE - 4],
                    outline=with_alpha(accent, 50), width=4)
    elif world_num == 3:
        # Dense membrane: layered ridges
        for i in range(8):
            y = i * 65
            d.rectangle([0, y, SIZE, y + 30],
                        fill=with_alpha(lighten(base, 0.08), 255))
        d.rectangle([6, 6, SIZE - 6, SIZE - 6],
                    outline=with_alpha(accent, 40), width=3)
    elif world_num == 4:
        # Metal barrier: industrial rivets
        d.rectangle([6, 6, SIZE - 6, SIZE - 6],
                    fill=with_alpha(lighten(base, 0.1), 255))
        d.rectangle([6, 6, SIZE - 6, SIZE - 6],
                    outline=with_alpha(accent, 80), width=4)
        # Rivets in corners
        rivet_r = 14
        for rx, ry in [(40, 40), (SIZE - 40, 40), (40, SIZE - 40), (SIZE - 40, SIZE - 40)]:
            d.ellipse([rx - rivet_r, ry - rivet_r, rx + rivet_r, ry + rivet_r],
                      fill=with_alpha(lighten(base, 0.25), 200))
            d.ellipse([rx - rivet_r + 3, ry - rivet_r + 3, rx + rivet_r - 5, ry + rivet_r - 5],
                      fill=with_alpha(lighten(base, 0.35), 150))
        # Center X brace
        d.line([(80, 80), (SIZE - 80, SIZE - 80)],
               fill=with_alpha(accent, 40), width=6)
        d.line([(SIZE - 80, 80), (80, SIZE - 80)],
               fill=with_alpha(accent, 40), width=6)

    return finalize(img)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    germs_dir = os.path.join(ASSETS_DIR, "germs")
    tiles_dir = os.path.join(ASSETS_DIR, "tiles")
    os.makedirs(germs_dir, exist_ok=True)
    os.makedirs(tiles_dir, exist_ok=True)

    print("=" * 60)
    print("Bio Defence Sprite Generator")
    print("=" * 60)

    # ── Generate pathogen sprites ──
    print("\n📦 Generating pathogen sprites...")
    for name, color in COLORS.items():
        img = new_canvas()
        PATHOGEN_DRAWERS[name](img, color)
        out = finalize(img)
        path = os.path.join(germs_dir, f"{name}.png")
        out.save(path)
        print(f"  ✓ {path}")

    # ── Generate medicine sprites ──
    print("\n💊 Generating medicine sprites...")
    for med_name, path_name in MED_TO_PATH.items():
        med_color = MED_COLORS[med_name]
        out = generate_medicine(path_name, med_name, med_color)
        path = os.path.join(germs_dir, f"{med_name}.png")
        out.save(path)
        print(f"  ✓ {path}")

    # ── Generate world tiles ──
    print("\n🏗️  Generating world-specific tiles...")
    for w in range(1, 5):
        empty = generate_empty_tile(w)
        wall = generate_wall_tile(w)
        empty_path = os.path.join(tiles_dir, f"tile_empty_w{w}.png")
        wall_path = os.path.join(tiles_dir, f"tile_wall_w{w}.png")
        empty.save(empty_path)
        wall.save(wall_path)
        print(f"  ✓ {empty_path}")
        print(f"  ✓ {wall_path}")

    total = len(COLORS) + len(MED_COLORS) + 4 * 2
    print(f"\n✅ Generated {total} sprites")
    print(f"   Output directory: {ASSETS_DIR}")


if __name__ == "__main__":
    main()
