"""Kanal markası: isim seçimi, renkler, logo, profil, banner, açıklama, oynatma listeleri."""
from __future__ import annotations

import json
import re
import unicodedata

from loguru import logger

from . import db
from .characters import EMOTION_CSS, SVG_BUILDERS, bible, standalone_svg
from .config import Paths
from .render_static import html_page, render_many
from .world import background_svg

PALETTE = {
    "sky": "#4FC3F7", "sun": "#FFD54F", "coral": "#FF7A59", "leaf": "#66BB6A",
    "lavender": "#B39DDB", "pink": "#FF9EC7", "cream": "#FFF8E7", "ink": "#2B2D42",
}

# Bilinen çocuk markaları (taklit/çakışma kontrolü için; tam liste değildir)
KNOWN_BRANDS = [
    "pepee", "niloya", "rafadan", "kukuli", "kral şakir", "elif", "bebiko", "cocomelon", "peppa", "paw patrol",
    "bluey", "masha", "pinkfong", "baby shark", "little baby bum", "super simple", "dıdıdı", "dididi", "caillou",
    "tayo", "robocar", "larva", "cicibiciler", "bulmaca", "akıllı tavşan momo", "momo", "pırıl", "keloğlan",
    "trt çocuk", "minika", "cartoon network", "disney", "nick jr", "smurf", "şirin", "barbapapa", "teletabi",
]

CANDIDATES = [
    ("Bulutkent", "Bulutların altında neşeli bir kasaba; dünya kurgusuna ve maskota doğrudan bağlanır."),
    ("Zıpzıp Vadisi", "Hareket ve neşe çağrıştırır; Türkçe karakterler uluslararası kullanımda zorlayabilir."),
    ("Pofidu", "Uydurma, sevimli ses; anlamı yok, marka hikâyesi kurmak zor."),
    ("Cıvıltı Tepesi", "Kuş sesleri ve neşe; 'ı' harfi arama/handle için zor."),
    ("Mırmır Köyü", "Sevimli ama kedi odaklı algılanabilir."),
    ("Tıpış Orman", "Küçük adımlar; ormanla sınırlı bir dünya çağrıştırır."),
    ("Neşe Ağacı", "Anlamlı ama genel bir ifade; ayırt ediciliği düşük."),
    ("Pıtpıt Kasabası", "Ritmik ve komik; uzun ve 'ı' içeriyor."),
    ("Lumbik", "Kısa, uydurma, uluslararası; anlamı yok."),
    ("Fındıkköy Dostları", "Sıcak ve yerel; uzun, telaffuzu küçükler için zor olabilir."),
    ("Minik Bulutlar", "Anlaşılır ama genel/tanımlayıcı; markalaşması zor."),
    ("Hoplahop", "Enerjik, kısa; anlamı belirsiz."),
]


def _ascii(s: str) -> str:
    table = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    return unicodedata.normalize("NFKD", s.translate(table)).encode("ascii", "ignore").decode()


def _syllables(s: str) -> int:
    return len(re.findall(r"[aeıioöuüAEIİOÖUÜ]", s))


def score_name(name: str) -> dict:
    low = name.lower()
    conflict = [b for b in KNOWN_BRANDS if b in low or low in b]
    syl = _syllables(name)
    words = len(name.split())
    special = sum(ch in "çğıöşüÇĞİÖŞÜ" for ch in name)
    score = {
        "telaffuz (hece sayısı)": max(0, 25 - max(0, syl - 3) * 6),
        "akılda kalıcılık (kısalık)": max(0, 20 - max(0, len(name) - 8) * 2 - (words - 1) * 4),
        "uluslararası / handle uygunluğu": max(0, 15 - special * 5),
        "marka hikâyesine uygunluk": 20 if any(k in low for k in ("bulut", "kent", "vadi", "köy", "orman", "tepe")) else 8,
        "özgünlük (bilinen markalarla çakışma yok)": 0 if conflict else 20,
    }
    return {"name": name, "total": sum(score.values()), "detail": score, "conflicts": conflict, "handle": "@" + _ascii(name).replace(" ", "").lower()}


