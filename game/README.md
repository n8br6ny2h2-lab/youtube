# ⚔️ Efsun Avcısı

Tek parmakla oynanan, dikey ekranlı **aksiyon RPG / hayatta kalma** oyunu. Sürükleyerek hareket edersin, kahramanın en yakın düşmana kendiliğinden saldırır. Her seviyede 3 güçten birini seçersin. 10 dalgayı ve bölüm boss'unu geçince sıradaki bölüm açılır. Savaşlar arasında eşyalarını yükseltir, efsunlar, birleştirir ve setleri tamamlarsın.

Saf HTML5 + JavaScript (derleme adımı yok). Tarayıcıda PWA olarak çalışır, **Capacitor** ile Android/iOS uygulamasına paketlenir.

```
cd game && python3 -m http.server 8080   →  http://localhost:8080
```

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

### Düşmanlar ve bosslar
6 düşman türü (kovalayan, zikzak yarasa, okçu, golem, intihar bombacısı, ışınlanan büyücü) ve seçkin (altın halkalı) sürümleri.
5 bölüm boss'u + mini boss. Her boss 6 desenden 3'ünü kullanır: halka mermi, sarmal, yelpaze atış, kırmızı çizgiyle uyarılan **hücum**, kırmızı daireyle uyarılan **yere vuruş**, minyon çağırma. Canı yarının altına inince saldırıları hızlanır.

---

## 2. Ekipman sistemi

- **6 yuva**: Silah, Miğfer, Zırh, Çizme, Yüzük, Tılsım. Ayrıca **evcil hayvan** yuvası.
- **Silah tipi oynanışı değiştirir**: Yay (hızlı, uzak), Asa (takip eden küre, +1 sekme), Kılıç (yakın alan vuruşu, %15 hasar azaltma).
- **6 nadirlik**: Sıradan → Nadir → Seçkin → Destansı → Efsanevi → Mitik. Her nadirlik ana statı katlar (×1 → ×7.5) ve **1 efsun yuvası** ekler; en yüksek seviye 10'dan 60'a çıkar.
- **Yükseltme**: altın + parşömen, her seviyede +%12. "×5" düğmesiyle tek dokunuşta beş seviye.
- **Birleştirme**: aynı yuva ve nadirlikten 3 eşya → bir üst nadirlik. Seviye ve efsunlar korunur. Destansı altı eşyalar için "Otomatik Birleştir" düğmesi var.
- **Parçalama**: altın, parşömen ve efsun taşı iade eder. Yükseltmeye harcananın %80'i geri gelir.

### ✨ Efsunlar
19 efsun türü: Saldırı%, Can%, Kritik Şansı/Hasarı, Saldırı Hızı, Can Çalma, Hareket, Altın, Tecrübe, Can Yenileme, 🔥 Yakma, ❄️ Dondurma, ⚡ Şimşek Zinciri, Diken, Boss Hasarı, Kaçınma, Hasar Azaltma ve sadece üst nadirliklerde çıkan **Çoklu Atış** ve **Delici**.
- Her efsunun bir **kalite yüzdesi** vardır (%55-100). %85 üstü mavi, %95 üstü altın çerçeveyle gösterilir; oyuncu mükemmel efsunun peşine düşer.
- **Efsunla** düğmesi efsun taşı harcayarak efsunları yeniden çeker.
- 🔒 **Kilit mührüyle** iyi efsunlar kilitlenir, sadece diğerleri yeniden çekilir. Bu düzenli bir harcama kalemidir.

### Setler (Destansı ve üstünde %30 şansla düşer)
| Set | 2 parça | 4 parça özel güç |
|---|---|---|
| 🐉 Ejder | +%15 Yakma, +%10 Saldırı | Her 5 sn ateş patlaması |
| ❄️ Ayaz | +%12 Dondurma, +%12 Can | Her 6 sn çevredekileri dondurur |
| ⚡ Fırtına | +%15 Şimşek, +%12 Saldırı Hızı | Her 4 sn 5 yıldırım |

### Kahramanlar ve evcil hayvanlar
| Kahraman | Pasif | Nasıl açılır |
|---|---|---|
| Kaya | +%20 can, her 10 sn kalkan | Ücretsiz |
| Lina | +1 çoklu atış, +%10 saldırı hızı | 30.000 altın |
| Zerk | Can çalma, canı azaldıkça hasarı artar | 1.200 elmas |
| Nyx | Ölen düşmanlardan avcı ruhlar doğar | **Gölge Cadısı Kiti** (gerçek para) |

