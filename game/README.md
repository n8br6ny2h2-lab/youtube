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

## 5. Ana menü ve hesap sistemi

**Ana menü (başlık ekranı):** OYNA, Hesap, Sıralama, Posta, Haberler, Hediye Kodu, Destek, Hakkında ve Ayarlar. Lobide sol üstteki ☰ aynı menüyü açar; avatar profil sayfasını açar.

| Bölüm | İçerik |
|---|---|
| **Hesap & Bulut** | Game Center, Apple ile Giriş, Google Play Oyunlar, Google ile Giriş. İlk bağlantıda 200 💎. Bulut kaydı (kaydet / yükle, 3 dakikada bir otomatik). Oyuncu kimliği. **Hesabı sil** (Apple yönergesi 5.1.1(v) bunu zorunlu tutar) |
| **Sıralama** | Bölüm, Güç, Düşman ve Kombo tabloları. iPhone ve Android oyuncuları aynı listede. İlk 50 ve senin sıran |
| **Posta** | Hoş geldin ve güncelleme hediyeleri, tek tek ya da "Tümünü al" |
| **Haberler** | Güncelleme notları, sezon duyuruları, ipuçları (`js/data.js` → `NEWS`) |
| **Hediye kodu** | `HOSGELDIN`, `EFSUN2026`, `AVCILAR` (`GIFT_CODES`). Canlıda kodları sunucuya taşıyın |
| **Ayarlar** | Efekt ve müzik ses seviyesi, titreşim, hasar sayıları, ekran sarsıntısı, grafik kalitesi, 30/60 FPS, enerji bildirimi, dil, satın alımları geri yükle, yedek kodu, sıfırlama, yasal bağlantılar |
| **Destek & SSS** | Sık sorulan sorular, oyuncu kimliği, e-posta ile destek (`CONFIG.supportEmail`) |
| **Profil** | İsim değiştirme, istatistikler, bağlı hesaplar, başarımlar |

**Nasıl çalışıyor:** Telefonda tek eklenti kullanılıyor: `@capacitor-firebase/authentication`. Dört giriş yöntemi de bu eklentiyle yapılıyor. Oyuncu ikinci bir yöntem bağladığında bu, aynı Firebase hesabına ekleniyor (`linkWith…`). Böylece iPhone'dan Android'e geçen oyuncu ilerlemesini kaybetmiyor.

Bulut kaydı ve sıralama `server/cloud.mjs` üzerinden çalışıyor. Sunucu, Firebase kimlik jetonunu Google'ın açık anahtarlarıyla doğruluyor: her oyuncu sadece kendi kaydına erişebiliyor, absürt skorlar reddediliyor ve skorlar geriye gitmiyor. Tarayıcıda gerçek giriş yapılamıyor; bunun yerine açıkça "Test" olarak işaretlenmiş bir bağlantı oluşuyor.

> Game Center / Play Games'in kendi sıralama ekranları için Capacitor 8 uyumlu, bakımı süren bir eklenti bulunamadı. Bu yüzden sıralama oyunun kendi sunucusunda ve oyun içinde gösteriliyor.

## 6. Telefona paketleme (Apple + Android)

```bash
cd game
npm install
npm run build                 # www/ klasörünü oluşturur
npx cap add android           # ilk sefer
npx cap add ios               # ilk sefer (macOS + Xcode)
npm run native-setup          # dikey ekran, bildirim izni, AdMob/Play Games kimlikleri, iOS izin metinleri
npm run android               # Android Studio → Build > Generate Signed Bundle (AAB)
npm run ios                   # Xcode → Product > Archive → App Store Connect
```

### Firebase (giriş için zorunlu)
1. console.firebase.google.com'da proje aç. Authentication > Sign-in method bölümünden **Apple, Google, Game Center, Play Games**'i etkinleştir.
2. Android uygulaması ekle (`com.efsunavcisi.game`, SHA-1 parmak izi ile) → `google-services.json` dosyasını `android/app/` içine koy.
3. iOS uygulaması ekle → `GoogleService-Info.plist` dosyasını Xcode'da `App/App` içine sürükle. İçindeki `REVERSED_CLIENT_ID` değerini `scripts/native-setup.mjs` dosyasına yaz.

