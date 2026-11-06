"""Bulutkent karakter evreni: karakter kitabı + parametrik SVG karakter iskeletleri (rig).

Her karakter tek bir deterministik SVG fonksiyonundan çizilir; bu yüzden her videoda
birebir aynı görünür. Yüz ifadeleri, ağız şekilleri, göz kırpma, kollar ve gövde
GSAP ile canlandırılabilecek şekilde ayrı gruplara bölünmüştür.

Yerel koordinat: x=0 karakterin ortası, y=0 zemin (ayak tabanı). Yaklaşık boy 400 birim.
"""
from __future__ import annotations

from dataclasses import dataclass, field

INK = "#2B2D42"
MOUTH = "#7A2335"
TONGUE = "#FF8FA3"
BLUSH = "#FF8FA3"


@dataclass
class Character:
    id: str
    name: str
    species: str
    colors: dict
    personality: str
    voice: dict
    speech_style: str
    traits: list
    role: str
    catchphrase: str
    looks: str
    emotions: list = field(default_factory=lambda: list(EMOTIONS))


EMOTIONS = ["happy", "excited", "sad", "surprised", "scared", "grumpy", "sleepy", "thinking", "laughing", "shy", "calm"]
ACTIONS = ["idle", "talk", "wave", "jump", "hop", "walk_in", "walk_out", "dance", "point", "think", "laugh",
           "cry", "sleep", "spin", "nod", "shake_head", "clap", "look_around", "sneeze"]

CHARACTERS: dict[str, Character] = {
    "pofi": Character(
        id="pofi", name="Pofi", species="yavru tilki",
        colors={"main": "#FF8A3D", "dark": "#E2692A", "light": "#FFE8C7", "accent": "#4FC3F7", "ink": INK},
        personality="Meraklı, cesur, enerjik; bazen aceleci ama hep yardımsever.",
        voice={"engine_pitch": 3.0, "length_scale": 0.95, "noise_scale": 0.6, "eleven_voice": "child-boy-energetic"},
        speech_style="Kısa, heyecanlı cümleler; sık sık 'Hadi!' ve 'Vay canına!' der.",
        traits=["mavi atkı", "beyaz uçlu kabarık kuyruk", "sivri kulaklar"],
        role="Ana kahraman; maceraları başlatır, soruları sorar.",
        catchphrase="Hadi keşfedelim!",
        looks="Turuncu yuvarlak kafa, krem renkli yüz ve göğüs, mavi atkı, büyük kabarık kuyruk.",
    ),
    "lili": Character(
        id="lili", name="Lili", species="tavşan",
        colors={"main": "#FF9EC7", "dark": "#F27BAE", "light": "#FFF0F6", "accent": "#9B6BFF", "ink": INK},
        personality="Nazik, biraz utangaç, renklere ve resim yapmaya bayılır; paylaşmayı sever.",
        voice={"engine_pitch": 5.0, "length_scale": 1.0, "noise_scale": 0.55, "eleven_voice": "child-girl-soft"},
        speech_style="Yumuşak ve tatlı konuşur; 'Ne güzel!' ve 'Birlikte yapalım mı?' der.",
        traits=["mor fiyonk", "uzun kulaklar (biri hafif bükük)", "pamuk kuyruk"],
        role="Renklerin ve duyguların uzmanı; arkadaşlarını sakinleştirir.",
        catchphrase="Birlikte daha güzel!",
        looks="Pembe tavşan, açık pembe yüz, kulağında mor fiyonk.",
    ),
    "tombi": Character(
        id="tombi", name="Tombi", species="kaplumbağa",
        colors={"main": "#66BB6A", "dark": "#2E8B57", "light": "#F6E27A", "accent": "#8D6E63", "ink": INK},
        personality="Sakin, bilge ve sabırlı; sayıları ve bilmeceleri çok sever.",
        voice={"engine_pitch": -2.0, "length_scale": 1.15, "noise_scale": 0.5, "eleven_voice": "warm-grandpa"},
        speech_style="Yavaş ve tane tane; 'Acele etme, adım adım.' der, bilmeceler sorar.",
        traits=["yuvarlak gözlük", "altıgen desenli kabuk", "sarı karın"],
        role="Bilge arkadaş; sayma, şekiller ve bilmece bölümlerini yönetir.",
        catchphrase="Acele etme, adım adım!",
        looks="Yeşil kaplumbağa, koyu yeşil desenli kabuk, kahverengi yuvarlak gözlük.",
    ),
    "bobo": Character(
        id="bobo", name="Bobo", species="yavru fil",
        colors={"main": "#6EC6FF", "dark": "#3B9BE0", "light": "#FFC8D8", "accent": "#FFD54F", "ink": INK},
        personality="Komik, sakar, iyi kalpli; dans etmeyi ve şarkı söylemeyi sever, hapşırınca her şey uçar!",
        voice={"engine_pitch": 1.5, "length_scale": 0.92, "noise_scale": 0.7, "eleven_voice": "child-boy-funny"},
        speech_style="Neşeli, ritimli konuşur; 'Ups!' ve 'Hadi dans!' der.",
        traits=["sarı atkı", "kocaman kulaklar", "kıvrık hortum"],
        role="Komik arkadaş; kahkaha ve hareket getirir, ritim/şarkı bölümlerinin yıldızı.",
        catchphrase="Ups! Hadi bir daha deneyelim!",
        looks="Açık mavi fil, pembe iç kulaklar, sarı atkı, kıvrık hortum.",
    ),
    "bulut": Character(
        id="bulut", name="Bulut", species="konuşan bulut (maskot ve anlatıcı)",
        colors={"main": "#FFFFFF", "dark": "#BFE6FF", "light": "#FFFFFF", "accent": "#4FC3F7", "ink": INK},
        personality="Sıcak, şefkatli anlatıcı; Bulutkent'in üstünde süzülür, her şeyi görür.",
        voice={"engine_pitch": 0.0, "length_scale": 1.05, "noise_scale": 0.5, "eleven_voice": "warm-narrator"},
        speech_style="Masal anlatır gibi, sakin ve sevecen; izleyiciye doğrudan sorular sorar.",
        traits=["pembe yanaklar", "yumuşak mavi gölgeler"],
        role="Kanalın maskotu ve anlatıcısı.",
        catchphrase="Bulutkent'te bugün neler oluyor, bakalım!",
        looks="Beyaz, kabarık, gülümseyen bulut; pembe yanaklar.",
    ),
}

