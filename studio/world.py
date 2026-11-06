"""Bulutkent dünyası: özgün vektör arka planlar ve sahne nesneleri (prop).

Arka planlar 1920x1080 SVG'dir; ortam animasyonu için .cloud, .star, .wave, .sway sınıfları
taşır. Dikey (Shorts) kullanımda preserveAspectRatio slice ile ortadan kırpılır.
"""
from __future__ import annotations

import math
import random

BACKGROUNDS = {
    "meadow": "Bulutkent çayırı (güneşli tepe, çiçekler)",
    "forest": "Fısıltılı Orman (uzun ağaçlar, mantarlar)",
    "village": "Bulutkent meydanı (renkli evler, çeşme)",
    "home": "Pofi'nin evi (oda içi, pencere, halı)",
    "lake": "Gökkuşağı Gölü (su, sazlıklar, iskele)",
    "garden": "Tombi'nin bahçesi (sebzeler, çit)",
    "night": "Yıldızlı tepe (gece, ay, ateş böcekleri)",
    "bedroom": "Uyku odası (gece lambası, pencerede ay)",
}

COLORS = {
    "kırmızı": "#F44336", "turuncu": "#FF9800", "sarı": "#FFD600", "yeşil": "#43A047", "mavi": "#1E88E5",
    "mor": "#8E24AA", "pembe": "#EC407A", "kahverengi": "#8D6E63", "beyaz": "#FFFFFF", "siyah": "#263238",
}

PROPS = ["ball", "apple", "balloon", "star", "circle", "square", "triangle", "heart", "flower", "gift", "kite",
         "umbrella", "cake", "book", "number", "strawberry", "carrot", "leaf", "moon", "drum", "paintbrush", "basket"]


def _sky(top: str, bottom: str, gid: str) -> str:
    return (
        f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/>'
        f'<stop offset="1" stop-color="{bottom}"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#{gid})"/>'
    )


def _cloud(x: float, y: float, s: float, op: float = 1.0) -> str:
    return (
        f'<g class="cloud" transform="translate({x:.0f} {y:.0f}) scale({s:.2f})" opacity="{op}">'
        '<circle cx="0" cy="0" r="50" fill="#fff"/><circle cx="55" cy="-20" r="62" fill="#fff"/>'
        '<circle cx="115" cy="0" r="48" fill="#fff"/><rect x="0" y="0" width="115" height="45" fill="#fff"/></g>'
    )


def _tree(x: float, y: float, s: float, leaf: str = "#4CAF50", leaf2: str = "#66BB6A") -> str:
    return (
        f'<g class="sway" transform="translate({x:.0f} {y:.0f}) scale({s:.2f})">'
        '<rect x="-18" y="-160" width="36" height="160" rx="12" fill="#8D6E63"/>'
        f'<circle cx="0" cy="-210" r="95" fill="{leaf}"/><circle cx="-60" cy="-170" r="65" fill="{leaf2}"/>'
        f'<circle cx="60" cy="-175" r="70" fill="{leaf2}"/><circle cx="20" cy="-250" r="55" fill="{leaf2}" opacity=".8"/></g>'
    )


def _flower(x: float, y: float, color: str, s: float = 1) -> str:
    petals = "".join(
        f'<circle cx="{14*math.cos(a):.1f}" cy="{14*math.sin(a):.1f}" r="11" fill="{color}"/>'
        for a in [i * math.pi / 3 for i in range(6)]
    )
    return (
        f'<g transform="translate({x:.0f} {y:.0f}) scale({s:.2f})"><rect x="-3" y="0" width="6" height="40" fill="#388E3C"/>'
        f'<g transform="translate(0 -4)">{petals}<circle r="9" fill="#FFEB3B"/></g></g>'
    )


def _house(x: float, y: float, wall: str, roof: str, s: float = 1) -> str:
    return (
        f'<g transform="translate({x:.0f} {y:.0f}) scale({s:.2f})">'
        f'<rect x="-110" y="-190" width="220" height="190" rx="14" fill="{wall}"/>'
        f'<path d="M -140 -180 L 0 -300 L 140 -180 Z" fill="{roof}" stroke-linejoin="round"/>'
        '<rect x="-30" y="-100" width="60" height="100" rx="28" fill="#8D6E63"/>'
        '<rect x="-90" y="-150" width="46" height="46" rx="8" fill="#BBDEFB" stroke="#fff" stroke-width="6"/>'
        '<rect x="44" y="-150" width="46" height="46" rx="8" fill="#BBDEFB" stroke="#fff" stroke-width="6"/></g>'
    )


