"""Merkezi ayarlar: config/settings.json + .env (gizli anahtarlar)."""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


class Paths:
    root = ROOT
    scripts = ROOT / "scripts"
    stories = ROOT / "stories"
    characters = ROOT / "characters"
    brand = ROOT / "brand"
    logos = ROOT / "logos"
    banners = ROOT / "banners"
    images = ROOT / "images"
    audio = ROOT / "audio"
    music = ROOT / "music"
    subtitles = ROOT / "subtitles"
    scenes = ROOT / "scenes"
    renders = ROOT / "renders"
    thumbnails = ROOT / "thumbnails"
    shorts = ROOT / "shorts"
    published = ROOT / "published"
    database = ROOT / "database"
    logs = ROOT / "logs"
    config = ROOT / "config"
    secrets = ROOT / "config" / "secrets"
    templates = ROOT / "templates"
    dashboard = ROOT / "dashboard"
    vendor = ROOT / "vendor"
    models = ROOT / "models"

    @classmethod
    def use_channel(cls, name: str) -> None:
        """Kanala özel veri klasörleri: channels/<ad>/... (kod, şablon ve modeller ortak)."""
        if not name or name == "bulutkent":
            return
        base = ROOT / "channels" / name
        for attr in ("stories", "brand", "logos", "banners", "images", "audio", "music", "subtitles", "scenes",
                     "renders", "thumbnails", "shorts", "published", "database", "logs"):
            setattr(cls, attr, base / attr)
        cls.secrets = base / "secrets"
        cls.channel_dir = base

    @classmethod
    def ensure(cls) -> None:
        for name, value in vars(cls).items():
            if isinstance(value, Path) and name != "root":
                value.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(cls.secrets, 0o700)
        except OSError:
            pass


CHANNEL = os.environ.get("BK_CHANNEL", "bulutkent").strip() or "bulutkent"
Paths.use_channel(CHANNEL)


def _merge(a: dict, b: dict) -> dict:
    out = dict(a)
    for k, v in b.items():
        out[k] = _merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


@lru_cache(maxsize=1)
def settings() -> dict:
    with open(ROOT / "config" / "settings.json", encoding="utf-8") as fh:
        base = json.load(fh)
    ch = ROOT / "channels" / CHANNEL / "settings.json"
    if CHANNEL != "bulutkent" and ch.exists():
        base = _merge(base, json.loads(ch.read_text(encoding="utf-8")))
    return base


def tz() -> ZoneInfo:
    return ZoneInfo(settings()["timezone"])


def env(name: str, default: str = "") -> str:
    value = os.environ.get(name, default) or default
    return value.strip()


def has_key(name: str) -> bool:
    value = env(name)
    return bool(value) and value not in {"change-me", "dummy"}