SPEAKERS = ["narrator", *CHARACTERS.keys()]


def speaker_name(sid: str) -> str:
    if sid == "narrator":
        return "Bulut"
    return CHARACTERS[sid].name


def speaker_color(sid: str) -> str:
    return {"narrator": "#4FC3F7", "bulut": "#4FC3F7"}.get(sid) or CHARACTERS[sid].colors["main"]


def voice_for(sid: str) -> dict:
    return CHARACTERS["bulut" if sid == "narrator" else sid].voice


# --------------------------------------------------------------------------- yüz parçaları

def _eyes(dx: float, y: float, size: float = 1.0, color: str = INK) -> str:
    rx, ry = 13 * size, 17 * size
    hl = 5 * size
    open_ = "".join(
        f'<g class="eye"><ellipse cx="{sx*dx:.1f}" cy="{y:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="{color}"/>'
        f'<circle class="pupil-hl" cx="{sx*dx + 4*size:.1f}" cy="{y - 6*size:.1f}" r="{hl:.1f}" fill="#fff"/>'
        f'<circle cx="{sx*dx - 4*size:.1f}" cy="{y + 6*size:.1f}" r="{hl*0.45:.1f}" fill="#fff" opacity=".8"/></g>'
        for sx in (-1, 1)
    )
    happy = "".join(
        f'<path d="M {sx*dx-13*size:.1f} {y+5:.1f} Q {sx*dx:.1f} {y-14*size:.1f} {sx*dx+13*size:.1f} {y+5:.1f}" '
        f'stroke="{color}" stroke-width="{6*size:.1f}" fill="none" stroke-linecap="round"/>'
        for sx in (-1, 1)
    )
    closed = "".join(
        f'<path d="M {sx*dx-13*size:.1f} {y:.1f} Q {sx*dx:.1f} {y+10*size:.1f} {sx*dx+13*size:.1f} {y:.1f}" '
        f'stroke="{color}" stroke-width="{5*size:.1f}" fill="none" stroke-linecap="round"/>'
        for sx in (-1, 1)
    )
    return (
        f'<g class="eyes-open">{open_}</g>'
        f'<g class="eyes-happy" opacity="0">{happy}</g>'
        f'<g class="eyes-closed" opacity="0">{closed}</g>'
    )


