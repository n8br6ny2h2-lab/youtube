"""Çocuk güvenliği ve politika kontrolleri (metin düzeyinde).

Bu kontrol otomatik bir ön filtredir; tamamen hatasız değildir. Engellenen içerik yayınlanmaz.
"""
from __future__ import annotations

import re

# Tehlikeli davranış, korku/şiddet, uygunsuz içerik (Türkçe kök/ifade listesi)
BLOCK_PATTERNS = [
    r"\böldür", r"\bkan\b", r"\bkanl[ıi]", r"\bsilah", r"\bbıçak", r"\bçakmak", r"\bkibrit", r"\bateş yak",
    r"\bzehir", r"\bilaç iç", r"\bhap\b", r"\bpencereden atla", r"\bçatıya çık", r"\byabancıyla git",
    r"\bprizle?\b", r"\bpriz\w*", r"\bsigara", r"\balkol", r"\bbira\b", r"\bşarap", r"\bkumar",
    r"\bcanavar ye", r"\bkorkunç\b", r"\bölü\b", r"\bölüm\b(?! ?\d)", r"\bdövüş", r"\bvur(du|alım|acağım)",
    r"\bcadı\b", r"\bşeytan", r"\bhayalet", r"\baptal\b", r"\bsalak\b", r"\bgeri zekal", r"\bşişko\b",
    r"\bnefret ed", r"\bsus be\b", r"\byalnız başına sokağa", r"\bgizlice kaç", r"\bsuya tek başına",
]

# Başkalarına ait karakter / marka adları (telif ve taklit kontrolü)
IP_NAMES = [
    "peppa", "paw patrol", "elsa", "anna", "olaf", "mickey", "minnie", "spiderman", "örümcek adam", "pikachu",
    "pokemon", "cocomelon", "baby shark", "bluey", "masha", "pepee", "niloya", "rafadan", "kral şakir",
    "keloğlan", "nasreddin", "şirinler", "smurf", "barbie", "sonic", "mario", "batman", "superman",
    "dora", "caillou", "tayo", "pjmasks", "pj masks", "minions", "minyon", "teletabi", "simba",
]

# Yanıltıcı/clickbait başlık kalıpları (çocuklara yönelik içerikte kaçınılır)
CLICKBAIT = [r"\bşok\b", r"\binanamayacaksın", r"\bkimse bilmiyor", r"\bgerçek oldu", r"\b%100", r"!!!", r"\bacil\b",
             r"\bölüyor", r"\b(gece|saat) 3", r"\bkorkunç"]


def scan_text(text: str) -> list[str]:
    low = text.lower()
    issues = []
    for pat in BLOCK_PATTERNS:
        if re.search(pat, low):
            issues.append(f"uygunsuz ifade: {pat}")
    for name in IP_NAMES:
        if re.search(rf"\b{re.escape(name)}\b", low):
            issues.append(f"başka markaya ait isim: {name}")
    return issues


def scan_title(title: str) -> list[str]:
    issues = [f"yanıltıcı başlık kalıbı: {p}" for p in CLICKBAIT if re.search(p, title.lower())]
    if len(title) > 100:
        issues.append("başlık 100 karakteri aşıyor")
    if sum(ch.isupper() for ch in title) > max(8, len(title) * 0.5):
        issues.append("aşırı büyük harf")
    return issues + scan_text(title)


def check_story(story: dict) -> dict:
    texts = [story.get("title", ""), story.get("summary", ""), story.get("moral", ""), story.get("hook", "")]
    for sc in story.get("scenes", []):
        for b in sc.get("beats", []):
            texts.append(b.get("text", ""))
    issues = []
    for t in texts:
        issues += scan_text(t)
    issues += scan_title(story.get("title", ""))
    total_words = sum(len(t.split()) for t in texts)
    if total_words < 80:
        issues.append("hikâye çok kısa (anlamlı bir anlatı için yetersiz)")
    return {"passed": not issues, "issues": sorted(set(issues))}
