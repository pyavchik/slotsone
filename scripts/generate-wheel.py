#!/usr/bin/env python3
"""Generate a 2048x2048 top-down European roulette wheel PNG.

All numbers face outward from the centre (top of text toward centre).
"""

import math
from PIL import Image, ImageDraw, ImageFont

SIZE = 2048
CX, CY = SIZE // 2, SIZE // 2

# European wheel order
WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

RED_NUMBERS = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}

SEGMENTS = len(WHEEL_ORDER)  # 37
SEG_DEG = 360.0 / SEGMENTS

# Radii
R_OUTER_RIM    = 1000   # gold outer rim
R_POCKET_OUTER = 975    # pocket colour band outer
R_POCKET_FLOOR = 840    # transition: back wall → pocket floor
R_POCKET_INNER = 780    # pocket floor inner edge
R_NUMBER_CENTER = 905   # centre of number text (moved outward)
R_INNER_WALL   = 770    # dark inner wall / apron
R_BALL_TRACK_O = 760    # ball track outer
R_BALL_TRACK_I = 710    # ball track inner
R_DEFLECTOR_R  = 735    # center radius for diamond deflectors
R_CONE_OUTER   = 700    # cone outer (polished wood)
R_CONE_RING1   = 620    # first decorative ring
R_CONE_RING2   = 500    # second decorative ring
R_CONE_RING3   = 380    # third decorative ring
R_CONE_INNER   = 200    # cone inner edge
R_TURRET_OUTER = 160    # turret (gold cap)
R_TURRET_MID   = 110    # turret middle ring
R_TURRET_INNER = 70     # turret inner
R_TURRET_CAP   = 35     # turret center cap

# Colours
GOLD       = (200, 160, 78)
GOLD_DARK  = (140, 110, 50)
BG         = (0, 0, 0)
RED        = (180, 40, 35)
BLACK      = (25, 25, 40)
GREEN      = (39, 174, 96)
WHITE      = (255, 255, 255)
BROWN_DARK  = (50, 28, 12)
BROWN_MID   = (85, 50, 25)
BROWN_LIGHT = (115, 70, 35)
BROWN_WARM  = (100, 60, 30)
CHROME       = (180, 185, 190)
CHROME_LIGHT = (210, 215, 220)
CHROME_DARK  = (90, 95, 100)
CHROME_SHADOW= (50, 52, 58)
TURRET_GOLD  = (195, 165, 80)
TURRET_BRIGHT= (230, 200, 110)
TURRET_DARK  = (130, 105, 50)
FRET_GOLD_BRIGHT = (220, 195, 120)  # bright gold highlight
FRET_GOLD        = (185, 155, 80)   # gold fret body
FRET_GOLD_DARK   = (110, 85, 40)    # dark gold shadow
FRET_SHADOW      = (15, 12, 8)      # deep shadow next to fret

# Font
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SIZE = 52

def pocket_color(n: int) -> tuple:
    if n == 0:
        return GREEN
    return RED if n in RED_NUMBERS else BLACK

def darken(color: tuple, amount: int) -> tuple:
    return tuple(max(0, c - amount) for c in color)

def lighten(color: tuple, amount: int) -> tuple:
    return tuple(min(255, c + amount) for c in color)

def radial_point(cx, cy, r, angle_rad):
    return (cx + r * math.cos(angle_rad), cy + r * math.sin(angle_rad))

def draw_fret_polygon(draw, cx, cy, r_inner, r_outer, angle_rad, half_width_px):
    """Draw a fret as a filled trapezoid polygon centered on angle_rad."""
    perp = angle_rad + math.pi / 2
    # 4 corners: inner-left, inner-right, outer-right, outer-left
    il = (cx + r_inner * math.cos(angle_rad) - half_width_px * math.cos(perp),
          cy + r_inner * math.sin(angle_rad) - half_width_px * math.sin(perp))
    ir = (cx + r_inner * math.cos(angle_rad) + half_width_px * math.cos(perp),
          cy + r_inner * math.sin(angle_rad) + half_width_px * math.sin(perp))
    oR = (cx + r_outer * math.cos(angle_rad) + half_width_px * math.cos(perp),
          cy + r_outer * math.sin(angle_rad) + half_width_px * math.sin(perp))
    ol = (cx + r_outer * math.cos(angle_rad) - half_width_px * math.cos(perp),
          cy + r_outer * math.sin(angle_rad) - half_width_px * math.sin(perp))
    return [il, ir, oR, ol]

