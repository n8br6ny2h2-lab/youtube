"""YouTube Data API v3 + YouTube Analytics API + Google OAuth 2.0.

Kimlik doğrulama başsız (sunucu/bulut) ortamda da çalışır:
  1) python main.py --mode auth          -> yetkilendirme bağlantısı üretir
  2) Tarayıcıda onaylayın; açılmayan localhost sayfasının adresini kopyalayın
  3) python main.py --mode auth --code "<kopyalanan adres>"
Token config/secrets/token.json içinde (izin 600) saklanır ve otomatik yenilenir.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from loguru import logger

from . import costs, db
from .config import Paths, env, has_key, settings

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]
REDIRECT = "http://localhost:8765/"

# Kota maliyetleri (birim) — Google belgelerindeki değerler; değişirse buradan güncelleyin
QUOTA = {"videos.insert": settings()["publishing"].get("upload_quota_units", 1600), "thumbnails.set": 50, "playlists.insert": 50,
         "playlistItems.insert": 50, "captions.insert": 400, "search.list": 100, "videos.list": 1, "channels.list": 1,
         "channels.update": 50, "channelBanners.insert": 50, "playlists.list": 1}

CAPABILITIES = [
    # (işlem, API ile mümkün mü, açıklama)
    ("Kanal oluşturma", False, "API ile yapılamaz. YouTube uygulaması/Studio'dan Google hesabıyla kanal oluşturulur."),
    ("Kanal adını değiştirme", False, "API desteklemez (brandingSettings.channel.title salt okunur kabul edilir). Studio > Özelleştirme > Temel bilgiler."),
    ("Kanal tanıtıcısı (@handle)", False, "API desteklemez. Studio > Özelleştirme > Temel bilgiler."),
    ("Profil fotoğrafı", False, "API desteklemez. Studio > Özelleştirme > Marka > Resim (brand/profile_800.png)."),
    ("Kanal açıklaması ve anahtar kelimeler", True, "channels.update (brandingSettings.channel.description/keywords)."),
    ("Banner görseli", True, "channelBanners.insert + channels.update (brandingSettings.image.bannerExternalUrl)."),
    ("Video filigranı", True, "watermarks.set (isteğe bağlı)."),
    ("Ana sayfa bölümleri (raflar)", False, "channelSections yazma işlemleri artık desteklenmiyor; Studio > Özelleştirme > Düzen."),
    ("Kanal fragmanı / öne çıkan video", False, "Studio > Özelleştirme > Düzen (API ile güvenilir şekilde yapılamaz)."),
    ("Video yükleme", True, "videos.insert (doğrulanmamış API projelerinde videolar ÖZEL kalır; denetim gerekir)."),
    ("Planlı yayın", True, "status.privacyStatus=private + status.publishAt."),
    ("Çocuklara özel ayarı", True, "status.selfDeclaredMadeForKids=true."),
    ("Özel kapak (thumbnail)", True, "thumbnails.set — kanalın telefonla doğrulanmış olması gerekir."),
    ("Oynatma listeleri", True, "playlists.insert, playlistItems.insert."),
    ("Altyazı yükleme", True, "captions.insert (400 birim)."),
    ("Analitik", True, "YouTube Analytics API v2 reports.query (gösterim/TO API'de yok)."),
]


def _secret_file() -> Path:
    return Paths.root / env("GOOGLE_CLIENT_SECRET_FILE", "config/secrets/client_secret.json")


def _token_file() -> Path:
    return Paths.root / env("GOOGLE_TOKEN_FILE", "config/secrets/token.json")


def _pending_file() -> Path:
    return Paths.secrets / "oauth_pending.json"


def _protect(p: Path) -> None:
    try:
        os.chmod(p, 0o600)
    except OSError:
        pass


def auth_url() -> str:
    from google_auth_oauthlib.flow import Flow
    if not _secret_file().exists():
        raise FileNotFoundError(f"OAuth istemci dosyası yok: {_secret_file()}")
    flow = Flow.from_client_secrets_file(str(_secret_file()), scopes=SCOPES, redirect_uri=REDIRECT)
    url, state = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    Paths.secrets.mkdir(parents=True, exist_ok=True)
    _pending_file().write_text(json.dumps({"state": state, "code_verifier": getattr(flow, "code_verifier", None)}))
    _protect(_pending_file())
    return url


def finish_auth(redirect_url_or_code: str) -> dict:
    from google_auth_oauthlib.flow import Flow
    pending = json.loads(_pending_file().read_text()) if _pending_file().exists() else {}
    flow = Flow.from_client_secrets_file(str(_secret_file()), scopes=SCOPES, redirect_uri=REDIRECT, state=pending.get("state"))
    if pending.get("code_verifier"):
        flow.code_verifier = pending["code_verifier"]
    os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")  # yalnızca localhost yönlendirmesi için
    if redirect_url_or_code.startswith("http"):
        flow.fetch_token(authorization_response=redirect_url_or_code)
    else:
        flow.fetch_token(code=redirect_url_or_code)
    _token_file().write_text(flow.credentials.to_json())
    _protect(_token_file())
    _pending_file().unlink(missing_ok=True)
    return channel_info()


def credentials():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    tf = _token_file()
    if not tf.exists():
        return None
    creds = Credentials.from_authorized_user_file(str(tf), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        tf.write_text(creds.to_json())
        _protect(tf)
    return creds if creds and creds.valid else None


def connected() -> bool:
    try:
        return credentials() is not None
    except Exception:
        return False


def _svc(name: str = "youtube", version: str = "v3", allow_key: bool = False):
    from googleapiclient.discovery import build
    creds = credentials()
    if creds:
        return build(name, version, credentials=creds, cache_discovery=False)
    if allow_key and has_key("YOUTUBE_API_KEY"):
        return build(name, version, developerKey=env("YOUTUBE_API_KEY"), cache_discovery=False)
    if allow_key and env("YOUTUBE_API_KEY_VIA_PROXY") == "1":
        # Bulut oturumu: anahtar ağ vekili tarafından x-goog-api-key başlığıyla eklenir; kodda/diskte anahtar yok
        from google.auth.credentials import AnonymousCredentials
        return build(name, version, credentials=AnonymousCredentials(), cache_discovery=False)
    raise PermissionError("YouTube bağlantısı yok (python main.py --mode auth)")


def _quota(op: str, n: int = 1) -> None:
    units = QUOTA.get(op, 1) * n
    used = costs.youtube_quota_used_today()
    if used + units > settings()["publishing"]["daily_quota_units"]:
        raise RuntimeError(f"Günlük YouTube kotası dolacaktı ({used:.0f}+{units})")
    costs.record("youtube", op, units, 0.0)


def channel_info() -> dict:
    _quota("channels.list")
    r = _svc().channels().list(part="snippet,statistics,brandingSettings,status,contentDetails", mine=True).execute()
    items = r.get("items", [])
    if not items:
        return {"exists": False, "note": "Bu Google hesabında YouTube kanalı yok. Kanal API ile oluşturulamaz; "
                                         "youtube.com > Kanal oluştur adımıyla açın ve tekrar bağlanın."}
    ch = items[0]
    info = {"exists": True, "id": ch["id"], "title": ch["snippet"]["title"], "custom_url": ch["snippet"].get("customUrl"),
            "subscribers": int(ch["statistics"].get("subscriberCount", 0)), "views": int(ch["statistics"].get("viewCount", 0)),
            "videos": int(ch["statistics"].get("videoCount", 0)), "made_for_kids": ch.get("status", {}).get("madeForKids"),
            "long_uploads": ch.get("status", {}).get("longUploadsStatus"),
            "uploads_playlist": ch["contentDetails"]["relatedPlaylists"]["uploads"]}
    db.kv_set("channel", info)
    return info


def upload(path: Path, meta: dict, privacy: str = "private", publish_at: str | None = None, retries: int = 5) -> dict:
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaFileUpload
    _quota("videos.insert")
    status = {"privacyStatus": privacy, "selfDeclaredMadeForKids": bool(meta.get("made_for_kids", True)),
              "embeddable": True, "license": "youtube",
              "containsSyntheticMedia": bool(settings()["publishing"].get("contains_synthetic_media", False))}
    if publish_at:
        status["privacyStatus"] = "private"
        status["publishAt"] = publish_at
    body = {"snippet": {"title": meta["title"], "description": meta["description"], "tags": meta.get("tags", []),
                        "categoryId": meta.get("category_id", "1"), "defaultLanguage": "tr", "defaultAudioLanguage": "tr"},
            "status": status}
    media = MediaFileUpload(str(path), chunksize=8 * 1024 * 1024, resumable=True, mimetype="video/mp4")
    req = _svc().videos().insert(part="snippet,status", body=body, media_body=media, notifySubscribers=privacy == "public")
    resp, attempt = None, 0
    while resp is None:
        try:
            _, resp = req.next_chunk()
        except HttpError as e:
            if e.resp.status in (500, 502, 503, 504) and attempt < retries:
                attempt += 1
                time.sleep(2 ** attempt)
                continue
            raise
        except (ConnectionError, TimeoutError):
            if attempt < retries:
                attempt += 1
                time.sleep(2 ** attempt)
                continue
            raise
    return resp


def set_thumbnail(video_id: str, path: Path) -> dict:
    from googleapiclient.http import MediaFileUpload
    _quota("thumbnails.set")
    mime = "image/png" if path.suffix == ".png" else "image/jpeg"
    return _svc().thumbnails().set(videoId=video_id, media_body=MediaFileUpload(str(path), mimetype=mime)).execute()


def ensure_playlist(title: str, description: str = "") -> str:
    cache = db.kv_get("playlists", {})
    if title in cache:
        return cache[title]
    _quota("playlists.list")
    r = _svc().playlists().list(part="snippet", mine=True, maxResults=50).execute()
    for p in r.get("items", []):
        if p["snippet"]["title"] == title:
            cache[title] = p["id"]; db.kv_set("playlists", cache)
            return p["id"]
    _quota("playlists.insert")
    p = _svc().playlists().insert(part="snippet,status", body={
        "snippet": {"title": title, "description": description, "defaultLanguage": "tr"},
        "status": {"privacyStatus": "public"}}).execute()
    cache[title] = p["id"]; db.kv_set("playlists", cache)
    return p["id"]


def add_to_playlist(playlist_id: str, video_id: str) -> None:
    _quota("playlistItems.insert")
    _svc().playlistItems().insert(part="snippet", body={"snippet": {"playlistId": playlist_id,
                                                                   "resourceId": {"kind": "youtube#video", "videoId": video_id}}}).execute()


def upload_caption(video_id: str, srt: Path) -> None:
    from googleapiclient.http import MediaFileUpload
    _quota("captions.insert")
    _svc().captions().insert(part="snippet", body={"snippet": {"videoId": video_id, "language": "tr", "name": "Türkçe", "isDraft": False}},
                             media_body=MediaFileUpload(str(srt), mimetype="application/octet-stream")).execute()


def video_status(ids: list[str]) -> list[dict]:
    if not ids:
        return []
    _quota("videos.list")
    r = _svc().videos().list(part="status,processingDetails,statistics,snippet", id=",".join(ids[:50])).execute()
    return r.get("items", [])


def update_branding(kit: dict) -> dict:
    """Açıklama ve anahtar kelimeleri günceller (API'nin izin verdiği alanlar)."""
    info = db.kv_get("channel") or channel_info()
    _quota("channels.update")
    kw = " ".join(f'"{k}"' if " " in k else k for k in kit.get("keywords", []))
    body = {"id": info["id"], "brandingSettings": {"channel": {
        "description": kit["description"][:1000], "keywords": kw[:500], "defaultLanguage": "tr", "country": "TR"}}}
    return _svc().channels().update(part="brandingSettings", body=body).execute()


def upload_banner(path: Path) -> dict:
    from googleapiclient.http import MediaFileUpload
    info = db.kv_get("channel") or channel_info()
    _quota("channelBanners.insert")
    r = _svc().channelBanners().insert(media_body=MediaFileUpload(str(path), mimetype="image/png")).execute()
    _quota("channels.update")
    cur = _svc().channels().list(part="brandingSettings", id=info["id"]).execute()["items"][0]["brandingSettings"]
    cur.setdefault("image", {})["bannerExternalUrl"] = r["url"]
    return _svc().channels().update(part="brandingSettings", body={"id": info["id"], "brandingSettings": cur}).execute()


def search_videos(query: str, max_results: int = 25, region: str = "TR", lang: str = "tr") -> list[dict]:
    svc = _svc(allow_key=True)
    _quota("search.list")
    r = svc.search().list(part="snippet", q=query, type="video", maxResults=max_results, regionCode=region,
                          relevanceLanguage=lang, safeSearch="strict", order="viewCount",
                          publishedAfter=time.strftime("%Y-%m-%dT00:00:00Z", time.gmtime(time.time() - 90 * 86400))).execute()
    ids = [i["id"]["videoId"] for i in r.get("items", [])]
    if not ids:
        return []
    _quota("videos.list")
    v = svc.videos().list(part="snippet,statistics,contentDetails,status", id=",".join(ids)).execute()
    return v.get("items", [])


def analytics_query(start: str, end: str, metrics: str, dimensions: str = "", filters: str = "", sort: str = "",
                    max_results: int | None = None) -> dict:
    svc = _svc("youtubeAnalytics", "v2")
    params = dict(ids="channel==MINE", startDate=start, endDate=end, metrics=metrics)
    if dimensions:
        params["dimensions"] = dimensions
    if filters:
        params["filters"] = filters
    if sort:
        params["sort"] = sort
    if max_results:
        params["maxResults"] = max_results
    return svc.reports().query(**params).execute()


def capabilities() -> list[dict]:
    return [{"operation": o, "api": a, "note": n} for o, a, n in CAPABILITIES]