def _brows(dx: float, y: float, color: str = INK) -> str:
    return (
        f'<path class="brow-l" d="M {-dx-12:.1f} {y:.1f} Q {-dx:.1f} {y-7:.1f} {-dx+12:.1f} {y:.1f}" stroke="{color}" '
        f'stroke-width="5" fill="none" stroke-linecap="round"/>'
        f'<path class="brow-r" d="M {dx-12:.1f} {y:.1f} Q {dx:.1f} {y-7:.1f} {dx+12:.1f} {y:.1f}" stroke="{color}" '
        f'stroke-width="5" fill="none" stroke-linecap="round"/>'
    )


def _mouths(y: float, w: float = 1.0, x: float = 0.0) -> str:
    s = w
    return (
        f'<g class="mouths" transform="translate({x:.1f} {y:.1f})">'
        f'<path class="m-smile" d="M {-20*s:.1f} 0 Q 0 {16*s:.1f} {20*s:.1f} 0" stroke="{MOUTH}" stroke-width="6" fill="none" stroke-linecap="round"/>'
        f'<g class="m-open" opacity="0"><path d="M {-19*s:.1f} -2 Q 0 {-6*s:.1f} {19*s:.1f} -2 Q {16*s:.1f} {24*s:.1f} 0 {26*s:.1f} Q {-16*s:.1f} {24*s:.1f} {-19*s:.1f} -2 Z" fill="{MOUTH}"/>'
        f'<ellipse cx="0" cy="{17*s:.1f}" rx="{10*s:.1f}" ry="{6*s:.1f}" fill="{TONGUE}"/></g>'
        f'<path class="m-sad" opacity="0" d="M {-17*s:.1f} 10 Q 0 {-5*s:.1f} {17*s:.1f} 10" stroke="{MOUTH}" stroke-width="6" fill="none" stroke-linecap="round"/>'
        f'<ellipse class="m-o" opacity="0" cx="0" cy="6" rx="{9*s:.1f}" ry="{12*s:.1f}" fill="{MOUTH}"/>'
        f'<g class="m-grin" opacity="0"><path d="M {-26*s:.1f} -3 Q 0 {-1*s:.1f} {26*s:.1f} -3 Q {20*s:.1f} {34*s:.1f} 0 {34*s:.1f} Q {-20*s:.1f} {34*s:.1f} {-26*s:.1f} -3 Z" fill="{MOUTH}"/>'
        f'<ellipse cx="0" cy="{24*s:.1f}" rx="{13*s:.1f}" ry="{7*s:.1f}" fill="{TONGUE}"/></g>'
        f'<path class="m-flat" opacity="0" d="M {-15*s:.1f} 5 L {15*s:.1f} 5" stroke="{MOUTH}" stroke-width="6" stroke-linecap="round"/>'
        f"</g>"
    )


def _cheeks(dx: float, y: float) -> str:
    return (
        f'<g class="cheeks"><ellipse cx="{-dx:.1f}" cy="{y:.1f}" rx="16" ry="10" fill="{BLUSH}" opacity=".55"/>'
        f'<ellipse cx="{dx:.1f}" cy="{y:.1f}" rx="16" ry="10" fill="{BLUSH}" opacity=".55"/></g>'
    )


def _arm(cls: str, x: float, y: float, length: float, color: str, dark: str, hand: str | None = None) -> str:
    hand = hand or color
    return (
        f'<g class="{cls}" data-ox="{x:.1f}" data-oy="{y:.1f}">'
        f'<rect x="{x-13:.1f}" y="{y-6:.1f}" width="26" height="{length:.1f}" rx="13" fill="{color}" stroke="{dark}" stroke-width="3"/>'
        f'<circle cx="{x:.1f}" cy="{y+length-6:.1f}" r="16" fill="{hand}" stroke="{dark}" stroke-width="3"/></g>'
    )


def _shadow() -> str:
    return '<ellipse class="shadow" cx="0" cy="2" rx="95" ry="16" fill="#000" opacity=".16"/>'


# --------------------------------------------------------------------------- karakterler

