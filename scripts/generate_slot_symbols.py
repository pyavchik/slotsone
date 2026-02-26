#!/usr/bin/env python3
"""
Generate production-ready slot symbol PNG assets (dependency-free).

Output:
  frontend/public/symbols/{10,j,q,k,a,star,scatter,wild}.png

The renderer uses 2x supersampling and downsamples to 512x512 for smoother
edges while staying fully in pure Python + zlib.
"""

from __future__ import annotations

import math
import os
import struct
import zlib
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

OUT_SIZE = 512
SUPERSAMPLE = 2
WIDTH = OUT_SIZE * SUPERSAMPLE
HEIGHT = OUT_SIZE * SUPERSAMPLE
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "symbols")

Color = Tuple[int, int, int, int]
Rgb = Tuple[int, int, int]
Point = Tuple[float, float]


def clamp(v: float, lo: int = 0, hi: int = 255) -> int:
    return max(lo, min(hi, int(round(v))))


def mix(c1: Color, c2: Color, t: float) -> Color:
    t = max(0.0, min(1.0, t))
    return (
        clamp(c1[0] + (c2[0] - c1[0]) * t),
        clamp(c1[1] + (c2[1] - c1[1]) * t),
        clamp(c1[2] + (c2[2] - c1[2]) * t),
        clamp(c1[3] + (c2[3] - c1[3]) * t),
    )


def rgb_mix(c1: Rgb, c2: Rgb, t: float) -> Rgb:
    t = max(0.0, min(1.0, t))
    return (
        clamp(c1[0] + (c2[0] - c1[0]) * t),
        clamp(c1[1] + (c2[1] - c1[1]) * t),
        clamp(c1[2] + (c2[2] - c1[2]) * t),
    )


def rgba(c: Rgb, a: int = 255) -> Color:
    return (c[0], c[1], c[2], a)


def darken(c: Rgb, amount: float) -> Rgb:
    return rgb_mix(c, (0, 0, 0), amount)


def lighten(c: Rgb, amount: float) -> Rgb:
    return rgb_mix(c, (255, 255, 255), amount)


def new_buffer(color: Color = (0, 0, 0, 0), width: int = WIDTH, height: int = HEIGHT) -> bytearray:
    return bytearray([color[0], color[1], color[2], color[3]] * (width * height))


def blend_pixel(buf: bytearray, x: int, y: int, color: Color, width: int = WIDTH, height: int = HEIGHT) -> None:
    if not (0 <= x < width and 0 <= y < height):
        return
    sr, sg, sb, sa = color
    if sa <= 0:
        return
    idx = (y * width + x) * 4
    dr, dg, db, da = buf[idx : idx + 4]
    sa_f = sa / 255.0
    da_f = da / 255.0
    out_a = sa_f + da_f * (1.0 - sa_f)
    if out_a <= 0.0:
        return
    out_r = (sr * sa_f + dr * da_f * (1.0 - sa_f)) / out_a
    out_g = (sg * sa_f + dg * da_f * (1.0 - sa_f)) / out_a
    out_b = (sb * sa_f + db * da_f * (1.0 - sa_f)) / out_a
    buf[idx : idx + 4] = bytes((clamp(out_r), clamp(out_g), clamp(out_b), clamp(out_a * 255.0)))


def _rr_bounds_for_y(y: int, x0: float, y0: float, w: float, h: float, r: float) -> Tuple[int, int] | None:
    if y < int(math.floor(y0)) or y >= int(math.ceil(y0 + h)):
        return None
    if r <= 0:
        return (int(math.ceil(x0)), int(math.floor(x0 + w - 1)))

    top_limit = y0 + r
    bot_limit = y0 + h - r
    inset = 0.0
    if y < top_limit:
        dy = top_limit - (y + 0.5)
        inset = r - math.sqrt(max(0.0, r * r - dy * dy))
    elif y >= bot_limit:
        dy = (y + 0.5) - bot_limit
        inset = r - math.sqrt(max(0.0, r * r - dy * dy))

    xs = int(math.ceil(x0 + inset))
    xe = int(math.floor(x0 + w - inset - 1))
    if xs > xe:
        return None
    return (xs, xe)


