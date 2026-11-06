"""Montaj motoru: hikâye -> zaman çizelgesi -> seslendirme -> HyperFrames projesi -> render -> FFmpeg birleştirme.

Aynı motor yatay uzun videoları (1920x1080) ve dikey Shorts'ları (1080x1920) üretir.
"""
from __future__ import annotations

import html
import json
import shutil
import zlib
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from loguru import logger

from . import audio, subtitles, tts
from .characters import CHARACTERS, character_svg, speaker_color, speaker_name
from .config import Paths
from .world import background_svg, prop_svg

FPS = 30
ENV_FPS = 15


@dataclass
class Layout:
    name: str
    w: int
    h: int
    ground: float
    scale: float
    slots: dict
    narrator: tuple
    caption_bottom: int
    caption_size: int
    prop_y: float
    prop_scale: float
    bg_scale: float


LANDSCAPE = Layout("landscape", 1920, 1080, 850, 0.95,
                   {"left": 560, "center": 960, "right": 1360, "left2": 330, "right2": 1590,
                    "o1": 330, "o2": 750, "o3": 1170, "o4": 1590},
                   (1700, 300, 0.6), 40, 48, 470, 1.15, 1.0)
PORTRAIT = Layout("portrait", 1080, 1920, 1430, 1.3,
                  {"left": 280, "center": 540, "right": 800, "left2": 200, "right2": 880,
                   "o1": 160, "o2": 413, "o3": 666, "o4": 920},
                  (820, 560, 0.6), 230, 60, 780, 1.4, 1920 / 1080)


def _esc(s: str) -> str:
    return html.escape(s, quote=True)


# --------------------------------------------------------------------------- zaman çizelgesi

def plan(story: dict, workdir: Path, outro: bool = True, brand_name: str = "Bulutkent") -> dict:
    """TTS üretir ve her konuşmanın zamanını hesaplar."""
    voice_dir = workdir / "voice"
    scenes = [dict(s) for s in story["scenes"]]
    if outro:
        scenes.append({
            "id": "outro", "background": "meadow", "music": "happy",
            "characters": [{"id": "pofi", "slot": "o1", "facing": "right"}, {"id": "lili", "slot": "o2", "facing": "right"},
                           {"id": "tombi", "slot": "o3", "facing": "left"}, {"id": "bobo", "slot": "o4", "facing": "left"}],
            "props": [],
            "beats": [{"speaker": "narrator", "text": f"{brand_name}'te bugünlük bu kadar! Bir sonraki macerada görüşmek üzere!",
                       "emotion": "happy", "action": "idle", "sfx": "sparkle", "show_prop": -1},
                      {"speaker": "pofi", "text": "Hoşça kal!", "emotion": "excited", "action": "wave", "sfx": "none", "show_prop": -1}],
        })
    t = 0.0
    out_scenes = []
    for si, sc in enumerate(scenes):
        start = t
        t += 0.7 if si else 0.25  # geçiş payı (ilk sahne hemen başlar: ilk 3 saniyede kanca)
        beats = []
        for b in sc["beats"]:
            wav = tts.synth(b["text"], b["speaker"], voice_dir)
            dur = tts.duration(wav)
            sig = audio.read_mono(wav)
            env = [round(v, 2) for v in audio.envelope(sig, ENV_FPS)]
            beats.append({**b, "start": round(t, 3), "dur": round(dur, 3), "wav": str(wav), "env": env})
            pause = 0.45
            if b["speaker"] == "narrator" and b["text"].rstrip().endswith("?"):
                pause = 1.6  # izleyiciye düşünme payı
            if b.get("action") in ("walk_in", "walk_out", "jump", "dance", "sneeze"):
                pause = max(pause, 0.8)
            t += dur + pause
        t += 0.5
        out_scenes.append({**sc, "start": round(start, 3), "end": round(t, 3), "beats": beats})
    return {"title": story["title"], "scenes": out_scenes, "duration": round(t + 0.3, 3), "category": story.get("category")}