def svg_pofi() -> str:
    c = CHARACTERS["pofi"].colors
    m, d, l, a = c["main"], c["dark"], c["light"], c["accent"]
    tail = (
        f'<g class="tail"><path d="M 50 -80 C 170 -90 190 -230 120 -260 C 150 -180 90 -140 40 -130 Z" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<path d="M 120 -260 C 150 -235 160 -205 150 -185 C 135 -215 125 -235 110 -245 Z" fill="#fff"/></g>'
    )
    body = (
        f'<ellipse cx="-34" cy="-12" rx="30" ry="15" fill="{d}"/><ellipse cx="34" cy="-12" rx="30" ry="15" fill="{d}"/>'
        f'<ellipse class="torso" cx="0" cy="-105" rx="68" ry="82" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<ellipse cx="0" cy="-92" rx="42" ry="55" fill="{l}"/>'
    )
    scarf = (
        f'<path d="M -62 -170 Q 0 -140 62 -170 L 60 -150 Q 0 -120 -60 -150 Z" fill="{a}"/>'
        f'<path d="M 30 -152 L 52 -100 L 28 -104 L 18 -150 Z" fill="{a}"/>'
    )
    head = (
        f'<g class="head" data-ox="0" data-oy="-180">'
        f'<path d="M -88 -280 L -70 -380 L -22 -320 Z" fill="{m}" stroke="{d}" stroke-width="4" stroke-linejoin="round"/>'
        f'<path d="M 88 -280 L 70 -380 L 22 -320 Z" fill="{m}" stroke="{d}" stroke-width="4" stroke-linejoin="round"/>'
        f'<path d="M -72 -300 L -66 -355 L -40 -322 Z" fill="{INK}" opacity=".75"/>'
        f'<path d="M 72 -300 L 66 -355 L 40 -322 Z" fill="{INK}" opacity=".75"/>'
        f'<ellipse cx="0" cy="-255" rx="100" ry="90" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<path d="M -98 -240 Q -60 -200 0 -196 Q 60 -200 98 -240 Q 80 -175 0 -168 Q -80 -175 -98 -240 Z" fill="{l}"/>'
        f'{_cheeks(62, -222)}{_eyes(36, -262)}{_brows(36, -298)}'
        f'<ellipse cx="0" cy="-232" rx="15" ry="11" fill="{INK}"/><circle cx="5" cy="-236" r="4" fill="#fff" opacity=".8"/>'
        f'{_mouths(-212)}</g>'
    )
    arms_back = _arm("arm-l", -66, -150, 78, m, d, l)
    arms_front = _arm("arm-r", 66, -150, 78, m, d, l)
    return f'{_shadow()}{tail}{arms_back}{body}{scarf}{arms_front}{head}'


def svg_lili() -> str:
    c = CHARACTERS["lili"].colors
    m, d, l, a = c["main"], c["dark"], c["light"], c["accent"]
    ears = (
        f'<g class="ears">'
        f'<g class="ear-l" data-ox="-38" data-oy="-300"><ellipse cx="-42" cy="-400" rx="27" ry="88" fill="{m}" stroke="{d}" stroke-width="4" transform="rotate(-8 -42 -400)"/>'
        f'<ellipse cx="-42" cy="-395" rx="13" ry="64" fill="{l}" transform="rotate(-8 -42 -395)"/></g>'
        f'<g class="ear-r" data-ox="38" data-oy="-300"><path d="M 26 -320 C 30 -420 70 -470 100 -440 C 120 -420 80 -400 62 -330 Z" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<path d="M 40 -330 C 45 -405 72 -440 90 -428 C 95 -415 70 -395 58 -334 Z" fill="{l}"/></g>'
        f'<g class="bow"><path d="M -42 -318 L -84 -342 L -84 -294 Z" fill="{a}"/><path d="M -42 -318 L 0 -342 L 0 -294 Z" fill="{a}"/>'
        f'<circle cx="-42" cy="-318" r="11" fill="#C3A6FF"/></g></g>'
    )
    body = (
        f'<circle cx="62" cy="-70" r="24" fill="#fff" stroke="{d}" stroke-width="3"/>'
        f'<ellipse cx="-32" cy="-12" rx="32" ry="15" fill="{l}" stroke="{d}" stroke-width="3"/>'
        f'<ellipse cx="32" cy="-12" rx="32" ry="15" fill="{l}" stroke="{d}" stroke-width="3"/>'
        f'<ellipse class="torso" cx="0" cy="-100" rx="62" ry="80" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<ellipse cx="0" cy="-88" rx="38" ry="52" fill="{l}"/>'
    )
    head = (
        f'<g class="head" data-ox="0" data-oy="-170">{ears}'
        f'<ellipse cx="0" cy="-245" rx="92" ry="84" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<ellipse cx="0" cy="-212" rx="48" ry="34" fill="{l}"/>'
        f'{_cheeks(58, -214)}{_eyes(34, -255, 1.05)}{_brows(34, -292)}'
        f'<path d="M -9 -228 Q 0 -220 9 -228 Q 0 -236 -9 -228 Z" fill="#E0457B"/>'
        f'<path d="M 0 -224 L 0 -214" stroke="{MOUTH}" stroke-width="3"/>'
        f'{_mouths(-206, 0.85)}</g>'
    )
    return f'{_shadow()}{_arm("arm-l", -60, -140, 72, m, d, l)}{body}{_arm("arm-r", 60, -140, 72, m, d, l)}{head}'