def draw_rr_solid(
    buf: bytearray,
    x: float,
    y: float,
    w: float,
    h: float,
    r: float,
    color: Color,
    width: int = WIDTH,
    height: int = HEIGHT,
) -> None:
    y0 = max(0, int(math.floor(y)))
    y1 = min(height - 1, int(math.ceil(y + h) - 1))
    for yy in range(y0, y1 + 1):
        bounds = _rr_bounds_for_y(yy, x, y, w, h, r)
        if bounds is None:
            continue
        xs, xe = bounds
        if xe < 0 or xs >= width:
            continue
        xs = max(xs, 0)
        xe = min(xe, width - 1)
        for xx in range(xs, xe + 1):
            blend_pixel(buf, xx, yy, color, width, height)


def draw_rr_vgradient(
    buf: bytearray,
    x: float,
    y: float,
    w: float,
    h: float,
    r: float,
    top: Color,
    bottom: Color,
    width: int = WIDTH,
    height: int = HEIGHT,
) -> None:
    y0 = max(0, int(math.floor(y)))
    y1 = min(height - 1, int(math.ceil(y + h) - 1))
    denom = max(1.0, h - 1.0)
    for yy in range(y0, y1 + 1):
        bounds = _rr_bounds_for_y(yy, x, y, w, h, r)
        if bounds is None:
            continue
        t = (yy - y) / denom
        c = mix(top, bottom, t)
        xs, xe = bounds
        if xe < 0 or xs >= width:
            continue
        xs = max(xs, 0)
        xe = min(xe, width - 1)
        for xx in range(xs, xe + 1):
            blend_pixel(buf, xx, yy, c, width, height)


def draw_rect(
    buf: bytearray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    color: Color,
    width: int = WIDTH,
    height: int = HEIGHT,
) -> None:
    xi0 = max(0, int(math.floor(min(x0, x1))))
    xi1 = min(width - 1, int(math.ceil(max(x0, x1)) - 1))
    yi0 = max(0, int(math.floor(min(y0, y1))))
    yi1 = min(height - 1, int(math.ceil(max(y0, y1)) - 1))
    if xi0 > xi1 or yi0 > yi1:
        return
    for yy in range(yi0, yi1 + 1):
        for xx in range(xi0, xi1 + 1):
            blend_pixel(buf, xx, yy, color, width, height)


def draw_circle(
    buf: bytearray,
    cx: float,
    cy: float,
    radius: float,
    color: Color,
    width: int = WIDTH,
    height: int = HEIGHT,
) -> None:
    if radius <= 0:
        return
    r2 = radius * radius
    x0 = max(0, int(math.floor(cx - radius)))
    x1 = min(width - 1, int(math.ceil(cx + radius)))
    y0 = max(0, int(math.floor(cy - radius)))
    y1 = min(height - 1, int(math.ceil(cy + radius)))
    for yy in range(y0, y1 + 1):
        dy = yy + 0.5 - cy
        dy2 = dy * dy
        for xx in range(x0, x1 + 1):
            dx = xx + 0.5 - cx
            if dx * dx + dy2 <= r2:
                blend_pixel(buf, xx, yy, color, width, height)


def draw_polygon(
    buf: bytearray,
    points: Sequence[Point],
    color: Color,
    width: int = WIDTH,
    height: int = HEIGHT,
) -> None:
    if len(points) < 3:
        return
    min_y = max(0, int(math.floor(min(p[1] for p in points))))
    max_y = min(height - 1, int(math.ceil(max(p[1] for p in points))))
    pts = list(points)
    edges = list(zip(pts, pts[1:] + pts[:1]))
    for yy in range(min_y, max_y + 1):
        y = yy + 0.5
        xs: List[float] = []
        for (x1, y1), (x2, y2) in edges:
            if (y1 <= y < y2) or (y2 <= y < y1):
                if y2 == y1:
                    continue
                t = (y - y1) / (y2 - y1)
                xs.append(x1 + (x2 - x1) * t)
        xs.sort()
        for i in range(0, len(xs), 2):
            if i + 1 >= len(xs):
                break
            x_start = int(math.ceil(xs[i]))
            x_end = int(math.floor(xs[i + 1]))
            if x_end < 0 or x_start >= width:
                continue
            x_start = max(0, x_start)
            x_end = min(width - 1, x_end)
            for xx in range(x_start, x_end + 1):
                blend_pixel(buf, xx, yy, color, width, height)