def choose_name() -> dict:
    scored = [dict(score_name(n), rationale=r) for n, r in CANDIDATES]
    scored.sort(key=lambda x: -x["total"])
    return {"candidates": scored, "chosen": scored[0],
            "note": "Bu ön elemedir. YouTube'da aynı isimli kanal araması ve marka tescil sorgusu (TÜRKPATENT) "
                    "Google bağlantısı kurulunca `python main.py --mode brand --check-names` ile yapılır."}


def brand_kit() -> dict:
    pick = choose_name()
    name = pick["chosen"]["name"]
    kit = {
        "name": name,
        "handle": pick["chosen"]["handle"],
        "slogan": "Merakla öğren, neşeyle büyü!",
        "concept": (
            f"{name}, kabarık bulutların altında kurulmuş renkli bir kasabadır. Anlatıcı ve maskot Bulut her bölümde "
            "kasabanın üstünden süzülür ve dört arkadaşın (Pofi, Lili, Tombi, Bobo) günlük maceralarını anlatır. "
            "Her bölüm tek bir öğrenme hedefi (renk, sayı, şekil, paylaşma, duygu, uyku rutini) ve sıcak bir son içerir. "
            "Görsel dil: yuvarlak hatlar, kalın konturlar, yumuşak gölgeler, yüksek kontrastlı ama göz yormayan pastel-canlı renkler."
        ),
        "audience": "2-8 yaş çocuklar ve ebeveynleri (Türkçe)",
        "palette": PALETTE,
        "fonts": {"display": "Baloo 2 ExtraBold (SIL OFL)", "text": "Nunito Black (SIL OFL)"},
        "description": (
            f"{name}'e hoş geldiniz! ☁️\n\n"
            "Pofi, Lili, Tombi ve Bobo ile her hafta yeni maceralar: renkler, sayılar, şekiller, paylaşma, arkadaşlık, "
            "bilmeceler, ritimli şarkılar ve uyku öncesi masallar.\n\n"
            "Her bölüm özgündür; 2-8 yaş için sakin tempolu, şiddet ve korku içermeyen, ebeveynlerin gönül rahatlığıyla "
            "izletebileceği şekilde hazırlanır.\n\n"
            "Yeni 3D bölümler: Salı ve Pazar 18:00 · Kısa videolar her gün.\n\n"
            "Not: Hikâyeler, animasyonlar ve seslendirmeler yapay zekâ destekli araçlarla üretilir ve yayın öncesi "
            "çocuk güvenliği kontrolünden geçirilir."
        ),
        "keywords": ["çocuk çizgi film", "çocuk masalları", "renkleri öğreniyorum", "sayıları öğreniyorum",
                     "şekiller", "uyku masalı", "okul öncesi", "Türkçe çocuk videoları", name],
        "playlists": [
            {"key": "colors_shapes", "title": "Renkler ve Şekiller", "categories": ["colors", "shapes"]},
            {"key": "numbers", "title": "Sayılar ve Sayma", "categories": ["numbers"]},
            {"key": "friendship", "title": "Arkadaşlık ve Paylaşma", "categories": ["friendship", "sharing"]},
            {"key": "animals", "title": "Hayvan Maceraları", "categories": ["animal_adventure", "funny"]},
            {"key": "riddles", "title": "Eğlenceli Bilmeceler", "categories": ["riddles"]},
            {"key": "songs", "title": "Ritimler ve Şarkılar", "categories": ["songs"]},
            {"key": "bedtime", "title": "Uyku Öncesi Masallar", "categories": ["bedtime"]},
            {"key": "educational", "title": "Eğitici Hikâyeler", "categories": ["educational"]},
            {"key": "shorts", "title": f"{name} Kısa Maceralar", "categories": ["shorts"]},
        ],
        "homepage_layout": [
            "1. Kanal fragmanı (abone olmayanlar için): en iyi performanslı uzun bölüm",
            "2. Öne çıkan bölüm (aboneler için): en yeni uzun bölüm",
            "3. Raf: Yeni Bölümler (son yüklemeler)",
            "4. Raf: Uyku Öncesi Masallar (akşam izlenmesi için)",
            "5. Raf: Renkler ve Şekiller",
            "6. Raf: Sayılar ve Sayma",
            "7. Raf: Arkadaşlık ve Paylaşma",
            "8. Raf: Kısa Maceralar (Shorts)",
            "9. Raf: En Popüler (analitik verisi oluştukça)",
        ],
        "name_research": pick,
        "youtube_specs": {
            "banner": "2560x1440 px, güvenli alan 1546x423 (tüm cihazlarda görünür), en fazla 6 MB",
            "profile": "800x800 px, 98x98 px'de daire olarak gösterilir",
            "thumbnail": "1280x720 px, 16:9, en fazla 2 MB (JPG/PNG)",
            "watermark": "150x150 px önerilir",
        },
    }
    return kit


