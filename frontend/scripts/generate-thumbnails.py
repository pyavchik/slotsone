#!/usr/bin/env python3
"""Generate unique casino game thumbnail SVGs and convert to PNG."""

import os
import math

try:
    import cairosvg
except ImportError:
    print("Installing cairosvg...")
    os.system("pip3 install cairosvg")
    import cairosvg

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'games')
os.makedirs(OUT_DIR, exist_ok=True)

# ── Game theme definitions ──────────────────────────────────────────

GAMES = [
    # Slots
    {
        "slug": "book-of-dead",
        "title": "BOOK OF\nDEAD",
        "bg1": "#1a0e05", "bg2": "#2d1a08", "bg3": "#0d0702",
        "accent": "#d4a13a", "accent2": "#e8c468",
        "glow": "#d4a13a", "glow_op": "0.3",
        "tagline": "ANCIENT TREASURES",
        "elements": "egyptian",
    },
    {
        "slug": "sweet-bonanza",
        "title": "SWEET\nBONANZA",
        "bg1": "#2a0a2e", "bg2": "#1a0520", "bg3": "#0d0210",
        "accent": "#ff69b4", "accent2": "#ff9ed8",
        "glow": "#ff69b4", "glow_op": "0.25",
        "tagline": "SUGAR RUSH",
        "elements": "candy",
    },
    {
        "slug": "gates-of-olympus",
        "title": "GATES OF\nOLYMPUS",
        "bg1": "#0a1028", "bg2": "#1a2050", "bg3": "#050818",
        "accent": "#7b9bff", "accent2": "#b0c4ff",
        "glow": "#7b9bff", "glow_op": "0.3",
        "tagline": "DIVINE POWER",
        "elements": "greek",
    },
    {
        "slug": "starburst",
        "title": "STAR\nBURST",
        "bg1": "#0a0028", "bg2": "#150045", "bg3": "#050015",
        "accent": "#a855f7", "accent2": "#d8b4fe",
        "glow": "#a855f7", "glow_op": "0.35",
        "tagline": "COSMIC GEMS",
        "elements": "space",
    },
    {
        "slug": "gonzos-quest",
        "title": "GONZO'S\nQUEST",
        "bg1": "#0a1a0a", "bg2": "#1a3018", "bg3": "#050d05",
        "accent": "#4ade80", "accent2": "#86efac",
        "glow": "#4ade80", "glow_op": "0.25",
        "tagline": "JUNGLE ADVENTURE",
        "elements": "jungle",
    },
    {
        "slug": "dead-or-alive-2",
        "title": "DEAD OR\nALIVE 2",
        "bg1": "#1a1008", "bg2": "#2a1c0c", "bg3": "#0d0804",
        "accent": "#ef4444", "accent2": "#fca5a5",
        "glow": "#ef4444", "glow_op": "0.25",
        "tagline": "WILD WEST",
        "elements": "western",
    },
    {
        "slug": "reactoonz",
        "title": "REACT\nOONZ",
        "bg1": "#0a0a2a", "bg2": "#14143c", "bg3": "#050518",
        "accent": "#f472b6", "accent2": "#fbcfe8",
        "glow": "#f472b6", "glow_op": "0.3",
        "tagline": "ALIEN INVASION",
        "elements": "alien",
    },
    {
        "slug": "jammin-jars",
        "title": "JAMMIN'\nJARS",
        "bg1": "#1a0528", "bg2": "#280a3c", "bg3": "#0d0218",
        "accent": "#f59e0b", "accent2": "#fcd34d",
        "glow": "#f59e0b", "glow_op": "0.3",
        "tagline": "FRUITY BEATS",
        "elements": "music",
    },
    {
        "slug": "big-bass-bonanza",
        "title": "BIG BASS\nBONANZA",
        "bg1": "#051a2a", "bg2": "#0a2840", "bg3": "#020d18",
        "accent": "#22d3ee", "accent2": "#a5f3fc",
        "glow": "#22d3ee", "glow_op": "0.25",
        "tagline": "GONE FISHING",
        "elements": "water",
    },
    {
        "slug": "wolf-gold",
        "title": "WOLF\nGOLD",
        "bg1": "#1a1005", "bg2": "#28200a", "bg3": "#0d0802",
        "accent": "#f6be57", "accent2": "#ffd98a",
        "glow": "#f6be57", "glow_op": "0.3",
        "tagline": "WILD FORTUNE",
        "elements": "moon",
    },
    {
        "slug": "fire-joker",
        "title": "FIRE\nJOKER",
        "bg1": "#1a0505", "bg2": "#2a0a0a", "bg3": "#0d0202",
        "accent": "#ef4444", "accent2": "#f97316",
        "glow": "#f97316", "glow_op": "0.3",
        "tagline": "CLASSIC FLAMES",
        "elements": "fire",
    },
    # Roulette
    {
        "slug": "european-roulette",
        "title": "EUROPEAN\nROULETTE",
        "bg1": "#0a1a0a", "bg2": "#0d280d", "bg3": "#050d05",
        "accent": "#22c55e", "accent2": "#86efac",
        "glow": "#22c55e", "glow_op": "0.25",
        "tagline": "SINGLE ZERO",
        "elements": "roulette",
    },
    {
        "slug": "american-roulette",
        "title": "AMERICAN\nROULETTE",
        "bg1": "#1a0a0a", "bg2": "#280d0d", "bg3": "#0d0505",
        "accent": "#ef4444", "accent2": "#fca5a5",
        "glow": "#ef4444", "glow_op": "0.25",
        "tagline": "DOUBLE ZERO",
        "elements": "roulette",
    },
    {
        "slug": "french-roulette",
        "title": "FRENCH\nROULETTE",
        "bg1": "#0a0a1a", "bg2": "#141428", "bg3": "#05050d",
        "accent": "#818cf8", "accent2": "#c7d2fe",
        "glow": "#818cf8", "glow_op": "0.25",
        "tagline": "LA PARTAGE",
        "elements": "roulette",
    },
    {
        "slug": "lightning-roulette",
        "title": "LIGHTNING\nROULETTE",
        "bg1": "#0d0520", "bg2": "#1a0a38", "bg3": "#060210",
        "accent": "#facc15", "accent2": "#fef08a",
        "glow": "#facc15", "glow_op": "0.35",
        "tagline": "ELECTRIFYING",
        "elements": "lightning",
    },
    {
        "slug": "vip-roulette",
        "title": "VIP\nROULETTE",
        "bg1": "#0d0a1a", "bg2": "#1a1430", "bg3": "#06050d",
        "accent": "#f6be57", "accent2": "#ffd98a",
        "glow": "#f6be57", "glow_op": "0.3",
        "tagline": "HIGH ROLLER",
        "elements": "roulette",
    },
    {
        "slug": "speed-roulette",
        "title": "SPEED\nROULETTE",
        "bg1": "#1a0508", "bg2": "#280a10", "bg3": "#0d0204",
        "accent": "#f43f5e", "accent2": "#fda4af",
        "glow": "#f43f5e", "glow_op": "0.3",
        "tagline": "25 SECOND ROUNDS",
        "elements": "roulette",
    },
    # Blackjack
    {
        "slug": "classic-blackjack",
        "title": "CLASSIC\nBLACKJACK",
        "bg1": "#0a1a0a", "bg2": "#0f280f", "bg3": "#050d05",
        "accent": "#22c55e", "accent2": "#4ade80",
        "glow": "#22c55e", "glow_op": "0.25",
        "tagline": "TWENTY ONE",
        "elements": "cards",
    },
    {
        "slug": "vip-blackjack",
        "title": "VIP\nBLACKJACK",
        "bg1": "#0d0a1a", "bg2": "#1a1430", "bg3": "#06050d",
        "accent": "#f6be57", "accent2": "#ffd98a",
        "glow": "#f6be57", "glow_op": "0.3",
        "tagline": "EXCLUSIVE TABLE",
        "elements": "cards",
    },
    {
        "slug": "infinite-blackjack",
        "title": "INFINITE\nBLACKJACK",
        "bg1": "#05101a", "bg2": "#0a1a2a", "bg3": "#020810",
        "accent": "#62d7ff", "accent2": "#a8edff",
        "glow": "#62d7ff", "glow_op": "0.3",
        "tagline": "UNLIMITED SEATS",
        "elements": "cards",
    },
    {
        "slug": "multi-hand-blackjack",
        "title": "MULTI-HAND\nBLACKJACK",
        "bg1": "#100a1a", "bg2": "#1a1028", "bg3": "#08050d",
        "accent": "#c084fc", "accent2": "#e9d5ff",
        "glow": "#c084fc", "glow_op": "0.25",
        "tagline": "PLAY 5 HANDS",
        "elements": "cards",
    },
    {
        "slug": "perfect-pairs-blackjack",
        "title": "PERFECT\nPAIRS",
        "bg1": "#1a0a0f", "bg2": "#28101a", "bg3": "#0d0508",
        "accent": "#fb7185", "accent2": "#fecdd3",
        "glow": "#fb7185", "glow_op": "0.25",
        "tagline": "SIDE BET BONUS",
        "elements": "cards",
    },
    # Baccarat
    {
        "slug": "classic-baccarat",
        "title": "CLASSIC\nBACCARAT",
        "bg1": "#0d0a1a", "bg2": "#1a1430", "bg3": "#06050d",
        "accent": "#c084fc", "accent2": "#e9d5ff",
        "glow": "#c084fc", "glow_op": "0.25",
        "tagline": "PUNTO BANCO",
        "elements": "baccarat",
    },
    {
        "slug": "speed-baccarat",
        "title": "SPEED\nBACCARAT",
        "bg1": "#1a050a", "bg2": "#280a14", "bg3": "#0d0205",
        "accent": "#f43f5e", "accent2": "#fda4af",
        "glow": "#f43f5e", "glow_op": "0.3",
        "tagline": "FAST PLAY",
        "elements": "baccarat",
    },
    {
        "slug": "vip-baccarat",
        "title": "VIP\nBACCARAT",
        "bg1": "#0d0a05", "bg2": "#1a1408", "bg3": "#060502",
        "accent": "#f6be57", "accent2": "#ffd98a",
        "glow": "#f6be57", "glow_op": "0.3",
        "tagline": "HIGH STAKES",
        "elements": "baccarat",
    },
    {
        "slug": "squeeze-baccarat",
        "title": "SQUEEZE\nBACCARAT",
        "bg1": "#050d1a", "bg2": "#0a1a2a", "bg3": "#020810",
        "accent": "#38bdf8", "accent2": "#bae6fd",
        "glow": "#38bdf8", "glow_op": "0.25",
        "tagline": "REVEAL THE CARDS",
        "elements": "baccarat",
    },
    {
        "slug": "no-commission-baccarat",
        "title": "NO COMM\nBACCARAT",
        "bg1": "#0a1a10", "bg2": "#0f2818", "bg3": "#050d08",
        "accent": "#34d399", "accent2": "#a7f3d0",
        "glow": "#34d399", "glow_op": "0.25",
        "tagline": "ZERO COMMISSION",
        "elements": "baccarat",
    },
]


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def decorative_elements(elem_type, accent, accent2):
    """Generate category-specific decorative SVG elements."""
    r, g, b = hex_to_rgb(accent)

    if elem_type == "egyptian":
        return f'''
    <g opacity="0.2" stroke="{accent}" stroke-width="1.5" fill="none">
      <polygon points="400,80 340,220 460,220"/>
      <polygon points="400,95 352,210 448,210"/>
      <line x1="370" y1="440" x2="370" y2="520"/>
      <line x1="430" y1="440" x2="430" y2="520"/>
      <circle cx="400" cy="460" r="20"/>
      <line x1="380" y1="460" x2="420" y2="460"/>
    </g>
    <g opacity="0.15" fill="{accent}">
      <polygon points="150,400 165,440 135,440"/>
      <polygon points="650,380 665,420 635,420"/>
      <rect x="180" y="480" width="40" height="3" rx="1"/>
      <rect x="580" y="460" width="40" height="3" rx="1"/>
    </g>'''

    elif elem_type == "candy":
        return f'''
    <g opacity="0.3">
      <circle cx="180" cy="180" r="25" fill="#ff69b4" opacity="0.4"/>
      <circle cx="620" cy="160" r="20" fill="#a855f7" opacity="0.35"/>
      <circle cx="150" cy="420" r="18" fill="#f59e0b" opacity="0.4"/>
      <circle cx="660" cy="440" r="22" fill="#22d3ee" opacity="0.35"/>
      <circle cx="300" cy="500" r="15" fill="#4ade80" opacity="0.3"/>
      <circle cx="520" cy="120" r="16" fill="#fb7185" opacity="0.35"/>
      <rect x="240" y="140" width="30" height="12" rx="6" fill="#fbbf24" opacity="0.3"/>
      <rect x="530" y="460" width="25" height="10" rx="5" fill="#c084fc" opacity="0.3"/>
    </g>'''

    elif elem_type == "greek":
        return f'''
    <g opacity="0.15" stroke="{accent}" stroke-width="1.5" fill="none">
      <rect x="120" y="160" width="60" height="90" rx="2"/>
      <line x1="130" y1="160" x2="130" y2="250"/>
      <line x1="150" y1="160" x2="150" y2="250"/>
      <line x1="170" y1="160" x2="170" y2="250"/>
      <rect x="115" y="150" width="70" height="12" rx="2"/>
      <rect x="620" y="180" width="60" height="90" rx="2"/>
      <line x1="630" y1="180" x2="630" y2="270"/>
      <line x1="650" y1="180" x2="650" y2="270"/>
      <line x1="670" y1="180" x2="670" y2="270"/>
      <rect x="615" y="170" width="70" height="12" rx="2"/>
    </g>
    <g opacity="0.12" fill="{accent}">
      <polygon points="400,90 385,120 415,120"/>
      <circle cx="400" cy="105" r="8" fill="none" stroke="{accent}" stroke-width="1"/>
    </g>'''

    elif elem_type == "space":
        stars = ""
        for i in range(30):
            x = (i * 137 + 50) % 760 + 20
            y = (i * 89 + 30) % 560 + 20
            r = 1 + (i % 3) * 0.5
            op = 0.3 + (i % 5) * 0.1
            stars += f'<circle cx="{x}" cy="{y}" r="{r}" opacity="{op}"/>'
        return f'''
    <g fill="#ffffff">{stars}</g>
    <g opacity="0.25">
      <polygon points="200,180 208,200 228,200 212,212 218,232 200,220 182,232 188,212 172,200 192,200" fill="{accent}" opacity="0.5"/>
      <polygon points="600,150 606,165 620,165 608,174 612,188 600,179 588,188 592,174 580,165 594,165" fill="{accent2}" opacity="0.4"/>
    </g>'''

    elif elem_type == "jungle":
        return f'''
    <g opacity="0.15" stroke="{accent}" stroke-width="1.5" fill="none">
      <path d="M 80,600 Q 100,400 80,300 Q 60,200 100,100"/>
      <path d="M 100,300 Q 140,280 160,250"/>
      <path d="M 80,400 Q 40,380 20,350"/>
      <path d="M 720,600 Q 700,400 720,300 Q 740,200 700,100"/>
      <path d="M 700,350 Q 660,330 640,300"/>
      <path d="M 720,400 Q 760,380 780,350"/>
    </g>
    <g opacity="0.2" fill="{accent}">
      <ellipse cx="130" cy="240" rx="30" ry="8" transform="rotate(-30 130 240)"/>
      <ellipse cx="60" cy="340" rx="25" ry="7" transform="rotate(20 60 340)"/>
      <ellipse cx="670" cy="280" rx="28" ry="7" transform="rotate(25 670 280)"/>
      <ellipse cx="740" cy="340" rx="22" ry="6" transform="rotate(-15 740 340)"/>
    </g>'''

    elif elem_type == "western":
        return f'''
    <g opacity="0.15" stroke="{accent}" stroke-width="1.5" fill="none">
      <polygon points="400,80 410,110 440,110 416,128 424,158 400,140 376,158 384,128 360,110 390,110" />
      <circle cx="150" cy="300" r="30"/>
      <circle cx="150" cy="300" r="12"/>
      <circle cx="650" cy="320" r="30"/>
      <circle cx="650" cy="320" r="12"/>
    </g>
    <g opacity="0.12" fill="{accent}">
      <rect x="350" y="470" width="100" height="4" rx="2"/>
      <rect x="370" y="480" width="60" height="3" rx="1"/>
    </g>'''

    elif elem_type == "alien":
        return f'''
    <g opacity="0.25">
      <circle cx="180" cy="200" r="30" fill="{accent}" opacity="0.2"/>
      <circle cx="180" cy="190" r="8" fill="{accent2}" opacity="0.5"/>
      <circle cx="168" cy="186" r="4" fill="#ffffff" opacity="0.6"/>
      <circle cx="192" cy="186" r="4" fill="#ffffff" opacity="0.6"/>
      <circle cx="620" cy="180" r="25" fill="{accent}" opacity="0.2"/>
      <circle cx="620" cy="172" r="7" fill="{accent2}" opacity="0.5"/>
      <circle cx="610" cy="168" r="3.5" fill="#ffffff" opacity="0.6"/>
      <circle cx="630" cy="168" r="3.5" fill="#ffffff" opacity="0.6"/>
    </g>
    <g opacity="0.15" fill="{accent}">
      <circle cx="300" cy="480" r="12"/>
      <circle cx="500" cy="460" r="10"/>
      <circle cx="150" cy="430" r="8"/>
      <circle cx="650" cy="450" r="9"/>
    </g>'''

    elif elem_type == "music":
        return f'''
    <g opacity="0.2" fill="{accent}">
      <circle cx="160" cy="350" r="14"/>
      <rect x="172" y="280" width="4" height="72"/>
      <path d="M 176,280 Q 200,270 200,290" fill="none" stroke="{accent}" stroke-width="3"/>
      <circle cx="640" cy="370" r="14"/>
      <rect x="652" y="300" width="4" height="72"/>
      <path d="M 656,300 Q 680,290 680,310" fill="none" stroke="{accent}" stroke-width="3"/>
    </g>
    <g opacity="0.25">
      <circle cx="250" cy="160" r="20" fill="{accent}" opacity="0.3"/>
      <circle cx="550" cy="140" r="18" fill="{accent2}" opacity="0.25"/>
      <circle cx="200" cy="480" r="22" fill="{accent}" opacity="0.2"/>
      <circle cx="600" cy="490" r="16" fill="{accent2}" opacity="0.2"/>
    </g>'''

    elif elem_type == "water":
        return f'''
    <g opacity="0.15" fill="none" stroke="{accent}" stroke-width="1.5">
      <path d="M 0,480 Q 100,460 200,480 Q 300,500 400,480 Q 500,460 600,480 Q 700,500 800,480"/>
      <path d="M 0,510 Q 100,490 200,510 Q 300,530 400,510 Q 500,490 600,510 Q 700,530 800,510"/>
      <path d="M 0,540 Q 100,520 200,540 Q 300,560 400,540 Q 500,520 600,540 Q 700,560 800,540"/>
    </g>
    <g opacity="0.2">
      <ellipse cx="200" cy="160" rx="40" ry="15" fill="{accent}" opacity="0.2" transform="rotate(-10 200 160)"/>
      <ellipse cx="600" cy="180" rx="35" ry="12" fill="{accent2}" opacity="0.15" transform="rotate(8 600 180)"/>
    </g>'''

    elif elem_type == "moon":
        return f'''
    <g opacity="0.2">
      <circle cx="620" cy="120" r="50" fill="{accent}" opacity="0.15"/>
      <circle cx="640" cy="110" r="50" fill="{hex_to_css(hex_to_rgb(accent), 0)}"/>
    </g>
    <g opacity="0.15" stroke="{accent}" stroke-width="1" fill="none">
      <path d="M 100,550 L 200,350 L 300,550"/>
      <path d="M 500,550 L 580,400 L 660,550"/>
      <path d="M 300,550 L 400,300 L 500,550"/>
    </g>'''

    elif elem_type == "fire":
        return f'''
    <g opacity="0.2">
      <path d="M 150,500 Q 160,400 140,350 Q 170,380 180,300 Q 190,380 200,350 Q 180,400 190,500 Z" fill="{accent}" opacity="0.3"/>
      <path d="M 600,500 Q 610,400 590,350 Q 620,380 630,300 Q 640,380 650,350 Q 630,400 640,500 Z" fill="{accent2}" opacity="0.25"/>
      <path d="M 350,520 Q 360,450 345,420 Q 370,440 375,380 Q 380,440 390,420 Q 375,450 385,520 Z" fill="{accent}" opacity="0.2"/>
      <path d="M 450,530 Q 455,470 445,440 Q 465,455 470,400 Q 475,455 480,440 Q 470,470 475,530 Z" fill="{accent2}" opacity="0.2"/>
    </g>'''

    elif elem_type == "roulette":
        # Roulette wheel segments
        cx, cy, r = 400, 300, 180
        segs = ""
        for i in range(12):
            angle = i * 30 * math.pi / 180
            x1 = cx + r * math.cos(angle)
            y1 = cy + r * math.sin(angle)
            x2 = cx + (r - 30) * math.cos(angle)
            y2 = cy + (r - 30) * math.sin(angle)
            segs += f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}"/>'
        return f'''
    <g opacity="0.08" stroke="{accent}" stroke-width="1.5" fill="none">
      <circle cx="400" cy="300" r="180"/>
      <circle cx="400" cy="300" r="150"/>
      <circle cx="400" cy="300" r="40"/>
      {segs}
    </g>
    <g opacity="0.15" fill="{accent}">
      <circle cx="400" cy="300" r="6"/>
    </g>'''

    elif elem_type == "lightning":
        return f'''
    <g opacity="0.25" fill="{accent}">
      <polygon points="350,80 320,260 370,260 330,420 420,220 370,220 400,80"/>
      <polygon points="550,100 530,220 560,220 535,340 600,190 565,190 580,100" opacity="0.5"/>
    </g>
    <g opacity="0.1" stroke="{accent}" stroke-width="1" fill="none">
      <circle cx="400" cy="300" r="180"/>
      <circle cx="400" cy="300" r="150"/>
    </g>'''

    elif elem_type == "cards":
        return f'''
    <g opacity="0.12" stroke="{accent}" stroke-width="1.5" fill="none">
      <rect x="120" y="200" width="80" height="110" rx="6" transform="rotate(-15 160 255)"/>
      <rect x="600" y="190" width="80" height="110" rx="6" transform="rotate(12 640 245)"/>
      <rect x="140" y="400" width="70" height="100" rx="5" transform="rotate(8 175 450)"/>
      <rect x="590" y="410" width="70" height="100" rx="5" transform="rotate(-10 625 460)"/>
    </g>
    <g opacity="0.2" fill="{accent}">
      <text x="148" y="265" font-family="serif" font-size="28" transform="rotate(-15 148 265)">A</text>
      <text x="628" y="255" font-family="serif" font-size="28" transform="rotate(12 628 255)">K</text>
    </g>'''

    elif elem_type == "baccarat":
        return f'''
    <g opacity="0.1" stroke="{accent}" stroke-width="1.5" fill="none">
      <ellipse cx="400" cy="500" rx="300" ry="80"/>
      <rect x="130" y="200" width="70" height="100" rx="5" transform="rotate(-8 165 250)"/>
      <rect x="600" y="210" width="70" height="100" rx="5" transform="rotate(10 635 260)"/>
    </g>
    <g opacity="0.2" fill="{accent}">
      <text x="153" y="262" font-family="serif" font-size="24" transform="rotate(-8 153 262)">9</text>
      <text x="623" y="272" font-family="serif" font-size="24" transform="rotate(10 623 272)">8</text>
      <circle cx="400" cy="500" r="4"/>
    </g>'''

    else:
        return ""