def svg_tombi() -> str:
    c = CHARACTERS["tombi"].colors
    m, d, l, a = c["main"], c["dark"], c["light"], c["accent"]
    hexes = "".join(
        f'<path d="M {x} {y-22} L {x+19} {y-11} L {x+19} {y+11} L {x} {y+22} L {x-19} {y+11} L {x-19} {y-11} Z" fill="#9BE29F" opacity=".55"/>'
        for x, y in [(-60, -130), (-20, -165), (20, -165), (60, -130), (-40, -95), (0, -128), (40, -95), (0, -60)]
    )
    shell = (
        f'<path class="shell" d="M -118 -60 C -125 -200 125 -200 118 -60 Z" fill="{d}" stroke="#1F6B41" stroke-width="5"/>'
        f'{hexes}<rect x="-125" y="-68" width="250" height="20" rx="10" fill="#1F6B41"/>'
    )
    body = (
        f'<ellipse cx="-52" cy="-14" rx="30" ry="18" fill="{m}" stroke="{d}" stroke-width="3"/>'
        f'<ellipse cx="52" cy="-14" rx="30" ry="18" fill="{m}" stroke="{d}" stroke-width="3"/>'
        f'<ellipse class="torso" cx="0" cy="-60" rx="90" ry="45" fill="{l}" stroke="#D9C24F" stroke-width="3"/>'
        f'{shell}'
    )
    glasses = (
        f'<g class="glasses"><circle cx="-34" cy="-262" r="27" fill="#fff" fill-opacity=".25" stroke="{a}" stroke-width="6"/>'
        f'<circle cx="34" cy="-262" r="27" fill="#fff" fill-opacity=".25" stroke="{a}" stroke-width="6"/>'
        f'<path d="M -8 -264 Q 0 -272 8 -264" stroke="{a}" stroke-width="6" fill="none"/></g>'
    )
    head = (
        f'<g class="head" data-ox="0" data-oy="-180">'
        f'<rect x="-34" y="-215" width="68" height="60" rx="26" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<ellipse cx="0" cy="-255" rx="86" ry="78" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'{_cheeks(56, -222)}{_eyes(34, -262, 0.9)}{glasses}{_brows(34, -300)}'
        f'<circle cx="-7" cy="-236" r="3" fill="{INK}"/><circle cx="7" cy="-236" r="3" fill="{INK}"/>'
        f'{_mouths(-214, 0.95)}</g>'
    )
    return f'{_shadow()}{_arm("arm-l", -100, -110, 60, m, d)}{body}{_arm("arm-r", 100, -110, 60, m, d)}{head}'


