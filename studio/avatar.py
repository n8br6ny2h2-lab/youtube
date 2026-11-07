"""Gece Kütüphanesi'nin sunucusu: Bilge, gözlüklü kütüphaneci baykuş (kanala özgü, özgün vektör çizim).

Konuşurken ağzı (gagası) sese göre açılır, ara sıra göz kırpar ve hafifçe nefes alır gibi süzülür.
Kareler başsız Chrome ile PNG olarak bir kez çizilir; video sırasında ses düzeyine göre doğru kare seçilir
ve saydam bir katman olarak görüntünün köşesine bindirilir (ffmpeg overlay).
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np

from . import audio
from .config import Paths
from .render_static import html_page, render_many

NAME = "Bilge"
SIZE = 640  # kare PNG boyutu
FPS = 30

FEATHER, BELLY, DARK, AMBER, INK, MOON = "#5B4A7A", "#E9DCC3", "#3E3258", "#F2B866", "#1A1426", "#F7E7C6"


def _owl(mouth: float = 0.0, eyes: float = 1.0) -> str:
    """mouth: 0 kapalı .. 1 açık; eyes: 1 açık .. 0 kapalı."""
    ey = 10 * max(0.06, eyes)
    beak_open = 22 * mouth
    lid = "" if eyes > 0.5 else (
        f'<path d="M118 196 q38 -22 76 0 M318 196 q38 -22 76 0" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/>')
    pupils = "" if eyes <= 0.5 else (
        f'<ellipse cx="160" cy="200" rx="22" ry="{2.2 * ey:.1f}" fill="{INK}"/><ellipse cx="352" cy="200" rx="22" ry="{2.2 * ey:.1f}" fill="{INK}"/>'
        '<circle cx="168" cy="190" r="7" fill="#fff"/><circle cx="360" cy="190" r="7" fill="#fff"/>')
    return f'''<svg width="{SIZE}" height="{SIZE}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
<defs>
 <radialGradient id="fb" cx="45%" cy="30%" r="75%"><stop offset="0" stop-color="#7A68A0"/><stop offset="1" stop-color="{FEATHER}"/></radialGradient>
 <radialGradient id="bl" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF6E4"/><stop offset="1" stop-color="{BELLY}"/></radialGradient>
 <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="8"/><feOffset dy="6"/>
  <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<g filter="url(#sh)">
 <path d="M150 120 L120 40 L210 100 Z" fill="{DARK}"/><path d="M362 120 L392 40 L302 100 Z" fill="{DARK}"/>
 <ellipse cx="256" cy="300" rx="190" ry="200" fill="url(#fb)"/>
 <path d="M70 300 Q40 380 120 450 Q100 370 120 300 Z" fill="{DARK}"/><path d="M442 300 Q472 380 392 450 Q412 370 392 300 Z" fill="{DARK}"/>
 <ellipse cx="256" cy="360" rx="120" ry="125" fill="url(#bl)"/>
 <path d="M200 330 q12 10 24 0 M240 345 q12 10 24 0 M280 330 q12 10 24 0 M215 380 q12 10 24 0 M265 380 q12 10 24 0 M240 415 q12 10 24 0"
       stroke="#CDBB98" stroke-width="5" fill="none" stroke-linecap="round"/>
 <circle cx="160" cy="200" r="70" fill="{MOON}"/><circle cx="352" cy="200" r="70" fill="{MOON}"/>
 {pupils}{lid}
 <circle cx="160" cy="200" r="78" fill="none" stroke="{AMBER}" stroke-width="10"/>
 <circle cx="352" cy="200" r="78" fill="none" stroke="{AMBER}" stroke-width="10"/>
 <path d="M238 200 Q256 184 274 200" stroke="{AMBER}" stroke-width="10" fill="none"/>
 <ellipse cx="256" cy="{262 + beak_open * 0.55:.1f}" rx="{10 + beak_open * 0.6:.1f}" ry="{max(0.5, beak_open * 0.75):.1f}" fill="#5A2A2A"/>
 <path d="M240 {260 + beak_open:.1f} L272 {260 + beak_open:.1f} L256 {278 + beak_open * 1.3:.1f} Z" fill="#D9963F"/>
 <path d="M232 246 L280 246 L256 272 Z" fill="{AMBER}"/>
 <rect x="150" y="440" width="212" height="46" rx="8" fill="#2C4A6B"/><rect x="150" y="440" width="212" height="10" rx="5" fill="#3D6390"/>
 <path d="M165 486 L165 452 M347 486 L347 452" stroke="{AMBER}" stroke-width="4"/>
 <path d="M195 448 q18 -26 36 0 M281 448 q18 -26 36 0" fill="{DARK}"/>
</g></svg>'''


STATES = {  # ad -> (ağız, göz)
    "m0": (0.0, 1.0), "m1": (0.45, 1.0), "m2": (0.9, 1.0), "blink": (0.0, 0.0), "m1b": (0.45, 0.0),
}


def frames(out_dir: Path | None = None) -> dict[str, Path]:
    out_dir = out_dir or (Paths.images / "avatar")
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = {k: out_dir / f"bilge_{k}.png" for k in STATES}
    jobs = [(html_page(_owl(*STATES[k]), SIZE, SIZE, transparent=True), SIZE, SIZE, p) for k, p in paths.items() if not p.exists()]
    if jobs:
        render_many(jobs, transparent=True)
    return paths


def portrait(path: Path, size: int = 800, bg: str = "#0E1A2B") -> Path:
    """Profil/kapak için arka planlı portre."""
    from .render_static import render
    html = html_page(f'<div style="width:{size}px;height:{size}px;background:radial-gradient(circle at 50% 40%,#1B2A41,{bg});'
                     f'display:flex;align-items:center;justify-content:center">{_owl(0.0, 1.0).replace(f"width=\"{SIZE}\" height=\"{SIZE}\"", f"width=\"{int(size*0.82)}\" height=\"{int(size*0.82)}\"")}</div>',
                     size, size)
    return render(html, size, size, path)


def track(voice_wav: Path, seconds: float, out: Path, size: int, seed: int = 1) -> Path:
    """Sesten ağız hareketli avatar için kare listesi (ffmpeg concat) üretir; overlay_filter ile birlikte kullanılır."""
    sig = audio.read_mono(voice_wav)
    sr = audio.SR
    hop = sr // FPS
    n = int(seconds * FPS)
    rms = np.array([float(np.sqrt(np.mean(sig[i * hop:(i + 1) * hop] ** 2))) if i * hop < len(sig) else 0.0 for i in range(n)])
    ref = np.percentile(rms[rms > 1e-4], 90) if np.any(rms > 1e-4) else 1.0
    lvl = np.clip(rms / max(ref, 1e-6), 0, 1)
    rng = np.random.default_rng(seed)
    blink = np.zeros(n, bool)
    t = int(rng.integers(60, 150))
    while t < n:
        blink[t:t + 4] = True
        t += int(rng.integers(90, 200))
    states = []
    for i in range(n):
        m = "m2" if lvl[i] > 0.55 else "m1" if lvl[i] > 0.18 else "m0"
        if blink[i]:
            m = "m1b" if m != "m0" else "blink"
        states.append(m)
    p = frames()
    lst = out.with_suffix(".txt")
    lines, cur, run = [], states[0] if states else "m0", 0
    for s in states + ["__end"]:
        if s == cur:
            run += 1
            continue
        lines.append(f"file '{p[cur]}'\nduration {run / FPS:.4f}")
        cur, run = s, 1
    lines.append(f"file '{p[states[-1] if states else 'm0']}'")
    lst.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return lst


def overlay_filter(size: int) -> str:
    """Kare listesinden (concat) gelen avatar akışına uygulanacak süzgeç: ölçek + hafif süzülme (nefes); saydamlık korunur.
    Ara video dosyası üretilmez (4K'da GB'larca yer tutuyordu)."""
    return (f"fps={FPS},scale={size}:{size}:flags=lanczos,format=rgba,"
            f"pad=iw:ih+24:0:12:color=0x00000000,crop=iw:ih-24:0:'12+10*sin(2*PI*t/5)'")
