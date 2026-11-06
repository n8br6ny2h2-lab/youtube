# Bulutkent: Otomatik Çocuk Animasyon Stüdyosu

2-8 yaş için Türkçe, özgün çizgi film üreten ve YouTube'a yükleyen otomatik sistem.
Tek komutla çalışır: `python main.py`

Akış: **araştır → fikir üret ve puanla → senaryo yaz → seslendir → canlandır (HyperFrames) → montaj (FFmpeg) →
Whisper altyazı → kalite kontrol → kapak → Shorts → takvime koy → YouTube'a yükle → analiz et → öğren**

## Kanal markası (üretildi)

| | |
|---|---|
| Kanal adı | **Bulutkent** (12 aday puanlandı, bkz. `brand/brand.json`) |
| Slogan | Merakla öğren, neşeyle büyü! |
| Maskot / anlatıcı | Bulut (konuşan bulut) |
| Karakterler | Pofi (tilki), Lili (tavşan), Tombi (kaplumbağa), Bobo (fil). Bkz. `characters/bible.json` |
| Renkler | `#4FC3F7` gök · `#FFD54F` güneş · `#FF7A59` mercan · `#66BB6A` yaprak · `#B39DDB` lavanta · `#2B2D42` mürekkep |
| Yazı tipleri | Baloo 2 + Nunito (SIL OFL, `templates/fonts/`) |
| Dosyalar | `logos/logo.png`, `logos/watermark.png`, `brand/profile_800.png`, `banners/banner_2560x1440.png` (güvenli alan 1546x423), `characters/*_sheet.png` |

## Kurulum

```bash
./scripts/install.sh          # eksikleri kurar (kurulu olanları atlar), modelleri indirir
cp .env.example .env          # anahtarları girin (hepsi isteğe bağlı)
python main.py --mode status
```

Docker ile: `docker compose up -d` (panel `http://localhost:8080`, n8n `http://localhost:5678`), ardından `./scripts/n8n_import.sh`.

### API anahtarları (`.env`)

