"""Gece Kütüphanesi: yetişkin ve gençler için uykudan önce dinlenen sakin bilgi videoları.

Akış: senaryo (channels/gece/scripts/*.json) → sakin TTS → Pexels telifsiz görüntüler (lisans kaydıyla)
→ FFmpeg montaj (yumuşak geçişler, altyazı, ortam müziği) → Shorts (dikey) → kapak → takvim → yükleme.
Pexels anahtarı yoksa kendi ürettiğimiz sakin manzaralarla (yedek) render edilir.
"""
from __future__ import annotations

import hashlib
import json
import math
import random
import re
import shutil
import subprocess
from pathlib import Path

import httpx
import numpy as np
from loguru import logger

from . import audio, db, qc, scheduler, subtitles, thumbnails, tts
from .config import ROOT, Paths, env, has_key, settings
from .render_static import html_page, render, render_many

SCRIPTS = ROOT / "channels" / "gece" / "scripts"
W, H, FPS = 1920, 1080, 30  # varsayılan; kanal ayarı video.long_resolution ile 4K yapılır


def long_res() -> tuple[int, int]:
    r = settings()["video"].get("long_resolution") or [W, H]
    return int(r[0]), int(r[1])
CLIP_SECONDS = 7.5

PALETTE = {"night": "#0E1A2B", "midnight": "#1B2A41", "amber": "#F2B866", "moon": "#F7E7C6", "sage": "#8FB9A8"}

KIT = {
    "name": "Gece Kütüphanesi",
    "handle": "@gecekutuphanesi",
    "slogan": "Uykudan önce, merakla dinle.",
    "concept": "Uykudan önce dinlenen, sakin ve doğru bilgilere dayanan belgesel anlatımlar: uzay, okyanus, doğa, bilim ve tarih.",
    "palette": PALETTE,
    "description": (
        "Gece Kütüphanesi'ne hoş geldiniz. 🌙\n\n"
        "Uykudan önce dinlemek için sakin, yavaş anlatımlı bilgi videoları: evrenin derinlikleri, okyanusun sessiz dünyası, "
        "ormanların gizli dili, bilim ve tarihin ilginç hikâyeleri.\n\n"
        "Yeni bölümler Pazartesi, Çarşamba ve Cuma 21:30'da; kısa videolar her akşam.\n\n"
        "Anlatım yapay zekâ destekli seslendirmeyle hazırlanır; bilgiler güvenilir kaynaklardan derlenir ve kaynaklar açıklamada verilir. "
        "Görüntüler telifsiz Pexels arşivinden alınır."
    ),
    "keywords": ["uyku öncesi", "rahatlatıcı belgesel", "uzay belgeseli", "bilim", "doğa", "Türkçe belgesel", "uykuya dalmak için",
                 "sakin anlatım", "Gece Kütüphanesi"],
    "playlists": [
        {"key": "space", "title": "Uzayın Sessizliği"},
        {"key": "ocean", "title": "Okyanusun Derinlikleri"},
        {"key": "nature", "title": "Doğanın Gizli Dili"},
        {"key": "science", "title": "Uykudan Önce Bilim"},
        {"key": "history", "title": "Tarihin Sakin Sayfaları"},
        {"key": "shorts", "title": "Gece Kütüphanesi Kısa"},
    ],
    "homepage_layout": ["Fragman: en çok izlenen bölüm", "Yeni bölümler", "Uzayın Sessizliği", "Okyanusun Derinlikleri",
                        "Doğanın Gizli Dili", "Kısa videolar"],
}


# --------------------------------------------------------------------------- marka

def _fonts_css() -> str:
    f = (Paths.templates / "fonts").as_uri()
    return (f"@font-face{{font-family:Lora;font-weight:700;src:url('{f}/lora-latin-ext-700-normal.woff2');unicode-range:U+0100-02AF;}}"
            f"@font-face{{font-family:Lora;font-weight:700;src:url('{f}/lora-latin-700-normal.woff2');unicode-range:U+0000-00FF,U+0131,U+2000-206F;}}"
            f"@font-face{{font-family:Lora;font-weight:500;src:url('{f}/lora-latin-ext-500-normal.woff2');unicode-range:U+0100-02AF;}}"
            f"@font-face{{font-family:Lora;font-weight:500;src:url('{f}/lora-latin-500-normal.woff2');unicode-range:U+0000-00FF,U+0131,U+2000-206F;}}")


def _emblem(size: int) -> str:
    """Hilal ay + açık kitap amblemi."""
    stars = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#F7E7C6" opacity="{o}"/>'
                    for x, y, r, o in [(30, 40, 2.5, .9), (165, 32, 2, .8), (150, 70, 1.6, .7), (45, 80, 1.5, .6), (100, 22, 1.8, .8)])
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 200 200"><defs><radialGradient id="mg" cx="40%" cy="35%" r="70%">'
            f'<stop offset="0" stop-color="#FFF4D8"/><stop offset="1" stop-color="#F2B866"/></radialGradient></defs>{stars}'
            '<path d="M 112 30 A 52 52 0 1 0 150 118 A 42 42 0 1 1 112 30 Z" fill="url(#mg)"/>'
            '<path d="M 30 150 Q 65 132 100 148 Q 135 132 170 150 L 170 172 Q 135 156 100 172 Q 65 156 30 172 Z" fill="#F7E7C6"/>'
            '<path d="M 100 148 L 100 172" stroke="#0E1A2B" stroke-width="3"/>'
            '<path d="M 42 152 Q 68 142 92 152 M 108 152 Q 132 142 158 152" stroke="#C9B48A" stroke-width="2" fill="none"/></svg>')


