"""Üretim hattı: hikâye -> uzun video -> Shorts -> kapaklar -> metadata -> kalite kontrol -> veritabanı."""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from loguru import logger

from . import brand as brand_mod
from . import composer, db, qc, safety, subtitles, thumbnails
from .characters import CHARACTERS
from .config import Paths, settings
from .story import CATEGORIES

PLAYLIST_BY_CATEGORY = {
    "colors": "colors_shapes", "shapes": "colors_shapes", "numbers": "numbers", "sharing": "friendship",
    "friendship": "friendship", "animal_adventure": "animals", "funny": "animals", "riddles": "riddles",
    "songs": "songs", "bedtime": "bedtime", "educational": "educational",
}


def metadata(story: dict, kind: str = "long", short_title: str | None = None) -> dict:
    kit = brand_mod.load()
    name = kit.get("name", "Bulutkent")
    chars = sorted({b["speaker"] for s in story["scenes"] for b in s["beats"] if b["speaker"] in CHARACTERS})
    char_names = ", ".join(CHARACTERS[c].name for c in chars)
    if kind == "long":
        title = f"{story['title']} | {name}"
    else:
        title = f"{short_title or story['title']} #shorts"
    if len(title) > 100:
        title = title[:97] + "..."
    desc = (
        f"{story.get('summary', '')}\n\n"
        f"Bu bölümde: {char_names}\n"
        f"Öğrenme hedefi: {story.get('learning_goal', '')}\n"
        f"Mesaj: {story.get('moral', '')}\n\n"
        f"{name}'te her bölüm özgün bir hikâyedir; 2-8 yaş için hazırlanır.\n"
        f"Yeni bölümler Salı, Perşembe ve Pazar 18:00'de.\n\n"
        "Hikâye, animasyon, seslendirme ve müzik yapay zekâ destekli araçlarla üretilmiş ve yayın öncesinde "
        "çocuk güvenliği kontrolünden geçirilmiştir. Tüm karakterler ve müzikler kanala özgüdür.\n\n"
        f"#{name.lower()} #çocukmasalları #{CATEGORIES.get(story.get('category'), '').split()[0].lower() if story.get('category') in CATEGORIES else 'çocuk'}"
    )
    tags = list(dict.fromkeys(
        [name, "çocuk çizgi film", "çocuk masalları", "okul öncesi", "Türkçe çocuk videoları", *story.get("tags", []),
         *[CHARACTERS[c].name for c in chars]]))
    # YouTube etiket toplamı 500 karakter sınırı
    out, total = [], 0
    for t in tags:
        if total + len(t) + 2 > 480:
            break
        out.append(t); total += len(t) + 2
    issues = safety.scan_title(title)
    return {"title": title, "description": desc[:4900], "tags": out, "category_id": settings()["publishing"]["category_id"],
            "made_for_kids": True, "default_language": "tr", "playlist": PLAYLIST_BY_CATEGORY.get(story.get("category"), "educational"),
            "title_issues": issues}


def _fingerprint(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:24]


def produce_long(story: dict) -> dict:
    meta = story.get("_meta", {})
    sid = meta.get("story_id")
    fp = meta.get("fingerprint") or hashlib.sha1(story["title"].encode()).hexdigest()[:12]
    work = Paths.scenes / f"ep_{fp}"
    seed = int(fp[:6], 16)
    kit = brand_mod.load()
    if not meta.get("safety", {}).get("passed", True):
        raise ValueError(f"Hikâye güvenlik kontrolünden geçemedi: {meta['safety']['issues']}")
    logger.info(f"[video] Zaman çizelgesi + seslendirme: {story['title']}")
    tlp = composer.plan(story, work, outro=True, brand_name=kit.get("name", "Bulutkent"))
    au = composer.build_audio(tlp, work, seed)
    (work / "timeline.json").write_text(json.dumps(tlp, ensure_ascii=False), encoding="utf-8")
    logger.info(f"[video] HyperFrames projesi ({tlp['duration']:.1f} sn)")
    project = work / "hf"
    composer.build_html(tlp, project, composer.LANDSCAPE, kit, title_overlay=story["title"])
    silent = work / "video_silent.mp4"
    logger.info("[video] Render (HyperFrames)...")
    composer.render(project, silent)
    out = Paths.renders / f"{fp}.mp4"
    composer.mux(silent, Path(au["mix"]), out, tlp["duration"])
    srt = Paths.subtitles / f"{fp}.srt"
    shutil.copy(au["srt"], srt)
    th = thumbnails.make(story, Paths.thumbnails / fp)
    md = metadata(story, "long")
    v = settings()["video"]
    report = qc.check(out, "long", min_s=v["min_long_seconds"], intelligibility=au.get("intelligibility"),
                      safety_passed=meta.get("safety", {}).get("passed", True) and not md["title_issues"])
    vid_fp = _fingerprint(out)
    vid = db.insert("videos", story_id=sid, kind="long", created_at=db.now(), title=md["title"], description=md["description"],
                    tags=md["tags"], path=str(out.relative_to(Paths.root)), thumbnail=str(Path(th["best"]).relative_to(Paths.root)),
                    duration_s=report.get("duration"), qc=report, qc_passed=int(report["passed"]),
                    status="ready" if report["passed"] else "qc_failed", playlist=md["playlist"], fingerprint=vid_fp)
    db.insert("licenses", created_at=db.now(), asset_path=str(out.relative_to(Paths.root)), kind="video",
              source="Bulutkent stüdyosu: özgün karakterler, prosedürel müzik/efekt, Piper TTS (MIT), Baloo 2/Nunito (OFL)",
              license="Özgün eser", author="studio", url="")
    if sid:
        db.update("stories", sid, status="produced")
    logger.info(f"[video] Uzun video hazır: {out.name} QC={'GEÇTİ' if report['passed'] else 'KALDI ' + str(report.get('failed'))}")
    return {"video_id": vid, "path": str(out), "timeline": tlp, "audio": au, "thumbnail": th, "qc": report, "meta": md,
            "work": str(work), "seed": seed, "fingerprint": fp}