Evcil hayvanlar: Baykuş (ücretsiz), Ruh Tilkisi (900 💎), Yavru Ejder (**Ejder Hükümdarı Kiti**).
Kalıcı yetenek ağacında 8 yetenek var. Her kahraman parça toplayarak seviye atlar (seviye başına +%6).

---

## 3. Para kazanma (gerçek para)

Tüm ürünler `js/data.js` → `PRODUCTS` içinde tanımlı. Ürün kimlikleri **Google Play Console** ve **App Store Connect**'te aynı adla açılmalıdır.

| Kimlik | Tür | Fiyat (TR) | İçerik |
|---|---|---|---|
| `kit_starter` | tek sefer | ₺49,99 | Destansı Yay, 300 💎, 15.000 🪙, 25 efsun taşı. İlk yenilgiden sonra 48 saatlik sayaçla teklif edilir |
| `kit_dragon` | tek sefer | ₺399,99 | 4 parça Efsanevi Ejder seti, Yavru Ejder, 1.500 💎 |
| `kit_enchanter` | 3 kez alınabilir | ₺199,99 | 200 efsun taşı, 40 mühür, Efsanevi yüzük, 300 💎 |
| `kit_nyx` | tek sefer | ₺299,99 | Nyx kahramanı, Efsanevi Fırtına Asası, 600 💎 |
| `kit_mythic` | tek sefer | ₺999,99 | 3 Mitik eşya, 3.500 💎, kaynaklar |
| `monthly_card` | 30 gün | ₺99,99 | Hemen 300 💎, her gün 100 💎 (toplam 3.300), enerji sınırı +10 |
| `vip_noads` | tek sefer | ₺179,99 | Reklamsız, +%25 altın, 2× devriye ödülü |
| `battle_pass` | sezonluk | ₺199,99 | Premium bilet hattı (Mitik silah dahil) |
| `gems_80` … `gems_7000` | tüketilebilir | ₺29,99 – ₺1.499,99 | Her pakette **ilk alım 2×** |