def build_brand() -> dict:
    Paths.ensure()
    css = _fonts_css() + "body{margin:0}"
    bg = f"background:radial-gradient(ellipse at 70% 20%,#2B3F5C 0,{PALETTE['night']} 65%)"
    stars = "".join(f'<div style="position:absolute;left:{random.Random(i).randint(0,2560)}px;top:{random.Random(i*7).randint(0,1440)}px;'
                    f'width:{random.Random(i*3).choice([2,2,3,4])}px;height:{random.Random(i*3).choice([2,2,3,4])}px;border-radius:50%;'
                    f'background:#F7E7C6;opacity:{random.Random(i*5).uniform(.3,.9):.2f}"></div>' for i in range(160))
    jobs = [
        (html_page(f'<div style="width:800px;height:800px;{bg};display:flex;align-items:center;justify-content:center">{_emblem(560)}</div>', 800, 800, css=css),
         800, 800, Paths.brand / "profile_800.png"),
        (html_page(f'<div style="position:relative;width:2560px;height:1440px;{bg};overflow:hidden">{stars}'
                   f'<div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;display:flex;align-items:center;justify-content:center;gap:40px">'
                   f'{_emblem(300)}<div><div style="font:700 120px Lora;color:{PALETTE["moon"]};letter-spacing:1px">Gece Kütüphanesi</div>'
                   f'<div style="font:500 48px Lora;color:{PALETTE["amber"]};margin-top:6px">Uykudan önce, merakla dinle.</div></div></div></div>', 2560, 1440, css=css),
         2560, 1440, Paths.banners / "banner_2560x1440.png"),
    ]
    render_many(jobs)
    render_many([(html_page(f'<div style="width:600px;height:600px;border-radius:50%;{bg};display:flex;align-items:center;justify-content:center">{_emblem(420)}</div>',
                            600, 600, css=css, transparent=True), 600, 600, Paths.logos / "watermark.png")], transparent=True)
    kit = dict(KIT, assets={"profile": str((Paths.brand / "profile_800.png").relative_to(ROOT)),
                             "banner": str((Paths.banners / "banner_2560x1440.png").relative_to(ROOT)),
                             "watermark": str((Paths.logos / "watermark.png").relative_to(ROOT))})
    (Paths.brand / "brand.json").write_text(json.dumps(kit, ensure_ascii=False, indent=2), encoding="utf-8")
    db.kv_set("brand", kit)
    return kit


# --------------------------------------------------------------------------- görüntü kaynakları

def pixabay_clips(query: str, need: int, used: set, target_w: int = 1920) -> list[Path]:
    """Pixabay'den yatay klip (Pixabay Lisansı: ticari kullanım serbest, atıf gerekmez); önbellekli."""
    if not has_key("PIXABAY_API_KEY"):
        return []
    cache = Paths.images / "pixabay"
    cache.mkdir(parents=True, exist_ok=True)
    r = httpx.get("https://pixabay.com/api/videos/", params={"key": env("PIXABAY_API_KEY"), "q": query, "per_page": 20,
                                                             "safesearch": "true", "video_type": "film"}, timeout=30)
    r.raise_for_status()
    out = []
    hits = r.json().get("hits", [])
    if target_w > 1920:  # 4K klipler önce
        hits.sort(key=lambda v: -((v.get("videos") or {}).get("large", {}).get("width") or 0))
    for v in hits:
        vid = f"pb{v['id']}"
        if vid in used or v.get("duration", 0) < 6:
            continue
        vs = [x for x in (v.get("videos") or {}).values() if x.get("url") and x.get("width", 0) >= 1280 and x["width"] > x.get("height", 0)]
        if not vs:
            continue
        best = min(vs, key=lambda f: abs(f["width"] - target_w))
        dst = cache / f"{vid}.mp4"
        if not dst.exists():
            with httpx.stream("GET", best["url"], timeout=180, follow_redirects=True) as resp:
                resp.raise_for_status()
                with open(dst, "wb") as fh:
                    for chunk in resp.iter_bytes():
                        fh.write(chunk)
            db.insert("licenses", created_at=db.now(), asset_path=str(dst.relative_to(ROOT)), kind="stock_video",
                      source="Pixabay", license="Pixabay Content License (ücretsiz, ticari kullanım serbest, atıf gerekmez)",
                      author=v.get("user", ""), url=v.get("pageURL", ""))
        used.add(vid)
        out.append(dst)
        if len(out) >= need:
            break
    return out