def background_svg(kind: str, seed: int = 0, width: int = 1920, height: int = 1080, portrait: bool = False) -> str:
    rnd = random.Random(seed)
    par = "xMidYMid slice"
    vb = "0 0 1920 1080"
    if kind == "meadow":
        inner = (
            _sky("#7FD3FF", "#D9F4FF", f"sky{seed}")
            + '<circle class="sun" cx="1650" cy="170" r="95" fill="#FFE066"/><circle cx="1650" cy="170" r="125" fill="#FFE066" opacity=".25"/>'
            + "".join(_cloud(rnd.randint(0, 1700), rnd.randint(70, 300), rnd.uniform(0.7, 1.2)) for _ in range(4))
            + '<path d="M 0 700 Q 400 560 900 680 T 1920 640 L 1920 1080 L 0 1080 Z" fill="#9CDB7E"/>'
            + '<path d="M 0 800 Q 500 700 1000 790 T 1920 760 L 1920 1080 L 0 1080 Z" fill="#7BC96F"/>'
            + _tree(220, 760, 0.9) + _tree(1730, 740, 1.0, "#43A047", "#5CBF60")
            + "".join(_flower(rnd.randint(40, 1880), rnd.randint(930, 1040), rnd.choice(["#FF6F91", "#FFD54F", "#B388FF", "#FF8A65"]), rnd.uniform(0.8, 1.2)) for _ in range(16))
        )
    elif kind == "forest":
        inner = (
            _sky("#A8E6CF", "#E8F8EE", f"sky{seed}")
            + "".join(_tree(x, 760, rnd.uniform(1.2, 1.6), "#2E7D32", "#388E3C") for x in range(-50, 2000, 260))
            + '<rect y="760" width="1920" height="320" fill="#6DBE6A"/>'
            + "".join(_tree(x, 860, rnd.uniform(1.0, 1.3), "#43A047", "#66BB6A") for x in (120, 1800))
            + "".join(
                f'<g transform="translate({x} {y})"><rect x="-10" y="-40" width="20" height="40" rx="8" fill="#FFF3E0"/>'
                f'<path d="M -38 -38 Q 0 -90 38 -38 Z" fill="#E53935"/><circle cx="-12" cy="-55" r="6" fill="#fff"/><circle cx="12" cy="-50" r="5" fill="#fff"/></g>'
                for x, y in [(340, 1000), (1560, 990), (1680, 1030), (260, 1050)]
            )
        )
    elif kind == "village":
        inner = (
            _sky("#81D4FA", "#E1F5FE", f"sky{seed}")
            + "".join(_cloud(rnd.randint(0, 1700), rnd.randint(60, 250), rnd.uniform(0.7, 1.1)) for _ in range(3))
            + '<path d="M 0 640 Q 960 520 1920 640 L 1920 1080 L 0 1080 Z" fill="#A5D6A7"/>'
            + _house(260, 760, "#FFCC80", "#E57373") + _house(640, 720, "#B3E5FC", "#7986CB", 0.85)
            + _house(1300, 720, "#F8BBD0", "#81C784", 0.85) + _house(1680, 760, "#FFF59D", "#FF8A65")
            + '<rect y="780" width="1920" height="300" fill="#E0C9A6"/>'
            + '<ellipse cx="960" cy="810" rx="150" ry="36" fill="#90CAF9"/><rect x="940" y="700" width="40" height="110" fill="#B0BEC5"/>'
            + '<circle class="star" cx="960" cy="690" r="22" fill="#4FC3F7"/>'
        )
    elif kind == "home":
        inner = (
            '<rect width="1920" height="1080" fill="#FFE9C9"/><rect y="0" width="1920" height="60" fill="#FFD8A8"/>'
            + "".join(f'<rect x="{x}" y="0" width="40" height="780" fill="#FFDDB0" opacity=".6"/>' for x in range(0, 1920, 120))
            + '<rect x="1240" y="170" width="420" height="330" rx="20" fill="#B3E5FC" stroke="#fff" stroke-width="18"/>'
            + '<path d="M 1450 170 L 1450 500 M 1240 335 L 1660 335" stroke="#fff" stroke-width="14"/>'
            + _cloud(1290, 260, 0.6) + '<circle cx="1590" cy="240" r="38" fill="#FFE066"/>'
            + '<rect y="780" width="1920" height="300" fill="#C8A27C"/>'
            + '<ellipse cx="960" cy="930" rx="560" ry="90" fill="#FF8A80" opacity=".85"/><ellipse cx="960" cy="930" rx="420" ry="62" fill="#FFAB91"/>'
            + '<rect x="160" y="560" width="300" height="220" rx="20" fill="#A1887F"/><rect x="190" y="590" width="240" height="70" rx="10" fill="#BCAAA4"/>'
            + '<rect x="190" y="680" width="240" height="70" rx="10" fill="#BCAAA4"/>'
            + '<rect x="340" y="250" width="200" height="150" rx="10" fill="#fff"/><path d="M 360 380 L 420 300 L 470 360 L 500 330 L 530 380 Z" fill="#81C784"/>'
        )
    elif kind == "lake":
        inner = (
            _sky("#80DEEA", "#E0F7FA", f"sky{seed}")
            + "".join(_cloud(rnd.randint(0, 1700), rnd.randint(60, 260), rnd.uniform(0.6, 1.0)) for _ in range(3))
            + '<path d="M 0 600 Q 500 520 1000 590 T 1920 560 L 1920 700 L 0 700 Z" fill="#A5D6A7"/>'
            + '<rect y="680" width="1920" height="230" fill="#4FC3F7"/>'
            + "".join(f'<path class="wave" d="M {x} {y} q 30 -14 60 0 t 60 0" stroke="#B3E5FC" stroke-width="6" fill="none"/>' for x, y in [(200, 740), (700, 790), (1200, 750), (1600, 820), (420, 850)])
            + '<path d="M 0 880 Q 960 840 1920 880 L 1920 1080 L 0 1080 Z" fill="#FFE0B2"/>'
            + "".join(f'<g class="sway" transform="translate({x} 900)"><rect x="-3" y="-120" width="6" height="120" fill="#689F38"/><rect x="-8" y="-150" width="16" height="50" rx="8" fill="#8D6E63"/></g>' for x in (80, 120, 1820, 1860))
        )
    elif kind == "garden":
        inner = (
            _sky("#9BE7FF", "#F1FBFF", f"sky{seed}")
            + '<circle cx="250" cy="180" r="85" fill="#FFE066"/>'
            + "".join(_cloud(rnd.randint(300, 1700), rnd.randint(60, 240), rnd.uniform(0.6, 1.0)) for _ in range(3))
            + '<rect y="640" width="1920" height="440" fill="#8BC34A"/>'
            + "".join(f'<rect x="{x}" y="560" width="30" height="140" rx="6" fill="#FFF8E1"/>' for x in range(20, 1920, 90))
            + '<rect y="600" width="1920" height="22" fill="#FFF8E1"/>'
            + "".join(f'<ellipse cx="{x}" cy="{y}" rx="140" ry="30" fill="#795548"/>' for x, y in [(300, 1000), (960, 1030), (1620, 1000)])
            + "".join(
                f'<g transform="translate({x} {y})"><path d="M 0 0 L -10 -40 M 0 0 L 10 -42 M 0 0 L 0 -48" stroke="#43A047" stroke-width="8" stroke-linecap="round"/>'
                f'<path d="M -12 0 L 12 0 L 0 34 Z" fill="#FF7043"/></g>'
                for x, y in [(220, 990), (300, 1000), (380, 990), (1540, 990), (1620, 1000), (1700, 990)]
            )
        )
    elif kind == "night":
        inner = (
            _sky("#1A237E", "#5C6BC0", f"sky{seed}")
            + '<circle cx="1550" cy="200" r="90" fill="#FFF9C4"/><circle cx="1585" cy="175" r="80" fill="#3949AB" opacity=".0"/>'
            + "".join(f'<circle class="star" cx="{rnd.randint(0,1920)}" cy="{rnd.randint(20,560)}" r="{rnd.uniform(2,5):.1f}" fill="#FFF"/>' for _ in range(70))
            + '<path d="M 0 720 Q 500 600 1000 700 T 1920 680 L 1920 1080 L 0 1080 Z" fill="#283593"/>'
            + '<path d="M 0 820 Q 600 740 1100 810 T 1920 790 L 1920 1080 L 0 1080 Z" fill="#1E2A78"/>'
            + "".join(f'<circle class="firefly" cx="{rnd.randint(100,1800)}" cy="{rnd.randint(650,950)}" r="6" fill="#FFF59D"/>' for _ in range(12))
        )
    elif kind == "bedroom":
        inner = (
            '<rect width="1920" height="1080" fill="#3F4A8A"/>'
            + '<rect x="1200" y="150" width="420" height="340" rx="24" fill="#1A237E" stroke="#C5CAE9" stroke-width="18"/>'
            + '<circle cx="1480" cy="270" r="60" fill="#FFF9C4"/>'
            + "".join(f'<circle class="star" cx="{rnd.randint(1230,1590)}" cy="{rnd.randint(180,460)}" r="{rnd.uniform(2,4):.1f}" fill="#fff"/>' for _ in range(16))
            + '<rect y="790" width="1920" height="290" fill="#5C4F8C"/>'
            + '<rect x="120" y="620" width="620" height="200" rx="40" fill="#7E57C2"/><rect x="120" y="580" width="180" height="90" rx="40" fill="#EDE7F6"/>'
            + '<rect x="160" y="700" width="560" height="110" rx="30" fill="#B39DDB"/>'
            + '<rect x="1640" y="640" width="60" height="150" fill="#8D6E63"/><path d="M 1610 640 L 1730 640 L 1700 560 L 1640 560 Z" fill="#FFE082"/>'
            + '<circle cx="1670" cy="600" r="160" fill="#FFE082" opacity=".12"/>'
        )
    else:
        return background_svg("meadow", seed, width, height, portrait)
    return inner if not portrait else inner  # aynı içerik; kırpma viewBox/preserveAspectRatio ile yapılır


