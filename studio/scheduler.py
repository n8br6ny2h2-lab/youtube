"""Yayın takvimi (Europe/Istanbul) ve yükleme kuyruğu.

- İlk 30 gün sabit program (settings.schedule), sonra yeterli veri varsa analitiğe göre optimizasyon.
- Kalite kontrolünden geçmeyen video asla takvime girmez; içerik yoksa slot boş bırakılır.
- auto_publish kapalıyken videolar ÖZEL yüklenir (test modu). Açılınca publishAt ile planlı yayın yapılır.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from loguru import logger

from . import brand as brand_mod
from . import db, log
from .config import Paths, settings, tz

DAYS = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
DAY_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]


def program() -> dict:
    """Etkin program: optimizasyon yapılmışsa onu, yoksa başlangıç programını döndürür."""
    opt = db.kv_get("optimized_schedule")
    return opt or {"long": settings()["schedule"]["long"], "shorts": settings()["schedule"]["shorts"], "source": "başlangıç programı"}


def slots(days: int = 14, start: datetime | None = None) -> list[dict]:
    now = start or datetime.now(tz())
    prog = program()
    out = []
    for d in range(days + 1):
        day = (now + timedelta(days=d)).date()
        for kind in ("long", "shorts"):
            for wd, hm in prog[kind]:
                if DAYS[wd] == day.weekday():
                    h, m = map(int, hm.split(":"))
                    local = datetime(day.year, day.month, day.day, h, m, tzinfo=tz())
                    if local > now + timedelta(minutes=30):
                        out.append({"kind": "long" if kind == "long" else "short", "local": local,
                                    "utc": local.astimezone(timezone.utc)})
    return sorted(out, key=lambda s: s["local"])


def first_run_date() -> datetime:
    v = db.kv_get("first_schedule_date")
    if not v:
        v = datetime.now(tz()).isoformat()
        db.kv_set("first_schedule_date", v)
    return datetime.fromisoformat(v)


def fill(days: int = 14) -> list[dict]:
    """Hazır (QC geçmiş) videoları boş slotlara yerleştirir."""
    first_run_date()
    taken = {r["slot_local"] for r in db.query("SELECT slot_local FROM schedule")}
    assigned = []
    for s in slots(days):
        key = s["local"].isoformat()
        if key in taken:
            continue
        v = db.one(
            "SELECT v.* FROM videos v LEFT JOIN schedule s ON s.video_id=v.id "
            "WHERE v.kind=? AND v.qc_passed=1 AND v.status='ready' AND s.id IS NULL ORDER BY v.id ASC LIMIT 1", (s["kind"],))
        if not v:
            continue  # yeterli kaliteli içerik yok: düşük kaliteli içerikle doldurulmaz
        db.insert("schedule", video_id=v["id"], kind=s["kind"], slot_local=key, slot_utc=s["utc"].isoformat(), status="queued")
        db.update("videos", v["id"], status="scheduled")
        taken.add(key)
        assigned.append({"video_id": v["id"], "title": v["title"], "slot": key})
    if assigned:
        logger.info(f"Takvime {len(assigned)} video eklendi")
    return assigned


def calendar(days: int = 14) -> list[dict]:
    rows = {r["slot_local"]: r for r in db.query(
        "SELECT s.*, v.title, v.thumbnail, v.kind vkind FROM schedule s JOIN videos v ON v.id=s.video_id")}
    out = []
    for s in slots(days):
        key = s["local"].isoformat()
        r = rows.get(key)
        out.append({"slot": key, "day": DAY_TR[s["local"].weekday()], "time": s["local"].strftime("%d.%m %H:%M"),
                    "kind": s["kind"], "video_id": r["video_id"] if r else None, "title": r["title"] if r else None,
                    "status": r["status"] if r else "boş"})
    return out


def publish_due(hours_ahead: int = 72, max_uploads: int = 4, force_private_test: bool = False) -> list[dict]:
    """Yaklaşan slotlardaki videoları YouTube'a yükler (planlı veya test için özel)."""
    from . import youtube
    if not youtube.connected():
        logger.warning("YouTube bağlı değil; yükleme atlandı")
        return []
    pub = settings()["publishing"]
    auto = bool(db.kv_get("auto_publish", pub["auto_publish"]))
    kit = brand_mod.load()
    horizon = datetime.now(timezone.utc) + timedelta(hours=hours_ahead)
    rows = db.query("SELECT s.*, v.path, v.thumbnail, v.title, v.description, v.tags, v.playlist, v.kind vkind, v.story_id "
                    "FROM schedule s JOIN videos v ON v.id=s.video_id WHERE s.status='queued' ORDER BY s.slot_utc LIMIT ?",
                    (max_uploads,))
    done = []
    for r in rows:
        if datetime.fromisoformat(r["slot_utc"]) > horizon:
            continue
        if db.one("SELECT id FROM uploads WHERE video_id=? AND status='uploaded'", (r["video_id"],)):
            db.update("schedule", r["id"], status="uploaded")
            continue  # aynı video tekrar yüklenmez
        if log.recent_failures("upload", f"video {r['video_id']}") >= 3:
            logger.warning(f"Video {r['video_id']} 3 kez başarısız oldu; elle kontrol gerekiyor")
            continue
        meta = {"title": r["title"], "description": r["description"], "tags": json.loads(r["tags"] or "[]"),
                "category_id": pub["category_id"], "made_for_kids": True}
        publish_at = None if (force_private_test or not auto) else r["slot_utc"].replace("+00:00", "Z")
        try:
            resp = youtube.upload(Paths.root / r["path"], meta, privacy="private", publish_at=publish_at)
            yid = resp["id"]
            notes = []
            try:
                youtube.set_thumbnail(yid, Paths.root / r["thumbnail"])
            except Exception as exc:
                notes.append(f"kapak yüklenemedi: {exc}")
            try:
                pl_title = next((p["title"] for p in kit.get("playlists", []) if p["key"] == r["playlist"]), None)
                if pl_title:
                    youtube.add_to_playlist(youtube.ensure_playlist(pl_title), yid)
            except Exception as exc:
                notes.append(f"oynatma listesi: {exc}")
            db.insert("uploads", video_id=r["video_id"], youtube_id=yid, created_at=db.now(), privacy=resp["status"]["privacyStatus"],
                      publish_at=publish_at, status="uploaded", response={"status": resp.get("status"), "notes": notes})
            db.update("schedule", r["id"], status="uploaded")
            db.update("videos", r["video_id"], status="uploaded")
            done.append({"video_id": r["video_id"], "youtube_id": yid, "publish_at": publish_at, "notes": notes})
            logger.info(f"Yüklendi: {r['title']} -> https://youtu.be/{yid} ({'planlı ' + publish_at if publish_at else 'ÖZEL'})")
        except Exception as exc:
            log.record_error("upload", f"video {r['video_id']}: {exc}")
    return done


