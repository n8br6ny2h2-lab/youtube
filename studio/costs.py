"""API maliyet takibi ve bütçe koruması.

Fiyatlar tahminidir; sağlayıcının güncel fiyat sayfasıyla düzenli olarak karşılaştırın.
Bütçe aşılırsa ücretli çağrılar engellenir ve sistem ücretsiz yerel alternatife düşer.
"""
from __future__ import annotations

from datetime import datetime

from . import db
from .config import settings, tz

# USD / 1M token (giriş, çıkış) — tahmini, settings üzerinden değiştirilebilir değil, burada tek yerde.
PRICES = {
    "claude-opus-5-5": (4.0, 20.0),
    "claude-sonnet-5-5": (2.0, 10.0),
    "claude-haiku-5-5": (0.10, 0.50),
}
ELEVENLABS_USD_PER_1K_CHARS = 0.30

SERVICES = [
    # (servis, ücretli mi, ücretsiz alternatif, not)
    ("Claude API (hikâye/senaryo)", "Ücretli (token başına)", "Yerel şablon hikâye motoru", "Önerilen; kalite çok daha yüksek"),
    ("ElevenLabs (seslendirme)", "Ücretli (karakter başına)", "Piper TTS (yerel, ücretsiz)", "İsteğe bağlı"),
    ("OpenAI API", "Ücretli", "—", "İsteğe bağlı, kullanılmıyor"),
    ("Whisper / faster-whisper", "Ücretsiz (yerel)", "—", "CPU'da çalışır"),
    ("HyperFrames + FFmpeg", "Ücretsiz (yerel)", "—", "Render ve montaj"),
    ("Müzik ve ses efektleri", "Ücretsiz (yerel sentez)", "—", "Telifsiz, özgün üretim"),
    ("YouTube Data/Analytics API", "Ücretsiz (günlük kota)", "—", "Varsayılan 10.000 birim/gün"),
    ("Pexels / Pixabay / Unsplash", "Ücretsiz (anahtar gerekir)", "Özgün vektör çizimler", "İsteğe bağlı"),
    ("n8n (self-hosted)", "Ücretsiz", "Dahili zamanlayıcı (--mode daemon)", "Docker ile"),
]


class BudgetExceeded(RuntimeError):
    pass


def _local_now() -> datetime:
    return datetime.now(tz())


def spent(period: str = "day") -> float:
    now = _local_now()
    prefix = now.strftime("%Y-%m-%d") if period == "day" else now.strftime("%Y-%m")
    # created_at UTC saklanır; yerel gün sınırı için yaklaşık eşleşme yeterli
    row = db.one("SELECT COALESCE(SUM(usd),0) s FROM costs WHERE substr(created_at,1,?)=?", (len(prefix), prefix))
    return float(row["s"]) if row else 0.0


def check(estimated_usd: float) -> None:
    b = settings()["budget"]
    if spent("day") + estimated_usd > b["daily_usd"]:
        raise BudgetExceeded(f"Günlük bütçe ({b['daily_usd']} USD) aşılacaktı")
    if spent("month") + estimated_usd > b["monthly_usd"]:
        raise BudgetExceeded(f"Aylık bütçe ({b['monthly_usd']} USD) aşılacaktı")


def record(service: str, operation: str, units: float, usd: float, detail: str = "") -> None:
    db.insert("costs", created_at=db.now(), service=service, operation=operation, units=units, usd=round(usd, 5), detail=detail)


def llm_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    pin, pout = PRICES.get(model, (4.0, 20.0))
    return input_tokens / 1e6 * pin + output_tokens / 1e6 * pout


def youtube_quota_used_today() -> float:
    prefix = _local_now().strftime("%Y-%m-%d")
    row = db.one(
        "SELECT COALESCE(SUM(units),0) s FROM costs WHERE service='youtube' AND substr(created_at,1,10)=?", (prefix,)
    )
    return float(row["s"]) if row else 0.0


def summary() -> dict:
    rows = db.query("SELECT service, COUNT(*) n, SUM(units) units, SUM(usd) usd FROM costs GROUP BY service")
    b = settings()["budget"]
    return {
        "today_usd": round(spent("day"), 4),
        "month_usd": round(spent("month"), 4),
        "daily_limit": b["daily_usd"],
        "monthly_limit": b["monthly_usd"],
        "by_service": rows,
        "youtube_quota_today": youtube_quota_used_today(),
        "services": SERVICES,
    }