def subset(tlp: dict, scene_ids: list[str], hook_text: str, workdir: Path) -> dict:
    """Shorts için seçili sahnelerden yeni zaman çizelgesi (kanca cümlesiyle başlar)."""
    chosen = [s for s in tlp["scenes"] if s["id"] in scene_ids]
    first = chosen[0]
    hook_beat = {"speaker": "narrator", "text": hook_text, "emotion": "excited", "action": "idle", "sfx": "whoosh", "show_prop": -1}
    wav = tts.synth(hook_text, "narrator", workdir / "voice")
    hd = tts.duration(wav)
    t = 0.15
    hook = {**hook_beat, "start": t, "dur": round(hd, 3), "wav": str(wav),
            "env": [round(v, 2) for v in audio.envelope(audio.read_mono(wav), ENV_FPS)]}
    t += hd + 0.5
    scenes = []
    for k, sc in enumerate(chosen):
        offset = t - sc["beats"][0]["start"]
        beats = [{**b, "start": round(b["start"] + offset, 3)} for b in sc["beats"]]
        if k == 0:
            beats = [hook] + beats
            start = 0.0
        else:
            start = round(sc["start"] + offset, 3)
        end = round(beats[-1]["start"] + beats[-1]["dur"] + 0.9, 3)
        scenes.append({**sc, "start": start, "end": end, "beats": beats})
        t = end + 0.7
    return {"title": tlp["title"], "scenes": scenes, "duration": round(scenes[-1]["end"] + 0.2, 3), "category": tlp.get("category")}


# --------------------------------------------------------------------------- ses

def build_audio(tlp: dict, out_dir: Path, seed: int, whisper: bool = True) -> dict:
    n = int((tlp["duration"] + 0.5) * audio.SR)
    voice = np.zeros(n, np.float32)
    fx = np.zeros(n, np.float32)
    for sc in tlp["scenes"]:
        for b in sc["beats"]:
            sig = audio.read_mono(Path(b["wav"]))
            i = int(b["start"] * audio.SR)
            j = min(n, i + len(sig))
            voice[i:j] += sig[: j - i]
            if b.get("sfx") and b["sfx"] != "none":
                s = audio.sfx(b["sfx"], seed + i)
                k = min(n, i + len(s))
                fx[i:k] += s[: k - i]
    moods = [s.get("music", "happy") for s in tlp["scenes"] if s["id"] != "outro"]
    mood = "lullaby" if tlp.get("category") == "bedtime" else max(set(moods), key=moods.count)
    track = audio.music(mood, tlp["duration"] + 0.5, seed)
    mix = audio.mix(voice, track, fx)
    raw = audio.write_wav(out_dir / "mix_raw.wav", mix)
    final = out_dir / "mix.wav"
    stats = audio.loudnorm(raw, final)
    audio.write_wav(out_dir / "voice.wav", voice)
    result = {"mix": str(final), "voice": str(out_dir / "voice.wav"), "music_mood": mood, "loudness_in": stats.get("input_i")}
    # Whisper: kelime zamanları + anlaşılırlık
    lines, sims = [], []
    words = []
    if whisper and subtitles.available():
        try:
            words = subtitles.transcribe(voice)
        except Exception as exc:
            logger.warning(f"Whisper çalışmadı: {exc}")
    for sc in tlp["scenes"]:
        for b in sc["beats"]:
            b["words"] = subtitles.align_line(b["text"], b["start"], b["dur"], words)
            if words:
                inside = [w for w in words if w["end"] > b["start"] - 0.1 and w["start"] < b["start"] + b["dur"] + 0.1]
                sims.append(subtitles.similarity(b["text"], inside))
            lines.append({"start": b["start"], "end": b["start"] + b["dur"] + 0.2, "text": b["text"]})
    result["srt"] = str(subtitles.write_srt(lines, out_dir / "subtitles.srt"))
    result["whisper_used"] = bool(words)
    result["intelligibility"] = round(float(np.mean(sims)), 3) if sims else None
    return result


# --------------------------------------------------------------------------- HTML

def _slot_x(layout: Layout, slot: str) -> float:
    return layout.slots.get(slot, layout.slots["center"])


def _js(v) -> str:
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def _blink_times(start: float, end: float, seed: int) -> list[float]:
    out, t, k = [], start + 0.8 + (seed % 7) * 0.3, seed
    while t < end - 0.3:
        out.append(round(t, 2))
        k = (k * 1103515245 + 12345) % 2147483648
        t += 2.4 + (k % 1000) / 1000 * 2.2
    return out