def optimize() -> dict:
    """İlk 30 günden sonra, yeterli veri varsa yayın saatlerini performansa göre ayarlar."""
    cfg = settings()["schedule"]
    if (datetime.now(tz()) - first_run_date()).days < cfg["fixed_days"]:
        return {"changed": False, "reason": f"İlk {cfg['fixed_days']} gün sabit program uygulanıyor"}
    rows = db.query(
        "SELECT s.slot_local, s.kind, a.value FROM schedule s JOIN uploads u ON u.video_id=s.video_id "
        "JOIN analytics a ON a.youtube_id=u.youtube_id AND a.metric='views_7d'")
    if len(rows) < cfg["min_videos_for_optimization"]:
        return {"changed": False, "reason": f"Yetersiz veri ({len(rows)} video; en az {cfg['min_videos_for_optimization']} gerekli)"}
    perf: dict = {}
    for r in rows:
        t = datetime.fromisoformat(r["slot_local"])
        key = (r["kind"], t.strftime("%a").lower()[:3], t.strftime("%H:%M"))
        perf.setdefault(key, []).append(r["value"])
    prog = program()
    changes = []
    for kind, pk in (("long", "long"), ("short", "shorts")):
        hours = {}
        for (k, _, hm), vals in perf.items():
            if k == kind:
                hours.setdefault(hm, []).extend(vals)
        if len(hours) < 2:
            continue
        best = max(hours, key=lambda h: sum(hours[h]) / len(hours[h]))
        newp = [[d, best] for d, _ in prog[pk]]
        if newp != prog[pk]:
            changes.append({"kind": kind, "best_hour": best, "evidence": {h: round(sum(v) / len(v)) for h, v in hours.items()}})
            prog[pk] = newp
    if changes:
        prog["source"] = "analitik optimizasyonu " + db.now()
        db.kv_set("optimized_schedule", prog)
    return {"changed": bool(changes), "changes": changes}