def _score_short(tlp: dict, scene_ids: list[str]) -> float:
    beats = [b for s in tlp["scenes"] if s["id"] in scene_ids for b in s["beats"]]
    if not beats:
        return 0
    dur = beats[-1]["start"] + beats[-1]["dur"] - beats[0]["start"]
    energy = sum(1 for b in beats if b["emotion"] in ("excited", "surprised", "laughing")) / len(beats)
    questions = sum(1 for b in beats if b["text"].rstrip().endswith("?")) / len(beats)
    actions = sum(1 for b in beats if b["action"] not in ("talk", "idle")) / len(beats)
    sfx = sum(1 for b in beats if b.get("sfx", "none") != "none") / len(beats)
    fit = 1.0 if 18 <= dur <= 50 else 0.5 if 12 <= dur <= 58 else 0.0
    return round(100 * (0.3 * fit + 0.25 * energy + 0.15 * questions + 0.15 * actions + 0.15 * sfx), 1)


def produce_shorts(story: dict, long_result: dict, limit: int | None = None) -> list[dict]:
    limit = limit or settings()["video"]["shorts_per_long"]
    tlp = long_result["timeline"]
    fp = long_result["fingerprint"]
    kit = brand_mod.load()
    cands = list(story.get("shorts_candidates", []))
    # Hikâyenin önerdiği adaylara ek olarak tek sahnelik adaylar (Whisper zamanlarıyla kontrol edilen)
    for s in tlp["scenes"]:
        if s["id"] != "outro" and not any(c["scene_ids"] == [s["id"]] for c in cands):
            first = next((b["text"] for b in s["beats"]), "")
            line = next((b["text"] for b in s["beats"] if b["speaker"] != "narrator" and 12 <= len(b["text"]) <= 60), first)
            cands.append({"title": line[:70], "scene_ids": [s["id"]], "hook_text": first if first.endswith("?") else "Bak neler oluyor!"})
    scored = []
    for c in cands:
        sub = [s for s in tlp["scenes"] if s["id"] in c["scene_ids"]]
        if not sub:
            continue
        dur = sum(s["beats"][-1]["start"] + s["beats"][-1]["dur"] - s["beats"][0]["start"] for s in sub) + 4
        if dur < 18 or dur > 56:  # QC sınırı 15-60 sn; tahmin payı bırakılır
            continue
        scored.append({**c, "score": _score_short(tlp, c["scene_ids"]), "est": dur})
    scored.sort(key=lambda c: -c["score"])
    results, used = [], set()
    for c in scored:
        if len(results) >= limit:
            break
        if used & set(c["scene_ids"]):
            continue
        used |= set(c["scene_ids"])
        idx = len(results) + 1
        work = Path(long_result["work"]) / f"short{idx}"
        stl = composer.subset(tlp, c["scene_ids"], c["hook_text"], Path(long_result["work"]))
        au = composer.build_audio(stl, work, long_result["seed"] + idx)
        composer.build_html(stl, work / "hf", composer.PORTRAIT, kit, shorts_title=c["title"])
        silent = work / "video_silent.mp4"
        composer.render(work / "hf", silent)
        out = Paths.shorts / f"{fp}_s{idx}.mp4"
        composer.mux(silent, Path(au["mix"]), out, stl["duration"])
        mini = {**story, "title": c["title"], "thumb_text": None, "scenes": [s for s in story["scenes"] if s["id"] in c["scene_ids"]] or story["scenes"]}
        cover = thumbnails.make(mini, Paths.thumbnails / fp, portrait=True, prefix=f"short{idx}")
        md = metadata(story, "short", c["title"])
        v = settings()["video"]
        report = qc.check(out, "short", min_s=v["shorts_min_seconds"], max_s=v["shorts_max_seconds"],
                          intelligibility=au.get("intelligibility"), safety_passed=not md["title_issues"])
        vfp = _fingerprint(out)
        if db.one("SELECT id FROM videos WHERE fingerprint=?", (vfp,)):
            logger.warning("Aynı Shorts zaten var, atlandı")
            continue
        vid = db.insert("videos", story_id=story.get("_meta", {}).get("story_id"), kind="short", parent_id=long_result["video_id"],
                        created_at=db.now(), title=md["title"], description=md["description"], tags=md["tags"],
                        path=str(out.relative_to(Paths.root)), thumbnail=str(Path(cover["best"]).relative_to(Paths.root)),
                        duration_s=report.get("duration"), qc=report, qc_passed=int(report["passed"]),
                        status="ready" if report["passed"] else "qc_failed", playlist="shorts", fingerprint=vfp)
        shutil.copy(au["srt"], Paths.subtitles / f"{fp}_s{idx}.srt")
        logger.info(f"[shorts] {out.name} ({report.get('duration')} sn, puan {c['score']}) QC={'GEÇTİ' if report['passed'] else report.get('failed')}")
        results.append({"video_id": vid, "path": str(out), "cover": cover, "qc": report, "candidate": c, "meta": md})
    return results
