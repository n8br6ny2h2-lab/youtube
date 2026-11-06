"""Araştırma motoru + fikir üretimi + viral potansiyel puanlaması (dahili, garanti değildir)."""
from __future__ import annotations

import difflib
import json
import random
import re
import statistics
from collections import Counter
from datetime import datetime

from loguru import logger

from . import db, llm, safety, story as story_mod
from .config import settings, tz

QUERIES = [
    "çocuk çizgi film", "çocuk masalları animasyon", "renkleri öğreniyorum çocuk", "sayıları öğreniyorum çocuk",
    "uyku masalı çocuk", "bilmeceler çocuk", "okul öncesi eğitici çizgi film", "paylaşmak çocuk hikayesi",
]
RUBRIC = {"hook": 20, "curiosity": 20, "fun_age_fit": 15, "visual": 15, "rewatch": 10, "originality": 10, "title_thumb": 10}


def _iso_dur(s: str) -> int:
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return 0
    h, mi, se = (int(x or 0) for x in m.groups())
    return h * 3600 + mi * 60 + se


def research(queries: list[str] | None = None) -> dict:
    """YouTube'daki çocuk animasyonu içeriklerini analiz eder. Veri yoksa uydurmaz."""
    from . import youtube
    queries = queries or QUERIES[:4]  # kota: her arama 100 birim
    rows = []
    try:
        for q in queries:
            for it in youtube.search_videos(q, 25):
                st = it.get("statistics", {})
                row = dict(created_at=db.now(), source="youtube_api", query=q, video_id=it["id"], title=it["snippet"]["title"],
                           channel=it["snippet"]["channelTitle"], views=int(st.get("viewCount", 0)),
                           duration_s=_iso_dur(it["contentDetails"]["duration"]), published_at=it["snippet"]["publishedAt"],
                           data={"likes": st.get("likeCount"), "tags": it["snippet"].get("tags", [])[:10]})
                db.insert("research", **row)
                rows.append(row)
    except PermissionError as exc:
        msg = {"available": False, "reason": str(exc) + " — araştırma için YOUTUBE_API_KEY veya Google bağlantısı gerekir."}
        db.kv_set("research_insights", msg)
        logger.warning(msg["reason"])
        return msg
    if not rows:
        msg = {"available": False, "reason": "Arama sonuç döndürmedi"}
        db.kv_set("research_insights", msg)
        return msg
    insights = analyze(rows)
    db.kv_set("research_insights", insights)
    logger.info(f"Araştırma: {len(rows)} video analiz edildi")
    return insights


def analyze(rows: list[dict]) -> dict:
    views = [r["views"] for r in rows]
    durs = [r["duration_s"] for r in rows if r["duration_s"]]
    buckets = Counter("Shorts (<60sn)" if d < 60 else "1-5 dk" if d < 300 else "5-15 dk" if d < 900 else "15+ dk (derleme)" for d in durs)
    by_bucket_views = {}
    for b in buckets:
        vs = [r["views"] for r in rows if r["duration_s"] and
              ("Shorts (<60sn)" if r["duration_s"] < 60 else "1-5 dk" if r["duration_s"] < 300 else "5-15 dk" if r["duration_s"] < 900 else "15+ dk (derleme)") == b]
        by_bucket_views[b] = int(statistics.median(vs)) if vs else 0
    words = Counter()
    for r in rows:
        for w in re.findall(r"[a-zçğıöşü]{3,}", r["title"].lower()):
            if w not in {"ile", "için", "çocuk", "çocuklar", "the", "and", "for"}:
                words[w] += 1
    titles = [r["title"] for r in rows]
    channels = Counter(r["channel"] for r in rows)
    return {
        "available": True, "analyzed_at": db.now(), "videos": len(rows),
        "median_views": int(statistics.median(views)), "max_views": max(views),
        "duration_buckets": dict(buckets), "median_views_by_duration": by_bucket_views,
        "title_avg_len": round(sum(map(len, titles)) / len(titles), 1),
        "title_with_question_pct": round(100 * sum("?" in t for t in titles) / len(titles), 1),
        "title_with_emoji_pct": round(100 * sum(any(ord(c) > 0x2600 for c in t) for t in titles) / len(titles), 1),
        "top_words": words.most_common(25),
        "top_channels": channels.most_common(10),
        "note": "Rakiplerden yalnızca biçim/süre/başlık kalıbı analizi yapılır; içerik kopyalanmaz.",
    }


