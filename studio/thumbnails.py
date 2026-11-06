"""Kapak tasarımı: her video için 3 konsept, ölçülebilir kriterlerle en iyisinin seçimi.

Seçim puanı sezgiseldir (renk canlılığı, kontrast, küçük ekranda okunabilirlik, karakter
alanı); gerçek tıklanma oranını tahmin etmez. YouTube verisi geldikçe analytics modülü
hangi konseptin daha iyi çalıştığını öğrenir (learnings tablosu).
"""
from __future__ import annotations

import html
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from .brand import PALETTE
from .characters import EMOTION_CSS, standalone_svg
from .render_static import html_page, render_many
from .world import background_svg, prop_svg


STOP = {"ve", "ile", "bir", "mi", "mı", "de", "da", "ki", "için", "en", "çok"}
NAMES = {"pofi", "lili", "tombi", "bobo", "bulut", "tombi'nin", "bobo'nun", "pofi'nin", "lili'nin"}


def tr_upper(s: str) -> str:
    return s.replace("i", "İ").replace("ı", "I").upper()


def short_text(title: str, max_words: int = 3, thumb_text: str | None = None) -> str:
    if thumb_text:
        return thumb_text
    part = title.split(":", 1)[1] if ":" in title else title
    words = [w for w in re.sub(r"[!?.,]", "", part).split()]
    core = [w for w in words if w.lower() not in STOP and w.lower() not in NAMES]
    pick = (core or words)[:max_words]
    return " ".join(pick) + ("!" if title.strip().endswith("!") else "")


def _main_chars(story: dict) -> list[str]:
    counts: dict[str, int] = {}
    for sc in story["scenes"]:
        for b in sc["beats"]:
            if b["speaker"] != "narrator":
                counts[b["speaker"]] = counts.get(b["speaker"], 0) + 1
    ranked = sorted(counts, key=lambda c: -counts[c]) or ["pofi", "lili"]
    return (ranked + ["pofi", "lili"])[:2]


def _first_prop(story: dict) -> dict | None:
    for sc in story["scenes"]:
        if sc.get("props"):
            return sc["props"][0]
    return None


def _text_svg(text: str, size: int, color: str = "#FFFFFF", stroke: int = 14, width: int = 1280, anchor: str = "middle", x: str = "50%") -> str:
    raw = tr_upper(text) if len(text) < 22 else text
    size = min(size, int(width / (0.66 * max(1, len(raw)))))  # metni genişliğe sığdır
    t = html.escape(raw)
    return (f'<svg width="{width}" height="{int(size*1.25)}"><text x="{x}" y="{size}" text-anchor="{anchor}" font-family="&quot;Baloo 2&quot;" '
            f'font-weight="800" font-size="{size}" fill="{color}" stroke="#2B2D42" stroke-width="{stroke}" stroke-linejoin="round" '
            f'paint-order="stroke">{t}</text></svg>')