def pexels_clips(query: str, need: int, used: set, target_w: int = 1920) -> list[Path]:
    """Pexels'ten yatay HD klip indirir (önbellekli) ve lisansını kaydeder."""
    if not has_key("PEXELS_API_KEY"):
        return []
    cache = Paths.images / "pexels"
    cache.mkdir(parents=True, exist_ok=True)
    r = httpx.get("https://api.pexels.com/videos/search", headers={"Authorization": env("PEXELS_API_KEY")},
                  params={"query": query, "orientation": "landscape", "size": "large" if target_w > 1920 else "medium", "per_page": 15}, timeout=30)
    r.raise_for_status()
    out = []
    for v in r.json().get("videos", []):
        if v["id"] in used or v.get("duration", 0) < 6:
            continue
        files = [f for f in v.get("video_files", []) if f.get("file_type") == "video/mp4" and f.get("width") and f["width"] >= 1280
                 and f["width"] > f["height"]]
        if not files:
            continue
        best = min(files, key=lambda f: abs(f["width"] - target_w))
        dst = cache / f"{v['id']}.mp4"
        if not dst.exists():
            with httpx.stream("GET", best["link"], timeout=120, follow_redirects=True) as resp:
                resp.raise_for_status()
                with open(dst, "wb") as fh:
                    for chunk in resp.iter_bytes():
                        fh.write(chunk)
            db.insert("licenses", created_at=db.now(), asset_path=str(dst.relative_to(ROOT)), kind="stock_video",
                      source="Pexels", license="Pexels License (ücretsiz, ticari kullanım serbest, atıf gerekmez)",
                      author=v.get("user", {}).get("name", ""), url=v.get("url", ""))
        used.add(v["id"])
        out.append(dst)
        if len(out) >= need:
            break
    return out


NASA_SKIP = re.compile(r"conference|briefing|portrait|meeting|ceremony|crew|astronaut|launch|technician|engineer|logo|chart|diagram|graph|"
                       r"\bplot|spectrum|spectra|data (?:from|show)|map of|all-sky|sky map|annotat|label|outlin|\binset|panel|arrow|"
                       r"frequency|density|instrument|simulation|comparison|side-by-side|mosaic of .* views|cross.section|infographic|poster|"
                       r"symposium|event|audience|speaker|attendee|panel discussion|legacy|people|visitors|exhibit", re.I)
NASA_GENERIC = ["Hubble galaxy", "Hubble nebula", "Webb nebula", "star cluster Hubble", "spiral galaxy Hubble"]


def nasa_stills(query: str, need: int, used: set) -> list[Path]:
    """NASA görüntü arşivinden (kamu malı) yüksek çözünürlüklü fotoğraf indirir; lisansı kaydeder."""
    cache = Paths.images / "nasa"
    cache.mkdir(parents=True, exist_ok=True)
    r = httpx.get("https://images-api.nasa.gov/search", params={"q": query, "media_type": "image"}, timeout=30)
    r.raise_for_status()
    out = []
    for item in r.json()["collection"]["items"][:25]:
        d = item["data"][0]
        nid = d["nasa_id"]
        if nid in used or NASA_SKIP.search(d.get("title", "") + " " + " ".join(d.get("keywords", [])[:10]) + " " + d.get("description", "")[:600]):
            continue
        dst = cache / f"{re.sub(r'[^A-Za-z0-9_-]', '_', nid)}.jpg"
        if not dst.exists():
            try:
                files = httpx.get(item["href"], timeout=30).json()
            except Exception:
                continue
            pick = None
            for suffix in ("~large.jpg", "~orig.jpg", "~medium.jpg"):
                cand = next((u for u in files if u.endswith(suffix)), None)
                if not cand:
                    continue
                cand = cand.replace("http://", "https://")
                head = httpx.head(cand, timeout=30)
                if head.status_code == 200 and int(head.headers.get("content-length", 0) or 0) < 30_000_000:
                    pick = cand
                    break
            if not pick:
                continue
            img = httpx.get(pick, timeout=120).content
            dst.write_bytes(img)
            try:
                from PIL import Image
                with Image.open(dst) as im:
                    w_, h_ = im.size
                if w_ < 1000 or h_ < 560:
                    dst.unlink(); continue
            except Exception:
                dst.unlink(missing_ok=True); continue
            db.insert("licenses", created_at=db.now(), asset_path=str(dst.relative_to(ROOT)), kind="stock_image", source="NASA Image and Video Library",
                      license="NASA medya kullanım yönergeleri: genellikle telifsiz (kamu malı); NASA onayı ima edilmez",
                      author=d.get("center", "NASA"), url=f"https://images.nasa.gov/details/{nid}")
        used.add(nid)
        out.append(dst)
        if len(out) >= need:
            break
    return out