def _wordmark_svg(name: str, size: int = 150) -> str:
    colors = [PALETTE["coral"], PALETTE["sun"], PALETTE["leaf"], PALETTE["sky"], PALETTE["lavender"], PALETTE["pink"]]
    spans = "".join(f'<tspan fill="{colors[i % len(colors)]}">{ch}</tspan>' for i, ch in enumerate(name))
    return (
        f'<text x="50%" y="{size}" text-anchor="middle" font-family="&quot;Baloo 2&quot;" font-weight="800" font-size="{size}" '
        f'stroke="#2B2D42" stroke-width="{size*0.16:.0f}" stroke-linejoin="round" paint-order="stroke" letter-spacing="2">{spans}</text>'
    )


def _mascot(width: int, emotion: str = "excited") -> str:
    return standalone_svg("bulut", int(width * 240 / 360), EMOTION_CSS[emotion], width=width)


def build_assets(kit: dict) -> dict:
    name, slogan = kit["name"], kit["slogan"]
    out = {}
    jobs = []

    # Logo (şeffaf) — maskot + çok renkli yazı
    logo_html = html_page(
        f'<div style="width:1600px;height:900px;display:flex;flex-direction:column;align-items:center;justify-content:center">'
        f'{_mascot(560)}<svg width="1600" height="230" style="margin-top:-30px">{_wordmark_svg(name, 190)}</svg></div>',
        1600, 900, transparent=True)
    jobs.append((logo_html, 1600, 900, Paths.logos / "logo.png"))
    out["logo"] = "logos/logo.png"

    # Kare logo / filigran (150x150 kullanım için 600 render)
    wm_html = html_page(
        f'<div style="width:600px;height:600px;border-radius:50%;background:{PALETTE["sky"]};display:flex;align-items:center;justify-content:center;border:24px solid #fff">'
        f'{_mascot(480)}</div>', 600, 600, transparent=True)
    jobs.append((wm_html, 600, 600, Paths.logos / "watermark.png"))
    out["watermark"] = "logos/watermark.png"

    # Profil fotoğrafı 800x800 (dairesel kırpmaya uygun; kenarlarda önemli öğe yok)
    prof_html = html_page(
        f'<div style="width:800px;height:800px;background:radial-gradient(circle at 50% 45%,#BDEBFF 0,#4FC3F7 60%,#1E9BD7 100%);'
        f'display:flex;align-items:center;justify-content:center">'
        f'<div style="margin-top:40px">{_mascot(620)}</div></div>', 800, 800)
    jobs.append((prof_html, 800, 800, Paths.brand / "profile_800.png"))
    out["profile"] = "brand/profile_800.png"

    # Banner 2560x1440, güvenli alan 1546x423 ortada
    chars = "".join(
        f'<div style="position:absolute;left:{x}px;top:{y}px">{standalone_svg(cid, h, EMOTION_CSS["happy"])}</div>'
        for cid, x, y, h in [("pofi", 515, 610, 320), ("lili", 1735, 610, 320), ("tombi", 250, 790, 300), ("bobo", 2040, 770, 320)]
    )
    banner_html = html_page(
        f'<div style="position:relative;width:2560px;height:1440px;overflow:hidden">'
        f'<svg width="2560" height="1440" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0">{background_svg("meadow", 7)}</svg>'
        f'{chars}'
        f'<div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;display:flex;flex-direction:column;align-items:center;justify-content:center">'
        f'<div style="display:flex;align-items:center;gap:0px"><div>{_mascot(230)}</div>'
        f'<svg width="660" height="190">{_wordmark_svg(name, 150)}</svg></div>'
        f'<div style="font-family:Nunito;font-weight:900;font-size:50px;color:#fff;background:{PALETTE["coral"]};padding:6px 40px;border-radius:50px;'
        f'border:6px solid #fff;box-shadow:0 8px 0 rgba(0,0,0,.12);margin-top:-6px">{slogan}</div></div></div>',
        2560, 1440)
    jobs.append((banner_html, 2560, 1440, Paths.banners / "banner_2560x1440.png"))
    out["banner"] = "banners/banner_2560x1440.png"

    # Güvenli alan önizlemesi (kontrol amaçlı)
    safe_html = banner_html.replace(
        "</body>",
        '<div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;border:6px dashed #E53935"></div>'
        '<div style="position:absolute;left:0;top:0;width:2560px;height:1440px;border:6px dashed #1E88E5;box-sizing:border-box"></div></body>')
    jobs.append((safe_html, 2560, 1440, Paths.banners / "banner_safe_area_preview.png"))
    out["banner_safe_preview"] = "banners/banner_safe_area_preview.png"

    # Karakter kartları (her karakter için ifadeler)
    for cid in ["pofi", "lili", "tombi", "bobo", "bulut"]:
        emos = ["happy", "excited", "laughing", "surprised", "sad", "thinking", "sleepy", "grumpy", "shy", "talking"]
        cells = "".join(
            f'<div style="text-align:center">{standalone_svg(cid, 300, EMOTION_CSS[e])}'
            f'<div style="font:900 30px Nunito;color:#2B2D42">{e}</div></div>' for e in emos)
        b = bible()[cid]
        sheet = html_page(
            f'<div style="width:1920px;height:1080px;background:{PALETTE["cream"]};padding:30px 50px">'
            f'<div style="font:800 76px \'Baloo 2\';color:{b["colors"]["main"] if cid!="bulut" else PALETTE["sky"]};-webkit-text-stroke:3px #2B2D42">{b["name"]} '
            f'<span style="font:900 34px Nunito;color:#2B2D42;-webkit-text-stroke:0">— {b["species"]} · "{b["catchphrase"]}"</span></div>'
            f'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px">{cells}</div></div>', 1920, 1080)
        jobs.append((sheet, 1920, 1080, Paths.characters / f"{cid}_sheet.png"))
        jobs.append((html_page(standalone_svg(cid, 1024, ""), 1024, 1024, transparent=True), 1024, 1024, Paths.characters / f"{cid}.png"))
        (Paths.characters / f"{cid}.svg").write_text(standalone_svg(cid, 1024, ""), encoding="utf-8")

    # Toplu kadro
    lineup = "".join(standalone_svg(c, 520, EMOTION_CSS["happy"]) for c in ["pofi", "lili", "tombi", "bobo"])
    jobs.append((html_page(
        f'<div style="width:1920px;height:1080px;position:relative">'
        f'<svg width="1920" height="1080" style="position:absolute">{background_svg("village", 3)}</svg>'
        f'<div style="position:absolute;top:60px;left:0;right:0;display:flex;justify-content:center">{_mascot(330)}</div>'
        f'<div style="position:absolute;bottom:40px;left:0;right:0;display:flex;justify-content:center;gap:0">{lineup}</div></div>', 1920, 1080),
        1920, 1080, Paths.characters / "lineup.png"))

    render_many(jobs[:3] , transparent=True)
    render_many(jobs[3:])
    return out


def run() -> dict:
    Paths.ensure()
    kit = brand_kit()
    assets = build_assets(kit)
    kit["assets"] = assets
    (Paths.brand / "brand.json").write_text(json.dumps(kit, ensure_ascii=False, indent=2), encoding="utf-8")
    (Paths.characters / "bible.json").write_text(json.dumps(bible(), ensure_ascii=False, indent=2), encoding="utf-8")
    db.kv_set("brand", kit)
    for p in assets.values():
        db.insert("licenses", created_at=db.now(), asset_path=p, kind="brand", source="Bulutkent stüdyosu (prosedürel üretim)",
                  license="Özgün eser - kanal sahibine ait", author="studio", url="")
    logger.info(f"Marka hazır: {kit['name']} ({len(assets)} görsel + karakter kartları)")
    return kit


def load() -> dict:
    kit = db.kv_get("brand")
    if not kit and (Paths.brand / "brand.json").exists():
        kit = json.loads((Paths.brand / "brand.json").read_text(encoding="utf-8"))
    return kit or {}
