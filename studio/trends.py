"""Trend radarı: o günün çocuk/aile alanındaki en yüksek potansiyelli temasını bulur.

Sinyaller (hepsi gerçek veriye dayanır; veri yoksa yalnızca mevsim sinyali kullanılır ve bu açıkça yazılır):
  1) YouTube Türkiye "en popüler" listeleri (Film/Animasyon, Eğlence, Eğitim, Müzik) — 1 birim/istek
  2) Son 7 günün çocuk aramalarında izlenme hızı (izlenme / saat) — 100 birim/istek
  3) Mevsim ve özel günler takvimi (Türkiye)
Rakip içerik kopyalanmaz: yalnızca konu/tema sinyali çıkarılır.
"""
from __future__ import annotations

import re
import time
from collections import defaultdict
from datetime import datetime

from loguru import logger

from . import db
from .config import tz

THEMES = {
    "space": {"thumb": "Ay'a Uçuş!", "title": "Ay'a Uçan Roket Macerası", "name": "Uzay macerası", "keywords": r"uzay|roket|gezegen|astronot|ay'a|yıldız|galaksi",
              "bgs": ["space", "night", "meadow"], "items": [("rocket", "kırmızı", "Roket"), ("planet", "turuncu", "Gezegen"), ("star", "sarı", "Yıldız")],
              "goal": "roketin kayıp parçalarını bulup Ay'a uçmak", "months": []},
    "dino": {"thumb": "Dinozor!", "title": "Ormandaki Sevimli Dinozor", "name": "Dinozor keşfi", "keywords": r"dinozor|dino|t-rex|trex|fosil",
             "bgs": ["forest", "meadow", "lake"], "items": [("dino", "yeşil", "Dinozor"), ("leaf", "yeşil", "Dev yaprak"), ("flower", "mor", "Çiçek")],
             "goal": "ormanda saklanan sevimli dinozor dostu bulmak", "months": []},
    "winter": {"thumb": "İlk Kar!", "title": "İlk Kar ve Kardan Adam", "name": "Karlı gün", "keywords": r"kar\b|kış|kardan|buz|soğuk|kayak",
               "bgs": ["snow", "village", "home"], "items": [("snowman", "beyaz", "Kardan adam"), ("star", "mavi", "Kar tanesi"), ("ball", "kırmızı", "Kar topu")],
               "goal": "ilk karda en güzel kardan adamı birlikte yapmak", "months": [11, 12, 1, 2]},
    "newyear": {"thumb": "Yeni Yıl!", "title": "Yeni Yıl Ağacını Süslüyoruz", "name": "Yeni yıl coşkusu", "keywords": r"yılbaşı|yeni yıl|noel|hediye|süsleme",
                "bgs": ["snow", "home", "village"], "items": [("firtree", "yeşil", "Yeni yıl ağacı"), ("gift", "kırmızı", "Hediye"), ("star", "sarı", "Yıldız")],
                "goal": "yeni yıl ağacını birlikte süslemek ve hediyeleri paylaşmak", "months": [12, 1]},
    "cars": {"thumb": "Yarış!", "title": "Büyük Araba Yarışı", "name": "Arabalar ve yollar", "keywords": r"araba|kamyon|otobüs|tren|trafik|yarış",
             "bgs": ["village", "meadow", "garden"], "items": [("car", "mavi", "Mavi araba"), ("car", "kırmızı", "Kırmızı araba"), ("car", "sarı", "Sarı araba")],
             "goal": "trafik kurallarını öğrenip araba yarışını güvenle tamamlamak", "months": []},
    "birthday": {"thumb": "Sürpriz!", "title": "Gizli Doğum Günü Sürprizi", "name": "Doğum günü sürprizi", "keywords": r"doğum günü|pasta|parti|balon|kutlama",
                 "bgs": ["home", "village", "meadow"], "items": [("cake", "pembe", "Pasta"), ("balloon", "kırmızı", "Balon"), ("gift", "mor", "Hediye")],
                 "goal": "bir arkadaşa sürpriz doğum günü partisi hazırlamak", "months": []},
    "spring": {"thumb": "Çiçek Açtı!", "title": "Minik Tohum Kocaman Çiçek", "name": "Bahar bahçesi", "keywords": r"bahar|çiçek|kelebek|arı|tohum|bahçe",
               "bgs": ["garden", "meadow", "lake"], "items": [("flower", "pembe", "Çiçek"), ("carrot", "turuncu", "Havuç"), ("leaf", "yeşil", "Fide")],
               "goal": "tohum ekip çiçeklerin büyümesini izlemek", "months": [3, 4, 5]},
    "autumn": {"thumb": "Renkli Yapraklar", "title": "Sonbahar Yaprakları Neden Renkli?", "name": "Sonbahar yaprakları", "keywords": r"sonbahar|yaprak|kestane|yağmur|şemsiye",
               "bgs": ["forest", "village", "garden"], "items": [("leaf", "turuncu", "Turuncu yaprak"), ("umbrella", "mavi", "Şemsiye"), ("leaf", "sarı", "Sarı yaprak")],
               "goal": "renkli yaprakları toplayıp yağmurda şemsiyeyi paylaşmak", "months": [9, 10, 11]},
    "music": {"thumb": "Dans!", "title": "Büyük Dans Gösterisi", "name": "Müzik ve dans", "keywords": r"şarkı|dans|ritim|müzik|davul|tekerleme",
              "bgs": ["meadow", "village", "lake"], "items": [("drum", "kırmızı", "Davul"), ("star", "sarı", "Yıldız"), ("heart", "pembe", "Kalp")],
              "goal": "Bulutkent'in büyük dans gösterisini hazırlamak", "months": []},
    "animals": {"thumb": "Yuva Nerede?", "title": "Yavru Kuş Yuvasını Arıyor", "name": "Hayvan dostlar", "keywords": r"hayvan|kedi|köpek|kuş|çiftlik|aslan|fil|tavşan",
                "bgs": ["forest", "garden", "lake"], "items": [("carrot", "turuncu", "Havuç"), ("apple", "kırmızı", "Elma"), ("leaf", "yeşil", "Yaprak")],
                "goal": "yolunu kaybeden yavru kuşu yuvasına ulaştırmak", "months": []},
    "school": {"thumb": "İlk Gün!", "title": "İlk Okul Günü Hazırlığı", "name": "Okul ve harfler", "keywords": r"okul|harf|alfabe|kitap|okuma|öğretmen",
               "bgs": ["home", "village", "garden"], "items": [("book", "mavi", "Kitap"), ("paintbrush", "mor", "Fırça"), ("number", "yeşil", "1")],
               "goal": "ilk okul gününe birlikte hazırlanmak", "months": [9]},
}