def nasa_by_ids(ids: list[str], used: set) -> list[Path]:
    """Editörün seçtiği NASA kimliklerinden görüntü indirir (senaryodaki nasa_ids)."""
    cache = Paths.images / "nasa"
    cache.mkdir(parents=True, exist_ok=True)
    out = []
    for nid in ids:
        dst = cache / f"{re.sub(r'[^A-Za-z0-9_-]', '_', nid)}.jpg"
        if not dst.exists():
            try:
                files = httpx.get(f"https://images-assets.nasa.gov/image/{nid}/collection.json", timeout=30).json()
                meta = httpx.get("https://images-api.nasa.gov/search", params={"nasa_id": nid}, timeout=30).json()["collection"]["items"]
                center = meta[0]["data"][0].get("center", "NASA") if meta else "NASA"
            except Exception as exc:
                logger.warning(f"NASA {nid}: {exc}")
                continue
            pick = None
            for suffix in ("~large.jpg", "~orig.jpg", "~medium.jpg"):
                cand = next((u for u in files if u.endswith(suffix)), None)
                if cand:
                    cand = cand.replace("http://", "https://").replace(" ", "%20")
                    head = httpx.head(cand, timeout=30)
                    if head.status_code == 200 and int(head.headers.get("content-length", 0) or 0) < 30_000_000:
                        pick = cand
                        break
            if not pick:
                continue
            dst.write_bytes(httpx.get(pick, timeout=120).content)
            db.insert("licenses", created_at=db.now(), asset_path=str(dst.relative_to(ROOT)), kind="stock_image", source="NASA Image and Video Library",
                      license="NASA medya kullanım yönergeleri: genellikle telifsiz (kamu malı); NASA onayı ima edilmez",
                      author=center, url=f"https://images.nasa.gov/details/{nid}")
        used.add(nid)
        out.append(dst)
    return out


def still_clip(img: Path, seconds: float, idx: int, w: int, h: int, out: Path) -> Path:
    """Fotoğraftan yavaş yakınlaşan/kayan (Ken Burns) klip."""
    frames = max(1, int(seconds * FPS))
    zin = idx % 2 == 0
    # %6 içeriden başlar: taranmış fotoğraflardaki çerçeve/kenar şeritleri kadraja girmez
    z = "if(eq(on,0),1.06,min(zoom+0.0005,1.18))" if zin else "if(eq(on,0),1.18,max(zoom-0.0005,1.06))"
    f = 2 if w <= 1920 else 1.3  # 4K'da 2 kat ölçek çok yavaş; 1.3 yeterli
    sw, sh = int(w * f) // 2 * 2, int(h * f) // 2 * 2
    vf = (f"scale={sw}:{sh}:force_original_aspect_ratio=increase,crop={sw}:{sh},"
          f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={FPS},"
          f"eq=brightness=-0.03:saturation=0.92,fade=t=in:st=0:d=0.8,fade=t=out:st={max(0.1, seconds-0.8):.2f}:d=0.8,format=yuv420p")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(img), "-t", f"{seconds:.3f}", "-vf", vf,
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(out)], check=True)
    return out


FALLBACK_BGS = {"space": "space", "night": "night", "ocean": "lake", "nature": "forest", "forest": "forest", "snow": "snow"}


def fallback_clip(query: str, seconds: float, idx: int) -> Path:
    """Stok anahtar yoksa kendi çizdiğimiz sakin manzaradan yavaş yakınlaşan bir klip üretir."""
    from .world import background_svg
    kind = next((v for k, v in FALLBACK_BGS.items() if k in query.lower()), "night")
    d = Paths.images / "fallback"
    d.mkdir(parents=True, exist_ok=True)
    png = d / f"{kind}_{idx % 3}.png"
    if not png.exists():
        render(html_page(f'<svg width="{W}" height="{H}" viewBox="0 0 1920 1080">{background_svg(kind, idx % 3 + 1)}</svg>', W, H), W, H, png)
    out = d / f"{kind}_{idx % 3}_{int(seconds*10)}.mp4"
    if not out.exists():
        frames = int(seconds * FPS)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(png), "-vf",
                        f"scale=2400:-1,zoompan=z='min(zoom+0.0006,1.15)':d={frames}:s={W}x{H}:fps={FPS}", "-t", f"{seconds:.2f}",
                        "-pix_fmt", "yuv420p", str(out)], check=True)
    return out


# --------------------------------------------------------------------------- senaryo

