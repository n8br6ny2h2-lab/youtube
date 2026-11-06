"""Özgün müzik ve ses efekti sentezi + miksaj (telifsiz, tamamen yerel üretim).

Müzik: rastgele tohumla seçilen akor dizisi, melodi, bas ve hafif ritimden oluşan basit
çocuk müziği. Ruh hâli (happy/calm/adventure/lullaby/silly/mystery) tempo, ton ve enstrümanı belirler.
"""
from __future__ import annotations

import json
import random
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100

MOODS = {
    "happy": {"bpm": 112, "scale": "major", "prog": [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], "lead": "marimba", "drums": True},
    "silly": {"bpm": 124, "scale": "major", "prog": [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], "lead": "pluck", "drums": True},
    "adventure": {"bpm": 104, "scale": "major", "prog": [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], "lead": "bell", "drums": True},
    "calm": {"bpm": 84, "scale": "major", "prog": [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]], "lead": "bell", "drums": False},
    "lullaby": {"bpm": 66, "scale": "major", "prog": [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]], "lead": "celesta", "drums": False},
    "mystery": {"bpm": 92, "scale": "minor", "prog": [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 11, 14]], "lead": "pluck", "drums": False},
}
SCALES = {"major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10]}


def _f(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def _env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / max(decay, 1e-3))


def _tone(freq: float, dur: float, kind: str) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    if kind == "marimba":
        w = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 4 * t) * np.exp(-t * 18)
        e = _env(n, 0.003, 0.35)
    elif kind == "bell":
        w = np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 6)
        e = _env(n, 0.002, 0.7)
    elif kind == "celesta":
        w = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-t * 8)
        e = _env(n, 0.004, 1.1)
    elif kind == "pluck":
        w = np.sign(np.sin(2 * np.pi * freq * t)) * 0.3 + np.sin(2 * np.pi * freq * t) * 0.7
        e = _env(n, 0.002, 0.18)
    elif kind == "bass":
        w = np.sin(2 * np.pi * freq * t) + 0.2 * np.sin(4 * np.pi * freq * t)
        e = _env(n, 0.01, 0.45)
    elif kind == "pad":
        w = sum(np.sin(2 * np.pi * freq * (1 + d) * t) for d in (-0.003, 0, 0.004)) / 3
        e = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.3).clip(0, 1)
    else:
        w = np.sin(2 * np.pi * freq * t)
        e = _env(n, 0.005, 0.3)
    return (w * e).astype(np.float32)


def _add(buf: np.ndarray, sig: np.ndarray, start: float, gain: float = 1.0) -> None:
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def music(mood: str, seconds: float, seed: int) -> np.ndarray:
    cfg = MOODS.get(mood, MOODS["happy"])
    rnd = random.Random(seed)
    key = rnd.choice([60, 62, 65, 67, 57])  # C, D, F, G, A
    bpm = cfg["bpm"] + rnd.randint(-6, 6)
    beat = 60 / bpm
    bar = beat * 4 if mood != "lullaby" else beat * 3
    beats_per_bar = 4 if mood != "lullaby" else 3
    scale = SCALES[cfg["scale"]]
    prog = cfg["prog"][:]
    if rnd.random() < 0.5:
        prog = prog[:2] + prog[2:][::-1]
    n = int((seconds + 2) * SR)
    buf = np.zeros(n, np.float32)
    # 4 ölçülük melodi motifi (tekrar edilebilir, akılda kalıcı), sonra varyasyon
    motif = []
    for _ in range(beats_per_bar * 2):
        motif.append(rnd.choice([0, 1, 2, 2, 3, 4, 4, 5, None]))
    t, barno = 0.0, 0
    while t < seconds + 1:
        chord = prog[barno % len(prog)]
        root = key + chord[0] - 12
        _add(buf, _tone(_f(root - 12), bar * 0.95, "bass"), t, 0.35)
        for k, iv in enumerate(chord):
            _add(buf, _tone(_f(key + iv - 12), bar, "pad"), t, 0.06)
        for bi in range(beats_per_bar):
            step = motif[(barno % 2) * beats_per_bar + bi]
            if step is not None:
                deg = (step + (1 if barno % 4 == 3 and bi == beats_per_bar - 1 else 0)) % len(scale)
                note = key + chord[0] % 12 * 0 + scale[deg] + (12 if mood in ("lullaby", "calm") else 0)
                _add(buf, _tone(_f(note), beat * 1.6, cfg["lead"]), t + bi * beat, 0.22)
            if cfg["drums"]:
                if bi % 2 == 0:
                    kick = _tone(70, 0.18, "sine") * np.exp(-np.arange(int(0.18 * SR)) / SR * 30)
                    _add(buf, kick, t + bi * beat, 0.35)
                shaker = (np.random.default_rng(seed + barno * 10 + bi).standard_normal(int(0.05 * SR)) *
                          _env(int(0.05 * SR), 0.002, 0.02)).astype(np.float32)
                _add(buf, shaker, t + bi * beat + beat / 2, 0.06)
        t += bar
        barno += 1
    fade = int(1.5 * SR)
    buf = buf[: int(seconds * SR)]
    buf[-fade:] *= np.linspace(1, 0, min(fade, len(buf)))[-len(buf[-fade:]):]
    buf[: int(0.5 * SR)] *= np.linspace(0, 1, int(0.5 * SR))[: len(buf[: int(0.5 * SR)])]
    peak = np.max(np.abs(buf)) or 1
    return (buf / peak * 0.6).astype(np.float32)


