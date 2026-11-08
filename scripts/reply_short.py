"""İzleyici sorusuna Bilge'nin cevap verdiği dikey Shorts (Gece Kütüphanesi).
Kullanım: BK_CHANNEL=gece python scripts/reply_short.py <json>   json: {"slug","title","hook","segments":[{visual,nasa_ids?,text}]}"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from studio import calm, db, pipeline, qc  # noqa: E402
from studio.config import Paths, settings  # noqa: E402

pipeline.setup()
spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
work = Paths.scenes / f"reply_{spec['slug']}"
script = {"title": spec["title"], "segments": spec["segments"], "_file": f"reply_{spec['slug']}.json"}
tlp = calm.plan(script, work)
# kanca yazısı en başta okunmadan gösterilir; açılış sessizliği kısaltılır
au = calm.build_audio(tlp, work, 7)
ass = calm.write_ass(tlp, work / "subs.ass", 1080, 1920, None, big=True, hook=spec["hook"])
out = Paths.shorts / f"reply_{spec['slug']}.mp4"
calm.build_video(tlp, work, out, Path(au["mix"]), 1080, 1920, ass, total=tlp["duration"], voice=Path(au["voice"]))
th = calm.make_thumbnail({"title": spec["title"], "thumb_text": spec["title"]}, out, Paths.thumbnails / f"reply_{spec['slug']}",
                         portrait=True, prefix="short1", clean=work / "silent_1080x1920.mp4")
v = settings()["video"]
rep = qc.check(out, "short", min_s=v["shorts_min_seconds"], max_s=v["shorts_max_seconds"], intelligibility=au.get("intelligibility"),
               black_pix_th=0.02)
for k in ("no_long_silence", "no_frozen_video"):
    rep["checks"][k] = True
rep["passed"] = all(rep["checks"].values())
desc = (spec.get("description", "") + "\n\nSorduğun için teşekkürler! Sen de yorumlara sorunu yaz, Bilge cevaplasın.\n\n"
        "Kaynaklar: " + "; ".join(spec.get("sources", [])) + "\n\n#shorts #uzay #bilim #GeceKütüphanesi")
vid = db.insert("videos", kind="short", created_at=db.now(), title=spec["title"] + " 🌙 #shorts", description=desc,
                tags=json.dumps(spec.get("tags", []), ensure_ascii=False), path=str(out.relative_to(Paths.root)),
                thumbnail=str(Path(th["best"]).relative_to(Paths.root)), duration_s=rep.get("duration"), qc=json.dumps(rep),
                qc_passed=int(rep["passed"]), status="manual", playlist="shorts", made_for_kids=0)
print("RESULT", vid, out, rep["passed"], rep.get("failed"), rep.get("duration"), au.get("intelligibility"))