def draw_radial_glow(
    buf: bytearray,
    cx: float,
    cy: float,
    radius: float,
    color: Color,
    width: int = WIDTH,
    height: int = HEIGHT,
) -> None:
    if radius <= 0:
        return
    x0 = max(0, int(math.floor(cx - radius)))
    x1 = min(width - 1, int(math.ceil(cx + radius)))
    y0 = max(0, int(math.floor(cy - radius)))
    y1 = min(height - 1, int(math.ceil(cy + radius)))
    inv = 1.0 / max(1.0, radius)
    for yy in range(y0, y1 + 1):
        dy = yy + 0.5 - cy
        for xx in range(x0, x1 + 1):
            dx = xx + 0.5 - cx
            d = math.sqrt(dx * dx + dy * dy)
            if d > radius:
                continue
            t = d * inv
            alpha = color[3] * (1.0 - t) * (1.0 - t)
            blend_pixel(buf, xx, yy, (color[0], color[1], color[2], clamp(alpha)), width, height)


def downsample(buf: bytearray, width: int, height: int, scale: int) -> bytearray:
    if scale <= 1:
        return bytearray(buf)
    out_w = width // scale
    out_h = height // scale
    out = bytearray(out_w * out_h * 4)
    block = scale * scale
    for oy in range(out_h):
        for ox in range(out_w):
            sr = sg = sb = sa = 0
            for sy in range(scale):
                yy = oy * scale + sy
                row = yy * width
                for sx in range(scale):
                    xx = ox * scale + sx
                    idx = (row + xx) * 4
                    sr += buf[idx]
                    sg += buf[idx + 1]
                    sb += buf[idx + 2]
                    sa += buf[idx + 3]
            out_idx = (oy * out_w + ox) * 4
            out[out_idx] = sr // block
            out[out_idx + 1] = sg // block
            out[out_idx + 2] = sb // block
            out[out_idx + 3] = sa // block
    return out


def write_png(path: str, buf: bytearray, width: int = OUT_SIZE, height: int = OUT_SIZE) -> None:
    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    raw = bytearray()
    stride = width * 4
    for yy in range(height):
        raw.append(0)  # filter type 0
        raw.extend(buf[yy * stride : (yy + 1) * stride])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)


@dataclass(frozen=True)
class Theme:
    accent: Rgb
    outer_top: Rgb
    outer_bottom: Rgb
    inner_top: Rgb
    inner_bottom: Rgb
    glow: Rgb


def build_theme(accent: Rgb) -> Theme:
    return Theme(
        accent=accent,
        outer_top=rgb_mix((30, 38, 62), accent, 0.16),
        outer_bottom=rgb_mix((8, 12, 24), accent, 0.08),
        inner_top=rgb_mix(accent, (255, 255, 255), 0.22),
        inner_bottom=rgb_mix(accent, (0, 0, 0), 0.40),
        glow=rgb_mix(accent, (255, 255, 255), 0.45),
    )


def star_points(cx: float, cy: float, outer_r: float, inner_r: float, points: int = 5) -> List[Point]:
    out: List[Point] = []
    step = math.pi / points
    start = -math.pi / 2.0
    for i in range(points * 2):
        r = outer_r if i % 2 == 0 else inner_r
        a = start + i * step
        out.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return out