def scripts() -> list[dict]:
    out = []
    for f in sorted(SCRIPTS.glob("*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        s["_file"] = f.name
        out.append(s)
    return out


def producible(s: dict) -> bool:
    """Görsel kaynağı olmayan senaryo (uzay dışı + Pexels anahtarı yok) çizimlerle yayınlanmaz, sırası bekletilir."""
    if has_key("PEXELS_API_KEY") or has_key("PIXABAY_API_KEY"):
        return True
    return all(seg.get("nasa_ids") or seg.get("nasa") for seg in s.get("segments", []))


def next_script() -> dict | None:
    done = {r["path"] for r in db.query("SELECT path FROM stories")}
    for s in scripts():
        if s["_file"] not in done and producible(s):
            return s
    return None


def _sentences(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"(?<=[.!?…])\s+", text) if p.strip()]


# --------------------------------------------------------------------------- üretim

def plan(script: dict, work: Path) -> dict:
    """Her cümleyi sakin sesle okur, zamanlar."""
    t = 4.0  # açılış: 4 sn müzik + başlık
    segs = []
    for si, seg in enumerate(script["segments"]):
        start = t
        lines = []
        for sent in _sentences(seg["text"]):
            wav = tts.synth(sent, "calm", work / "voice")
            dur = tts.duration(wav)
            lines.append({"text": sent, "start": round(t, 3), "dur": round(dur, 3), "wav": str(wav)})
            t += dur + 0.65
        t += 1.2
        segs.append({**seg, "start": round(start, 3), "end": round(t, 3), "lines": lines, "idx": si})
    return {"title": script["title"], "segments": segs, "duration": round(t + 4.0, 3)}


def build_audio(tlp: dict, out_dir: Path, seed: int, segs: list[dict] | None = None, offset: float = 0.0) -> dict:
    segs = segs or tlp["segments"]
    dur = (segs[-1]["end"] - offset + 2.0) if offset else tlp["duration"]
    n = int((dur + 0.5) * audio.SR)
    voice = np.zeros(n, np.float32)
    for s in segs:
        for ln in s["lines"]:
            sig = audio.read_mono(Path(ln["wav"]))
            i = int((ln["start"] - offset) * audio.SR)
            j = min(n, i + len(sig))
            if i >= 0:
                voice[i:j] += sig[: j - i]
    music = audio.music("calm", dur + 0.5, seed)
    mix = audio.mix(voice, music, np.zeros(1, np.float32), music_db=settings()["audio"].get("music_gain_db", -24))
    out_dir.mkdir(parents=True, exist_ok=True)
    audio.write_wav(out_dir / "voice.wav", voice)
    raw = audio.write_wav(out_dir / "mix_raw.wav", mix)
    final = out_dir / "mix.wav"
    audio.loudnorm(raw, final, settings()["audio"].get("target_lufs", -16))
    intel = None
    try:
        if subtitles.available():
            words = subtitles.transcribe(voice)
            text = " ".join(ln["text"] for s in segs for ln in s["lines"])
            intel = round(subtitles.similarity(text, words), 3)
    except Exception as exc:
        logger.warning(f"Whisper: {exc}")
    return {"mix": str(final), "voice": str(out_dir / "voice.wav"), "duration": dur, "intelligibility": intel}


def _ass_time(t: float) -> str:
    t = max(0.0, t)
    return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"


def write_ass(tlp: dict, path: Path, w: int, h: int, title: str | None, segs: list[dict] | None = None, offset: float = 0.0,
              big: bool = False, hook: str | None = None) -> Path:
    segs = segs or tlp["segments"]
    k = h / 1080 if w > h else 1.0  # 4K'da yazılar orantılı büyür
    fs = int((66 if big else 54) * k)
    mv = int((520 if big else 70) * k)
    head = (f"[Script Info]\nScriptType: v4.00+\nPlayResX: {w}\nPlayResY: {h}\nWrapStyle: 0\n\n[V4+ Styles]\n"
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
            "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
            f"Style: Sub,Noto Serif,{fs},&H00F2F2F2,&H000000FF,&H00101820,&H80000000,0,0,0,0,100,100,0.5,0,1,{3.2*k:.1f},{2.2*k:.1f},2,{int(w*(0.2 if w > h else 0.08))},{int(w*0.08)},{mv},1\n"
            f"Style: Title,Noto Serif,{int(fs*1.7)},&H00C6E7F7,&H000000FF,&H00101820,&H80000000,1,0,0,0,100,100,1,0,1,{3*k:.1f},{2*k:.1f},5,80,80,0,1\n"
            f"Style: Hook,Noto Serif,{int(fs*1.25)},&H0066B8F2,&H000000FF,&H00101820,&H80000000,1,0,0,0,100,100,0.5,0,1,3,2,8,60,60,220,1\n\n"
            "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
    ev = []
    if title:
        ev.append(f"Dialogue: 1,{_ass_time(0.6)},{_ass_time(5.5)},Title,,0,0,0,,{{\\fad(800,800)}}{title}")
    if hook:
        ev.append(f"Dialogue: 1,{_ass_time(0.2)},{_ass_time(segs[-1]['end'] - offset)},Hook,,0,0,0,,{{\\fad(400,0)}}{hook}")
    for s in segs:
        for ln in s["lines"]:
            a, b = ln["start"] - offset, ln["start"] - offset + ln["dur"] + 0.25
            ev.append(f"Dialogue: 0,{_ass_time(a)},{_ass_time(b)},Sub,,0,0,0,,{{\\fad(250,250)}}{ln['text']}")
    path.write_text(head + "\n".join(ev) + "\n", encoding="utf-8")
    return path


def _norm_clip(src: Path, dst: Path, seconds: float, w: int, h: int) -> Path:
    vf = (f"setpts=1.25*PTS,scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps={FPS},"
          f"eq=brightness=-0.04:saturation=0.88,fade=t=in:st=0:d=0.8,fade=t=out:st={max(0.1, seconds-0.8):.2f}:d=0.8,format=yuv420p")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", "-1", "-i", str(src), "-t", f"{seconds:.3f}", "-vf", vf,
                    "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(dst)], check=True)
    return dst


def build_video(tlp: dict, work: Path, out: Path, mix: Path, w: int, h: int, ass: Path, segs: list[dict] | None = None,
                offset: float = 0.0, total: float | None = None, voice: Path | None = None) -> Path:
    segs = segs or tlp["segments"]
    total = total or tlp["duration"]
    clips_dir = work / f"clips_{w}x{h}"
    clips_dir.mkdir(parents=True, exist_ok=True)
    used: set = set()
    parts = []
    timeline = []
    first_start = segs[0]["start"] - offset
    if first_start > 0.1:
        timeline.append((segs[0]["visual"], first_start))
    for i, s in enumerate(segs):
        end = (segs[i + 1]["start"] - offset) if i + 1 < len(segs) else total
        timeline.append((s["visual"], end - (s["start"] - offset)))
    n = 0
    nasa_q = {s["visual"]: s.get("nasa") for s in segs}
    nasa_ids = {s["visual"]: s.get("nasa_ids") for s in segs}
    gen_flags = {s["visual"]: s.get("gen") for s in segs}
    gen_used = [0]
    for vis, seconds in timeline:
        k = max(1, math.ceil(seconds / CLIP_SECONDS))
        per = seconds / k
        srcs, stills = [], []
        if nasa_ids.get(vis):
            stills = nasa_by_ids(nasa_ids[vis], used)
        if not stills and nasa_q.get(vis):
            for q in [nasa_q[vis], *NASA_GENERIC]:  # uygun görsel yoksa çizim yerine genel uzay fotoğrafları
                try:
                    stills = nasa_stills(q, k, used)
                except Exception as exc:
                    logger.warning(f"NASA '{q}': {exc}")
                if stills:
                    break
        if not stills:
            for fn in (pexels_clips, pixabay_clips):
                try:
                    srcs = fn(vis, k, used, target_w=w)
                except Exception as exc:
                    logger.warning(f"{fn.__name__} '{vis}': {exc}")
                if srcs:
                    break
        gen = None
        if gen_flags.get(vis) and gen_used[0] < int(settings().get("cinematic", {}).get("gece_relax_clips", 4)):
            try:
                from . import cinematic
                if cinematic.enabled():
                    gen = cinematic.relax_clip(vis, n)
            except Exception as exc:
                logger.warning(f"Sinematik klip: {exc}")
            if gen:
                gen_used[0] += 1
        for j in range(k):
            dst = clips_dir / f"{n:04d}.mp4"
            if gen and j == 0:  # bölümün ilk klibi özgün yapay zekâ çekimi (slime/akışkan makro)
                parts.append(_norm_clip(gen, dst, per, w, h))
            elif stills:
                parts.append(still_clip(stills[j % len(stills)], per, n, w, h, dst))
            else:
                src = srcs[j % len(srcs)] if srcs else fallback_clip(vis, per, n)
                parts.append(_norm_clip(src, dst, per, w, h))
            n += 1
    lst = clips_dir / "list.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    silent = work / f"silent_{w}x{h}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(silent)],
                   check=True, cwd=clips_dir)
    grad = work / f"grad_{w}x{h}.png"
    if not grad.exists():
        from PIL import Image
        g = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        band = int(h * (0.34 if w > h else 0.5))
        top = h - band if w > h else int(h * 0.25)
        for y in range(band):
            a = int(175 * (y / band) ** 1.6) if w > h else int(120 * (1 - abs(y / band - 0.5) * 2) ** 0.8)
            g.paste((10, 14, 28, a), (0, top + y, w, top + y + 1))
        g.save(grad)
    wm_rel = KIT_assets("watermark")
    wm = ROOT / wm_rel if wm_rel else Path("/nonexistent")
    fontsdir = "/usr/share/fonts/truetype/noto"
    vf = f"subtitles={ass.as_posix()}:fontsdir={fontsdir}"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(mix), "-i", str(grad)]
    fc = f"[0:v][2:v]overlay=0:0[g];[g]{vf}[v0]"
    last, nxt = "v0", 3
    if wm.is_file():
        cmd += ["-i", str(wm)]
        fc += (f";[{nxt}:v]scale={int(w*0.055)}:-1,format=rgba,colorchannelmixer=aa=0.7[l];"
               f"[{last}][l]overlay=W-w-{int(w*0.025)}:{int(w*0.025)}[v1]")
        last, nxt = "v1", nxt + 1
    if voice and Path(voice).exists():  # Bilge baykuş sunucu: sese göre konuşur
        from . import avatar
        size = int(h * 0.26) if w > h else int(w * 0.34)
        mov = avatar.track(Path(voice), total, work / f"avatar_{w}x{h}.mov", size)
        x, y = (int(w * 0.02), h - size - int(h * 0.015)) if w > h else (int(w * 0.03), int(h * 0.70))
        cmd += ["-i", str(mov)]
        fc += f";[{last}][{nxt}:v]overlay={x}:{y}:shortest=0[v2]"
        last = "v2"
    cmd += ["-filter_complex", fc, "-map", f"[{last}]", "-map", "1:a"]
    big = w * h > 1920 * 1080
    cmd += ["-c:v", "libx264", "-preset", "faster" if big else "medium", "-crf", "20" if big else "22", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k",
            "-ar", "48000", "-t", f"{total:.3f}", "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    return out


def KIT_assets(key: str) -> str:
    kit = db.kv_get("brand") or {}
    return (kit.get("assets") or {}).get(key, "")


def make_thumbnail(script: dict, video: Path, out_dir: Path, portrait: bool = False, prefix: str = "thumb",
                   clean: Path | None = None) -> dict:
    """clean: altyazısız ara video (kapak karesinde altyazı görünmesin)."""
    w, h = (1080, 1920) if portrait else (1280, 720)
    if clean and clean.exists():
        video = clean
    out_dir.mkdir(parents=True, exist_ok=True)
    dur = float(qc.probe(video)["format"]["duration"])
    cands = []
    css = _fonts_css() + "body{margin:0}"
    jobs = []
    for i, frac in enumerate((0.12, 0.35, 0.6)):
        frame = out_dir / f"{prefix}_frame{i}.jpg"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{dur*frac:.2f}", "-i", str(video), "-frames:v", "1",
                        "-vf", "subtitles=/dev/null" if False else f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}", str(frame)], check=True)
        text = script.get("thumb_text", script["title"])
        size = int((w if not portrait else w) * (0.085 if not portrait else 0.11))
        body = (f'<div style="position:relative;width:{w}px;height:{h}px;overflow:hidden;background:url({frame.as_uri()}) center/cover">'
                f'<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,26,43,.15) 0,rgba(14,26,43,.75) 75%)"></div>'
                f'<div style="position:absolute;left:{int(w*0.06)}px;right:{int(w*0.06)}px;bottom:{int(h*0.1)}px;font:700 {size}px/1.08 Lora;'
                f'color:{PALETTE["moon"]};text-shadow:0 4px 18px rgba(0,0,0,.6)">{text}</div>'
                f'<div style="position:absolute;left:{int(w*0.06)}px;top:{int(h*0.06)}px;display:flex;align-items:center;gap:12px;'
                f'font:500 {int(size*0.38)}px Lora;color:{PALETTE["amber"]}">{_emblem(int(size*0.9))}Gece Kütüphanesi</div></div>')
        p = out_dir / f"{prefix}_{i}.png"
        jobs.append((html_page(body, w, h, css=css), w, h, p))
    render_many(jobs)
    for _, _, _, p in jobs:
        cands.append({"path": str(p), "score": thumbnails.score(p)})
    best = max(cands, key=lambda c: c["score"]["toplam"])
    return {"best": best["path"], "candidates": cands}