KID_QUERIES = ["çocuk şarkısı", "çizgi film çocuk", "çocuklar için eğitici"]
POPULAR_CATEGORIES = ["1", "24", "10"]  # Film/Animasyon, Eğlence, Müzik (27 TR'de popüler liste döndürmüyor)


def seasonal(now: datetime | None = None) -> dict:
    now = now or datetime.now(tz())
    out = {}
    for k, th in THEMES.items():
        out[k] = 1.0 if now.month in th["months"] else 0.0
    if now.month == 12 or (now.month == 11 and now.day >= 20):
        out["newyear"] = 1.0
    return out


KID_CONTEXT = r"\b(?:çocuk|bebek|çizgi|masal|okul öncesi|kreş|anaokul|tekerleme|ninni|eğitici|kids|nursery|cartoon)"


def _match(text: str) -> list[str]:
    low = text.lower()
    # kelime başından eşleştir: "arı" kelimesi "sarı" içinde yakalanmasın, ama "dinozorlar" yakalansın
    return [k for k, th in THEMES.items() if re.search(rf"\b(?:{th['keywords']})", low)]


def _is_kids(it: dict) -> bool:
    if it.get("status", {}).get("madeForKids"):
        return True
    sn = it.get("snippet", {})
    text = f"{sn.get('title', '')} {sn.get('channelTitle', '')}".lower()  # etiketler yanıltıcı olabilir; yalnızca başlık+kanal
    return bool(re.search(KID_CONTEXT, text))