def draw_badge_base(buf: bytearray, theme: Theme) -> Dict[str, float]:
    s = SUPERSAMPLE
    x = 48 * s
    y = 34 * s
    w = 416 * s
    h = 444 * s
    r = 86 * s

    draw_rr_solid(buf, x + 10 * s, y + 14 * s, w, h, r, (0, 0, 0, 68))
    draw_rr_solid(buf, x + 14 * s, y + 18 * s, w, h, r, (0, 0, 0, 34))

    draw_rr_vgradient(buf, x, y, w, h, r, rgba(theme.outer_top), rgba(theme.outer_bottom))
    draw_rr_vgradient(
        buf,
        x + 10 * s,
        y + 10 * s,
        w - 20 * s,
        h - 20 * s,
        r - 10 * s,
        rgba(theme.inner_top),
        rgba(theme.inner_bottom),
    )

    cx = x + w * 0.5
    cy = y + h * 0.48
    draw_radial_glow(buf, cx, cy, 162 * s, rgba(theme.glow, 90))
    draw_rr_vgradient(
        buf,
        x + 18 * s,
        y + 20 * s,
        w - 36 * s,
        h * 0.38,
        r - 18 * s,
        (255, 255, 255, 86),
        (255, 255, 255, 0),
    )
    draw_rr_vgradient(
        buf,
        x + 14 * s,
        y + h * 0.56,
        w - 28 * s,
        h * 0.34,
        r - 14 * s,
        (0, 0, 0, 0),
        (0, 0, 0, 78),
    )

    for px, py in ((x + 74 * s, y + 88 * s), (x + w - 88 * s, y + 108 * s), (x + w - 68 * s, y + h - 100 * s)):
        draw_circle(buf, px, py, 8 * s, (255, 255, 255, 80))

    return {"x": x, "y": y, "w": w, "h": h, "r": r, "cx": cx, "cy": cy}


def paint_10(buf: bytearray, theme: Theme, panel: Dict[str, float]) -> None:
    s = SUPERSAMPLE
    d = 7 * s
    main = (248, 236, 184, 255)
    stroke = (156, 118, 44, 255)
    shadow = (0, 0, 0, 138)
    hole = rgba(darken(theme.inner_bottom, 0.28))

    draw_rect(buf, 146 * s + d, 122 * s + d, 198 * s + d, 376 * s + d, shadow)
    draw_circle(buf, 306 * s + d, 246 * s + d, 93 * s, shadow)

    draw_rect(buf, 146 * s, 122 * s, 198 * s, 376 * s, stroke)
    draw_rect(buf, 130 * s, 140 * s, 194 * s, 182 * s, stroke)
    draw_circle(buf, 306 * s, 246 * s, 93 * s, stroke)

    draw_rect(buf, 154 * s, 130 * s, 190 * s, 368 * s, main)
    draw_rect(buf, 138 * s, 148 * s, 186 * s, 174 * s, main)
    draw_circle(buf, 306 * s, 246 * s, 82 * s, main)
    draw_circle(buf, 306 * s, 246 * s, 45 * s, hole)
    draw_circle(buf, 280 * s, 220 * s, 22 * s, (255, 255, 255, 96))


def paint_j(buf: bytearray, theme: Theme, panel: Dict[str, float]) -> None:
    s = SUPERSAMPLE
    d = 7 * s
    main = (227, 242, 255, 255)
    stroke = (86, 127, 201, 255)
    shadow = (0, 0, 0, 136)
    hole = rgba(darken(theme.inner_bottom, 0.24))

    draw_rect(buf, 286 * s + d, 118 * s + d, 344 * s + d, 320 * s + d, shadow)
    draw_rect(buf, 206 * s + d, 300 * s + d, 344 * s + d, 354 * s + d, shadow)
    draw_circle(buf, 218 * s + d, 300 * s + d, 57 * s, shadow)

    draw_rect(buf, 286 * s, 118 * s, 344 * s, 320 * s, stroke)
    draw_rect(buf, 206 * s, 300 * s, 344 * s, 354 * s, stroke)
    draw_circle(buf, 218 * s, 300 * s, 57 * s, stroke)

    draw_rect(buf, 295 * s, 127 * s, 335 * s, 312 * s, main)
    draw_rect(buf, 215 * s, 309 * s, 335 * s, 345 * s, main)
    draw_circle(buf, 218 * s, 300 * s, 46 * s, main)
    draw_circle(buf, 218 * s, 300 * s, 26 * s, hole)
    draw_circle(buf, 244 * s, 228 * s, 24 * s, (255, 255, 255, 96))


