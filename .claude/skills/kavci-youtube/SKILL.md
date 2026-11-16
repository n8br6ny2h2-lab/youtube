---
name: kavci-youtube
description: Kerem'in (Kavci Games) YouTube kanalları için video üretimi. Kavci Lab (İngilizce bilim, çocuklara özel değil) için Shorts ve uzun videolar, Moonshelf TV (İngilizce çocuk kanalı, uyku öncesi hikâyeler) ve Earthframe TV (rahatlatıcı doğa videoları) için hikâye videoları; senaryo, ElevenLabs seslendirme, Pixabay görüntü, kurgu, kalite kontrol, kapak, açıklama, altyazı ve yükleme paketi. "Short yap", "uzun video", "Moonshelf hikâyesi", "kapak", "açıklama", "yükleme paketi" gibi isteklerde kullan.
---

# Kavci YouTube üretim skill'i

Önce `DURUM.md` ve `PLAN.md` dosyalarını oku. Takvim, kararlar ve açık işler oradadır.

## Kerem ile çalışma
- Kerem yalnız iPhone kullanır ve Türkçe konuşur. Ona hep **Türkçe, kısa ve adım adım** yaz. Takılırsa ekran görüntüsü iste.
- Dosyaları `SendUserFile` ile gönder. Videoyu `teslim/` klasörüne kopyala (git'e girmez). Gönderme sınırı **400 MB**; iPhone'da kayıt için **~200 MB altı** daha güvenli (4.5 Mbps ile yeniden kodla).
- Video hazır olunca `PushNotification` ile kısa bildirim gönder.
- Başlık, açıklama ve etiketleri kopyalanabilir kod blokları içinde ver.

## Kesin kurallar
- **YouTube'a ve TikTok'a yüklemeyi Kerem elle yapar.** API ile yükleme yapma.
- GitHub Actions ekleme ya da çalıştırma, zamanlanmış iş kurma. Kısa aralıklarla çok push yapma, işleri birleştirip tek push yap. Yeni GitHub hesabı önerme.
- Şifre, anahtar ya da token isteme. Gizli bilgiler yalnız güvenli formla girilir (`request_credential`).
- Commit mesajlarına model adı yazma. Oyunlara (GitLab) dokunma.
- Telif: yalnız ticari kullanıma izin veren görüntü (Pixabay, NASA, ESA/ESO, Mixkit). Başkasının hikâyesini ya da videosunu çevirme. Müzik ve efektler kendi ürettiğimiz (`tools/`).
- **Yapay zekâ üretimi görünen stok klipleri kullanma** (Pixabay'de "ai generated" etiketi, TonyDias7, Solarselle77 gibi yazarlar). Gerçek çekim tercih edilir.
- Bilgiler NASA, NOAA, Smithsonian, üniversite gibi kaynaklardan doğrulanır, açıklamaya yazılır.

## Kalite kuralları
- En az Full HD (Shorts 1080x1920, uzun 1920x1080), 30 fps. `python3 tools/kalite_kontrol.py dosya.mp4` geçmeli (1080p için ≥ 4 Mbps).
- Ses: Kavci Lab **-14 LUFS**, Moonshelf **-16 LUFS** (uyku videolarında -18'e kadar inilebilir) (iki geçişli loudnorm, ortak kodda var).
- **Her videonun kapağı ve açılışı farklı** olur (farklı renk ve sahne). Kapak yazısı **ilk karede** hazırdır.
- 1080p kaynak büyütülmez: dikey videoda 1080x1080 kare + bulanık arka plan (`sq_frames` + `layout`).
- Render öncesi `PREVIEW="t1,t2,..."` ile kareleri kontrol et; yazı çakışmalarına (filigran, altyazı, başlık) bak.

## Kanallar
### Kavci Lab (@KavciLab)
- İngilizce bilim ve teknoloji. Kitle: çocuklara özel **değil**. Marka: `brand/`. Anlatıcı: ElevenLabs **George** (`config/ses.json`).
- Takvim: her gün Short 18:00 (TR), haftada 1 uzun video. Kerem uzay dışı, gerçek görüntülü konuları da seviyor.
- TikTok açıklaması da yaz; "AI-generated content" etiketini açmasını hatırlat.

### Moonshelf TV (@MoonshelfTV)
- İngilizce, 6-10 yaş, **çocuklara özel**. Sakin, özgün uyku öncesi hikâyeler + doğru doğa bilgileri. Marka: `brand/moonshelf/` (Fredoka yazı tipi, `logo.py`).
- Anlatıcı: ElevenLabs **Lily** (`pFZP5JQG7iQjIQuC4Bku`), stability 0.65, style 0.15, speed 0.88. Müzik: `tools/muzik_ninni.py`.
- Yayın: Türkiye saatiyle **01:00** (ABD akşamı). Haftada 1 hikâye.

### Earthframe TV (@EarthframeTV)
- İngilizce, **5-10 dakikalık rahatlatıcı doğa ve hayvan videoları** (belgesel havası), **çocuklara özel değil**. Haftada 1 uzun video + 2-3 Short (uzun videonun sesinden kesilir).
- Anlatıcı: Lily. Marka: `brand/earthframe/` (Inter Display). **Her videoda `docs/TELIF.md` kontrolü ve `kaynaklar.json` zorunlu.**
- ElevenLabs bütçesi (aylık, tüm kanallar): ~70.000 / 131.000 karakter.

## Araçlar
- `tools/shorts_ortak.py`: Shorts için her şey: `tts()` (ElevenLabs + kelime zamanları), `load_words()` (kelime kelime altyazı), `clip_frames()` (4K'dan dikey kesit), `sq_frames()`/`layout()` (1080p kare yerleşim), `disk_frames()`, `black_hole()`, `place_figure()`, `text_c()`, `scene_end()`, `render()` (önizleme, kodlama, ses karışımı, -14 LUFS; `sfx=` ile efekt). Filigran konumu: `CFG['wm_pos']`.
- `tools/muzik_ambient.py çıkış.wav saniye tohum`: Kavci Lab arka plan müziği. Her video için farklı tohum kullan.
- `tools/muzik_ninni.py çıkış.wav saniye tohum`: Moonshelf ninnisi.
- `tools/ses_efekti.py`: gök gürültüsü efekti.
- `tools/kalite_kontrol.py`: kalite kontrolü.
- ElevenLabs anahtarı proxy'de: istekte `xi-api-key` için sahte bir değer gönder. Kotayı `GET /v1/user/subscription` ile kontrol et (Creator: 131.000 karakter/ay).
- Pixabay: `https://pixabay.com/api/videos/?key=$PIXABAY_API_KEY&q=...&min_width=3840`. İndirilen klipleri önce küçük karelerle (contact sheet) incele.

## Örnek tarifler (kopyalayıp uyarlayın)
- Short, kendi grafikleriyle: `videos/01-black-hole/build/short1.py`, `short2.py`, `short3.py`
- Short, gerçek 4K görüntüyle: `videos/shorts/yildirim/short_lightning.py`, `videos/shorts/bal/short_honey.py`
- Short, 1080p kare yerleşimle: `videos/shorts/ahtapot/short_octopus.py`
- Short, uzun videoyu tanıtan: `videos/02-bees/build/short_dance.py`
- Uzun video (bölümler, grafikler, parçalı render, SRT, bölüm listesi): `videos/02-bees/build/uzun.py`; kapak: `kapak.py`, A/B kapakları: `kapak_test.py`
- Moonshelf hikâyesi (çapraz geçişler, uçan kitap, ateş böcekleri): `videos/moonshelf/01-moon-library/build/hikaye.py`

## Akış
1. **Konu ve senaryo:** Kısa ve doğru bilgiler. Uzun videoda Kerem'e Türkçe özetle onaya gönder (`videos/<no-konu>/script.md`).
2. **Ses:** `tts()`. Uzun videoda bölüm bölüm seslendir.
3. **Görüntü:** Pixabay'den ara, indir, contact sheet ile seç. Gerekirse PIL ile kendi grafiklerini çiz.
4. **Kurgu:** Tarifi yaz, `PREVIEW` ile kontrol et, render et. Uzun videoda `PART="a,b"` ile 3 parça paralel render, sonra `JOIN=1`. Açılan ffmpeg okuyucularını kapat (bellek).
5. **Kalite:** `kalite_kontrol.py` ve ebur128 ile LUFS kontrolü, son karelere bak.
6. **Paket:** `yukleme.md` (başlık, açıklama + bölümler + kaynaklar + görüntü yazarları, etiketler, Studio ayarları, TikTok metni), kapak 1280x720, SRT.
7. **Teslim:** `teslim/` + `SendUserFile` + bildirim. Değişiklikleri tek commit/push ile gönder, `DURUM.md`'yi güncelle.
