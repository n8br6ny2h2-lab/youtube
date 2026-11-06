"""YouTube Analytics: video performansı, haftalık rapor ve kendini geliştirme (öğrenimler).

Not: Gösterim (impressions) ve tıklanma oranı (CTR), Shorts'ta 'izlemeyi seçen / kaydırıp geçen'
oranları ve izleyicinin aktif olduğu saatler YouTube Analytics API'de yoktur; yalnızca YouTube
Studio'da görünür. Bu alanlar raporda 'API'de yok' olarak işaretlenir, tahmin edilmez.
Çocuklara yönelik içerikte bazı demografik raporlar YouTube tarafından kısıtlanır.
"""
from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, datetime, timedelta

from loguru import logger

from . import db, youtube
from .config import Paths, tz

UNAVAILABLE = {
    "impressions": "API'de yok (YouTube Studio > Analytics > Erişim)",
    "ctr": "API'de yok (YouTube Studio > Analytics > Erişim)",
    "shorts_viewed_vs_swiped": "API'de yok (YouTube Studio > Shorts raporu)",
    "audience_active_hours": "API'de yok (YouTube Studio > Kitle > İzleyicilerin YouTube'da olduğu zamanlar)",
}


def fetch() -> dict:
    if not youtube.connected():
        return {"available": False, "reason": "YouTube bağlı değil"}
    ups = db.query("SELECT u.youtube_id, u.created_at, v.id vid, v.kind, v.story_id FROM uploads u JOIN videos v ON v.id=u.video_id "
                   "WHERE u.status='uploaded'")
    if not ups:
        return {"available": False, "reason": "Henüz yüklenmiş video yok"}
    end = date.today().isoformat()
    start = (date.today() - timedelta(days=90)).isoformat()
    ids = ",".join(u["youtube_id"] for u in ups[:200])
    out = {"available": True, "fetched_at": db.now(), "videos": {}}
    try:
        r = youtube.analytics_query(start, end, "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,"
                                    "subscribersGained,likes,shares", dimensions="video", filters=f"video=={ids}")
    except Exception as exc:
        return {"available": False, "reason": f"Analytics sorgusu başarısız: {exc}"}
    cols = [c["name"] for c in r.get("columnHeaders", [])]
    for row in r.get("rows", []) or []:
        d = dict(zip(cols, row))
        out["videos"][d["video"]] = d
        for m in cols[1:]:
            db.insert("analytics", fetched_at=db.now(), youtube_id=d["video"], day=end, metric=m, value=float(d[m] or 0), dims="")
    # 7 günlük izlenme (takvim optimizasyonu için)
    for u in ups:
        up_day = datetime.fromisoformat(u["created_at"]).date()
        s, e = up_day.isoformat(), min(date.today(), up_day + timedelta(days=7)).isoformat()
        if s >= e:
            continue
        try:
            rr = youtube.analytics_query(s, e, "views", filters=f"video=={u['youtube_id']}")
            v = float((rr.get("rows") or [[0]])[0][0])
            db.insert("analytics", fetched_at=db.now(), youtube_id=u["youtube_id"], day=e, metric="views_7d", value=v, dims="")
        except Exception:
            pass
    # İzleyici tutma (ilk %25 kaybı ≈ ilk 30 sn göstergesi) ve ülkeler
    for u in ups[:20]:
        try:
            rr = youtube.analytics_query(start, end, "audienceWatchRatio", dimensions="elapsedVideoTimeRatio",
                                         filters=f"video=={u['youtube_id']}")
            curve = rr.get("rows") or []
            if curve:
                db.insert("analytics", fetched_at=db.now(), youtube_id=u["youtube_id"], day=end, metric="retention_curve",
                          value=0, dims=json.dumps(curve))
        except Exception:
            pass
    try:
        rc = youtube.analytics_query(start, end, "views", dimensions="country", sort="-views", max_results=10)
        out["countries"] = rc.get("rows") or []
        db.kv_set("countries", out["countries"])
    except Exception as exc:
        out["countries_error"] = str(exc)
    try:
        info = youtube.channel_info()
        db.insert("analytics", fetched_at=db.now(), youtube_id="channel", day=end, metric="subscribers", value=info.get("subscribers", 0), dims="")
        db.insert("analytics", fetched_at=db.now(), youtube_id="channel", day=end, metric="channel_views", value=info.get("views", 0), dims="")
    except Exception:
        pass
    db.kv_set("analytics_last", out)
    logger.info(f"Analitik: {len(out['videos'])} video için veri alındı")
    return out