def paint_q(buf: bytearray, theme: Theme, panel: Dict[str, float]) -> None:
    s = SUPERSAMPLE
    d = 7 * s
    main = (248, 218, 114, 255)
    stroke = (168, 112, 34, 255)
    shadow = (0, 0, 0, 138)
    hole = rgba(darken(theme.inner_bottom, 0.24))

    draw_circle(buf, 256 * s + d, 232 * s + d, 100 * s, shadow)
    tail_shadow = [(300 + 7, 300 + 7), (378 + 7, 388 + 7), (334 + 7, 410 + 7), (258 + 7, 324 + 7)]
    draw_polygon(buf, [(x * s, y * s) for x, y in tail_shadow], shadow)

    draw_circle(buf, 256 * s, 232 * s, 100 * s, stroke)
    tail_stroke = [(300, 300), (378, 388), (334, 410), (258, 324)]
    draw_polygon(buf, [(x * s, y * s) for x, y in tail_stroke], stroke)

    draw_circle(buf, 256 * s, 232 * s, 88 * s, main)
    draw_circle(buf, 256 * s, 232 * s, 49 * s, hole)
    tail_main = [(304, 304), (366, 380), (336, 394), (274, 318)]
    draw_polygon(buf, [(x * s, y * s) for x, y in tail_main], main)
    draw_circle(buf, 228 * s, 204 * s, 22 * s, (255, 255, 255, 96))


def paint_k(buf: bytearray, theme: Theme, panel: Dict[str, float]) -> None:
    s = SUPERSAMPLE
    d = 7 * s
    main = (255, 236, 244, 255)
    stroke = (171, 88, 123, 255)
    shadow = (0, 0, 0, 142)

    draw_rect(buf, 148 * s + d, 116 * s + d, 206 * s + d, 390 * s + d, shadow)
    upper_shadow = [(210 + 7, 252 + 7), (368 + 7, 112 + 7), (398 + 7, 152 + 7), (252 + 7, 290 + 7)]
    lower_shadow = [(208 + 7, 248 + 7), (398 + 7, 390 + 7), (360 + 7, 430 + 7), (250 + 7, 296 + 7)]
    draw_polygon(buf, [(x * s, y * s) for x, y in upper_shadow], shadow)
    draw_polygon(buf, [(x * s, y * s) for x, y in lower_shadow], shadow)

    draw_rect(buf, 148 * s, 116 * s, 206 * s, 390 * s, stroke)
    upper_stroke = [(210, 252), (368, 112), (398, 152), (252, 290)]
    lower_stroke = [(208, 248), (398, 390), (360, 430), (250, 296)]
    draw_polygon(buf, [(x * s, y * s) for x, y in upper_stroke], stroke)
    draw_polygon(buf, [(x * s, y * s) for x, y in lower_stroke], stroke)

    draw_rect(buf, 157 * s, 125 * s, 197 * s, 381 * s, main)
    upper_main = [(220, 252), (358, 128), (382, 160), (258, 278)]
    lower_main = [(218, 258), (382, 382), (352, 414), (258, 298)]
    draw_polygon(buf, [(x * s, y * s) for x, y in upper_main], main)
    draw_polygon(buf, [(x * s, y * s) for x, y in lower_main], main)
    draw_circle(buf, 238 * s, 194 * s, 22 * s, (255, 255, 255, 88))