def radar(use_search: bool = True) -> dict:
    """Temaları 0-100 arası bir potansiyel puanıyla sıralar ve kanıtlarını döndürür."""
    from . import youtube
    evidence: dict = defaultdict(lambda: {"videos": 0, "views": 0, "velocity": 0.0, "examples": []})
    _seen.clear()
    sources, errors = [], []
    try:
        svc = youtube._svc(allow_key=True)
        for cat in POPULAR_CATEGORIES:
            try:
                youtube._quota("videos.list")
                r = svc.videos().list(part="snippet,statistics,status", chart="mostPopular", regionCode="TR",
                                      videoCategoryId=cat, maxResults=50).execute()
                sources.append(f"popüler/kategori {cat}")
                for it in r.get("items", []):
                    _absorb(evidence, it)
            except Exception as exc:
                errors.append(f"kategori {cat}: {str(exc)[:80]}")
        if use_search:
            for q in KID_QUERIES[:2]:
                try:
                    for it in youtube.search_videos(q, 25):
                        _absorb(evidence, it)
                    sources.append(f"arama: {q}")
                except Exception as exc:
                    errors.append(f"arama {q}: {str(exc)[:80]}")
    except PermissionError as exc:
        errors.append(str(exc))
    season = seasonal()
    max_vel = max((e["velocity"] for e in evidence.values()), default=0) or 1
    ranked = []
    for k, th in THEMES.items():
        e = evidence.get(k, {"videos": 0, "views": 0, "velocity": 0.0, "examples": []})
        trend = min(1.0, e["velocity"] / max_vel) if e["videos"] else 0.0
        volume = min(1.0, e["videos"] / 10)
        recent = db.one("SELECT COUNT(*) n FROM stories WHERE created_at > datetime('now','-10 days') AND path LIKE ?", (f"%{k}%",))["n"]
        freshness = 1.0 if recent == 0 else 0.4
        score = round(100 * (0.45 * trend + 0.2 * volume + 0.25 * season[k] + 0.1 * freshness))
        ranked.append({"theme": k, "name": th["name"], "score": score, "trend_velocity": round(e["velocity"]),
                       "matching_videos": e["videos"], "season": bool(season[k]), "examples": e["examples"][:3]})
    ranked.sort(key=lambda r: -r["score"])
    out = {"at": db.now(), "sources": sources, "errors": errors, "ranked": ranked,
           "data_note": "YouTube verisi + mevsim" if sources else "YouTube verisi yok; yalnızca mevsim ve tazelik kullanıldı"}
    db.kv_set("trend_radar", out)
    logger.info(f"Trend radarı: 1. {ranked[0]['name']} ({ranked[0]['score']}), kaynak: {out['data_note']}")
    return out


_seen: set = set()


def _absorb(evidence: dict, it: dict) -> None:
    if not _is_kids(it) or it.get("id") in _seen:
        return  # yalnızca çocuklara yönelik videolar, her video bir kez
    _seen.add(it.get("id"))
    sn = it.get("snippet", {})
    text = f"{sn.get('title', '')} {' '.join(sn.get('tags', [])[:15])}"
    views = int(it.get("statistics", {}).get("viewCount", 0))
    try:
        pub = datetime.fromisoformat(sn["publishedAt"].replace("Z", "+00:00")).timestamp()
        hours = max(6.0, (time.time() - pub) / 3600)
    except Exception:
        hours = 24 * 30
    for k in _match(text):
        e = evidence[k]
        e["videos"] += 1
        e["views"] += views
        e["velocity"] += views / hours
        if len(e["examples"]) < 3:
            e["examples"].append(sn.get("title", "")[:80])
