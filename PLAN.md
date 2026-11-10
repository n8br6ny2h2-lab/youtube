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

## İlk ay takvimi (10 Kasım'da Kerem onayladı)
Yayın saati hep **18:00 (Türkiye)**. Kerem en geç 16:00'da yükleyip YouTube'un "zamanla" özelliğiyle ayarlar. Aynı videolar TikTok'ta da paylaşılır.
Düzen: **Çarşamba uzun video; Cuma, Pazar, Salı Shorts.** (İlk hafta istisna: Shorts önce çıkar.)

| Tarih | Ne |
|---|---|
| 11 Kas Çar | Short 1: Spaghettification |
| 13 Kas Cum | Short 2: Olay ufku |
| 16 Kas Pzt | Short 3: Zaman yavaşlaması |
| 18 Kas Çar | Uzun: What Would Happen If You Fell Into a Black Hole? |
| 20 / 22 / 24 Kas | 3 ek kara delik Short'u |
| 25 Kas Çar | Uzun: How Does a Jet Engine Actually Work? |
| 27 / 29 Kas, 1 Ara | 3 jet motoru Short'u |
| 2 Ara Çar | Uzun: How Do Rockets Escape Earth's Gravity? |
| 4 / 6 / 8 Ara | 3 roket Short'u |
| 9 Ara Çar | Uzun: How Does GPS Know Exactly Where You Are? |
| 11 / 13 / 15 Ara | 3 GPS Short'u |
| 16 Ara | Ay sonu değerlendirmesi |

Hatırlatmalar: `takvim/kavcilab_yayin.ics` (iPhone Takvim'e eklenir; her yayından 2 saat önce ve yayın anında uyarır). Zamanlanmış iş kurulmaz.

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