def hex_to_css(rgb, a=1):
    return f"rgba({rgb[0]},{rgb[1]},{rgb[2]},{a})"


def generate_svg(game):
    slug = game["slug"]
    lines = game["title"].split("\n")
    bg1, bg2, bg3 = game["bg1"], game["bg2"], game["bg3"]
    accent, accent2 = game["accent"], game["accent2"]
    glow, glow_op = game["glow"], game["glow_op"]
    tagline = game["tagline"]
    ar, ag, ab = hex_to_rgb(accent)

    # Title positioning
    if len(lines) == 2:
        line1_y, line2_y = 280, 350
        line1_size, line2_size = 78, 60
    else:
        line1_y = 310
        line1_size = 80
        line2_y, line2_size = 0, 0

    title_text = f'<text x="400" y="{line1_y}" font-family="Georgia,\'Times New Roman\',serif" font-weight="bold" font-size="{line1_size}" text-anchor="middle" letter-spacing="12" fill="url(#gold-metal-{slug})" filter="url(#text-glow-{slug})">{lines[0]}</text>'
    if len(lines) == 2:
        title_text += f'\n    <text x="400" y="{line2_y}" font-family="Georgia,\'Times New Roman\',serif" font-weight="bold" font-size="{line2_size}" text-anchor="middle" letter-spacing="16" fill="url(#gold-metal-{slug})" filter="url(#text-glow-{slug})">{lines[1]}</text>'

    elements = decorative_elements(game["elements"], accent, accent2)

    svg = f'''<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg-{slug}" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="{bg2}"/>
      <stop offset="60%" stop-color="{bg1}"/>
      <stop offset="100%" stop-color="{bg3}"/>
    </radialGradient>
    <radialGradient id="aura-{slug}" cx="50%" cy="48%" r="45%">
      <stop offset="0%" stop-color="{glow}" stop-opacity="{glow_op}"/>
      <stop offset="60%" stop-color="{glow}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="{glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold-metal-{slug}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{accent2}"/>
      <stop offset="25%" stop-color="{accent}"/>
      <stop offset="50%" stop-color="{accent2}"/>
      <stop offset="75%" stop-color="{accent}"/>
      <stop offset="100%" stop-color="{accent2}"/>
    </linearGradient>
    <linearGradient id="line-fade-{slug}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="{accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="{accent}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="{accent}" stop-opacity="0"/>
    </linearGradient>
    <filter id="text-glow-{slug}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="{ar/255:.2f} 0 0 0 0  0 {ag/255:.2f} 0 0 0  0 0 {ab/255:.2f} 0 0  0 0 0 0.5 0"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="800" height="600" fill="url(#bg-{slug})"/>

  <!-- Noise texture -->
  <rect width="800" height="600" opacity="0.03" fill="url(#bg-{slug})"/>

  <!-- Glow aura -->
  <ellipse cx="400" cy="290" rx="360" ry="220" fill="url(#aura-{slug})"/>

  <!-- Corner frames -->
  <g opacity="0.12" stroke="{accent}" stroke-width="1.2" fill="none">
    <path d="M 30,30 L 100,30 M 30,30 L 30,100"/>
    <path d="M 770,30 L 700,30 M 770,30 L 770,100"/>
    <path d="M 30,570 L 100,570 M 30,570 L 30,500"/>
    <path d="M 770,570 L 700,570 M 770,570 L 770,500"/>
  </g>

  <!-- Theme-specific decorations -->
  {elements}

  <!-- Accent lines -->
  <rect x="120" y="235" width="560" height="1" fill="url(#line-fade-{slug})" opacity="0.4"/>
  <rect x="120" y="385" width="560" height="1" fill="url(#line-fade-{slug})" opacity="0.4"/>

  <!-- Title -->
  {title_text}

  <!-- Tagline -->
  <text x="400" y="540" font-family="\'Trebuchet MS\',sans-serif" font-size="13" text-anchor="middle" letter-spacing="7" fill="{accent}" opacity="0.35">{tagline}</text>

  <!-- Sparkle dots -->
  <g fill="#ffffff" opacity="0.5">
    <circle cx="200" cy="235" r="2"/>
    <circle cx="600" cy="235" r="1.5"/>
    <circle cx="200" cy="385" r="1.5"/>
    <circle cx="600" cy="385" r="2"/>
  </g>
</svg>'''

    return svg


# ── Generate all ────────────────────────────────────────────────────

print(f"Generating {len(GAMES)} thumbnails...")

for game in GAMES:
    slug = game["slug"]
    svg_path = os.path.join(OUT_DIR, f"{slug}.svg")
    png_path = os.path.join(OUT_DIR, f"{slug}.png")

    svg = generate_svg(game)
    with open(svg_path, 'w') as f:
        f.write(svg)

    cairosvg.svg2png(bytestring=svg.encode('utf-8'), write_to=png_path,
                     output_width=800, output_height=600)
    size_kb = os.path.getsize(png_path) / 1024
    print(f"  {slug}.png ({size_kb:.0f} KB)")

# Clean up SVGs (keep PNGs only)
for game in GAMES:
    svg_path = os.path.join(OUT_DIR, f"{game['slug']}.svg")
    if os.path.exists(svg_path):
        os.remove(svg_path)

print(f"\nDone! {len(GAMES)} PNGs in {OUT_DIR}")
