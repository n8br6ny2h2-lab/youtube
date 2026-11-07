"""Henüz yüklenmemiş Bulutkent videolarını sinematik sürüme yükseltir:
uzun bölümlere 3D açılış, her bölümün ilk bekleyen Shorts'una 3D sahneler. Bütçe sınırı geçerlidir.
Kullanım: python scripts/cinematic_upgrade.py [video_id ...]"""
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from studio import cinematic, db, pipeline, qc, story as story_mod  # noqa: E402
from studio.config import Paths, settings  # noqa: E402
from studio.production import _shift_srt  # noqa: E402

pipeline.setup()
ids = [int(a) for a in sys.argv[1:]] or [r["id"] for r in db.query(
    "SELECT DISTINCT l.id FROM videos l WHERE l.kind='long' AND (l.status IN ('ready','scheduled') OR EXISTS "
    "(SELECT 1 FROM videos s WHERE s.parent_id=l.id AND s.status IN ('ready','scheduled'))) ORDER BY l.id")]


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True).stdout.strip() or 0)


for vid in ids:
    v = db.one("SELECT * FROM videos WHERE id=?", (vid,))
    st = story_mod.load(v["story_id"])
    path = Paths.root / v["path"]
    fp = path.stem
    work = Paths.scenes / f"ep_{fp}"
    work.mkdir(parents=True, exist_ok=True)
    if v["status"] in ("ready", "scheduled") and not db.kv_get(f"cine_intro:{vid}"):
        intro = cinematic.long_intro(st, work, st["title"])
        if intro:
            tmp = path.with_name(path.stem + "_cine.mp4")
            cinematic.prepend(intro, path, tmp)
            tmp.replace(path)
            srt = Paths.subtitles / f"{fp}.srt"
            if srt.exists():
                _shift_srt(srt, cinematic.CLIP_SECONDS)
            db.execute("UPDATE videos SET duration_s=? WHERE id=?", (dur(path), vid))
            db.kv_set(f"cine_intro:{vid}", True)
            print(f"{vid}: 3D açılış eklendi")
    if any(db.kv_get(f"cine_short:{r['id']}") for r in db.query("SELECT id FROM videos WHERE parent_id=?", (vid,))):
        continue  # bu bölümün zaten bir 3D Shorts'u var
    sh = db.one("SELECT * FROM videos WHERE parent_id=? AND kind='short' AND status IN ('ready','scheduled') "
                "AND duration_s <= ? ORDER BY id LIMIT 1", (vid, 3 * cinematic.CLIP_SECONDS))
    if sh and not db.kv_get(f"cine_short:{sh['id']}"):
        sp = Paths.root / sh["path"]
        srt = Paths.subtitles / f"{sp.stem}.srt"
        if not srt.exists():
            print(f"  short {sh['id']}: altyazı yok, atlandı")
            continue
        mix = work / f"{sp.stem}_mix.wav"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(sp), "-vn", "-ac", "2", "-ar", "48000", str(mix)], check=True)
        d = dur(sp)
        title = sh["title"].replace("#shorts", "").strip()
        title = "".join(ch for ch in title if ch.isalnum() or ch in " .,!?'-…").strip()
        tmp = sp.with_name(sp.stem + "_3d.mp4")
        made = cinematic.short_3d(st, {"duration": d, "scenes": st["scenes"]}, mix, srt, title, tmp)
        if made:
            rep = qc.check(tmp, "short", min_s=settings()["video"]["shorts_min_seconds"], max_s=settings()["video"]["shorts_max_seconds"])
            if rep["checks"]["resolution"] and rep["checks"]["duration_ok"]:
                tmp.replace(sp)
                db.kv_set(f"cine_short:{sh['id']}", True)
                print(f"  short {sh['id']}: 3D sürüm hazır ({d:.0f} sn)")
            else:
                print(f"  short {sh['id']}: QC {rep['failed']}")
        else:
            print(f"  short {sh['id']}: 3D yapılamadı (süre {d:.0f} sn > {3 * cinematic.CLIP_SECONDS:.0f} ya da bütçe)")
print("bu ay sinematik harcama (tahmini):", cinematic.month_spend(), "$")