Oyun içi para birimleriyle satılanlar: sandıklar (Bronz / Elmas / Efsane, 10'lu indirim, şans koruması), enerji, efsun taşı, mühür, parşömen, altın, hızlı devriye, diriltme (80 💎).
**Ödüllü reklamlar**: diriltme, 2× altın, güç yenileme, ücretsiz günlük sandık, +10 enerji (günde 3). VIP olan oyuncu reklamı atlar ve ödülü doğrudan alır.

### Ödeme nasıl çalışıyor
- `js/services.js` → `Store` sınıfı. Telefonda **cordova-plugin-purchase v13** üzerinden Google Play Billing ve StoreKit kullanır. Ödül **sadece** mağaza işlemi `finished` olduğunda verilir; aynı `transactionId` iki kez ödül vermez.
- **Tarayıcıda ödeme alınmaz.** Bu durumda açıkça "Test Mağazası" penceresi çıkar. Demo ve geliştirme için böyle tasarlandı.
- Sahte makbuzları engellemek için `server/validate.mjs` var (Google Play doğrulaması hazır, iOS kısmı TODO). Adresini `services.js` içindeki `CONFIG.validatorUrl` alanına yazın.

### Yasal uyumluluk
- Sandık olasılıkları mağazada **%** düğmesiyle yayımlanıyor. Google Play ve Apple bunu zorunlu tutuyor.
- Satın alma metninde "KDV dahil", "18 yaş altı ebeveyn izniyle" ve "Satın alımları geri yükle" yer alıyor.
- Oyunun gizlilik politikası adresini `js/data.js` → `GAME.privacyUrl` alanına yazın (ayarlar menüsünde görünür; mağazalar zorunlu tutar). Reklam SDK'sı (AdMob) eklendiği için Play Console'da **Veri Güvenliği** formu doldurulmalı ve iOS'te ATT izni istenmeli.
- `services.js` ve `capacitor.config.json` içindeki AdMob kimlikleri Google'ın **test** kimlikleri. Yayından önce kendi kimliklerinizi yazın.

---

## 4. Viral ve büyüme mekanikleri

- **Paylaşım kartı**: savaş sonunda 720×1280 boyutunda bir görsel üretilir (bölüm, öldürülen düşman, güç, "Beni geçebilir misin?") ve Web Share / yerel paylaşım menüsüyle TikTok, Instagram ve WhatsApp'a gönderilebilir.
- **Günün Mücadelesi**: herkes aynı gün aynı kuralla oynar ("Cam Top", "Boss Yağmuru" vb.). Skor karşılaştırmaya ve video çekmeye uygun.
- **Davet kodu**: iki taraf da 200 💎 kazanır. Günlük paylaşım ödülü 30 💎.
- **Kısa video için tasarlanmış anlar**: Mitik sandık açılışında ekran kırmızı parlar ve fanfar çalar, boss yavaş çekimde ölür, mükemmel efsunda "✨ Mükemmel efsun!" yazar, ekran hasar sayılarıyla dolar.
- **Seans yapısı**: tek savaş 3-4 dakika, tek elle oynanır, menüde bekleyen ödül bildirimleri var.

> Not: Hiçbir oyunun viral olacağı garanti edilemez. Bu mekanikler, paylaşılma olasılığını artıran sektör pratikleridir. Yayından sonra D1/D7 tutunma oranı ve paylaşım başına kurulum verisiyle ayarlayın.

---

## 5. Telefona paketleme

```bash
cd game
npm install
npm run build                 # www/ klasörünü oluşturur
npx cap add android           # ilk sefer
npx cap add ios               # ilk sefer (macOS + Xcode)
npm run android               # Android Studio açılır → Build > Generate Signed Bundle (AAB)
npm run ios                   # Xcode açılır → Archive → App Store Connect
```

Yayın öncesi kontrol listesi:
1. `js/data.js` → `GAME.shareUrl` (mağaza bağlantısı) ve `GAME.privacyUrl` alanlarını doldurun.
1. `capacitor.config.json` içindeki `appId` değerini kendi paket adınızla değiştirin.
2. Play Console ve App Store Connect'te tablodaki ürün kimliklerini açın. Tüketilebilir / tüketilemez türlerini doğru seçin.
3. AdMob uygulama ve reklam birimi kimliklerini girin.
4. `server/validate.mjs` dosyasını bir sunucuya yükleyin ve `CONFIG.validatorUrl` alanını doldurun.
5. Kahraman ve eşya emojilerini kendi çizimlerinizle değiştirin (isteğe bağlı). Bunun için `BASES` / `HEROES` içindeki `icon` alanlarına görsel yolu koyup arayüzde `<img>` gösterimi eklemek yeterli.
6. Mağaza görselleri için oyundaki paylaşım kartını ve savaş ekran görüntülerini kullanın.

---

## 6. Dosya yapısı ve denge ayarı

```
game/
├── index.html, css/style.css, manifest.webmanifest, sw.js (çevrimdışı)
├── js/data.js       ← TÜM DENGE: nadirlik, efsun değerleri, setler, kahramanlar, ürünler, görevler, bilet
├── js/economy.js    ← eşya üretimi, stat hesabı, yükseltme / efsun / birleştirme, sandık, ödüller
├── js/game.js       ← savaş motoru (düşmanlar, boss desenleri, beceriler, efektler)
├── js/main.js       ← menüler, akışlar, mağaza, HUD
├── js/services.js   ← IAP, reklam, ses sentezi, titreşim, paylaşım
├── js/save.js       ← kayıt (localStorage + bütünlük özeti, dışa/içe aktarma)
├── server/validate.mjs  ← makbuz doğrulama
└── capacitor.config.json, scripts/build.mjs
```

Zorluk eğrisi: düşman canı bölüm başına ×1,36, dalga başına +%9 artar (`game.js` → `diffHp`). Önerilen güç bölüm başına ×1,33 artar (`main.js` → `recommendedPower`).

## 7. Sonraki adımlar (sunucu gerektirir)
- Bulut kaydı ve hesap bağlama (Google Play Games / Game Center)
- Küresel ve arkadaş liderlik tablosu, günün mücadelesi sıralaması
- Davet kodunun sunucuda doğrulanması (şu an yalnızca istemci tarafında)
- Uzaktan yapılandırma ile fiyat ve teklif A/B testleri, analitik (Firebase)