def draw_circle(draw: ImageDraw.Draw, cx: int, cy: int, r: int, fill=None, outline=None, width=1):
    bbox = [cx - r, cy - r, cx + r, cy + r]
    draw.ellipse(bbox, fill=fill, outline=outline, width=width)

def draw_segment(draw: ImageDraw.Draw, cx: int, cy: int, r_outer: int, r_inner: int,
                 start_deg: float, end_deg: float, fill):
    """Draw a filled arc segment (annular wedge) by polygon approximation."""
    points = []
    steps = max(8, int(abs(end_deg - start_deg) * 2))

    # Outer arc
    for i in range(steps + 1):
        angle = math.radians(start_deg + (end_deg - start_deg) * i / steps)
        points.append((cx + r_outer * math.cos(angle), cy + r_outer * math.sin(angle)))

    # Inner arc (reversed)
    for i in range(steps, -1, -1):
        angle = math.radians(start_deg + (end_deg - start_deg) * i / steps)
        points.append((cx + r_inner * math.cos(angle), cy + r_inner * math.sin(angle)))

    draw.polygon(points, fill=fill)

def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE)

    # Background circle (black)
    draw_circle(draw, CX, CY, R_OUTER_RIM + 20, fill=BG)

    # Gold outer rim
    draw_circle(draw, CX, CY, R_OUTER_RIM, fill=GOLD)
    draw_circle(draw, CX, CY, R_OUTER_RIM - 8, fill=GOLD_DARK)
    draw_circle(draw, CX, CY, R_POCKET_OUTER, fill=BG)

    # ── POCKET CELLS ──
    # Each pocket has two zones:
    #   Back wall (outer): colored, holds the number
    #   Floor (inner): much darker — concave basin where ball sits
    # Then thick gold frets separate each pocket.

    FRET_HALF_PX = 8  # half-width of each fret in pixels (~16px total)

    for i, number in enumerate(WHEEL_ORDER):
        start_deg = 270 + i * SEG_DEG - SEG_DEG / 2
        end_deg = start_deg + SEG_DEG
        color = pocket_color(number)

        # ── Back wall (number area) ──
        draw_segment(draw, CX, CY, R_POCKET_OUTER, R_POCKET_FLOOR,
                     start_deg, end_deg, fill=color)

        # ── Pocket floor (ball basin) — significantly darker ──
        floor_base = darken(color, 80)
        draw_segment(draw, CX, CY, R_POCKET_FLOOR, R_POCKET_INNER,
                     start_deg, end_deg, fill=floor_base)

        # Floor-to-wall transition: gradient bands for concavity
        for band_i in range(4):
            t = band_i / 4.0
            band_r_outer = R_POCKET_FLOOR + int((R_POCKET_OUTER - R_POCKET_FLOOR) * t * 0.25)
            band_r_inner = R_POCKET_FLOOR - int((R_POCKET_FLOOR - R_POCKET_INNER) * (1.0 - t) * 0.3)
            band_color = darken(color, int(80 * (1.0 - t * 0.5)))
            draw_segment(draw, CX, CY, R_POCKET_FLOOR + 5 - band_i * 2,
                         R_POCKET_FLOOR - 10 + band_i * 3,
                         start_deg, end_deg, fill=band_color)

        # ── Pocket inner shadow (deepest part of basin) ──
        deep_shadow = darken(color, 110)
        draw_segment(draw, CX, CY, R_POCKET_INNER + 18, R_POCKET_INNER,
                     start_deg, end_deg, fill=deep_shadow)

        # ── Shadow strips along fret edges inside pocket ──
        fret_edge_shadow = darken(color, 95)
        shadow_deg = SEG_DEG * 0.12
        # Left edge
        draw_segment(draw, CX, CY, R_POCKET_OUTER, R_POCKET_INNER,
                     start_deg, start_deg + shadow_deg, fill=fret_edge_shadow)
        # Right edge
        draw_segment(draw, CX, CY, R_POCKET_OUTER, R_POCKET_INNER,
                     end_deg - shadow_deg, end_deg, fill=fret_edge_shadow)

    # ── GOLD FRETS — thick polygon dividers ──
    for i in range(SEGMENTS):
        angle_deg = 270 + i * SEG_DEG - SEG_DEG / 2
        angle_rad = math.radians(angle_deg)
        perp = angle_rad + math.pi / 2

        # Extend frets slightly past pocket band
        r_in = R_POCKET_INNER - 3
        r_out = R_POCKET_OUTER + 3

        # Shadow halo behind fret (wider, very dark)
        shadow_pts = draw_fret_polygon(draw, CX, CY, r_in, r_out,
                                        angle_rad, FRET_HALF_PX + 4)
        draw.polygon(shadow_pts, fill=FRET_SHADOW)

        # Main gold fret body
        body_pts = draw_fret_polygon(draw, CX, CY, r_in, r_out,
                                      angle_rad, FRET_HALF_PX)
        draw.polygon(body_pts, fill=FRET_GOLD)

        # Bright highlight on left half of fret
        hl_pts = draw_fret_polygon(draw, CX, CY, r_in + 2, r_out - 2,
                                    angle_rad, FRET_HALF_PX)
        # Shift highlight points to one side
        dx_hl = -3 * math.cos(perp)
        dy_hl = -3 * math.sin(perp)
        hl_shifted = [(x + dx_hl, y + dy_hl) for x, y in hl_pts]
        # Clip: only draw the left half by using a narrow polygon
        hl_narrow = draw_fret_polygon(draw, CX, CY, r_in + 4, r_out - 4,
                                       angle_rad - 0.002, FRET_HALF_PX * 0.45)
        draw.polygon(hl_narrow, fill=FRET_GOLD_BRIGHT)

        # Dark shadow on right half of fret
        dk_narrow = draw_fret_polygon(draw, CX, CY, r_in + 4, r_out - 4,
                                       angle_rad + 0.002, FRET_HALF_PX * 0.45)
        draw.polygon(dk_narrow, fill=FRET_GOLD_DARK)

    # ── Inner gold ring at pocket floor boundary ──
    draw_circle(draw, CX, CY, R_POCKET_INNER + 2, outline=FRET_GOLD_DARK, width=5)
    draw_circle(draw, CX, CY, R_POCKET_INNER, outline=FRET_GOLD, width=3)

    # ── Outer pocket rim accent ──
    draw_circle(draw, CX, CY, R_POCKET_OUTER, outline=FRET_GOLD_DARK, width=3)

    # ── INNER WALL / APRON ──
    draw_circle(draw, CX, CY, R_INNER_WALL, fill=BROWN_DARK)
    draw_circle(draw, CX, CY, R_INNER_WALL, outline=FRET_GOLD_DARK, width=3)

    # ── BALL TRACK — chrome ring where ball rolls ──
    # Outer chrome rim
    draw_circle(draw, CX, CY, R_BALL_TRACK_O, fill=CHROME_DARK)
    # Main track surface — polished chrome
    draw_circle(draw, CX, CY, R_BALL_TRACK_O - 4, fill=CHROME)
    # Highlight band (upper part of track catches light)
    draw_circle(draw, CX, CY, R_BALL_TRACK_O - 8, fill=CHROME_LIGHT)
    # Middle track
    draw_circle(draw, CX, CY, R_DEFLECTOR_R + 8, fill=CHROME)
    # Lower track (darker, shadow)
    draw_circle(draw, CX, CY, R_DEFLECTOR_R - 8, fill=CHROME_DARK)
    # Inner chrome rim
    draw_circle(draw, CX, CY, R_BALL_TRACK_I + 6, fill=CHROME_SHADOW)
    draw_circle(draw, CX, CY, R_BALL_TRACK_I, fill=CHROME_DARK)

    # ── 8 DIAMOND DEFLECTORS on ball track ──
    # 4 vertical (taller) + 4 horizontal (wider), alternating every 45°
    for di in range(8):
        d_angle = math.radians(di * 45)
        dcx = CX + R_DEFLECTOR_R * math.cos(d_angle)
        dcy = CY + R_DEFLECTOR_R * math.sin(d_angle)

        # Alternating: tall/narrow vs wide/short
        if di % 2 == 0:
            # Vertical diamond (taller radially)
            radial_size = 28
            tangent_size = 14
        else:
            # Horizontal diamond (wider tangentially)
            radial_size = 18
            tangent_size = 22

        # Diamond points: radial direction and perpendicular
        perp = d_angle + math.pi / 2
        pts_shadow = [
            (dcx + (radial_size + 3) * math.cos(d_angle),
             dcy + (radial_size + 3) * math.sin(d_angle)),
            (dcx + (tangent_size + 3) * math.cos(perp),
             dcy + (tangent_size + 3) * math.sin(perp)),
            (dcx - (radial_size + 3) * math.cos(d_angle),
             dcy - (radial_size + 3) * math.sin(d_angle)),
            (dcx - (tangent_size + 3) * math.cos(perp),
             dcy - (tangent_size + 3) * math.sin(perp)),
        ]
        draw.polygon(pts_shadow, fill=CHROME_SHADOW)

        # Main body
        pts_body = [
            (dcx + radial_size * math.cos(d_angle),
             dcy + radial_size * math.sin(d_angle)),
            (dcx + tangent_size * math.cos(perp),
             dcy + tangent_size * math.sin(perp)),
            (dcx - radial_size * math.cos(d_angle),
             dcy - radial_size * math.sin(d_angle)),
            (dcx - tangent_size * math.cos(perp),
             dcy - tangent_size * math.sin(perp)),
        ]
        draw.polygon(pts_body, fill=CHROME)

        # Highlight (smaller, offset toward light)
        hl_size_r = radial_size * 0.55
        hl_size_t = tangent_size * 0.55
        hl_off = 2
        pts_hl = [
            (dcx + hl_size_r * math.cos(d_angle) - hl_off,
             dcy + hl_size_r * math.sin(d_angle) - hl_off),
            (dcx + hl_size_t * math.cos(perp) - hl_off,
             dcy + hl_size_t * math.sin(perp) - hl_off),
            (dcx - hl_size_r * math.cos(d_angle) - hl_off,
             dcy - hl_size_r * math.sin(d_angle) - hl_off),
            (dcx - hl_size_t * math.cos(perp) - hl_off,
             dcy - hl_size_t * math.sin(perp) - hl_off),
        ]
        draw.polygon(pts_hl, fill=CHROME_LIGHT)

    # Ball track edge rings
    draw_circle(draw, CX, CY, R_BALL_TRACK_O, outline=CHROME_SHADOW, width=3)
    draw_circle(draw, CX, CY, R_BALL_TRACK_I, outline=CHROME_SHADOW, width=3)

    # ── CONE — polished wood with gradient depth ──
    # The cone slopes from ball track down to turret, creating depth
    # Multiple concentric rings simulate the sloped surface

    # Outer cone base
    draw_circle(draw, CX, CY, R_CONE_OUTER, fill=BROWN_DARK)

    # Gradient rings from outer to inner (light → dark → light → dark)
    cone_rings = [
        (R_CONE_OUTER,      BROWN_MID),
        (R_CONE_OUTER - 10, BROWN_WARM),
        (R_CONE_OUTER - 25, BROWN_LIGHT),
        (R_CONE_RING1 + 30, BROWN_WARM),
        (R_CONE_RING1,      BROWN_MID),
        (R_CONE_RING1 - 20, BROWN_DARK),
        (R_CONE_RING1 - 35, BROWN_MID),
        (R_CONE_RING2 + 40, BROWN_WARM),
        (R_CONE_RING2 + 15, BROWN_LIGHT),
        (R_CONE_RING2,      BROWN_WARM),
        (R_CONE_RING2 - 25, BROWN_MID),
        (R_CONE_RING2 - 50, BROWN_DARK),
        (R_CONE_RING3 + 30, BROWN_MID),
        (R_CONE_RING3,      BROWN_WARM),
        (R_CONE_RING3 - 25, BROWN_LIGHT),
        (R_CONE_RING3 - 50, BROWN_WARM),
        (R_CONE_RING3 - 80, BROWN_MID),
        (R_CONE_INNER + 50, BROWN_DARK),
        (R_CONE_INNER + 25, BROWN_MID),
        (R_CONE_INNER,      BROWN_DARK),
    ]
    for r, color in cone_rings:
        if r > 0:
            draw_circle(draw, CX, CY, r, fill=color)

    # Gold accent rings on cone
    draw_circle(draw, CX, CY, R_CONE_OUTER - 3, outline=GOLD_DARK, width=2)
    draw_circle(draw, CX, CY, R_CONE_RING1, outline=GOLD_DARK, width=2)
    draw_circle(draw, CX, CY, R_CONE_RING2 - 1, outline=GOLD_DARK, width=1)
    draw_circle(draw, CX, CY, R_CONE_RING3, outline=GOLD_DARK, width=1)

    # ── TURRET — decorative gold center cap ──
    # Outer turret ring
    draw_circle(draw, CX, CY, R_TURRET_OUTER, fill=TURRET_DARK)
    draw_circle(draw, CX, CY, R_TURRET_OUTER - 4, fill=TURRET_GOLD)
    draw_circle(draw, CX, CY, R_TURRET_OUTER, outline=TURRET_DARK, width=3)

    # Middle turret ring (raised)
    draw_circle(draw, CX, CY, R_TURRET_MID, fill=TURRET_DARK)
    draw_circle(draw, CX, CY, R_TURRET_MID - 4, fill=TURRET_BRIGHT)
    draw_circle(draw, CX, CY, R_TURRET_MID, outline=TURRET_DARK, width=2)

    # Inner turret
    draw_circle(draw, CX, CY, R_TURRET_INNER, fill=TURRET_GOLD)
    draw_circle(draw, CX, CY, R_TURRET_INNER, outline=TURRET_DARK, width=2)

    # Center cap
    draw_circle(draw, CX, CY, R_TURRET_CAP, fill=TURRET_BRIGHT)
    draw_circle(draw, CX, CY, R_TURRET_CAP, outline=TURRET_DARK, width=2)
    draw_circle(draw, CX, CY, R_TURRET_CAP - 10, fill=TURRET_GOLD)

    # ── Small gold diamonds on apron (between pockets and ball track) ──
    for i in range(SEGMENTS):
        angle_deg = 270 + i * SEG_DEG
        angle_rad = math.radians(angle_deg)
        dx = CX + (R_INNER_WALL - 6) * math.cos(angle_rad)
        dy = CY + (R_INNER_WALL - 6) * math.sin(angle_rad)
        diamond_size = 7
        pts = [
            (dx + diamond_size * math.cos(angle_rad), dy + diamond_size * math.sin(angle_rad)),
            (dx + diamond_size * math.cos(angle_rad + math.pi/2), dy + diamond_size * math.sin(angle_rad + math.pi/2)),
            (dx + diamond_size * math.cos(angle_rad + math.pi), dy + diamond_size * math.sin(angle_rad + math.pi)),
            (dx + diamond_size * math.cos(angle_rad - math.pi/2), dy + diamond_size * math.sin(angle_rad - math.pi/2)),
        ]
        draw.polygon(pts, fill=GOLD)

    # Draw numbers — all facing outward (top of text toward rim).
    # This is the industry standard for both physical and digital roulette
    # wheels.  The wheel rotates during play so consistent radial orientation
    # matters more than static readability.
    #
    # PIL rotate(θ) rotates CCW in screen coords (y-down).
    # Text "up" starts at 270° (screen-up).  After rotate(θ), text top
    # points to screen direction (270 - θ) mod 360 (CW from right).
    # Outward direction = angle_deg, so θ = 270 - angle_deg.

    for i, number in enumerate(WHEEL_ORDER):
        angle_deg = 270 + i * SEG_DEG
        angle_rad = math.radians(angle_deg)

        text = str(number)
        rotation = (270 - angle_deg) % 360

        bbox = font.getbbox(text)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        pad = 30
        tmp_size = int(math.hypot(tw, th)) + pad * 2
        tmp = Image.new("RGBA", (tmp_size, tmp_size), (0, 0, 0, 0))
        tmp_draw = ImageDraw.Draw(tmp)
        tx = (tmp_size - tw) // 2 - bbox[0]
        ty = (tmp_size - th) // 2 - bbox[1]
        tmp_draw.text((tx, ty), text, fill=WHITE, font=font)

        tmp_rot = tmp.rotate(rotation, resample=Image.BICUBIC, expand=False)

        nx = CX + R_NUMBER_CENTER * math.cos(angle_rad)
        ny = CY + R_NUMBER_CENTER * math.sin(angle_rad)
        paste_x = int(nx - tmp_rot.width / 2)
        paste_y = int(ny - tmp_rot.height / 2)

        img.paste(tmp_rot, (paste_x, paste_y), tmp_rot)

    # Outer gold ring final stroke
    draw_circle(draw, CX, CY, R_OUTER_RIM, outline=GOLD, width=5)

    # Save
    out_path = "/home/ubuntu/workspace/cv/slotsone/frontend/public/assets/roulette/pro/wheel-topdown-2048.png"
    img.save(out_path, "PNG")
    print(f"Saved {out_path} ({SIZE}x{SIZE})")

if __name__ == "__main__":
    main()
