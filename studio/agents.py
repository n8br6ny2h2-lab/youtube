"""Bulutkent ajan ekibi.

  Yönetmen (Director)         : Günün planını yapar, diğer ajanlara iş emri verir, son kararı verir.
  Trend Avcısı (TrendScout)   : YouTube + mevsim sinyalleriyle en yüksek potansiyelli temayı bulur.
  Senarist (Writer)           : Seçilen temadan birden çok özgün taslak yazar.
  Viral Kontrolcü (Critic)    : Taslakları 100 puanlık ölçütle puanlar; 70 altını geri çevirir.
  Telif ve Güvenlik (Guard)   : Telif, marka, çocuk güvenliği ve lisans kayıtlarını denetler; veto yetkisi vardır.
  Animatör (Animator)         : Uzun videoyu üretir (HyperFrames + FFmpeg + QC).
  Shorts Editörü (ShortsEditor): Uzun videodan kendi başına anlaşılır Shorts'lar çıkarır.
  Yayıncı (Publisher)         : Takvime koyar ve YouTube'a yükler.

Claude API anahtarı varsa Senarist ve Kontrolcü Claude kullanır; yoksa yerel kurallarla çalışır.
Her emir `orders` tablosuna yazılır ve panelde "Ekip" bölümünde görünür.
"""
from __future__ import annotations

import json
import random
import traceback
from datetime import datetime

from loguru import logger

from . import db, ideas, llm, production, safety, scheduler, story as story_mod, trends
from .config import Paths, settings


class Agent:
    name = "Ajan"
    role = ""

    def order(self, issuer: str, task: str, payload: dict | None = None) -> int:
        oid = db.insert("orders", created_at=db.now(), issuer=issuer, agent=self.name, task=task, payload=payload or {}, status="open")
        logger.info(f"[{issuer} → {self.name}] {task}")
        return oid

    def close(self, oid: int, status: str, result) -> None:
        db.update("orders", oid, status=status, finished_at=db.now(),
                  result=json.dumps(result, ensure_ascii=False, default=str)[:6000])


class TrendScout(Agent):
    name = "Trend Avcısı"
    role = "Günün en yüksek potansiyelli çocuk/aile temasını bulur"

    def run(self, issuer: str) -> dict:
        oid = self.order(issuer, "Bugünün trend temalarını sırala")
        try:
            ins = ideas.research()  # genel araştırma (biçim/süre/başlık kalıpları)
        except Exception:
            ins = {"available": False}
        r = trends.radar(use_search=False)  # popüler listeler (1 birim) + mevsim; arama kotası research'te harcandı
        top = r["ranked"][:3]
        self.close(oid, "done", {"top": top, "data": r["data_note"], "research": ins.get("available")})
        return r


class Writer(Agent):
    name = "Senarist"
    role = "Temadan özgün taslaklar yazar"

    def drafts(self, issuer: str, theme: str, n: int = 3) -> list[dict]:
        oid = self.order(issuer, f"'{trends.THEMES[theme]['name']}' teması için {n} taslak yaz", {"theme": theme})
        out = []
        for _ in range(n):
            seed = random.randint(1, 10**9)
            if llm.available():
                idea = {"category": "animal_adventure", "title": trends.THEMES[theme]["title"],
                        "premise": trends.THEMES[theme]["goal"], "theme": theme, "seed": seed}
                out.append({"idea": idea, "preview": None})
            else:
                st = story_mod.normalize(story_mod.t_theme(random.Random(seed), theme))
                out.append({"idea": {"category": st["category"], "title": st["title"], "premise": st["summary"],
                                     "theme": theme, "seed": seed, "source": "local"}, "preview": st})
        self.close(oid, "done", [d["idea"]["title"] for d in out])
        return out


