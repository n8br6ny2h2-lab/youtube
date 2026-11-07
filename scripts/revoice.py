"""Henüz yüklenmemiş videoları güncel seslerle yeniden üretir (yüklenmişlere dokunmaz).
Kullanım: python scripts/revoice.py [story_id ...]   (boşsa: bekleyen tüm hikâyeler)"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from studio import db, pipeline, scheduler  # noqa: E402
from studio.config import Paths  # noqa: E402

pipeline.setup()
ids = [int(a) for a in sys.argv[1:]] or [r["story_id"] for r in db.query(
    "SELECT DISTINCT story_id FROM videos WHERE kind='long' AND status IN ('ready','scheduled','qc_failed')")]
for sid in ids:
    uploaded_titles = {r["title"] for r in db.query("SELECT title FROM videos WHERE story_id=? AND status='uploaded'", (sid,))}
    old = db.query("SELECT id, path FROM videos WHERE story_id=? AND status IN ('ready','scheduled','qc_failed','rendered')", (sid,))
    old += db.query("SELECT s.id, s.path FROM videos s JOIN videos l ON s.parent_id=l.id WHERE l.story_id=? "
                    "AND s.status IN ('ready','scheduled','qc_failed','rendered')", (sid,))
    for r in {o["id"]: o for o in old}.values():
        db.execute("DELETE FROM schedule WHERE video_id=? AND status!='uploaded'", (r["id"],))
        db.execute("DELETE FROM videos WHERE id=?", (r["id"],))
        (Paths.root / r["path"]).unlink(missing_ok=True)
    db.execute("UPDATE stories SET status='written' WHERE id=?", (sid,))
    v = pipeline.video(sid)
    print("uzun:", v["video_id"], v["title"], "QC", v["qc_passed"], v["qc_failed"], flush=True)
    if v["qc_passed"]:
        for s in pipeline.shorts(v["video_id"])["shorts"]:
            if s["title"] in uploaded_titles:
                db.execute("DELETE FROM videos WHERE id=?", (s["video_id"],))
                print("  tekrar eden short atlandı:", s["title"])
                continue
            print("  short:", s["video_id"], s["title"], "QC", s["qc_passed"], flush=True)
print("takvim:", scheduler.fill(14))