def svg_bobo() -> str:
    c = CHARACTERS["bobo"].colors
    m, d, l, a = c["main"], c["dark"], c["light"], c["accent"]
    ears = (
        f'<g class="ear-l" data-ox="-70" data-oy="-260"><ellipse cx="-112" cy="-258" rx="70" ry="78" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<ellipse cx="-112" cy="-256" rx="44" ry="52" fill="{l}"/></g>'
        f'<g class="ear-r" data-ox="70" data-oy="-260"><ellipse cx="112" cy="-258" rx="70" ry="78" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<ellipse cx="112" cy="-256" rx="44" ry="52" fill="{l}"/></g>'
    )
    body = (
        f'<rect x="-66" y="-40" width="44" height="40" rx="14" fill="{m}" stroke="{d}" stroke-width="3"/>'
        f'<rect x="22" y="-40" width="44" height="40" rx="14" fill="{m}" stroke="{d}" stroke-width="3"/>'
        f'<ellipse class="torso" cx="0" cy="-100" rx="76" ry="80" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<path d="M -66 -160 Q 0 -128 66 -160 L 64 -138 Q 0 -108 -64 -138 Z" fill="{a}"/>'
        f'<path d="M -30 -140 L -48 -90 L -24 -94 L -16 -136 Z" fill="{a}"/>'
    )
    trunk = (
        f'<g class="trunk" data-ox="0" data-oy="-225"><path d="M -20 -232 C -24 -170 -10 -140 24 -138 C 40 -138 46 -150 38 -158 '
        f'C 26 -150 16 -156 14 -175 C 12 -200 18 -220 20 -232 Z" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<path d="M -12 -200 L 12 -200 M -10 -180 L 14 -180" stroke="{d}" stroke-width="3" opacity=".6"/></g>'
    )
    head = (
        f'<g class="head" data-ox="0" data-oy="-180">{ears}'
        f'<ellipse cx="0" cy="-255" rx="96" ry="88" fill="{m}" stroke="{d}" stroke-width="4"/>'
        f'<path d="M -8 -340 Q 0 -365 10 -340" stroke="{d}" stroke-width="5" fill="none" stroke-linecap="round"/>'
        f'{_cheeks(60, -222)}{_eyes(40, -272)}{_brows(40, -308)}'
        f'{_mouths(-204, 0.85, -50)}'
        f'{trunk}</g>'
    )
    return f'{_shadow()}{_arm("arm-l", -68, -150, 74, m, d)}{body}{_arm("arm-r", 68, -150, 74, m, d)}{head}'


def svg_bulut() -> str:
    puffs = [(-90, -60, 62), (-30, -95, 78), (45, -92, 72), (100, -55, 58), (0, -40, 80), (-60, -30, 55), (65, -28, 55)]
    outline = "".join(f'<circle cx="{x+3}" cy="{y+5}" r="{r+6}" fill="#8FD3FF"/>' for x, y, r in puffs)
    shade = outline + "".join(f'<circle cx="{x+6}" cy="{y+10}" r="{r}" fill="#BFE6FF"/>' for x, y, r in puffs)
    white = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFFFFF"/>' for x, y, r in puffs)
    return (
        f'<g class="bob-cloud">{shade}{white}'
        f'<g class="head" data-ox="0" data-oy="-60">{_cheeks(52, -48)}{_eyes(32, -72, 0.95)}{_brows(32, -104)}{_mouths(-48, 0.9)}</g></g>'
    )


SVG_BUILDERS = {"pofi": svg_pofi, "lili": svg_lili, "tombi": svg_tombi, "bobo": svg_bobo, "bulut": svg_bulut}


# Profesyonel görünüm: her gövde parçasına yumuşak hacim (iç gölge + üst-sol ışık + kenar ışığı)
VOL_DEFS = (
    '<defs>'
    '<filter id="bk-vol" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">'
    '<feGaussianBlur in="SourceAlpha" stdDeviation="9" result="b"/>'
    # alt-sağ iç gölge
    '<feOffset in="b" dx="-9" dy="-12" result="o1"/>'
    '<feComposite in="SourceAlpha" in2="o1" operator="arithmetic" k2="1" k3="-1" result="rim1"/>'
    '<feFlood flood-color="#1B1F3B" flood-opacity="0.30"/><feComposite in2="rim1" operator="in" result="shadow"/>'
    # üst-sol ışık
    '<feOffset in="b" dx="7" dy="10" result="o2"/>'
    '<feComposite in="SourceAlpha" in2="o2" operator="arithmetic" k2="1" k3="-1" result="rim2"/>'
    '<feFlood flood-color="#FFFFFF" flood-opacity="0.42"/><feComposite in2="rim2" operator="in" result="light"/>'
    '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shadow"/><feMergeNode in="light"/></feMerge>'
    '</filter>'
    '<filter id="bk-drop" x="-20%" y="-20%" width="140%" height="140%">'
    '<feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#1B1F3B" flood-opacity="0.22"/></filter>'
    '</defs>'
)


def _styled(svg: str) -> str:
    svg = svg.replace('<g class="head"', '<g class="head" filter="url(#bk-vol)"', 1)
    for cls in ("torso", "shell", "bob-cloud"):
        svg = svg.replace(f'class="{cls}"', f'class="{cls}" filter="url(#bk-vol)"')
    for cls in ("arm-l", "arm-r"):
        svg = svg.replace(f'<g class="{cls}"', f'<g class="{cls}" filter="url(#bk-vol)"', 1)
    return svg


