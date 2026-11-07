"""Konteyner sıfırlandıktan sonra state/videos.json'dan YouTube'daki videoların kaydını geri yükler.
Böylece aynı video tekrar yüklenmez, eski sesli videoların silinmesi ve analitik kaldığı yerden sürer.
Kullanım: python scripts/restore_state.py   (yalnızca boş veritabanına yazar)"""
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
state = json.loads((ROOT / "state" / "videos.json").read_text(encoding="utf-8"))
code = r'''
import json, sys
from studio import db, pipeline
pipeline.setup()
rows = json.loads(sys.stdin.read())
if db.one("SELECT COUNT(*) n FROM videos")["n"]:
    print("veritabanı dolu, atlandı"); sys.exit(0)
n = 0
for r in rows:
    if not r.get("youtube_id") or r.get("status") == "deleted":
        continue
    vid = db.insert("videos", kind=r["kind"], title=r.get("title"), path=r.get("path") or "", status=r["status"],
                    qc_passed=1, created_at=db.now())
    db.insert("uploads", video_id=vid, youtube_id=r["youtube_id"], created_at=db.now(), privacy=r.get("privacy"),
              status="uploaded")
    n += 1
print(f"{n} YouTube videosu geri yüklendi")
'''
for ch, rows in state.items():
    if ch == "gece" and not (ROOT / "channels/gece/settings.json").exists():
        continue
    r = subprocess.run([sys.executable, "-c", code], cwd=ROOT, input=json.dumps(rows), capture_output=True, text=True,
                       env={**os.environ, "BK_CHANNEL": ch})
    print(ch + ":", (r.stdout.strip().splitlines() or [r.stderr[-300:]])[-1])
