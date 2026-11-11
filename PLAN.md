# Kavci Lab: üretim planı

## Her videonun üretim akışı (yaklaşık 2-3 gün)
1. Konu ve senaryo: İngilizce, 7-9 dakika. Bilgiler NASA/ESA/üniversite kaynaklarından kontrol edilir. Kerem onaylar.
2. Ses: ElevenLabs, George sesi. Cümle zamanları alınır.
3. Görüntü listesi: her cümleye bir sahne. Önce hazır HD/4K (NASA, ESA, ESO, Pixabay, Mixkit), yoksa kendi 2D/3D.
4. Kendi grafikler: oklar, etiketler, şemalar (2D) ve gerekiyorsa kısa 3D sahneler.
5. Kurgu: ses + görüntü + müzik + efekt + filigran + kaynak yazıları.
6. Kalite kontrolü: tools/kalite_kontrol.py (en az Full HD), ses seviyesi -14 LUFS.
7. Kapak resmi (thumbnail), başlık, açıklama (kaynaklarla), etiketler, altyazı (SRT).
8. Shorts: her videodan 3-4 dikey kısa video (9:16, 30-50 sn).
9. Kerem izler, onaylar ve YouTube Studio'dan kendisi yükler.

## İlk ay takvimi (11 Kasım'da Kerem onayladı: her gün Short, haftada 1 uzun video)
- **Uzun video: her Çarşamba 18:00 (Türkiye).**
- **Short: her gün 18:00.** Çarşamba günleri Short 12:00'de çıkar (uzun videoyla çakışmasın).
- Her uzun videodan 7 Short çıkar. Short'lar uzun videonun sesinden kesilir, ek ElevenLabs karakteri harcanmaz.
- Bir konunun Short'ları Pazar'dan Cumartesi'ye yayınlanır (uzun video haftanın ortasında).
- Kerem her Pazar 11:00'de haftanın paketini (1 uzun + 7 Short) YouTube Studio'ya yükleyip her birini kendi gününe zamanlar. TikTok'ta her gün 18:00'de paylaşır.
- Hazırlık: Claude Pazartesi–Cuma bir sonraki konuyu hazırlar, Kerem Cumartesi izleyip onaylar.

| Tarih | Uzun video | Short'lar |
|---|---|---|
| 11–21 Kas | 18 Kas: Kara delik | 11 kara delik Short'u (ilk hafta istisna, hazır oldukça teslim) |
| 22–28 Kas | 25 Kas: Jet motoru | 7 jet motoru Short'u |
| 29 Kas – 5 Ara | 2 Ara: Roket | 7 roket Short'u |
| 6–12 Ara | 9 Ara: GPS | 7 GPS Short'u |
| 13–15 Ara | (16 Ara: 5. konu) | 3 Short |
| 16 Ara | Ay sonu değerlendirmesi | |

ElevenLabs (Creator, 131.000 karakter/ay): 4 uzun video ≈ 30.000 + ek Short'lar ≈ 10.000. Rahat sığar.

Hatırlatmalar: `takvim/kavcilab_yayin.ics` (iPhone Takvim'e eklenir). Zamanlanmış iş kurulmaz.

## Ay sonu değerlendirmesi
- İzlenme, izlenme süresi, tıklanma oranı (CTR), abone.
- Tutan konu türü artırılır, tutmayan değiştirilir.
- Kalite ve tempo iyiyse 2. ayda haftada 2 videoya çıkılır.

## Bütçe (aylık)
- ElevenLabs Creator: ~22 $
- GPU: şimdilik yok (HD ağırlıklı yöntem)
- Toplam: ~22 $

## Kurallar
- GitHub Actions yok, zamanlanmış iş yok, sık push yok.
- Her video Kerem'in onayından geçer; yükleme Kerem tarafından yapılır.
- Lisansı ticari kullanıma uygun olmayan hiçbir görüntü kullanılmaz; kaynaklar açıklamaya yazılır.

## Yükleme paketi (her video için)
Claude hazırlar, Kerem iPhone'daki YouTube Studio'dan elle yükler ve yayın saatini YouTube'un "zamanla" özelliğiyle ayarlar.
- Video dosyası (kalite kontrolünden geçmiş), kapak resmi (1280x720)
- Başlık, açıklama (bölümler + kaynaklar), etiketler, altyazı (SRT)
- 3 Shorts, her biri kendi başlık ve açıklamasıyla
API ile otomatik yükleme yok (karar: 10 Kasım 2026). İleride ancak Kerem isterse ve YouTube API denetimi geçilirse değerlendirilir.