def background_wrapper(kind: str, seed: int, w: int, h: int) -> str:
    return (
        f'<svg class="bg" width="{w}" height="{h}" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">'
        f"{background_svg(kind, seed)}</svg>"
    )


# --------------------------------------------------------------------------- nesneler

def prop_svg(kind: str, color: str = "kırmızı", label: str | None = None, size: float = 1.0) -> str:
    """Yerel koordinatlarda (0,0) merkezli, ~120 birim boyutunda nesne."""
    c = COLORS.get(color, color if str(color).startswith("#") else "#F44336")
    s = size
    body = {
        "ball": f'<circle r="55" fill="{c}"/><path d="M -55 0 Q 0 30 55 0" stroke="#fff" stroke-width="8" fill="none"/><circle cx="-18" cy="-22" r="12" fill="#fff" opacity=".5"/>',
        "apple": f'<path d="M 0 -40 C -60 -70 -75 10 -40 45 C -20 62 -5 52 0 48 C 5 52 20 62 40 45 C 75 10 60 -70 0 -40 Z" fill="{c}"/><path d="M 0 -40 Q 4 -62 14 -72" stroke="#6D4C41" stroke-width="7" fill="none"/><path d="M 8 -58 Q 34 -78 46 -56 Q 24 -50 8 -58 Z" fill="#43A047"/>',
        "balloon": f'<ellipse cx="0" cy="-20" rx="48" ry="60" fill="{c}"/><path d="M -8 40 L 8 40 L 0 30 Z" fill="{c}"/><path d="M 0 40 Q -14 80 6 120" stroke="#555" stroke-width="3" fill="none"/><ellipse cx="-16" cy="-44" rx="10" ry="16" fill="#fff" opacity=".45"/>',
        "star": f'<path d="M 0 -62 L 17 -20 L 62 -18 L 27 10 L 39 55 L 0 30 L -39 55 L -27 10 L -62 -18 L -17 -20 Z" fill="{c}" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>',
        "circle": f'<circle r="58" fill="{c}" stroke="#fff" stroke-width="8"/>',
        "square": f'<rect x="-55" y="-55" width="110" height="110" rx="10" fill="{c}" stroke="#fff" stroke-width="8"/>',
        "triangle": f'<path d="M 0 -62 L 62 52 L -62 52 Z" fill="{c}" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>',
        "heart": f'<path d="M 0 50 C -80 -5 -50 -70 0 -32 C 50 -70 80 -5 0 50 Z" fill="{c}" stroke="#fff" stroke-width="6"/>',
        "flower": "".join(f'<circle cx="{34*math.cos(a):.1f}" cy="{34*math.sin(a):.1f}" r="26" fill="{c}"/>' for a in [i*math.pi/3 for i in range(6)]) + '<circle r="22" fill="#FFEB3B"/>',
        "gift": f'<rect x="-50" y="-30" width="100" height="80" rx="8" fill="{c}"/><rect x="-58" y="-48" width="116" height="26" rx="6" fill="{c}" stroke="#fff" stroke-width="3"/><rect x="-9" y="-48" width="18" height="98" fill="#FFD54F"/><path d="M 0 -48 C -40 -90 -50 -50 0 -48 C 50 -50 40 -90 0 -48" fill="#FFD54F"/>',
        "kite": f'<path d="M 0 -70 L 45 0 L 0 60 L -45 0 Z" fill="{c}" stroke="#fff" stroke-width="5"/><path d="M 0 60 Q 20 90 -10 110 Q 15 130 0 150" stroke="#555" stroke-width="3" fill="none"/>',
        "umbrella": f'<path d="M -80 0 Q 0 -110 80 0 Q 60 -14 40 0 Q 20 -14 0 0 Q -20 -14 -40 0 Q -60 -14 -80 0 Z" fill="{c}"/><path d="M 0 0 L 0 80 Q 0 98 -18 92" stroke="#5D4037" stroke-width="7" fill="none" stroke-linecap="round"/>',
        "cake": f'<rect x="-60" y="-10" width="120" height="60" rx="10" fill="#FFE0B2"/><rect x="-60" y="-26" width="120" height="26" rx="10" fill="{c}"/><rect x="-4" y="-60" width="8" height="34" fill="#FFF"/><path d="M 0 -76 Q 8 -66 0 -60 Q -8 -66 0 -76 Z" fill="#FF9800"/>',
        "book": f'<path d="M 0 -40 Q -40 -55 -70 -40 L -70 45 Q -40 30 0 45 Q 40 30 70 45 L 70 -40 Q 40 -55 0 -40 Z" fill="{c}"/><path d="M 0 -40 L 0 45" stroke="#fff" stroke-width="5"/>',
        "number": f'<circle r="62" fill="{c}" stroke="#fff" stroke-width="8"/><text y="26" text-anchor="middle" font-family="&quot;Baloo 2&quot;" font-weight="800" font-size="80" fill="#fff">{label or "1"}</text>',
        "strawberry": f'<path d="M 0 55 C -50 20 -50 -30 -25 -40 Q 0 -48 25 -40 C 50 -30 50 20 0 55 Z" fill="#E53935"/><path d="M -25 -40 L -10 -55 L 0 -42 L 10 -55 L 25 -40 Z" fill="#43A047"/>' + "".join(f'<ellipse cx="{x}" cy="{y}" rx="3" ry="5" fill="#FFEB3B"/>' for x, y in [(-15, -15), (10, -10), (-5, 10), (15, 20), (-18, 25), (0, 35)]),
        "carrot": '<path d="M -18 -40 L 18 -40 L 0 60 Z" fill="#FF7043"/><path d="M 0 -40 L -14 -76 M 0 -40 L 0 -82 M 0 -40 L 14 -76" stroke="#43A047" stroke-width="9" stroke-linecap="round"/>',
        "leaf": f'<path d="M -50 40 Q -50 -50 50 -50 Q 50 40 -50 40 Z" fill="{c}"/><path d="M -50 40 L 30 -30" stroke="#fff" stroke-width="4" opacity=".6"/>',
        "moon": '<path d="M 20 -60 A 60 60 0 1 0 50 40 A 48 48 0 1 1 20 -60 Z" fill="#FFF59D"/>',
        "drum": f'<ellipse cx="0" cy="-30" rx="60" ry="18" fill="#FFF3E0"/><path d="M -60 -30 L -60 40 Q 0 62 60 40 L 60 -30" fill="{c}"/><path d="M -60 -10 L -30 40 L 0 -10 L 30 40 L 60 -10" stroke="#FFD54F" stroke-width="5" fill="none"/>',
        "paintbrush": f'<rect x="-8" y="-60" width="16" height="90" rx="6" fill="#8D6E63"/><rect x="-11" y="20" width="22" height="16" fill="#B0BEC5"/><path d="M -11 36 L 11 36 Q 14 64 0 72 Q -14 64 -11 36 Z" fill="{c}"/>',
        "basket": f'<path d="M -70 -10 L 70 -10 L 52 55 L -52 55 Z" fill="#A1887F"/><path d="M -55 -10 Q 0 -90 55 -10" stroke="#8D6E63" stroke-width="9" fill="none"/>' + "".join(f'<path d="M {x} -10 L {x*0.75} 55" stroke="#8D6E63" stroke-width="4"/>' for x in (-40, -14, 14, 40)),
    }.get(kind, f'<circle r="50" fill="{c}"/>')
    label_svg = ""
    if label and kind != "number":
        label_svg = (
            f'<g transform="translate(0 {100*s:.0f})"><rect x="-90" y="-30" width="180" height="52" rx="26" fill="#fff" stroke="#2B2D42" stroke-width="4"/>'
            f'<text y="9" text-anchor="middle" font-family="&quot;Baloo 2&quot;" font-weight="800" font-size="34" fill="#2B2D42">{label}</text></g>'
        )
    return f'<g transform="scale({s:.2f})">{body}</g>{label_svg}'
