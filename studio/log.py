"""Loglama ve hata kaydı (aynı hata tekrar ederse yeni satır yerine sayaç artar)."""
from __future__ import annotations

import hashlib
import sys
import traceback

from loguru import logger

from . import db
from .config import Paths

_configured = False


def setup() -> None:
    global _configured
    if _configured:
        return
    Paths.logs.mkdir(parents=True, exist_ok=True)
    logger.remove()
    logger.add(sys.stderr, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{level: <7}</level> | {message}")
    logger.add(Paths.logs / "studio.log", level="DEBUG", rotation="10 MB", retention=10, encoding="utf-8")
    _configured = True


def record_error(stage: str, exc: BaseException | str, detail: str = "") -> None:
    message = str(exc)
    if isinstance(exc, BaseException):
        detail = detail or "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-4000:]
    fp = hashlib.sha1(f"{stage}:{message[:200]}".encode()).hexdigest()
    existing = db.one("SELECT id, attempts FROM errors WHERE fingerprint=? AND resolved=0", (fp,))
    if existing:
        db.update("errors", existing["id"], attempts=existing["attempts"] + 1, created_at=db.now())
    else:
        db.insert("errors", created_at=db.now(), stage=stage, message=message[:1000], detail=detail, fingerprint=fp)
    logger.error(f"[{stage}] {message}")


def recent_failures(stage: str, message_prefix: str = "") -> int:
    row = db.one(
        "SELECT SUM(attempts) n FROM errors WHERE stage=? AND resolved=0 AND message LIKE ?",
        (stage, message_prefix + "%"),
    )
    return int(row["n"] or 0) if row else 0