def build_html(tlp: dict, project: Path, layout: Layout, brand: dict, title_overlay: str | None = None,
               shorts_title: str | None = None) -> Path:
    project.mkdir(parents=True, exist_ok=True)
    (project / "assets").mkdir(exist_ok=True)
    shutil.copy(Paths.vendor / "gsap.min.js", project / "gsap.min.js")
    shutil.copy(Paths.templates / "runtime.js", project / "runtime.js")
    fonts = project / "assets" / "fonts"
    if not fonts.exists():
        shutil.copytree(Paths.templates / "fonts", fonts)
    W, H = layout.w, layout.h
    total = tlp["duration"]
    clips, js = [], []
    bg_w, bg_h = 1920 * layout.bg_scale, 1080 * layout.bg_scale
    bg_x, bg_y = (W - bg_w) / 2, (H - bg_h)

    for si, sc in enumerate(tlp["scenes"]):
        sid = f"sc{si}"
        dur = round(sc["end"] - sc["start"] + (0.5 if si < len(tlp["scenes"]) - 1 else 0), 3)
        parts = [f'<svg class="bgsvg" x="{bg_x:.0f}" y="{bg_y:.0f}" width="{bg_w:.0f}" height="{bg_h:.0f}" viewBox="0 0 1920 1080" '
                 f'preserveAspectRatio="xMidYMid slice">{background_svg(sc["background"], si * 7 + 3)}</svg>']
        # nesneler
        props = sc.get("props", [])
        shown = {b["show_prop"] for b in sc["beats"] if b.get("show_prop", -1) >= 0}
        n = len(props)
        span = min(W * 0.62, 260 * n * layout.prop_scale)
        for pi, p in enumerate(props):
            px = W / 2 + (pi - (n - 1) / 2) * (span / max(1, n - 1) if n > 1 else 0)
            py = layout.prop_y - (60 if n > 3 and pi % 2 else 0)
            parts.append(f'<g transform="translate({px:.0f} {py:.0f})"><g id="{sid}p{pi}" class="prop">'
                         f'{prop_svg(p["kind"], p["color"], p.get("label") or None, layout.prop_scale)}</g></g>')
        # karakterler
        insts = {}
        for ci, ch in enumerate(sc["characters"]):
            iid = f"{sid}c{ci}"
            x = _slot_x(layout, ch["slot"])
            first_action = next((b["action"] for b in sc["beats"] if b["speaker"] == ch["id"]), "idle")
            start_x = x
            if first_action == "walk_in":
                start_x = -260 if x < W / 2 else W + 260
            insts[ch["id"]] = {"iid": iid, "x": x, "start_x": start_x, "facing": ch["facing"]}
            parts.append(character_svg(ch["id"], iid, start_x, layout.ground, layout.scale, ch["facing"]))
        nx, ny, ns = layout.narrator
        nar = f"{sid}n"
        parts.append(f'<g class="narrator-float">{character_svg("bulut", nar, nx, ny, ns, "right")}</g>')
        clips.append(
            f'<div id="{sid}" class="clip scene" data-start="{sc["start"]:.3f}" data-duration="{dur:.3f}" data-track-index="0">'
            f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}"><g class="cam" id="{sid}cam">{"".join(parts)}</g></svg></div>'
        )
        s0, s1 = sc["start"], sc["start"] + dur
        js.append(f'BK.ambient(tl,"{sid}",{s0:.3f},{dur:.3f});')
        js.append(f'tl.fromTo("#{sid}cam",{{scale:1,transformOrigin:"50% 60%"}},{{scale:1.045,duration:{dur:.3f},ease:"none"}},{s0:.3f});')
        js.append(f'tl.to("#{nar}",{{y:{ny - 18},duration:1.6,yoyo:true,repeat:{max(1, int(dur / 1.6)) - 1},ease:"sine.inOut"}},{s0:.3f});')
        for cid, info in insts.items():
            js.append(f'BK.breathe(tl,"{info["iid"]}",{s0:.3f},{dur:.3f});')
            js.append(f'BK.emo(tl,"{info["iid"]}","happy",{s0:.3f});')
            for bt in _blink_times(s0, s1, zlib.crc32(info["iid"].encode()) % 97 + si):
                js.append(f'BK.blink(tl,"{info["iid"]}",{bt});')
        js.append(f'BK.emo(tl,"{nar}","happy",{s0:.3f});')
        for bt in _blink_times(s0, s1, si + 5):
            js.append(f'BK.blink(tl,"{nar}",{bt});')
        for pi in range(n):
            first = next((b["start"] for b in sc["beats"] if b.get("show_prop") == pi), None)
            at = first if first is not None else s0 + 0.4
            js.append(f'BK.pop(tl,"#{sid}p{pi}",{at:.3f});BK.float(tl,"#{sid}p{pi}",{at + 0.5:.3f},{max(1.0, s1 - at - 0.5):.3f});')
            if first is not None:
                js.append(f'tl.set("#{sid}p{pi}",{{scale:0}},{s0:.3f});')
        # konuşmalar
        for b in sc["beats"]:
            spk = b["speaker"]
            t0 = b["start"]
            if spk == "narrator" or spk not in insts:
                js.append(f'BK.talk(tl,"{nar}",{_js(b["env"])},{t0:.3f},{ENV_FPS},"happy");')
                if spk == "narrator" and b.get("emotion") in ("surprised", "excited", "thinking"):
                    js.append(f'BK.emo(tl,"{nar}","{b["emotion"]}",{t0 + b["dur"]:.3f});BK.emo(tl,"{nar}","happy",{t0 + b["dur"] + 1.0:.3f});')
                continue
            me = insts[spk]
            js.append(f'BK.emo(tl,"{me["iid"]}","{b["emotion"]}",{t0:.3f});')
            js.append(f'BK.talk(tl,"{me["iid"]}",{_js(b["env"])},{t0:.3f},{ENV_FPS},"{b["emotion"]}");')
            # dinleyiciler konuşana döner
            for cid, other in insts.items():
                if cid == spk:
                    continue
                js.append(f'BK.face(tl,"{other["iid"]}","{"right" if me["x"] > other["x"] else "left"}",{t0:.3f});')
            others = [o["x"] for c, o in insts.items() if c != spk]
            if others:
                mean = sum(others) / len(others)
                js.append(f'BK.face(tl,"{me["iid"]}","{"right" if mean > me["x"] else "left"}",{t0:.3f});')
            act = b.get("action", "talk")
            if act in ("walk_in", "walk_out"):
                frm = me["start_x"] if act == "walk_in" else me["x"]
                to = me["x"] if act == "walk_in" else (-300 if me["x"] < W / 2 else W + 300)
                js.append(f'BK.act(tl,"{me["iid"]}","{act}",{t0:.3f},{b["dur"]:.3f},{{from:{frm:.0f},to:{to:.0f}}});')
            elif act not in ("talk", "idle"):
                js.append(f'BK.act(tl,"{me["iid"]}","{act}",{t0:.3f},{b["dur"]:.3f},{{}});')
            if b.get("emotion") in ("surprised", "excited") and len(insts) > 1:
                ox = me["x"]
                js.append(f'tl.to("#{sid}cam",{{scale:1.12,transformOrigin:"{ox:.0f}px {layout.ground - 250:.0f}px",duration:0.35,ease:"power2.out"}},{t0:.3f});')
                js.append(f'tl.to("#{sid}cam",{{scale:1.045,duration:0.5,ease:"power2.inOut"}},{t0 + b["dur"] + 0.1:.3f});')
        if sc["id"] == "outro":
            js.append(f'BK.act(tl,"{insts["bobo"]["iid"]}","dance",{s0 + 0.6:.3f},{dur - 1:.3f},{{}});' if "bobo" in insts else "")

    # geçişler (bulut silme)
    puffs = '<rect x="0.08" y="-0.1" width="0.94" height="1.2" fill="#fff"/>' + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff"/>' for x, y, r in
                    [(0, 0.2, 0.32), (0.25, 0.05, 0.36), (0.5, 0.3, 0.4), (0.15, 0.65, 0.38), (0.45, 0.85, 0.42),
                     (0.75, 0.15, 0.34), (0.8, 0.6, 0.4), (1.0, 0.35, 0.36), (1.1, 0.9, 0.34), (0.3, 0.45, 0.4)])
    for si, sc in enumerate(tlp["scenes"][1:], 1):
        tb = sc["start"]
        wid = f"wipe{si}"
        clips.append(
            f'<div id="{wid}" class="clip wipe" data-start="{tb - 0.55:.3f}" data-duration="1.1" data-track-index="2">'
            f'<svg width="{int(W * 1.6)}" height="{H}" viewBox="-0.15 -0.1 1.3 1.2" preserveAspectRatio="none" '
            f'style="position:absolute;left:0;top:0">{puffs}</svg></div>')
        js.append(f'tl.fromTo("#{wid} svg",{{x:{-W * 1.6:.0f}}},{{x:{W * 1.05:.0f},duration:1.1,ease:"power1.inOut"}},{tb - 0.55:.3f});')

    # altyazılar
    for sc in tlp["scenes"]:
        beats = sc["beats"]
        for bi, b in enumerate(beats):
            cid = f"cap_{sc['id']}_{bi}_{int(b['start']*1000)}"
            words = b.get("words") or [{"word": w, "start": b["start"], "end": b["start"] + b["dur"]} for w in b["text"].split()]
            end = b["start"] + b["dur"] + 0.35
            nxt = beats[bi + 1]["start"] if bi + 1 < len(beats) else end
            dur = max(0.4, min(end, nxt) - b["start"])
            color = speaker_color(b["speaker"])
            spans = "".join(f'<span id="{cid}w{k}">{_esc(w["word"])}</span> ' for k, w in enumerate(words))
            clips.append(
                f'<div id="{cid}" class="clip caption" data-start="{b["start"]:.3f}" data-duration="{dur:.3f}" data-track-index="3">'
                f'<div class="capbox"><div class="who" style="background:{color}">{_esc(speaker_name(b["speaker"]))}</div>'
                f'<div class="txt">{spans}</div></div></div>')
            js.append(f'tl.fromTo("#{cid} .capbox",{{y:30,opacity:0}},{{y:0,opacity:1,duration:0.18}},{b["start"]:.3f});')
            for k, w in enumerate(words):
                js.append(f'tl.set("#{cid}w{k}",{{color:"{color}"}},{w["start"]:.3f});')

    # sabit katmanlar: logo, başlık
    logo = (f'<div class="clip bug" data-start="0" data-duration="{total:.3f}" data-track-index="4"><div class="bugin">'
            f'<img src="assets/watermark.png"/><span>{_esc(brand.get("name", "Bulutkent"))}</span></div></div>')
    clips.append(logo)
    if title_overlay:
        clips.append(f'<div id="ttl" class="clip titlecard" data-start="0.6" data-duration="4" data-track-index="5">'
                     f'<div class="tc">{_esc(title_overlay)}</div></div>')
        js.append('tl.fromTo("#ttl .tc",{y:-140,opacity:0},{y:0,opacity:1,duration:0.5,ease:"back.out(1.8)"},0.6);')
        js.append('tl.to("#ttl .tc",{y:-140,opacity:0,duration:0.4},4.2);')
    if shorts_title:
        clips.append(f'<div id="stl" class="clip stitle" data-start="0" data-duration="{total:.3f}" data-track-index="5">'
                     f'<div class="st">{_esc(shorts_title)}</div></div>')
        js.append('tl.fromTo("#stl .st",{scale:0.6,opacity:0},{scale:1,opacity:1,duration:0.45,ease:"back.out(2)"},0.1);')
    wm = Paths.logos / "watermark.png"
    if wm.exists():
        shutil.copy(wm, project / "assets" / "watermark.png")

    cap_w = int(W * (0.8 if layout.name == "landscape" else 0.9))
    css = f"""
@font-face{{font-family:'Baloo 2';font-weight:800;src:url('assets/fonts/baloo-2-latin-ext-800-normal.woff2') format('woff2');unicode-range:U+0100-02AF,U+1E00-1EFF;}}
@font-face{{font-family:'Baloo 2';font-weight:800;src:url('assets/fonts/baloo-2-latin-800-normal.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+2000-206F;}}
@font-face{{font-family:'Nunito';font-weight:900;src:url('assets/fonts/nunito-latin-ext-900-normal.woff2') format('woff2');unicode-range:U+0100-02AF,U+1E00-1EFF;}}
@font-face{{font-family:'Nunito';font-weight:900;src:url('assets/fonts/nunito-latin-900-normal.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+2000-206F;}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#BDEBFF}}
#root{{position:relative;width:{W}px;height:{H}px;overflow:hidden}}
.clip{{position:absolute;left:0;top:0;width:{W}px;height:{H}px}}
.wipe{{overflow:hidden}}
.caption{{display:flex;align-items:flex-end;justify-content:center;padding-bottom:{layout.caption_bottom}px;pointer-events:none}}
.capbox{{max-width:{cap_w}px;background:rgba(255,255,255,.94);border:5px solid #2B2D42;border-radius:34px;padding:14px 34px 16px;
  box-shadow:0 8px 0 rgba(43,45,66,.18);position:relative;text-align:center}}
.who{{position:absolute;top:-28px;left:28px;font:900 {int(layout.caption_size*0.62)}px Nunito;color:#fff;padding:2px 18px;border-radius:20px;border:4px solid #2B2D42}}
.txt{{font:900 {layout.caption_size}px/1.2 Nunito;color:#2B2D42}}
.bug{{pointer-events:none}}
.bugin{{position:absolute;left:{28 if layout.name=='landscape' else 30}px;top:{24 if layout.name=='landscape' else 60}px;display:flex;align-items:center;gap:8px;opacity:.9}}
.bugin img{{width:{70 if layout.name=='landscape' else 90}px;height:auto}}
.bugin span{{font:800 {38 if layout.name=='landscape' else 46}px 'Baloo 2';color:#fff;-webkit-text-stroke:5px #2B2D42;paint-order:stroke fill}}
.titlecard{{display:flex;justify-content:center;align-items:flex-start;padding-top:110px}}
.tc{{height:fit-content;font:800 64px/1.1 'Baloo 2';color:#fff;background:#FF7A59;border:6px solid #fff;border-radius:50px;padding:10px 48px;
  box-shadow:0 10px 0 rgba(0,0,0,.15);-webkit-text-stroke:3px #2B2D42;paint-order:stroke fill;max-width:1500px;text-align:center}}
.stitle{{display:flex;justify-content:center;padding-top:180px}}
.st{{height:fit-content;font:800 76px/1.08 'Baloo 2';color:#fff;background:#FF7A59;border:7px solid #fff;border-radius:44px;padding:16px 40px;
  box-shadow:0 10px 0 rgba(0,0,0,.15);-webkit-text-stroke:4px #2B2D42;paint-order:stroke fill;max-width:960px;text-align:center}}
"""
    page = (
        f'<!doctype html><html lang="tr"><head><meta charset="UTF-8"/><meta name="viewport" content="width={W}, height={H}"/>'
        f'<script src="gsap.min.js"></script><script src="runtime.js"></script><style>{css}</style></head><body>'
        f'<div id="root" data-composition-id="main" data-start="0" data-duration="{total:.3f}" data-width="{W}" data-height="{H}">'
        f'{"".join(clips)}</div>'
        f'<script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});\n'
        + "\n".join(x for x in js if x)
        + '\nwindow.__timelines["main"]=tl;tl.seek(0);</script></body></html>'
    )
    out = project / "index.html"
    out.write_text(page, encoding="utf-8")
    (project / "hyperframes.json").write_text(json.dumps({"paths": {"assets": "assets"}}, indent=2))
    (project / "meta.json").write_text(json.dumps({"id": project.name, "name": tlp["title"]}, ensure_ascii=False))
    return out


# --------------------------------------------------------------------------- render ve birleştirme

def render(project: Path, out_mp4: Path, timeout: int = 3600) -> Path:
    out_mp4.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["hyperframes", "render", "-o", str(out_mp4.resolve()), "--quiet"]
    proc = subprocess.run(cmd, cwd=project, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0 or not out_mp4.exists():
        # --quiet desteklenmiyorsa bayraksız tekrar dene
        proc = subprocess.run(cmd[:-1], cwd=project, capture_output=True, text=True, timeout=timeout)
        if proc.returncode != 0 or not out_mp4.exists():
            raise RuntimeError(f"HyperFrames render başarısız: {(proc.stderr or proc.stdout)[-1500:]}")
    return out_mp4


def mux(video: Path, mix_wav: Path, out: Path, duration: float) -> Path:
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-i", str(mix_wav),
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
        "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{duration:.3f}",
        "-movflags", "+faststart", str(out)], check=True)
    return out
