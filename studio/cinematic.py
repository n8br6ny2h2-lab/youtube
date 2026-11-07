"""Sinematik sahneler: Google Gemini Omni Flash (Interactions API) ile 3D film kalitesinde video klipler.

- Bulutkent: uzun bölümlere 3D açılış, Shorts'lara 3D sahneler (karakter çizimlerimiz referans verilir, karakterler değişmez).
- Gece Kütüphanesi: rahatlatıcı bölümler için gerçekçi slime/akışkan makro çekimleri.
Klipler 10 sn, 1280x720, kendi çevre sesiyle gelir. Konuşma/anlatım her zaman bizim seslerimizle eklenir.
Aylık bütçe sınırı vardır; sınıra gelinince sistem kendi çizim üretimine döner. Klipler önbelleklenir (aynı istek iki kez ödenmez).
"""
from __future__ import annotations

import base64
import hashlib
import json
import math
import subprocess
from datetime import datetime
from pathlib import Path

import httpx
from loguru import logger

from . import costs, db
from .config import Paths, env, has_key, settings

URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
CLIP_SECONDS = 10.0

CHAR_EN = {"pofi": "Pofi, a little orange fox cub with a blue scarf", "lili": "Lili, a pink bunny",
           "tombi": "Tombi, a gentle green turtle with round glasses", "bobo": "Bobo, a cheerful baby elephant",
           "bulut": "Bulut, a friendly smiling white cloud"}
BG_EN = {"meadow": "a sunny spring flower meadow", "forest": "a magical green forest", "village": "a cozy colorful village",
         "home": "a warm cozy living room", "lake": "a calm lake shore with reeds", "garden": "a blooming garden",
         "night": "a starry night sky over soft hills", "bedroom": "a cozy child's bedroom at night", "snow": "a snowy winter wonderland",
         "space": "a gentle cartoon outer space with planets"}
STYLE = ("High quality 3D animated family film shot, modern feature animation style, soft cinematic lighting, gentle camera move, "
         "16:9 landscape, child-friendly and calm, no text, no subtitles, no logos, no speech or dialogue; soft natural ambient sound only.")


def _cfg() -> dict:
    return settings().get("cinematic", {})


def enabled() -> bool:
    return bool(_cfg().get("enabled", True)) and has_key("GEMINI_API_KEY")


def month_spend() -> float:
    start = datetime.now().strftime("%Y-%m-01")
    r = db.one("SELECT COALESCE(SUM(usd),0) s FROM costs WHERE service='gemini_video' AND created_at >= ?", (start,))
    total = float(r["s"] or 0)
    # iki kanal aynı bütçeyi paylaşır: diğer kanalın veritabanı da sayılır
    try:
        import sqlite3
        for p in Paths.root.glob("channels/*/database/studio.db"):
            if p.resolve() == (Paths.database / "studio.db").resolve():
                continue
            with sqlite3.connect(p) as c:
                total += float(c.execute("SELECT COALESCE(SUM(usd),0) FROM costs WHERE service='gemini_video' AND created_at >= ?",
                                         (start,)).fetchone()[0] or 0)
        main = Paths.root / "database" / "studio.db"
        if main.exists() and main.resolve() != (Paths.database / "studio.db").resolve():
            with sqlite3.connect(main) as c:
                total += float(c.execute("SELECT COALESCE(SUM(usd),0) FROM costs WHERE service='gemini_video' AND created_at >= ?",
                                         (start,)).fetchone()[0] or 0)
    except Exception as exc:
        logger.debug(f"bütçe toplamı: {exc}")
    return round(total, 2)


def budget_left() -> float:
    return float(_cfg().get("monthly_budget_usd", 45)) - month_spend()


def can_afford(n_clips: int) -> bool:
    return enabled() and budget_left() >= n_clips * float(_cfg().get("usd_per_clip", 1.0))