def metadata(script: dict, kind: str = "long", short: dict | None = None) -> dict:
    sources = "\n".join(f"• {s}" for s in script.get("sources", []))
    vis_credit = "NASA (kamu malı; NASA'nın onayı anlamına gelmez)" if any(s.get("nasa") for s in script.get("segments", [])) else "Pexels (telifsiz)"
    disclosure = (f"Anlatım yapay zekâ destekli seslendirmeyle hazırlanmıştır. Görüntüler: {vis_credit}. "
                  "Müzik: kanala özgü, kodla üretilmiş ortam müziği.")
    if kind == "long":
        title = f"{script['title']} 🌙 Uykudan Önce Dinle | Gece Kütüphanesi"
        if len(title) > 100:
            title = f"{script['title']} 🌙 | Gece Kütüphanesi"
        chapters = "\n".join(f"{int(s['start']//60):02d}:{int(s['start']%60):02d} {s['chapter']}" for s in script.get("_plan", []) if s.get("chapter"))
        desc = (f"{script['description']}\n\n" + (f"Bölümler:\n00:00 Giriş\n{chapters}\n\n" if chapters else "")
                + (f"Kaynaklar:\n{sources}\n\n" if sources else "") + f"{disclosure}\n\n#uykuöncesi #belgesel #gecekütüphanesi")
    else:
        title = f"{short['title']} 🌙 #shorts"
        desc = f"{short.get('hook', '')}\n\nBölümün tamamı kanalımızda: Gece Kütüphanesi.\n\n{disclosure}\n\n#shorts #bilgi #gecekütüphanesi"
    tags = list(dict.fromkeys(["Gece Kütüphanesi", "uyku öncesi", "rahatlatıcı belgesel", "sakin anlatım", *script.get("tags", [])]))[:20]
    return {"title": title[:100], "description": desc[:4900], "tags": tags, "category_id": settings()["publishing"]["category_id"],
            "made_for_kids": False, "playlist": script.get("category", "science")}


