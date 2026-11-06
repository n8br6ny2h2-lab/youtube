"""Görev orkestrasyonu: research / story / video / shorts / publish / analytics / full / daemon."""
from __future__ import annotations

import json
import shutil
import time
import traceback
from datetime import datetime
from pathlib import Path

from loguru import logger

from . import analytics, brand, db, ideas, llm, log, production, scheduler, story as story_mod, youtube
from .config import Paths, has_key, settings, tz


def _run(mode: str, fn, *a, **kw):
    rid = db.insert("runs", mode=mode, status="running", started_at=db.now())
    try:
        res = fn(*a, **kw)
        db.update("runs", rid, status="ok", finished_at=db.now(), detail=json.dumps(res, ensure_ascii=False, default=str)[:4000])
        return res
    except Exception as exc:
        log.record_error(mode, exc)
        db.update("runs", rid, status="error", finished_at=db.now(), detail=str(exc)[:2000])
        raise


def setup() -> None:
    Paths.ensure()
    log.setup()
    db.init()
    if not brand.load():
        brand.run()


def research() -> dict:
    ins = ideas.research()
    new = ideas.generate(5)
    return {"insights": ins.get("available"), "reason": ins.get("reason"), "new_ideas": [(i["title"], i["score"]) for i in new]}


def story() -> dict:
    idea = ideas.next_idea()
    if not idea:
        ideas.generate(3)
        idea = ideas.next_idea()
    if not idea:
        raise RuntimeError("Üretilebilir (puanı yeterli) fikir yok")
    st = story_mod.write(idea)
    return {"story_id": st["_meta"]["story_id"], "title": st["title"], "engine": st["_meta"]["engine"], "safety": st["_meta"]["safety"]}


def video(story_id: int | None = None) -> dict:
    if story_id is None:
        row = db.one("SELECT id FROM stories WHERE status='written' ORDER BY id ASC LIMIT 1")
        if not row:
            story()
            row = db.one("SELECT id FROM stories WHERE status='written' ORDER BY id ASC LIMIT 1")
        story_id = row["id"]
    st = story_mod.load(story_id)
    res = production.produce_long(st)
    db.kv_set(f"long_result:{res['video_id']}", {k: res[k] for k in ("video_id", "path", "work", "seed", "fingerprint")} | {"story_id": story_id})
    return {"video_id": res["video_id"], "path": res["path"], "duration": res["qc"].get("duration"), "qc_passed": res["qc"]["passed"],
            "qc_failed": res["qc"].get("failed"), "thumbnail": res["thumbnail"]["best"], "title": res["meta"]["title"]}


def shorts(video_id: int | None = None) -> dict:
    if video_id is None:
        row = db.one("SELECT v.id FROM videos v WHERE v.kind='long' AND NOT EXISTS (SELECT 1 FROM videos s WHERE s.parent_id=v.id) "
                     "ORDER BY v.id DESC LIMIT 1")
        if not row:
            raise RuntimeError("Shorts çıkarılacak uzun video yok")
        video_id = row["id"]
    lr = db.kv_get(f"long_result:{video_id}")
    if not lr:
        raise RuntimeError(f"Uzun video {video_id} için üretim kaydı yok")
    lr["timeline"] = json.loads((Path(lr["work"]) / "timeline.json").read_text(encoding="utf-8"))
    st = story_mod.load(lr["story_id"])
    res = production.produce_shorts(st, lr)
    return {"shorts": [{"video_id": r["video_id"], "path": r["path"], "duration": r["qc"].get("duration"),
                        "qc_passed": r["qc"]["passed"], "title": r["meta"]["title"], "score": r["candidate"]["score"]} for r in res]}


def publish(test_private: bool = False) -> dict:
    assigned = scheduler.fill(14)
    uploaded = scheduler.publish_due(force_private_test=test_private)
    return {"scheduled": assigned, "uploaded": uploaded, "connected": youtube.connected(),
            "auto_publish": bool(db.kv_get("auto_publish", settings()["publishing"]["auto_publish"]))}


def do_analytics() -> dict:
    f = analytics.fetch()
    lrn = analytics.learn()
    rep = analytics.weekly_report()
    opt = scheduler.optimize()
    return {"fetched": f.get("available"), "reason": f.get("reason"), "learnings": lrn, "report": rep["path"], "schedule": opt}


def full() -> dict:
    out = {}
    for name, fn in (("research", research), ("story", story), ("video", video), ("shorts", shorts), ("publish", publish), ("analytics", do_analytics)):
        try:
            out[name] = _run(name, fn)
        except Exception as exc:
            out[name] = {"error": str(exc)}
            if name in ("story", "video"):
                break  # üretim başarısızsa sonraki adımlar anlamsız
    return out


def weekly_target_met() -> bool:
    q_long = db.one("SELECT COUNT(*) n FROM videos WHERE kind='long' AND status IN ('ready','scheduled')")["n"]
    q_short = db.one("SELECT COUNT(*) n FROM videos WHERE kind='short' AND status IN ('ready','scheduled')")["n"]
    return q_long >= 3 and q_short >= 7


def status() -> dict:
    import shutil as sh
    tools = {t: bool(sh.which(t)) for t in ("ffmpeg", "ffprobe", "hyperframes", "n8n", "docker", "sqlite3", "convert", "espeak-ng")}
    piper_model = (Paths.root / settings()["audio"]["piper_voice"]).exists()
    whisper_model = any((Paths.models / "whisper").glob("models--*")) if (Paths.models / "whisper").exists() else False
    return {
        "brand": brand.load().get("name"),
        "youtube_connected": youtube.connected(),
        "client_secret_present": (Paths.secrets / "client_secret.json").exists(),
        "apis": {"claude": llm.available(), "elevenlabs": has_key("ELEVENLABS_API_KEY"), "openai": has_key("OPENAI_API_KEY"),
                 "youtube_api_key": has_key("YOUTUBE_API_KEY"), "pexels": has_key("PEXELS_API_KEY"),
                 "pixabay": has_key("PIXABAY_API_KEY"), "unsplash": has_key("UNSPLASH_ACCESS_KEY")},
        "local": {"piper_tr_voice": piper_model, "whisper_model": whisper_model, **tools},
        "auto_publish": bool(db.kv_get("auto_publish", settings()["publishing"]["auto_publish"])),
        "counts": {k: db.one(f"SELECT COUNT(*) n FROM {t}")["n"] for k, t in
                   (("ideas", "ideas"), ("stories", "stories"), ("videos", "videos"), ("uploads", "uploads"), ("errors", "errors"))},
    }


def daemon() -> None:
    """n8n kullanılmıyorsa dahili zamanlayıcı (Europe/Istanbul)."""
    import schedule as sch
    logger.info("Dahili zamanlayıcı başladı (Ctrl+C ile durdurun)")

    def safe(name, fn):
        def wrapper():
            try:
                _run(name, fn)
            except Exception:
                logger.error(traceback.format_exc()[-800:])
        return wrapper

    def produce_if_needed():
        if not weekly_target_met():
            safe("video", video)()
            safe("shorts", shorts)()

    # schedule kütüphanesi saat dilimi destekler
    zone = settings()["timezone"]
    sch.every().day.at("09:10", zone).do(safe("research", research))
    sch.every().day.at("02:30", zone).do(produce_if_needed)
    sch.every().day.at("14:30", zone).do(produce_if_needed)
    sch.every().hour.at(":05").do(safe("publish", publish))
    sch.every().day.at("06:20", zone).do(safe("analytics", do_analytics))
    while True:
        sch.run_pending()
        time.sleep(30)