def concepts(story: dict, w: int = 1280, h: int = 720) -> list[tuple[str, str]]:
    a, b = _main_chars(story)
    text = short_text(story["title"], thumb_text=story.get("thumb_text"))
    prop = _first_prop(story)
    bg = story["scenes"][0]["background"]
    burst = "".join(
        f'<path d="M {w/2} {h/2} L {w/2 + 2000*np.cos(np.radians(i*15)):.0f} {h/2 + 2000*np.sin(np.radians(i*15)):.0f} '
        f'L {w/2 + 2000*np.cos(np.radians(i*15+7.5)):.0f} {h/2 + 2000*np.sin(np.radians(i*15+7.5)):.0f} Z" fill="#fff" opacity=".18"/>'
        for i in range(24))
    portrait = h > w
    big = int(h * (0.55 if portrait else 0.98))
    duo = 0.5 if portrait else 0.8
    tsize = int(w * (0.12 if portrait else 0.085))
    prop_html = ""
    if prop:
        ps = int(min(w, h) * 0.42)
        prop_html = (f'<svg width="{ps}" height="{ps}" viewBox="-90 -90 180 180">'
                     f'{prop_svg(prop["kind"], prop["color"], None, 1.0)}</svg>')

    # A: kahraman yakın plan + güçlü ifade
    A = (f'<div style="position:relative;width:{w}px;height:{h}px;overflow:hidden;background:radial-gradient(circle at 35% 50%,#FFE58A,{PALETTE["coral"]})">'
         f'<svg width="{w}" height="{h}" style="position:absolute">{burst}</svg>'
         f'<div style="position:absolute;left:{-int(w*0.02) if not portrait else int(w*0.0)}px;bottom:{-int(h*0.05)}px">{standalone_svg(a, big, EMOTION_CSS["excited"], tight=True)}</div>'
         f'<div style="position:absolute;right:{int(w*0.03)}px;top:{int(h*0.18) if not portrait else int(h*0.08)}px;width:{int(w*0.55) if not portrait else int(w*0.94)}px;'
         f'transform:rotate(-4deg)">{_text_svg(text, int(tsize*(0.82 if not portrait else 1.0)), "#FFFFFF", 16, int(w*0.55) if not portrait else int(w*0.94))}</div>'
         + (f'<div style="position:absolute;right:{int(w*0.06)}px;{"top:" + str(int(h*0.17)) if portrait else "bottom:" + str(int(h*0.06))}px">{prop_html}</div>' if prop_html else "")
         + "</div>")
    # B: iki karakter tepkisi + ortada nesne
    B = (f'<div style="position:relative;width:{w}px;height:{h}px;overflow:hidden;background:linear-gradient(160deg,{PALETTE["sky"]},#B3E5FC)">'
         f'<svg width="{w}" height="{h}" style="position:absolute">{burst}</svg>'
         f'<div style="position:absolute;left:{int(w*0.0)}px;bottom:{-int(h*0.06)}px">{standalone_svg(a, int(big*duo), EMOTION_CSS["surprised"], tight=True)}</div>'
         f'<div style="position:absolute;right:{int(w*0.0)}px;bottom:{-int(h*0.06)}px">{standalone_svg(b, int(big*duo), EMOTION_CSS["excited"], tight=True)}</div>'
         + (f'<div style="position:absolute;left:{int(w/2 - min(w, h)*0.21)}px;top:{int(h*(0.2 if portrait else 0.36))}px">{prop_html}</div>' if prop_html else "")
         + f'<div style="position:absolute;left:0;right:0;top:{int(h*0.03)}px">{_text_svg(text, int(tsize*0.95), PALETTE["sun"], 16, w)}</div></div>')
    # C: sahne arka planı + karakterler + bant başlık
    C = (f'<div style="position:relative;width:{w}px;height:{h}px;overflow:hidden">'
         f'<svg width="{w}" height="{h}" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style="position:absolute">{background_svg(bg, 11)}</svg>'
         f'<div style="position:absolute;left:{int(w*(0.0 if portrait else 0.08))}px;bottom:{int(h*0.02)}px">{standalone_svg(a, int(big*duo), EMOTION_CSS["laughing"], tight=True)}</div>'
         f'<div style="position:absolute;right:{int(w*(0.0 if portrait else 0.08))}px;bottom:{int(h*0.02)}px">{standalone_svg(b, int(big*duo*0.9), EMOTION_CSS["happy"], tight=True)}</div>'
         f'<div style="position:absolute;left:0;right:0;top:{int(h*0.04)}px;display:flex;justify-content:center">'
         f'<div style="background:{PALETTE["coral"]};border:8px solid #fff;border-radius:60px;padding:0 30px">{_text_svg(text, int(tsize*0.8), "#fff", 12, int(w*0.8))}</div></div></div>')
    return [("hero_closeup", A), ("duo_reaction", B), ("scene_banner", C)]


def score(path: Path) -> dict:
    img = cv2.imread(str(path))
    b, g, r = [c.astype(float) for c in cv2.split(img)]
    rg, yb = np.abs(r - g), np.abs(0.5 * (r + g) - b)
    colorful = np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    contrast = gray.std()
    small = cv2.resize(gray, (168, 94), interpolation=cv2.INTER_AREA)  # mobil küçük önizleme
    edges = cv2.Canny(small, 80, 160).mean() / 255
    s = {
        "renk_canlılığı": round(min(1.0, colorful / 90), 3),
        "kontrast": round(min(1.0, contrast / 75), 3),
        "mobil_netlik": round(min(1.0, edges / 0.18), 3),
        "boyut_mb": round(path.stat().st_size / 1e6, 2),
    }
    s["toplam"] = round(100 * (0.4 * s["renk_canlılığı"] + 0.3 * s["kontrast"] + 0.3 * s["mobil_netlik"]), 1)
    return s


def make(story: dict, out_dir: Path, portrait: bool = False, prefix: str = "thumb") -> dict:
    w, h = (1080, 1920) if portrait else (1280, 720)
    out_dir.mkdir(parents=True, exist_ok=True)
    cs = concepts(story, w, h)
    jobs = [(html_page(body, w, h), w, h, out_dir / f"{prefix}_{name}.png") for name, body in cs]
    render_many(jobs)
    results = []
    for (name, _), (_, _, _, p) in zip(cs, jobs):
        # 2 MB sınırı: gerekirse JPEG'e dönüştür
        if p.stat().st_size > 1.9e6:
            jp = p.with_suffix(".jpg")
            Image.open(p).convert("RGB").save(jp, quality=90)
            p.unlink(); p = jp
        results.append({"concept": name, "path": str(p), "score": score(p)})
    best = max(results, key=lambda r: r["score"]["toplam"])
    return {"best": best["path"], "best_concept": best["concept"], "candidates": results}
