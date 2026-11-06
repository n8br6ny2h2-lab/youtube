"""Görüntü ve ses kalite kontrolü (FFmpeg/ffprobe ölçümleri). Başarısız video yayınlanmaz."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


def probe(path: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def _filter_log(path: Path, vf: str | None = None, af: str | None = None) -> str:
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path)]
    if vf:
        cmd += ["-vf", vf]
    else:
        cmd += ["-vn"]
    if af:
        cmd += ["-af", af]
    else:
        cmd += ["-an"]
    cmd += ["-f", "null", "-"]
    return subprocess.run(cmd, capture_output=True, text=True).stderr


def check(path: Path, kind: str = "long", min_s: float = 60, max_s: float | None = None,
          intelligibility: float | None = None, safety_passed: bool = True) -> dict:
    res: dict = {"checks": {}, "passed": False}
    c = res["checks"]
    try:
        info = probe(path)
    except Exception as exc:
        res["error"] = f"ffprobe hatası: {exc}"
        return res
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    dur = float(info["format"]["duration"])
    want = (1920, 1080) if kind == "long" else (1080, 1920)
    c["video_stream"] = v is not None
    c["audio_stream"] = a is not None
    c["resolution"] = bool(v) and (v["width"], v["height"]) == want
    c["codec_h264_yuv420p"] = bool(v) and v["codec_name"] == "h264" and v.get("pix_fmt") == "yuv420p"
    c["duration_ok"] = dur >= min_s and (max_s is None or dur <= max_s)
    res["duration"] = round(dur, 2)
    # Ses yüksekliği (YouTube -14 LUFS civarına normalize eder; çok kısık/yüksek ses reddedilir)
    log = _filter_log(path, af="ebur128=peak=true")
    m = re.findall(r"I:\s+(-?\d+\.\d) LUFS", log)
    tp = re.findall(r"Peak:\s+(-?\d+\.\d) dBFS", log)
    lufs = float(m[-1]) if m else None
    res["lufs"] = lufs
    res["true_peak"] = float(tp[-1]) if tp else None
    c["loudness"] = lufs is not None and -17.0 <= lufs <= -11.0
    c["no_clipping"] = res["true_peak"] is None or res["true_peak"] <= -0.5
    # Uzun sessizlik
    sil = _filter_log(path, af="silencedetect=noise=-45dB:d=4")
    res["silences"] = len(re.findall(r"silence_end", sil))
    c["no_long_silence"] = res["silences"] == 0
    # Siyah kare ve donma
    vlog = _filter_log(path, vf="blackdetect=d=0.5:pix_th=0.10,freezedetect=n=-60dB:d=6")
    res["black_segments"] = len(re.findall(r"black_start", vlog))
    res["freeze_segments"] = len(re.findall(r"freeze_start", vlog))
    c["no_black_frames"] = res["black_segments"] == 0
    c["no_frozen_video"] = res["freeze_segments"] == 0
    c["size_ok"] = path.stat().st_size < 2_000_000_000
    if intelligibility is not None:
        res["intelligibility"] = intelligibility
        c["speech_intelligible"] = intelligibility >= 0.75
    c["content_safety"] = safety_passed
    res["passed"] = all(c.values())
    res["failed"] = [k for k, ok in c.items() if not ok]
    return res
