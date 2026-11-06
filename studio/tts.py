"""Seslendirme: Piper (yerel, ücretsiz) veya ElevenLabs (isteğe bağlı, ücretli).

Her karakterin kendine özgü sesi: Piper Türkçe modeli + karakter başına konuşma hızı ve
ton kaydırma (FFmpeg rubberband, formant korumalı). Çıktı: 44.1 kHz mono WAV.
"""
from __future__ import annotations

import hashlib
import subprocess
import wave
from pathlib import Path

import httpx
from loguru import logger

from . import costs
from .characters import voice_for
from .config import Paths, env, has_key, settings

SR = 44100
_voice = None


def _piper():
    global _voice
    if _voice is None:
        from piper import PiperVoice
        model = Paths.root / settings()["audio"]["piper_voice"]
        if not model.exists():
            raise FileNotFoundError(f"Piper ses modeli yok: {model} (scripts/install.sh çalıştırın)")
        _voice = PiperVoice.load(str(model))
    return _voice


def engine() -> str:
    pref = settings()["audio"].get("tts_engine", "auto")
    if pref in ("auto", "elevenlabs") and has_key("ELEVENLABS_API_KEY"):
        return "elevenlabs"
    if pref == "espeak":
        return "espeak"
    model = Paths.root / settings()["audio"]["piper_voice"]
    return "piper" if model.exists() else "espeak"


def _post(raw: Path, out: Path, pitch: float, tempo: float = 1.0) -> None:
    filters = []
    if abs(pitch) > 0.01 or abs(tempo - 1) > 0.01:
        filters.append(f"rubberband=pitch={2 ** (pitch / 12):.4f}:tempo={tempo:.3f}:formant=preserved")
    filters += ["highpass=f=70", "afade=t=in:d=0.02"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", ",".join(filters), "-ar", str(SR), "-ac", "1",
                    str(out)], check=True)


def _clean_text(text: str) -> str:
    # TTS için yalnızca okunacak metin; emoji vb. çıkarılır
    return "".join(ch for ch in text if ch.isalnum() or ch in " .,!?'-:;…\"").strip() or "..."


def synth(text: str, speaker: str, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    v = voice_for(speaker)
    eng = engine()
    key = hashlib.sha1(f"{eng}|{speaker}|{text}|{v}".encode()).hexdigest()[:14]
    out = out_dir / f"{speaker}_{key}.wav"
    if out.exists():
        return out
    raw = out_dir / f"raw_{key}.wav"
    clean = _clean_text(text)
    if eng == "elevenlabs":
        try:
            _eleven(clean, v, raw)
            _post(raw, out, 0.0)
            raw.unlink(missing_ok=True)
            return out
        except Exception as exc:
            logger.warning(f"ElevenLabs başarısız, Piper'a geçiliyor: {exc}")
            eng = "piper"
    if eng == "piper":
        from piper import SynthesisConfig
        cfg = SynthesisConfig(length_scale=v["length_scale"], noise_scale=v["noise_scale"], noise_w_scale=0.8)
        with wave.open(str(raw), "wb") as wf:
            _piper().synthesize_wav(clean, wf, syn_config=cfg)
    else:
        speed = int(160 / v["length_scale"])
        subprocess.run(["espeak-ng", "-v", "tr", "-s", str(speed), "-w", str(raw), clean], check=True)
    _post(raw, out, v["engine_pitch"])
    raw.unlink(missing_ok=True)
    return out


def _eleven(text: str, voice: dict, out: Path) -> None:
    voice_id = env(f"ELEVENLABS_VOICE_{voice.get('eleven_voice', 'default').upper().replace('-', '_')}") or env("ELEVENLABS_VOICE_DEFAULT")
    if not voice_id:
        raise RuntimeError("ElevenLabs ses kimliği tanımlı değil (.env ELEVENLABS_VOICE_DEFAULT)")
    usd = len(text) / 1000 * costs.ELEVENLABS_USD_PER_1K_CHARS
    costs.check(usd)
    r = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=pcm_44100",
        headers={"xi-api-key": env("ELEVENLABS_API_KEY")},
        json={"text": text, "model_id": env("ELEVENLABS_MODEL", "eleven_multilingual_v2"), "language_code": "tr"},
        timeout=120,
    )
    r.raise_for_status()
    with wave.open(str(out), "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(44100); wf.writeframes(r.content)
    costs.record("elevenlabs", "tts", len(text), usd, voice_id)


def duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wf:
        return wf.getnframes() / wf.getframerate()
