"""Haftalık plan: izlenme verisi + trend radarı -> hangi slotta hangi video, ne zaman ne üretilecek.

Kurallar
- Haftalar Pazartesi-Pazar (Europe/Istanbul). Plan her gece yenilenir, Pazar gecesi gelecek hafta kullanıcıya gönderilir.
- Hazır/yüklenmiş videolar slotlarına yazılır; boş uzun slotlar için "üretilecek" kalemi açılır.
- Tema seçimi: kendi kanal performansımız (günlük izlenme, izlenme yüzdesi) yeterli veri varsa %50 ağırlıkla,
  geri kalanı trend radarı (YouTube popüler + mevsim). Veri yoksa yalnızca radar; uydurma veri kullanılmaz.
- Üretim plana bağlıdır: önümüzdeki 9 günün uzun slotları doluysa gece üretim yapılmaz (kaynak ve kota korunur).
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone

from . import db, scheduler
from .config import CHANNEL, Paths, settings, tz

LEAD_DAYS = 9          # bu kadar gün içindeki boş uzun slot üretimi tetikler
MIN_PERF_VIDEOS = 3    # kendi performans verisinin dikkate alınması için gereken video sayısı


def _theme_of(path: str | None, category: str | None) -> str:
    m = re.search(r"story_([a-z_]+?)_[0-9a-f]{12,}", path or "")
    return m.group(1) if m else (category or "genel")


def _latest_metrics() -> dict:
    rows = db.query("SELECT youtube_id, metric, value FROM analytics WHERE id IN "
                    "(SELECT MAX(id) FROM analytics GROUP BY youtube_id, metric)")
    out: dict = {}
    for r in rows:
        out.setdefault(r["youtube_id"], {})[r["metric"]] = r["value"]
    return out


def performance() -> dict:
    """Yayındaki videolarımızın performansı: video, tema ve tür bazında."""
    metrics = _latest_metrics()
    now = datetime.now(timezone.utc)
    vids = []
    for r in db.query("SELECT u.youtube_id, u.created_at, v.id, v.kind, v.title, s.path, s.category, sc.slot_utc "
                      "FROM uploads u JOIN videos v ON v.id=u.video_id LEFT JOIN stories s ON s.id=v.story_id "
                      "LEFT JOIN schedule sc ON sc.video_id=v.id WHERE u.status='uploaded' AND v.status!='deleted'"):
        m = metrics.get(r["youtube_id"], {})
        start = r["slot_utc"] or r["created_at"]
        try:
            pub = datetime.fromisoformat(start.replace("Z", "+00:00"))
        except Exception:
            pub = now
        if pub > now:
            continue  # henüz yayında değil
        age = max(1.0, (now - pub).total_seconds() / 86400)
        views = m.get("views", 0.0)
        vids.append({"youtube_id": r["youtube_id"], "title": r["title"], "kind": r["kind"],
                     "theme": _theme_of(r["path"], r["category"]), "views": int(views),
                     "views_per_day": round(views / age, 1), "avg_view_pct": m.get("averageViewPercentage"),
                     "age_days": round(age, 1)})
    themes: dict = {}
    for v in vids:
        t = themes.setdefault(v["theme"], {"n": 0, "vpd": 0.0, "pct": []})
        t["n"] += 1
        t["vpd"] += v["views_per_day"]
        if v["avg_view_pct"] is not None:
            t["pct"].append(v["avg_view_pct"])
    for t in themes.values():
        t["vpd"] = round(t["vpd"] / t["n"], 1)
        t["pct"] = round(sum(t["pct"]) / len(t["pct"]), 1) if t["pct"] else None
    with_data = [v for v in vids if v["views"] > 0]
    vids.sort(key=lambda v: -v["views_per_day"])
    return {"videos": vids, "themes": themes, "enough": len(with_data) >= MIN_PERF_VIDEOS}


def theme_scores(perf: dict | None = None) -> list[dict]:
    perf = perf or performance()
    radar = db.kv_get("trend_radar") or {}
    ranked = radar.get("ranked") or []
    if not ranked:
        from .trends import THEMES
        ranked = [{"theme": k, "name": v["name"], "score": 50} for k, v in THEMES.items()]
    max_vpd = max((t["vpd"] for t in perf["themes"].values()), default=0) or 1
    out = []
    for r in ranked:
        own = perf["themes"].get(r["theme"])
        own_score = round(100 * own["vpd"] / max_vpd) if own else None
        if perf["enough"] and own_score is not None:
            score, basis = round(0.5 * r["score"] + 0.5 * own_score), "trend + kanal performansı"
        else:
            score, basis = r["score"], "trend + mevsim"
        out.append({"theme": r["theme"], "name": r.get("name", r["theme"]), "score": score, "trend": r["score"],
                    "own": own_score, "basis": basis})
    out.sort(key=lambda x: -x["score"])
    return out


def week_start(offset: int = 0) -> datetime:
    now = datetime.now(tz())
    monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return monday + timedelta(weeks=offset)


def _week_slots(start: datetime) -> list[dict]:
    end = start + timedelta(days=7)
    base = max(start, datetime.now(tz()))
    days = (end - base).days + 1
    return [s for s in scheduler.slots(days, start=base) if start <= s["local"] < end]


def build(offset: int = 1) -> dict:
    """offset=0 bu hafta, 1 gelecek hafta."""
    start = week_start(offset)
    week = start.strftime("%G-W%V")
    rows = {r["slot_local"]: r for r in db.query(
        "SELECT s.slot_local, s.status, s.video_id, v.title, v.kind, u.youtube_id FROM schedule s JOIN videos v ON v.id=s.video_id "
        "LEFT JOIN uploads u ON u.video_id=v.id AND u.status='uploaded'")}
    perf = performance()
    scores = theme_scores(perf)
    recent = [_theme_of(r["path"], r["category"]) for r in db.query("SELECT path, category FROM stories ORDER BY id DESC LIMIT 3")]
    used: list[str] = []
    items, production = [], []
    gece = CHANNEL == "gece"
    pending_scripts = []
    if gece:
        from . import calm
        done = {r["path"] for r in db.query("SELECT path FROM stories")}
        pending_scripts = [s for s in calm.scripts() if s["_file"] not in done and calm.producible(s)]
    wslots = _week_slots(start)
    keys = {s["local"].isoformat() for s in wslots}
    end = start + timedelta(days=7)
    for k, r in rows.items():  # programa ek (elle eklenmiş) slotlar
        t = datetime.fromisoformat(k)
        if start <= t < end and k not in keys and (r["youtube_id"] or t > datetime.now(tz())):
            wslots.append({"kind": r["kind"], "local": t.astimezone(tz())})
    wslots.sort(key=lambda s: s["local"])
    for s in wslots:
        key = s["local"].isoformat()
        r = rows.get(key)
        it = {"slot": key, "day": scheduler.DAY_TR[s["local"].weekday()], "time": s["local"].strftime("%d.%m %H:%M"),
              "kind": s["kind"]}
        if r:
            it.update(video_id=r["video_id"], title=r["title"], youtube_id=r["youtube_id"],
                      status="YouTube'da" if r["youtube_id"] else "hazır, yüklenecek")
        elif s["kind"] == "long":
            produce_on = (s["local"] - timedelta(days=2)).strftime("%d.%m")
            if gece:
                prog = settings().get("program", {})
                cat = prog.get(["mon", "tue", "wed", "thu", "fri", "sat", "sun"][s["local"].weekday()])
                sc = next((x for x in pending_scripts if x.get("category") == cat), None) or \
                    (pending_scripts[0] if pending_scripts and not cat else None)
                if sc:
                    pending_scripts.remove(sc)
                cname = settings().get("program_names", {}).get(cat, cat or "")
                title = sc["title"] if sc else f"Yeni bölüm yazılacak · {cname}"
                it.update(status="üretilecek", title=title, produce_on=produce_on, category=cat)
                production.append({"slot": key, "title": title, "produce_on": produce_on, "category": cat,
                                   "file": sc["_file"] if sc else None})
            else:
                pick = next((x for x in scores if x["theme"] not in used and x["theme"] not in recent), scores[0])
                used.append(pick["theme"])
                it.update(status="üretilecek", title=f"Tema: {pick['name']}", theme=pick["theme"], score=pick["score"],
                          basis=pick["basis"], produce_on=produce_on)
                production.append({"slot": key, "theme": pick["theme"], "name": pick["name"], "produce_on": produce_on})
        else:
            it.update(status="uzun videodan kesilecek", title="Shorts")
        items.append(it)
    plan = {"channel": CHANNEL, "week": week, "start": start.date().isoformat(), "generated_at": db.now(),
            "items": items, "production": production, "performance": perf, "theme_scores": scores[:6]}
    db.kv_set(f"plan:{week}", plan)
    return plan


def next_production() -> dict | None:
    """Önümüzdeki LEAD_DAYS içinde boş uzun slot varsa üretilecek kalemi döndürür; yoksa None (üretim yapılmaz)."""
    scheduler.fill(LEAD_DAYS + 7)  # hazır ama takvime girmemiş videolar önce yerleşsin
    horizon = datetime.now(tz()) + timedelta(days=LEAD_DAYS)
    for off in (0, 1):
        plan = build(off)
        for p in plan["production"]:
            t = datetime.fromisoformat(p["slot"])
            if datetime.now(tz()) + timedelta(hours=18) <= t <= horizon:  # yetişmeyecek kadar yakın slot atlanır
                return p
    return None


def markdown(plan: dict) -> str:
    name = "Gece Kütüphanesi" if plan["channel"] == "gece" else "Bulutkent"
    md = [f"## {name} · {plan['week']} (Pazartesi {plan['start']})", ""]
    md += ["| Gün | Saat | Tür | Video | Durum |", "|---|---|---|---|---|"]
    for it in plan["items"]:
        link = f" ([izle](https://youtu.be/{it['youtube_id']}))" if it.get("youtube_id") else ""
        extra = f" · üretim {it['produce_on']}" if it.get("produce_on") else ""
        md.append(f"| {it['day']} | {it['time'][-5:]} | {'Uzun' if it['kind'] == 'long' else 'Shorts'} | "
                  f"{(it.get('title') or '').replace('|', '·')}{link} | {it['status']}{extra} |")
    perf = plan["performance"]
    md += ["", "**En çok izlenenler (günlük izlenme):**"]
    if perf["videos"]:
        for v in perf["videos"][:5]:
            pct = f", ort. izlenme %{v['avg_view_pct']:.0f}" if v.get("avg_view_pct") is not None else ""
            md.append(f"- {v['title'][:60]}: {v['views']} izlenme, {v['views_per_day']}/gün{pct}")
    else:
        md.append("- Henüz yayında yeterli süre kalmış video yok; veri biriktikçe plan buna göre değişecek.")
    if plan["channel"] != "gece":
        md += ["", "**Tema sıralaması:** " + ", ".join(f"{t['name']} ({t['score']})" for t in plan["theme_scores"][:5]),
               f"_Dayanak: {plan['theme_scores'][0]['basis'] if plan['theme_scores'] else '-'}_"]
    md.append("")
    return "\n".join(md)


def write(offset: int = 1) -> dict:
    plan = build(offset)
    out = Paths.root / "plans" / f"{plan['week']}_{plan['channel']}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(markdown(plan), encoding="utf-8")
    return {"week": plan["week"], "path": str(out), "production": plan["production"],
            "filled": sum(1 for i in plan["items"] if i.get("video_id")), "slots": len(plan["items"])}