def learn() -> list[dict]:
    """Kategori, karakter ve süre bazında ortalama izlenme yüzdesinden öğrenim çıkarır (yalnızca gerçek veriyle)."""
    rows = db.query(
        "SELECT a.youtube_id, a.metric, a.value, v.kind, v.duration_s, s.category, s.path FROM analytics a "
        "JOIN uploads u ON u.youtube_id=a.youtube_id JOIN videos v ON v.id=u.video_id LEFT JOIN stories s ON s.id=v.story_id "
        "WHERE a.metric IN ('averageViewPercentage','views') AND a.id IN (SELECT MAX(id) FROM analytics GROUP BY youtube_id, metric)")
    if len(rows) < 6:
        return []
    by = defaultdict(list)
    for r in rows:
        if r["metric"] != "averageViewPercentage":
            continue
        by[f"category:{r['category']}"].append(r["value"])
        bucket = "dur:<90" if (r["duration_s"] or 0) < 90 else "dur:90-180" if r["duration_s"] < 180 else "dur:180+"
        by[bucket].append(r["value"])
        try:
            st = json.loads((Paths.root / r["path"]).read_text(encoding="utf-8"))
            for c in {b["speaker"] for s in st["scenes"] for b in s["beats"] if b["speaker"] != "narrator"}:
                by[f"character:{c}"].append(r["value"])
        except Exception:
            pass
    overall = [v for vs in by.values() for v in vs]
    mean = sum(overall) / len(overall) if overall else 0
    out = []
    for k, vs in by.items():
        if len(vs) < 2:
            continue
        rel = (sum(vs) / len(vs) - mean) / max(mean, 1)
        db.insert("learnings", created_at=db.now(), key=k, value=round(rel, 3), evidence=json.dumps({"n": len(vs), "avg_view_pct": round(sum(vs) / len(vs), 1)}))
        out.append({"key": k, "relative": round(rel, 3), "n": len(vs)})
    return out


def weekly_report() -> dict:
    week = datetime.now(tz()).strftime("%G-W%V")
    prod = db.one("SELECT COUNT(*) n FROM videos WHERE kind='long' AND created_at > datetime('now','-7 days')")["n"]
    prod_s = db.one("SELECT COUNT(*) n FROM videos WHERE kind='short' AND created_at > datetime('now','-7 days')")["n"]
    ups = db.one("SELECT COUNT(*) n FROM uploads WHERE created_at > datetime('now','-7 days')")["n"]
    errors = db.query("SELECT stage, message, attempts FROM errors WHERE created_at > datetime('now','-7 days') ORDER BY id DESC LIMIT 10")
    last = db.kv_get("analytics_last", {"available": False})
    learnings = db.query("SELECT key, value, evidence FROM learnings ORDER BY id DESC LIMIT 15")
    rep = {
        "week": week, "generated_at": db.now(),
        "production": {"long": prod, "shorts": prod_s, "target_long": 3, "target_shorts": 7, "uploads": ups},
        "analytics": last if last.get("available") else {"available": False, "note": "Veri yok — sonuç üretilmedi."},
        "unavailable_metrics": UNAVAILABLE,
        "learnings": learnings or "Henüz yeterli performans verisi yok.",
        "errors": errors,
    }
    md = [f"# Haftalık Rapor {week}", "", f"Üretim: {prod}/3 uzun, {prod_s}/7 Shorts · Yükleme: {ups}", ""]
    if last.get("available"):
        md.append("## Video performansı")
        for vid, d in last.get("videos", {}).items():
            md.append(f"- {vid}: {int(d.get('views', 0))} izlenme, ort. %{d.get('averageViewPercentage', 0):.0f} izlenme oranı, "
                      f"+{int(d.get('subscribersGained', 0))} abone")
    else:
        md.append("Analitik verisi yok (henüz yayın yok veya bağlantı yok). Sonuç uydurulmadı.")
    md += ["", "## API'de bulunmayan metrikler"] + [f"- {k}: {v}" for k, v in UNAVAILABLE.items()]
    path = Paths.logs / f"weekly_report_{week}.md"
    path.write_text("\n".join(md), encoding="utf-8")
    rep["path"] = str(path.relative_to(Paths.root))
    db.kv_set("weekly_report", rep)
    return rep