def character_svg(cid: str, inst_id: str, x: float, y: float, scale: float = 1.0, facing: str = "right") -> str:
    """Bir karakter örneği. Dış grup konum (GSAP x/y), .flip yön, .bob gövde animasyonu için."""
    flip = -1 if facing == "left" else 1
    return (
        f'<g id="{inst_id}" class="inst char-{cid}" transform="translate({x:.1f} {y:.1f})">'
        f'<g class="scale" transform="scale({scale:.3f})"><g class="flip" transform="scale({flip} 1)">'
        f'<g class="act"><g class="bob" filter="url(#bk-drop)">{_styled(SVG_BUILDERS[cid]())}</g></g></g></g></g>'
    )


def scope_css(css: str, scope: str) -> str:
    out = []
    for rule in css.split("}"):
        if "{" not in rule:
            continue
        sel, body = rule.split("{", 1)
        sels = ",".join(f"#{scope} {s.strip()}" for s in sel.split(","))
        out.append(f"{sels}{{{body}}}")
    return "".join(out)


_uid = [0]


def standalone_svg(cid: str, size: int = 512, emotion_css: str = "", width: int | None = None, tight: bool = False) -> str:
    """Karakter kartı/tasarım dosyaları için tek başına SVG (CSS ile ifade değiştirilebilir)."""
    _uid[0] += 1
    uid = f"sv{_uid[0]}"
    vb = "-260 -480 520 500" if cid != "bulut" else "-180 -200 360 240"
    if tight and cid != "bulut":
        vb = "-200 -470 400 480"
    return (
        f'<svg id="{uid}" xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{width or size}" height="{size}">'
        f'<style>{scope_css(emotion_css, uid)}</style>{VOL_DEFS}<g filter="url(#bk-drop)">{_styled(SVG_BUILDERS[cid]())}</g></svg>'
    )


# Statik görseller (kart, kapak) için ifadeleri CSS ile ayarlama
EMOTION_CSS = {
    "happy": "",
    "excited": ".eyes-open{opacity:0}.eyes-happy{opacity:1}.m-smile{opacity:0}.m-grin{opacity:1}",
    "laughing": ".eyes-open{opacity:0}.eyes-happy{opacity:1}.m-smile{opacity:0}.m-grin{opacity:1}",
    "surprised": ".m-smile{opacity:0}.m-o{opacity:1}.brow-l{transform:translateY(-10px)}.brow-r{transform:translateY(-10px)}",
    "sad": ".m-smile{opacity:0}.m-sad{opacity:1}.brow-l{transform:rotate(-14deg);transform-box:fill-box;transform-origin:center}.brow-r{transform:rotate(14deg);transform-box:fill-box;transform-origin:center}",
    "sleepy": ".eyes-open{opacity:0}.eyes-closed{opacity:1}.m-smile{opacity:0}.m-o{opacity:1}",
    "grumpy": ".m-smile{opacity:0}.m-flat{opacity:1}.brow-l{transform:rotate(16deg);transform-box:fill-box;transform-origin:center}.brow-r{transform:rotate(-16deg);transform-box:fill-box;transform-origin:center}",
    "thinking": ".m-smile{opacity:0}.m-flat{opacity:1}.brow-l{transform:translateY(-10px)}",
    "shy": ".eyes-open{opacity:0}.eyes-happy{opacity:1}.cheeks{transform:scale(1.25);transform-box:fill-box;transform-origin:center}",
    "scared": ".m-smile{opacity:0}.m-o{opacity:1}.brow-l{transform:translateY(-12px) rotate(-10deg)}.brow-r{transform:translateY(-12px) rotate(10deg)}",
    "calm": ".eyes-open{opacity:0}.eyes-closed{opacity:1}",
    "talking": ".m-smile{opacity:0}.m-open{opacity:1}",
}


def bible() -> dict:
    """Karakter kitabı (JSON olarak kaydedilir ve LLM istemlerine verilir)."""
    return {
        cid: {
            "name": ch.name, "species": ch.species, "colors": ch.colors, "personality": ch.personality,
            "voice": ch.voice, "speech_style": ch.speech_style, "traits": ch.traits, "role": ch.role,
            "catchphrase": ch.catchphrase, "looks": ch.looks, "emotions": ch.emotions,
        }
        for cid, ch in CHARACTERS.items()
    }