# --------------------------------------------------------------------------- puanlama

def score_story(st: dict, existing_titles: list[str]) -> dict:
    beats = [b for s in st["scenes"] for b in s["beats"]]
    first = beats[0] if beats else {"text": "", "emotion": "happy"}
    hook = 8 + (6 if first["text"].rstrip().endswith(("?", "!")) else 0) + (6 if first["emotion"] in ("surprised", "excited") else 0)
    q = sum(1 for b in beats if b["speaker"] == "narrator" and "?" in b["text"])
    mystery = sum(1 for s in st["scenes"] if s["music"] in ("mystery", "adventure"))
    curiosity = min(20, 6 + q * 3 + mystery * 2)
    chk = safety.check_story(st)
    laughs = sum(1 for b in beats if b["emotion"] in ("laughing", "excited"))
    fun = (7 if chk["passed"] else 0) + min(8, laughs)
    props = sum(len(s.get("props", [])) for s in st["scenes"])
    bgs = len({s["background"] for s in st["scenes"]})
    actions = sum(1 for b in beats if b["action"] not in ("talk", "idle"))
    visual = min(15, props * 1.5 + bgs * 1.5 + actions * 0.3)
    rewatch = 10 if st["category"] in ("songs", "numbers", "colors", "bedtime", "riddles") else 6
    sim = max((difflib.SequenceMatcher(a=st["title"].lower(), b=t.lower()).ratio() for t in existing_titles), default=0)
    originality = round(10 * (1 - sim), 1)
    tl = len(st["title"])
    tt = st.get("thumb_text") or ""
    title_thumb = (5 if 18 <= tl <= 60 else 2) + (5 if 0 < len(tt.split()) <= 3 else 3)
    detail = {"hook": hook, "curiosity": curiosity, "fun_age_fit": fun, "visual": round(visual, 1), "rewatch": rewatch,
              "originality": originality, "title_thumb": title_thumb}
    total = round(sum(min(v, RUBRIC[k]) for k, v in detail.items()))
    return {"total": total, "detail": detail, "safety": chk,
            "disclaimer": "Dahili tahmini puandır; izlenme garantisi değildir."}


def _learned_weights() -> dict:
    rows = db.query("SELECT key, value FROM learnings WHERE key LIKE 'category:%' ORDER BY id DESC")
    w = {}
    for r in rows:
        k = r["key"].split(":", 1)[1]
        w.setdefault(k, r["value"])
    return w


def generate(n: int = 5) -> list[dict]:
    """Haftalık havuza yeni fikir ekler. Claude varsa özgün fikir, yoksa yerel parametrik fikir."""
    cfg = settings()["ideas"]
    existing = [r["title"] for r in db.query("SELECT title FROM ideas UNION SELECT title FROM stories")]
    week = datetime.now(tz()).strftime("%G-W%V")
    insights = db.kv_get("research_insights", {"available": False})
    created = []
    if llm.available():
        try:
            created = _generate_claude(n, existing, insights, week)
        except Exception as exc:
            logger.warning(f"Claude fikir üretimi başarısız, yerel motora geçiliyor: {exc}")
    if not created:
        created = _generate_local(n, existing, week)
    for idea in created:
        if idea["score"] >= cfg["priority_score"]:
            idea["status"] = "priority"
    logger.info(f"{len(created)} yeni fikir havuza eklendi")
    return created