def clip(prompt: str, refs: list[Path] | None = None, tag: str = "clip") -> Path | None:
    """Tek klip üretir (önbellekli). Bütçe yoksa ya da hata olursa None döner (çağıran çizim sistemine döner)."""
    refs = [r for r in (refs or []) if r and Path(r).exists()][:3]
    key = hashlib.sha1((prompt + "|" + "|".join(str(r) for r in refs)).encode()).hexdigest()[:16]
    cache = Paths.images / "gen"
    cache.mkdir(parents=True, exist_ok=True)
    out = cache / f"{tag}_{key}.mp4"
    if out.exists() and out.stat().st_size > 10000:
        return out
    if not can_afford(1):
        logger.info(f"Sinematik klip atlandı (bütçe: {budget_left():.2f} $ kaldı)")
        return None
    parts = [{"type": "image", "data": base64.b64encode(Path(r).read_bytes()).decode(), "mime_type": "image/png"} for r in refs]
    parts.append({"type": "text", "text": prompt})
    model = _cfg().get("model", "gemini-omni-1.2-flash")
    for attempt in range(2):
        try:
            r = httpx.post(URL, headers={"x-goog-api-key": env("GEMINI_API_KEY")}, json={"model": model, "input": parts}, timeout=900)
            d = r.json()
            if "error" in d:
                raise RuntimeError(str(d["error"])[:300])
            data = next((c["data"] for st in d.get("steps", []) for c in (st.get("content") or []) if c.get("type") == "video"), None)
            if not data:
                raise RuntimeError(f"yanıtta video yok (durum {d.get('status')})")
            out.write_bytes(base64.b64decode(data))
            usd = float(_cfg().get("usd_per_clip", 1.0))
            costs.record("gemini_video", model, d.get("usage", {}).get("total_output_tokens", 0), usd, tag)
            db.insert("licenses", created_at=db.now(), asset_path=str(out.relative_to(Paths.root)), kind="ai_video",
                      source=f"Google {model} (Gemini API)", license="Gemini API ile üretilmiş, Google şartlarına göre kullanım; "
                      "karakterler kanalın özgün çizimleri", author="studio", url="")
            logger.info(f"Sinematik klip üretildi: {out.name}")
            return out
        except Exception as exc:
            logger.warning(f"Sinematik klip hatası ({attempt + 1}/2): {exc}")
    return None


# --------------------------------------------------------------------------- Bulutkent

def _char_png(cid: str) -> Path:
    return Paths.root / "characters" / f"{cid}.png"


def scene_prompt(scene: dict, extra: str = "") -> tuple[str, list[Path]]:
    ids = [c["id"] for c in scene.get("characters", []) if c["id"] in CHAR_EN]
    who = " and ".join(CHAR_EN[i] for i in ids) or "the friends"
    acts = ", ".join(sorted({b.get("action", "") for b in scene.get("beats", []) if b.get("action") not in (None, "", "idle", "talk")}))
    moods = ", ".join(sorted({b.get("emotion", "") for b in scene.get("beats", []) if b.get("emotion")}))
    props = ", ".join(f"a {p.get('kind')}" for p in scene.get("props", []) if p.get("kind"))
    txt = (f"Use the reference images as the exact character designs (same colors, shapes, faces and outfits). {who} in "
           f"{BG_EN.get(scene.get('background'), 'a bright friendly place')}"
           + (f", with {props}" if props else "") + (f". They {acts.replace('_', ' ')}" if acts else "")
           + (f". Mood: {moods}" if moods else "") + f". {extra} {STYLE}")
    return txt, [_char_png(i) for i in ids]


