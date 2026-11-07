# ⚔️ Efsun Avcısı

Tek parmakla oynanan, dikey ekranlı **aksiyon RPG / hayatta kalma** oyunu. Sürükleyerek hareket edersin, kahramanın en yakın düşmana kendiliğinden saldırır. Her seviyede 3 güçten birini seçersin. 10 dalgayı ve bölüm boss'unu geçince sıradaki bölüm açılır. Savaşlar arasında eşyalarını yükseltir, efsunlar, birleştirir ve setleri tamamlarsın.

Saf HTML5 + JavaScript (derleme adımı yok). Tarayıcıda PWA olarak çalışır, **Capacitor** ile Android/iOS uygulamasına paketlenir.

```
cd game && python3 -m http.server 8080   →  http://localhost:8080
```


> **Yayına hazırlık:** Adım adım yayın rehberi `store/RELEASE.md`, mağaza metinleri `store/LISTING.md`, ikon/ekran görüntüleri `store/` ve `assets/` içinde. Yüklemeden önce `npm run release-check` çalıştır; eksik kalan her şeyi listeler.

---

## 1. Oyun döngüsü

| Süre | Döngü | Oyuncuyu bağlayan şey |
|---|---|---|
| 3-4 dk | **Savaş**: 10 dalga, 5. dalgada mini boss, 10. dalgada bölüm boss'u | Seviye atlayınca 3 güçten birini seçmek, kritik vuruşlar, ekran sarsıntısı, yavaş çekimde boss ölümü |
| 5-10 dk | **Gelişim**: ganimeti kuşan, yükselt, efsunla, birleştir | "▲ +376 Güç" göstergesi, nadirlik renkleri, mükemmel efsun kovalamak |
| Günlük | Giriş ödülü, 7 görev, günün mücadelesi, ücretsiz sandık, devriye ödülü | Seri bozulmasın, bilet kademesi dolsun |
| Sezonluk | Efsun Bileti (30 kademe), başarımlar, yeni bölümler (Kabus → Cehennem → Kıyamet) | Uzun vadeli hedef |

### Savaş içi (19 güç)
Çoklu Atış, Çapraz Atış, Arka Atış, Delici, Seken Atış, Güç Patlaması, Hız Ruhu, Keskin Göz, Dev Kalbi, Şifa, Vampir Dişi, Ateş Küresi, Dönen Bıçaklar, Yıldırım, Buz Halkası, Meteor, Ruh Kalkanı, Mıknatıs, Rüzgâr Adımı.

### 🧬 Evrimler (6)
Aktif beceri en yüksek seviyede + eşleşen destek gücü alınmışsa seviye atlarken (%50) veya 🎁 hazine sandığında (kesin) evrim seçeneği çıkar. Seçim kartında hangi gücün hangi evrime gittiği yazar.

| Evrim | Gerekenler | Etki |
|---|---|---|
| ☀️ Güneş Çemberi | Ateş Küresi (4) + Güç Patlaması | Büyük küreler, 2× hasar, her vuruşta yakma |
| 🌪️ Kasırga | Dönen Bıçaklar (3) + Hız Ruhu | +2 bıçak, 2× dönüş, %60 daha sert |
| ⛈️ Gök Hükmü | Yıldırım (4) + Keskin Göz | Her saniye yıldırım, 2 düşmana sıçrar |
| 🧊 Mutlak Sıfır | Buz Halkası (3) + Dev Kalbi | Daha geniş halka, her 3 sn dondurma |
| 🌋 Kıyamet Yağmuru | Meteor (3) + Mıknatıs | 2× meteor, 2× sıklık, geniş patlama |
| 😇 Kutsal Aura | Ruh Kalkanı (3) + Vampir Dişi | Kalkan 3 sn'de yenilenir, kırılınca şok dalgası |

- **🎁 Hazine sandığı**: mini boss her zaman, seçkin düşmanlar %8 şansla düşürür. Toplayınca ek güç seçimi (evrim hazırsa öncelikli).
- **📊 Hasar dökümü**: savaş sonunda hangi gücün ne kadar hasar verdiği gösterilir.
- **⚡ Hızlı Tarama**: temizlenmiş bölüm/zorluk günde 3 kez oynamadan geçilir (5 enerji, zafer ganimeti).
- **🧩 Kahraman parçaları**: her zaferde seçili kahramana 2+ parça; Elmas sandıkta %35 şansla 1-3, Efsane sandıkta 2-5 parça.

### 🏟️ Arena (sonsuz dalga)
1. bölüm temizlenince savaş ekranındaki **Bölümler / Arena** seçicisinden açılır (5 enerji). Dalgalar 15 sn, her 5 dalgada boss (10'un katlarında bölüm boss'u, diğerlerinde mini boss; ikisi de 🎁 sandık düşürür), görünüm ve düşman türleri her 5 dalgada değişir. Düşman gücü her 4 dalgada yaklaşık bir bölüm kadar artar. Ganimet ulaşılan dalgaya göre verilir; rekor kırınca her yeni 5 dalga eşiği için +20 💎. Sıralamada "Arena" tablosu var.

### 🏆 Sonsuz başarımlar
12 hat (bölüm, düşman, boss, zafer, arena, kombo, savaş, efsun, yükseltme, sandık, mitik, oyun süresi). Ödül alınınca hedef yükselir, ödül tavana kadar yavaşça artar (`js/data.js` → `ACH_LINES`). Ödüller eski sabit başarımlardan düşük: kademe başına çoğunlukla 10-40 💎. Eski kayıtlarda alınmış başarımlar ilgili kademelere aktarılır.