def _generate_local(n: int, existing: list[str], week: str) -> list[dict]:
    cfg = settings()["ideas"]
    weights = _learned_weights()
    cats = list(story_mod.CATEGORIES)
    rnd = random.Random(datetime.now().timestamp())
    out = []
    # kategori dengesi: son 14 günde az üretilenler öne
    recent = Counter(r["category"] for r in db.query("SELECT category FROM ideas WHERE created_at > datetime('now','-14 days')"))
    for _ in range(n):
        cat = sorted(cats, key=lambda c: recent[c] - 3 * weights.get(c, 0) + rnd.random())[0]
        recent[cat] += 1
        best = None
        for round_ in range(cfg["max_improve_rounds"] + 1):
            seed = rnd.randint(1, 10**9)
            st = story_mod.normalize(story_mod.local_story(cat, seed))
            sc = score_story(st, existing)
            if best is None or sc["total"] > best[2]["total"]:
                best = (seed, st, sc, round_)
            if sc["total"] >= cfg["min_score_to_produce"]:
                break
        seed, st, sc, rounds = best
        status = "pool" if sc["total"] >= cfg["min_score_to_produce"] else "needs_work"
        iid = db.insert("ideas", created_at=db.now(), category=cat, title=st["title"], premise=st["summary"],
                        characters=sorted({b["speaker"] for s in st["scenes"] for b in s["beats"] if b["speaker"] != "narrator"}),
                        score=sc["total"], score_detail={**sc, "seed": seed}, status=status, source="local", week=week,
                        improved_rounds=rounds)
        existing.append(st["title"])
        out.append({"id": iid, "category": cat, "title": st["title"], "premise": st["summary"], "score": sc["total"], "seed": seed,
                    "source": "local", "status": status})
    return out


IDEA_SCHEMA = {
    "type": "object", "additionalProperties": False, "required": ["ideas"],
    "properties": {"ideas": {"type": "array", "items": {
        "type": "object", "additionalProperties": False,
        "required": ["category", "title", "premise", "characters", "scores", "why"],
        "properties": {
            "category": {"type": "string", "enum": list(story_mod.CATEGORIES)},
            "title": {"type": "string"}, "premise": {"type": "string"}, "why": {"type": "string"},
            "characters": {"type": "array", "items": {"type": "string", "enum": story_mod.CHAR_IDS}},
            "scores": {"type": "object", "additionalProperties": False, "required": list(RUBRIC),
                       "properties": {k: {"type": "integer"} for k in RUBRIC}},
        }}}},
}


def _generate_claude(n: int, existing: list[str], insights: dict, week: str) -> list[dict]:
    learn = db.query("SELECT key, value, evidence FROM learnings ORDER BY id DESC LIMIT 20")
    prompt = (
        f"Bulutkent kanalı için {n} yeni, özgün bölüm fikri üret. Kategorileri dengeli dağıt.\n"
        f"Daha önce kullanılan başlıklar (tekrar etme): {json.dumps(existing[-60:], ensure_ascii=False)}\n"
        f"YouTube araştırma özeti (yalnızca biçim/süre/başlık kalıbı; içerik kopyalama!): {json.dumps(insights, ensure_ascii=False)[:3000]}\n"
        f"Kanalın kendi performans öğrenimleri: {json.dumps(learn, ensure_ascii=False)}\n"
        f"Her fikri şu ölçütle dürüstçe puanla (maksimumlar): {json.dumps(RUBRIC)}. Puanlar tahmindir."
    )
    data = llm.generate_json(story_mod.SYSTEM_PROMPT, prompt, IDEA_SCHEMA, "ideas", estimate_usd=0.15)
    cfg = settings()["ideas"]
    out = []
    for it in data["ideas"]:
        issues = safety.scan_text(it["title"] + " " + it["premise"])
        scores = {k: min(int(v), RUBRIC[k]) for k, v in it["scores"].items()}
        total = sum(scores.values()) if not issues else 0
        status = "pool" if total >= cfg["min_score_to_produce"] else "needs_work"
        iid = db.insert("ideas", created_at=db.now(), category=it["category"], title=it["title"], premise=it["premise"],
                        characters=it["characters"], score=total, score_detail={"detail": scores, "why": it["why"], "issues": issues},
                        status=status, source="claude", week=week)
        out.append({"id": iid, "category": it["category"], "title": it["title"], "premise": it["premise"], "score": total,
                    "source": "claude", "status": status})
    return out


def next_idea() -> dict | None:
    row = db.one("SELECT * FROM ideas WHERE status IN ('priority','pool') ORDER BY (status='priority') DESC, score DESC, id ASC LIMIT 1")
    if not row:
        return None
    d = dict(row)
    det = json.loads(d.get("score_detail") or "{}")
    d["seed"] = det.get("seed", d["id"])
    return d
