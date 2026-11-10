# Kavci Lab

İngilizce bilim ve teknoloji YouTube kanalı (uzay + "nasıl çalışır?").
Marka dosyaları: `brand/`

Kurallar:
- Her videoyu Kerem izler, onaylar ve kendisi yükler.
- Bilgiler güvenilir kaynaklardan kontrol edilir, kaynaklar açıklamaya yazılır.
- Zamanlanmış GitHub Actions iş akışı yok; GitHub'da yalnız kod ve küçük marka dosyaları durur.

## Kalite kuralı
Her klip ve her son video `python3 tools/kalite_kontrol.py <dosya>` ile kontrol edilir.
En az Full HD (1920x1080), en az 24 fps ve yeterli bit hızı (1080p için 4 Mbps, 4K için 12 Mbps).
Kontrolden geçmeyen hiçbir şey videoya girmez ve YouTube'a yüklenmez.

## Görüntü kaynakları
- NASA (images.nasa.gov, svs.gsfc.nasa.gov): ücretsiz; açıklamada "Visualization: NASA Goddard" gibi kaynak yazılır, NASA logosu kullanılmaz.
- Pexels / Pixabay: ücretsiz lisans; API anahtarı ortam ayarlarından girilir, sohbete yazılmaz.
