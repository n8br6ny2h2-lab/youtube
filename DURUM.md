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

## Açık işler
1. Pexels anahtarı: gizli anahtar olarak eklendi (api.pexels.com, Authorization, ön ek boş), ama testte çalışmadı. Yeni sohbette tekrar test et.
2. Pixabay anahtarı: `PIXABAY_API_KEY` ortam değişkeni olarak eklenecek, yeni sohbette test et.
3. Anlatıcı ses kararı: ücretli yapay zekâ sesi / ücretsiz ses / Kerem'in sesi.
4. Render: tam video için kiralık GPU önerildi, karar bekleniyor.
5. Ortamın kurulum betiği eski Bulutkent sistemine ait ve hata veriyor; sadeleştirilecek.
