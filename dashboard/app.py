"""Bulutkent yönetim paneli (FastAPI). Çalıştırma: python main.py --mode dashboard"""
from __future__ import annotations

import json
import os
import threading
import traceback
from datetime import datetime

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from studio import analytics, brand, costs, db, pipeline, scheduler, youtube
from studio.config import Paths, env, settings

app = FastAPI(title="Bulutkent Stüdyo")
for name in ("renders", "shorts", "thumbnails", "brand", "logos", "banners", "characters"):
    (Paths.root / name).mkdir(exist_ok=True)
    app.mount(f"/media/{name}", StaticFiles(directory=str(Paths.root / name)), name=name)

_lock = threading.Lock()
_job: dict = {"mode": None, "started": None, "result": None, "error": None}
MODES = {"research": pipeline.research, "story": pipeline.story, "video": pipeline.video, "shorts": pipeline.shorts,
         "publish": pipeline.publish, "analytics": pipeline.do_analytics, "full": pipeline.full}


def _auth(token: str | None) -> None:
    expected = env("DASHBOARD_TOKEN")
    if expected and expected != "change-me" and token != expected:
        raise HTTPException(401, "Geçersiz token")


def _worker(mode: str) -> None:
    try:
        _job["result"] = pipeline._run(mode, MODES[mode]) if mode != "full" else pipeline.full()
    except Exception as exc:
        _job["error"] = f"{exc}\n{traceback.format_exc()[-600:]}"
    finally:
        _job["mode"] = None
        _lock.release()


@app.post("/api/run/{mode}")
def run(mode: str, request: Request, x_token: str | None = Header(default=None)):
    _auth(x_token or request.query_params.get("token"))
    if mode not in MODES:
        raise HTTPException(404, "Bilinmeyen görev")
    if not _lock.acquire(blocking=False):
        return JSONResponse({"accepted": False, "busy": _job["mode"]}, status_code=409)
    _job.update(mode=mode, started=datetime.now().isoformat(timespec="seconds"), result=None, error=None)
    threading.Thread(target=_worker, args=(mode,), daemon=True).start()
    return {"accepted": True, "mode": mode}


@app.get("/api/job")
def job():
    return _job


@app.get("/api/status")
def status():
    st = pipeline.status()
    st["channel"] = db.kv_get("channel")
    st["brand_kit"] = {k: v for k, v in brand.load().items() if k in ("name", "slogan", "palette", "assets", "handle")}
    today = db.one("SELECT COUNT(*) n FROM videos WHERE date(created_at)=date('now')")["n"]
    st["today_produced"] = today
    st["capabilities"] = youtube.capabilities()
    return st


@app.get("/api/ideas")
def ideas_():
    return db.query("SELECT id, created_at, category, title, score, status, source FROM ideas ORDER BY id DESC LIMIT 60")


@app.get("/api/stories")
def stories_():
    return db.query("SELECT id, created_at, title, category, engine, status FROM stories ORDER BY id DESC LIMIT 40")


@app.get("/api/videos")
def videos_():
    rows = db.query("SELECT v.id, v.kind, v.parent_id, v.created_at, v.title, v.path, v.thumbnail, v.duration_s, v.qc_passed, v.status, "
                    "u.youtube_id, u.privacy, u.publish_at FROM videos v LEFT JOIN uploads u ON u.video_id=v.id ORDER BY v.id DESC LIMIT 60")
    for r in rows:
        r["url"] = "/media/" + r["path"] if r["path"] else None
        r["thumb_url"] = "/media/" + r["thumbnail"] if r["thumbnail"] else None
    return rows


@app.get("/api/schedule")
def schedule_():
    return {"program": scheduler.program(), "calendar": scheduler.calendar(14), "timezone": settings()["timezone"]}


@app.get("/api/errors")
def errors_():
    return db.query("SELECT id, created_at, stage, message, attempts, resolved FROM errors ORDER BY id DESC LIMIT 50")


@app.get("/api/runs")
def runs_():
    return db.query("SELECT id, mode, status, started_at, finished_at FROM runs ORDER BY id DESC LIMIT 40")


@app.get("/api/costs")
def costs_():
    return costs.summary()


@app.get("/api/report")
def report_():
    rep = db.kv_get("weekly_report") or analytics.weekly_report()
    subs = db.query("SELECT day, value FROM analytics WHERE youtube_id='channel' AND metric='subscribers' ORDER BY id")
    views = db.query("SELECT day, value FROM analytics WHERE youtube_id='channel' AND metric='channel_views' ORDER BY id")
    return {"report": rep, "subscribers": subs, "views": views, "research": db.kv_get("research_insights")}


@app.get("/", response_class=HTMLResponse)
def index():
    return (Paths.dashboard / "templates" / "index.html").read_text(encoding="utf-8")


def serve(port: int | None = None) -> None:
    import uvicorn
    cfg = settings()["dashboard"]
    host = os.environ.get("DASHBOARD_HOST", cfg.get("host", "127.0.0.1"))
    uvicorn.run(app, host=host, port=port or int(os.environ.get("DASHBOARD_PORT", cfg["port"])), log_level="warning")