class Critic(Agent):
    name = "Viral Kontrolcü"
    role = "Viral potansiyeli puanlar (dahili tahmin, garanti değildir)"

    def review(self, issuer: str, drafts: list[dict]) -> dict | None:
        oid = self.order(issuer, f"{len(drafts)} taslağı puanla ve en iyisini seç")
        existing = [r["title"] for r in db.query("SELECT title FROM stories")]
        cfg = settings()["ideas"]
        scored = []
        for d in drafts:
            if d["preview"] is not None:
                sc = ideas.score_story(d["preview"], existing)
                scored.append({**d, "score": sc["total"], "detail": sc["detail"]})
            else:
                scored.append({**d, "score": cfg["min_score_to_produce"], "detail": {"not": "Claude taslağı yazımdan sonra puanlanır"}})
        scored.sort(key=lambda x: -x["score"])
        best = scored[0] if scored and scored[0]["score"] >= cfg["min_score_to_produce"] else None
        self.close(oid, "done" if best else "rejected",
                   {"scores": [(s["idea"]["title"], s["score"]) for s in scored], "chosen": best["idea"]["title"] if best else None})
        return best

    def check_video(self, issuer: str, result: dict) -> bool:
        oid = self.order(issuer, "Videonun ilk 3 saniyesini, başlığını ve kapağını kontrol et")
        tl = result["timeline"]
        first = tl["scenes"][0]["beats"][0]
        notes = []
        if first["start"] > 1.0:
            notes.append("ilk konuşma 1 saniyeden geç başlıyor")
        if not first["text"].rstrip().endswith(("?", "!")):
            notes.append("açılış cümlesi soru/ünlem değil (daha az merak uyandırır)")
        if len(result["meta"]["title"]) > 70:
            notes.append("başlık mobilde kesilebilir (70+ karakter)")
        ok = result["qc"]["passed"]
        self.close(oid, "done" if ok else "rejected", {"qc_passed": ok, "notes": notes, "thumbnail": result["thumbnail"]["best_concept"]})
        return ok


class Guard(Agent):
    name = "Telif ve Güvenlik"
    role = "Telif, marka taklidi, çocuk güvenliği ve lisans denetimi (veto yetkili)"

    def check_story(self, issuer: str, st: dict) -> bool:
        oid = self.order(issuer, f"Senaryoyu denetle: {st['title']}")
        chk = safety.check_story(st)
        self.close(oid, "approved" if chk["passed"] else "vetoed", chk)
        return chk["passed"]

    def check_assets(self, issuer: str, result: dict) -> bool:
        oid = self.order(issuer, "Video varlıklarının lisanslarını denetle")
        findings = {
            "karakterler": "Bulutkent özgün vektör rig'leri (kanala ait)",
            "arka plan ve nesneler": "Prosedürel özgün çizim (kanala ait)",
            "müzik ve efektler": "Kod ile sentezlenen özgün müzik (telifsiz)",
            "seslendirme": "Piper TTS (MIT lisansı) veya kanalın ElevenLabs hesabı",
            "yazı tipleri": "Baloo 2 ve Nunito (SIL Open Font License)",
            "dış medya": "Kullanılmadı",
        }
        external = list((Paths.images).glob("*")) if Paths.images.exists() else []
        external = [p for p in external if p.name != ".gitkeep"]
        unlicensed = [p.name for p in external if not db.one("SELECT id FROM licenses WHERE asset_path LIKE ?", (f"%{p.name}",))]
        ok = not unlicensed
        self.close(oid, "approved" if ok else "vetoed", {"findings": findings, "unlicensed": unlicensed})
        return ok


class Animator(Agent):
    name = "Animatör"
    role = "Uzun videoyu üretir"

    def produce(self, issuer: str, story_id: int) -> dict:
        oid = self.order(issuer, f"Hikâye #{story_id} için uzun videoyu üret")
        st = story_mod.load(story_id)
        res = production.produce_long(st)
        db.kv_set(f"long_result:{res['video_id']}", {k: res[k] for k in ("video_id", "path", "work", "seed", "fingerprint")} | {"story_id": story_id})
        self.close(oid, "done" if res["qc"]["passed"] else "qc_failed",
                   {"video_id": res["video_id"], "duration": res["qc"].get("duration"), "qc_failed": res["qc"].get("failed")})
        return res


