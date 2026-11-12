# Kavci Lab: durum notu (yeni sohbet için)

Son güncelleme: 10 Kasım 2026

## Hazır olanlar
- YouTube kanalı: Kavci Lab (@KavciLab). İngilizce bilim ve teknoloji, "çocuklara özel değil".
- Logo, banner, filigran, açıklama, yükleme varsayılanları, yorum filtreleri, 2 oynatma listesi.
- Video doğrulama gönderildi (gelişmiş özellikler onay bekliyor).
- Marka dosyaları: `brand/`. Kalite kontrol: `tools/kalite_kontrol.py`.
- Video 1 senaryo taslağı: `videos/01-black-hole/script.md` (kara delik).

## Kararlar
- Sadece İngilizce kanal. Türkçe ve İspanyolca kanallar sonra.
- Haftada 1 uzun video + 3-4 Shorts. Kerem her videoyu izler, onaylar ve kendisi yükler.
- Görüntü: kendi 3D sahnelerimiz (Blender) + NASA 4K görüntüleri (kaynak gösterilerek).
- Kalite kuralı: en az Full HD, tercihen 4K. Kontrolden geçmeyen klip kullanılmaz.
- GitHub Actions yok, zamanlanmış iş yok, sık push yok.

## Sıradaki iş
- Short 1 (spagettileşme) HAZIR: tarif `videos/01-black-hole/build/short1.py`, metinler `videos/01-black-hole/yukleme/`. Yayın 11 Kasım 18:00.
- Karar (11 Kas): her gün Short, haftada 1 uzun video (Çarşamba). Ayrıntı PLAN.md.
- Sırada: Short 2 (12 Kas), Short 3 (13 Kas), sonra uzun videonun tam sesi; kalan kara delik Short'ları o sesten kesilir. Uzun video 18 Kas.
- Müzik: telif sorunu olmasın diye kendi ürettiğimiz ambiyans müzik (`tools/muzik_ambient.py`). Mixkit müzik sayfası hız sınırı veriyor.
- TikTok: Kerem Shorts'ları TikTok'ta da paylaşıyor (10 Kasım kararı). Her Short için TikTok açıklaması da yazılır.

## Kerem'in içerik tercihi (12 Kasım)
- Short 3 için uzay dışı konu ve gerçek HD/4K görüntü istedi → yıldırım Short'u yapıldı (`videos/shorts/yildirim/`).
- "Zaman yavaşlaması" Short'u (`videos/01-black-hole/build/short3.py`) yedekte bekliyor.
- Kapak kuralı: her video farklı kapak, yazı ilk karede (PLAN.md).
- Shorts Pixabay 4K görüntülerle de yapılabiliyor: `tools/shorts_ortak.py` içinde `clip_frames`.

## Açık işler
1. Pexels anahtarı: ortamda kayıtlı görünmüyor (10 Kasım kontrolü). Gizli anahtar olarak yeniden eklenmeli: api.pexels.com, Authorization, ön ek boş.
2. Pixabay anahtarı: `PIXABAY_API_KEY` ortam değişkeni olarak KAYDEDİLDİ (10 Kasım). Yeni sohbette test et: curl "https://pixabay.com/api/videos/?key=$PIXABAY_API_KEY&q=galaxy"
- Gelişmiş YouTube özellikleri açıldı (3/3 Enabled).
- Ek 4K kaynaklar açık ve test edildi: ESA/Hubble, ESA/Webb, ESO, Mixkit.
3. Anlatıcı ses: ElevenLabs Creator, George sesi (config/ses.json). Anahtar gizli anahtar olarak kayıtlı ve çalışıyor.
4. Render: tam video için kiralık GPU önerildi, karar bekleniyor.
5. Ortamın kurulum betiği eski Bulutkent sistemine ait ve hata veriyor; sadeleştirilecek.
6. İleride: Shorts videoları TikTok ve Instagram Reels'e de konacak (YouTube oturduktan sonra).