def paint_a(buf: bytearray, theme: Theme, panel: Dict[str, float]) -> None:
    s = SUPERSAMPLE
    d = 7 * s
    main = (255, 240, 216, 255)
    stroke = (183, 122, 52, 255)
    shadow = (0, 0, 0, 140)
    hole = rgba(darken(theme.inner_bottom, 0.24))

    outer_shadow = [(256 + 7, 98 + 7), (378 + 7, 394 + 7), (134 + 7, 394 + 7)]
    draw_polygon(buf, [(x * s, y * s) for x, y in outer_shadow], shadow)

    outer_stroke = [(256, 98), (378, 394), (134, 394)]
    inner_stroke = [(256, 176), (320, 338), (192, 338)]
    draw_polygon(buf, [(x * s, y * s) for x, y in outer_stroke], stroke)
    draw_polygon(buf, [(x * s, y * s) for x, y in inner_stroke], hole)
    draw_rect(buf, 186 * s, 262 * s, 326 * s, 306 * s, stroke)

    outer_main = [(256, 112), (364, 384), (148, 384)]
    inner_main = [(256, 190), (308, 332), (204, 332)]
    draw_polygon(buf, [(x * s, y * s) for x, y in outer_main], main)
    draw_polygon(buf, [(x * s, y * s) for x, y in inner_main], hole)
    draw_rect(buf, 194 * s, 270 * s, 318 * s, 298 * s, main)
    draw_circle(buf, 248 * s, 182 * s, 21 * s, (255, 255, 255, 88))


def paint_star(buf: bytearray, theme: Theme, panel: Dict[str, float]) -> None:
    s = SUPERSAMPLE
    cx = 256 * s
    cy = 236 * s
    d = 7 * s
    shadow = (0, 0, 0, 146)
    stroke = (174, 126, 26, 255)
    main = (254, 224, 120, 255)
    inner = (255, 243, 187, 255)

    draw_circle(buf, cx, cy, 126 * s, rgba(lighten(theme.accent, 0.35), 72))
    draw_circle(buf, cx + d, cy + d, 92 * s, shadow)

    p_shadow = star_points(cx + d, cy + d, 118 * s, 49 * s)
    p_stroke = star_points(cx, cy, 118 * s, 49 * s)
    p_main = star_points(cx, cy, 108 * s, 44 * s)
    p_inner = star_points(cx, cy, 62 * s, 25 * s)

    draw_polygon(buf, p_shadow, shadow)
    draw_polygon(buf, p_stroke, stroke)
    draw_polygon(buf, p_main, main)
    draw_polygon(buf, p_inner, inner)
    draw_circle(buf, (cx - 28 * s), (cy - 30 * s), 20 * s, (255, 255, 255, 108))


def paint_scatter(buf: bytearray, theme: Theme, panel: Dict[str, float]) -> None:
    s = SUPERSAMPLE
    shadow = (0, 0, 0, 136)
    gem_a = (129, 241, 255, 255)
    gem_b = (76, 220, 252, 255)
    gem_c = (40, 188, 226, 255)
    gem_outline = (18, 112, 148, 255)

    gems = [
        (200, 292, 70, gem_b),
        (286, 220, 76, gem_a),
        (334, 318, 66, gem_c),
    ]
    for cx, cy, r, col in gems:
        draw_circle(buf, (cx + 7) * s, (cy + 7) * s, r * s, shadow)
        draw_circle(buf, cx * s, cy * s, r * s, gem_outline)
        draw_circle(buf, cx * s, cy * s, (r - 8) * s, col)
        draw_circle(buf, (cx - r * 0.28) * s, (cy - r * 0.30) * s, (r * 0.26) * s, (255, 255, 255, 105))

        facet = [
            ((cx - r * 0.40), (cy - r * 0.06)),
            ((cx + r * 0.02), (cy - r * 0.42)),
            ((cx + r * 0.34), (cy + r * 0.00)),
            ((cx - r * 0.02), (cy + r * 0.34)),
        ]
        draw_polygon(buf, [(x * s, y * s) for x, y in facet], (255, 255, 255, 64))

    for sx, sy, size in ((122, 146, 20), (372, 142, 18), (394, 386, 16)):
        draw_rect(buf, (sx - size) * s, (sy - 2) * s, (sx + size) * s, (sy + 2) * s, (255, 255, 255, 165))
        draw_rect(buf, (sx - 2) * s, (sy - size) * s, (sx + 2) * s, (sy + size) * s, (255, 255, 255, 165))