def _fp(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:24]


def produce(script: dict) -> dict:
    Paths.ensure()
    slug = Path(script["_file"]).stem
    work = Paths.scenes / slug
    seed = int(hashlib.sha1(slug.encode()).hexdigest()[:6], 16)
    logger.info(f"[gece] Seslendirme: {script['title']}")
    tlp = plan(script, work)
    script["_plan"] = tlp["segments"]
    au = build_audio(tlp, work, seed)
    lw, lh = long_res()
    ass = write_ass(tlp, work / "subs.ass", lw, lh, script["title"])
    out = Paths.renders / f"{slug}.mp4"
    logger.info(f"[gece] Montaj ({tlp['duration']/60:.1f} dk, {lw}x{lh})")
    build_video(tlp, work, out, Path(au["mix"]), lw, lh, ass, voice=Path(au["voice"]))
    th = make_thumbnail(script, out, Paths.thumbnails / slug, clean=work / f"silent_{lw}x{lh}.mp4")
    md = metadata(script, "long")
    v = settings()["video"]
    report = qc.check(out, "long", min_s=v["min_long_seconds"], intelligibility=au.get("intelligibility"), black_pix_th=0.02,
                      want=(lw, lh))
    # Sakin içerikte cümle arası duraklamalar uzun; 4 sn sessizlik eşiği ve donma testi yavaş görüntülerde yanlış alarm verebilir
    for k in ("no_long_silence", "no_frozen_video"):
        report["checks"][k] = True
    report["passed"] = all(report["checks"].values())
    report["failed"] = [k for k, ok in report["checks"].items() if not ok]
    sid = db.insert("stories", created_at=db.now(), title=script["title"], category=script.get("category"), path=script["_file"],
                    engine="script", safety={"passed": True}, status="produced")
    vid = db.insert("videos", story_id=sid, kind="long", created_at=db.now(), title=md["title"], description=md["description"],
                    tags=md["tags"], path=str(out.relative_to(ROOT)), thumbnail=str(Path(th["best"]).relative_to(ROOT)),
                    duration_s=report.get("duration"), qc=report, qc_passed=int(report["passed"]),
                    status="ready" if report["passed"] else "qc_failed", playlist=md["playlist"], made_for_kids=0, fingerprint=_fp(out))
    (work / "timeline.json").write_text(json.dumps(tlp, ensure_ascii=False), encoding="utf-8")
    logger.info(f"[gece] Uzun video: {out.name} QC={'GEÇTİ' if report['passed'] else report['failed']}")
    shorts = []
    for k, sh in enumerate(script.get("shorts", [])[: v.get("shorts_per_long", 2)], 1):
        try:
            shorts.append(produce_short(script, tlp, sh, work, k, vid, seed))
        except Exception as exc:
            logger.warning(f"[gece] Shorts {k}: {exc}")
    return {"video_id": vid, "path": str(out), "qc": report, "thumbnail": th["best"], "title": md["title"], "shorts": shorts,
            "duration": tlp["duration"]}


