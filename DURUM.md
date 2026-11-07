# Proje Durumu (devir notu)

Bu dosya, oturum veya konteyner sıfırlanırsa işin kaldığı yerden sürmesi içindir.
Video listesi ve YouTube kimlikleri: `state/videos.json`.

## Kanallar
| Kanal | Klasör | İçerik | Yayın planı (Europe/Istanbul) |
|---|---|---|---|
| Bulutkent | kök (`database/`, `renders/` …) | 2–8 yaş çocuk animasyonu (madeForKids) | Uzun: Salı/Perşembe/Pazar 18:00 · Shorts: her gün |
| Gece Kütüphanesi | `channels/gece/` (`--channel gece`) | Uykudan önce bilgi, NASA görselleri, sakin ses | Uzun: Pzt/Çrş/Cuma 21:30 · Shorts: her gün 20:30 |

## Çalıştırma
```bash
bash scripts/install.sh            # araçlar + modeller
python main.py --mode status
python main.py --mode full                     # Bulutkent günlük döngü
python main.py --mode full --channel gece      # Gece günlük döngü
python main.py --mode dashboard                # panel
```
Kalıcı sunucu için: `scripts/server_setup.sh` (Ubuntu 24.04, systemd).

## Gizli dosyalar (repoda YOK, herkese açık repo)
- `.env` → API anahtarları (YouTube API key; isteğe bağlı Pexels, ElevenLabs, Anthropic)
- `config/secrets/client_secret.json` → Google OAuth istemcisi (iki kanal ortak)
- `config/secrets/token.json` → Bulutkent yetkisi
- `channels/gece/secrets/token.json` → Gece yetkisi

Konteyner sıfırlanırsa bunlar gider: `client_secret.json` dosyasını tekrar yükleyin,
sonra her kanal için `python main.py --mode auth` (Gece için `--channel gece` ekleyin) ile yeniden yetki verin.

## Bekleyenler
- **Google API denetimi** gönderildi; onay gelene kadar yüklemeler *özel* kalır, kullanıcı Studio'da elle planlar.
  Onay gelince: `python main.py --mode enable-auto-publish` (her iki kanal için).
- Kota proje başına 10.000 birim/gün (Pasifik saatiyle sıfırlanır), iki kanal ortak kullanır.
- Gece: sıradaki senaryo `003-yildizlarin-dogumu-ve-uykusu`; `002-okyanus` Pexels anahtarı bekliyor.
- Bulutkent sesleri Google Chirp 3 HD kadın sesleri (Text-to-Speech API, aynı API anahtarı). Eski erkek sesli videolar `scripts/revoice.py` ile yeniden üretildi; eski yüklemeler yenisi yüklenince `--retire` ile siliniyor (gece görevi çalıştırır).
- Gece zamanlanmış görev: her gece 02:37 İstanbul, iki kanalın döngüsü + telefona özet bildirimi.

## Temizlik kuralı
`pipeline.cleanup()` yüklenen bölümlerin ara dosyalarını siler (yalnızca `timeline.json` kalır),
30 günden eski yüklenmiş final videoları siler. Modeller (`models/`) yeniden indirilebilir.

## Haftalık plan (studio/planner.py)
- `python scripts/weekly_plan.py 1` → `plans/<hafta>.md` (iki kanal birleşik); `0` = bu hafta.
- Üretim plana bağlı: önümüzdeki 9 gündeki uzun slotlar doluysa gece üretim yapılmaz.
- Tema puanı = trend radarı; en az 3 videoda izlenme verisi olunca %50 kanal performansı (günlük izlenme).
- Zamanlanmış görevler: 02:37 üretim + plan yenileme (Pazar gecesi gelecek haftanın planı kullanıcıya gider), 11:17 otomatik yükleme.