def sfx(name: str, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    if name == "pop":
        n = int(0.12 * SR); t = np.arange(n) / SR
        return (np.sin(2 * np.pi * (900 - 4000 * t) * t) * _env(n, 0.001, 0.04)).astype(np.float32)
    if name == "boing":
        n = int(0.45 * SR); t = np.arange(n) / SR
        f = 220 + 120 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 4)
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.003, 0.25)).astype(np.float32)
    if name == "whoosh":
        n = int(0.6 * SR); noise = rng.standard_normal(n)
        k = np.hanning(200); noise = np.convolve(noise, k / k.sum(), "same")
        return (noise * np.hanning(n) * 1.2).astype(np.float32)
    if name == "sparkle":
        out = np.zeros(int(0.9 * SR), np.float32)
        for i, m in enumerate([84, 88, 91, 96, 100]):
            _add(out, _tone(_f(m), 0.5, "bell"), i * 0.07, 0.4)
        return out
    if name == "ding":
        return _tone(_f(88), 0.9, "bell") * 0.8
    if name == "tada":
        out = np.zeros(int(1.2 * SR), np.float32)
        for i, m in enumerate([72, 76, 79]):
            _add(out, _tone(_f(m), 0.25, "marimba"), i * 0.09, 0.5)
        for m in (72, 76, 79, 84):
            _add(out, _tone(_f(m), 0.9, "bell"), 0.3, 0.3)
        return out
    if name == "splash":
        n = int(0.7 * SR); noise = rng.standard_normal(n)
        return (noise * _env(n, 0.005, 0.18) * 0.6).astype(np.float32)
    if name == "drum":
        out = np.zeros(int(0.6 * SR), np.float32)
        for i in range(3):
            n = int(0.15 * SR)
            _add(out, (_tone(110, 0.15, "sine") + rng.standard_normal(n).astype(np.float32) * 0.2) * np.exp(-np.arange(n) / SR * 25), i * 0.16, 0.8)
        return out
    if name == "clap":
        out = np.zeros(int(0.3 * SR), np.float32)
        for d in (0, 0.012, 0.022):
            n = int(0.08 * SR)
            _add(out, rng.standard_normal(n).astype(np.float32) * _env(n, 0.001, 0.02), d, 0.6)
        return out
    if name == "rain":
        n = int(2.0 * SR)
        drops = (rng.random(n) > 0.9993).astype(np.float32) * rng.random(n).astype(np.float32)
        k = np.exp(-np.arange(200) / 30.0)
        return (np.convolve(drops, k, "same") * 0.8 + rng.standard_normal(n) * 0.03).astype(np.float32)
    if name == "giggle":
        out = np.zeros(int(0.8 * SR), np.float32)
        for i in range(5):
            n = int(0.09 * SR); t = np.arange(n) / SR
            _add(out, np.sin(2 * np.pi * (700 + 60 * i) * t * (1 + 0.3 * np.sin(2 * np.pi * 30 * t))) * _env(n, 0.005, 0.04), i * 0.12, 0.35)
        return out
    return np.zeros(1, np.float32)


def read_mono(path: Path) -> np.ndarray:
    data, sr = sf.read(str(path), dtype="float32", always_2d=True)
    mono = data.mean(axis=1)
    if sr != SR:
        import librosa
        mono = librosa.resample(mono, orig_sr=sr, target_sr=SR)
    return mono.astype(np.float32)


def envelope(sig: np.ndarray, fps: float = 15.0) -> list[float]:
    """Dudak senkronu için RMS zarfı (0-1)."""
    hop = int(SR / fps)
    if len(sig) == 0:
        return []
    frames = [float(np.sqrt(np.mean(sig[i:i + hop] ** 2))) for i in range(0, len(sig), hop)]
    peak = max(frames) or 1.0
    return [min(1.0, f / (peak * 0.7)) for f in frames]


def mix(voice: np.ndarray, music_track: np.ndarray, fx: np.ndarray, music_db: float = -20.0) -> np.ndarray:
    n = max(len(voice), len(music_track), len(fx))
    v = np.pad(voice, (0, n - len(voice)))
    m = np.pad(music_track, (0, n - len(music_track)))
    e = np.pad(fx, (0, n - len(fx)))
    # Ducking: konuşma varken müzik ek olarak ~8 dB kısılır (yumuşak geçişli)
    hop = 1024
    env = np.array([np.sqrt(np.mean(v[i:i + hop] ** 2)) for i in range(0, n, hop)])
    active = (env > 0.01).astype(np.float32)
    k = np.ones(20) / 20
    active = np.clip(np.convolve(active, k, "same") * 1.5, 0, 1)
    duck = np.repeat(1 - active * 0.6, hop)[:n]
    music_gain = 10 ** (music_db / 20) * 3.0
    out = v * 1.0 + m * music_gain * duck + e * 0.5
    peak = np.max(np.abs(out)) or 1
    if peak > 0.98:
        out = out / peak * 0.98
    return out.astype(np.float32)


def write_wav(path: Path, sig: np.ndarray) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), sig, SR, subtype="PCM_16")
    return path


def loudnorm(src: Path, dst: Path, target: float = -14.0) -> dict:
    """İki geçişli EBU R128 normalizasyonu. Ölçüm sonucunu döndürür."""
    first = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(src), "-af", f"loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True)
    txt = first.stderr
    stats = json.loads(txt[txt.rfind("{"): txt.rfind("}") + 1])
    flt = (f"loudnorm=I={target}:TP=-1.5:LRA=11:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
           f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-af", flt, "-ar", str(SR), str(dst)], check=True)
    return stats
