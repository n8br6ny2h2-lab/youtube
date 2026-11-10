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

## İlk ay takvimi
| Hafta | Uzun video | Shorts |
|---|---|---|
| 1 | What Would Happen If You Fell Into a Black Hole? | 3: spagettileşme, olay ufku, zaman yavaşlaması |
| 2 | How Does a Jet Engine Actually Work? | 3 |
| 3 | How Do Rockets Escape Earth's Gravity? | 3 |
| 4 | How Does GPS Know Exactly Where You Are? | 3 |

Yayın günü önerisi: uzun video Salı veya Perşembe; Shorts haftaya yayılır.

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
