"""Whisper ile altyazı: kelime zaman damgaları, senaryo metniyle hizalama, SRT, anlaşılırlık kontrolü."""
from __future__ import annotations

import difflib
import os
import re
from pathlib import Path

import numpy as np
from loguru import logger

from .config import Paths, settings

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
_model = None


def model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        cfg = settings()["whisper"]
        _model = WhisperModel(cfg["model"], device="cpu", compute_type=cfg.get("compute_type", "int8"),
                              download_root=str(Paths.models / "whisper"))
    return _model


def available() -> bool:
    try:
        model()
        return True
    except Exception as exc:
        logger.warning(f"Whisper modeli yüklenemedi: {exc}")
        return False


def transcribe(sig44k: np.ndarray) -> list[dict]:
    """44.1 kHz mono sinyal -> [{word, start, end}]"""
    import librosa
    a16 = librosa.resample(sig44k.astype(np.float32), orig_sr=44100, target_sr=16000)
    segs, _ = model().transcribe(a16, language="tr", word_timestamps=True, vad_filter=False, beam_size=5,
                                 condition_on_previous_text=False)
    words = []
    for s in segs:
        for w in s.words or []:
            words.append({"word": w.word.strip(), "start": float(w.start), "end": float(w.end)})
    return words


def _norm(s: str) -> str:
    return re.sub(r"[^\wçğıöşü]", "", s.lower())


def align_line(text: str, line_start: float, line_dur: float, whisper_words: list[dict]) -> list[dict]:
    """Senaryodaki kelimelere Whisper zamanlarını eşler; eşleşmeyenler orantılı dağıtılır."""
    tokens = text.split()
    inside = [w for w in whisper_words if w["end"] > line_start - 0.1 and w["start"] < line_start + line_dur + 0.1]
    if not tokens:
        return []
    if not inside:
        step = line_dur / len(tokens)
        return [{"word": t, "start": line_start + i * step, "end": line_start + (i + 1) * step} for i, t in enumerate(tokens)]
    sm = difflib.SequenceMatcher(a=[_norm(t) for t in tokens], b=[_norm(w["word"]) for w in inside], autojunk=False)
    times: list[tuple[float, float] | None] = [None] * len(tokens)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            w = inside[blk.b + k]
            times[blk.a + k] = (w["start"], w["end"])
    # boşlukları komşulardan doldur
    lo, hi = line_start, line_start + line_dur
    for i in range(len(tokens)):
        if times[i] is None:
            prev_end = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), lo)
            nxt = next(((j, times[j][0]) for j in range(i + 1, len(tokens)) if times[j]), (len(tokens), hi))
            gap = max(0.05, (nxt[1] - prev_end) / max(1, nxt[0] - i))
            times[i] = (prev_end, prev_end + gap)
    return [{"word": t, "start": max(lo, a), "end": min(hi, max(a + 0.05, b))} for t, (a, b) in zip(tokens, times)]


def similarity(script: str, words: list[dict]) -> float:
    """Karakter düzeyinde benzerlik. autojunk kapalı: uzun metinlerde difflib'in 'sık karakteri yok say' kısayolu skoru bozuyordu."""
    heard = " ".join(x for x in (_norm(w["word"]) for w in words) if x)
    said = " ".join(x for x in (_norm(t) for t in script.split()) if x)
    if not said:
        return 0.0
    return difflib.SequenceMatcher(a=said, b=heard, autojunk=False).ratio()


def _ts(t: float) -> str:
    h, rem = divmod(max(0.0, t), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s - int(s)) * 1000):03d}"


def write_srt(lines: list[dict], path: Path) -> Path:
    """lines: [{start, end, text}]"""
    out = []
    for i, ln in enumerate(lines, 1):
        out.append(f"{i}\n{_ts(ln['start'])} --> {_ts(ln['end'])}\n{ln['text']}\n")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(out), encoding="utf-8")
    return path