class ShortsEditor(Agent):
    name = "Shorts Editörü"
    role = "Uzun videodan kendi başına anlaşılır Shorts çıkarır"

    def cut(self, issuer: str, st: dict, long_result: dict) -> list[dict]:
        oid = self.order(issuer, f"Video #{long_result['video_id']} için en iyi 2-3 Shorts'u çıkar")
        res = production.produce_shorts(st, long_result)
        self.close(oid, "done", [{"video_id": r["video_id"], "qc": r["qc"]["passed"], "score": r["candidate"]["score"],
                                  "title": r["meta"]["title"]} for r in res])
        return res


class Publisher(Agent):
    name = "Yayıncı"
    role = "Takvime koyar ve YouTube'a yükler"

    def publish(self, issuer: str) -> dict:
        oid = self.order(issuer, "Kalite onaylı videoları takvime koy ve yaklaşanları yükle")
        assigned = scheduler.fill(14)
        uploaded = scheduler.publish_due()
        self.close(oid, "done", {"scheduled": len(assigned), "uploaded": [u["youtube_id"] for u in uploaded]})
        return {"scheduled": assigned, "uploaded": uploaded}


class Director(Agent):
    name = "Yönetmen"
    role = "Günün planını yapar ve ekibe iş emri verir"

    def __init__(self):
        self.scout, self.writer, self.critic, self.guard = TrendScout(), Writer(), Critic(), Guard()
        self.animator, self.editor, self.publisher = Animator(), ShortsEditor(), Publisher()

    def run_day(self) -> dict:
        me = self.name
        log = {"started": db.now()}
        try:
            radar = self.scout.run(me)
            # Son 3 bölümde kullanılmamış en yüksek puanlı tema
            recent = [r["path"] for r in db.query("SELECT path FROM stories ORDER BY id DESC LIMIT 3")]
            theme = next((r["theme"] for r in radar["ranked"] if not any(r["theme"] in p for p in recent)), radar["ranked"][0]["theme"])
            log["theme"] = theme
            log["theme_score"] = next(r["score"] for r in radar["ranked"] if r["theme"] == theme)
            best = None
            for attempt in range(2):  # Kontrolcü reddederse bir tur daha taslak
                drafts = self.writer.drafts(me, theme, 3)
                best = self.critic.review(me, drafts)
                if best:
                    break
            if not best:
                log["result"] = "Viral Kontrolcü hiçbir taslağı onaylamadı; düşük kaliteli içerik üretilmedi."
                return log
            idea = best["idea"]
            idea["id"] = db.insert("ideas", created_at=db.now(), category=idea["category"], title=idea["title"], premise=idea["premise"],
                                   characters=[], score=best["score"], score_detail={"detail": best.get("detail"), "seed": idea["seed"], "theme": theme},
                                   status="pool", source="director", week=datetime.now().strftime("%G-W%V"))
            st = story_mod.write(idea)
            if not self.guard.check_story(me, st):
                log["result"] = "Telif ve Güvenlik senaryoyu veto etti."
                return log
            res = self.animator.produce(me, st["_meta"]["story_id"])
            if not self.guard.check_assets(me, res) or not self.critic.check_video(me, res):
                log["result"] = "Video kalite/telif denetiminden geçmedi; yayına alınmadı."
                log["video_id"] = res["video_id"]
                return log
            lr = {k: res[k] for k in ("video_id", "path", "work", "seed", "fingerprint", "timeline")} | {"story_id": st["_meta"]["story_id"]}
            shorts = self.editor.cut(me, st, lr)
            pub = self.publisher.publish(me)
            log.update(result="ok", video_id=res["video_id"], title=res["meta"]["title"], shorts=[s["video_id"] for s in shorts if s["qc"]["passed"]],
                       uploaded=[u["youtube_id"] for u in pub["uploaded"]])
            return log
        except Exception as exc:
            log["result"] = f"hata: {exc}"
            log["trace"] = traceback.format_exc()[-1500:]
            raise
        finally:
            log["finished"] = db.now()
            db.kv_set("director_last", log)


def team() -> list[dict]:
    return [{"name": c.name, "role": c.role} for c in (Director, TrendScout, Writer, Critic, Guard, Animator, ShortsEditor, Publisher)]