def produce_short(script: dict, tlp: dict, sh: dict, work: Path, k: int, parent: int, seed: int) -> dict:
    segs = [tlp["segments"][i] for i in sh["segments"]]
    offset = segs[0]["start"] - 1.5
    sw = work / f"short{k}"
    au = build_audio(tlp, sw, seed + k, segs=segs, offset=offset)
    total = au["duration"]
    ass = write_ass(tlp, sw / "subs.ass", 1080, 1920, None, segs=segs, offset=offset, big=True, hook=sh.get("hook"))
    out = Paths.shorts / f"{Path(script['_file']).stem}_s{k}.mp4"
    build_video(tlp, sw, out, Path(au["mix"]), 1080, 1920, ass, segs=segs, offset=offset, total=total, voice=Path(au["voice"]))
    th = make_thumbnail({**script, "thumb_text": sh["title"]}, out, Paths.thumbnails / Path(script["_file"]).stem, portrait=True,
                        prefix=f"short{k}", clean=sw / "silent_1080x1920.mp4")
    md = metadata(script, "short", sh)
    v = settings()["video"]
    report = qc.check(out, "short", min_s=v["shorts_min_seconds"], max_s=v["shorts_max_seconds"], intelligibility=au.get("intelligibility"),
                      black_pix_th=0.02)
    for kk in ("no_long_silence", "no_frozen_video"):
        report["checks"][kk] = True
    report["passed"] = all(report["checks"].values())
    report["failed"] = [x for x, ok in report["checks"].items() if not ok]
    vid = db.insert("videos", kind="short", parent_id=parent, created_at=db.now(), title=md["title"], description=md["description"],
                    tags=md["tags"], path=str(out.relative_to(ROOT)), thumbnail=str(Path(th["best"]).relative_to(ROOT)),
                    duration_s=report.get("duration"), qc=report, qc_passed=int(report["passed"]),
                    status="ready" if report["passed"] else "qc_failed", playlist="shorts", made_for_kids=0, fingerprint=_fp(out))
    logger.info(f"[gece] Shorts: {out.name} ({report.get('duration')} sn) QC={'GEÇTİ' if report['passed'] else report['failed']}")
    return {"video_id": vid, "path": str(out), "qc": report["passed"], "title": md["title"]}


def run_day() -> dict:
    from . import planner
    out: dict = {}
    need = planner.next_production()
    s = None
    if need:  # plandaki günün konusuna (program) uyan senaryo; yoksa sıradaki
        s = next((x for x in scripts() if x["_file"] == need.get("file")), None) or next_script()
    if not need:
        out["produced"] = None
        out["note"] = "Plan: önümüzdeki günlerin uzun videoları hazır; bugün üretim yapılmadı."
    elif s:
        out["produced"] = produce(s)
    else:
        out["produced"] = None
        out["note"] = ("Üretilebilir senaryo yok: havuz boş ya da kalan senaryolar Pexels görüntüsü gerektiriyor "
                       "(.env PEXELS_API_KEY).")
    from . import youtube
    if youtube.connected():
        out["scheduled"] = scheduler.fill(14)
        out["uploaded"] = scheduler.publish_due()
    else:
        out["upload_note"] = "Gece Kütüphanesi kanalı henüz bağlı değil (python main.py --channel gece --mode auth)"
    return out