def _ff(*args: str) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def long_intro(story: dict, work: Path, title: str) -> Path | None:
    """Uzun bölümün başına 10 sn 3D açılış (başlık + kendi müziğimiz + klibin çevre sesi)."""
    if not _cfg().get("bulutkent_intro", True):
        return None
    sc = story["scenes"][0]
    prompt, refs = scene_prompt(sc, "Opening establishing shot of a children's cartoon episode, the characters look happy and wave hello.")
    c = clip(prompt, refs, "intro")
    if not c:
        return None
    out = work / "intro_1080.mp4"
    font = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
    t = title.replace("'", "’").replace(":", "\\:")
    _ff("-i", str(c), "-f", "lavfi", "-t", str(CLIP_SECONDS), "-i", "anullsrc=r=48000:cl=stereo",
        "-filter_complex",
        f"[0:v]scale=1920:1080:flags=lanczos,fps=30,format=yuv420p,"
        f"drawtext=fontfile={font}:text='{t}':fontcolor=white:fontsize=78:borderw=6:bordercolor=0x2b2b55:"
        f"x=(w-text_w)/2:y=h*0.78:alpha='if(lt(t,1.5),0,if(lt(t,2.5),t-1.5,if(lt(t,8.5),1,max(0,9.5-t))))',"
        f"fade=t=out:st={CLIP_SECONDS - 0.6}:d=0.6[v];"
        f"[0:a]aresample=48000,volume=0.8,afade=t=out:st={CLIP_SECONDS - 1}:d=1[a]",
        "-map", "[v]", "-map", "[a]", "-t", str(CLIP_SECONDS), "-c:v", "libx264", "-crf", "19", "-preset", "medium",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", str(out))
    return out


def prepend(intro: Path, main: Path, out: Path) -> Path:
    _ff("-i", str(intro), "-i", str(main), "-filter_complex",
        "[0:v]settb=AVTB,fps=30,format=yuv420p[a0];[1:v]scale=1920:1080,settb=AVTB,fps=30,format=yuv420p[b0];"
        "[0:a]aresample=48000,aformat=channel_layouts=stereo[a1];[1:a]aresample=48000,aformat=channel_layouts=stereo[b1];"
        "[a0][a1][b0][b1]concat=n=2:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "20",
        "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out))
    return out


def short_3d(story: dict, stl: dict, mix: Path, srt: Path, title: str, out: Path) -> Path | None:
    """Shorts'u 3D sahnelerle kurar: dikey çerçeve (bulanık zemin + ortada film karesi), başlık, altyazı, bizim ses + klip ambiyansı."""
    dur = float(stl["duration"])
    n = math.ceil(dur / CLIP_SECONDS)
    if n > int(_cfg().get("max_clips_per_short", 3)) or not can_afford(n):
        return None
    scenes = [s for s in stl["scenes"] if s.get("characters")] or story["scenes"]
    clips = []
    for i in range(n):
        sc = scenes[min(i * len(scenes) // n, len(scenes) - 1)]
        p, refs = scene_prompt(sc, ["Start of a short, an eye-catching joyful moment.", "The story continues with a fun surprise.",
                                    "A happy ending moment, the friends celebrate."][min(i, 2)])
        c = clip(p, refs, "short")
        if not c:
            return None
        clips.append(c)
    work = Paths.scenes / "cine" / out.stem
    work.mkdir(parents=True, exist_ok=True)
    lst = work / "list.txt"
    lst.write_text("".join(f"file '{c}'\n" for c in clips))
    joined = work / "joined.mp4"
    _ff("-f", "concat", "-safe", "0", "-i", str(lst), "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-c:a", "aac", str(joined))
    return compose_vertical(joined, mix, srt, title, dur, out)


def _wrap(text: str, width: int = 20) -> str:
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return "\n".join(lines[:3])


def compose_vertical(joined: Path, mix: Path, srt: Path, title: str, dur: float, out: Path) -> Path:
    font = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
    tf = Paths.scenes / "cine" / f"{out.stem}_title.txt"
    tf.parent.mkdir(parents=True, exist_ok=True)
    tf.write_text(_wrap(title), encoding="utf-8")
    style = ("FontName=Noto Sans,Bold=1,FontSize=17,PrimaryColour=&H00FFFFFF,OutlineColour=&H00402020,BorderStyle=1,Outline=3,"
             "Shadow=1,Alignment=2,MarginV=70")
    vf = (f"[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:3,eq=brightness=-0.08[bg];"
          f"[b]scale=1080:-2:flags=lanczos[fg];[bg][fg]overlay=0:(H-h)/2-80,"
          f"drawtext=fontfile={font}:textfile={tf.as_posix()}:fontcolor=white:fontsize=72:line_spacing=14:text_align=C:borderw=7:bordercolor=0x2b2b55:"
          f"x=(w-text_w)/2:y=330-text_h/2,"
          f"subtitles={srt.as_posix()}:force_style='{style}',fps=30,format=yuv420p[v];"
          f"[0:a]volume=0.25[amb];[1:a][amb]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5[aout]")
    _ff("-i", str(joined), "-i", str(mix), "-filter_complex", vf, "-map", "[v]", "-map", "[aout]", "-t", f"{dur:.3f}",
        "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart", str(out))
    return out


# --------------------------------------------------------------------------- Gece Kütüphanesi

RELAX_PROMPTS = [
    "Cinematic macro shot of glossy pastel {c} slime being slowly stretched and folded on a white marble table, soft studio light, "
    "shallow depth of field, calm satisfying mood, no people, no hands, no text, 16:9.",
    "Cinematic macro shot of {c} ink slowly blooming and swirling in clear water, dark background, soft light, calm, no text, 16:9.",
    "Cinematic macro shot of {c} kinetic sand being gently sliced into smooth layers, satisfying, soft light, no hands visible, no text, 16:9.",
    "Cinematic macro shot of thick golden honey slowly pouring and folding in soft warm light, calm, no text, 16:9.",
]
COLORS = ["pink", "lavender", "mint green", "sky blue", "peach", "pearl white"]


def relax_clip(visual: str, idx: int) -> Path | None:
    """Gece 'relax' bölümleri için tatmin edici makro klip (visual metnine göre şablon seçilir)."""
    v = visual.lower()
    k = 0 if "slime" in v else 1 if "ink" in v else 2 if "sand" in v else 3 if "honey" in v else idx % len(RELAX_PROMPTS)
    return clip(RELAX_PROMPTS[k].format(c=COLORS[idx % len(COLORS)]), None, "relax")
