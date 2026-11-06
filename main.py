#!/usr/bin/env python3
"""Bulutkent — Tam otomatik YouTube çocuk animasyon stüdyosu.

Kullanım:
  python main.py                      # = --mode full (araştır, yaz, üret, Shorts, yayınla, analiz)
  python main.py --mode research      # trend araştırması + fikir havuzu
  python main.py --mode story         # en iyi fikirden senaryo
  python main.py --mode video         # uzun video üret
  python main.py --mode shorts        # son uzun videodan Shorts
  python main.py --mode publish       # takvimi doldur ve yaklaşan videoları yükle
  python main.py --mode analytics     # analitik + haftalık rapor + takvim optimizasyonu
  python main.py --mode full
  python main.py --mode brand         # kanal markasını (yeniden) oluştur
  python main.py --mode auth [--code URL]   # Google OAuth bağlantısı
  python main.py --mode channel-setup # API'nin izin verdiği kanal ayarlarını uygula (açıklama, banner)
  python main.py --mode status        # sistem ve bağlantı durumu
  python main.py --mode dashboard     # web yönetim paneli
  python main.py --mode daemon        # n8n yoksa dahili zamanlayıcı
  python main.py --mode enable-auto-publish / disable-auto-publish
"""
from __future__ import annotations

import argparse
import json
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description="Bulutkent otomatik çocuk animasyon stüdyosu")
    ap.add_argument("--mode", default="full", choices=[
        "research", "story", "video", "shorts", "publish", "analytics", "full", "brand", "auth", "channel-setup",
        "status", "dashboard", "daemon", "set-key", "set-client", "test-upload", "enable-auto-publish", "disable-auto-publish", "schedule"])
    ap.add_argument("--code", help="OAuth yönlendirme adresi veya yetki kodu")
    ap.add_argument("--story-id", type=int)
    ap.add_argument("--video-id", type=int)
    ap.add_argument("--port", type=int)
    args = ap.parse_args()

    from studio import pipeline
    pipeline.setup()
    from studio import brand, db, scheduler, youtube

    def out(obj):
        print(json.dumps(obj, ensure_ascii=False, indent=2, default=str))

    m = args.mode
    if m == "research":
        out(pipeline._run("research", pipeline.research))
    elif m == "story":
        out(pipeline._run("story", pipeline.story))
    elif m == "video":
        out(pipeline._run("video", pipeline.video, args.story_id))
    elif m == "shorts":
        out(pipeline._run("shorts", pipeline.shorts, args.video_id))
    elif m == "publish":
        out(pipeline._run("publish", pipeline.publish))
    elif m == "test-upload":
        out(pipeline._run("publish", pipeline.publish, True))
    elif m == "analytics":
        out(pipeline._run("analytics", pipeline.do_analytics))
    elif m == "full":
        out(pipeline.full())
    elif m == "brand":
        kit = brand.run()
        out({"name": kit["name"], "slogan": kit["slogan"], "assets": kit["assets"], "candidates": [(c["name"], c["total"]) for c in kit["name_research"]["candidates"]]})
    elif m == "auth":
        if args.code:
            out(youtube.finish_auth(args.code))
        else:
            print("Aşağıdaki bağlantıyı tarayıcıda açıp kanalınızın Google hesabıyla onaylayın.")
            print("Onaydan sonra tarayıcı 'localhost' adresine gidip hata verecek; adres çubuğundaki TAM adresi kopyalayıp:")
            print('  python main.py --mode auth --code "<adres>"\n')
            print(youtube.auth_url())
    elif m == "channel-setup":
        kit = brand.load()
        res = {"channel": youtube.channel_info()}
        if res["channel"].get("exists"):
            from studio.config import Paths
            for name, fn in (("branding", lambda: youtube.update_branding(kit)),
                             ("banner", lambda: youtube.upload_banner(Paths.root / kit["assets"]["banner"]))):
                try:
                    fn(); res[name] = "uygulandı"
                except Exception as exc:
                    res[name] = f"başarısız: {exc}"
            for p in kit.get("playlists", []):
                try:
                    youtube.ensure_playlist(p["title"]); res.setdefault("playlists", []).append(p["title"])
                except Exception as exc:
                    res.setdefault("playlist_errors", []).append(str(exc))
        res["manual_steps"] = [c for c in youtube.capabilities() if not c["api"]]
        out(res)
    elif m == "set-client":
        import json as _j, os as _os
        from studio.config import Paths
        print("Google'dan indirdiğiniz client_secret JSON içeriğini yapıştırın, sonra boş satırda Enter'a basın:")
        lines = []
        while True:
            ln = input()
            if not ln.strip() and lines:
                break
            lines.append(ln)
        data = _j.loads("\n".join(lines))
        if "installed" not in data and "web" not in data:
            print("Bu bir OAuth istemci dosyası değil."); return 1
        Paths.secrets.mkdir(parents=True, exist_ok=True)
        f = Paths.secrets / "client_secret.json"
        f.write_text(_j.dumps(data)); _os.chmod(f, 0o600)
        print("Kaydedildi. Şimdi: python main.py --mode auth")
    elif m == "set-key":
        import getpass
        from dashboard.app import _test_youtube, _write_env
        key = getpass.getpass("YouTube Data API anahtarını yapıştırın (ekranda görünmez) ve Enter'a basın: ").strip()
        res = _test_youtube(key)
        if res["ok"]:
            _write_env({"YOUTUBE_API_KEY": key})
        print(res["message"] + (" — .env dosyasına kaydedildi." if res["ok"] else " — kaydedilmedi."))
    elif m == "status":
        out(pipeline.status())
    elif m == "schedule":
        scheduler.fill(14)
        out(scheduler.calendar(14))
    elif m == "dashboard":
        from dashboard.app import serve
        serve(args.port)
    elif m == "daemon":
        pipeline.daemon()
    elif m == "enable-auto-publish":
        if not youtube.connected():
            print("Önce YouTube bağlantısı kurulmalı (--mode auth) ve gizli test yüklemesi doğrulanmalı.")
            return 1
        if not db.one("SELECT id FROM uploads WHERE status='uploaded'"):
            print("Önce en az bir gizli test yüklemesi başarıyla tamamlanmalı (--mode test-upload).")
            return 1
        db.kv_set("auto_publish", True)
        print("Otomatik planlı yayın etkin. Videolar takvim saatinde herkese açık olacak (publishAt).")
    elif m == "disable-auto-publish":
        db.kv_set("auto_publish", False)
        print("Otomatik yayın kapatıldı; yüklemeler ÖZEL yapılacak.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
