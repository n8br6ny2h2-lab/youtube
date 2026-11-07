"""SQLite veritabanı: fikirler, hikâyeler, videolar, Shorts, yayın kuyruğu, maliyet, hatalar, analiz."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator

from .config import Paths

DB_PATH = Paths.database / "studio.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY, mode TEXT, status TEXT, started_at TEXT, finished_at TEXT, detail TEXT
);
CREATE TABLE IF NOT EXISTS research (
  id INTEGER PRIMARY KEY, created_at TEXT, source TEXT, query TEXT, video_id TEXT, title TEXT,
  channel TEXT, views INTEGER, duration_s INTEGER, published_at TEXT, data TEXT
);
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY, created_at TEXT, category TEXT, title TEXT, premise TEXT,
  characters TEXT, score INTEGER, score_detail TEXT, status TEXT DEFAULT 'pool', source TEXT,
  week TEXT, improved_rounds INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY, idea_id INTEGER, created_at TEXT, title TEXT, category TEXT,
  path TEXT, engine TEXT, safety TEXT, status TEXT DEFAULT 'written'
);
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY, story_id INTEGER, kind TEXT, parent_id INTEGER, created_at TEXT,
  title TEXT, description TEXT, tags TEXT, path TEXT, thumbnail TEXT, duration_s REAL,
  qc TEXT, qc_passed INTEGER DEFAULT 0, status TEXT DEFAULT 'rendered', playlist TEXT,
  made_for_kids INTEGER DEFAULT 1, fingerprint TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY, video_id INTEGER UNIQUE, kind TEXT, slot_local TEXT, slot_utc TEXT,
  status TEXT DEFAULT 'queued'
);
CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY, video_id INTEGER, youtube_id TEXT, created_at TEXT, privacy TEXT,
  publish_at TEXT, status TEXT, response TEXT
);
CREATE TABLE IF NOT EXISTS costs (
  id INTEGER PRIMARY KEY, created_at TEXT, service TEXT, operation TEXT, units REAL, usd REAL, detail TEXT
);
CREATE TABLE IF NOT EXISTS errors (
  id INTEGER PRIMARY KEY, created_at TEXT, stage TEXT, message TEXT, detail TEXT, fingerprint TEXT,
  attempts INTEGER DEFAULT 1, resolved INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY, fetched_at TEXT, youtube_id TEXT, day TEXT, metric TEXT, value REAL, dims TEXT
);
CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY, created_at TEXT, asset_path TEXT, kind TEXT, source TEXT, license TEXT,
  author TEXT, url TEXT
);
CREATE TABLE IF NOT EXISTS learnings (
  id INTEGER PRIMARY KEY, created_at TEXT, key TEXT, value REAL, evidence TEXT
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY, created_at TEXT, finished_at TEXT, issuer TEXT, agent TEXT, task TEXT, payload TEXT,
  status TEXT DEFAULT 'open', result TEXT
);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
"""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    Paths.database.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=30)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init() -> None:
    with connect() as con:
        con.executescript(SCHEMA)


def insert(table: str, **values: Any) -> int:
    values = {k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v) for k, v in values.items()}
    cols = ", ".join(values)
    marks = ", ".join("?" for _ in values)
    with connect() as con:
        cur = con.execute(f"INSERT INTO {table} ({cols}) VALUES ({marks})", tuple(values.values()))
        return int(cur.lastrowid)


def update(table: str, row_id: int, **values: Any) -> None:
    values = {k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v) for k, v in values.items()}
    sets = ", ".join(f"{k}=?" for k in values)
    with connect() as con:
        con.execute(f"UPDATE {table} SET {sets} WHERE id=?", (*values.values(), row_id))


def execute(sql: str, params: tuple = ()) -> None:
    with connect() as con:
        con.execute(sql, params)


def query(sql: str, params: tuple = ()) -> list[dict]:
    with connect() as con:
        return [dict(r) for r in con.execute(sql, params).fetchall()]


def one(sql: str, params: tuple = ()) -> dict | None:
    rows = query(sql, params)
    return rows[0] if rows else None


def kv_get(key: str, default: Any = None) -> Any:
    row = one("SELECT value FROM kv WHERE key=?", (key,))
    return json.loads(row["value"]) if row else default


def kv_set(key: str, value: Any) -> None:
    with connect() as con:
        con.execute("INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)", (key, json.dumps(value, ensure_ascii=False)))