def paint_wild(buf: bytearray, theme: Theme, panel: Dict[str, float]) -> None:
    s = SUPERSAMPLE
    fill = (255, 247, 228, 255)
    stroke = (201, 110, 194, 255)
    shadow = (0, 0, 0, 144)
    hole = rgba(darken(theme.inner_bottom, 0.22))

    w_shadow = [
        (98 + 7, 142 + 7),
        (142 + 7, 382 + 7),
        (184 + 7, 236 + 7),
        (224 + 7, 382 + 7),
        (268 + 7, 142 + 7),
        (230 + 7, 142 + 7),
        (184 + 7, 316 + 7),
        (138 + 7, 142 + 7),
    ]
    w_stroke = [(98, 142), (142, 382), (184, 236), (224, 382), (268, 142), (230, 142), (184, 316), (138, 142)]
    w_main = [(110, 154), (146, 368), (184, 252), (220, 368), (256, 154), (228, 154), (184, 300), (140, 154)]

    draw_polygon(buf, [(x * s, y * s) for x, y in w_shadow], shadow)
    draw_polygon(buf, [(x * s, y * s) for x, y in w_stroke], stroke)
    draw_polygon(buf, [(x * s, y * s) for x, y in w_main], fill)

    draw_rect(buf, (280 + 7) * s, (142 + 7) * s, (322 + 7) * s, (382 + 7) * s, shadow)
    draw_rect(buf, 280 * s, 142 * s, 322 * s, 382 * s, stroke)
    draw_rect(buf, 288 * s, 150 * s, 314 * s, 374 * s, fill)

    draw_rect(buf, (338 + 7) * s, (142 + 7) * s, (380 + 7) * s, (382 + 7) * s, shadow)
    draw_rect(buf, 338 * s, 142 * s, 380 * s, 382 * s, stroke)
    draw_rect(buf, 346 * s, 150 * s, 372 * s, 374 * s, fill)
    draw_rect(buf, 346 * s, 340 * s, 408 * s, 374 * s, fill)

    draw_rect(buf, (360 + 7) * s, (142 + 7) * s, (394 + 7) * s, (382 + 7) * s, shadow)
    draw_rect(buf, 360 * s, 142 * s, 394 * s, 382 * s, stroke)
    draw_rect(buf, 367 * s, 150 * s, 387 * s, 374 * s, fill)
    draw_circle(buf, 392 * s, 262 * s, 70 * s, stroke)
    draw_circle(buf, 392 * s, 262 * s, 61 * s, fill)
    draw_circle(buf, 392 * s, 262 * s, 34 * s, hole)

    bolt = [(246, 134), (214, 220), (252, 220), (216, 326), (298, 212), (258, 212), (288, 134)]
    draw_polygon(buf, [(x * s, y * s) for x, y in bolt], (255, 216, 90, 220))


def paint_symbol(accent: Rgb, glyph: str) -> bytearray:
    buf = new_buffer()
    theme = build_theme(accent)
    panel = draw_badge_base(buf, theme)

    if glyph == "10":
        paint_10(buf, theme, panel)
    elif glyph == "J":
        paint_j(buf, theme, panel)
    elif glyph == "Q":
        paint_q(buf, theme, panel)
    elif glyph == "K":
        paint_k(buf, theme, panel)
    elif glyph == "A":
        paint_a(buf, theme, panel)
    elif glyph == "STAR":
        paint_star(buf, theme, panel)
    elif glyph == "SCATTER":
        paint_scatter(buf, theme, panel)
    elif glyph == "WILD":
        paint_wild(buf, theme, panel)
    else:
        raise ValueError(f"Unknown glyph {glyph}")

    return downsample(buf, WIDTH, HEIGHT, SUPERSAMPLE)


PAINTERS = {
    "10.png": ((74, 222, 128), "10"),
    "j.png": ((96, 165, 250), "J"),
    "q.png": ((167, 139, 250), "Q"),
    "k.png": ((244, 114, 182), "K"),
    "a.png": ((251, 191, 36), "A"),
    "star.png": ((245, 158, 11), "STAR"),
    "scatter.png": ((34, 211, 238), "SCATTER"),
    "wild.png": ((232, 121, 249), "WILD"),
}


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for filename, (accent, glyph) in PAINTERS.items():
        path = os.path.abspath(os.path.join(OUT_DIR, filename))
        png = paint_symbol(accent, glyph)
        write_png(path, png, OUT_SIZE, OUT_SIZE)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