| Değişken | Gerekli mi | Yoksa ne olur |
|---|---|---|
| `ANTHROPIC_API_KEY` | Önerilir | Yerel şablon hikâye motoru kullanılır (11 kategori, parametrik, tekrar etmez) |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_DEFAULT` | İsteğe bağlı | Piper Türkçe ses (yerel, ücretsiz), karakter başına ton/hız |
| `YOUTUBE_API_KEY` | İsteğe bağlı | Araştırma OAuth bağlantısıyla yapılır; ikisi de yoksa araştırma "veri yok" der |
| `PEXELS/PIXABAY/UNSPLASH` | İsteğe bağlı | Gerekmez; tüm görseller özgün vektör çizimdir |
| `DASHBOARD_TOKEN` | Önerilir | Panel ve n8n tetikleyicileri için ortak gizli anahtar |

### Google / YouTube bağlantısı (bir kez)

1. [Google Cloud Console](https://console.cloud.google.com/) → yeni proje.
2. **APIs & Services → Library**: *YouTube Data API v3* ve *YouTube Analytics API*'yi etkinleştirin.
3. **OAuth consent screen**: External, uygulama adı "Bulutkent Studio", kendi e-postanızı **Test users**'a ekleyin.
4. **Credentials → Create credentials → OAuth client ID → Desktop app** → JSON'u indirin →
   `config/secrets/client_secret.json` olarak kaydedin (git'e girmez).
5. `python main.py --mode auth` → çıkan bağlantıyı açın, kanalın Google hesabıyla onaylayın.
   Tarayıcı açılmayan bir `localhost` sayfasına gider; adres çubuğundaki **tam adresi** kopyalayın:
   `python main.py --mode auth --code "http://localhost:8765/?state=...&code=..."`
6. `python main.py --mode channel-setup`: API'nin izin verdiği kanal ayarlarını uygular (açıklama, anahtar kelimeler, banner, oynatma listeleri) ve API'nin yapamadıklarını listeler.
7. `python main.py --mode test-upload`: hazır videoları **özel** olarak yükler. Doğruladıktan sonra
   `python main.py --mode enable-auto-publish` ile planlı herkese açık yayını açın.

> **Önemli:** Google, denetimden geçmemiş API projelerinden yüklenen videoları **özel** olarak kilitler.
> Herkese açık/planlı yayın için Google Cloud'da *YouTube API Services Audit* başvurusu gerekir.
> Varsayılan kota günde 10.000 birimdir (bir yükleme yaklaşık 1.600 birim → günde ~5 yükleme).

### YouTube API'nin yapamadıkları (elle, bir kez)

- Kanal oluşturma, kanal adı ve @tanıtıcı → YouTube Studio > Özelleştirme > Temel bilgiler
- Profil fotoğrafı → `brand/profile_800.png` dosyasını Studio > Özelleştirme > Marka bölümünden yükleyin
- Ana sayfa rafları ve kanal fragmanı → Studio > Özelleştirme > Düzen (önerilen düzen `brand/brand.json` → `homepage_layout`)
- Özel kapak yükleyebilmek için kanalın telefonla doğrulanmış olması gerekir

## Komutlar

```bash
python main.py                    # FULL: research → story → video → shorts → publish → analytics
python main.py --mode research    # YouTube trend analizi + günlük fikir havuzu
python main.py --mode story       # en yüksek puanlı fikirden senaryo
python main.py --mode video       # uzun video (1920x1080, ≥60 sn)
python main.py --mode shorts      # son uzun videodan 2-3 Shorts (1080x1920, 15-60 sn)
python main.py --mode publish     # takvimi doldur + yaklaşan videoları yükle
python main.py --mode analytics   # analitik, öğrenimler, haftalık rapor, saat optimizasyonu
python main.py --mode schedule    # 14 günlük takvim
python main.py --mode dashboard   # web paneli (http://127.0.0.1:8080)
python main.py --mode daemon      # n8n yoksa dahili zamanlayıcı
python main.py --mode brand       # markayı yeniden üret
```

## Otomasyon (n8n)

`n8n/` klasöründeki iş akışları (Europe/Istanbul):

| İş akışı | Zaman | Görev |
|---|---|---|
| Günlük araştırma | her gün 09:10 | `research` |
| Haftalık üretim | Pzt/Çar/Cum/Cmt 02:30 | `full` (4 döngü → 3 uzun video + 7+ Shorts tamponu) |
| Yayın kuyruğu | her saat :05 | `publish` |
| Analitik | her gün 06:20 | `analytics` |

n8n, paneldeki `POST /api/run/{mode}` uç noktasını `X-Token: $DASHBOARD_TOKEN` başlığıyla çağırır.

## Yayın takvimi

Uzun: Salı/Perşembe/Pazar 18:00 · Shorts: Pzt 19, Sal 12, Çar 19, Per 12, Cum 19, Cmt 12, Paz 19.
İlk 30 gün sabit; sonra en az 12 videonun 7 günlük verisi varsa saatler otomatik optimize edilir.
Kalite kontrolünden geçmeyen video takvime girmez; içerik yoksa slot boş kalır.

## Kalite ve güvenlik

- **QC** (`studio/qc.py`): çözünürlük, codec, süre, ses yüksekliği (-17 ile -11 LUFS arası), kırpılma, uzun sessizlik, siyah kare, donma ve Whisper anlaşılırlığı (≥%75).
- **Çocuk güvenliği** (`studio/safety.py`): tehlikeli davranış/korku/şiddet ifadeleri, başka markaların karakter adları ve yanıltıcı başlık kalıpları engellenir. Videolar `selfDeclaredMadeForKids=true` yüklenir (YouTube bu videolarda yorumları ve kişiselleştirilmiş reklamları kapatır).
- **Yapay zekâ açıklaması**: Açıklamaya yazılır. `containsSyntheticMedia` varsayılan `false`, çünkü içerik açıkça çizgi film ve gerçekçi değil (`config/settings.json`).
- **Telif**: Karakterler, arka planlar, müzik ve efektler özgün üretimdir. Lisans kayıtları `licenses` tablosundadır.
- **Bütçe**: Günlük 3 USD / aylık 40 USD (`config/settings.json`). Aşılırsa ücretli çağrılar durur ve yerel motora düşülür. Ücretli abonelik satın alınmaz.
- **Puanlar**: Fikir ve kapak puanları dahili tahmindir, izlenme garantisi değildir. Para kazanma uygunluğu garanti edilmez.

## Mimari

```
main.py                 tek giriş noktası
studio/
  brand.py              isim seçimi, logo, profil, banner, karakter kartları
  characters.py         karakter kitabı + SVG rig'ler (11 ifade, 19 hareket)
  world.py              8 arka plan + 22 nesne
  story.py              Claude senaryo motoru (JSON şema) + yerel şablon motoru
  ideas.py              YouTube araştırması, fikir üretimi, 100 puanlık değerlendirme
  tts.py                Piper / ElevenLabs, karakter başına ses
  audio.py              özgün müzik ve efekt sentezi, ducking, EBU R128
  subtitles.py          faster-whisper kelime zamanları, hizalama, SRT
  composer.py           zaman çizelgesi → HyperFrames HTML (GSAP) → render → FFmpeg
  thumbnails.py         3 kapak konsepti + ölçülebilir seçim
  qc.py                 kalite kontrol
  production.py         uzun video + Shorts üretim hattı
  scheduler.py          takvim, yükleme kuyruğu, saat optimizasyonu
  youtube.py            OAuth, yükleme, kapak, oynatma listesi, marka, analitik sorgu
  analytics.py          performans, öğrenimler, haftalık rapor
  pipeline.py           mod orkestrasyonu, dahili zamanlayıcı
templates/runtime.js    deterministik animasyon çalışma zamanı (dudak senkronu, göz kırpma, duygular)
dashboard/              FastAPI yönetim paneli
n8n/                    iş akışları
```

Çıktılar: `renders/` (uzun), `shorts/`, `thumbnails/`, `subtitles/`, `stories/`, `scenes/` (ara dosyalar), `database/studio.db`, `logs/`.

## Bilinçli olarak eklenmeyenler

- **Remotion**: HyperFrames ile aynı işi yapar (HTML/React → video); ikisini birden tutmak gereksiz.
- **MoviePy**: Montaj doğrudan FFmpeg ile yapılıyor.
- **openai-whisper**: faster-whisper aynı modeli CPU'da daha hızlı çalıştırır. İlk kurulumda yüklenmişti; isteğe bağlı olarak durabilir.
- **Görsel/video üretim API'leri**: Karakter tutarlılığı için tüm görseller deterministik vektör rig'lerden üretiliyor. Harici görsel API'si karakterleri her seferinde farklı çizerdi.
