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
    def ensure(cls) -> None:
        for name, value in vars(cls).items():
            if isinstance(value, Path) and name != "root":
                value.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(cls.secrets, 0o700)
        except OSError:
            pass


@lru_cache(maxsize=1)
def settings() -> dict:
    with open(ROOT / "config" / "settings.json", encoding="utf-8") as fh:
        return json.load(fh)


def tz() -> ZoneInfo:
    return ZoneInfo(settings()["timezone"])


def env(name: str, default: str = "") -> str:
    value = os.environ.get(name, default) or default
    return value.strip()


def has_key(name: str) -> bool:
    value = env(name)
    return bool(value) and value not in {"change-me", "dummy"}