### Apple (App Store Connect + Xcode)
- Xcode > Signing & Capabilities: **Game Center**, **Sign in with Apple**, **In-App Purchase**.
- App Store Connect: Game Center'ı aç; uygulama içi ürünleri `PRODUCTS` kimlikleriyle oluştur.
- Gizlilik etiketleri: Kimlik (kullanıcı kimliği), Kullanım verisi (oyun ilerlemesi), Satın almalar ve Reklam kimliği (AdMob ATT izni ile).
- Yaş derecelendirmesi: "Sık / yoğun simüle kumar" sorusunda sandıklar için **olasılıkları yayımlanan rastgele ödüller** seçilir.

### Android (Google Play Console)
- Play Games Services'i yapılandır ve proje kimliğini `native-setup.mjs` → `playGamesAppId` alanına yaz.
- Uygulama içi ürünleri aynı kimliklerle oluştur. Veri Güvenliği formunu doldur (kimlik, oyun ilerlemesi, satın almalar, reklam kimliği).
- Hedef API seviyesi Capacitor 8 varsayılanlarıyla Play şartlarını karşılar.

### Sunucular
```bash
cd game/server && npm install
FIREBASE_PROJECT_ID=projen DATA_DIR=./data PORT=8788 npm run cloud     # bulut kaydı + sıralama
GOOGLE_APPLICATION_CREDENTIALS=hesap.json npm run validator           # Google Play makbuz doğrulama
```
Sunucu adresini `js/services.js` → `CONFIG.cloudUrl` alanına yaz. Gizlilik politikası, kullanım şartları ve destek e-postasını da `GAME.privacyUrl`, `GAME.termsUrl` ve `CONFIG.supportEmail` alanlarına gir.

## 7. Dosya yapısı ve denge ayarı

```
game/
├── index.html, css/style.css, manifest.webmanifest, sw.js (çevrimdışı)
├── js/data.js       ← TÜM DENGE: nadirlik, efsun değerleri, setler, kahramanlar, ürünler, görevler, bilet
├── js/economy.js    ← eşya üretimi, stat hesabı, yükseltme / efsun / birleştirme, sandık, ödüller
├── js/game.js       ← savaş motoru (düşmanlar, boss desenleri, beceriler, efektler)
├── js/main.js       ← lobi, akışlar, mağaza, HUD
├── js/menus.js      ← ana menü, hesap, ayarlar, sıralama, posta, haberler, destek, profil
├── js/account.js    ← giriş (Firebase), bulut kaydı ve sıralama istemcisi
├── js/art.js        ← tüm karakter, düşman ve boss çizimleri
├── js/services.js   ← IAP, reklam, müzik ve ses sentezi, bildirim, titreşim, paylaşım
├── js/save.js       ← kayıt (localStorage + bütünlük özeti, dışa/içe aktarma)
├── server/cloud.mjs     ← bulut kaydı + küresel sıralama (Firebase token doğrulamalı)
├── server/validate.mjs  ← makbuz doğrulama
└── capacitor.config.json, scripts/build.mjs, scripts/native-setup.mjs
```

Zorluk eğrisi `js/data.js` → `TUNE` içinde tek yerde: düşman canı bölüm başına ×1,55 ve dalga başına +%13, hasar bölüm başına ×1,5 ve dalga başına +%8 artar; 2. bölümden itibaren düşman sayısı bölüm başına +%12 artar. Can yenileme savaşta yarı etkilidir ve hasar alınca 3 sn durur; dalga geçişi %5 iyileştirir. Önerilen güç bölüm başına ×1,52. Zorluk seviyeleri `DIFFS` içinde: Zor = 4× can, 2,7× hasar, 2,5× ganimet; Kabus = 9× can, 4,2× hasar, 5× ganimet. Otomatik test (dairesel hareket eden, kaçmayan oyuncu): önerilen güçte 5. bölümü geçiyor ama canı %65-88'e iniyor (önceki dengede %95'in altına inmiyordu).

## 8. Sonraki adımlar
- Hediye ve davet kodlarının sunucuda doğrulanması (şu an istemci tarafında)
- İngilizce dil desteği (ayarlarda "yakında" olarak duruyor)
- Arkadaş sıralaması, günün mücadelesi sıralaması
- Uzaktan yapılandırma ile fiyat ve teklif A/B testleri, analitik (Firebase)
